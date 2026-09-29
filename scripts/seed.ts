import "./env";
import { db } from "../lib/db";
import { DEFAULT_SETTINGS } from "../lib/config";
import { editorialGuides } from "../content/editorial";

async function main(): Promise<void> {
  await db.foreverSiteSetting.upsert({
    where: { key: "site" },
    create: { key: "site", value: { ...DEFAULT_SETTINGS } },
    update: {},
  });
  for (const guide of editorialGuides) {
    await db.foreverGuide.upsert({
      where: { slug: guide.slug },
      create: {
        ...guide,
        published: true,
        publishedAt: new Date(),
        metaTitle: guide.title,
        metaDescription: guide.excerpt,
        author: "WoW Forever Discord Team",
      },
      update: {},
    });
  }
  console.log(
    "Seeded six community guides. Existing content and settings were preserved.",
  );
}
main()
  .catch((error: Error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
