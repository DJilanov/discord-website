import type { NextAuthConfig } from "next-auth";
import Discord from "@auth/core/providers/discord";
import type { CookiesOptions } from "@auth/core/types";
import { guilds } from "@/lib/discord-bridge/contracts";
import { memberAuthErrorDetails } from "@/lib/member-auth-errors";

export type ServerMembership = "member" | "not_member" | "unavailable";

export interface MemberAuthSettings {
  clientId: string;
  clientSecret: string;
  secret: string;
  staffSecret: string;
  guildIds: readonly string[];
  botToken: string;
  secure: boolean;
  trustHost: boolean;
  pilotEnabled: boolean;
  pilotIds: readonly string[];
  accessMode?: "pilot" | "members";
}

export interface MemberAuthRecord {
  id: string;
  discordId: string;
  displayName: string;
  active: boolean;
  sessionVersion: number;
}

export interface MemberAuthStore {
  find(id: string): Promise<MemberAuthRecord | null>;
  findDiscord(discordId: string): Promise<MemberAuthRecord | null>;
  upsert(discordId: string, displayName: string): Promise<MemberAuthRecord>;
  membership(discordId: string): Promise<ServerMembership>;
}

export function readMemberAuthSettings(
  pilotEnabled: boolean,
  pilotIds: readonly string[],
  environment: NodeJS.ProcessEnv = process.env,
): MemberAuthSettings {
  const primaryGuildId =
    environment.DISCORD_GUILD_ID || environment.KFCBOT_GUILD_ID || "";
  const configuredGuildIds = (environment.FOREVER_RAIDS_MEMBER_GUILD_IDS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const defaultGuildIds = Object.values(guilds).includes(
    primaryGuildId as (typeof guilds)[keyof typeof guilds],
  )
    ? [guilds.forever, guilds.kfc]
    : [primaryGuildId].filter(Boolean);
  return {
    clientId:
      environment.COMMUNITY_DISCORD_CLIENT_ID ||
      environment.KFCBOT_APPLICATION_ID ||
      environment.DISCORD_APPLICATION_ID ||
      "",
    clientSecret: environment.COMMUNITY_DISCORD_CLIENT_SECRET || "",
    secret: environment.COMMUNITY_AUTH_SECRET || "",
    staffSecret: environment.AUTH_SECRET || "",
    guildIds: [
      ...new Set(
        configuredGuildIds.length > 0 ? configuredGuildIds : defaultGuildIds,
      ),
    ],
    botToken: environment.DISCORD_BOT_TOKEN || environment.KFCBOT_TOKEN || "",
    secure: environment.NODE_ENV === "production",
    trustHost: environment.AUTH_TRUST_HOST === "true",
    pilotEnabled,
    pilotIds,
    accessMode:
      environment.FOREVER_RAIDS_ACCESS_MODE === "members" ? "members" : "pilot",
  };
}

export function memberAuthIssues(settings: MemberAuthSettings): string[] {
  const issues: string[] = [];
  if (!/^\d{17,20}$/.test(settings.clientId))
    issues.push("COMMUNITY_DISCORD_CLIENT_ID");
  if (!settings.clientSecret.trim())
    issues.push("COMMUNITY_DISCORD_CLIENT_SECRET");
  if (
    settings.secret.trim().length < 32 ||
    settings.secret === settings.staffSecret
  )
    issues.push(
      "COMMUNITY_AUTH_SECRET (32+ characters, separate from AUTH_SECRET)",
    );
  if (
    settings.guildIds.length === 0 ||
    settings.guildIds.length > 5 ||
    settings.guildIds.some((guildId) => !/^\d{17,20}$/.test(guildId))
  )
    issues.push("FOREVER_RAIDS_MEMBER_GUILD_IDS");
  if (!settings.botToken.trim()) issues.push("DISCORD_BOT_TOKEN");
  if (!settings.trustHost) issues.push("AUTH_TRUST_HOST=true");
  return issues;
}

export function memberRedirectPath(value: string | undefined): string {
  return value &&
    /^(?:\/raids(?:\/new|\/[a-z0-9]{20,40}(?:\/reserves)?)?|\/account\/characters)$/.test(
      value,
    )
    ? value
    : "/raids";
}

export function memberCookieName(secure: boolean): string {
  return `${secure ? "__Secure-" : ""}forever-member.session-token`;
}

export function createMemberAuthOptions(
  settings: MemberAuthSettings,
  store: MemberAuthStore,
): NextAuthConfig {
  const cookies: Partial<CookiesOptions> = {};
  for (const key of [
    "sessionToken",
    "callbackUrl",
    "csrfToken",
    "pkceCodeVerifier",
    "state",
    "nonce",
    "webauthnChallenge",
  ] as const) {
    cookies[key] = {
      name:
        key === "sessionToken"
          ? memberCookieName(settings.secure)
          : `${settings.secure ? "__Secure-" : ""}forever-member.${key}`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: settings.secure,
        ...(["pkceCodeVerifier", "state", "webauthnChallenge"].includes(key)
          ? { maxAge: 900 }
          : {}),
      },
    };
  }
  const enabled = (): boolean =>
    settings.pilotEnabled && memberAuthIssues(settings).length === 0;
  const accountAllowed = (id: string): boolean =>
    /^\d{17,20}$/.test(id) &&
    (settings.accessMode === "members" || settings.pilotIds.includes(id));
  return {
    basePath: "/api/community/auth",
    secret: settings.secret,
    trustHost: settings.trustHost,
    cookies,
    session: { strategy: "jwt", maxAge: 8 * 3600 },
    pages: { signIn: "/raids", error: "/raids" },
    providers: [
      Discord({
        clientId: settings.clientId,
        clientSecret: settings.clientSecret,
        // Discord includes this issuer in authorization callbacks.
        issuer: "https://discord.com",
        authorization: { params: { scope: "identify" } },
        checks: ["pkce", "state"],
        profile(profile) {
          return {
            id: profile.id,
            name: profile.global_name || profile.username,
          };
        },
      }),
    ],
    logger: {
      error(error): void {
        console.error(
          "Member authentication failed:",
          JSON.stringify(memberAuthErrorDetails(error)),
        );
      },
    },
    callbacks: {
      async signIn({ account, profile }): Promise<boolean | string> {
        if (
          !enabled() ||
          account?.provider !== "discord" ||
          typeof profile?.id !== "string" ||
          !/^\d{17,20}$/.test(profile.id)
        )
          return false;
        const membership = await store.membership(profile.id);
        if (membership === "not_member") return "/raids?error=NotServerMember";
        if (membership === "unavailable")
          return "/raids?error=MembershipUnavailable";
        if (!accountAllowed(profile.id)) return false;
        const existing = await store.findDiscord(profile.id);
        return !existing || existing.active;
      },
      async jwt({ token, account, profile }) {
        if (!enabled()) return null;
        if (
          account?.provider === "discord" &&
          typeof profile?.id === "string"
        ) {
          if (!accountAllowed(profile.id)) return null;
          const displayName =
            typeof profile.global_name === "string" &&
            profile.global_name.trim()
              ? profile.global_name
              : typeof profile.username === "string"
                ? profile.username
                : "Community member";
          const member = await store.upsert(
            profile.id,
            displayName.slice(0, 100),
          );
          if (!member.active) return null;
          token.sub = member.id;
          token.memberVersion = member.sessionVersion;
          token.name = null;
          token.email = null;
          token.picture = null;
        }
        if (!token.sub) return null;
        const member = await store.find(token.sub);
        if (
          !member?.active ||
          member.sessionVersion !== token.memberVersion ||
          !accountAllowed(member.discordId)
        )
          return null;
        token.serverMembership = await store.membership(member.discordId);
        return token;
      },
      session({ session, token }) {
        const allowed = token.serverMembership === "member";
        session.user.id = allowed ? token.sub || "" : "";
        session.user.version = allowed ? String(token.memberVersion) : "";
        session.memberAccess =
          token.serverMembership === "not_member"
            ? "not_member"
            : allowed
              ? undefined
              : "unavailable";
        return session;
      },
      redirect({ url, baseUrl }): string {
        const destination = new URL(url, baseUrl);
        if (destination.origin !== new URL(baseUrl).origin)
          return `${baseUrl}/raids`;
        if (
          destination.pathname === "/raids" &&
          ["NotServerMember", "MembershipUnavailable"].includes(
            destination.searchParams.get("error") || "",
          )
        )
          return `${baseUrl}/raids?error=${destination.searchParams.get("error")}`;
        return `${baseUrl}${memberRedirectPath(destination.pathname)}`;
      },
    },
  };
}
