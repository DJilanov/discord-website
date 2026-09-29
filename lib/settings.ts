import { cache } from "react";
import { db } from "@/lib/db";
import { DEFAULT_SETTINGS, type SiteSettings } from "@/lib/config";
import { settingsSchema } from "@/lib/validation";

export const getSettings = cache(async (): Promise<SiteSettings> => {
  const row = await db.foreverSiteSetting.findUnique({
    where: { key: "site" },
  });
  if (!row) return DEFAULT_SETTINGS;
  return settingsSchema.parse(row.value);
});
