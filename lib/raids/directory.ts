import { z } from "zod";
import type { PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { queryValue, type QueryParams } from "@/lib/directory";
import { eventTypeDefinitions, eventTypes } from "./event-types";
import { publicEventWhere } from "./publication";

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
  const publication = publicEventWhere();
  if (!publication) return [];
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
  const search = queryValue(query, "q").trim();
  const events = await database.foreverRaidEvent.findMany({
    where: {
      ...publication,
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" as const } },
              { raidName: { contains: search, mode: "insensitive" as const } },
              {
                description: { contains: search, mode: "insensitive" as const },
              },
            ],
          }
        : {}),
      eventType: { in: matchingTypes },
      endsAt: { gt: new Date() },
      ...(region ? { region } : {}),
      ...(faction ? { faction } : {}),
      ...(ruleset ? { ruleset } : {}),
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
