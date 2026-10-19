import { z } from "zod";
import type { PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { HttpError, rateLimit } from "@/lib/security";
import { ephemeral } from "@/lib/discord-bridge/commands";
import {
  raidDiscordSettings,
  raidDiscordGuildIds,
  raidDestinationForPost,
} from "./discord-settings";
import { jsonChecksum } from "./json";

export const approveCommand = {
  name: "approve",
  type: 1,
  description: "Approve an event post for the website",
  default_member_permissions: "0",
  options: [
    {
      type: 3,
      name: "post",
      description: "Discord message link to the event post",
      required: true,
    },
  ],
};
export const approveMessageCommand = {
  name: "Approve event",
  type: 3,
  default_member_permissions: "0",
};
const snowflake = z.string().regex(/^\d{17,20}$/);
const schema = z.object({
  id: snowflake,
  type: z.literal(2),
  application_id: snowflake,
  guild_id: snowflake,
  channel_id: snowflake,
  member: z.object({
    permissions: z.string().regex(/^\d{1,30}$/),
    user: z.object({ id: snowflake, bot: z.boolean().optional() }),
  }),
  data: z.discriminatedUnion("name", [
    z.object({
      name: z.literal("approve"),
      type: z.literal(1),
      options: z
        .array(
          z.object({
            name: z.literal("post"),
            type: z.literal(3),
            value: z.string().min(1).max(300),
          }),
        )
        .length(1),
    }),
    z.object({
      name: z.literal("Approve event"),
      type: z.literal(3),
      target_id: snowflake,
    }),
  ]),
});
export function isRaidApproval(raw: unknown): boolean {
  return z
    .object({
      type: z.literal(2),
      data: z.object({ name: z.enum(["approve", "Approve event"]) }),
    })
    .safeParse(raw).success;
}
export function parseDiscordPost(value: string): {
  guildId: string;
  channelId: string;
  messageId: string;
} {
  try {
    const url = new URL(value);
    const match = /^\/channels\/(\d{17,20})\/(\d{17,20})\/(\d{17,20})$/.exec(
      url.pathname,
    );
    if (
      url.origin === "https://discord.com" &&
      !url.search &&
      !url.hash &&
      match
    )
      return { guildId: match[1], channelId: match[2], messageId: match[3] };
  } catch {
    /* Invalid message links fail closed. */
  }
  throw new HttpError(
    400,
    "Use the exact Discord message link to a Forever event post.",
  );
}
export async function approveRaidInteraction(
  raw: unknown,
  database: PrismaClient = db,
): Promise<ReturnType<typeof ephemeral>> {
  const input = schema.parse(raw);
  const configured = raidDiscordSettings();
  if (!configured)
    throw new HttpError(503, "Discord event approval is not enabled.");
  if (
    configured.applicationId !== input.application_id ||
    !raidDiscordGuildIds().includes(input.guild_id) ||
    input.member.user.bot ||
    (BigInt(input.member.permissions) & 8n) !== 8n
  )
    throw new HttpError(
      403,
      "Only a human administrator in this server can approve event posts.",
    );
  const target =
    input.data.name === "approve"
      ? parseDiscordPost(input.data.options[0].value)
      : {
          guildId: input.guild_id,
          channelId: input.channel_id,
          messageId: input.data.target_id,
        };
  if (target.guildId !== input.guild_id)
    throw new HttpError(
      403,
      "This post is outside the approved event channels for this server.",
    );
  const hash = jsonChecksum(input);
  return database.$transaction(
    async (client) => {
      await client.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${"raid-approval:" + input.id}, 0))`;
      const previous = await client.foreverRaidInteraction.findUnique({
        where: { id: input.id },
      });
      if (previous) {
        if (
          previous.actorId !== input.member.user.id ||
          previous.requestHash !== hash
        )
          throw new HttpError(
            409,
            "Approval interaction does not match its original request.",
          );
        return ephemeral(
          z
            .object({ data: z.object({ content: z.string() }) })
            .parse(previous.response).data.content,
        );
      }
      await rateLimit(`raid-approve:${input.member.user.id}`, 30, 60, client);
      const post = await client.foreverRaidDiscordPost.findUnique({
        where: {
          channelId_messageId: {
            channelId: target.channelId,
            messageId: target.messageId,
          },
        },
      });
      const settings = post ? raidDestinationForPost(post) : null;
      if (
        !post ||
        !settings ||
        post.guildId !== target.guildId ||
        post.guildId !== settings.guildId ||
        post.origin !== settings.origin ||
        !post.messageId
      )
        throw new HttpError(404, "This is not a delivered event post.");
      await client.$queryRaw`SELECT "id" FROM "ForeverRaidEvent" WHERE "id" = ${post.eventId} FOR UPDATE`;
      const event = await client.foreverRaidEvent.findUniqueOrThrow({
        where: { id: post.eventId },
      });
      await client.$queryRaw`SELECT "eventId" FROM "ForeverRaidDiscordPost" WHERE "eventId" = ${post.eventId} FOR UPDATE`;
      const currentPost = await client.foreverRaidDiscordPost.findUniqueOrThrow(
        { where: { eventId: post.eventId } },
      );
      if (
        currentPost.status !== "sent" ||
        currentPost.deliveredVersion !== event.version
      )
        throw new HttpError(
          409,
          "Wait for the latest event details to sync to Discord before approving.",
        );
      if (event.status === "cancelled" || event.endsAt <= new Date())
        throw new HttpError(
          409,
          "Cancelled or finished events cannot appear in the directory.",
        );
      if (!currentPost.approvedAt) {
        await client.foreverRaidDiscordPost.update({
          where: { eventId: event.id },
          data: {
            approvedAt: new Date(),
            approvedBy: input.member.user.id,
            status: "pending",
            nextAttemptAt: new Date(),
          },
        });
        await client.foreverRaidAudit.create({
          data: {
            eventId: event.id,
            actorId: `discord:${input.member.user.id}`,
            action: "website_approved",
            details: {
              interactionId: input.id,
              channelId: target.channelId,
              messageId: target.messageId,
            },
          },
        });
      }
      const response = ephemeral(
        event.game === "forever"
          ? `Approved for the website: ${settings.origin}/lfg#event-${event.id}\nEvent: ${settings.origin}/raids/${event.id}`
          : `TBC pilot event approved: ${settings.origin}/raids/${event.id}\nTBC events stay in the private planner, not the Forever LFG directory.`,
      );
      await client.foreverRaidInteraction.create({
        data: {
          id: input.id,
          actorId: input.member.user.id,
          requestHash: hash,
          response: {
            type: 4,
            data: {
              content: response.data.content,
              flags: 64,
              allowed_mentions: { parse: [] },
            },
          },
          expiresAt: new Date(Date.now() + 86400000),
        },
      });
      return response;
    },
    { timeout: 2500, maxWait: 1000 },
  );
}
