import { createHash } from "node:crypto";
import { z } from "zod";
import type { Prisma, PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { HttpError, rateLimit } from "@/lib/security";
import { encryptToken } from "@/lib/discord-bridge/crypto";
import { requireRaidPilot } from "./config";
import { raidAudienceIncludes } from "./access";
import { nativeRaidsEnabled } from "./discord-format";
import {
  raidDestinationForPost,
  raidDiscordSettings,
} from "./discord-settings";
import { jsonChecksum } from "./json";
import {
  nativeAcknowledgementSchema,
  nativeInputSchema,
  nativeStateSchema,
  nativeTarget,
  type NativeInput,
  type NativeTarget,
  type NativeAcknowledgement,
} from "./native-contracts";

export function isNativeRaidInteraction(raw: unknown): boolean {
  const input = z
    .object({
      type: z.union([z.literal(3), z.literal(5)]),
      data: z.object({ custom_id: z.string() }),
    })
    .safeParse(raw);
  return input.success && input.data.data.custom_id.startsWith("nraid:");
}
export function nativeTokenKey(): string {
  const secret = process.env.COMMUNITY_AUTH_SECRET;
  if (!secret || secret.length < 32)
    throw new HttpError(503, "Native event signup is not configured.");
  return createHash("sha256")
    .update("forever-raids:interactions:v1:")
    .update(secret)
    .digest("hex");
}
export async function validateNativeSource(
  client: Prisma.TransactionClient,
  input: NativeInput,
  target: NativeTarget,
): Promise<string> {
  const settings = raidDiscordSettings();
  if (
    !settings ||
    input.application_id !== settings.applicationId ||
    input.member.user.bot
  )
    throw new HttpError(
      403,
      "This event control belongs to a different bot or member.",
    );
  requireRaidPilot(input.member.user.id);
  let eventId = target.id;
  let sourceMessageId = input.message?.id;
  if (target.kind === "draft") {
    const draft = await client.foreverRaidNativeDraft.findUnique({
      where: { id: target.id },
    });
    if (
      !draft ||
      draft.actorId !== input.member.user.id ||
      draft.guildId !== input.guild_id ||
      draft.channelId !== input.channel_id
    )
      throw new HttpError(403, "This private event control is not yours.");
    if (draft.expiresAt <= new Date())
      throw new HttpError(
        409,
        "This private view expired. Reopen the original event post.",
      );
    if (draft.revision !== target.revision || draft.completedAt)
      throw new HttpError(
        409,
        "This private view changed. Reopen My signup from the original event post.",
      );
    if (
      input.type === 3 &&
      (!input.message ||
        input.message.author.id !== settings.applicationId ||
        (input.message.flags & 64) !== 64)
    )
      throw new HttpError(
        403,
        "Use your private event panel, not a copied control.",
      );
    eventId = draft.eventId;
    sourceMessageId = draft.sourceMessageId;
  } else if (
    input.type !== 3 ||
    !input.message ||
    input.message.author.id !== settings.applicationId ||
    (input.message.flags & 64) !== 0
  ) {
    throw new HttpError(403, "Use the original event post.");
  }
  const event = await client.foreverRaidEvent.findUnique({
    where: { id: eventId },
    include: { discordPost: true },
  });
  const post = event?.discordPost;
  if (
    !event ||
    !raidAudienceIncludes(event, input.member.user.id) ||
    !post ||
    post.messageId !== sourceMessageId ||
    post.guildId !== input.guild_id ||
    post.channelId !== input.channel_id ||
    post.lastError === "discord_post_removed" ||
    !raidDestinationForPost(post)
  )
    throw new HttpError(
      403,
      "This event post is unavailable or outside your permitted audience.",
    );
  const member = await client.foreverMember.findUnique({
    where: { discordId: input.member.user.id },
  });
  if (member && !member.active)
    throw new HttpError(403, "Member access is disabled.");
  return eventId;
}
export async function nativeRaidInteraction(
  raw: unknown,
  database: PrismaClient = db,
): Promise<NativeAcknowledgement> {
  if (!nativeRaidsEnabled())
    throw new HttpError(
      503,
      "Native signup is not active here yet. Use Event details to sign up on the website.",
    );
  const token = z
    .object({ token: z.string().min(10).max(1024) })
    .parse(raw).token;
  const input = nativeInputSchema.parse(raw);
  const target = nativeTarget(input.data.custom_id);
  const hash = jsonChecksum(input);
  return database.$transaction(
    async (client): Promise<NativeAcknowledgement> => {
      await client.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${"raid-native:" + input.id}, 0))`;
      const old = await client.foreverRaidInteraction.findUnique({
        where: { id: input.id },
      });
      if (old) {
        if (
          old.actorId !== input.member.user.id ||
          old.requestHash !== hash ||
          old.expiresAt <= new Date()
        )
          throw new HttpError(
            409,
            "This interaction does not match its original request.",
          );
        return nativeAcknowledgementSchema.parse(old.response);
      }
      await validateNativeSource(client, input, target);
      if (
        input.type === 5 &&
        (target.kind !== "draft" || !["name", "search"].includes(target.action))
      )
        throw new HttpError(
          400,
          "Reopen the input from your private event panel.",
        );
      if (input.type === 3) {
        const selectActions = [
          "character",
          "class",
          "spec",
          "role",
          "attendance",
          "add",
          "remove",
          "view",
          "candidate",
        ];
        if (
          input.data.component_type !==
          (selectActions.includes(target.action) ? 3 : 2)
        )
          throw new HttpError(400, "Use the original event control.");
      }
      await rateLimit(`raid-native:${input.member.user.id}`, 60, 60, client);
      let response: NativeAcknowledgement;
      if (
        target.kind === "draft" &&
        input.type === 3 &&
        ["name", "search"].includes(target.action)
      ) {
        const draft = await client.foreverRaidNativeDraft.findUniqueOrThrow({
          where: { id: target.id },
        });
        const state = nativeStateSchema.parse(draft.state);
        if (
          (target.action === "name" &&
            (state.mode !== "signup" || state.characterId)) ||
          (target.action === "search" && state.mode !== "reserves")
        )
          throw new HttpError(
            400,
            "This input is not available in the current view.",
          );
        const value = target.action === "name" ? state.name : state.query;
        response = {
          type: 9,
          data: {
            custom_id: input.data.custom_id,
            title:
              target.action === "name" ? "Character name" : "Search raid loot",
            components: [
              {
                type: 18,
                label:
                  target.action === "name"
                    ? "In-game character name"
                    : "Item name",
                component: {
                  type: 4,
                  custom_id: target.action,
                  style: 1,
                  max_length: target.action === "name" ? 40 : 100,
                  required: true,
                  ...(value ? { value } : {}),
                },
              },
            ],
          },
        };
      } else {
        response =
          target.kind === "draft" && input.type === 3
            ? { type: 6 }
            : { type: 5, data: { flags: 64 } };
        await client.foreverRaidNativeWork.create({
          data: {
            id: input.id,
            actorId: input.member.user.id,
            input: input as unknown as Prisma.InputJsonValue,
            tokenCipher: encryptToken(token, nativeTokenKey(), input.id),
            expiresAt: new Date(Date.now() + 14 * 60000),
          },
        });
      }
      await client.foreverRaidInteraction.create({
        data: {
          id: input.id,
          actorId: input.member.user.id,
          requestHash: hash,
          response: response as unknown as Prisma.InputJsonValue,
          expiresAt: new Date(Date.now() + 86400000),
        },
      });
      return nativeAcknowledgementSchema.parse(response);
    },
    { timeout: 2000, maxWait: 300 },
  );
}
