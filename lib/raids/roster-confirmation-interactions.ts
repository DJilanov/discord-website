import { z } from "zod";
import type { PrismaClient, ForeverRaidNativeWork } from "@prisma/client";
import { db } from "@/lib/db";
import { HttpError, rateLimit } from "@/lib/security";
import { encryptToken } from "@/lib/discord-bridge/crypto";
import { nativeTokenKey } from "./native-interactions";
import {
  nativeAcknowledgementSchema,
  nativeMessageSchema,
  type NativeMessage,
  type NativeAcknowledgement,
} from "./native-contracts";
import { raidDiscordSettings, raidDiscordGuildIds } from "./discord-settings";
import { jsonChecksum } from "./json";
import {
  invitationView,
  replyToRoster,
  rosterJson,
  rosterMembership,
  type MembershipCheck,
} from "./roster-confirmations";
import { rosterAudienceRead } from "./roster-confirmation-access";
import { rosterInvitationMessage } from "./roster-confirmation-ui";

const snowflake = z.string().regex(/^\d{17,20}$/);
const actor = z.object({ id: snowflake, bot: z.boolean().optional() });
export const rosterInteractionSchema = z
  .object({
    id: snowflake,
    type: z.union([z.literal(3), z.literal(5)]),
    application_id: snowflake,
    guild_id: snowflake.optional(),
    channel_id: snowflake,
    user: actor.optional(),
    member: z.object({ user: actor }).optional(),
    message: z
      .object({
        id: snowflake,
        author: z.object({ id: snowflake, bot: z.literal(true) }),
        flags: z.number().int().default(0),
      })
      .optional(),
    data: z.object({
      custom_id: z
        .string()
        .regex(
          /^rsvp:[a-f0-9-]{36}:[1-9]\d{0,7}:(confirm|decline|preparation|view)$/,
        ),
      component_type: z.literal(2).optional(),
      components: z
        .array(
          z.object({
            type: z.number(),
            component: z
              .object({
                type: z.literal(4),
                custom_id: z.literal("reason"),
                value: z.string().max(500),
              })
              .optional(),
          }),
        )
        .max(1)
        .optional(),
    }),
  })
  .superRefine((value, context) => {
    if (
      value.guild_id
        ? !value.member || !!value.user
        : !value.user || !!value.member
    )
      context.addIssue({
        code: "custom",
        message: "Use the original private invitation.",
      });
  });
export type RosterInteraction = z.infer<typeof rosterInteractionSchema>;
export function isRosterInteraction(raw: unknown): boolean {
  const found = z
    .object({ data: z.object({ custom_id: z.string() }) })
    .safeParse(raw);
  return found.success && found.data.data.custom_id.startsWith("rsvp:");
}
export function rosterTarget(input: RosterInteraction): {
  id: string;
  version: number;
  action: "confirm" | "decline" | "preparation" | "view";
  actorId: string;
} {
  const parts = input.data.custom_id.split(":");
  return {
    id: z.uuid().parse(parts[1]),
    version: Number(parts[2]),
    action: z
      .enum(["confirm", "decline", "preparation", "view"])
      .parse(parts[3]),
    actorId: (input.user ?? input.member!.user).id,
  };
}
async function validateSource(
  input: RosterInteraction,
  database: PrismaClient | import("@prisma/client").Prisma.TransactionClient,
): Promise<ReturnType<typeof rosterTarget>> {
  const target = rosterTarget(input),
    settings = raidDiscordSettings();
  const invitation = await database.foreverRaidRosterInvitation.findUnique({
    where: { id: target.id },
  });
  if (
    !settings ||
    input.application_id !== settings.applicationId ||
    (input.user ?? input.member!.user).bot ||
    !invitation ||
    invitation.discordId !== target.actorId ||
    !raidDiscordGuildIds().includes(invitation.guildId)
  )
    throw new HttpError(
      403,
      "This invitation belongs to another player or raid.",
    );
  if (invitation.version !== target.version)
    throw new HttpError(
      409,
      "Your invitation changed. Reopen My signup for the latest version.",
    );
  if (input.guild_id) {
    if (
      input.guild_id !== invitation.guildId ||
      input.channel_id !== invitation.sourceChannelId ||
      (input.type === 3 &&
        (!input.message ||
          input.message.author.id !== settings.applicationId ||
          (input.message.flags & 64) !== 64))
    )
      throw new HttpError(
        403,
        "Use your private My signup panel in the raid's server.",
      );
  } else {
    if (
      input.channel_id !== invitation.dmChannelId ||
      (input.type === 3 &&
        (!input.message || input.message.author.id !== settings.applicationId))
    )
      throw new HttpError(
        403,
        "Use the original private message from this bot.",
      );
    if (
      input.type === 3 &&
      input.message?.id !== invitation.dmMessageId &&
      !(await database.foreverRaidNotification.findFirst({
        where: {
          invitationId: invitation.id,
          revision: invitation.version,
          recipientId: target.actorId,
          channelId: input.channel_id,
          messageId: input.message!.id,
          status: "sent",
        },
      }))
    )
      throw new HttpError(403, "Use a verified invitation message.");
  }
  if (input.type === 5 && target.action !== "decline")
    throw new HttpError(400, "Reopen the original invitation button.");
  return target;
}
export async function rosterInteraction(
  raw: unknown,
  database: PrismaClient = db,
): Promise<NativeAcknowledgement> {
  const token = z
    .object({ token: z.string().min(10).max(1024) })
    .parse(raw).token;
  const input = rosterInteractionSchema.parse(raw),
    target = rosterTarget(input),
    hash = jsonChecksum(input);
  return database.$transaction(
    async (client) => {
      await client.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${"raid-native:" + input.id}, 0))`;
      const old = await client.foreverRaidInteraction.findUnique({
        where: { id: input.id },
      });
      if (old) {
        if (
          old.actorId !== target.actorId ||
          old.requestHash !== hash ||
          old.expiresAt <= new Date()
        )
          throw new HttpError(
            409,
            "The interaction does not match its saved request.",
          );
        return nativeAcknowledgementSchema.parse(old.response);
      }
      await validateSource(input, client);
      await rateLimit(`raid-rsvp:${target.actorId}`, 60, 60, client);
      let response: NativeAcknowledgement;
      if (input.type === 3 && target.action === "decline")
        response = {
          type: 9,
          data: {
            custom_id: input.data.custom_id,
            title: "Decline raid attendance",
            components: [
              {
                type: 18,
                label: "Reason · visible only to the raid leader",
                component: {
                  type: 4,
                  custom_id: "reason",
                  style: 1,
                  max_length: 500,
                  required: true,
                },
              },
            ],
          },
        };
      else {
        response =
          input.type === 3 ? { type: 6 } : { type: 5, data: { flags: 64 } };
        await client.foreverRaidNativeWork.create({
          data: {
            id: input.id,
            actorId: target.actorId,
            input: rosterJson(input),
            tokenCipher: encryptToken(token, nativeTokenKey(), input.id),
            expiresAt: new Date(Date.now() + 14 * 60000),
          },
        });
      }
      await client.foreverRaidInteraction.create({
        data: {
          id: input.id,
          actorId: target.actorId,
          requestHash: hash,
          response: rosterJson(response),
          expiresAt: new Date(Date.now() + 86400000),
        },
      });
      return response;
    },
    { timeout: 2000, maxWait: 300 },
  );
}
export async function processRosterInteraction(
  work: ForeverRaidNativeWork,
  database: PrismaClient,
  membership: MembershipCheck = rosterMembership,
): Promise<NativeMessage> {
  const input = rosterInteractionSchema.parse(work.input);
  if (input.id !== work.id || rosterTarget(input).actorId !== work.actorId)
    throw new Error("Roster interaction identity mismatch");
  try {
    const target = await validateSource(input, database);
    let invitation =
      await database.foreverRaidRosterInvitation.findUniqueOrThrow({
        where: { id: target.id },
      });
    const repeated = await database.foreverRaidRosterResponse.findUnique({
      where: { requestKey: input.id },
    });
    if (
      target.action === "confirm" ||
      (target.action === "decline" && input.type === 5)
    ) {
      const reason =
        target.action === "decline"
          ? z
              .string()
              .trim()
              .min(3, "Give a short reason or enter Prefer not to say.")
              .parse(input.data.components?.[0]?.component?.value)
          : "";
      await replyToRoster(
        target.actorId,
        {
          requestKey: input.id,
          invitationId: target.id,
          version: target.version,
          choice: target.action === "confirm" ? "confirmed" : "declined",
          reason,
        },
        database,
        membership,
      );
      invitation = await database.foreverRaidRosterInvitation.findUniqueOrThrow(
        { where: { id: target.id } },
      );
    } else
      await rosterAudienceRead(
        database,
        invitation,
        target.actorId,
        membership,
      );
    const view = await invitationView(database, invitation, true);
    const message = rosterInvitationMessage(
      view,
      target.action === "preparation",
      repeated ? "Your saved response is unchanged." : "",
    );
    await database.foreverRaidNativeWork.update({
      where: { id: work.id },
      data: { response: rosterJson(message), status: "responding" },
    });
    return message;
  } catch (error) {
    if (!(error instanceof HttpError || error instanceof z.ZodError))
      throw error;
    const message = nativeMessageSchema.parse({
      content:
        error instanceof HttpError
          ? error.message
          : "Check your reply and reopen the invitation.",
      embeds: [],
      components: [],
      allowed_mentions: { parse: [] },
    });
    await database.foreverRaidNativeWork.update({
      where: { id: work.id },
      data: { response: rosterJson(message), status: "responding" },
    });
    return message;
  }
}
