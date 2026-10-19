import assert from "node:assert/strict";
import { test } from "node:test";
import {
  experienceApplicationId,
  experienceForums,
  experienceGuildId,
  experienceTargets,
  defaultChannelIds,
} from "../content/discord-channel-experience";
import {
  channelPermissions,
  guildPermissions,
  type DiscordAuditSnapshot,
} from "../lib/discord-audit";
import {
  assertExperienceAccessPreserved,
  assertExperienceScope,
  assertExperienceUnchanged,
  experiencePatchMatches,
  mergedExperienceTags,
  readOnlyArchiveOverwrites,
  sameExperienceChannelIds,
  type ExperienceChannel,
} from "../lib/discord-channel-experience";

function channel(): ExperienceChannel {
  return {
    id: "1554323354574389431",
    guild_id: experienceGuildId,
    type: 0,
    name: "original",
    position: 1,
    parent_id: null,
    topic: "Original",
    permission_overwrites: [],
  };
}

function snapshot(): DiscordAuditSnapshot {
  return {
    capturedAt: "2026-10-01T00:00:00.000Z",
    application: { id: experienceApplicationId, name: "test" },
    bot: { id: experienceApplicationId, username: "test", bot: true },
    guild: {
      id: experienceGuildId,
      name: "test",
      description: null,
      features: [],
      verification_level: 1,
      default_message_notifications: 1,
      explicit_content_filter: 2,
      mfa_level: 0,
      rules_channel_id: null,
      system_channel_id: null,
    },
    roles: [
      {
        id: experienceGuildId,
        name: "everyone",
        position: 0,
        permissions: (
          (1n << 10n) |
          (1n << 11n) |
          (1n << 16n) |
          (1n << 38n)
        ).toString(),
        managed: false,
        mentionable: false,
      },
      {
        id: "1554332903603966043",
        name: "ordinary",
        position: 1,
        permissions: "0",
        managed: false,
        mentionable: false,
      },
      {
        id: "1554525480013660250",
        name: "trusted staff",
        position: 2,
        permissions: "8",
        managed: false,
        mentionable: false,
      },
    ],
    botRoleIds: [],
    channels: [channel()],
    onboarding: { status: "unavailable", httpStatus: 403 },
  };
}

test("channel scope cannot target another server or bot", (): void => {
  assertExperienceScope(snapshot());
  const wrong = snapshot();
  wrong.guild.id = "1554316932948172941";
  assert.throws((): void => assertExperienceScope(wrong));
  const bot = snapshot();
  bot.application.id = "1554316932948172941";
  assert.throws((): void => assertExperienceScope(bot));
});

test("fixed channel targets and forum tags are unique and valid", (): void => {
  assert.equal(
    new Set(experienceTargets.map((target): string => target.id)).size,
    experienceTargets.length,
  );
  assert.equal(defaultChannelIds.length, 7);
  assert.equal(new Set(defaultChannelIds).size, 7);
  for (const forum of experienceForums) {
    assert.equal(forum.tags.length, 14);
    assert.equal(
      new Set(forum.tags.map((tag): string => tag.name)).size,
      forum.tags.length,
    );
    assert.ok(
      forum.tags.every(
        (tag): boolean => tag.name.length > 0 && tag.name.length <= 20,
      ),
    );
    assert.ok(forum.tags.some((tag): boolean => !tag.moderated));
    assert.ok(forum.guidelines.length <= 1024);
    assert.ok(forum.cooldown <= 21600);
  }
});

test("onboarding compares the exact default-channel set without depending on API order", (): void => {
  assert.equal(
    sameExperienceChannelIds(
      defaultChannelIds,
      [...defaultChannelIds].reverse(),
    ),
    true,
  );
  assert.equal(
    sameExperienceChannelIds(defaultChannelIds, [
      ...defaultChannelIds,
      defaultChannelIds[0],
    ]),
    false,
  );
  assert.equal(
    sameExperienceChannelIds(defaultChannelIds, defaultChannelIds.slice(1)),
    false,
  );
  assert.equal(
    sameExperienceChannelIds(defaultChannelIds, [
      ...defaultChannelIds.slice(1),
      "1554316932948172941",
    ]),
    false,
  );
});

test("tag merging preserves existing IDs and unrelated tags", (): void => {
  const tags = mergedExperienceTags(
    [
      { id: "1554332903603966043", name: "Open", moderated: false },
      { id: "1554332903603966044", name: "Existing", moderated: false },
    ],
    [
      { name: "Open", moderated: true },
      { name: "Solved", moderated: true },
    ],
  );
  assert.equal(tags[0].id, "1554332903603966043");
  assert.equal(tags[0].moderated, true);
  assert.equal(tags[1].name, "Existing");
  assert.equal(tags[2].name, "Solved");
  assert.throws(() =>
    mergedExperienceTags(
      Array.from({ length: 20 }, (_, index: number) => ({
        name: `Existing ${index}`,
        moderated: false,
      })),
      [{ name: "New", moderated: false }],
    ),
  );
  assert.throws(() =>
    mergedExperienceTags(
      [
        { name: "Same", moderated: false },
        { name: "Same", moderated: false },
      ],
      [{ name: "Same", moderated: true }],
    ),
  );
});

test("archives stop member writes without changing visibility or staff role", (): void => {
  const data = snapshot();
  const before = channel();
  before.permission_overwrites = [
    { id: experienceGuildId, type: 0, allow: "0", deny: "0" },
    {
      id: "1554332903603966043",
      type: 0,
      allow: ((1n << 10n) | (1n << 11n) | (1n << 38n)).toString(),
      deny: "0",
    },
    { id: "1554525480013660250", type: 0, allow: "2048", deny: "0" },
    { id: "1554332903603966045", type: 1, allow: "2048", deny: "1024" },
  ];
  const after = {
    ...before,
    permission_overwrites: readOnlyArchiveOverwrites(before, data),
  };
  const permissions = channelPermissions(
    guildPermissions(data.roles, experienceGuildId, ["1554332903603966043"]),
    after,
    experienceGuildId,
    ["1554332903603966043"],
  );
  assert.equal(permissions & (1n << 11n), 0n);
  assert.equal(permissions & (1n << 38n), 0n);
  assert.notEqual(permissions & (1n << 10n), 0n);
  assert.notEqual(permissions & (1n << 16n), 0n);
  assert.deepEqual(
    after.permission_overwrites[2],
    before.permission_overwrites[2],
  );
  assert.equal(
    BigInt(after.permission_overwrites[3].deny) & (1n << 10n),
    1n << 10n,
  );
  assert.deepEqual(before.permission_overwrites[0], {
    id: experienceGuildId,
    type: 0,
    allow: "0",
    deny: "0",
  });
});

test("archive creates the everyone deny when no overwrite exists", (): void => {
  const updated = readOnlyArchiveOverwrites(channel(), snapshot());
  assert.equal(updated.length, 1);
  assert.equal(updated[0].id, experienceGuildId);
  assert.equal(BigInt(updated[0].deny) & (1n << 11n), 1n << 11n);
});

test("concurrent name, topic and permission changes are rejected", (): void => {
  const before = channel();
  assertExperienceUnchanged(before, {
    ...before,
    position: 3,
    default_forum_layout: 0,
  });
  assert.throws((): void =>
    assertExperienceUnchanged(before, { ...before, topic: "Owner edit" }),
  );
  assert.throws((): void =>
    assertExperienceUnchanged(before, { ...before, name: "Owner name" }),
  );
  assert.throws((): void =>
    assertExperienceUnchanged(before, {
      ...before,
      permission_overwrites: [
        { id: experienceGuildId, type: 0, allow: "0", deny: "1024" },
      ],
    }),
  );
  assert.throws((): void =>
    assertExperienceUnchanged(
      { ...before, default_sort_order: 0 },
      { ...before, default_sort_order: 1 },
    ),
  );
});

test("read-back requires matching tag IDs when already present", (): void => {
  const forum = {
    ...channel(),
    type: 15,
    available_tags: [
      { id: "1554332903603966043", name: "Open", moderated: true },
    ],
  };
  assert.equal(
    experiencePatchMatches(forum, {
      available_tags: [{ name: "Open", moderated: true }],
    }),
    true,
  );
  assert.equal(
    experiencePatchMatches(forum, {
      available_tags: [
        { id: "1554332903603966044", name: "Open", moderated: true },
      ],
    }),
    false,
  );
  assert.equal(experiencePatchMatches(forum, { topic: "Changed" }), false);
});

test("unrelated access or identity drift fails read-back", (): void => {
  const before = channel();
  assertExperienceAccessPreserved(
    before,
    { ...before, name: "renamed" },
    { name: "renamed" },
  );
  assert.throws((): void =>
    assertExperienceAccessPreserved(before, { ...before, type: 15 }, {}),
  );
  assert.throws((): void =>
    assertExperienceAccessPreserved(
      before,
      {
        ...before,
        permission_overwrites: [
          { id: experienceGuildId, type: 0, allow: "0", deny: "1024" },
        ],
      },
      { parent_id: "1554318429115392080" },
    ),
  );
});

test("Discord permission-entry reordering is harmless but permission changes are not", (): void => {
  const before = channel();
  before.permission_overwrites = [
    { id: experienceGuildId, type: 0, allow: "0", deny: "1024" },
    { id: "1554332903603966043", type: 0, allow: "1024", deny: "0" },
  ];
  const after = {
    ...before,
    permission_overwrites: [...before.permission_overwrites].reverse(),
  };
  assertExperienceUnchanged(before, after);
  assertExperienceAccessPreserved(before, after, { name: "renamed" });
  assert.equal(
    experiencePatchMatches(after, {
      permission_overwrites: before.permission_overwrites,
    }),
    true,
  );
  const changed = {
    ...after,
    permission_overwrites: after.permission_overwrites.map(
      (overwrite, index) =>
        index === 0 ? { ...overwrite, allow: "0" } : overwrite,
    ),
  };
  assert.throws((): void => assertExperienceUnchanged(before, changed));
  assert.throws((): void =>
    assertExperienceAccessPreserved(before, changed, {}),
  );
  assert.equal(
    experiencePatchMatches(changed, {
      permission_overwrites: before.permission_overwrites,
    }),
    false,
  );
});
