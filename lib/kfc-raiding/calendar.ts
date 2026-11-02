import path from "node:path";
import type { PrismaClient } from "@prisma/client";
import { db } from "../db";
import { managedSessions } from "./sources";
import { RaidingStore } from "./storage";
import type { RaidSession, RaidingConfig } from "./contracts";

export interface KfcCalendarEvent {
  id: string;
  source: "forever-manager";
  game: "forever" | "tbc";
  eventType: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  capacity: number | null;
  signupCount: number;
  selectedCount: number;
  leaderName: string | null;
  status: "open" | "locked";
  signupUrl: string;
  discordUrl: string;
}

export function calendarSummary(session: RaidSession): KfcCalendarEvent | null {
  if (
    session.source !== "managed" ||
    !session.key.startsWith("managed:") ||
    !["open", "locked"].includes(session.status)
  )
    return null;
  return {
    id: `fr-${session.key.slice("managed:".length)}`,
    source: "forever-manager",
    game: session.game,
    eventType: session.eventType,
    title: session.title,
    startsAt: session.startsAt,
    endsAt: session.endsAt,
    capacity: session.capacity,
    signupCount: (session.registered ?? 0) + (session.confirmed ?? 0),
    selectedCount: session.confirmed ?? 0,
    leaderName: session.host,
    status: session.status === "locked" ? "locked" : "open",
    signupUrl: session.signupUrl,
    discordUrl: `https://discord.com/channels/${session.sourceGuildId}/${session.sourceChannelId}/${session.sourceMessageId}`,
  };
}

export async function kfcCalendarEvents(
  database: Pick<PrismaClient, "foreverRaidEvent"> = db,
  now = new Date(),
  config?: RaidingConfig | null,
): Promise<KfcCalendarEvent[]> {
  const settings =
    config === undefined
      ? await new RaidingStore(
          path.join(process.cwd(), ".data/kfc-raiding"),
        ).config()
      : config;
  if (!settings) return [];
  const sessions = await managedSessions(database, settings, now);
  return sessions.flatMap((session): KfcCalendarEvent[] => {
    const summary = calendarSummary(session);
    return summary ? [summary] : [];
  });
}
