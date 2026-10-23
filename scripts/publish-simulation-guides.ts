import "./env";
import { db } from "../lib/db";
import { simulationGuides } from "../content/simulation-guides";
import { editorialPublicationData } from "../lib/editorial-publication";
import { simulationPublicationAction } from "../lib/simulation-publication";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (
    args.some((arg) => !["--dry-run", "--publish"].includes(arg)) ||
    (!args.includes("--dry-run") && !args.includes("--publish"))
  )
    throw new Error(
      "Use --dry-run to preview or --publish after release verification",
    );
  const dryRun = args.includes("--dry-run");
  const result = await db.$transaction(
    async (tx) => {
      const result = {
        created: 0,
        published: 0,
        preserved: 0,
        untouched: await tx.foreverGuide.count({
          where: {
            slug: { notIn: simulationGuides.map((guide) => guide.slug) },
          },
        }),
      };
      for (const source of simulationGuides) {
        const existing = await tx.foreverGuide.findUnique({
            where: { slug: source.slug },
          }),
          action = simulationPublicationAction(existing, source);
        if (action === "preserve") {
          result.preserved++;
          continue;
        }
        const data = { ...editorialPublicationData(source), published: true };
        if (!dryRun) {
          if (action === "create")
            await tx.foreverGuide.create({
              data: { ...data, publishedAt: new Date() },
            });
          else {
            if (!existing) throw new Error("Publication state changed");
            const updated = await tx.foreverGuide.updateMany({
              where: {
                id: existing.id,
                updatedAt: existing.updatedAt,
                published: false,
                publishedAt: null,
              },
              data: { published: true, publishedAt: new Date() },
            });
            if (updated.count !== 1)
              throw new Error(
                "Guide changed concurrently; publication rolled back",
              );
          }
        }
        if (action === "create") result.created++;
        else result.published++;
      }
      return result;
    },
    { timeout: 15000 },
  );
  console.log(JSON.stringify({ dryRun, ...result }));
}
main()
  .catch((error: unknown): void => {
    console.error(
      error instanceof Error ? error.message : "Simulation publication failed",
    );
    process.exitCode = 1;
  })
  .finally(async (): Promise<void> => db.$disconnect());
