import type { Metadata } from "next";
import type { PrismaClient } from "@prisma/client";
import { cache } from "react";
import { z } from "zod";
import { db } from "@/lib/db";
import { SITE_URL } from "@/lib/config";
import { formatGroupStart } from "@/lib/group-time";
import { pageMetadata } from "@/lib/seo";
import { eventArtwork } from "./event-artwork";
import { eventTypes, type EventType } from "./event-types";
import { gameSchema, type RaidGame } from "./games";
import { publicEventWhere } from "./publication";

export type RaidShareView = "signup" | "reserves";

export interface RaidShareEvent {
  id: string;
  title: string;
  game: RaidGame;
  eventType: EventType;
  raidName: string;
  region: string;
  faction: string;
  ruleset: string;
  startsAt: Date;
  capacity: number;
}

export async function findRaidShareEvent(
  id: string,
  database: PrismaClient = db,
): Promise<RaidShareEvent | null> {
  if (!/^[a-z0-9]{20,40}$/.test(id)) return null;
  const publication = publicEventWhere();
  if (!publication) return null;
  const event = await database.foreverRaidEvent.findFirst({
    where: { ...publication, game: { in: ["forever", "tbc"] }, id },
    select: {
      id: true,
      title: true,
      game: true,
      eventType: true,
      raidName: true,
      region: true,
      faction: true,
      ruleset: true,
      startsAt: true,
      capacity: true,
    },
  });
  return event
    ? {
        ...event,
        game: gameSchema.parse(event.game),
        eventType: z.enum(eventTypes).parse(event.eventType),
      }
    : null;
}

const getRaidShareEvent = cache(findRaidShareEvent);

export function raidShareMetadata(
  event: RaidShareEvent | null,
  view: RaidShareView,
): Metadata {
  const reserves = view === "reserves";
  const label = reserves ? "Soft reserves" : "Event signup";
  const title = event
    ? `${event.title} · ${reserves ? label : "Sign up"}`
    : label;
  const description = event
    ? [
        formatGroupStart(event.startsAt, event.region),
        event.game === "tbc" ? "The Burning Crusade" : "WoW Forever",
        `${event.region} ${event.faction} ${event.ruleset}`,
        `${event.capacity} players`,
        event.raidName,
        reserves
          ? "Browse loot, review the reserve limits and choose your items."
          : "Sign up with Discord and check the event plan.",
      ].join(" · ")
    : reserves
      ? "Sign in with Discord to view this raid's loot rules and choose your soft reserves."
      : "Sign in with Discord to view this event and join its signup list.";
  const path = event
    ? `/raids/${event.id}${reserves ? "/reserves" : ""}`
    : "/raids";
  const metadata = pageMetadata(title, description, path, true);
  const artwork = event
    ? eventArtwork(event.game, event.eventType, event.raidName)
    : null;
  const image = artwork
    ? `${SITE_URL}${artwork.file}`
    : `${SITE_URL}/opengraph-image`;
  return {
    ...metadata,
    title: { absolute: title },
    robots: { index: false, follow: false },
    openGraph: {
      ...metadata.openGraph,
      images: [
        {
          url: image,
          width: artwork?.width ?? 1200,
          height: artwork?.height ?? 630,
          alt: artwork?.alt ?? label,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export async function getRaidShareMetadata(
  id: string,
  view: RaidShareView,
): Promise<Metadata> {
  const event = await getRaidShareEvent(id);
  return raidShareMetadata(
    view === "reserves" && event?.eventType !== "raid" ? null : event,
    view,
  );
}
