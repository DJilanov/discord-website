import "./env";
import type { Prisma } from "@prisma/client";
import { db } from "../lib/db";
import { DEFAULT_SETTINGS } from "../lib/config";
import { settingsSchema } from "../lib/validation";
import { initialGuides } from "../content/guides";

const previousCovers: Record<string, string> = {
  "find-your-wow-forever-guild": "/images/community.webp",
  "join-wow-forever-discord": "/images/rp.webp",
  "clear-loot-rules-better-groups": "/images/pve.webp",
  "pve-pvp-rp-find-your-community": "/images/pvp.webp",
};

async function refresh(): Promise<void> {
  const result = await db.$transaction(async (tx) => {
    let settingsChanged = 0;
    let coversChanged = 0;
    const row = await tx.foreverSiteSetting.findUnique({
      where: { key: "site" },
    });
    if (row) {
      const settings = settingsSchema.parse(row.value);
      let changed = false;
      if (
        settings.announcement === "A new chapter. A community built to last."
      ) {
        settings.announcement = "";
        changed = true;
      }
      if (
        settings.heroDescription ===
        "Good people. Great adventures. Find your guild, form your next group, and make Azeroth feel like home."
      ) {
        settings.heroDescription = DEFAULT_SETTINGS.heroDescription;
        changed = true;
      }
      if (changed) {
        // Compare the original JSON so an intervening admin edit is never overwritten.
        const updated = await tx.foreverSiteSetting.updateMany({
          where: {
            key: row.key,
            value: { equals: row.value as Prisma.InputJsonValue },
          },
          data: { value: settings as unknown as Prisma.InputJsonValue },
        });
        if (!updated.count)
          throw new Error(
            "Settings changed during refresh; retry without overwriting the admin edit.",
          );
        settingsChanged = updated.count;
      }
    }
    for (const guide of initialGuides) {
      const previous = previousCovers[guide.slug];
      if (!previous) continue;
      const updated = await tx.foreverGuide.updateMany({
        where: { slug: guide.slug, coverImage: previous },
        data: { coverImage: guide.coverImage },
      });
      coversChanged += updated.count;
    }
    return { settingsChanged, coversChanged };
  });
  console.log("Design content refresh:", result);
}

refresh()
  .catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : "Design content refresh failed.",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
