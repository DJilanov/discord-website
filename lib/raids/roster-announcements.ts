import { createHash, randomUUID } from "node:crypto";
import { lstat, mkdir, open, readFile, rename, unlink } from "node:fs/promises";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { discordText, emojiText } from "./discord-format";
import { classes, specializationNames } from "./specializations";
import { eventArtwork } from "./event-artwork";
import { eventTypes } from "./event-types";
import { gameSchema } from "./games";
import {
  raidDestinationForPost,
  type RaidDiscordSettings,
} from "./discord-settings";
import {
  raidDiscordRequest,
  RaidDiscordError,
  type RaidDiscordRequest,
} from "./discord-delivery";
import { nativeMessageSchema, type NativeMessage } from "./native-contracts";
import { offerSchema } from "./roster-confirmation-contracts";
import { publicEventWhere } from "./publication";
import { jsonChecksum } from "./json";

export interface RosterAnnouncement {
  eventId: string;
  title: string;
  startsAt: Date;
  deadline: Date;
  discordUrl: string;
  imageUrl?: string;
  signupClosed: boolean;
  cancelled: boolean;
  players: Array<{
    name: string;
    className: string;
    specialization: string | null;
    state: string;
  }>;
}

function marker(eventId: string): string {
  return `Roster confirmation ${eventId}`;
}

export function rosterAnnouncementMessage(
  roster: RosterAnnouncement,
  origin: string,
): NativeMessage {
  const groups = ["Confirmed", "Waiting", "Declined", "Removed"] as const;
  const rows = groups.map((label) => ({
    label,
    lines: [] as string[],
    count: 0,
    shown: 0,
  }));
  for (const player of roster.players) {
    const label = ["confirmed", "manual"].includes(player.state)
      ? "Confirmed"
      : player.state === "declined"
        ? "Declined"
        : player.state === "revoked"
          ? "Removed"
          : "Waiting";
    const group = rows.find((row) => row.label === label)!;
    group.count++;
    const note =
      player.state === "manual"
        ? " · verified by leader"
        : player.state === "expired"
          ? " · no reply before deadline"
          : player.state === "changed"
            ? " · updated reply needed"
            : "";
    const className = z.enum(classes).safeParse(player.className);
    const specialization = z
      .enum(specializationNames)
      .safeParse(player.specialization);
    const icon = className.success
      ? emojiText(
          className.data,
          specialization.success ? specialization.data : null,
        )
      : "";
    const spec = discordText(
      player.specialization
        ? `${player.specialization} ${player.className}`
        : player.className,
      55,
    );
    const line = `${icon}**${discordText(player.name, 40)}**\n*${spec}${note}*`;
    if ([...group.lines, line].join("\n\n").length > 850) continue;
    group.lines.push(line);
    group.shown++;
  }
  const url = `${origin}/raids/${roster.eventId}`;
  const confirmed = rows[0].count;
  const declined = rows[2].count;
  const statusIcons = {
    Confirmed: "✅",
    Waiting: "⏳",
    Declined: "❌",
    Removed: "➖",
  };
  const empty = {
    Confirmed: "No confirmations yet",
    Waiting: "No replies pending",
    Declined: "No declines",
    Removed: "—",
  };
  const description = roster.cancelled
    ? "⛔ **Event cancelled**"
    : [
        `**ROSTER READY** · ${roster.signupClosed ? "🔒 Signups closed" : "Signups open"} · **${confirmed}/${roster.players.length} confirmed**`,
        `📅 **Start** <t:${Math.floor(roster.startsAt.getTime() / 1000)}:f>\n⏰ **Reply by** <t:${Math.floor(roster.deadline.getTime() / 1000)}:f>`,
        "Reply in your bot DM or use **My signup** on the signup post.",
      ].join("\n\n");
  return nativeMessageSchema.parse({
    content: "",
    allowed_mentions: { parse: [] },
    embeds: [
      {
        title: `${roster.cancelled ? "⛔" : "⚔️"} ${discordText(roster.title, 140)}`,
        url: `${url}#event-roster`,
        description,
        color:
          roster.cancelled || declined
            ? 0xd77d71
            : confirmed > 0 && confirmed === roster.players.length
              ? 0x64b38b
              : 0xd4a84b,
        ...(roster.imageUrl ? { image: { url: roster.imageUrl } } : {}),
        fields: rows
          .filter((row) => row.count > 0 || row.label !== "Removed")
          .map((row) => ({
            name: `${statusIcons[row.label]} ${row.label} (${row.count})`,
            value: [
              row.lines.join("\n\n") || empty[row.label],
              ...(row.shown < row.count
                ? [`[+${row.count - row.shown} more players](${url})`]
                : []),
            ].join("\n\n"),
            inline: row.label !== "Removed",
          })),
        footer: {
          text: "Live attendance · Updates automatically as players reply",
        },
      },
    ],
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 5,
            label: "Open signup post",
            url: roster.discordUrl,
          },
          {
            type: 2,
            style: 5,
            label: "View full roster",
            url: `${url}#event-roster`,
          },
        ],
      },
    ],
  });
}

const receiptSchema = z.object({
  eventId: z.string().regex(/^[a-z0-9]{20,40}$/),
  guildId: z.string().regex(/^\d{17,20}$/),
  channelId: z.string().regex(/^\d{17,20}$/),
  messageId: z
    .string()
    .regex(/^\d{17,20}$/)
    .nullable(),
  status: z.enum(["sending", "sent", "uncertain", "blocked"]),
  checksum: z.string().nullable(),
  retryAt: z.number(),
  error: z.string().nullable(),
});
type Receipt = z.infer<typeof receiptSchema>;
const deliveredSchema = z.object({
  id: z.string().regex(/^\d{17,20}$/),
  channel_id: z.string(),
  author: z.object({ id: z.string() }),
  embeds: z
    .array(
      z.object({
        url: z.string().optional(),
        footer: z.object({ text: z.string() }).optional(),
      }),
    )
    .default([]),
});
function missing(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
async function privateRead(filename: string): Promise<string> {
  const info = await lstat(filename);
  if (!info.isFile() || info.isSymbolicLink() || info.mode & 0o077)
    throw new Error("Unsafe roster announcement state.");
  return readFile(filename, "utf8");
}
async function save(filename: string, value: Receipt): Promise<void> {
  const temp = `${filename}.${randomUUID()}.tmp`,
    file = await open(temp, "wx", 0o600);
  try {
    await file.writeFile(JSON.stringify(value));
    await file.sync();
  } finally {
    await file.close();
  }
  await rename(temp, filename);
}

export async function syncRosterAnnouncement(
  roster: RosterAnnouncement,
  settings: RaidDiscordSettings,
  request: RaidDiscordRequest,
  root: string,
): Promise<number> {
  receiptSchema.shape.eventId.parse(roster.eventId);
  receiptSchema.shape.channelId.parse(settings.channelId);
  await mkdir(root, { recursive: true, mode: 0o700 });
  const info = await lstat(root);
  if (!info.isDirectory() || info.isSymbolicLink() || info.mode & 0o077)
    throw new Error("Unsafe roster announcement directory.");
  const filename = path.join(
      root,
      `${roster.eventId}-${settings.channelId}.json`,
    ),
    lock = `${filename}.lock`;
  try {
    const owner = z
      .object({ pid: z.number().int().positive() })
      .parse(JSON.parse(await privateRead(lock)));
    try {
      process.kill(owner.pid, 0);
      return 0;
    } catch (error: unknown) {
      if (!(
        error instanceof Error &&
        "code" in error &&
        error.code === "ESRCH"
      ))
        throw error;
      await unlink(lock);
    }
  } catch (error: unknown) {
    if (!missing(error)) throw error;
  }
  let handle;
  try {
    handle = await open(lock, "wx", 0o600);
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "EEXIST")
      return 0;
    throw error;
  }
  try {
    await handle.writeFile(JSON.stringify({ pid: process.pid }));
    await handle.sync();
    let receipt: Receipt | null = null;
    try {
      receipt = receiptSchema.parse(JSON.parse(await privateRead(filename)));
    } catch (error: unknown) {
      if (!missing(error)) throw error;
    }
    if (
      receipt &&
      (receipt.eventId !== roster.eventId ||
        receipt.channelId !== settings.channelId ||
        receipt.guildId !== settings.guildId)
    )
      throw new Error("Roster announcement destination mismatch.");
    if (receipt && receipt.retryAt > Date.now()) return 0;
    if (!receipt && roster.cancelled) return 0;
    const message = rosterAnnouncementMessage(roster, settings.origin),
      checksum = jsonChecksum(message);
    if (receipt?.status === "sent" && receipt.checksum === checksum) return 0;
    function validate(raw: unknown): string {
      const value = deliveredSchema.parse(raw);
      if (
        value.channel_id !== settings.channelId ||
        value.author.id !== settings.applicationId ||
        !value.embeds.some(
          (embed) =>
            embed.footer?.text === marker(roster.eventId) ||
            (embed.url !== undefined && embed.url === message.embeds[0].url),
        )
      )
        throw new Error("Roster announcement message identity mismatch.");
      return value.id;
    }
    receipt ??= {
      eventId: roster.eventId,
      guildId: settings.guildId,
      channelId: settings.channelId,
      messageId: null,
      status: "blocked",
      checksum: null,
      retryAt: 0,
      error: null,
    };
    let postAttempted = false;
    try {
      const channel = z
        .object({ id: z.string(), guild_id: z.string() })
        .parse(await request(`/channels/${settings.channelId}`));
      if (
        channel.id !== settings.channelId ||
        channel.guild_id !== settings.guildId
      )
        throw new Error("Roster announcement channel mismatch.");
      if (
        !receipt.messageId &&
        ["sending", "uncertain"].includes(receipt.status)
      ) {
        const recent = z
          .array(z.unknown())
          .parse(
            await request(`/channels/${settings.channelId}/messages?limit=100`),
          );
        const matches = recent.filter((raw) => {
          const value = deliveredSchema.safeParse(raw);
          return (
            value.success &&
            value.data.channel_id === settings.channelId &&
            value.data.author.id === settings.applicationId &&
            value.data.embeds.some(
              (embed) =>
                embed.footer?.text === marker(roster.eventId) ||
                (embed.url !== undefined &&
                  embed.url === message.embeds[0].url),
            )
          );
        });
        if (matches.length !== 1) {
          await save(filename, {
            ...receipt,
            status: "uncertain",
            retryAt: Date.now() + 86400000,
            error: "delivery_uncertain_manual_review_required",
          });
          throw new Error(
            "Public roster delivery is uncertain; no duplicate was posted.",
          );
        }
        receipt.messageId = validate(matches[0]);
      }
      if (receipt.messageId) {
        const route = `/channels/${settings.channelId}/messages/${receipt.messageId}`;
        if (validate(await request(route)) !== receipt.messageId)
          throw new Error("Public roster receipt mismatch.");
        if (
          validate(await request(route, "PATCH", message)) !== receipt.messageId
        )
          throw new Error("Public roster edit mismatch.");
      } else {
        receipt.status = "sending";
        await save(filename, receipt);
        const nonce = createHash("sha256")
          .update(`${roster.eventId}:${settings.channelId}:roster-publication`)
          .digest("hex")
          .slice(0, 25);
        postAttempted = true;
        receipt.messageId = validate(
          await request(`/channels/${settings.channelId}/messages`, "POST", {
            ...message,
            nonce,
            enforce_nonce: true,
          }),
        );
      }
      await save(filename, {
        ...receipt,
        status: "sent",
        checksum,
        retryAt: 0,
        error: null,
      });
      return 1;
    } catch (error: unknown) {
      const definite = error instanceof RaidDiscordError && error.status < 500;
      await save(filename, {
        ...receipt,
        status:
          !receipt.messageId &&
          !definite &&
          (postAttempted || ["sending", "uncertain"].includes(receipt.status))
            ? "uncertain"
            : "blocked",
        retryAt:
          Date.now() + (definite && error.status === 429 ? 60000 : 900000),
        error: definite
          ? `discord_${error.status}`
          : "delivery_needs_reconciliation",
      });
      throw error;
    }
  } finally {
    await handle.close();
    await unlink(lock);
  }
}

export async function runRosterAnnouncements(
  database: PrismaClient = db,
  root = path.join(process.cwd(), ".data/roster-announcements"),
  requestFactory: (
    settings: RaidDiscordSettings,
  ) => RaidDiscordRequest = raidDiscordRequest,
): Promise<number> {
  if (process.env.RAID_ROSTER_NEW_SENDS_ENABLED === "false") return 0;
  const publication = publicEventWhere();
  if (!publication) return 0;
  const events = await database.foreverRaidEvent.findMany({
    where: {
      ...publication,
      game: { in: ["forever", "tbc"] },
      status: { in: ["open", "locked", "cancelled"] },
      endsAt: { gt: new Date() },
    },
    include: { discordPost: true },
    orderBy: { startsAt: "asc" },
    take: 100,
  });
  let synced = 0;
  for (const event of events) {
    const published = await database.foreverRaidRosterPublication.findFirst({
      where: { eventId: event.id },
      orderBy: { createdAt: "desc" },
    });
    if (!published || !event.discordPost?.messageId) continue;
    const settings = raidDestinationForPost(event.discordPost);
    if (!settings) continue;
    const selected = z
      .array(z.object({ signupId: z.string(), offer: offerSchema }))
      .parse(published.roster);
    const invitations = await database.foreverRaidRosterInvitation.findMany({
      where: { eventId: event.id },
    });
    synced += await syncRosterAnnouncement(
      {
        eventId: event.id,
        title: event.title,
        startsAt: event.startsAt,
        deadline: published.deadline,
        discordUrl: `https://discord.com/channels/${event.discordPost.guildId}/${event.discordPost.channelId}/${event.discordPost.messageId}`,
        imageUrl:
          settings.origin +
          eventArtwork(
            gameSchema.parse(event.game),
            z.enum(eventTypes).parse(event.eventType),
            event.raidName,
          ).file,
        signupClosed: true,
        cancelled: event.status === "cancelled",
        players: selected.map((row) => ({
          name: row.offer.character.name,
          className: row.offer.character.className,
          specialization: row.offer.character.specialization ?? null,
          state:
            invitations.find((invite) => invite.signupId === row.signupId)
              ?.state ?? "pending",
        })),
      },
      settings,
      requestFactory(settings),
      root,
    );
  }
  return synced;
}
