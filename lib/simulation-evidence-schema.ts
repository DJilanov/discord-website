import { z } from "zod";

const digest = z.string().regex(/^[a-f0-9]{64}$/);
const key = z.string().regex(/^[a-z][a-z0-9_-]*$/);
const item = z
  .object({
    slot: z.number().int().min(0).max(16),
    id: z.number().int().nonnegative(),
    name: z.string(),
    icon: key,
    quality: z.number().int().min(0).max(7),
    stats: z.array(z.string()),
    enchant: z.string(),
  })
  .strict();
export const simulationBuildSchema = z
  .object({
    id: key,
    classKey: key,
    profile: key,
    profileSlug: key,
    name: z.string().min(1),
    referenceDps: z.number().positive().finite(),
    referenceIterations: z.number().int().positive(),
    dps: z.number().positive().finite(),
    stdev: z.number().nonnegative().finite(),
    iterations: z.literal(5000),
    measuredAt: z.string().datetime(),
    talents: z.string(),
    talentMapSha256: digest,
    selectedTalents: z
      .array(
        z
          .object({
            name: z.string(),
            tree: z.string(),
            rank: z.number().int().positive(),
            max: z.number().int().positive(),
            icon: key,
            description: z.string(),
            confirmed: z.boolean(),
          })
          .strict(),
      )
      .min(1),
    treePoints: z.array(z.number().int().nonnegative()).length(3),
    scenario: z.string(),
    priorities: z.array(z.string()).min(1),
    prepull: z.array(z.string()),
    disabled: z.array(z.string()),
    caveats: z.array(z.string()),
    warnings: z.array(z.string()),
    options: z.array(z.string()),
    gear: z.array(item).length(17),
    simulatorHref: z.string().url().nullable(),
    release: z.string().regex(/^[a-f0-9]{24}$/),
    wasmSha256: digest,
    databaseSha256: digest,
    publicationSha256: digest,
    rotationSha256: digest,
    requestSha256: digest,
    responseSha256: digest,
  })
  .strict();
export const simulationEvidenceSchema = z
  .object({
    schema: z.literal("community-class-simulation-guides.v1"),
    capturedAt: z.string().datetime(),
    sourcePointerSha256: digest,
    policySha256: digest,
    sourceUrl: z.string().url(),
    clientBuild: z.string(),
    license: z.object({
      id: z.string(),
      url: z.string().url(),
      attribution: z.string(),
    }),
    builds: z.array(simulationBuildSchema).length(25),
    assets: z.array(z.object({ key, sha256: digest }).strict()),
  })
  .strict()
  .superRefine((value, context): void => {
    if (
      new Set(value.builds.map((build) => build.id)).size !==
      value.builds.length
    )
      context.addIssue({
        code: "custom",
        message: "Duplicate simulation build",
      });
    if (new Set(value.builds.map((build) => build.classKey)).size !== 9)
      context.addIssue({
        code: "custom",
        message: "All nine classes are required",
      });
    for (const build of value.builds) {
      if (build.gear.some((item, index) => item.slot !== index))
        context.addIssue({
          code: "custom",
          message: "Gear slot order changed",
        });
      if (build.treePoints.reduce((sum, n) => sum + n, 0) !== 51)
        context.addIssue({
          code: "custom",
          message: "Expected a level-60 talent allocation",
        });
      if (
        build.selectedTalents.reduce((sum, talent) => sum + talent.rank, 0) !==
          51 ||
        build.selectedTalents.some((talent) => talent.rank > talent.max)
      )
        context.addIssue({
          code: "custom",
          message: "Invalid selected talent ranks",
        });
      if (
        build.simulatorHref &&
        !build.simulatorHref.startsWith(
          `https://kfcguild.online/tools/forever-sim/${build.release}/${build.profile}/#`,
        )
      )
        context.addIssue({
          code: "custom",
          message: "Build link does not preserve its release",
        });
    }
  });
export type SimulationBuild = z.infer<typeof simulationBuildSchema>;
export type SimulationEvidence = z.infer<typeof simulationEvidenceSchema>;
export interface RankedSimulationBuild extends SimulationBuild {
  rank: number;
  share: number;
  tier: "S" | "A" | "B" | "C" | "D";
  monteCarlo95: number;
}
export function rankSimulationBuilds(
  builds: readonly SimulationBuild[],
): RankedSimulationBuild[] {
  const sorted = [...builds].sort(
    (a, b) => b.dps - a.dps || a.id.localeCompare(b.id),
  );
  const top = sorted[0]?.dps ?? 1;
  return sorted.map((build, index): RankedSimulationBuild => {
    const share = (build.dps / top) * 100;
    return {
      ...build,
      rank: index + 1,
      share,
      tier:
        share >= 95
          ? "S"
          : share >= 85
            ? "A"
            : share >= 70
              ? "B"
              : share >= 55
                ? "C"
                : "D",
      monteCarlo95: (1.96 * build.stdev) / Math.sqrt(build.iterations),
    };
  });
}
