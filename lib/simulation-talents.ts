import { z } from "zod";

export const simulationTalentTreeSchema = z
  .array(
    z.object({
      name: z.string(),
      talents: z.array(
        z.object({
          name: z.string(),
          maxPoints: z.number().int().positive(),
          location: z.object({
            rowIdx: z.number().int().nonnegative(),
            colIdx: z.number().int().nonnegative(),
          }),
        }),
      ),
    }),
  )
  .length(3);
export const clientTalentTreesSchema = z
  .array(
    z.object({
      name: z.string(),
      talents: z.array(
        z.object({
          name: z.string(),
          max: z.number().int().positive(),
          icon: z.string(),
          desc: z.array(z.string()),
          confirmed: z.array(z.number()).optional(),
        }),
      ),
    }),
  )
  .length(3);
export interface SelectedSimulationTalent {
  name: string;
  tree: string;
  rank: number;
  max: number;
  icon: string;
  description: string;
  confirmed: boolean;
}
export function mapRecordedTalents(
  allocation: string,
  trees: z.infer<typeof simulationTalentTreeSchema>,
  client: z.infer<typeof clientTalentTreesSchema>,
): SelectedSimulationTalent[] {
  if (!/^[0-5]*(?:-[0-5]*){0,2}$/.test(allocation))
    throw new Error("Invalid recorded talent string");
  const result: SelectedSimulationTalent[] = [];
  for (const [treeIndex, encoded] of allocation.split("-").entries()) {
    const tree = trees[treeIndex];
    const aliases: Readonly<Record<string, string>> = {
      "Shadow Magic": "Shadow",
      "Elemental Combat": "Elemental",
    };
    const reference = client.find(
      (entry) => entry.name === (aliases[tree.name] ?? tree.name),
    );
    if (!reference || encoded.length > tree.talents.length)
      throw new Error("Talent tree shape mismatch");
    for (const [index, digit] of [...encoded].entries()) {
      const rank = Number(digit);
      if (!rank) continue;
      const talent = tree.talents[index],
        current = reference.talents.find((entry) => entry.name === talent.name);
      if (!current || talent.maxPoints !== current.max || rank > current.max)
        throw new Error(`Talent mapping requires review: ${talent.name}`);
      const confirmed = Boolean(
        current.confirmed?.includes(rank) && current.desc[rank - 1],
      );
      result.push({
        name: talent.name,
        tree: tree.name,
        rank,
        max: current.max,
        icon: current.icon,
        description: confirmed
          ? current.desc[rank - 1]
          : "No confirmed client-reference tooltip for this rank. The saved model allocation remains available in the download.",
        confirmed,
      });
    }
  }
  if (result.reduce((sum, talent) => sum + talent.rank, 0) !== 51)
    throw new Error("Incomplete level-60 talent allocation");
  return result;
}
