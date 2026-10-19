import "../scripts/env";
import { test } from "node:test";
import assert from "node:assert/strict";
import { auditChannelSchema } from "../lib/discord-audit";
import {
  discoverRaidChannels,
  canManageRaidChannels,
  pilotPrivateChannel,
  raidChannelEligible,
  raidChannelRequest,
  resolveRaidDestination,
} from "../lib/raids/discord-channels";
import {
  raidDestinationForPost,
  raidDiscordDestination,
} from "../lib/raids/discord-settings";
import { raidsEnabled, raidAccountAllowed } from "../lib/raids/config";

const guildId = "1556000000000000010",
  botId = "1556000000000000012",
  organizerId = "1556000000000000013";
const guild = { id: guildId, name: "Feedback server", owner_id: organizerId };
const channel = {
  id: "1556000000000000014",
  guild_id: guildId,
  name: "raid-feedback",
  type: 0,
  parent_id: null,
  position: 1,
  permission_overwrites: [],
};
const required = (
  (1n << 10n) |
  (1n << 11n) |
  (1n << 14n) |
  (1n << 15n) |
  (1n << 16n)
).toString();
const roles = [
  {
    id: guildId,
    name: "@everyone",
    position: 0,
    permissions: required,
    managed: false,
    mentionable: false,
  },
];
const bot = { user: { id: botId, bot: true }, roles: [] };
const organizer = { user: { id: organizerId, bot: false }, roles: [] };

test("Member beta has a confirmed public default without granting members channel-selection privileges", async () => {
  const values = {
    FOREVER_RAIDS_ENABLED: "true",
    FOREVER_RAIDS_ACCESS_MODE: "members",
    FOREVER_RAIDS_PILOT_DISCORD_IDS: "",
    FOREVER_RAIDS_DISCORD_ENABLED: "true",
    DISCORD_GUILD_ID: guildId,
    DISCORD_APPLICATION_ID: botId,
    DISCORD_BOT_TOKEN: "synthetic-test-only",
    FOREVER_RAIDS_PUBLIC_ORIGIN: "http://127.0.0.1:19300",
    FOREVER_RAIDS_DISCORD_CHANNEL_ID: "1556000000000000011",
    FOREVER_RAIDS_BETA_DISCORD_CHANNEL_ID: channel.id,
    FOREVER_RAIDS_DISCORD_DESTINATIONS: "[]",
    FOREVER_RAIDS_DISCORD_FEEDBACK_GUILD_IDS: "",
  };
  const previous = new Map(
    Object.keys(values).map((key) => [key, process.env[key]]),
  );
  Object.assign(process.env, values);
  const memberGuild = { ...guild, owner_id: botId };
  async function request(route: string): Promise<unknown> {
    const fixtures: Record<string, unknown> = {
      [`/guilds/${guildId}`]: memberGuild,
      [`/guilds/${guildId}/roles`]: roles,
      [`/guilds/${guildId}/members/${botId}`]: bot,
      [`/guilds/${guildId}/members/${organizerId}`]: organizer,
      [`/guilds/${guildId}/channels`]: [channel],
    };
    assert.ok(route in fixtures);
    return fixtures[route];
  }
  try {
    assert.equal(raidsEnabled(), true);
    assert.equal(raidAccountAllowed(organizerId), true);
    assert.equal(raidAccountAllowed("invalid"), false);
    assert.equal(raidDiscordDestination(null)?.visibility, "community");
    await assert.rejects(
      resolveRaidDestination(null, organizerId, false, request),
      /Confirm/,
    );
    assert.equal(
      (await resolveRaidDestination(null, organizerId, true, request))
        ?.channelId,
      channel.id,
    );
    await assert.rejects(
      resolveRaidDestination(
        values.FOREVER_RAIDS_DISCORD_CHANNEL_ID,
        organizerId,
        false,
        request,
      ),
      /administrators/,
    );
    await assert.rejects(
      discoverRaidChannels(organizerId, request),
      /administrators/,
    );
    await assert.rejects(
      resolveRaidDestination(null, organizerId, true, async (route) => {
        if (route.endsWith("/channels"))
          return [
            {
              ...channel,
              permission_overwrites: [
                { id: organizerId, type: 1, allow: "0", deny: "1024" },
              ],
            },
          ];
        return request(route);
      }),
      /permission/,
    );
    process.env.FOREVER_RAIDS_ACCESS_MODE = "typo";
    assert.equal(raidsEnabled(), false);
    process.env.FOREVER_RAIDS_ACCESS_MODE = "pilot";
    assert.equal(raidsEnabled(), false);
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("Channel eligibility respects effective permissions, channel types and member restrictions", () => {
  assert.equal(
    raidChannelEligible(channel, guild, roles, bot, organizer),
    true,
  );
  for (const type of [2, 4, 10, 11, 12, 15, 16])
    assert.equal(
      raidChannelEligible({ ...channel, type }, guild, roles, bot, organizer),
      false,
    );
  assert.equal(
    raidChannelEligible({ ...channel, type: 5 }, guild, roles, bot, organizer),
    true,
  );
  assert.equal(
    raidChannelEligible(
      { ...channel, nsfw: true },
      guild,
      roles,
      bot,
      organizer,
    ),
    false,
  );
  assert.equal(
    raidChannelEligible(
      { ...channel, guild_id: botId },
      guild,
      roles,
      bot,
      organizer,
    ),
    false,
  );
  const denied = {
    ...channel,
    permission_overwrites: [
      { id: botId, type: 1 as const, deny: "2048", allow: "0" },
    ],
  };
  assert.equal(
    raidChannelEligible(denied, guild, roles, bot, organizer),
    false,
  );
  for (const bit of [10n, 11n, 14n, 15n, 16n])
    assert.equal(
      raidChannelEligible(
        channel,
        guild,
        [
          {
            ...roles[0],
            permissions: (BigInt(required) & ~(1n << bit)).toString(),
          },
        ],
        bot,
        organizer,
      ),
      false,
    );
  const otherGuild = { ...guild, owner_id: botId };
  assert.equal(
    raidChannelEligible(
      {
        ...channel,
        permission_overwrites: [
          { id: organizerId, type: 1, allow: "0", deny: "1024" },
        ],
      },
      otherGuild,
      roles,
      bot,
      organizer,
    ),
    false,
  );
  assert.equal(
    raidChannelEligible(channel, guild, roles, bot, {
      ...organizer,
      pending: true,
    }),
    false,
  );
  assert.equal(
    raidChannelEligible(channel, guild, roles, bot, {
      ...organizer,
      communication_disabled_until: "2099-01-01T00:00:00Z",
    }),
    false,
  );
  assert.equal(
    raidChannelEligible(
      channel,
      guild,
      roles,
      { ...bot, user: { id: botId, bot: false } },
      organizer,
    ),
    false,
  );
  assert.equal(
    auditChannelSchema.safeParse({ ...channel, flags: 1 << 17 }).success,
    false,
  );
  const adminRole = {
    ...roles[0],
    id: "1556000000000000015",
    permissions: "8",
  };
  assert.equal(
    raidChannelEligible(
      denied,
      guild,
      [...roles, adminRole],
      { ...bot, roles: [adminRole.id] },
      organizer,
    ),
    true,
  );
});

test("Discovery lists only eligible channels, confirms community publication and never exposes credentials", async () => {
  const values = {
    FOREVER_RAIDS_ENABLED: "true",
    FOREVER_RAIDS_PILOT_DISCORD_IDS: organizerId,
    FOREVER_RAIDS_DISCORD_ENABLED: "true",
    DISCORD_GUILD_ID: guildId,
    DISCORD_APPLICATION_ID: botId,
    DISCORD_BOT_TOKEN: "synthetic-test-only",
    FOREVER_RAIDS_PUBLIC_ORIGIN: "http://127.0.0.1:19300",
    FOREVER_RAIDS_DISCORD_CHANNEL_ID: "1556000000000000011",
    FOREVER_RAIDS_DISCORD_DESTINATIONS: "[]",
    FOREVER_RAIDS_DISCORD_FEEDBACK_GUILD_IDS: "",
  };
  const previous = new Map(
    Object.keys(values).map((key) => [key, process.env[key]]),
  );
  Object.assign(process.env, values);
  const privateChannel = {
    ...channel,
    id: values.FOREVER_RAIDS_DISCORD_CHANNEL_ID,
    name: "pilot",
    permission_overwrites: [
      { id: guildId, type: 0 as const, deny: "1024", allow: "0" },
      { id: botId, type: 1 as const, deny: "0", allow: "1024" },
      { id: organizerId, type: 1 as const, deny: "0", allow: "1024" },
    ],
  };
  const requests: string[] = [];
  async function request(route: string): Promise<unknown> {
    requests.push(route);
    const fixtures: Record<string, unknown> = {
      [`/guilds/${guildId}`]: guild,
      [`/guilds/${guildId}/roles`]: roles,
      [`/guilds/${guildId}/members/${botId}`]: bot,
      [`/guilds/${guildId}/members/${organizerId}`]: organizer,
      [`/guilds/${guildId}/channels`]: [
        channel,
        privateChannel,
        { ...channel, id: "1556000000000000099", type: 15 },
      ],
    };
    assert.ok(route in fixtures);
    return fixtures[route];
  }
  try {
    const result = await discoverRaidChannels(organizerId, request);
    assert.equal(result.warnings.length, 0);
    assert.deepEqual(
      result.channels.map((entry) => entry.visibility),
      ["private", "community"],
    );
    assert.equal(
      JSON.stringify(result).includes(values.DISCORD_BOT_TOKEN),
      false,
    );
    assert.equal(pilotPrivateChannel(privateChannel, guildId, botId), true);
    assert.equal(pilotPrivateChannel(channel, guildId, botId), false);
    assert.equal(
      pilotPrivateChannel(
        {
          ...privateChannel,
          permission_overwrites: [
            ...privateChannel.permission_overwrites,
            { id: "1556000000000000015", type: 0, deny: "0", allow: "1024" },
          ],
        },
        guildId,
        botId,
      ),
      false,
    );
    requests.length = 0;
    await assert.rejects(
      resolveRaidDestination(channel.id, organizerId, false, request),
      /Confirm/,
    );
    assert.equal(requests.length, 0);
    const resolved = await resolveRaidDestination(
      channel.id,
      organizerId,
      true,
      request,
    );
    assert.equal(resolved?.visibility, "community");
    assert.equal(resolved?.guildId, guildId);
    await assert.rejects(
      resolveRaidDestination("1556000000000000099", organizerId, true, request),
      /unavailable/,
    );
    assert.equal(
      raidDestinationForPost({ ...resolved!, confirmedAt: null }),
      null,
    );
    assert.ok(
      raidDestinationForPost({ ...resolved!, confirmedAt: new Date() }),
    );
    assert.equal(
      raidDestinationForPost({
        ...resolved!,
        confirmedAt: new Date(),
        guildId: "1556000000000000099",
      }),
      null,
    );
    await assert.rejects(
      raidChannelRequest(organizerId)("/guilds/1556000000000000099/channels"),
      /out_of_scope/,
    );
    await assert.rejects(
      discoverRaidChannels(organizerId, async () => {
        throw new Error("Discord unavailable");
      }),
      /administrator permissions could not be verified/,
    );
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("Channel overrides require the community server owner or a current Administrator role", async () => {
  const values = {
    FOREVER_RAIDS_ENABLED: "true",
    FOREVER_RAIDS_PILOT_DISCORD_IDS: organizerId,
    FOREVER_RAIDS_DISCORD_ENABLED: "true",
    DISCORD_GUILD_ID: guildId,
    DISCORD_APPLICATION_ID: botId,
    DISCORD_BOT_TOKEN: "synthetic-test-only",
    FOREVER_RAIDS_PUBLIC_ORIGIN: "http://127.0.0.1:19300",
    FOREVER_RAIDS_DISCORD_CHANNEL_ID: "1556000000000000011",
    FOREVER_RAIDS_DISCORD_DESTINATIONS: "[]",
    FOREVER_RAIDS_DISCORD_FEEDBACK_GUILD_IDS: "",
  };
  const previous = new Map(
    Object.keys(values).map((key) => [key, process.env[key]]),
  );
  Object.assign(process.env, values);
  let currentGuild = { ...guild, owner_id: botId };
  let currentMember = { ...organizer, roles: [] as string[], pending: false };
  let permission = "16";
  const adminRoleId = "1556000000000000015";
  async function request(route: string): Promise<unknown> {
    if (route === `/guilds/${guildId}`) return currentGuild;
    if (route === `/guilds/${guildId}/members/${organizerId}`)
      return currentMember;
    if (route === `/guilds/${guildId}/roles`)
      return [
        ...roles,
        { ...roles[0], id: adminRoleId, permissions: permission },
      ];
    throw new Error(
      "Ordinary members must not receive channel discovery data.",
    );
  }
  try {
    assert.equal(await canManageRaidChannels(organizerId, request), false);
    currentMember = { ...currentMember, roles: [adminRoleId] };
    assert.equal(
      await canManageRaidChannels(organizerId, request),
      false,
      "Manage Channels is not Administrator",
    );
    await assert.rejects(
      discoverRaidChannels(organizerId, request),
      /Only Discord server administrators/,
    );
    await assert.rejects(
      resolveRaidDestination(
        values.FOREVER_RAIDS_DISCORD_CHANNEL_ID,
        organizerId,
        false,
        request,
      ),
      /Only Discord server administrators/,
    );
    await assert.rejects(
      resolveRaidDestination(channel.id, organizerId, true, request),
      /Only Discord server administrators/,
    );
    const destination = await resolveRaidDestination(
      null,
      organizerId,
      false,
      async () => {
        throw new Error(
          "Default routing must not depend on override permission checks",
        );
      },
    );
    assert.equal(
      destination?.channelId,
      values.FOREVER_RAIDS_DISCORD_CHANNEL_ID,
    );
    permission = "8";
    assert.equal(await canManageRaidChannels(organizerId, request), true);
    assert.equal(
      (
        await resolveRaidDestination(
          values.FOREVER_RAIDS_DISCORD_CHANNEL_ID,
          organizerId,
          false,
          request,
        )
      )?.channelId,
      values.FOREVER_RAIDS_DISCORD_CHANNEL_ID,
    );
    permission = "0";
    assert.equal(
      await canManageRaidChannels(organizerId, request),
      false,
      "Revoked roles cannot reuse stale UI permission",
    );
    currentGuild = { ...guild };
    assert.equal(await canManageRaidChannels(organizerId, request), true);
    currentMember = { ...currentMember, pending: true };
    assert.equal(await canManageRaidChannels(organizerId, request), false);
    await assert.rejects(
      canManageRaidChannels(organizerId, async () => ({ ...guild, id: botId })),
      /could not be verified/,
    );
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
