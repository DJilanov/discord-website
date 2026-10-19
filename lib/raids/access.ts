import type { Prisma } from "@prisma/client";
import { memberBetaEnabled } from "./config";
import {
  raidDestinationForPost,
  raidDiscordSettings,
  raidDiscordGuildIds,
} from "./discord-settings";

interface EventAudience {
  audience: readonly string[];
  discordPost: {
    guildId: string;
    channelId: string;
    origin: string;
    visibility: string;
    confirmedAt: Date | null;
  } | null;
}

export function raidAudienceIncludes(
  event: EventAudience,
  discordId: string,
): boolean {
  return (
    event.audience.includes(discordId) ||
    Boolean(
      memberBetaEnabled() &&
      event.discordPost?.visibility === "community" &&
      raidDestinationForPost(event.discordPost),
    )
  );
}

export function raidAudienceFilter(
  discordId: string,
): Prisma.ForeverRaidEventWhereInput {
  const settings = raidDiscordSettings();
  return {
    OR: [
      { audience: { has: discordId } },
      ...(memberBetaEnabled() && settings
        ? [
            {
              discordPost: {
                is: {
                  visibility: "community",
                  confirmedAt: { not: null },
                  guildId: { in: raidDiscordGuildIds() },
                  origin: settings.origin,
                },
              },
            },
          ]
        : []),
    ],
  };
}
