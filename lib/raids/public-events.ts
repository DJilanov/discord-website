import { cache } from "react";
import { z } from "zod";
import { db } from "@/lib/db";
import type { PrismaClient } from "@prisma/client";
import { publicEventWhere } from "./publication";
import {
  eventTypeDefinitions,
  eventTypes,
  type EventType,
} from "./event-types";

export interface PublicEvent {
  id: string;
  title: string;
  eventType: EventType;
  activity: string;
  raidName: string;
  region: string;
  faction: string;
  ruleset: string;
  description: string;
  startsAt: Date;
  endsAt: Date;
  signupClosesAt: Date;
  capacity: number;
  admission: string;
  status: string;
  accepted: number;
  discordUrl: string;
}

export async function findPublicEvent(
  id: string,
  database: PrismaClient = db,
): Promise<PublicEvent | null> {
  if (!/^[a-z0-9]{20,40}$/.test(id)) return null;
  const publication = publicEventWhere();
  if (!publication) return null;
  const event = await database.foreverRaidEvent.findFirst({
    where: { ...publication, id },
    select: {
      id: true,
      title: true,
      eventType: true,
      raidName: true,
      region: true,
      faction: true,
      ruleset: true,
      description: true,
      startsAt: true,
      endsAt: true,
      signupClosesAt: true,
      capacity: true,
      admission: true,
      status: true,
      discordPost: {
        select: { guildId: true, channelId: true, messageId: true },
      },
      _count: {
        select: {
          signups: { where: { status: "accepted" } },
        },
      },
    },
  });
  if (!event?.discordPost?.messageId) return null;
  const { _count, discordPost, ...summary } = event;
  const eventType = z.enum(eventTypes).parse(event.eventType);
  return {
    ...summary,
    eventType,
    activity: eventTypeDefinitions[eventType].label,
    accepted: _count.signups,
    discordUrl: `https://discord.com/channels/${discordPost.guildId}/${discordPost.channelId}/${discordPost.messageId}`,
  };
}

export const getPublicEvent = cache(findPublicEvent);

export async function publicEventSitemap(
  database: PrismaClient = db,
): Promise<{ id: string }[]> {
  const publication = publicEventWhere();
  if (!publication) return [];
  return database.foreverRaidEvent.findMany({
    where: { ...publication, endsAt: { gt: new Date() } },
    select: { id: true },
    orderBy: { startsAt: "asc" },
    take: 1000,
  });
}
