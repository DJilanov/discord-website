import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import {
  auditBotSchema,
  auditChannelSchema,
  auditRoleSchema,
  discordId,
} from "@/lib/discord-audit";
import type { EventView } from "./contracts";
import { memberBetaEnabled } from "./config";
import { raidService } from "./service";
import { discordEventPanel, type DiscordEventPanel } from "./discord-panel";
import {
  raidDiscordSettings,
  raidDiscordGuildIds,
  raidDestinationForPost,
  type RaidDiscordSettings,
} from "./discord-settings";
import {
  raidDiscordRequest,
  RaidDiscordError,
  type RaidDiscordRequest,
} from "./discord-delivery";
import {
  raidChannelEligible,
  raidChannelGuildSchema,
  raidChannelMemberSchema,
} from "./discord-channels";
import { eventArtwork } from "./event-artwork";
import { jsonChecksum } from "./json";

const targetSchema = z
  .object({
    eventId: z.string().regex(/^[a-z0-9]{20,40}$/),
    guildId: discordId,
    channelId: discordId,
    messageId: discordId,
  })
  .strict();
export type RaidMirrorTarget = z.infer<typeof targetSchema>;
const messageSchema = z.object({
  id: discordId,
  channel_id: discordId,
  author: auditBotSchema.pick({ id: true, bot: true }),
  embeds: z.array(z.object({ url: z.string().optional() })),
});
class MirrorPolicyError extends Error {}

function destination(target: {
  guildId: string;
  channelId: string;
}): RaidDiscordSettings {
  const base = raidDiscordSettings();
  if (
    !base ||
    !memberBetaEnabled() ||
    !raidDiscordGuildIds().includes(target.guildId)
  )
    throw new MirrorPolicyError("mirror_destination_unavailable");
  return {
    ...base,
    guildId: target.guildId,
    channelId: target.channelId,
    visibility: "community",
  };
}

async function validateChannel(
  settings: RaidDiscordSettings,
  organizerId: string,
  request: RaidDiscordRequest,
): Promise<void> {
  const bot = auditBotSchema.parse(await request("/users/@me"));
  const channel = auditChannelSchema.parse(
    await request(`/channels/${settings.channelId}`),
  );
  const guild = raidChannelGuildSchema.parse(
    await request(`/guilds/${settings.guildId}`),
  );
  const roles = z
    .array(auditRoleSchema)
    .parse(await request(`/guilds/${settings.guildId}/roles`));
  const member = raidChannelMemberSchema.parse(
    await request(`/guilds/${settings.guildId}/members/${bot.id}`),
  );
  const organizer = raidChannelMemberSchema.parse(
    await request(`/guilds/${settings.guildId}/members/${organizerId}`),
  );
  if (
    bot.id !== settings.applicationId ||
    member.user.id !== bot.id ||
    organizer.user.id !== organizerId ||
    channel.id !== settings.channelId ||
    channel.guild_id !== settings.guildId ||
    guild.id !== settings.guildId ||
    ![0, 5].includes(channel.type) ||
    !raidChannelEligible(channel, guild, roles, member, organizer)
  )
    throw new MirrorPolicyError("mirror_posting_permission_missing");
}

async function validateMessage(
  target: RaidMirrorTarget,
  settings: RaidDiscordSettings,
  request: RaidDiscordRequest,
): Promise<void> {
  const message = messageSchema.parse(
    await request(`/channels/${target.channelId}/messages/${target.messageId}`),
  );
  if (
    message.id !== target.messageId ||
    message.channel_id !== target.channelId ||
    message.author.id !== settings.applicationId ||
    !message.embeds.some(
      (embed) => embed.url === `${settings.origin}/raids/${target.eventId}`,
    )
  )
    throw new MirrorPolicyError("mirror_message_identity_mismatch");
}

export function discordMirrorPanel(
  event: EventView,
  origin: string,
  primary: { guildId: string; channelId: string; messageId: string },
  coverUrl?: string,
): DiscordEventPanel {
  const panel = discordEventPanel(event, origin, coverUrl);
  const url = `${origin}/raids/${event.id}`;
  const discordUrl = `https://discord.com/channels/${primary.guildId}/${primary.channelId}/${primary.messageId}`;
  panel.components = [
    {
      type: 1,
      components: [
        { type: 2, style: 5, label: "Sign up / my signup", url },
        { type: 2, style: 5, label: "View roster", url: `${url}#event-roster` },
        { type: 2, style: 5, label: "Discord signup", url: discordUrl },
        ...(event.eventType === "raid" &&
        event.catalog &&
        event.reserveLimit > 0
          ? [
              {
                type: 2 as const,
                style: 5 as const,
                label: "Soft reserves",
                url: `${url}/reserves`,
              },
            ]
          : []),
      ],
    },
  ];
  return panel;
}

export async function registerRaidMirror(
  database: PrismaClient,
  input: RaidMirrorTarget,
  apply: boolean,
  transport?: RaidDiscordRequest,
): Promise<{
  eventId: string;
  channelId: string;
  messageId: string;
  applied: boolean;
}> {
  const target = targetSchema.parse(input);
  const settings = destination(target);
  const source = await database.foreverRaidEvent.findUniqueOrThrow({
    where: { id: target.eventId },
    include: { organizer: true, discordPost: true },
  });
  if (
    source.discordPost?.visibility !== "community" ||
    !source.discordPost.messageId ||
    !raidDestinationForPost(source.discordPost) ||
    source.discordPost.channelId === target.channelId
  )
    throw new MirrorPolicyError("mirror_requires_public_primary_event");
  const request = transport ?? raidDiscordRequest(settings);
  await validateChannel(settings, source.organizer.discordId, request);
  await validateMessage(target, settings, request);
  if (apply)
    await database.$transaction(async (client) => {
      await client.$queryRaw`SELECT "id" FROM "ForeverRaidEvent" WHERE "id" = ${target.eventId} FOR UPDATE`;
      const current = await client.foreverRaidEvent.findUniqueOrThrow({
        where: { id: target.eventId },
        include: { discordPost: true },
      });
      if (
        current.discordPost?.visibility !== "community" ||
        !raidDestinationForPost(current.discordPost)
      )
        throw new MirrorPolicyError("mirror_requires_public_primary_event");
      const previous = await client.foreverRaidDiscordMirror.findUnique({
        where: {
          eventId_channelId: {
            eventId: target.eventId,
            channelId: target.channelId,
          },
        },
      });
      if (
        previous?.messageId === target.messageId &&
        previous.guildId === target.guildId &&
        previous.origin === settings.origin &&
        ["pending", "delivering", "sent"].includes(previous.status)
      )
        return;
      await client.foreverRaidDiscordMirror.upsert({
        where: {
          eventId_channelId: {
            eventId: target.eventId,
            channelId: target.channelId,
          },
        },
        create: {
          ...target,
          origin: settings.origin,
          confirmedAt: new Date(),
          desiredVersion: current.version,
        },
        update: {
          guildId: target.guildId,
          messageId: target.messageId,
          origin: settings.origin,
          confirmedAt: new Date(),
          status: "pending",
          desiredVersion: current.version,
          deliveredVersion: 0,
          deliveredChecksum: null,
          lastError: null,
          nextAttemptAt: new Date(),
          startedAt: null,
          attempts: 0,
        },
      });
      await client.foreverRaidAudit.create({
        data: {
          eventId: target.eventId,
          actorId: source.organizerId,
          action: "discord_mirror_attached",
          details: {
            guildId: target.guildId,
            channelId: target.channelId,
            messageId: target.messageId,
          },
        },
      });
    });
  return {
    eventId: target.eventId,
    channelId: target.channelId,
    messageId: target.messageId,
    applied: apply,
  };
}

export async function deliverRaidMirrors(
  database: PrismaClient,
  requestFactory: (
    settings: RaidDiscordSettings,
  ) => RaidDiscordRequest = raidDiscordRequest,
): Promise<number> {
  if (!raidDiscordSettings() || !memberBetaEnabled()) return 0;
  const now = new Date();
  const rows = await database.foreverRaidDiscordMirror.findMany({
    where: {
      nextAttemptAt: { lte: now },
      OR: [
        { status: { in: ["pending", "sent"] } },
        {
          status: "delivering",
          startedAt: { lte: new Date(now.getTime() - 120000) },
        },
      ],
    },
    orderBy: { nextAttemptAt: "asc" },
    take: 10,
  });
  let delivered = 0;
  for (const row of rows) {
    const startedAt = new Date();
    const claim = await database.foreverRaidDiscordMirror.updateMany({
      where: { id: row.id, status: row.status, updatedAt: row.updatedAt },
      data: { status: "delivering", startedAt, attempts: { increment: 1 } },
    });
    if (!claim.count) continue;
    let readingMessage = false;
    try {
      const settings = destination(row);
      if (row.origin !== settings.origin)
        throw new MirrorPolicyError("mirror_origin_mismatch");
      const source = await database.foreverRaidEvent.findUniqueOrThrow({
        where: { id: row.eventId },
        include: { organizer: true, discordPost: true },
      });
      if (
        source.discordPost?.visibility !== "community" ||
        !source.discordPost.messageId ||
        !raidDestinationForPost(source.discordPost)
      )
        throw new MirrorPolicyError("mirror_source_not_public");
      const request = requestFactory(settings);
      await validateChannel(settings, source.organizer.discordId, request);
      readingMessage = true;
      await validateMessage(row, settings, request);
      readingMessage = false;
      const event = await raidService(database).get(
        source.organizer,
        row.eventId,
      );
      const panel = discordMirrorPanel(
        event,
        row.origin,
        {
          ...source.discordPost,
          messageId: source.discordPost.messageId,
        },
        "attachment://event-cover.webp",
      );
      const cover = eventArtwork(event.game, event.eventType, event.raidName);
      const checksum = jsonChecksum({ panel, file: cover.file });
      const changed =
        row.deliveredVersion !== event.version ||
        row.deliveredChecksum !== checksum;
      if (changed) {
        readingMessage = true;
        await request(
          `/channels/${row.channelId}/messages/${row.messageId}`,
          "PATCH",
          panel,
          { file: cover.file, description: cover.alt },
        );
        readingMessage = false;
      }
      const saved = await database.foreverRaidDiscordMirror.updateMany({
        where: { id: row.id, status: "delivering", startedAt },
        data: {
          status: "sent",
          deliveredVersion: event.version,
          deliveredChecksum: checksum,
          lastError: null,
          nextAttemptAt: new Date(),
        },
      });
      if (saved.count)
        await database.foreverRaidDiscordMirror.updateMany({
          where: {
            id: row.id,
            status: "sent",
            startedAt,
            desiredVersion: event.version,
          },
          data: { nextAttemptAt: new Date(Date.now() + 60000) },
        });
      if (changed) delivered += saved.count;
    } catch (error) {
      const retry =
        error instanceof RaidDiscordError
          ? error.status === 429 || error.status >= 500
          : !(
              error instanceof MirrorPolicyError || error instanceof z.ZodError
            );
      const code =
        error instanceof RaidDiscordError
          ? readingMessage && error.status === 404
            ? "discord_post_removed"
            : `discord_http_${error.status}`
          : error instanceof MirrorPolicyError
            ? error.message
            : "discord_mirror_sync_failed";
      const delay = Math.min(300000, 5000 * 2 ** Math.min(row.attempts, 6));
      await database.foreverRaidDiscordMirror.updateMany({
        where: { id: row.id, status: "delivering", startedAt },
        data: {
          status: retry ? "pending" : "failed",
          lastError: code,
          nextAttemptAt: new Date(Date.now() + delay),
        },
      });
    }
  }
  return delivered;
}
