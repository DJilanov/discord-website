import type { Prisma } from "@prisma/client";
import { raidDiscordGuildIds, raidDiscordSettings } from "./discord-settings";

export function publicEventWhere(): Prisma.ForeverRaidEventWhereInput | null {
  const settings = raidDiscordSettings();
  if (!settings) return null;
  return {
    game: "forever",
    status: { not: "cancelled" },
    organizer: { active: true },
    discordPost: {
      is: {
        origin: settings.origin,
        guildId: { in: raidDiscordGuildIds() },
        visibility: "community",
        confirmedAt: { not: null },
        approvedAt: { not: null },
        messageId: { not: null },
        status: { in: ["sent", "pending", "delivering"] },
      },
    },
  };
}
