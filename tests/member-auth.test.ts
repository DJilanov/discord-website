import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { Auth, customFetch } from "@auth/core";
import { decode } from "@auth/core/jwt";
import { z } from "zod";
import {
  createMemberAuthOptions,
  memberAuthIssues,
  memberCookieName,
  memberRedirectPath,
  readMemberAuthSettings,
  type MemberAuthRecord,
  type MemberAuthSettings,
  type ServerMembership,
} from "../lib/member-auth-options";
import {
  checkAnyServerMembership,
  checkServerMembership,
} from "../lib/member-discord";
import {
  memberAuthRequest,
  privateMemberAuthResponse,
} from "../lib/member-auth-http";
import { kfcDiscordInviteUrl } from "../lib/raids/config";
import { toolGroupCreatePath } from "../lib/tool-group-draft";

const origin = "http://localhost:19300";
const base = `${origin}/api/community/auth`;
const discordId = "1556000000000000061";
const guildId = "1554316932948172940";
const kfcGuildId = "1411533815356194968";

test("Discord OAuth returns members to a validated tool-plan draft", async () => {
  const auth = fixture();
  const path = toolGroupCreatePath({
    version: 1,
    kind: "quest",
    label: "A shared quest",
    sourceUrl: "https://kfcguild.online/tools/forever/encyclopedia/quests/10",
    faction: "Alliance",
  });
  const authorization = await auth.begin(`${origin}${path}`);
  const response = await auth.complete(authorization);
  assert.equal(response.status, 302);
  assert.equal(response.headers.get("location"), `${origin}${path}`);
});

function fixture(): {
  settings: MemberAuthSettings;
  records: Map<string, MemberAuthRecord>;
  jar: Map<string, string>;
  calls: string[];
  setMembership(value: ServerMembership): void;
  call(path: string, init?: RequestInit): Promise<Response>;
  begin(callbackUrl?: string): Promise<URL>;
  complete(
    authorization: URL,
    changes?: Record<string, string>,
  ): Promise<Response>;
} {
  const settings: MemberAuthSettings = {
    clientId: "1554796912673169428",
    clientSecret: "synthetic-oauth-client-secret",
    secret: randomBytes(48).toString("hex"),
    staffSecret: "synthetic-separate-staff-secret",
    guildIds: [guildId],
    botToken: "synthetic-membership-bot-token",
    secure: false,
    trustHost: true,
    pilotEnabled: true,
    pilotIds: [discordId],
  };
  const records = new Map<string, MemberAuthRecord>();
  const jar = new Map<string, string>();
  const calls: string[] = [];
  let membership: ServerMembership = "member";
  let challenge = "";
  let consumed = false;
  const config = createMemberAuthOptions(settings, {
    async find(id): Promise<MemberAuthRecord | null> {
      return records.get(id) || null;
    },
    async findDiscord(id): Promise<MemberAuthRecord | null> {
      return (
        [...records.values()].find((record) => record.discordId === id) || null
      );
    },
    async upsert(id, displayName): Promise<MemberAuthRecord> {
      const record = [...records.values()].find(
        (item) => item.discordId === id,
      ) || {
        id: "synthetic-member",
        discordId: id,
        displayName,
        active: true,
        sessionVersion: 1,
      };
      record.displayName = displayName;
      records.set(record.id, record);
      return record;
    },
    async membership(): Promise<ServerMembership> {
      return membership;
    },
  });
  config.logger = { error(): void {} };
  const provider = config.providers[0];
  assert.equal(typeof provider, "object");
  if (typeof provider === "function" || provider.type !== "oauth")
    throw new Error("Expected the real Discord OAuth provider.");
  provider[customFetch] = async (input, init): Promise<Response> => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    calls.push(url.pathname);
    if (url.href === "https://discord.com/api/oauth2/token") {
      assert.equal(request.method, "POST");
      assert.match(
        request.headers.get("content-type") || "",
        /application\/x-www-form-urlencoded/,
      );
      assert.equal(
        request.headers.get("authorization"),
        `Basic ${Buffer.from(`${settings.clientId}:${settings.clientSecret}`).toString("base64")}`,
      );
      const body = new URLSearchParams(await request.text());
      assert.equal(body.get("grant_type"), "authorization_code");
      assert.equal(body.get("redirect_uri"), `${base}/callback/discord`);
      assert.equal(
        createHash("sha256")
          .update(body.get("code_verifier") || "")
          .digest("base64url"),
        challenge,
      );
      if (consumed)
        return Response.json({ error: "invalid_grant" }, { status: 400 });
      consumed = true;
      return Response.json({
        access_token: "synthetic-access-token",
        refresh_token: "synthetic-refresh-token",
        token_type: "Bearer",
        expires_in: 3600,
        scope: "identify",
      });
    }
    assert.equal(url.href, "https://discord.com/api/users/@me");
    assert.equal(
      request.headers.get("authorization"),
      "Bearer synthetic-access-token",
    );
    return Response.json({
      id: discordId,
      username: "synthetic-user",
      global_name: "Synthetic tester",
      avatar: null,
      discriminator: "0",
      email: "never-save@example.invalid",
    });
  };
  async function call(path: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set("host", new URL(origin).host);
    headers.set(
      "cookie",
      [...jar].map(([name, value]) => `${name}=${value}`).join("; "),
    );
    const response = privateMemberAuthResponse(
      await Auth(
        memberAuthRequest(
          new Request(`${base}${path}`, { ...init, headers }),
          config,
          {},
        ),
        config,
      ),
    );
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(";", 1)[0];
      const equals = pair.indexOf("=");
      const name = pair.slice(0, equals),
        value = pair.slice(equals + 1);
      if (!value || /Max-Age=0/i.test(cookie)) jar.delete(name);
      else jar.set(name, value);
    }
    return response;
  }
  return {
    settings,
    records,
    jar,
    calls,
    setMembership(value): void {
      membership = value;
    },
    call,
    async begin(callbackUrl = "/account/characters"): Promise<URL> {
      const csrfResponse = await call("/csrf");
      const { csrfToken } = z
        .object({ csrfToken: z.string() })
        .parse(await csrfResponse.json());
      const response = await call("/signin/discord", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ csrfToken, callbackUrl }),
      });
      assert.equal(response.status, 302);
      const authorization = new URL(response.headers.get("location") || "");
      assert.equal(authorization.origin, "https://discord.com");
      challenge = authorization.searchParams.get("code_challenge") || "";
      return authorization;
    },
    async complete(authorization, changes = {}): Promise<Response> {
      return call(
        `/callback/discord?${new URLSearchParams({ code: "synthetic-authorization-code", state: authorization.searchParams.get("state") || "", ...changes })}`,
      );
    },
  };
}

test("Discord OAuth accepts its issuer and rejects foreign callback issuers before token exchange", async () => {
  const accepted = fixture();
  const destination = "/raids/cmuz20aal0000fu4s0vf3f2wx";
  const response = await accepted.complete(await accepted.begin(destination), {
    iss: "https://discord.com",
  });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get("location"), `${origin}${destination}`);
  assert.equal(accepted.records.size, 1);
  assert.ok(accepted.jar.has(memberCookieName(false)));

  const foreign = fixture();
  const rejected = await foreign.complete(await foreign.begin(destination), {
    iss: "https://untrusted.invalid",
  });
  assert.equal(
    rejected.headers.get("location"),
    `${origin}/raids?error=Configuration`,
  );
  assert.equal(foreign.calls.length, 0);
  assert.equal(foreign.records.size, 0);
  assert.equal(foreign.jar.has(memberCookieName(false)), false);
});

test("Member beta admits non-allowlisted server members through Discord OAuth and still rejects outsiders and disabled accounts", async () => {
  const allowed = fixture();
  allowed.settings.accessMode = "members";
  allowed.settings.pilotIds = [];
  const response = await allowed.complete(await allowed.begin());
  assert.equal(response.status, 302);
  assert.equal(allowed.records.size, 1);
  for (const membership of ["not_member", "unavailable"] as const) {
    const blocked = fixture();
    blocked.settings.accessMode = "members";
    blocked.settings.pilotIds = [];
    blocked.setMembership(membership);
    const result = await blocked.complete(await blocked.begin());
    assert.match(
      result.headers.get("location") || "",
      membership === "not_member" ? /NotServerMember/ : /MembershipUnavailable/,
    );
    assert.equal(blocked.records.size, 0);
  }
  const disabled = fixture();
  disabled.settings.accessMode = "members";
  disabled.settings.pilotIds = [];
  disabled.records.set("disabled-member", {
    id: "disabled-member",
    discordId,
    displayName: "Disabled test",
    active: false,
    sessionVersion: 1,
  });
  const blocked = await disabled.complete(await disabled.begin());
  assert.match(blocked.headers.get("location") || "", /AccessDenied/);
});
test("Discord OAuth performs CSRF, state, PKCE, token exchange and an isolated member session", async () => {
  const f = fixture();
  const authorization = await f.begin();
  assert.equal(authorization.searchParams.get("scope"), "identify");
  assert.equal(
    authorization.searchParams.get("client_id"),
    f.settings.clientId,
  );
  assert.equal(
    authorization.searchParams.get("redirect_uri"),
    `${base}/callback/discord`,
  );
  assert.equal(authorization.searchParams.get("code_challenge_method"), "S256");
  assert.ok(f.jar.has("forever-member.state"));
  assert.ok(f.jar.has("forever-member.pkceCodeVerifier"));
  const callback = await f.complete(authorization);
  assert.equal(
    callback.headers.get("location"),
    `${origin}/account/characters`,
  );
  assert.deepEqual(f.calls, ["/api/oauth2/token", "/api/users/@me"]);
  assert.equal(f.jar.has("forever-member.state"), false);
  assert.equal(f.jar.has("forever-member.pkceCodeVerifier"), false);
  assert.equal(
    [...f.jar.keys()].some((name) => name.startsWith("authjs.")),
    false,
  );
  const token = await decode({
    secret: f.settings.secret,
    salt: memberCookieName(false),
    token: f.jar.get(memberCookieName(false)),
  });
  assert.equal(token?.sub, "synthetic-member");
  assert.equal(token?.memberVersion, 1);
  assert.doesNotMatch(
    JSON.stringify(token),
    /synthetic-access-token|synthetic-refresh-token|never-save/,
  );
  const session = await f.call("/session");
  assert.deepEqual((await session.json()).user, {
    name: null,
    email: null,
    image: null,
    id: "synthetic-member",
    version: "1",
  });
  assert.equal(f.records.size, 1);
});

test("OAuth rejects wrong state, missing verifier and callbacks without browser cookies before token exchange", async (t) => {
  for (const mode of ["wrong-state", "no-verifier", "no-cookies"] as const)
    await t.test(mode, async () => {
      const f = fixture();
      const authorization = await f.begin();
      if (mode === "no-verifier")
        f.jar.delete("forever-member.pkceCodeVerifier");
      if (mode === "no-cookies") f.jar.clear();
      const callback = await f.complete(
        authorization,
        mode === "wrong-state" ? { state: "wrong-state" } : {},
      );
      assert.match(callback.headers.get("location") || "", /error=/);
      assert.equal(callback.status, 302);
      assert.equal(callback.headers.get("cache-control"), "private, no-store");
      assert.equal(callback.headers.get("referrer-policy"), "no-referrer");
      assert.equal(f.calls.length, 0);
      assert.equal(f.records.size, 0);
      assert.equal(f.jar.has(memberCookieName(false)), false);
    });
});

test("OAuth refuses forged sign-in POSTs, external return targets and callback replays", async () => {
  const f = fixture();
  const forged = await f.call("/signin/discord", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "csrfToken=forged",
  });
  assert.equal(new URL(forged.headers.get("location") || "").origin, origin);
  const authorization = await f.begin("https://untrusted.invalid/steal");
  const response = await f.complete(authorization);
  assert.equal(response.headers.get("location"), `${origin}/raids`);
  const replay = await f.complete(authorization);
  assert.match(replay.headers.get("location") || "", /error=/);
  assert.equal(f.calls.filter((path) => path.endsWith("/token")).length, 1);
});

test("Non-members and failed membership checks never create accounts or sessions", async (t) => {
  for (const membership of ["not_member", "unavailable"] as const)
    await t.test(membership, async () => {
      const f = fixture();
      f.setMembership(membership);
      const callback = await f.complete(await f.begin());
      assert.match(
        callback.headers.get("location") || "",
        membership === "not_member"
          ? /error=NotServerMember$/
          : /error=MembershipUnavailable$/,
      );
      assert.equal(f.records.size, 0);
      assert.equal(f.jar.has(memberCookieName(false)), false);
    });
});

test("Server membership does not bypass the private pilot allowlist", async () => {
  const f = fixture();
  f.settings.pilotIds = [];
  const callback = await f.complete(await f.begin());
  assert.match(callback.headers.get("location") || "", /error=AccessDenied/);
  assert.equal(f.records.size, 0);
});

test("A disabled member cannot sign in again to reactivate their account", async () => {
  const f = fixture();
  f.records.set("synthetic-member", {
    id: "synthetic-member",
    discordId,
    displayName: "Disabled tester",
    active: false,
    sessionVersion: 1,
  });
  const callback = await f.complete(await f.begin());
  assert.match(callback.headers.get("location") || "", /error=AccessDenied/);
  assert.equal(f.jar.has(memberCookieName(false)), false);
  assert.equal(f.records.get("synthetic-member")?.active, false);
});

test("Leaving the server or Discord being unavailable denies existing sessions; rejoining restores access", async () => {
  const f = fixture();
  await f.complete(await f.begin());
  for (const membership of ["not_member", "unavailable"] as const) {
    f.setMembership(membership);
    const response = await f.call("/session");
    const session = await response.json();
    assert.equal(session.user.id, "");
    assert.equal(session.memberAccess, membership);
  }
  f.setMembership("member");
  assert.equal(
    (await (await f.call("/session")).json()).user.id,
    "synthetic-member",
  );
});

test("Inactive, revoked-version, removed-pilot and disabled-pilot sessions are invalidated", async (t) => {
  for (const mode of ["inactive", "version", "allowlist", "disabled"] as const)
    await t.test(mode, async () => {
      const f = fixture();
      await f.complete(await f.begin());
      const member = f.records.get("synthetic-member")!;
      if (mode === "inactive") member.active = false;
      if (mode === "version") member.sessionVersion++;
      if (mode === "allowlist") f.settings.pilotIds = [];
      if (mode === "disabled") f.settings.pilotEnabled = false;
      assert.equal(await (await f.call("/session")).json(), null);
      assert.equal(f.jar.has(memberCookieName(false)), false);
    });
});

test("Discord member logout clears only its own session", async () => {
  const f = fixture();
  await f.complete(await f.begin());
  f.jar.set("authjs.session-token", "synthetic-separate-staff-cookie");
  const { csrfToken } = await (await f.call("/csrf")).json();
  await f.call("/signout", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ csrfToken, callbackUrl: "/raids" }),
  });
  assert.equal(f.jar.has(memberCookieName(false)), false);
  assert.equal(
    f.jar.get("authjs.session-token"),
    "synthetic-separate-staff-cookie",
  );
  assert.equal(await (await f.call("/session")).json(), null);
});

test("Member auth setup rejects missing credentials, reused secrets and unsafe return paths", () => {
  const { settings } = fixture();
  assert.deepEqual(memberAuthIssues(settings), []);
  assert.ok(
    memberAuthIssues({ ...settings, secret: settings.staffSecret }).some(
      (issue) => issue.startsWith("COMMUNITY_AUTH_SECRET"),
    ),
  );
  assert.ok(
    memberAuthIssues({ ...settings, botToken: "" }).includes(
      "DISCORD_BOT_TOKEN",
    ),
  );
  assert.ok(
    memberAuthIssues({ ...settings, clientId: "invalid" }).includes(
      "COMMUNITY_DISCORD_CLIENT_ID",
    ),
  );
  assert.equal(memberCookieName(true), "__Secure-forever-member.session-token");
  for (const path of [
    "//untrusted.invalid",
    "https://untrusted.invalid",
    "/admin",
    "/raids?next=https://untrusted.invalid",
    "/raids/../admin",
  ])
    assert.equal(memberRedirectPath(path), "/raids");
  assert.equal(
    memberRedirectPath("/account/characters"),
    "/account/characters",
  );
  assert.equal(
    memberRedirectPath("/raids/abcdefghijklmnopqrst/reserves"),
    "/raids/abcdefghijklmnopqrst/reserves",
  );
});

test("Existing bot settings are reused without treating the bot token as an OAuth/session secret", () => {
  const settings = readMemberAuthSettings(true, [discordId], {
    NODE_ENV: "test",
    KFCBOT_APPLICATION_ID: "1554796912673169428",
    KFCBOT_GUILD_ID: guildId,
    KFCBOT_TOKEN: "synthetic-existing-bot-token",
    AUTH_SECRET: "synthetic-staff-secret",
    AUTH_TRUST_HOST: "true",
  });
  assert.equal(settings.clientId, "1554796912673169428");
  assert.deepEqual(settings.guildIds, [guildId, kfcGuildId]);
  assert.equal(settings.botToken, "synthetic-existing-bot-token");
  assert.equal(settings.clientSecret, "");
  assert.equal(settings.secret, "");
  assert.equal(memberAuthIssues(settings).length, 2);
});

test("Explicit member guilds are normalized and KFC invite overrides are restricted to Discord", () => {
  const settings = readMemberAuthSettings(true, [discordId], {
    NODE_ENV: "test",
    COMMUNITY_DISCORD_CLIENT_ID: "1554796912673169428",
    COMMUNITY_DISCORD_CLIENT_SECRET: "synthetic-oauth-client-secret",
    COMMUNITY_AUTH_SECRET: randomBytes(48).toString("hex"),
    AUTH_SECRET: "synthetic-separate-staff-secret",
    AUTH_TRUST_HOST: "true",
    DISCORD_GUILD_ID: guildId,
    DISCORD_BOT_TOKEN: "synthetic-membership-bot-token",
    FOREVER_RAIDS_MEMBER_GUILD_IDS: `${kfcGuildId}, ${guildId},${kfcGuildId}`,
  });
  assert.deepEqual(settings.guildIds, [kfcGuildId, guildId]);
  assert.deepEqual(memberAuthIssues(settings), []);
  assert.equal(
    kfcDiscordInviteUrl({
      KFC_DISCORD_INVITE_URL: "https://discord.com/invite/synthetic",
    }),
    "https://discord.com/invite/synthetic",
  );
  assert.equal(
    kfcDiscordInviteUrl({ KFC_DISCORD_INVITE_URL: "https://example.com/" }),
    "https://discord.gg/WGv4APs9DY",
  );
});

test("Membership API uses only the configured guild and treats only Unknown Member as non-membership", async () => {
  const calls: Request[] = [];
  const fetcher =
    (body: unknown, status = 200): typeof fetch =>
    async (input, init): Promise<Response> => {
      calls.push(new Request(input, init));
      return Response.json(body, { status });
    };
  assert.equal(
    await checkServerMembership(
      discordId,
      guildId,
      "synthetic-bot",
      fetcher({ user: { id: discordId } }),
    ),
    "member",
  );
  assert.equal(
    calls[0].url,
    `https://discord.com/api/v10/guilds/${guildId}/members/${discordId}`,
  );
  assert.equal(calls[0].headers.get("authorization"), "Bot synthetic-bot");
  assert.equal(calls[0].cache, "no-store");
  assert.equal(calls[0].redirect, "error");
  assert.equal(
    await checkServerMembership(
      discordId,
      guildId,
      "synthetic-bot",
      fetcher({ code: 10007 }, 404),
    ),
    "not_member",
  );
  for (const [body, status] of [
    [{ code: 10004 }, 404],
    [{}, 403],
    [{}, 429],
    [{}, 500],
    [{ user: { id: "different" } }, 200],
    [{ user: { id: discordId, bot: true } }, 200],
    [{}, 200],
  ] as const)
    assert.equal(
      await checkServerMembership(
        discordId,
        guildId,
        "synthetic-bot",
        fetcher(body, status),
      ),
      "unavailable",
    );
  assert.equal(
    await checkServerMembership(
      discordId,
      guildId,
      "synthetic-bot",
      async (): Promise<Response> => {
        throw new Error("synthetic network failure");
      },
    ),
    "unavailable",
  );
  const count = calls.length;
  assert.equal(
    await checkServerMembership(
      "../wrong",
      guildId,
      "synthetic-bot",
      fetcher({}),
    ),
    "unavailable",
  );
  assert.equal(
    await checkServerMembership(discordId, guildId, "", fetcher({})),
    "unavailable",
  );
  assert.equal(calls.length, count);
});

test("Membership in either configured Discord server grants access", async () => {
  const calls: string[] = [];
  const memberships = new Map<string, Response>([
    [guildId, Response.json({ code: 10007 }, { status: 404 })],
    [kfcGuildId, Response.json({ user: { id: discordId } })],
  ]);
  const request: typeof fetch = async (input): Promise<Response> => {
    const url = new URL(String(input));
    const requestedGuildId = url.pathname.split("/")[4] || "";
    calls.push(requestedGuildId);
    return (
      memberships.get(requestedGuildId)?.clone() ??
      Response.json({}, { status: 500 })
    );
  };
  assert.equal(
    await checkAnyServerMembership(
      discordId,
      [guildId, kfcGuildId],
      "synthetic-bot",
      request,
    ),
    "member",
  );
  assert.deepEqual(calls.sort(), [guildId, kfcGuildId].sort());
});

test("Multi-server membership denies only when every server confirms absence", async () => {
  const requestFor =
    (
      statuses: Readonly<Record<string, "not_member" | "unavailable">>,
    ): typeof fetch =>
    async (input): Promise<Response> => {
      const guild = new URL(String(input)).pathname.split("/")[4] || "";
      return statuses[guild] === "not_member"
        ? Response.json({ code: 10007 }, { status: 404 })
        : Response.json({}, { status: 503 });
    };
  assert.equal(
    await checkAnyServerMembership(
      discordId,
      [guildId, kfcGuildId],
      "synthetic-bot",
      requestFor({
        [guildId]: "not_member",
        [kfcGuildId]: "not_member",
      }),
    ),
    "not_member",
  );
  assert.equal(
    await checkAnyServerMembership(
      discordId,
      [guildId, kfcGuildId],
      "synthetic-bot",
      requestFor({
        [guildId]: "not_member",
        [kfcGuildId]: "unavailable",
      }),
    ),
    "unavailable",
  );
  assert.equal(
    await checkAnyServerMembership(
      discordId,
      [],
      "synthetic-bot",
      requestFor({}),
    ),
    "unavailable",
  );
});
