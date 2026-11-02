import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { raidDiscordSettings } from "./discord-settings";
import { nativeMessageSchema, type NativeMessage } from "./native-contracts";
import {
  invitationView,
  reconcileRosterInvitations,
  rosterMembership,
  type MembershipCheck,
} from "./roster-confirmations";
import { rosterInvitationMessage } from "./roster-confirmation-ui";
import { rosterAudienceRead } from "./roster-confirmation-access";
import { discordText } from "./discord-format";

let rosterBackoffUntil = 0;
let rosterPrivateCleanupAt = 0;

export class RosterDeliveryError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: number | null = null,
    public readonly retryAfter = 10,
  ) {
    super("Roster message delivery unavailable");
  }
}
export interface RosterDeliveryTransport {
  membership: MembershipCheck;
  open: (recipientId: string) => Promise<string>;
  send: (
    channelId: string,
    message: NativeMessage,
    nonce: string,
  ) => Promise<string>;
  edit: (
    channelId: string,
    messageId: string,
    message: NativeMessage,
  ) => Promise<void>;
  find: (channelId: string, nonce: string) => Promise<string | null>;
}
export function rosterDeliveryTransport(
  request: typeof fetch = fetch,
): RosterDeliveryTransport {
  const settings = raidDiscordSettings();
  if (!settings) throw new Error("Raid Discord settings are unavailable");
  async function call(
    route: string,
    method = "GET",
    body?: unknown,
  ): Promise<unknown> {
    if (Date.now() < rosterBackoffUntil)
      throw new RosterDeliveryError(
        429,
        null,
        Math.ceil((rosterBackoffUntil - Date.now()) / 1000),
      );
    const response = await request("https://discord.com/api/v10" + route, {
      method,
      headers: {
        Authorization: `Bot ${settings!.token}`,
        "Content-Type": "application/json",
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(10000),
      redirect: "error",
    });
    const data: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 429) {
        const retry = z.object({ retry_after: z.number() }).safeParse(data);
        rosterBackoffUntil =
          Date.now() +
          Math.max(
            1000,
            (retry.success
              ? retry.data.retry_after
              : Number(response.headers.get("retry-after")) || 10) * 1000,
          );
      }
      const error = z
        .object({
          code: z.number().optional(),
          retry_after: z.number().optional(),
        })
        .safeParse(data);
      throw new RosterDeliveryError(
        response.status,
        error.success ? (error.data.code ?? null) : null,
        Math.min(
          300,
          Math.max(
            1,
            Number(response.headers.get("retry-after")) ||
              (error.success ? error.data.retry_after : 0) ||
              10,
          ),
        ),
      );
    }
    return data;
  }
  const messageSchema = z.object({
    id: z.string().regex(/^\d{17,20}$/),
    channel_id: z.string(),
    author: z.object({ id: z.literal(settings.applicationId) }),
    nonce: z.union([z.string(), z.number()]).optional(),
  });
  return {
    membership: rosterMembership,
    async open(recipientId): Promise<string> {
      const channel = z
        .object({
          id: z.string().regex(/^\d{17,20}$/),
          type: z.literal(1),
          recipients: z.array(z.object({ id: z.string() })),
        })
        .parse(
          await call("/users/@me/channels", "POST", {
            recipient_id: recipientId,
          }),
        );
      if (
        channel.recipients.length !== 1 ||
        channel.recipients[0].id !== recipientId
      )
        throw new Error("DM recipient mismatch");
      return channel.id;
    },
    async send(channelId, message, nonce): Promise<string> {
      const sent = messageSchema.parse(
        await call(`/channels/${channelId}/messages`, "POST", {
          ...nativeMessageSchema.parse(message),
          nonce,
          enforce_nonce: true,
        }),
      );
      if (sent.channel_id !== channelId) throw new Error("DM channel mismatch");
      return sent.id;
    },
    async edit(channelId, messageId, message): Promise<void> {
      const sent = messageSchema.parse(
        await call(
          `/channels/${channelId}/messages/${messageId}`,
          "PATCH",
          nativeMessageSchema.parse(message),
        ),
      );
      if (sent.channel_id !== channelId || sent.id !== messageId)
        throw new Error("DM message mismatch");
    },
    async find(channelId, nonce): Promise<string | null> {
      const messages = z
        .array(z.unknown())
        .parse(await call(`/channels/${channelId}/messages?limit=100`));
      for (const value of messages) {
        const found = messageSchema.safeParse(value);
        if (
          found.success &&
          found.data.channel_id === channelId &&
          String(found.data.nonce) === nonce
        )
          return found.data.id;
      }
      return null;
    },
  };
}
function leaderMessage(
  name: string,
  title: string,
  reason: string,
  late: boolean,
  discordUrl: string,
): NativeMessage {
  return nativeMessageSchema.parse({
    content: "",
    embeds: [
      {
        title: late
          ? "Late absence · roster amendment needed"
          : "Raid vacancy · player declined",
        description: `**${discordText(name, 60)}** cannot attend **${discordText(title, 150)}**.\n\nPrivate reason: ${discordText(reason, 500)}\n\n${late ? "The original locked loot export is unchanged. Record an explicit amendment before exporting a replacement roster." : "Their active seat and soft reserves have been released. Review a suitable replacement."}`,
        color: 0xd07b69,
      },
    ],
    components: [
      {
        type: 1,
        components: [
          { type: 2, style: 5, label: "Open raid in Discord", url: discordUrl },
        ],
      },
    ],
    allowed_mentions: { parse: [] },
  });
}
export async function deliverRosterNotification(
  database: PrismaClient = db,
  transport: RosterDeliveryTransport = rosterDeliveryTransport(),
): Promise<number> {
  const leaseId = randomUUID();
  const job = await database.$transaction(async (client) => {
    const [row] = await client.$queryRaw<
      Array<{ id: string; status: string }>
    >`SELECT "id", "status" FROM "ForeverRaidNotification" WHERE "status" IN ('pending','sending','uncertain') AND "nextAttemptAt" <= NOW() AND ("leaseUntil" IS NULL OR "leaseUntil" < NOW()) ORDER BY "createdAt" FOR UPDATE SKIP LOCKED LIMIT 1`;
    if (!row) return null;
    return client.foreverRaidNotification.update({
      where: { id: row.id },
      data: {
        status: "sending",
        ...(row.status === "sending"
          ? { lastError: "delivery_uncertain" }
          : {}),
        attempts: { increment: 1 },
        leaseId,
        leaseUntil: new Date(Date.now() + 45000),
      },
    });
  });
  if (!job) return 0;
  let sending = false;
  try {
    const invitation =
      await database.foreverRaidRosterInvitation.findUniqueOrThrow({
        where: { id: job.invitationId },
      });
    const event = await database.foreverRaidEvent.findUniqueOrThrow({
      where: { id: invitation.eventId },
      include: { discordPost: true },
    });
    if (
      job.revision !== invitation.version ||
      (job.kind !== "leader" && event.endsAt <= new Date()) ||
      (job.kind !== "update" &&
        job.kind !== "leader" &&
        ["revoked", "changed", "declined"].includes(invitation.state))
    ) {
      await database.foreverRaidNotification.update({
        where: { id: job.id },
        data: { status: "cancelled", leaseId: null, leaseUntil: null },
      });
      return 1;
    }
    const signup = await database.foreverRaidSignup.findUnique({
      where: { id: invitation.signupId },
    });
    if (job.kind !== "leader" && signup?.rosterDirectMessages === false) {
      await database.foreverRaidNotification.update({
        where: { id: job.id },
        data: {
          status: "cancelled",
          lastError: "channel_only",
          leaseId: null,
          leaseUntil: null,
        },
      });
      return 1;
    }
    const view = await invitationView(database, invitation, false);
    if (job.kind === "leader") {
      const organizer = await database.foreverMember.findUnique({
        where: { id: event.organizerId },
      });
      if (
        !organizer?.active ||
        (await transport.membership(job.recipientId, invitation.guildId)) !==
          "member"
      )
        throw new RosterDeliveryError(403);
    }
    if (
      job.kind !== "leader" &&
      !["revoked", "changed"].includes(invitation.state)
    )
      await rosterAudienceRead(
        database,
        invitation,
        invitation.discordId,
        transport.membership,
      );
    if (
      job.kind === "leader" &&
      (event.organizerId !== view.offer.organizerId ||
        job.recipientId !== view.offer.organizerDiscordId)
    )
      throw new Error("Organizer notification recipient mismatch");
    if (
      job.kind === "reminder" &&
      (invitation.state !== "pending" ||
        Date.parse(view.deadline) <= Date.now())
    ) {
      await database.foreverRaidNotification.update({
        where: { id: job.id },
        data: { status: "cancelled", leaseId: null, leaseUntil: null },
      });
      return 1;
    }
    let message =
      job.kind === "leader"
        ? leaderMessage(
            view.offer.character.name,
            view.offer.title,
            z
              .object({ reason: z.string(), late: z.boolean() })
              .parse(job.payload).reason,
            z.object({ late: z.boolean() }).parse(job.payload).late,
            view.offer.discordUrl,
          )
        : rosterInvitationMessage(
            view,
            job.kind === "preparation",
            job.kind === "reminder"
              ? "Please reply before the deadline so the leader can finish the roster."
              : "",
          );
    if (job.kind === "update" && invitation.state === "revoked")
      message = {
        content:
          "This raid invitation is no longer active. No place is held by this invitation. Check the original raid for current information.",
        embeds: [],
        components: [],
        allowed_mentions: { parse: [] },
      };
    const channelId = job.channelId ?? (await transport.open(job.recipientId));
    await database.foreverRaidNotification.updateMany({
      where: { id: job.id, leaseId },
      data: { channelId },
    });
    const editId =
      job.kind === "update" ? invitation.dmMessageId : job.messageId;
    let messageId: string;
    if (
      editId &&
      (job.kind !== "update" || invitation.dmChannelId === channelId)
    ) {
      await transport.edit(channelId, editId, message);
      messageId = editId;
    } else {
      const found =
        job.attempts > 1 ? await transport.find(channelId, job.nonce) : null;
      if (found) messageId = found;
      else if (job.attempts > 1 && job.lastError === "delivery_uncertain") {
        await database.foreverRaidNotification.updateMany({
          where: { id: job.id, leaseId },
          data: {
            status: "uncertain",
            leaseId: null,
            leaseUntil: null,
            nextAttemptAt: new Date(Date.now() + 24 * 3600000),
          },
        });
        return 1;
      } else {
        sending = true;
        messageId = await transport.send(channelId, message, job.nonce);
      }
    }
    await database.$transaction(async (client) => {
      const owned = await client.foreverRaidNotification.updateMany({
        where: { id: job.id, leaseId },
        data: {
          status: "sent",
          channelId,
          messageId,
          leaseId: null,
          leaseUntil: null,
          lastError: null,
        },
      });
      if (
        owned.count &&
        job.kind !== "leader" &&
        ["invitation", "update"].includes(job.kind)
      )
        await client.foreverRaidRosterInvitation.updateMany({
          where: { id: invitation.id, version: job.revision },
          data: { dmChannelId: channelId, dmMessageId: messageId },
        });
    });
  } catch (error) {
    const blocked =
      error instanceof RosterDeliveryError &&
      (error.code === 50007 || [403, 404].includes(error.status));
    const uncertain = sending && !(error instanceof RosterDeliveryError);
    const permanent =
      error instanceof RosterDeliveryError && [400, 401].includes(error.status);
    await database.foreverRaidNotification.updateMany({
      where: { id: job.id, leaseId },
      data: {
        status: blocked
          ? "blocked"
          : uncertain
            ? "uncertain"
            : permanent || job.attempts >= 5
              ? "failed"
              : "pending",
        leaseId: null,
        leaseUntil: null,
        nextAttemptAt: new Date(
          Date.now() +
            (error instanceof RosterDeliveryError
              ? error.retryAfter * 1000
              : 30000),
        ),
        lastError: blocked
          ? "dm_blocked"
          : uncertain
            ? "delivery_uncertain"
            : error instanceof RosterDeliveryError
              ? `discord_${error.status}`
              : "delivery_retry",
      },
    });
  }
  return 1;
}
export async function runRosterNotifications(
  database: PrismaClient = db,
  transport: RosterDeliveryTransport = rosterDeliveryTransport(),
): Promise<void> {
  if (Date.now() - rosterPrivateCleanupAt > 3600000) {
    const cutoff = new Date(Date.now() - 90 * 86400000);
    await database.foreverRaidRosterResponse.updateMany({
      where: { createdAt: { lt: cutoff }, reason: { not: null } },
      data: { reason: null },
    });
    await database.foreverRaidNotification.updateMany({
      where: { kind: "leader", createdAt: { lt: cutoff } },
      data: { payload: {} },
    });
    rosterPrivateCleanupAt = Date.now();
  }
  await reconcileRosterInvitations(database);
  if (process.env.RAID_ROSTER_NEW_SENDS_ENABLED === "false") return;
  for (let count = 0; count < 10 && Date.now() >= rosterBackoffUntil; count++)
    if (!(await deliverRosterNotification(database, transport))) break;
}
