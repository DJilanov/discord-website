import type { PrismaClient, ForeverRaidRosterInvitation } from "@prisma/client";
import { HttpError } from "@/lib/security";
import { raidDestinationForPost } from "./discord-settings";
import { raidAudienceIncludes } from "./access";
import type { MembershipCheck } from "./roster-confirmations";

export async function rosterAudienceRead(
  database: PrismaClient,
  invitation: ForeverRaidRosterInvitation,
  actorId: string,
  membership: MembershipCheck,
): Promise<void> {
  const event = await database.foreverRaidEvent.findUniqueOrThrow({
    where: { id: invitation.eventId },
    include: { discordPost: true },
  });
  const member = await database.foreverMember.findUnique({
    where: { discordId: actorId },
  });
  if (
    actorId !== invitation.discordId ||
    !member?.active ||
    invitation.state === "revoked" ||
    event.status === "cancelled" ||
    !raidAudienceIncludes(event, actorId) ||
    !event.discordPost ||
    !raidDestinationForPost(event.discordPost) ||
    event.discordPost.guildId !== invitation.guildId
  )
    throw new HttpError(403, "This raid invitation is no longer available.");
  if ((await membership(actorId, invitation.guildId)) !== "member")
    throw new HttpError(
      403,
      "Server membership could not be verified. Reopen My signup in the raid's server.",
    );
}
