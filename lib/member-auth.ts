import NextAuth from "next-auth";
import { cache } from "react";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/security";
import {
  pilotDiscordIds,
  raidsEnabled,
  requireRaidPilot,
  raidAccountAllowed,
} from "@/lib/raids/config";
import type { MemberIdentity } from "@/lib/raids/contracts";
import { checkAnyServerMembership } from "@/lib/member-discord";
import {
  createMemberAuthOptions,
  memberAuthIssues,
  readMemberAuthSettings,
  type MemberAuthSettings,
} from "@/lib/member-auth-options";

export function memberAuthSettings(): MemberAuthSettings {
  return readMemberAuthSettings(raidsEnabled(), pilotDiscordIds());
}
export function memberAuthReady(): boolean {
  const settings = memberAuthSettings();
  return settings.pilotEnabled && memberAuthIssues(settings).length === 0;
}

const settings = memberAuthSettings();
export const memberAuthConfig = createMemberAuthOptions(settings, {
  find: (id) => db.foreverMember.findUnique({ where: { id } }),
  findDiscord: (discordId) =>
    db.foreverMember.findUnique({ where: { discordId } }),
  upsert: (discordId, displayName) =>
    db.foreverMember.upsert({
      where: { discordId },
      create: { discordId, displayName },
      update: { displayName },
    }),
  membership: (discordId) =>
    checkAnyServerMembership(discordId, settings.guildIds, settings.botToken),
});
export const {
  auth: memberAuth,
  signIn: memberSignIn,
  signOut: memberSignOut,
} = NextAuth(memberAuthConfig);

type MemberAccess = {
  member: MemberIdentity | null;
  error?: "NotServerMember" | "MembershipUnavailable";
};
export const getMemberAccess = cache(async (): Promise<MemberAccess> => {
  if (!memberAuthReady()) return { member: null };
  const session = await memberAuth();
  if (session?.memberAccess)
    return {
      member: null,
      error:
        session.memberAccess === "not_member"
          ? "NotServerMember"
          : "MembershipUnavailable",
    };
  if (!session?.user.id) return { member: null };
  const member = await db.foreverMember.findUnique({
    where: { id: session.user.id },
  });
  if (
    !member?.active ||
    String(member.sessionVersion) !== session.user.version ||
    !raidAccountAllowed(member.discordId)
  )
    return { member: null };
  return {
    member: {
      id: member.id,
      discordId: member.discordId,
      displayName: member.displayName,
    },
  };
});
export async function getMember(): Promise<MemberIdentity | null> {
  return (await getMemberAccess()).member;
}
export async function requireMember(): Promise<MemberIdentity> {
  requireRaidPilot();
  const access = await getMemberAccess();
  if (access.error === "NotServerMember")
    throw new HttpError(
      403,
      "This service is for members of KFC Guild or WoW Forever Discord. Join either server, then sign in again.",
    );
  if (access.error === "MembershipUnavailable")
    throw new HttpError(
      503,
      "Discord membership could not be checked. Please try again shortly.",
    );
  if (!access.member)
    throw new HttpError(401, "Sign in with Discord to continue.");
  return access.member;
}
