import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import type { PrismaClient } from "@prisma/client";
import { raidService } from "./service";
import { discordEventPanel, raidPostMarker } from "./discord-panel";
import type { RaidDiscordSettings } from "./discord-settings";
import { pilotDiscordIds, memberBetaEnabled } from "./config";
import { eventArtwork, isEventArtworkFile } from "./event-artwork";
import { auditChannelSchema, auditRoleSchema } from "@/lib/discord-audit";
import {
  pilotPrivateChannel,
  raidChannelEligible,
  raidChannelGuildSchema,
  raidChannelMemberSchema,
} from "./discord-channels";
import { raidForumThreadSchema, raidForumChannel } from "./discord-forum";

interface RaidDiscordAttachment {
  file: string;
  description: string;
}

export type RaidDiscordRequest = (
  route: string,
  method?: "GET" | "POST" | "PATCH",
  body?: unknown,
  attachment?: RaidDiscordAttachment,
) => Promise<unknown>;
export class RaidDiscordError extends Error {
  constructor(public readonly status: number) {
    super(`Discord HTTP ${status}`);
  }
}
class RaidDiscordPermissionError extends Error {}
export function raidDiscordRequest(
  settings: RaidDiscordSettings,
): RaidDiscordRequest {
  let forumParentId: string | null = null;
  return async (route, method = "GET", body, attachment): Promise<unknown> => {
    const base = `/channels/${settings.channelId}`;
    const message = new RegExp(`^${base}/messages/\\d{17,20}$`);
    const allowed =
      method === "GET"
        ? [
            "/users/@me",
            base,
            `${base}/messages?limit=100`,
            `/guilds/${settings.guildId}`,
            `/guilds/${settings.guildId}/roles`,
            `/guilds/${settings.guildId}/members/${settings.applicationId}`,
          ].includes(route) ||
          (forumParentId !== null && route === `/channels/${forumParentId}`) ||
          message.test(route) ||
          (memberBetaEnabled() &&
            new RegExp(`^/guilds/${settings.guildId}/members/\\d{17,20}$`).test(
              route,
            )) ||
          pilotDiscordIds().some(
            (id) => route === `/guilds/${settings.guildId}/members/${id}`,
          )
        : method === "POST"
          ? route === `${base}/messages`
          : message.test(route) ||
            (forumParentId !== null &&
              route === base &&
              z
                .object({ archived: z.literal(false) })
                .strict()
                .safeParse(body).success);
    if (!allowed) throw new Error("raid_discord_route_out_of_scope");
    let requestBody: string | FormData | undefined =
      body === undefined ? undefined : JSON.stringify(body);
    if (attachment) {
      if (method === "GET" || !isEventArtworkFile(attachment.file))
        throw new Error("raid_discord_attachment_out_of_scope");
      const bytes = await readFile(
        join(process.cwd(), "public", attachment.file),
      );
      if (bytes.length > 1048576)
        throw new Error("raid_discord_attachment_too_large");
      const payload = z.record(z.string(), z.unknown()).parse(body);
      const form = new FormData();
      form.append(
        "payload_json",
        JSON.stringify({
          ...payload,
          attachments: [
            {
              id: 0,
              filename: "event-cover.webp",
              description: attachment.description.slice(0, 1024),
            },
          ],
        }),
      );
      form.append(
        "files[0]",
        new Blob([new Uint8Array(bytes)], { type: "image/webp" }),
        "event-cover.webp",
      );
      requestBody = form;
    }
    const response = await fetch(`https://discord.com/api/v10${route}`, {
      method,
      headers: {
        Authorization: `Bot ${settings.token}`,
        ...(attachment ? {} : { "Content-Type": "application/json" }),
      },
      body: requestBody,
      signal: AbortSignal.timeout(10000),
      redirect: "error",
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new RaidDiscordError(response.status);
    }
    const text = await response.text();
    if (text.length > 1048576)
      throw new Error("raid_discord_response_too_large");
    const result: unknown = JSON.parse(text);
    if (
      method === "GET" &&
      route === base &&
      settings.visibility === "community"
    ) {
      const thread = raidForumThreadSchema.safeParse(result);
      if (
        thread.success &&
        thread.data.id === settings.channelId &&
        thread.data.guild_id === settings.guildId &&
        thread.data.owner_id === settings.applicationId
      )
        forumParentId = thread.data.parent_id;
    }
    return result;
  };
}
const messageSchema = z.object({
  id: z.string().regex(/^\d{17,20}$/),
  channel_id: z.string(),
  content: z.string().optional(),
  author: z.object({ id: z.string(), bot: z.literal(true) }),
  embeds: z
    .array(
      z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        color: z.number().optional(),
        fields: z
          .array(
            z.object({
              name: z.string(),
              value: z.string(),
              inline: z.boolean().default(false),
            }),
          )
          .optional(),
        url: z.string().optional(),
        footer: z.object({ text: z.string() }).optional(),
      }),
    )
    .default([]),
});
async function retirePreviousPost(
  database: PrismaClient,
  row: {
    eventId: string;
    channelId: string;
    origin: string;
    guildId: string;
    previousMessageId: string | null;
    previousRetiredAt: Date | null;
  },
  messageId: string,
  botId: string,
  request: RaidDiscordRequest,
): Promise<void> {
  if (!row.previousMessageId || row.previousRetiredAt) return;
  const url = `https://discord.com/channels/${row.guildId}/${row.channelId}/${messageId}`;
  const content = `This event has been reposted. Continue signups and discussion at the latest post: ${url}`;
  try {
    const previous = messageSchema.parse(
      await request(
        `/channels/${row.channelId}/messages/${row.previousMessageId}`,
      ),
    );
    if (
      previous.author.id !== botId ||
      previous.channel_id !== row.channelId ||
      (!(previous.content === content && previous.embeds.length === 0) &&
        !previous.embeds.some(
          (embed) =>
            embed.url === `${row.origin}/raids/${row.eventId}` ||
            embed.footer?.text.startsWith(`${raidPostMarker(row.eventId)} ·`),
        ))
    )
      throw new Error("previous_post_identity_mismatch");
    if (previous.content !== content || previous.embeds.length > 0)
      await request(
        `/channels/${row.channelId}/messages/${row.previousMessageId}`,
        "PATCH",
        {
          content,
          embeds: [],
          attachments: [],
          allowed_mentions: { parse: [] },
          components: [
            {
              type: 1,
              components: [
                { type: 2, style: 5, label: "Latest event post", url },
              ],
            },
          ],
        },
      );
  } catch (error) {
    if (!(error instanceof RaidDiscordError && error.status === 404)) {
      await database.foreverRaidDiscordPost.updateMany({
        where: {
          eventId: row.eventId,
          messageId,
          previousMessageId: row.previousMessageId,
          previousRetiredAt: null,
        },
        data: { lastError: "previous_post_retirement_failed" },
      });
      return;
    }
  }
  await database.foreverRaidDiscordPost.updateMany({
    where: {
      eventId: row.eventId,
      messageId,
      previousMessageId: row.previousMessageId,
      previousRetiredAt: null,
    },
    data: { previousRetiredAt: new Date(), lastError: null },
  });
}
export async function deliverRaidPosts(
  database: PrismaClient,
  settings: RaidDiscordSettings,
  request: RaidDiscordRequest,
): Promise<number> {
  const bot = z
    .object({ id: z.literal(settings.applicationId), bot: z.literal(true) })
    .parse(await request("/users/@me"));
  const rawChannel = await request(`/channels/${settings.channelId}`);
  const parsedThread =
    settings.visibility === "community"
      ? raidForumThreadSchema.safeParse(rawChannel)
      : null;
  const thread = parsedThread?.success ? parsedThread.data : null;
  if (
    z.object({ type: z.literal(11) }).safeParse(rawChannel).success &&
    !thread
  )
    throw new Error("raid_discord_thread_out_of_scope");
  if (thread && thread.id !== settings.channelId)
    throw new Error("raid_discord_thread_identity_mismatch");
  const forumParent = thread
    ? auditChannelSchema.parse(await request(`/channels/${thread.parent_id}`))
    : undefined;
  const postingChannel = thread
    ? raidForumChannel(thread, forumParent, bot.id)
    : rawChannel;
  const channel = z
    .object({
      id: z.literal(settings.channelId),
      guild_id: z.literal(settings.guildId),
      type: z.union([z.literal(0), z.literal(5), z.literal(11)]),
      permission_overwrites: z.array(
        z.object({
          id: z.string(),
          type: z.union([z.literal(0), z.literal(1)]),
          allow: z.string().regex(/^\d+$/),
          deny: z.string().regex(/^\d+$/),
        }),
      ),
    })
    .parse(postingChannel);
  const community =
    settings.visibility === "community"
      ? {
          channel: auditChannelSchema.parse(postingChannel),
          guild: raidChannelGuildSchema.parse(
            await request(`/guilds/${settings.guildId}`),
          ),
          roles: z
            .array(auditRoleSchema)
            .parse(await request(`/guilds/${settings.guildId}/roles`)),
          bot: raidChannelMemberSchema.parse(
            await request(`/guilds/${settings.guildId}/members/${bot.id}`),
          ),
        }
      : null;
  if (
    community &&
    (community.guild.id !== settings.guildId ||
      community.bot.user.id !== bot.id)
  )
    throw new Error("raid_discord_identity_mismatch");
  if (!community && !pilotPrivateChannel(channel, settings.guildId, bot.id))
    throw new Error("raid_discord_channel_must_be_private_for_pilot");
  const now = new Date();
  const rows = await database.foreverRaidDiscordPost.findMany({
    where: {
      guildId: settings.guildId,
      channelId: settings.channelId,
      origin: settings.origin,
      visibility: community ? "community" : "private",
      ...(community ? { confirmedAt: { not: null } } : {}),
      nextAttemptAt: { lte: now },
      OR: [
        { status: { in: ["pending", "uncertain"] } },
        {
          status: "delivering",
          startedAt: { lte: new Date(now.getTime() - 60000) },
        },
        { status: "sent" },
      ],
    },
    orderBy: { nextAttemptAt: "asc" },
    take: 10,
  });
  let delivered = 0;
  for (const row of rows) {
    const startedAt = new Date();
    // Commit the lease before Discord writes; a crashed creation must reconcile.
    const claim = await database.foreverRaidDiscordPost.updateMany({
      where: {
        eventId: row.eventId,
        status: row.status,
        updatedAt: row.updatedAt,
      },
      data: { status: "delivering", startedAt, attempts: { increment: 1 } },
    });
    if (!claim.count) continue;
    let postAttempted = false;
    try {
      const source = await database.foreverRaidEvent.findUniqueOrThrow({
        where: { id: row.eventId },
        include: { organizer: true },
      });
      const event = await raidService(database).get(
        source.organizer,
        row.eventId,
      );
      const rawOrganizer = await request(
        `/guilds/${settings.guildId}/members/${source.organizer.discordId}`,
      );
      z.object({
        user: z.object({
          id: z.literal(source.organizer.discordId),
          bot: z.literal(false).optional(),
        }),
      }).parse(rawOrganizer);
      if (
        community &&
        !raidChannelEligible(
          community.channel,
          community.guild,
          community.roles,
          community.bot,
          raidChannelMemberSchema.parse(rawOrganizer),
          forumParent,
        )
      )
        throw new RaidDiscordPermissionError(
          "Discord posting permission is missing.",
        );
      const body = discordEventPanel(
        event,
        row.origin,
        "attachment://event-cover.webp",
      );
      const cover = eventArtwork(event.game, event.eventType, event.raidName);
      const attachment = { file: cover.file, description: cover.alt };
      let messageId = row.messageId;
      let shouldUpdate =
        row.status !== "sent" || row.deliveredVersion !== event.version;
      if (!messageId && ["uncertain", "delivering"].includes(row.status)) {
        const recent = z
          .array(z.unknown())
          .parse(
            await request(`/channels/${row.channelId}/messages?limit=100`),
          );
        const matching = recent.flatMap((raw) => {
          const result = messageSchema.safeParse(raw);
          return result.success &&
            result.data.author.id === bot.id &&
            result.data.channel_id === row.channelId &&
            (!row.previousMessageId ||
              BigInt(result.data.id) > BigInt(row.previousMessageId)) &&
            result.data.embeds.some(
              (embed) =>
                embed.url === `${row.origin}/raids/${row.eventId}` ||
                embed.footer?.text.startsWith(
                  `${raidPostMarker(row.eventId)} ·`,
                ),
            )
            ? [result.data]
            : [];
        });
        if (matching.length !== 1)
          throw new Error("delivery_uncertain_manual_review_required");
        messageId = matching[0].id;
      }
      if (messageId) {
        const existing = messageSchema.parse(
          await request(`/channels/${row.channelId}/messages/${messageId}`),
        );
        if (
          existing.author.id !== bot.id ||
          existing.channel_id !== row.channelId ||
          !existing.embeds.some(
            (embed) =>
              embed.url === `${row.origin}/raids/${row.eventId}` ||
              embed.footer?.text.startsWith(`${raidPostMarker(row.eventId)} ·`),
          )
        )
          throw new Error("discord_post_identity_mismatch");
        const existingEmbed = existing.embeds.find(
          (embed) => embed.url === `${row.origin}/raids/${row.eventId}`,
        );
        const expected = body.embeds[0];
        shouldUpdate ||=
          JSON.stringify({
            title: existingEmbed?.title,
            description: existingEmbed?.description,
            color: existingEmbed?.color,
            fields: existingEmbed?.fields,
          }) !==
          JSON.stringify({
            title: expected.title,
            description: expected.description,
            color: expected.color,
            fields: expected.fields,
          });
        if (shouldUpdate) {
          if (thread?.thread_metadata.archived) {
            const reopened = raidForumThreadSchema.parse(
              await request(`/channels/${row.channelId}`, "PATCH", {
                archived: false,
              }),
            );
            raidForumChannel(reopened, forumParent, bot.id);
            if (
              reopened.id !== row.channelId ||
              reopened.thread_metadata.archived
            )
              throw new Error("raid_discord_thread_reopen_failed");
            thread.thread_metadata.archived = false;
          }
          await request(
            `/channels/${row.channelId}/messages/${messageId}`,
            "PATCH",
            body,
            attachment,
          );
        }
      } else {
        postAttempted = true;
        const posted = messageSchema.parse(
          await request(
            `/channels/${row.channelId}/messages`,
            "POST",
            {
              ...body,
              nonce: createHash("sha256")
                .update(
                  row.repostNumber
                    ? `${row.eventId}:repost:${row.repostNumber}`
                    : row.eventId,
                )
                .digest("hex")
                .slice(0, 25),
              enforce_nonce: true,
            },
            attachment,
          ),
        );
        if (posted.author.id !== bot.id || posted.channel_id !== row.channelId)
          throw new Error("discord_post_identity_mismatch");
        messageId = posted.id;
      }
      const saved = await database.foreverRaidDiscordPost.updateMany({
        where: { eventId: row.eventId, startedAt, status: "delivering" },
        data: {
          messageId,
          status: "sent",
          deliveredVersion: event.version,
          lastError: null,
          nextAttemptAt: new Date(),
        },
      });
      if (saved.count)
        await database.foreverRaidDiscordPost.updateMany({
          where: {
            eventId: row.eventId,
            startedAt,
            status: "sent",
            desiredVersion: event.version,
          },
          data: { nextAttemptAt: new Date(Date.now() + 60000) },
        });
      if (shouldUpdate) delivered += saved.count;
      if (saved.count)
        await retirePreviousPost(database, row, messageId, bot.id, request);
    } catch (error) {
      const removed =
        row.messageId &&
        error instanceof RaidDiscordError &&
        error.status === 404;
      const uncertain =
        !row.messageId &&
        ((postAttempted &&
          (!(error instanceof RaidDiscordError) || error.status >= 500)) ||
          ["uncertain", "delivering"].includes(row.status));
      const retry =
        (row.messageId &&
          (!(error instanceof RaidDiscordError) ||
            error.status >= 500 ||
            error.status === 429)) ||
        (error instanceof RaidDiscordError && error.status === 429);
      await database.foreverRaidDiscordPost.updateMany({
        where: { eventId: row.eventId, startedAt, status: "delivering" },
        data: {
          status: removed
            ? "failed"
            : uncertain
              ? "uncertain"
              : retry
                ? "pending"
                : "failed",
          lastError: removed
            ? "discord_post_removed"
            : uncertain
              ? "delivery_uncertain_manual_review_required"
              : error instanceof RaidDiscordError
                ? `discord_http_${error.status}`
                : error instanceof RaidDiscordPermissionError
                  ? "discord_posting_permission_missing"
                  : "discord_delivery_failed",
          ...(removed ? { approvedAt: null, approvedBy: null } : {}),
          nextAttemptAt: new Date(Date.now() + 60000),
        },
      });
    }
  }
  return delivered;
}
