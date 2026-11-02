import assert from "node:assert/strict";
import { test } from "node:test";
import {
  kfcApplicationId,
  kfcGuildId,
  kfcManagementRoleId,
} from "../content/kfc-community";
import {
  kfcAccessDefaultChannels,
  kfcAccessIds,
  kfcApplicationChannelIds,
  kfcPrivateGuildIds,
  kfcPrivateStaffIds,
  kfcPublicChatIds,
  kfcPublicInstructionIds,
} from "../content/kfc-access";
import {
  channelPermissions,
  guildPermissions,
  hasDiscordPermission,
  type DiscordAuditSnapshot,
} from "../lib/discord-audit";
import {
  analyzeKfcAccess,
  kfcAccessPatches,
  kfcOverwriteFingerprint,
  snapshotWithKfcAccessPatches,
} from "../lib/kfc-access";
import { applyKfcAccessPatches } from "../lib/kfc-access-runner";
import { kfcAccessNotices } from "../content/kfc-access-guidance";
import { kfcAccessOnboarding } from "../lib/kfc-access-onboarding";
import {
  raidingConfigSchema,
  type RaidingConfig,
} from "../lib/kfc-raiding/contracts";

const view = 1n << 10n;
const history = 1n << 16n;
const send = 1n << 11n;
const guildChatId = "1566000000000000100";
const staffChatId = "1566000000000000101";
const lobbyId = "1566000000000000102";
const userId = "1566000000000000103";
type CapturedOnboarding = Extract<
  DiscordAuditSnapshot["onboarding"],
  { status: "available" }
>["data"];
interface Onboarding extends CapturedOnboarding {
  prompts: (CapturedOnboarding["prompts"][number] & { type: number })[];
}

function fixture(): DiscordAuditSnapshot {
  const role = (
    id: string,
    name: string,
    permissions: bigint,
  ): DiscordAuditSnapshot["roles"][number] => ({
    id,
    name,
    permissions: String(permissions),
    position: id === kfcGuildId ? 0 : 1,
    managed: false,
    mentionable: false,
  });
  const privateOverwrites = [
    { id: kfcGuildId, type: 0 as const, allow: "0", deny: String(view) },
    {
      id: kfcAccessIds.certified,
      type: 0 as const,
      allow: String(view),
      deny: "0",
    },
    {
      id: kfcManagementRoleId,
      type: 0 as const,
      allow: String(view),
      deny: "0",
    },
    {
      id: kfcAccessIds.boosters,
      type: 0 as const,
      allow: String(view | send),
      deny: "0",
    },
  ];
  const ids = [
    ...new Set([
      ...kfcPublicInstructionIds,
      ...kfcPublicChatIds,
      ...kfcPrivateGuildIds,
      ...kfcPrivateStaffIds,
      ...kfcApplicationChannelIds,
      kfcAccessIds.guildCategory,
      kfcAccessIds.staffCategory,
      kfcAccessIds.roleMenu,
      guildChatId,
      staffChatId,
      lobbyId,
    ]),
  ];
  return {
    capturedAt: "2026-10-31T10:00:00Z",
    application: { id: kfcApplicationId, name: "Test" },
    bot: { id: kfcApplicationId, username: "Test", bot: true },
    guild: {
      id: kfcGuildId,
      name: "Test",
      description: null,
      features: [],
      verification_level: 1,
      default_message_notifications: 1,
      explicit_content_filter: 2,
      mfa_level: 0,
      rules_channel_id: kfcAccessIds.rules,
      system_channel_id: kfcAccessIds.start,
    },
    roles: [
      role(kfcGuildId, "@everyone", history | send),
      role(kfcAccessIds.verified, "verified", view),
      role(kfcAccessIds.certified, "KFC Certified", view),
      role(kfcAccessIds.boosters, "KFC Boosters", 0n),
      role(kfcManagementRoleId, "KFC Management", view | (1n << 28n)),
    ],
    channels: ids.map((id): DiscordAuditSnapshot["channels"][number] => ({
      id,
      guild_id: kfcGuildId,
      name: id,
      type:
        id === kfcAccessIds.guildCategory || id === kfcAccessIds.staffCategory
          ? 4
          : 0,
      position: 1,
      parent_id:
        id === guildChatId
          ? kfcAccessIds.guildCategory
          : id === staffChatId
            ? kfcAccessIds.staffCategory
            : null,
      permission_overwrites:
        id === guildChatId ||
        id === kfcAccessIds.guildCategory ||
        kfcPrivateGuildIds.includes(id)
          ? privateOverwrites.map((entry) => ({ ...entry }))
          : id === staffChatId ||
              id === kfcAccessIds.staffCategory ||
              kfcPrivateStaffIds.includes(id)
            ? privateOverwrites
                .filter(
                  (entry) =>
                    entry.id !== kfcAccessIds.certified &&
                    entry.id !== kfcAccessIds.boosters,
                )
                .map((entry) => ({ ...entry }))
            : [],
    })),
    botRoleIds: [],
    onboarding: { status: "unavailable", httpStatus: 404 },
  };
}
function access(
  snapshot: DiscordAuditSnapshot,
  channelId: string,
  roles: string[],
): bigint {
  const channel = snapshot.channels.find((item) => item.id === channelId)!;
  return channelPermissions(
    guildPermissions(snapshot.roles, kfcGuildId, roles),
    channel,
    kfcGuildId,
    roles,
  );
}

test("Access audit detects the hidden verification path and Booster guild bypass", (): void => {
  const report = analyzeKfcAccess(fixture(), { raidLobbyId: lobbyId });
  assert.equal(report.passed, false);
  assert(
    report.issues.some(
      (issue) =>
        issue.channelId === kfcAccessIds.verification &&
        issue.code === "newcomer-destination-inaccessible",
    ),
  );
  assert(
    report.issues.some(
      (issue) =>
        issue.channelId === guildChatId &&
        issue.code === "untrusted-private-access",
    ),
  );
});

test("Attendance cases remain staff-only rather than gaining Certified access", (): void => {
  const snapshot = fixture();
  const channel = structuredClone(
    snapshot.channels.find((item) => item.id === guildChatId)!,
  );
  channel.id = kfcPrivateStaffIds[0];
  channel.permission_overwrites = channel.permission_overwrites.filter(
    (entry) => entry.id !== kfcAccessIds.certified,
  );
  snapshot.channels = snapshot.channels.filter(
    (item) => item.id !== channel.id,
  );
  snapshot.channels.push(channel);
  const fixed = snapshotWithKfcAccessPatches(
    snapshot,
    kfcAccessPatches(snapshot),
  );
  assert.equal(
    hasDiscordPermission(
      access(fixed, channel.id, [kfcAccessIds.certified]),
      view,
    ),
    false,
  );
  assert.equal(
    hasDiscordPermission(
      access(fixed, channel.id, [kfcAccessIds.boosters]),
      view,
    ),
    false,
  );
  assert(
    hasDiscordPermission(
      access(fixed, channel.id, [kfcManagementRoleId]),
      view,
    ),
  );
  assert(analyzeKfcAccess(fixed).passed);
});

test("Access repair closes parent and child leaks and keeps Certified and staff access", (): void => {
  const snapshot = fixture();
  const fixed = snapshotWithKfcAccessPatches(
    snapshot,
    kfcAccessPatches(snapshot, { raidLobbyId: lobbyId }),
  );
  assert.equal(analyzeKfcAccess(fixed, { raidLobbyId: lobbyId }).passed, true);
  for (const id of [
    kfcAccessIds.guildCategory,
    guildChatId,
    ...kfcPrivateGuildIds,
  ]) {
    for (const roles of [
      [],
      [kfcAccessIds.verified],
      [kfcAccessIds.boosters],
      [kfcAccessIds.verified, kfcAccessIds.boosters],
    ])
      assert.equal(hasDiscordPermission(access(fixed, id, roles), view), false);
    assert(
      hasDiscordPermission(
        access(fixed, id, [kfcAccessIds.certified]),
        view | history,
      ),
    );
    assert(
      hasDiscordPermission(access(fixed, id, [kfcManagementRoleId]), view),
    );
  }
  assert.equal(
    hasDiscordPermission(
      access(fixed, staffChatId, [kfcAccessIds.certified]),
      view,
    ),
    false,
  );
  assert(
    hasDiscordPermission(
      access(fixed, staffChatId, [kfcManagementRoleId]),
      view,
    ),
  );
  assert.equal(kfcAccessPatches(fixed, { raidLobbyId: lobbyId }).length, 0);
  assert.equal(
    hasDiscordPermission(
      access(snapshot, guildChatId, [kfcAccessIds.boosters]),
      view,
    ),
    true,
  );
});

test("Public instructions stay readable and read-only while Management can publish", (): void => {
  const snapshot = fixture();
  const fixed = snapshotWithKfcAccessPatches(
    snapshot,
    kfcAccessPatches(snapshot),
  );
  for (const id of kfcPublicInstructionIds) {
    assert(hasDiscordPermission(access(fixed, id, []), view | history));
    for (const roles of [
      [],
      [kfcAccessIds.verified],
      [kfcAccessIds.certified],
      [kfcAccessIds.verified, kfcAccessIds.boosters],
    ])
      assert.equal(hasDiscordPermission(access(fixed, id, roles), send), false);
    assert(
      hasDiscordPermission(access(fixed, id, [kfcManagementRoleId]), send),
    );
  }
  for (const id of kfcPublicChatIds)
    assert(hasDiscordPermission(access(fixed, id, []), view | history | send));
});

test("Private user exceptions require explicit review and retain approved access", (): void => {
  const snapshot = fixture();
  snapshot.channels
    .find((item) => item.id === guildChatId)!
    .permission_overwrites.push({
      id: userId,
      type: 1,
      allow: String(view),
      deny: "0",
    });
  assert.throws(
    () => kfcAccessPatches(snapshot),
    /Review private member exception/,
  );
  assert(
    analyzeKfcAccess(snapshot).issues.some(
      (issue) => issue.code === "unreviewed-member-exception",
    ),
  );
  const bindings = { trustedMemberIds: [userId] };
  const fixed = snapshotWithKfcAccessPatches(
    snapshot,
    kfcAccessPatches(snapshot, bindings),
  );
  assert(analyzeKfcAccess(fixed, bindings).passed);
  assert(
    fixed.channels
      .find((item) => item.id === guildChatId)!
      .permission_overwrites.some(
        (entry) =>
          entry.type === 1 &&
          entry.id === userId &&
          entry.allow === String(view),
      ),
  );
});

test("Unrelated permission bits, channels and role records are preserved", (): void => {
  const snapshot = fixture();
  const original = structuredClone(snapshot);
  const fixed = snapshotWithKfcAccessPatches(
    snapshot,
    kfcAccessPatches(snapshot),
  );
  assert.deepEqual(snapshot, original);
  assert.deepEqual(fixed.roles, original.roles);
  const booster = fixed.channels
    .find((item) => item.id === guildChatId)!
    .permission_overwrites.find((entry) => entry.id === kfcAccessIds.boosters)!;
  assert.equal(booster.allow, String(send));
  assert.deepEqual(
    fixed.channels.find((item) => item.id === lobbyId),
    original.channels.find((item) => item.id === lobbyId),
  );
});

test("Fingerprints ignore overwrite order and default channels contain five community rooms", (): void => {
  const entries = fixture().channels.find(
    (item) => item.id === guildChatId,
  )!.permission_overwrites;
  assert.equal(
    kfcOverwriteFingerprint(entries),
    kfcOverwriteFingerprint([...entries].reverse()),
  );
  const defaults = kfcAccessDefaultChannels(lobbyId);
  assert.equal(new Set(defaults).size, 9);
  assert.deepEqual(defaults.slice(-5), [...kfcPublicChatIds, lobbyId]);
  assert(!defaults.includes(kfcAccessIds.guildCategory));
});

test("Missing roles, channels and foreign servers fail closed", (): void => {
  const snapshot = fixture();
  snapshot.roles = snapshot.roles.filter(
    (role) => role.id !== kfcAccessIds.certified,
  );
  assert.throws(() => kfcAccessPatches(snapshot), /access role/);
  const missing = fixture();
  missing.channels = missing.channels.filter(
    (channel) => channel.id !== kfcAccessIds.verification,
  );
  assert.throws(() => kfcAccessPatches(missing), /destination missing/);
  assert.throws(
    () =>
      kfcAccessPatches({
        ...fixture(),
        guild: { ...fixture().guild, id: userId },
      }),
    /scope/,
  );
});

test("An accidental administrator grant on an ordinary role cannot masquerade as staff", (): void => {
  const snapshot = fixture();
  snapshot.roles.find(
    (role) => role.id === kfcAccessIds.boosters,
  )!.permissions = String(1n << 3n);
  const fixed = snapshotWithKfcAccessPatches(
    snapshot,
    kfcAccessPatches(snapshot),
  );
  assert.equal(analyzeKfcAccess(fixed).passed, false);
});

test("Applying access patches repairs privacy first, verifies writes, and is retry-safe", async (): Promise<void> => {
  const snapshot = fixture();
  const patches = kfcAccessPatches(snapshot);
  const channels = new Map(
    snapshot.channels.map((channel) => [channel.id, structuredClone(channel)]),
  );
  const applied: string[] = [];
  const journal: Record<string, unknown>[] = [];
  const writer = {
    request: async (
      route: string,
      method: "GET" | "PATCH",
      body?: unknown,
    ): Promise<unknown> => {
      const id = route.split("/").at(-1)!;
      const channel = channels.get(id)!;
      if (method === "PATCH") {
        const patch = patches.find((item) => item.channelId === id)!;
        assert.deepEqual(body, { permission_overwrites: patch.after });
        channel.permission_overwrites = structuredClone(patch.after);
        applied.push(id);
      }
      return structuredClone(channel);
    },
    journal: async (record: Record<string, unknown>): Promise<void> => {
      journal.push(record);
    },
  };
  assert.equal(await applyKfcAccessPatches(patches, writer), patches.length);
  const scopes = applied.map(
    (id) => patches.find((patch) => patch.channelId === id)!.scope,
  );
  const firstPublic = scopes.findIndex(
    (scope) => scope !== "guild" && scope !== "staff",
  );
  assert(
    scopes
      .slice(firstPublic)
      .every((scope) => scope !== "guild" && scope !== "staff"),
  );
  assert.equal(await applyKfcAccessPatches(patches, writer), 0);
  assert.equal(
    journal.filter((entry) => entry.operation === "access-patch-verified")
      .length,
    patches.length,
  );
});

test("A drifted or moved destination stops before writing", async (): Promise<void> => {
  const snapshot = fixture();
  const patch = kfcAccessPatches(snapshot).find(
    (item) => item.scope === "instructions",
  )!;
  const current = structuredClone(
    snapshot.channels.find((item) => item.id === patch.channelId)!,
  );
  current.permission_overwrites.push({
    id: userId,
    type: 1,
    allow: String(send),
    deny: "0",
  });
  let writes = 0;
  const writer = {
    request: async (
      _route: string,
      method: "GET" | "PATCH",
    ): Promise<unknown> => {
      if (method === "PATCH") writes++;
      return current;
    },
    journal: async (): Promise<void> => {},
  };
  await assert.rejects(
    applyKfcAccessPatches([patch], writer),
    /changed since preview/,
  );
  current.parent_id = userId;
  await assert.rejects(
    applyKfcAccessPatches([patch], writer),
    /destination moved/,
  );
  assert.equal(writes, 0);
});

test("An uncertain write is journaled and never blindly repeated", async (): Promise<void> => {
  const snapshot = fixture();
  const patch = kfcAccessPatches(snapshot)[0];
  const current = snapshot.channels.find(
    (item) => item.id === patch.channelId,
  )!;
  let writes = 0;
  const records: Record<string, unknown>[] = [];
  await assert.rejects(
    applyKfcAccessPatches([patch], {
      request: async (
        _route: string,
        method: "GET" | "PATCH",
      ): Promise<unknown> => {
        if (method === "PATCH") {
          writes++;
          throw new Error("uncertain");
        }
        return current;
      },
      journal: async (record: Record<string, unknown>): Promise<void> => {
        records.push(record);
      },
    }),
    /uncertain/,
  );
  assert.equal(writes, 1);
  assert.deepEqual(
    records.map((record) => record.operation),
    ["access-patch-intent"],
  );
});

test("Access notices explain optional roles and separate Certified membership without mentions", (): void => {
  const notices = kfcAccessNotices();
  assert.deepEqual(
    notices.map((notice) => notice.key),
    ["verification", "roles"],
  );
  for (const notice of notices) {
    assert.deepEqual(notice.payload.allowed_mentions, { parse: [] });
    const description = notice.payload.embeds[0].description;
    assert(description);
    assert(description.length < 4096);
    assert.match(description, /Certified/);
    for (const row of notice.payload.components)
      assert(row.components.length <= 5);
  }
  assert.match(notices[0].payload.embeds[0].description ?? "", /MEE6 Verify/);
  assert.match(notices[1].payload.embeds[0].description ?? "", /out of date/);
});

function nativeOnboardingFixture(): {
  snapshot: DiscordAuditSnapshot;
  config: RaidingConfig;
  raw: Onboarding;
} {
  const snapshot = fixture();
  const space = (offset: number): object => {
    const id = (n: number): string =>
      String(1566100000000000000n + BigInt(offset + n));
    return {
      categoryId: id(1),
      schedule: { channelId: id(2), messageId: id(3) },
      forumId: id(4),
      forumGuideId: id(5),
      chatId: id(6),
      alertRoleId: id(7),
      alerts: { channelId: id(2), messageId: id(8) },
      tags: {},
    };
  };
  const config = raidingConfigSchema.parse({
    version: 1,
    guildId: kfcGuildId,
    applicationId: kfcApplicationId,
    hub: { channelId: kfcAccessIds.calendar, messageId: "1566100000000000090" },
    spaces: { forever: space(0), tbc: space(20) },
  });
  const raw: Onboarding = {
    guild_id: kfcGuildId,
    enabled: true,
    mode: 0,
    default_channel_ids: [kfcAccessIds.general],
    prompts: [
      {
        id: "1557977148621586494",
        title: "What brings you here?",
        type: 0,
        required: true,
        single_select: false,
        in_onboarding: true,
        options: [
          {
            id: "1557977148621586497",
            title: "TBC raids",
            channel_ids: [],
            role_ids: [],
          },
          {
            id: "1557977148621586498",
            title: "WoW Forever",
            channel_ids: [],
            role_ids: [],
          },
          {
            id: "1566100000000000091",
            title: "Friends / still deciding",
            channel_ids: [kfcAccessIds.general],
            role_ids: [],
          },
        ],
      },
    ],
  };
  for (const game of ["forever", "tbc"] as const)
    for (const id of [
      config.spaces[game].schedule.channelId,
      config.spaces[game].forumId,
      config.spaces[game].chatId,
    ])
      snapshot.channels.push({
        id,
        guild_id: kfcGuildId,
        type: id === config.spaces[game].forumId ? 15 : 0,
        name: "test",
        position: 1,
        parent_id: null,
        permission_overwrites: [
          {
            id: kfcGuildId,
            type: 0,
            allow: String(view | history | (1n << 38n)),
            deny: "0",
          },
        ],
      });
  const fixed = snapshotWithKfcAccessPatches(
    snapshot,
    kfcAccessPatches(snapshot, { raidLobbyId: lobbyId }),
  );
  return { snapshot: fixed, config, raw };
}

test("Native onboarding waits for actual Rules Screening and preserves unrelated choices", (): void => {
  const { snapshot, config, raw } = nativeOnboardingFixture();
  assert.throws(
    () => kfcAccessOnboarding(snapshot, raw, config, lobbyId),
    /Enable and verify native Rules Screening/,
  );
  snapshot.guild.features.push("MEMBER_VERIFICATION_GATE_ENABLED");
  const before = structuredClone(raw);
  const desired = kfcAccessOnboarding(snapshot, raw, config, lobbyId);
  assert.deepEqual(
    desired.default_channel_ids,
    kfcAccessDefaultChannels(lobbyId),
  );
  assert.deepEqual(raw, before);
  const prompts = desired.prompts as {
    options: { id: string; channel_ids: string[]; role_ids: string[] }[];
  }[];
  assert.deepEqual(prompts[0].options[2], before.prompts[0].options[2]);
  assert.deepEqual(prompts[0].options[0].role_ids, []);
});

test("Onboarding cannot assign Verified or Certified through interest selection", (): void => {
  const { snapshot, config, raw } = nativeOnboardingFixture();
  snapshot.guild.features.push("MEMBER_VERIFICATION_GATE_ENABLED");
  raw.prompts[0].options[2].role_ids = [kfcAccessIds.certified];
  assert.throws(
    () => kfcAccessOnboarding(snapshot, raw, config, lobbyId),
    /cannot grant access/,
  );
});

test("Private membership exceptions do not grant publishing rights on public instructions", (): void => {
  const snapshot = fixture();
  snapshot.channels
    .find((channel) => channel.id === kfcAccessIds.rules)!
    .permission_overwrites.push({
      id: userId,
      type: 1,
      allow: String(send),
      deny: "0",
    });
  const bindings = { trustedMemberIds: [userId] };
  const fixed = snapshotWithKfcAccessPatches(
    snapshot,
    kfcAccessPatches(snapshot, bindings),
  );
  const member = fixed.channels
    .find((channel) => channel.id === kfcAccessIds.rules)!
    .permission_overwrites.find((entry) => entry.id === userId)!;
  assert.equal(BigInt(member.allow) & send, 0n);
  assert(analyzeKfcAccess(fixed, bindings).passed);
});

test("An incomplete channel inventory cannot pass the access audit", (): void => {
  const snapshot = fixture();
  snapshot.channels = [];
  assert.equal(analyzeKfcAccess(snapshot).passed, false);
});

test("Verified applicants can read and submit TBC applications without Certified", (): void => {
  const snapshot = fixture();
  snapshot.channels.find(
    (channel) => channel.id === kfcAccessIds.tbcApplication,
  )!.permission_overwrites = [
    { id: kfcGuildId, type: 0, allow: "0", deny: String(view | send) },
    {
      id: kfcAccessIds.verified,
      type: 0,
      allow: "0",
      deny: String(history | send),
    },
  ];
  assert(
    analyzeKfcAccess(snapshot).issues.some(
      (issue) => issue.code === "applicants-cannot-apply",
    ),
  );
  const fixed = snapshotWithKfcAccessPatches(snapshot, kfcAccessPatches(snapshot));
  assert(!kfcPrivateStaffIds.includes(kfcAccessIds.tbcApplication));
  assert.equal(
    hasDiscordPermission(access(fixed, kfcAccessIds.tbcApplication, []), view),
    false,
  );
  for (const role of [
    kfcAccessIds.verified,
    kfcAccessIds.certified,
    kfcManagementRoleId,
  ])
    assert(
      hasDiscordPermission(
        access(fixed, kfcAccessIds.tbcApplication, [role]),
        view | history | send,
      ),
    );
  assert.equal(
    hasDiscordPermission(
      access(fixed, guildChatId, [kfcAccessIds.verified]),
      view,
    ),
    false,
  );
  assert(analyzeKfcAccess(fixed).passed);
});

test("Removing Certified also removes access despite an old per-person view grant", (): void => {
  const snapshot = fixture();
  snapshot.channels
    .find((channel) => channel.id === guildChatId)!
    .permission_overwrites.push({
      id: userId,
      type: 1,
      allow: String(view | send),
      deny: "0",
    });
  const bindings = { roleBoundMemberIds: [userId] };
  const fixed = snapshotWithKfcAccessPatches(
    snapshot,
    kfcAccessPatches(snapshot, bindings),
  );
  const channel = fixed.channels.find((item) => item.id === guildChatId)!;
  assert(
    hasDiscordPermission(
      channelPermissions(
        guildPermissions(fixed.roles, kfcGuildId, [kfcAccessIds.certified]),
        channel,
        kfcGuildId,
        [kfcAccessIds.certified],
        userId,
      ),
      view | history,
    ),
  );
  assert.equal(
    hasDiscordPermission(
      channelPermissions(
        guildPermissions(fixed.roles, kfcGuildId, []),
        channel,
        kfcGuildId,
        [],
        userId,
      ),
      view,
    ),
    false,
  );
  assert(analyzeKfcAccess(fixed, bindings).passed);
});
