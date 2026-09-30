import "./env";
import { db } from "../lib/db";
import { canRefreshEditorialGuide } from "../lib/editorial-publication";
import { editorialGuides } from "../content/editorial";
import { guideSchema } from "../lib/validation";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== "--dry-run"))
    throw new Error("Usage: npm run content:publish-editorial -- [--dry-run]");
  const dryRun = args.includes("--dry-run");
  const result = { created: 0, updated: 0, preserved: 0 };
  const sources = editorialGuides.map((source) =>
    guideSchema.parse({
      ...source,
      author: "WoW Forever Discord Team",
      published: true,
      metaTitle: source.title,
      metaDescription: source.excerpt,
    }),
  );
  for (const data of sources) {
    const outcome = await db.$transaction(
      async (tx): Promise<keyof typeof result> => {
        const existing = await tx.foreverGuide.findUnique({
          where: { slug: data.slug },
        });
        if (!existing) {
          if (dryRun) return "created";
          await tx.foreverGuide.create({
            data: { ...data, publishedAt: new Date() },
          });
          return "created";
        }
        if (
          !canRefreshEditorialGuide(existing) ||
          (existing.title === data.title &&
            existing.excerpt === data.excerpt &&
            existing.content === data.content)
        )
          return "preserved";
        if (dryRun) return "updated";
        const update = await tx.foreverGuide.updateMany({
          where: { id: existing.id, updatedAt: existing.updatedAt },
          data: {
            title: data.title,
            excerpt: data.excerpt,
            content: data.content,
            author:
              existing.author === "Forever Community Team"
                ? data.author
                : existing.author,
            metaTitle:
              !existing.metaTitle || existing.metaTitle === existing.title
                ? data.metaTitle
                : existing.metaTitle,
            metaDescription:
              !existing.metaDescription ||
              existing.metaDescription === existing.excerpt
                ? data.metaDescription
                : existing.metaDescription,
          },
        });
        return update.count ? "updated" : "preserved";
      },
    );
    result[outcome] += 1;
  }
  console.log(JSON.stringify({ dryRun, ...result }));
}

main()
  .catch((error: unknown): void => {
    console.error(
      error instanceof Error ? error.message : "Editorial publication failed",
    );
    process.exitCode = 1;
  })
  .finally(async (): Promise<void> => db.$disconnect());
