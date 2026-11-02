import { z } from "zod";
import { requireMember } from "@/lib/member-auth";
import { readJson, requireSameOrigin, rateLimit } from "@/lib/security";
import { db } from "@/lib/db";
import { raidApi } from "@/lib/raids/api";
import {
  amendmentSchema,
  rosterPublicationSchema,
  rosterReplySchema,
} from "@/lib/raids/roster-confirmation-contracts";
import {
  amendRoster,
  lockRosterEvent,
  manuallyConfirmRoster,
  previewRosterPublication,
  publishRoster,
  replyToRoster,
  rosterDashboard,
} from "@/lib/raids/roster-confirmations";
import { HttpError } from "@/lib/security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
interface Context {
  params: Promise<{ id: string }>;
}
const mutation = z.discriminatedUnion("operation", [
  z
    .object({ operation: z.literal("preference"), enabled: z.boolean() })
    .strict(),
  z
    .object({ operation: z.literal("preview"), input: rosterPublicationSchema })
    .strict(),
  z
    .object({ operation: z.literal("publish"), input: rosterPublicationSchema })
    .strict(),
  z
    .object({ operation: z.literal("reply"), input: rosterReplySchema })
    .strict(),
  z
    .object({
      operation: z.literal("manual"),
      invitationId: z.uuid(),
      reason: z.string().trim().min(3).max(500),
    })
    .strict(),
  z.object({ operation: z.literal("retry"), invitationId: z.uuid() }).strict(),
  z.object({ operation: z.literal("amend"), input: amendmentSchema }).strict(),
]);
export async function GET(
  _request: Request,
  context: Context,
): Promise<Response> {
  return raidApi(async () =>
    rosterDashboard(await requireMember(), (await context.params).id),
  );
}
export async function POST(
  request: Request,
  context: Context,
): Promise<Response> {
  return raidApi(async () => {
    requireSameOrigin(request);
    const member = await requireMember(),
      id = (await context.params).id;
    await rateLimit(`raid-confirmations:${member.id}`, 30, 60);
    const input = mutation.parse(await readJson(request, 16000));
    const dashboard = await rosterDashboard(member, id);
    if (input.operation === "preference") {
      await db.foreverRaidSignup.update({
        where: { eventId_memberId: { eventId: id, memberId: member.id } },
        data: { rosterDirectMessages: input.enabled },
      });
    }
    if (input.operation === "preview")
      return previewRosterPublication(member, id, input.input);
    if (input.operation === "publish")
      await publishRoster(member, id, input.input);
    if (input.operation === "reply") {
      if (
        !dashboard.invitations.some(
          (invite) => invite.id === input.input.invitationId,
        )
      )
        throw new HttpError(404, "Invitation not found.");
      await replyToRoster(member.discordId, input.input);
    }
    if (input.operation === "manual") {
      if (
        !dashboard.invitations.some(
          (invite) => invite.id === input.invitationId,
        )
      )
        throw new HttpError(404, "Invitation not found.");
      await manuallyConfirmRoster(member, input.invitationId, input.reason);
    }
    if (input.operation === "amend") await amendRoster(member, id, input.input);
    if (input.operation === "retry")
      await db.$transaction(async (client) => {
        const event = await lockRosterEvent(client, id);
        if (
          !dashboard.organizer ||
          event.organizerId !== member.id ||
          !dashboard.invitations.some(
            (invite) => invite.id === input.invitationId,
          )
        )
          throw new HttpError(
            403,
            "Only the organizer can retry this delivery.",
          );
        const invitation =
          await client.foreverRaidRosterInvitation.findUniqueOrThrow({
            where: { id: input.invitationId },
          });
        const result = await client.foreverRaidNotification.updateMany({
          where: {
            invitationId: invitation.id,
            revision: invitation.version,
            status: { in: ["blocked", "failed"] },
            kind: "invitation",
          },
          data: {
            status: "pending",
            attempts: 0,
            lastError: null,
            nextAttemptAt: new Date(),
            leaseId: null,
            leaseUntil: null,
          },
        });
        if (!result.count)
          throw new HttpError(
            409,
            "No failed invitation can be safely retried. Use My signup if delivery is uncertain.",
          );
      });
    return rosterDashboard(member, id);
  });
}
