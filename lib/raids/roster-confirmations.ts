import { createHash, randomUUID } from "node:crypto";
import {
  Prisma,
  type PrismaClient,
  type ForeverRaidRosterInvitation,
} from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/security";
import { checkServerMembership } from "@/lib/member-discord";
import { requireRaidPilot } from "./config";
import { raidAudienceIncludes } from "./access";
import {
  raidDestinationForPost,
  raidDiscordSettings,
} from "./discord-settings";
import {
  reserveLimitsSchema,
  storedCharacterSchema,
  type MemberIdentity,
} from "./contracts";
import { eventPolicyChecksum } from "./event-policy";
import { reserveQuota } from "./loot-policy";
import { jsonChecksum } from "./json";
import {
  amendmentSchema,
  confirmationDashboardSchema,
  defaultPreparation,
  offerSchema,
  preparationSchema,
  rosterPublicationSchema,
  rosterReplySchema,
  type ConfirmationDashboard,
  type InvitationView,
  type RaidPreparation,
  type RosterOffer,
} from "./roster-confirmation-contracts";

export const rosterEventInclude = {
  organizer: true,
  catalog: true,
  snapshot: true,
  discordPost: true,
  signups: {
    include: { member: true },
    orderBy: { createdAt: "asc" as const },
  },
} satisfies Prisma.ForeverRaidEventInclude;
export type RosterEvent = Prisma.ForeverRaidEventGetPayload<{
  include: typeof rosterEventInclude;
}>;
export type RosterTransaction = Prisma.TransactionClient;
export function rosterJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
export async function lockRosterEvent(
  client: RosterTransaction,
  id: string,
): Promise<RosterEvent> {
  await client.$queryRaw`SELECT "id" FROM "ForeverRaidEvent" WHERE "id" = ${id} FOR UPDATE`;
  const event = await client.foreverRaidEvent.findUnique({
    where: { id },
    include: rosterEventInclude,
  });
  if (!event) throw new HttpError(404, "Raid not found.");
  return event;
}
async function authorize(
  client: RosterTransaction,
  event: RosterEvent,
  member: MemberIdentity,
  leader = false,
): Promise<void> {
  requireRaidPilot(member.discordId);
  const actor = await client.foreverMember.findUnique({
    where: { id: member.id },
  });
  if (
    !actor?.active ||
    actor.discordId !== member.discordId ||
    !raidAudienceIncludes(event, member.discordId)
  )
    throw new HttpError(403, "This raid is not available to your account.");
  if (leader && event.organizerId !== member.id)
    throw new HttpError(403, "Only the raid organizer can do this.");
}
export function rosterOffer(
  event: RosterEvent,
  signup: RosterEvent["signups"][number],
): RosterOffer {
  const post = event.discordPost;
  if (
    !post?.messageId ||
    !raidDestinationForPost(post) ||
    post.lastError === "discord_post_removed"
  )
    throw new HttpError(
      409,
      "Publish the raid's Discord post before requesting replies.",
    );
  return offerSchema.parse({
    title: event.title,
    game: event.game,
    raidName: event.raidName,
    realm: event.realm,
    character: storedCharacterSchema.parse(signup.character),
    role: signup.role,
    partyIndex: signup.partyIndex,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(),
    organizerId: event.organizerId,
    organizerDiscordId: event.organizer.discordId,
    leader: event.leaderName || event.organizer.displayName,
    description: event.description,
    policyChecksum: eventPolicyChecksum(event),
    reserveLimit: reserveQuota(
      {
        reserveLimit: event.reserveLimit,
        reserveLimits:
          event.reserveLimits === null
            ? null
            : reserveLimitsSchema.parse(event.reserveLimits),
      },
      z.enum(["tank", "healer", "damage", "participant"]).parse(signup.role),
    ),
    allowDuplicates: event.allowDuplicates,
    hardReserves: event.hardReserves,
    discordUrl: `https://discord.com/channels/${post.guildId}/${post.channelId}/${post.messageId}`,
  });
}
export function rosterTerms(offer: RosterOffer, guildId: string): string {
  const terms = Object.fromEntries(
    Object.entries(offer).filter(
      ([key]) => !["partyIndex", "discordUrl", "title", "leader"].includes(key),
    ),
  );
  return jsonChecksum({ ...terms, guildId });
}
export async function recordRosterChange(
  client: RosterTransaction,
  eventId: string,
  actorId: string,
  action: string,
): Promise<void> {
  await client.foreverRaidAudit.create({
    data: { eventId, actorId, action, details: {} },
  });
  await client.foreverRaidEvent.update({
    where: { id: eventId },
    data: { version: { increment: 1 } },
  });
}
export async function queueRosterNotification(
  client: RosterTransaction,
  invitation: Pick<ForeverRaidRosterInvitation, "id" | "version" | "discordId">,
  kind: "invitation" | "update" | "reminder" | "preparation" | "leader",
  recipientId = invitation.discordId,
  payload: unknown = {},
): Promise<void> {
  const key = `${invitation.id}:${kind}:${invitation.version}:${recipientId}`;
  await client.foreverRaidNotification.createMany({
    data: [
      {
        invitationId: invitation.id,
        revision: invitation.version,
        recipientId,
        kind,
        nonce: createHash("sha256").update(key).digest("hex").slice(0, 25),
        payload: rosterJson(payload),
      },
    ],
    skipDuplicates: true,
  });
  if (kind === "update" || kind === "leader")
    await client.foreverRaidNotification.updateMany({
      where: {
        invitationId: invitation.id,
        revision: invitation.version,
        recipientId,
        kind,
        status: { in: ["sent", "failed", "cancelled"] },
      },
      data: {
        status: "pending",
        attempts: 0,
        nextAttemptAt: new Date(),
        payload: rosterJson(payload),
      },
    });
}
export async function invitationView(
  client: RosterTransaction,
  invitation: ForeverRaidRosterInvitation,
  includeReason: boolean,
): Promise<InvitationView> {
  const publication =
    await client.foreverRaidRosterPublication.findUniqueOrThrow({
      where: { id: invitation.publicationId },
    });
  const notification = await client.foreverRaidNotification.findFirst({
    where: {
      invitationId: invitation.id,
      revision: invitation.version,
      kind: { in: ["invitation", "update"] },
    },
    orderBy: { createdAt: "desc" },
  });
  const response = includeReason
    ? await client.foreverRaidRosterResponse.findFirst({
        where: { invitationId: invitation.id, version: invitation.version },
        orderBy: { createdAt: "desc" },
      })
    : null;
  const signupPreference = await client.foreverRaidSignup.findUnique({
    where: { id: invitation.signupId },
    select: { rosterDirectMessages: true },
  });
  return {
    directMessages: signupPreference?.rosterDirectMessages ?? true,
    id: invitation.id,
    signupId: invitation.signupId,
    version: invitation.version,
    state: z
      .enum([
        "pending",
        "confirmed",
        "declined",
        "expired",
        "changed",
        "revoked",
        "manual",
      ])
      .parse(invitation.state),
    deadline: publication.deadline.toISOString(),
    repliedAt: invitation.repliedAt?.toISOString() ?? null,
    offer: offerSchema.parse(invitation.offer),
    preparation: preparationSchema.parse(publication.preparation),
    delivery: z
      .enum([
        "pending",
        "sending",
        "sent",
        "blocked",
        "uncertain",
        "cancelled",
        "failed",
      ])
      .parse(notification?.status ?? "pending"),
    reason: response?.reason ?? null,
  };
}
export async function rosterDashboard(
  member: MemberIdentity,
  eventId: string,
  database: PrismaClient = db,
): Promise<ConfirmationDashboard> {
  const event = await database.foreverRaidEvent.findUnique({
    where: { id: eventId },
    include: rosterEventInclude,
  });
  if (!event) throw new HttpError(404, "Raid not found.");
  await authorize(database, event, member);
  const organizer = event.organizerId === member.id;
  const invitations = await database.foreverRaidRosterInvitation.findMany({
    where: { eventId, ...(organizer ? {} : { discordId: member.discordId }) },
    orderBy: { createdAt: "asc" },
  });
  const amendment = await database.foreverRaidRosterAmendment.findFirst({
    where: { eventId },
    orderBy: { revision: "desc" },
  });
  return confirmationDashboardSchema.parse({
    organizer,
    version: event.version,
    invitations: await Promise.all(
      invitations.map((item) =>
        invitationView(
          database,
          item,
          organizer || item.discordId === member.discordId,
        ),
      ),
    ),
    latestAmendment: amendment?.revision ?? 0,
  });
}
function selectedForPublication(event: RosterEvent): RosterEvent["signups"] {
  const selected = event.signups.filter(
    (signup) => signup.status === "accepted",
  );
  if (!selected.length)
    throw new HttpError(409, "Select players for the roster first.");
  if (selected.some((signup) => !signup.member.active))
    throw new HttpError(
      409,
      "Remove inactive members from the selected roster before publishing.",
    );
  return selected;
}
export async function previewRosterPublication(
  member: MemberIdentity,
  eventId: string,
  raw: unknown,
  database: PrismaClient = db,
): Promise<{
  recipients: RosterOffer[];
  deadline: string;
  preparation: RaidPreparation;
  version: number;
}> {
  const input = rosterPublicationSchema.parse(raw);
  const event = await database.foreverRaidEvent.findUnique({
    where: { id: eventId },
    include: rosterEventInclude,
  });
  if (!event) throw new HttpError(404, "Raid not found.");
  await authorize(database, event, member, true);
  validatePublication(event, input.version, new Date(input.deadline));
  return {
    recipients: selectedForPublication(event).map((signup) =>
      rosterOffer(event, signup),
    ),
    deadline: input.deadline,
    preparation: input.preparation,
    version: event.version,
  };
}
function validatePublication(
  event: RosterEvent,
  version: number,
  deadline: Date,
): void {
  if (process.env.RAID_ROSTER_NEW_SENDS_ENABLED === "false")
    throw new HttpError(
      503,
      "New roster invitations are paused. Existing invitations can still be answered.",
    );

  if (event.status !== "open" || event.snapshot)
    throw new HttpError(
      409,
      "Publish confirmations before locking the final loot roster.",
    );
  if (event.version !== version)
    throw new HttpError(
      409,
      "The roster changed. Review a fresh preview before publishing.",
    );
  if (deadline.getTime() <= Date.now() || deadline >= event.startsAt)
    throw new HttpError(
      400,
      "Choose a future reply deadline before the raid starts.",
    );
}
export async function publishRoster(
  member: MemberIdentity,
  eventId: string,
  raw: unknown,
  database: PrismaClient = db,
): Promise<string> {
  const input = rosterPublicationSchema.parse(raw),
    hash = jsonChecksum({ eventId, ...input });
  return database.$transaction(
    async (client) => {
      const event = await lockRosterEvent(client, eventId);
      await authorize(client, event, member, true);
      const old = await client.foreverRaidRosterPublication.findUnique({
        where: { requestKey: input.requestKey },
      });
      if (old) {
        if (
          old.eventId !== eventId ||
          old.actorId !== member.id ||
          old.requestHash !== hash
        )
          throw new HttpError(
            409,
            "Publication key was used for a different request.",
          );
        return old.id;
      }
      validatePublication(event, input.version, new Date(input.deadline));
      const selected = selectedForPublication(event);
      const publication = await client.foreverRaidRosterPublication.create({
        data: {
          eventId,
          actorId: member.id,
          requestKey: input.requestKey,
          requestHash: hash,
          deadline: new Date(input.deadline),
          preparation: rosterJson(input.preparation),
          roster: rosterJson(
            selected.map((signup) => ({
              signupId: signup.id,
              offer: rosterOffer(event, signup),
            })),
          ),
        },
      });
      for (const signup of selected) {
        const offer = rosterOffer(event, signup),
          termsHash = rosterTerms(offer, event.discordPost!.guildId);
        const prior = await client.foreverRaidRosterInvitation.findUnique({
          where: { eventId_signupId: { eventId, signupId: signup.id } },
        });
        const unchanged =
          prior?.termsHash === termsHash &&
          ["pending", "confirmed", "manual"].includes(prior.state);
        const invitation = await client.foreverRaidRosterInvitation.upsert({
          where: { eventId_signupId: { eventId, signupId: signup.id } },
          create: {
            eventId,
            publicationId: publication.id,
            signupId: signup.id,
            discordId: signup.member.discordId,
            guildId: event.discordPost!.guildId,
            sourceChannelId: event.discordPost!.channelId,
            sourceMessageId: event.discordPost!.messageId!,
            termsHash,
            offer: rosterJson(offer),
          },
          update: {
            publicationId: publication.id,
            termsHash,
            offer: rosterJson(offer),
            sourceMessageId: event.discordPost!.messageId!,
            ...(unchanged
              ? {}
              : {
                  state: "pending",
                  repliedAt: null,
                  version: { increment: 1 },
                }),
            updatedAt: new Date(),
          },
        });
        await queueRosterNotification(
          client,
          invitation,
          unchanged && invitation.dmMessageId ? "update" : "invitation",
        );
      }
      await recordRosterChange(client, eventId, member.id, "roster_published");
      return publication.id;
    },
    { timeout: 15000 },
  );
}
export type MembershipCheck = (
  actorId: string,
  guildId: string,
) => Promise<"member" | "not_member" | "unavailable">;
export async function rosterMembership(
  actorId: string,
  guildId: string,
): Promise<"member" | "not_member" | "unavailable"> {
  const settings = raidDiscordSettings();
  return settings
    ? checkServerMembership(actorId, guildId, settings.token)
    : "unavailable";
}
export async function replyToRoster(
  actorId: string,
  raw: unknown,
  database: PrismaClient = db,
  membership: MembershipCheck = rosterMembership,
): Promise<InvitationView> {
  const input = rosterReplySchema.parse(raw);
  const initial = await database.foreverRaidRosterInvitation.findUnique({
    where: { id: input.invitationId },
  });
  if (!initial || initial.discordId !== actorId)
    throw new HttpError(403, "This invitation belongs to another player.");
  if (input.choice === "confirmed") {
    const checked = await membership(actorId, initial.guildId);
    if (checked !== "member")
      throw new HttpError(
        checked === "not_member" ? 403 : 503,
        checked === "not_member"
          ? "Join the raid's Discord server before confirming attendance."
          : "Server membership could not be verified. Try again shortly.",
      );
  }
  return database.$transaction(
    async (client) => {
      const event = await lockRosterEvent(client, initial.eventId);
      const invitation =
        await client.foreverRaidRosterInvitation.findUniqueOrThrow({
          where: { id: initial.id },
        });
      const old = await client.foreverRaidRosterResponse.findUnique({
        where: { requestKey: input.requestKey },
      });
      if (old) {
        if (
          old.invitationId !== invitation.id ||
          old.actorId !== actorId ||
          old.version !== input.version ||
          old.choice !== input.choice ||
          (old.reason ?? "") !== input.reason
        )
          throw new HttpError(
            409,
            "This reply does not match its original request.",
          );
        return invitationView(client, invitation, true);
      }
      if (invitation.version !== input.version)
        throw new HttpError(
          409,
          "This invitation changed. Reopen My signup for the latest version.",
        );
      const signup = event.signups.find(
        (row) => row.id === invitation.signupId,
      );
      if (
        !signup ||
        signup.status !== "accepted" ||
        event.status === "cancelled" ||
        invitation.state === "revoked"
      )
        throw new HttpError(
          409,
          "This invitation is no longer active. No place has been claimed.",
        );
      const publication =
        await client.foreverRaidRosterPublication.findUniqueOrThrow({
          where: { id: invitation.publicationId },
        });
      if (input.choice === "confirmed") {
        if (!signup.member.active || !raidAudienceIncludes(event, actorId))
          throw new HttpError(403, "Member access is no longer active.");
        if (publication.deadline <= new Date() || event.endsAt <= new Date())
          throw new HttpError(
            409,
            "The reply deadline passed. Ask the organizer to reopen the invitation.",
          );
        if (
          rosterTerms(rosterOffer(event, signup), invitation.guildId) !==
          invitation.termsHash
        )
          throw new HttpError(
            409,
            "Raid details changed. Wait for an updated invitation from the leader.",
          );
      }
      await client.foreverRaidRosterResponse.create({
        data: {
          invitationId: invitation.id,
          requestKey: input.requestKey,
          actorId,
          version: input.version,
          choice: input.choice,
          reason: input.reason || null,
        },
      });
      const updated = await client.foreverRaidRosterInvitation.update({
        where: { id: invitation.id },
        data: {
          state: input.choice,
          repliedAt: new Date(),
          updatedAt: new Date(),
        },
      });
      if (input.choice === "declined" && !event.snapshot)
        await client.foreverRaidSignup.update({
          where: { id: signup.id },
          data: {
            status: "absent",
            partyIndex: null,
            slotIndex: null,
            reserves: [],
          },
        });
      if (input.choice === "confirmed")
        await client.foreverRaidSignup.update({
          where: { id: signup.id },
          data: {
            policyChecksum: eventPolicyChecksum(event),
            acknowledgedAt: new Date(),
          },
        });
      if (input.choice === "declined" && invitation.state !== "declined")
        await queueRosterNotification(
          client,
          updated,
          "leader",
          event.organizer.discordId,
          { reason: input.reason, late: event.snapshot !== null },
        );
      await queueRosterNotification(client, updated, "update");
      await recordRosterChange(client, event.id, actorId, "roster_reply_saved");
      return invitationView(client, updated, true);
    },
    { timeout: 15000 },
  );
}
export async function manuallyConfirmRoster(
  member: MemberIdentity,
  invitationId: string,
  reason: string,
  database: PrismaClient = db,
): Promise<void> {
  const note = z.string().trim().min(3).max(500).parse(reason);
  const initial = await database.foreverRaidRosterInvitation.findUniqueOrThrow({
    where: { id: invitationId },
  });
  await database.$transaction(async (client) => {
    const event = await lockRosterEvent(client, initial.eventId);
    await authorize(client, event, member, true);
    const invitation =
      await client.foreverRaidRosterInvitation.findUniqueOrThrow({
        where: { id: invitationId },
      });
    const signup = event.signups.find((row) => row.id === invitation.signupId);
    if (
      !signup ||
      signup.status !== "accepted" ||
      ["declined", "revoked", "changed"].includes(invitation.state) ||
      rosterTerms(rosterOffer(event, signup), invitation.guildId) !==
        invitation.termsHash
    )
      throw new HttpError(409, "This offer is no longer current.");
    if (invitation.state === "confirmed") return;
    await client.foreverRaidRosterResponse.create({
      data: {
        invitationId,
        requestKey: randomUUID(),
        actorId: member.discordId,
        version: invitation.version,
        choice: "manual",
        reason: note,
      },
    });
    const updated = await client.foreverRaidRosterInvitation.update({
      where: { id: invitationId },
      data: { state: "manual", repliedAt: new Date(), updatedAt: new Date() },
    });
    await queueRosterNotification(client, updated, "update");
    await recordRosterChange(
      client,
      event.id,
      member.id,
      "roster_manually_verified",
    );
  });
}
export async function assertRosterRepliesBeforeLock(
  client: RosterTransaction,
  eventId: string,
): Promise<void> {
  if (
    !(await client.foreverRaidRosterPublication.count({ where: { eventId } }))
  )
    return;
  const event = await client.foreverRaidEvent.findUniqueOrThrow({
    where: { id: eventId },
    include: rosterEventInclude,
  });
  const invitations = await client.foreverRaidRosterInvitation.findMany({
    where: { eventId },
  });
  if (
    event.signups.some(
      (signup) =>
        signup.status === "accepted" &&
        !invitations.some(
          (invite) =>
            invite.signupId === signup.id &&
            ["confirmed", "manual"].includes(invite.state) &&
            invite.termsHash ===
              rosterTerms(rosterOffer(event, signup), invite.guildId),
        ),
    )
  )
    throw new HttpError(
      409,
      "Selected players still need attendance confirmation. Review the confirmation panel; record a reason for anyone verified manually.",
    );
}
export async function reconcileRosterInvitations(
  database: PrismaClient = db,
): Promise<number> {
  const activeEvents = await database.foreverRaidEvent.findMany({
    where: { endsAt: { gt: new Date() } },
    select: { id: true },
  });
  const pending = await database.foreverRaidRosterInvitation.findMany({
    where: {
      eventId: { in: activeEvents.map((event) => event.id) },
      state: { in: ["pending", "confirmed", "manual", "expired", "changed"] },
    },
    orderBy: { updatedAt: "asc" },
    take: 100,
  });
  let changed = 0;
  for (const candidate of pending)
    await database.$transaction(async (client) => {
      const event = await lockRosterEvent(client, candidate.eventId);
      const invitation =
        await client.foreverRaidRosterInvitation.findUniqueOrThrow({
          where: { id: candidate.id },
        });
      if (
        !["pending", "confirmed", "manual", "expired", "changed"].includes(
          invitation.state,
        )
      )
        return;
      const signup = event.signups.find(
        (row) => row.id === invitation.signupId,
      );
      const publication =
        await client.foreverRaidRosterPublication.findUniqueOrThrow({
          where: { id: invitation.publicationId },
        });
      let state = invitation.state;
      let refreshedOffer: RosterOffer | null = null;
      if (
        !signup ||
        signup.status !== "accepted" ||
        !signup.member.active ||
        event.status === "cancelled" ||
        !raidAudienceIncludes(event, invitation.discordId)
      )
        state = "revoked";
      else {
        try {
          refreshedOffer = rosterOffer(event, signup);
          if (
            rosterTerms(refreshedOffer, invitation.guildId) !==
            invitation.termsHash
          )
            state = "changed";
        } catch {
          state = "revoked";
        }
        if (state === "pending" && publication.deadline <= new Date())
          state = "expired";
      }
      if (state !== invitation.state) {
        const updated = await client.foreverRaidRosterInvitation.update({
          where: { id: invitation.id },
          data: { state, updatedAt: new Date() },
        });
        await queueRosterNotification(client, updated, "update");
        await recordRosterChange(
          client,
          event.id,
          event.organizerId,
          "roster_invitation_updated",
        );
        changed++;
      } else if (
        refreshedOffer &&
        state !== "changed" &&
        jsonChecksum(refreshedOffer) !== jsonChecksum(invitation.offer)
      ) {
        const updated = await client.foreverRaidRosterInvitation.update({
          where: { id: invitation.id },
          data: { offer: rosterJson(refreshedOffer), updatedAt: new Date() },
        });
        await queueRosterNotification(client, updated, "update");
      } else
        await client.foreverRaidRosterInvitation.update({
          where: { id: invitation.id },
          data: { updatedAt: new Date() },
        });
      const prep = preparationSchema.parse(publication.preparation),
        now = Date.now();
      if (
        prep.reminders &&
        state === "pending" &&
        publication.deadline.getTime() - now <= 30 * 60000 &&
        now - publication.createdAt.getTime() >= 60 * 60000
      )
        await queueRosterNotification(client, invitation, "reminder");
      if (
        prep.reminders &&
        ["confirmed", "manual"].includes(state) &&
        event.startsAt.getTime() - now <= 2 * 3600000 &&
        event.startsAt.getTime() > now &&
        now - publication.createdAt.getTime() >= 60 * 60000
      )
        await queueRosterNotification(client, invitation, "preparation");
    });
  return changed;
}

export async function amendRoster(
  member: MemberIdentity,
  eventId: string,
  raw: unknown,
  database: PrismaClient = db,
): Promise<number> {
  const input = amendmentSchema.parse(raw);
  return database.$transaction(
    async (client) => {
      const event = await lockRosterEvent(client, eventId);
      await authorize(client, event, member, true);
      const old = await client.foreverRaidRosterAmendment.findUnique({
        where: { requestKey: input.requestKey },
      });
      if (old) {
        if (
          old.eventId !== eventId ||
          old.actorId !== member.id ||
          old.reason !== input.reason ||
          z
            .object({ amendment: z.object({ requestHash: z.string() }) })
            .parse(old.payload).amendment.requestHash !== jsonChecksum(input)
        )
          throw new HttpError(409, "Amendment key was already used.");
        return old.revision;
      }
      if (
        !event.snapshot ||
        event.status !== "locked" ||
        event.version !== input.version ||
        event.endsAt <= new Date()
      )
        throw new HttpError(
          409,
          "Refresh the active locked roster before recording an amendment.",
        );
      const removed = event.signups.find(
        (row) => row.id === input.removedSignupId && row.status === "accepted",
      );
      const declined = await client.foreverRaidRosterInvitation.findUnique({
        where: {
          eventId_signupId: { eventId, signupId: input.removedSignupId },
        },
      });
      if (!removed || declined?.state !== "declined")
        throw new HttpError(
          409,
          "Choose a selected player who has reported absence.",
        );
      const replacement = input.replacementSignupId
        ? event.signups.find(
            (row) =>
              row.id === input.replacementSignupId &&
              ["bench", "registered", "pending"].includes(row.status),
          )
        : null;
      if (input.replacementSignupId && !replacement)
        throw new HttpError(
          409,
          "Choose an available bench or waiting player.",
        );
      if (replacement) {
        if (!input.manualVerified)
          throw new HttpError(
            409,
            "Verify the replacement's availability and acknowledge the manual confirmation.",
          );
        const character = storedCharacterSchema.parse(replacement.character);
        const caps = z.record(z.string(), z.number()).parse(event.roleCaps);
        if (
          !replacement.member.active ||
          character.game !== event.game ||
          character.realm !== event.realm ||
          character.region !== event.region ||
          character.faction !== event.faction ||
          character.ruleset !== event.ruleset ||
          !character.specialization ||
          !replacement.acknowledgedAt ||
          replacement.policyChecksum !== eventPolicyChecksum(event)
        )
          throw new HttpError(
            409,
            "The replacement must have a compatible character and acknowledge the current rules.",
          );
        if (
          event.signups.filter(
            (row) =>
              row.status === "accepted" &&
              row.id !== removed.id &&
              row.role === replacement.role,
          ).length >= (caps[replacement.role] ?? event.capacity)
        )
          throw new HttpError(
            409,
            "No seat is available for this replacement's role.",
          );
      }
      await client.foreverRaidSignup.update({
        where: { id: removed.id },
        data: {
          status: "absent",
          partyIndex: null,
          slotIndex: null,
          reserves: [],
        },
      });
      if (replacement)
        await client.foreverRaidSignup.update({
          where: { id: replacement.id },
          data: {
            status: "accepted",
            partyIndex: removed.partyIndex,
            slotIndex: removed.slotIndex,
          },
        });
      const current = await client.foreverRaidEvent.findUniqueOrThrow({
        where: { id: event.id },
        include: rosterEventInclude,
      });
      const previous = await client.foreverRaidRosterAmendment.findFirst({
        where: { eventId },
        orderBy: { revision: "desc" },
      });
      const revision = (previous?.revision ?? 0) + 1;
      const base = z
        .record(z.string(), z.unknown())
        .parse(previous?.payload ?? event.snapshot.payload);
      const payload = {
        ...base,
        schema: `${event.game}-raid-loot.v3`,
        amendment: {
          revision,
          requestHash: jsonChecksum(input),
          previousChecksum: previous?.checksum ?? event.snapshot.checksum,
          reason: input.reason,
          createdAt: new Date().toISOString(),
        },
        roster: current.signups
          .filter((row) => row.status === "accepted")
          .map((row) => ({
            signupId: row.id,
            character: row.character,
            role: row.role,
            partyIndex: row.partyIndex,
            slotIndex: row.slotIndex,
            reserves: row.reserves,
            policyChecksum: row.policyChecksum,
            acknowledgedAt: row.acknowledgedAt?.toISOString() ?? null,
          })),
      };
      await client.foreverRaidRosterAmendment.create({
        data: {
          eventId,
          requestKey: input.requestKey,
          revision,
          actorId: member.id,
          reason: input.reason,
          payload: rosterJson(payload),
          checksum: jsonChecksum(payload),
        },
      });
      if (replacement) {
        const preparation = defaultPreparation(event.raidName, event.game),
          deadline = new Date(
            Math.min(Date.now() + 30 * 60000, event.endsAt.getTime()),
          );
        const publication = await client.foreverRaidRosterPublication.create({
          data: {
            eventId,
            actorId: member.id,
            requestKey: randomUUID(),
            requestHash: jsonChecksum(input),
            deadline,
            preparation: rosterJson(preparation),
            roster: rosterJson([{ signupId: replacement.id }]),
          },
        });
        const updatedSignup = current.signups.find(
          (row) => row.id === replacement.id,
        )!;
        const offer = rosterOffer(current, updatedSignup);
        const invitation = await client.foreverRaidRosterInvitation.upsert({
          where: { eventId_signupId: { eventId, signupId: replacement.id } },
          create: {
            eventId,
            publicationId: publication.id,
            signupId: replacement.id,
            discordId: replacement.member.discordId,
            guildId: current.discordPost!.guildId,
            sourceChannelId: current.discordPost!.channelId,
            sourceMessageId: current.discordPost!.messageId!,
            termsHash: rosterTerms(offer, current.discordPost!.guildId),
            offer: rosterJson(offer),
          },
          update: {
            publicationId: publication.id,
            state: "pending",
            version: { increment: 1 },
            repliedAt: null,
            offer: rosterJson(offer),
            termsHash: rosterTerms(offer, current.discordPost!.guildId),
            updatedAt: new Date(),
          },
        });
        const verified = await client.foreverRaidRosterInvitation.update({
          where: { id: invitation.id },
          data: { state: "manual", repliedAt: new Date() },
        });
        await client.foreverRaidRosterResponse.create({
          data: {
            invitationId: verified.id,
            requestKey: randomUUID(),
            actorId: member.discordId,
            version: verified.version,
            choice: "manual",
            reason: input.reason,
          },
        });
        await queueRosterNotification(client, verified, "invitation");
      }
      await recordRosterChange(client, eventId, member.id, "roster_amended");
      return revision;
    },
    { timeout: 15000 },
  );
}
