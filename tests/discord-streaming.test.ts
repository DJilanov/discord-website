import assert from "node:assert/strict";
import { test } from "node:test";
import {
  experienceApplicationId,
  experienceGuildId,
} from "../content/discord-channel-experience";
import {
  streamcordRoleId,
  streamersChannelId,
  streamingBanRoleId,
  streamingChannels,
  streamingGuide,
  streamingModeratorId,
  streamingParentId,
  streamingPromptTitle,
  type StreamingChannelIds,
} from "../content/discord-streaming";
import {
  channelPermissions,
  guildPermissions,
  hasDiscordPermission,
  type DiscordAuditSnapshot,
} from "../lib/discord-audit";
import {
  groupOnboardingSchema,
  type GroupOnboarding,
} from "../lib/discord-group-channels";
import {
  assertStreamingChannel,
  assertStreamingOnboarding,
  streamingChannelPayload,
  streamingChannelSchema,
  streamingOnboarding,
  type StreamingChannel,
} from "../lib/discord-streaming";

const ids: StreamingChannelIds = {
  alerts: "1555101000000000001",
  voice: "1555101000000000002",
};
const ordinaryRoleId = "1554332903603966043";

function snapshot(): DiscordAuditSnapshot {
  return {
    capturedAt: "2026-10-01T00:00:00Z",
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
        permissions: "0",
        position: 0,
        managed: false,
        mentionable: false,
      },
      {
        id: ordinaryRoleId,
        name: "Rogue",
        permissions: "0",
        position: 1,
        managed: false,
        mentionable: false,
      },
      {
        id: streamingModeratorId,
        name: "Moderator",
        permissions: "0",
        position: 2,
        managed: false,
        mentionable: false,
      },
      {
        id: streamcordRoleId,
        name: "Streamcord",
        permissions: "0",
        position: 3,
        managed: true,
        mentionable: false,
      },
      {
        id: streamingBanRoleId,
        name: "BAN",
        permissions: "0",
        position: 4,
        managed: false,
        mentionable: false,
      },
      {
        id: "1554525480013660250",
        name: "Rogue",
        permissions: "8",
        position: 5,
        managed: false,
        mentionable: false,
      },
    ],
    botRoleIds: [],
    channels: [],
    onboarding: { status: "unavailable", httpStatus: 403 },
  };
}

function channel(key: "alerts" | "voice"): StreamingChannel {
  return streamingChannelSchema.parse({
    id: ids[key],
    guild_id: experienceGuildId,
    position: 1,
    ...streamingChannelPayload(snapshot(), key),
  });
}

function onboarding(): GroupOnboarding {
  return groupOnboardingSchema.parse({
    guild_id: experienceGuildId,
    enabled: true,
    mode: 1,
    default_channel_ids: ["1554319918714060840"],
    prompts: [
      {
        id: "1554617788549697598",
        type: 0,
        title: "Faction",
        required: true,
        single_select: false,
        in_onboarding: true,
        options: [
          {
            id: "1554617788549697601",
            title: "BOT",
            description: "Intentional trap",
            channel_ids: [],
            role_ids: [streamingBanRoleId],
            emoji: {
              id: "1554351470059716698",
              name: "Pepe_noob",
              animated: false,
            },
          },
        ],
      },
    ],
  });
}

function permissions(
  s: DiscordAuditSnapshot,
  c: StreamingChannel,
  roles: string[] = [],
): bigint {
  return channelPermissions(
    guildPermissions(s.roles, s.guild.id, roles),
    c,
    s.guild.id,
    roles,
  );
}

test("only the two approved channels are configured without changing role definitions", (): void => {
  const s = snapshot();
  const original = structuredClone(s);
  for (const definition of streamingChannels) {
    const payload = streamingChannelPayload(s, definition.key);
    assert.equal(payload.parent_id, streamingParentId);
    assert.equal(payload.nsfw, false);
    assertStreamingChannel(s, channel(definition.key), definition.key);
  }
  assert.deepEqual(s, original);
  assert.equal(streamingChannels.length, 2);
  assert.equal(
    streamingChannels.find((item): boolean => item.key === "alerts")?.pinGuide,
    true,
  );
  assert.equal(
    streamingChannels.find((item): boolean => item.key === "voice")?.pinGuide,
    false,
  );
  assert.equal(streamingChannelPayload(s, "voice").topic, undefined);
  assert.equal(streamingChannelPayload(s, "voice").bitrate, 64000);
  assert.equal(streamingChannelPayload(s, "voice").user_limit, 0);
  assert.throws((): void => {
    const wrong = snapshot();
    wrong.guild.id = "1555101000000000003";
    streamingChannelPayload(wrong, "voice");
  });
  assert.throws((): void => {
    const missing = snapshot();
    missing.roles = missing.roles.filter(
      (role): boolean => role.id !== streamcordRoleId,
    );
    streamingChannelPayload(missing, "alerts");
  });
});

test("members can connect, speak, use video and chat without management or mass mentions", (): void => {
  for (const roles of [[], [ordinaryRoleId]]) {
    const p = permissions(snapshot(), channel("voice"), roles);
    for (const bit of [9, 10, 11, 16, 20, 21, 25])
      assert.ok(hasDiscordPermission(p, 1n << BigInt(bit)));
    for (const bit of [1, 2, 3, 4, 5, 13, 17, 22, 23, 24, 28, 29, 34, 40])
      assert.equal(hasDiscordPermission(p, 1n << BigInt(bit)), false);
  }
});

test("alert feed is read-only for regular roles, with posting access for Streamcord and moderators", (): void => {
  const s = snapshot();
  const c = channel("alerts");
  for (const roles of [[], [ordinaryRoleId]]) {
    const p = permissions(s, c, roles);
    for (const bit of [10, 16])
      assert.ok(hasDiscordPermission(p, 1n << BigInt(bit)));
    for (const bit of [11, 17, 35, 36, 38, 46])
      assert.equal(hasDiscordPermission(p, 1n << BigInt(bit)), false);
  }
  const sender = permissions(s, c, [streamcordRoleId]);
  for (const bit of [10, 11, 14, 15, 16])
    assert.ok(hasDiscordPermission(sender, 1n << BigInt(bit)));
  assert.equal(hasDiscordPermission(sender, 1n << 17n), false);
  assert.ok(
    hasDiscordPermission(permissions(s, c, [streamingModeratorId]), 1n << 13n),
  );
  const moderator = permissions(s, channel("voice"), [streamingModeratorId]);
  for (const bit of [22, 23, 24])
    assert.ok(hasDiscordPermission(moderator, 1n << BigInt(bit)));
  for (const bit of [3, 4, 5, 28, 29])
    assert.equal(hasDiscordPermission(moderator, 1n << BigInt(bit)), false);
});

test("BAN restrictions survive normal class role combinations in both channels", (): void => {
  for (const key of ["alerts", "voice"] as const) {
    const p = permissions(snapshot(), channel(key), [
      streamingBanRoleId,
      ordinaryRoleId,
    ]);
    for (const bit of [9, 10, 11, 16, 20, 21, 25, 35, 36, 38, 46])
      assert.equal(hasDiscordPermission(p, 1n << BigInt(bit)), false);
  }
});

test("read-back catches missing video, wrong server, writable feeds and altered voice settings", (): void => {
  const s = snapshot();
  const broken = channel("voice");
  broken.permission_overwrites[0].allow = (
    BigInt(broken.permission_overwrites[0].allow) & ~(1n << 9n)
  ).toString();
  assert.throws((): void => assertStreamingChannel(s, broken, "voice"));
  assert.throws((): void =>
    assertStreamingChannel(s, { ...channel("voice"), user_limit: 1 }, "voice"),
  );
  assert.throws((): void =>
    assertStreamingChannel(
      s,
      { ...channel("voice"), guild_id: "1555101000000000003" },
      "voice",
    ),
  );
  const writable = channel("alerts");
  writable.permission_overwrites[0].allow = (1n << 11n).toString();
  assert.throws((): void => assertStreamingChannel(s, writable, "alerts"));
});

test("streaming onboarding is optional, post-join, role-free and preserves existing questions", (): void => {
  const before = onboarding();
  const unchanged = structuredClone(before);
  const after = streamingOnboarding(before, ids);
  assert.deepEqual(before, unchanged);
  assert.deepEqual(after.default_channel_ids, before.default_channel_ids);
  assert.deepEqual(after.prompts[0], before.prompts[0]);
  const question = after.prompts[1];
  assert.equal(question.required, false);
  assert.equal(question.in_onboarding, false);
  assert.equal(question.single_select, false);
  assert.deepEqual(
    question.options.map((option): string[] => option.role_ids),
    [[], []],
  );
  assert.deepEqual(question.options[0].channel_ids, [
    streamersChannelId,
    ids.alerts,
  ]);
  assert.deepEqual(question.options[1].channel_ids, [ids.voice]);
  assert.deepEqual(streamingOnboarding(after, ids), after);
  assertStreamingOnboarding(before, after, ids);
});

test("read-back accepts Discord-assigned new IDs and empty emoji defaults", (): void => {
  const before = onboarding();
  const after = streamingOnboarding(before, ids);
  after.prompts[1].id = "1555101000000000003";
  after.prompts[1].options.forEach((option, index): void => {
    option.id = `155510100000000000${index + 4}`;
    option.emoji = { id: null, name: null, animated: false };
  });
  assertStreamingOnboarding(before, after, ids);
  assert.deepEqual(streamingOnboarding(after, ids), after);
});

test("onboarding rejects edited streaming choices, missing routing and changes to protected BOT defaults", (): void => {
  const before = onboarding();
  const after = streamingOnboarding(before, ids);
  const edited = structuredClone(after);
  edited.prompts[1].required = true;
  assert.throws((): void => {
    streamingOnboarding(edited, ids);
  });
  const routed = structuredClone(after);
  routed.prompts[1].options[0].channel_ids = [];
  assert.throws((): void => assertStreamingOnboarding(before, routed, ids));
  const botChanged = structuredClone(after);
  botChanged.prompts[0].options[0].role_ids = [];
  assert.throws((): void => assertStreamingOnboarding(before, botChanged, ids));
  const defaultsChanged = structuredClone(after);
  defaultsChanged.default_channel_ids.push(ids.voice);
  assert.throws((): void =>
    assertStreamingOnboarding(before, defaultsChanged, ids),
  );
  assert.throws((): void => assertStreamingOnboarding(before, before, ids));
  const duplicate = structuredClone(after);
  duplicate.prompts.push(structuredClone(duplicate.prompts[1]));
  assert.throws((): void => {
    streamingOnboarding(duplicate, ids);
  });
  const collision = structuredClone(before);
  collision.prompts[0].id = ids.voice;
  assert.throws((): void => {
    streamingOnboarding(collision, ids);
  });
  assert.equal(after.prompts[1].title, streamingPromptTitle);
});

test("guides are bounded, neutral, honest about pending alerts and prohibit silent broadcasting", (): void => {
  for (const key of ["alerts", "voice"] as const) {
    const text = streamingGuide(key, ids);
    assert.ok(text.length <= 2000);
    assert.doesNotMatch(
      text,
      /KFC team|automatic recording|official Blizzard/i,
    );
    assert.match(text, /separate|separately/);
  }
  assert.match(streamingGuide("alerts", ids), /still need to be configured/);
  assert.match(streamingGuide("alerts", ids), /rolling 24 hours/);
  assert.match(streamingGuide("voice", ids), /obtain their permission/);
  assert.match(streamingGuide("voice", ids), /not recorded/);
});
