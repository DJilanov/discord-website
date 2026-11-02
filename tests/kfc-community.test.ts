import assert from "node:assert/strict";
import { test } from "node:test";
import {
  kfcApplicationId,
  kfcGuildId,
  kfcManagementRoleId,
  kfcClasses,
  kfcCombatRoles,
  kfcTargets,
  kfcNewChannels,
  kfcResources,
} from "../content/kfc-community";
import {
  channelPermissions,
  guildPermissions,
  hasDiscordPermission,
  type DiscordAuditSnapshot,
} from "../lib/discord-audit";
import {
  assertKfcScope,
  assertKfcArchiveVisibility,
  kfcOverwrites,
  kfcMovePatch,
  kfcOnboarding,
  kfcOnboardingMatches,
  kfcRequest,
  kfcWriteMask,
} from "../lib/kfc-community";
import {
  assertExperienceAccessPreserved,
  type ExperienceChannel,
} from "../lib/discord-channel-experience";

const channels: Record<string, string> = Object.fromEntries(
  kfcNewChannels.map((c, i) => [
    c.key,
    (1556000000000000100n + BigInt(i)).toString(),
  ]),
);
const shamanId = "1556000000000000001";
function snapshot(): DiscordAuditSnapshot {
  const s: DiscordAuditSnapshot = {
    capturedAt: "2026-10-09T00:00:00Z",
    application: { id: kfcApplicationId, name: "Bot" },
    bot: { id: kfcApplicationId, username: "Bot", bot: true },
    guild: {
      id: kfcGuildId,
      name: "KFC",
      description: null,
      features: ["COMMUNITY"],
      verification_level: 1,
      default_message_notifications: 1,
      explicit_content_filter: 2,
      mfa_level: 0,
      rules_channel_id: null,
      system_channel_id: null,
    },
    roles: [
      {
        id: kfcGuildId,
        name: "everyone",
        position: 0,
        managed: false,
        mentionable: false,
        permissions: "0",
      },
      {
        id: kfcApplicationId,
        name: "bot",
        position: 30,
        managed: true,
        mentionable: false,
        permissions: ((1n << 4n) | (1n << 5n) | (1n << 28n)).toString(),
      },
      {
        id: kfcManagementRoleId,
        name: "Staff",
        position: 40,
        managed: false,
        mentionable: false,
        permissions: (1n << 5n).toString(),
      },
      ...[...kfcClasses, ...kfcCombatRoles, ["Shaman", shamanId] as const].map(
        ([name, id], i) => ({
          id,
          name,
          position: i + 1,
          managed: false,
          mentionable: false,
          permissions: "0",
        }),
      ),
    ],
    channels: [],
    botRoleIds: [kfcApplicationId],
    onboarding: {
      status: "available",
      data: {
        guild_id: kfcGuildId,
        enabled: false,
        mode: 0,
        prompts: [],
        default_channel_ids: [],
      },
    },
  };
  const ids = new Set([
    ...kfcTargets.map((c) => c.id),
    ...Object.values(channels),
    "1411592694404218991",
  ]);
  s.channels = [...ids].map((id) => ({
    id,
    guild_id: kfcGuildId,
    type: id === "1411592694404218991" ? 2 : 0,
    name: "test",
    parent_id: null,
    position: 0,
    permission_overwrites: [
      {
        id: kfcGuildId,
        type: 0,
        allow: ((1n << 10n) | (1n << 11n) | (1n << 16n)).toString(),
        deny: "0",
      },
    ],
  }));
  return s;
}
function access(
  s: DiscordAuditSnapshot,
  c: ExperienceChannel,
  roles: string[] = [],
  memberId?: string,
): bigint {
  return channelPermissions(
    guildPermissions(s.roles, kfcGuildId, roles),
    c,
    kfcGuildId,
    roles,
    memberId,
  );
}

test("KFC operator rejects another server or bot", (): void => {
  const s = snapshot();
  assertKfcScope(s);
  s.guild.id = "1554316932948172940";
  assert.throws(() => assertKfcScope(s));
  s.guild.id = kfcGuildId;
  s.bot.id = shamanId;
  assert.throws(() => assertKfcScope(s));
});
test("Maintained application channels preserve history audiences but let staff and the bot update their instructions", (): void => {
  const s = snapshot();
  const before = s.channels[0];
  before.permission_overwrites.push({
    id: kfcClasses[0][1],
    type: 0,
    allow: "0",
    deny: ((1n << 10n) | (1n << 16n)).toString(),
  });
  const after: ExperienceChannel = {
    ...before,
    permission_overwrites: kfcOverwrites(before, s, "maintained"),
  };
  assertKfcArchiveVisibility(before, after, s);
  assert.equal(hasDiscordPermission(access(s, after), kfcWriteMask), false);
  assert.equal(
    hasDiscordPermission(access(s, after, [kfcClasses[0][1]]), 1n << 10n),
    false,
  );
  assert.equal(
    hasDiscordPermission(access(s, after, [kfcManagementRoleId]), kfcWriteMask),
    true,
  );
  assert.equal(
    hasDiscordPermission(
      access(s, after, s.botRoleIds, kfcApplicationId),
      kfcWriteMask,
    ),
    true,
  );
  assert.deepEqual(
    kfcOverwrites(after, s, "maintained"),
    after.permission_overwrites,
  );
});
test("Read-only resources block all member posting paths and preserve staff maintenance", (): void => {
  const s = snapshot(),
    c = s.channels[0];
  c.permission_overwrites.push({
    id: kfcClasses[0][1],
    type: 0,
    allow: kfcWriteMask.toString(),
    deny: "0",
  });
  const after = {
    ...c,
    permission_overwrites: kfcOverwrites(c, s, "read-only"),
  };
  assert.equal(access(s, after, [kfcClasses[0][1]]) & kfcWriteMask, 0n);
  assert.equal(access(s, after) & kfcWriteMask, 0n);
  assert.equal(
    access(s, after, [kfcManagementRoleId]) & kfcWriteMask,
    kfcWriteMask,
  );
  assert.equal(
    access(s, after, [kfcApplicationId], kfcApplicationId) & kfcWriteMask,
    kfcWriteMask,
  );
  assert.equal(
    hasDiscordPermission(access(s, after), (1n << 10n) | (1n << 16n)),
    true,
  );
});
test("Archive writes are removed without opening role or member-restricted history", (): void => {
  const s = snapshot(),
    c = s.channels[0];
  c.permission_overwrites = [
    { id: kfcGuildId, type: 0, allow: "0", deny: (1n << 10n).toString() },
    {
      id: kfcClasses[0][1],
      type: 0,
      allow: ((1n << 10n) | kfcWriteMask).toString(),
      deny: "0",
    },
    { id: shamanId, type: 1, allow: (1n << 10n).toString(), deny: "0" },
  ];
  const after = { ...c, permission_overwrites: kfcOverwrites(c, s, "archive") };
  assertKfcArchiveVisibility(c, after, s);
  assert.equal(hasDiscordPermission(access(s, after), 1n << 10n), false);
  assert.equal(
    hasDiscordPermission(access(s, after, [kfcClasses[0][1]]), 1n << 10n),
    true,
  );
  assert.equal(access(s, after, [kfcClasses[0][1]]) & kfcWriteMask, 0n);
  assert.equal(
    hasDiscordPermission(access(s, after, [], shamanId), 1n << 10n),
    true,
  );
  const unsafe = {
    ...after,
    permission_overwrites: [
      { id: kfcGuildId, type: 0 as const, allow: "1024", deny: "0" },
    ],
  };
  assert.throws(() => assertKfcArchiveVisibility(c, unsafe, s));
});
test("Permission transformations are idempotent and do not mutate the original channel", (): void => {
  const s = snapshot(),
    c = s.channels[0],
    original = structuredClone(c);
  for (const mode of ["read-only", "chat", "archive"] as const) {
    const first = kfcOverwrites(c, s, mode);
    assert.deepEqual(
      kfcOverwrites({ ...c, permission_overwrites: first }, s, mode),
      first,
    );
    assert.deepEqual(c, original);
  }
});
test("Game sections keep three shared destinations and TBC raid chat stays in its edition", (): void => {
  assert.equal(
    kfcTargets.find((c) => c.id === "1441654698519040114")?.name,
    "TBC Raids",
  );
  assert.equal(
    kfcTargets.find((c) => c.id === "1548517693957869619")?.name,
    "WoW Forever",
  );
  assert.deepEqual(
    kfcNewChannels.filter((c) => c.parentKey === "groups").map((c) => c.key),
    ["calendar", "lfg", "pvp"],
  );
  assert.equal(
    kfcNewChannels.find((channel) => channel.key === "raidChat")?.parentId,
    "1441654698519040114",
  );
  assert.equal(kfcNewChannels[0].key, "groups");
  assert.equal(kfcNewChannels[0].type, 4);
  assert.equal(kfcNewChannels[0].name, "Find a Group");
  const welcome = kfcResources(channels).find((r) => r.key === "welcome")!;
  for (const title of ["TBC Raids", "WoW Forever", "Sign up", "Join KFC"])
    assert.ok(welcome.description.includes(title));
});
test("Category moves change only placement and reject changed access or wrong identities", (): void => {
  const s = snapshot();
  const destination = {
    ...s.channels.find((c) => c.id === channels.groups)!,
    type: 4,
    name: "Find a Group",
  };
  const before = s.channels.find((c) => c.id === channels.lfg)!;
  const patch = kfcMovePatch(before, destination, s);
  assert.deepEqual(patch, { parent_id: destination.id });
  assertExperienceAccessPreserved(before, { ...before, ...patch }, patch);
  assert.throws(() =>
    assertExperienceAccessPreserved(
      before,
      { ...before, ...patch, permission_overwrites: [] },
      patch,
    ),
  );
  assert.throws(() =>
    kfcMovePatch(before, { ...destination, guild_id: shamanId }, s),
  );
  assert.throws(() => kfcMovePatch(before, { ...destination, type: 0 }, s));
  assert.throws(() =>
    kfcMovePatch({ ...before, parent_id: shamanId }, destination, s),
  );
  const hidden = {
    ...destination,
    permission_overwrites: [
      {
        id: kfcApplicationId,
        type: 1 as const,
        deny: (1n << 10n).toString(),
        allow: "0",
      },
    ],
  };
  assert.throws(() => kfcMovePatch(before, hidden, s));
});
test("Onboarding has seven defaults, one required question and safe optional roles", (): void => {
  const s = snapshot(),
    wanted = kfcOnboarding(s, channels, shamanId);
  assert.equal(wanted.default_channel_ids.length, 7);
  assert.equal(wanted.prompts.filter((p) => p.in_onboarding).length, 1);
  assert.equal(
    wanted.prompts[0].options.some((o) => o.title.includes("deciding")),
    true,
  );
  assert.equal(wanted.prompts[1].options.length, 9);
  assert.equal(wanted.prompts[1].required, false);
  assert.deepEqual(
    wanted.prompts[0].options.find(
      (option): boolean => option.title === "Friends / still deciding",
    )?.channel_ids,
    ["1412553351874215976"],
  );
  const tbcPvp = wanted.prompts[0].options.find(
    (option): boolean => option.title === "TBC PvP",
  );
  const foreverPvp = wanted.prompts[0].options.find(
    (option): boolean => option.title === "Forever PvP",
  );
  assert.deepEqual(tbcPvp?.channel_ids, [
    channels.pvp,
    "1463110825790148639",
    "1463605381342429195",
  ]);
  assert.deepEqual(foreverPvp?.channel_ids, [
    channels.pvp,
    "1548519535177629707",
  ]);
  assert.equal(wanted.prompts[0].options.flatMap((o) => o.role_ids).length, 0);
  assert.equal(
    wanted.prompts
      .flatMap((p) => p.options)
      .some((o) => o.role_ids.includes(kfcManagementRoleId)),
    false,
  );
  assert.equal(
    new Set(
      wanted.prompts.flatMap((p) => [p.id, ...p.options.map((o) => o.id)]),
    ).size,
    wanted.prompts.reduce(
      (count, prompt): number => count + 1 + prompt.options.length,
      0,
    ),
  );
});
test("Onboarding blocks hidden defaults, hidden interests and privileged or unmanageable class roles", (): void => {
  const s = snapshot();
  s.channels.find((c) => c.id === channels.help)!.permission_overwrites = [];
  assert.throws(() => kfcOnboarding(s, channels, shamanId));
  const other = snapshot();
  other.channels.find(
    (c) => c.id === "1548519535177629707",
  )!.permission_overwrites = [];
  assert.throws(() => kfcOnboarding(other, channels, shamanId));
  for (const mutation of [
    (r: DiscordAuditSnapshot["roles"][number]): void => {
      r.permissions = "8";
    },
    (r: DiscordAuditSnapshot["roles"][number]): void => {
      r.position = 31;
    },
    (r: DiscordAuditSnapshot["roles"][number]): void => {
      r.managed = true;
    },
  ]) {
    const next = snapshot();
    mutation(next.roles.find((r) => r.id === shamanId)!);
    assert.throws(() => kfcOnboarding(next, channels, shamanId));
  }
});
test("Onboarding enforces five writable defaults", (): void => {
  const s = snapshot();
  for (const c of s.channels.filter((c) =>
    [channels.help, channels.calendar, channels.lfg].includes(c.id),
  ))
    c.permission_overwrites[0].allow = ((1n << 10n) | (1n << 16n)).toString();
  assert.throws(() => kfcOnboarding(s, channels, shamanId));
});
test("Read-back matching tolerates Discord-generated IDs but rejects changed destination or privilege", (): void => {
  const s = snapshot(),
    wanted = kfcOnboarding(s, channels, shamanId);
  const actual = {
    status: "available" as const,
    data: { guild_id: kfcGuildId, ...structuredClone(wanted) },
  };
  actual.data.prompts[0].id = "1556000000000000999";
  assert.equal(kfcOnboardingMatches(actual, wanted), true);
  actual.data.prompts[0].options[0].role_ids.push(kfcManagementRoleId);
  assert.equal(kfcOnboardingMatches(actual, wanted), false);
});
test("Resources are substantive, within embed limits and have no placeholder destinations", (): void => {
  const resources = kfcResources(channels);
  assert.equal(resources.length, 9);
  for (const r of resources) {
    assert.ok(r.description.length > 200 && r.description.length < 4096);
    assert.ok(!/undefined|TODO|kfc team/i.test(r.description));
  }
  assert.throws(() => kfcResources({}));
});
test("Client refuses cross-server routes and unknown channel IDs without a request", async (): Promise<void> => {
  const credentials = {
    applicationId: kfcApplicationId,
    guildId: kfcGuildId,
    token: "private-test-token-not-a-real-credential",
  };
  let calls = 0;
  const transport: typeof fetch = async (): Promise<Response> => {
    calls++;
    return Response.json({});
  };
  for (const route of [
    "/guilds/1554316932948172940",
    "/channels/1556000000000000999",
    "/users/@me",
    "/guilds/1411533815356194968/members",
    "/guilds/1411533815356194968/scheduled-events/1556000000000000999",
  ])
    await assert.rejects(
      kfcRequest(credentials, route, "GET", undefined, {
        channelIds: new Set(),
        transport,
      }),
    );
  await assert.rejects(
    kfcRequest(
      { ...credentials, guildId: shamanId },
      `/guilds/${kfcGuildId}`,
      "GET",
      undefined,
      { channelIds: new Set(), transport },
    ),
  );
  assert.equal(calls, 0);
  await assert.rejects(
    kfcRequest(
      credentials,
      `/guilds/${kfcGuildId}/scheduled-events`,
      "PATCH",
      {},
      { channelIds: new Set(), transport },
    ),
  );
  assert.equal(calls, 0);
});
test("Client respects 429 and rechecks configuration before retrying", async (): Promise<void> => {
  let calls = 0,
    checks = 0;
  const sleeps: number[] = [];
  const transport: typeof fetch = async (): Promise<Response> => {
    calls++;
    return calls === 1
      ? Response.json({ retry_after: 0.01 }, { status: 429 })
      : Response.json({ id: kfcGuildId });
  };
  await kfcRequest(
    {
      applicationId: kfcApplicationId,
      guildId: kfcGuildId,
      token: "private-test-token-not-a-real-credential",
    },
    `/guilds/${kfcGuildId}`,
    "GET",
    undefined,
    {
      channelIds: new Set(),
      transport,
      sleep: async (ms): Promise<void> => {
        sleeps.push(ms);
      },
      recheck: async (): Promise<void> => {
        checks++;
      },
    },
  );
  assert.equal(calls, 2);
  assert.equal(checks, 2);
  assert.deepEqual(sleeps, [110]);
});
test("Client suppresses upstream errors and never retries uncertain creations", async (): Promise<void> => {
  const credentials = {
    applicationId: kfcApplicationId,
    guildId: kfcGuildId,
    token: "private-test-token-not-a-real-credential",
  };
  const failure: typeof fetch = async (): Promise<Response> =>
    Response.json({ secret: "do-not-expose" }, { status: 403 });
  await assert.rejects(
    kfcRequest(credentials, `/guilds/${kfcGuildId}`, "GET", undefined, {
      channelIds: new Set(),
      transport: failure,
    }),
    (e: unknown): boolean =>
      e instanceof Error &&
      e.message.includes("403") &&
      !e.message.includes("do-not-expose"),
  );
  let calls = 0;
  const timeout: typeof fetch = async (): Promise<Response> => {
    calls++;
    throw new Error("sensitive transport detail");
  };
  await assert.rejects(
    kfcRequest(
      credentials,
      `/guilds/${kfcGuildId}/channels`,
      "POST",
      {},
      { channelIds: new Set(), transport: timeout },
    ),
    /uncertain/,
  );
  assert.equal(calls, 1);
});
