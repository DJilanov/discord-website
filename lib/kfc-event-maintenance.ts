import { z } from "zod";
import {
  foreverGuildId,
  kfcGuildId,
  scheduledEventBindings,
} from "../content/kfc-community";
import { discordId } from "./discord-audit";

export const scheduledEventSchema = z.object({
  id: discordId,
  guild_id: z.union([z.literal(kfcGuildId), z.literal(foreverGuildId)]),
  name: z.string().min(1).max(100),
  scheduled_start_time: z.iso.datetime({ offset: true }),
  scheduled_end_time: z.iso.datetime({ offset: true }).nullable(),
  entity_type: z.number().int(),
  status: z.number().int(),
  channel_id: discordId.nullable(),
  entity_metadata: z.object({ location: z.string() }).nullable().optional(),
});
export type ScheduledEvent = z.infer<typeof scheduledEventSchema>;
export interface CanonicalScheduledEvent {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  status: string;
  version: number;
}
export interface ScheduledEventPatch {
  name?: string;
  scheduled_start_time?: string;
  scheduled_end_time?: string;
  status?: 4;
}

export interface ScheduledEventProjection {
  guildId: string;
  scheduledId: string;
}

export function scheduledEventPatch(
  canonical: CanonicalScheduledEvent,
  scheduled: ScheduledEvent,
  projection: ScheduledEventProjection,
  now: Date,
): ScheduledEventPatch | null {
  if (
    !scheduledEventBindings.some(
      (binding): boolean =>
        binding.eventId === canonical.id &&
        binding.projections.some(
          (candidate): boolean =>
            candidate.guildId === projection.guildId &&
            candidate.scheduledId === projection.scheduledId,
        ),
    )
  )
    throw new Error("Unapproved event binding.");
  if (
    scheduled.guild_id !== projection.guildId ||
    scheduled.id !== projection.scheduledId ||
    scheduled.entity_type !== 3 ||
    scheduled.channel_id !== null
  )
    throw new Error(
      "Only an approved external event projection can be synchronized.",
    );
  if (scheduled.status !== 1) return null;
  if (canonical.status === "cancelled") return { status: 4 };
  if (
    ![
      canonical.startsAt.getTime(),
      canonical.endsAt.getTime(),
      now.getTime(),
    ].every(Number.isFinite) ||
    canonical.endsAt <= canonical.startsAt
  )
    throw new Error("Invalid canonical event times.");
  if (canonical.startsAt <= now) return null;
  const name = [...canonical.title].slice(0, 100).join("");
  const patch: ScheduledEventPatch = {};
  if (scheduled.name !== name) patch.name = name;
  if (
    new Date(scheduled.scheduled_start_time).getTime() !==
    canonical.startsAt.getTime()
  )
    patch.scheduled_start_time = canonical.startsAt.toISOString();
  if (
    !scheduled.scheduled_end_time ||
    new Date(scheduled.scheduled_end_time).getTime() !==
      canonical.endsAt.getTime()
  )
    patch.scheduled_end_time = canonical.endsAt.toISOString();
  return Object.keys(patch).length ? patch : null;
}

export interface KfcCalendarEntry {
  title: string;
  game: "tbc" | "forever" | null;
  startsAt: Date;
  endsAt: Date | null;
  url: string;
}
export function kfcCalendarContent(
  entries: KfcCalendarEntry[],
  now: Date,
): string {
  const intro = "**Upcoming KFC groups**\n\n";
  const footer =
    "\n**Signup is separate from Interested.** Open the event for class/spec, roster and loot. TBC host announcements: <#1460899582824153140>. Forever plans: <#1548747530790248610>. Other groups: looking-for-group and pvp-groups.";
  let content = intro,
    listed = 0;
  const seen = new Set<string>();
  for (const entry of [...entries].sort(
    (a, b): number => a.startsAt.getTime() - b.startsAt.getTime(),
  )) {
    if (
      !Number.isFinite(entry.startsAt.getTime()) ||
      (entry.endsAt ?? entry.startsAt) <= now ||
      seen.has(entry.url)
    )
      continue;
    const url = new URL(entry.url);
    if (
      url.origin !== "https://www.wowforeverdiscord.online" &&
      url.origin !== "https://discord.com"
    )
      throw new Error("Unapproved calendar link origin.");
    if (url.username || url.password || url.search || url.hash)
      throw new Error("Invalid calendar link.");
    const title = [...entry.title]
      .slice(0, 100)
      .join("")
      .replace(/[\\\[\]_*`<>]/g, "\\$&");
    const start = Math.floor(entry.startsAt.getTime() / 1000);
    const finish = entry.endsAt
      ? ` - <t:${Math.floor(entry.endsAt.getTime() / 1000)}:t>`
      : "";
    const edition =
      entry.game === "tbc"
        ? "TBC"
        : entry.game === "forever"
          ? "WoW Forever"
          : "Check game edition";
    const line = `**[${title}](${url.href})**\n${edition} - <t:${start}:F>${finish}\n\n`;
    if (listed >= 6 || (content + line + footer).length > 1900) break;
    content += line;
    seen.add(entry.url);
    listed++;
  }
  if (!listed)
    content +=
      "No upcoming runs are listed in the tracked calendar right now. Check host announcements and group requests below.\n";
  return content + footer;
}
