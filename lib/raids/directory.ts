import { z } from "zod";
import type { PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { queryValue, type QueryParams } from "@/lib/directory";
import { eventTypeDefinitions, eventTypes } from "./event-types";
import {
  raidDiscordDestinations,
  raidDiscordGuildIds,
} from "./discord-settings";

export async function approvedRaidEvents(
  query: QueryParams,
  database: PrismaClient = db,
): Promise<
  {
    id: string;
    title: string;
    activity: string;
    description: string;
    region: string;
    faction: string;
    ruleset: string;
    startsAt: Date;
    accepted: number;
    capacity: number;
    discordUrl: string;
  }[]
> {
  const destinations = raidDiscordDestinations();
  if (!destinations.length) return [];
  const activity = queryValue(query, "activity");
  const matchingTypes = eventTypes.filter(
    (type) =>
      !activity ||
      eventTypeDefinitions[type].label === activity ||
      (activity === "PvP premade" &&
        ["battleground", "world_pvp"].includes(type)) ||
      (activity === "RP event" && type === "social"),
  );
  const region = queryValue(query, "region"),
    faction = queryValue(query, "faction"),
    ruleset = queryValue(query, "ruleset");
  const events = await database.foreverRaidEvent.findMany({
    where: {
      game: "forever",
      eventType: { in: matchingTypes },
      status: { not: "cancelled" },
      endsAt: { gt: new Date() },
      ...(region ? { region } : {}),
      ...(faction ? { faction } : {}),
      ...(ruleset ? { ruleset } : {}),
      organizer: { active: true },
      discordPost: {
        is: {
          approvedAt: { not: null },
          messageId: { not: null },
          OR: [
            ...destinations.map(({ guildId, channelId, origin }) => ({
              guildId,
              channelId,
              origin,
            })),
            {
              guildId: { in: raidDiscordGuildIds() },
              origin: destinations[0].origin,
              visibility: "community",
              confirmedAt: { not: null },
            },
          ],
          status: { in: ["sent", "pending", "delivering"] },
        },
      },
    },
    select: {
      id: true,
      title: true,
      eventType: true,
      description: true,
      region: true,
      faction: true,
      ruleset: true,
      startsAt: true,
      capacity: true,
      discordPost: {
        select: { messageId: true, guildId: true, channelId: true },
      },
      _count: { select: { signups: { where: { status: "accepted" } } } },
    },
    orderBy: { startsAt: "asc" },
    take: 50,
  });
  return events.map((event) => ({
    id: event.id,
    title: event.title,
    activity:
      eventTypeDefinitions[z.enum(eventTypes).parse(event.eventType)].label,
    description: event.description,
    region: event.region,
    faction: event.faction,
    ruleset: event.ruleset,
    startsAt: event.startsAt,
    accepted: event._count.signups,
    capacity: event.capacity,
    discordUrl: `https://discord.com/channels/${event.discordPost!.guildId}/${event.discordPost!.channelId}/${event.discordPost!.messageId}`,
  }));
}
