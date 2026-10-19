import { z } from "zod";

import { HELPER_URL } from "@/lib/config";
import { db } from "@/lib/db";

const entityChangesSchema = z.object({
  added: z.number().int().nonnegative(),
  removed: z.number().int().nonnegative(),
  changed: z.number().int().nonnegative(),
  sampleIds: z.array(z.number().int().positive()),
});

const observatorySchema = z.object({
  schemaVersion: z.literal("forever-observatory.v1"),
  generatedAt: z.iso.datetime(),
  catalog: z.object({
    current: z
      .object({
        snapshotKey: z.string().min(1),
        buildNumber: z.number().int().positive(),
        version: z.string(),
        hotfixHash: z.string().nullable(),
        definitionsRevision: z.string().min(1),
        extractorVersion: z.string().min(1),
        publishedAt: z.iso.datetime().nullable(),
        extractedAt: z.iso.datetime(),
      })
      .nullable(),
    previous: z
      .object({
        snapshotKey: z.string().min(1),
        buildNumber: z.number().int().positive(),
        version: z.string(),
        hotfixHash: z.string().nullable(),
        definitionsRevision: z.string().min(1),
        extractorVersion: z.string().min(1),
        publishedAt: z.iso.datetime().nullable(),
        extractedAt: z.iso.datetime(),
      })
      .nullable(),
    changes: z
      .object({
        items: entityChangesSchema,
        recipes: entityChangesSchema,
        note: z.string(),
      })
      .nullable(),
    professions: z.array(
      z.object({
        skillLineId: z.number().int().positive(),
        slug: z.string(),
        name: z.string(),
        recipes: z.number().int().nonnegative(),
        cooldownRecipes: z.number().int().nonnegative(),
        unresolvedRecipes: z.number().int().nonnegative(),
      }),
    ),
  }),
  market: z.object({
    state: z.enum(["unavailable", "collecting", "reportable"]),
    evidenceRule: z.string(),
    scan: z
      .object({
        buildNumber: z.number().int().positive(),
        market: z.string(),
        completedAt: z.iso.datetime(),
        completeness: z.number().min(0).max(1),
        itemCount: z.number().int().nonnegative(),
      })
      .nullable(),
    eligibleItems: z.number().int().nonnegative(),
    collectingItems: z.number().int().nonnegative(),
    signals: z.record(z.string(), z.number().int().nonnegative()),
    notable: z.array(
      z.object({
        itemId: z.number().int().positive(),
        name: z.string(),
        signal: z.string(),
        differencePercent: z.number(),
        confidencePercent: z.number().min(0).max(100),
        observationCount: z.number().int().nonnegative(),
      }),
    ),
  }),
  world: z
    .object({
      build: z.object({
        buildNumber: z.number().int().positive(),
        clientVersion: z.string(),
        state: z.enum(["published", "review_required"]),
      }),
      counts: z.object({
        maps: z.number().int().nonnegative(),
        uiMaps: z.number().int().nonnegative(),
        areas: z.number().int().nonnegative(),
        encounters: z.number().int().nonnegative(),
        canonicalEncounters: z.number().int().nonnegative(),
        bosses: z.number().int().nonnegative(),
        bossLocations: z.number().int().nonnegative(),
        bossSpellCandidates: z.number().int().nonnegative(),
        lootSourceCandidates: z.number().int().nonnegative(),
        quests: z.number().int().nonnegative(),
        questPois: z.number().int().nonnegative(),
        sourceHints: z.number().int().nonnegative(),
      }),
    })
    .nullable(),
  discovery: z.object({
    catalogItems: z.number().int().nonnegative(),
    latestMarketItems: z.number().int().nonnegative(),
    latestMarketCoveragePercent: z.number().nullable(),
    sourceHints: z.number().int().nonnegative(),
    lootSourceCandidates: z.number().int().nonnegative(),
    confirmedDropRates: z.number().int().nonnegative(),
  }),
  publicationRules: z.array(z.string()),
});

export type ForeverObservatory = z.infer<typeof observatorySchema>;

export interface CensusBucket {
  readonly label: string;
  readonly count: number | null;
}

export interface RecruitmentCensus {
  readonly generatedAt: string;
  readonly dataAsOf: string | null;
  readonly totalListings: number;
  readonly recentlyVerifiedListings: number;
  readonly freshnessDays: number;
  readonly classDemand: readonly CensusBucket[];
  readonly regions: readonly CensusBucket[];
  readonly factions: readonly CensusBucket[];
  readonly rulesets: readonly CensusBucket[];
  readonly raidDays: readonly CensusBucket[];
  readonly limitation: string;
}

interface CensusGuild {
  readonly recruitingClasses: readonly string[];
  readonly region: string;
  readonly faction: string;
  readonly gameRuleset: string;
  readonly raidDays: readonly string[];
  readonly lastVerifiedAt: Date | null;
  readonly updatedAt: Date;
}

export async function getForeverObservatory(): Promise<ForeverObservatory | null> {
  try {
    const response = await fetch(
      `${HELPER_URL}/api/v1/public/forever/observatory`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 900 },
        signal: AbortSignal.timeout(5_000),
      },
    );
    if (!response.ok) return null;
    return observatorySchema.parse(await response.json());
  } catch (error: unknown) {
    console.error("Unable to load the KFC Helper Forever observatory", error);
    return null;
  }
}

export async function getRecruitmentCensus(): Promise<RecruitmentCensus> {
  const guilds = await db.foreverGuild.findMany({
    where: { status: "approved" },
    select: {
      recruitingClasses: true,
      region: true,
      faction: true,
      gameRuleset: true,
      raidDays: true,
      lastVerifiedAt: true,
      updatedAt: true,
    },
  });
  return buildRecruitmentCensus(guilds, new Date());
}

export function buildRecruitmentCensus(
  guilds: readonly CensusGuild[],
  generatedAt: Date,
): RecruitmentCensus {
  const freshnessDays = 90;
  const freshAfter = generatedAt.getTime() - freshnessDays * 86_400_000;
  return {
    generatedAt: generatedAt.toISOString(),
    dataAsOf:
      guilds.length > 0
        ? new Date(
            Math.max(
              ...guilds.map((guild) =>
                (guild.lastVerifiedAt ?? guild.updatedAt).getTime(),
              ),
            ),
          ).toISOString()
        : null,
    totalListings: guilds.length,
    recentlyVerifiedListings: guilds.filter(
      (guild) =>
        (guild.lastVerifiedAt ?? guild.updatedAt).getTime() >= freshAfter,
    ).length,
    freshnessDays,
    classDemand: buckets(guilds.flatMap((guild) => guild.recruitingClasses)),
    regions: buckets(guilds.map((guild) => guild.region)),
    factions: buckets(guilds.map((guild) => guild.faction)),
    rulesets: buckets(guilds.map((guild) => guild.gameRuleset)),
    raidDays: buckets(guilds.flatMap((guild) => guild.raidDays)),
    limitation:
      "This measures the needs advertised by approved guild listings, not class population, player supply, or guaranteed open raid spots.",
  };
}

export function researchWindowStart(days: number, now = new Date()): Date {
  if (!Number.isInteger(days) || days < 1)
    throw new RangeError("Research window must be positive.");
  return new Date(now.getTime() - days * 86_400_000);
}

function buckets(values: readonly string[]): readonly CensusBucket[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    const label = value.trim();
    if (label) counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count: count < 3 ? null : count }))
    .sort(
      (left, right) =>
        (right.count ?? 0) - (left.count ?? 0) ||
        left.label.localeCompare(right.label),
    );
}
