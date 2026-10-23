import source from "@/content/simulation-tier-scenarios.json";
import {
  tierScenariosSchema,
  type TierScenarioSnapshot,
} from "./simulation-tier-schema";

export const tierScenarios = tierScenariosSchema.parse(source);

const profileClasses: Readonly<Record<string, string>> = {
  warrior: "warrior",
  rogue: "rogue",
  hunter: "hunter",
  mage: "mage",
  warlock: "warlock",
  balance_druid: "druid",
  feral_druid: "druid",
  shadow_priest: "priest",
  smite_priest: "priest",
  elemental_shaman: "shaman",
  enhancement_shaman: "shaman",
};
const names: Readonly<Record<string, string>> = {
  "fury-horde": "Fury",
  "arms-alliance": "Arms",
  "two-hand-fury-static": "Two-hand Fury",
  "rogue-combat-static": "Combat",
  "rogue-mutilate-static": "Mutilate",
  "rogue-subtlety-static": "Subtlety",
  "hunter-beast-mastery-static": "Beast Mastery",
  "hunter-marksmanship-static": "Marksmanship",
  "hunter-survival-static": "Survival",
  "balance-static": "Balance",
  "feral-cat-static": "Feral Cat",
  "mage-frost-static": "Frost",
  "mage-fire-static": "Fire",
  "mage-arcane-static": "Arcane",
  "warlock-demonology-static": "Demonology",
  "warlock-affliction-static": "Affliction",
  "priest-shadow-static": "Shadow",
  "priest-smite-static": "Smite",
  "shaman-elemental-static": "Elemental melee-weave",
  "shaman-stormcaller-static": "Stormcaller melee-weave",
  "shaman-enhancement-static": "Enhancement",
};
export interface TierScenarioBuild {
  readonly id: string;
  readonly classKey: string;
  readonly name: string;
  readonly treePoints: readonly number[];
  readonly dps: number;
  readonly stdev: number;
  readonly iterations: number;
  readonly measuredAt: string;
  readonly benchmarkHref: string;
  readonly release: string;
  readonly requestSha256: string;
  readonly responseSha256: string;
}
export function buildsForTierScenario(
  snapshot: TierScenarioSnapshot,
): readonly TierScenarioBuild[] {
  return snapshot.entries.map((entry): TierScenarioBuild => {
    const classKey = profileClasses[entry.profile],
      name = names[entry.id];
    if (!classKey || !name) throw new Error("Unknown published tier build");
    const trees = entry.talents.split("-");
    return {
      id: entry.id,
      classKey,
      name,
      treePoints: [0, 1, 2].map((index): number =>
        [...(trees[index] ?? "")].reduce(
          (sum, rank): number => sum + Number(rank),
          0,
        ),
      ),
      dps: entry.dps,
      stdev: entry.stdev,
      iterations: entry.iterations,
      measuredAt: entry.capturedAt,
      benchmarkHref: `https://kfcguild.online/tools${entry.benchmarkHref}`,
      release: entry.release,
      requestSha256: entry.requestSha256,
      responseSha256: entry.responseSha256,
    };
  });
}
