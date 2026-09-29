import "./env";
import { db } from "../lib/db";
import { canRefreshStarterGuide } from "../lib/editorial-publication";
import { editorialGuides } from "../content/editorial";
import { guideSchema } from "../lib/validation";

async function main(): Promise<void> {
  const result = { created: 0, updated: 0, preserved: 0 };
  for (const source of editorialGuides) {
    const data = guideSchema.parse({
      ...source,
      author: "WoW Forever Discord Team",
      published: true,
      metaTitle: source.title,
      metaDescription: source.excerpt,
    });
    const outcome = await db.$transaction(
      async (tx): Promise<keyof typeof result> => {
        const existing = await tx.foreverGuide.findUnique({
          where: { slug: source.slug },
        });
        if (!existing) {
          await tx.foreverGuide.create({
            data: { ...data, publishedAt: new Date() },
          });
          return "created";
        }
        if (!canRefreshStarterGuide(existing)) return "preserved";
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
            metaTitle: existing.metaTitle || data.metaTitle,
            metaDescription: existing.metaDescription || data.metaDescription,
          },
        });
        return update.count ? "updated" : "preserved";
      },
    );
    result[outcome] += 1;
  }
  console.log(JSON.stringify(result));
}

main()
  .catch((error: unknown): void => {
    console.error(
      error instanceof Error ? error.message : "Editorial publication failed",
    );
    process.exitCode = 1;
  })
  .finally(async (): Promise<void> => db.$disconnect());
