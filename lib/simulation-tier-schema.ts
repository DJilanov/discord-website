import { z } from "zod";

export type TierScenario = "solo" | "raid";
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const support = z
  .object({
    version: z.enum(["full-v2", "solo-v1"]),
    raid: z.record(z.string(), z.unknown()),
    party: z.record(z.string(), z.unknown()),
    individual: z.record(z.string(), z.unknown()),
  })
  .strict();
const entry = z
  .object({
    scenario: z.enum(["solo", "raid"]),
    policySha256: digest,
    id: z.string().regex(/^[a-z0-9-]+$/),
    profile: z.string().regex(/^[a-z_]+$/),
    spec: z.string(),
    name: z.string(),
    faction: z.string(),
    dps: z.number().finite().positive(),
    stdev: z.number().finite().nonnegative(),
    iterations: z.literal(5000),
    talents: z.string().regex(/^[0-5]+(?:-[0-5]*){0,2}$/),
    race: z.string(),
    release: z.string().regex(/^[a-f0-9]{24}$/),
    revision: z.string(),
    databaseSha256: digest,
    wasmSha256: digest,
    publicationSha256: digest,
    originalHrefSha256: digest,
    requestSha256: digest,
    responseSha256: digest,
    benchmarkHref: z.string().regex(/^\/forever-sim\/[a-f0-9]{24}\/[a-z_]+\/\?i=gtrcmxeu#/),
    capturedAt: z.string().datetime(),
  })
  .strict();
export const tierScenarioSnapshotSchema = z
  .object({
    schema: z.literal("kfc-forever-dps-tier-list.v1"),
    policySha256: digest,
    policy: z
      .object({
        version: z.enum([
          "pre-raid-solo-support-v1",
          "pre-raid-raid-support-v1",
        ]),
        iterations: z.literal(5000),
        seed: z.literal(58723001),
        durationSeconds: z.literal(300),
        scenario: z.enum(["solo", "raid"]),
        support,
        selfSupport: z.record(z.string(), z.unknown()),
        debuffs: z.record(z.string(), z.unknown()),
        externalDebuffs: z.string(),
        maintenance: z.string(),
        encounter: z.record(z.string(), z.unknown()),
        playerEquipmentTalentsRaceConsumes: z.string(),
      })
      .strict(),
    entries: z.array(entry).length(21),
  })
  .strict()
  .superRefine((snapshot, context): void => {
    const scenario = snapshot.policy.scenario;
    if (
      snapshot.policy.version !== `pre-raid-${scenario}-support-v1` ||
      snapshot.policy.support.version !==
        (scenario === "solo" ? "solo-v1" : "full-v2")
    )
      context.addIssue({ code: "custom", message: "Scenario policy mismatch" });
    if (new Set(snapshot.entries.map((row): string => row.id)).size !== 21)
      context.addIssue({ code: "custom", message: "Duplicate measured build" });
    for (const row of snapshot.entries) {
      if (
        row.scenario !== scenario ||
        row.policySha256 !== snapshot.policySha256 ||
        !row.spec.startsWith(row.profile + "/") ||
        !row.benchmarkHref.startsWith(
          `/forever-sim/${row.release}/${row.profile}/?i=gtrcmxeu#`,
        )
      )
        context.addIssue({
          code: "custom",
          message: "Measurement identity mismatch",
        });
      if (
        row.talents
          .replaceAll("-", "")
          .split("")
          .reduce((sum, rank): number => sum + Number(rank), 0) !== 51
      )
        context.addIssue({
          code: "custom",
          message: "Invalid level-60 talent allocation",
        });
    }
  });
export const tierScenariosSchema = z
  .object({
    schema: z.literal("community-solo-raid-tier-lists.v1"),
    sourcePointerSha256: digest,
    solo: tierScenarioSnapshotSchema,
    raid: tierScenarioSnapshotSchema,
  })
  .strict()
  .superRefine((value, context): void => {
    if (
      value.solo.policy.scenario !== "solo" ||
      value.raid.policy.scenario !== "raid"
    )
      context.addIssue({
        code: "custom",
        message: "Scenario labels were swapped",
      });
    const identities = (snapshot: typeof value.solo): string[] =>
      snapshot.entries
        .map(
          (row): string =>
            `${row.id}:${row.release}:${row.publicationSha256}:${row.originalHrefSha256}`,
        )
        .sort();
    if (
      JSON.stringify(identities(value.solo)) !==
      JSON.stringify(identities(value.raid))
    )
      context.addIssue({
        code: "custom",
        message: "Solo and Raid must use the same published builds",
      });
  });
export type TierScenarioSnapshot = z.infer<typeof tierScenarioSnapshotSchema>;
export type TierScenarios = z.infer<typeof tierScenariosSchema>;
export function parseTierScenario(value: unknown): TierScenario {
  return value === "solo" ? "solo" : "raid";
}
