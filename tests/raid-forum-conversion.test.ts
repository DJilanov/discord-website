import "../scripts/env";
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  listingForums,
  listingGuildId,
  listingBotId,
} from "../lib/discord-listings/contracts";
import {
  raidForumChannel,
  raidForumThreadSchema,
  type RaidForumThread,
} from "../lib/raids/discord-forum";
import { raidChannelEligible } from "../lib/raids/discord-channels";
import {
  groupConversionEvent,
  listingConversionSchema,
} from "../lib/raids/listing-conversion";
import { validateEvent } from "../lib/raids/policy";
import { eventCreationHash } from "../lib/raids/event-request";
import { kfcGuildId } from "../content/kfc-community";
import { kfcRaidForumIds } from "../content/kfc-raiding";

const parent = {
  id: listingForums.Alliance.pvp,
  guild_id: listingGuildId,
  type: 15,
  name: "lfg-pvp",
  position: 1,
  parent_id: null,
  permission_overwrites: [],
  nsfw: false,
};
const thread: RaidForumThread = {
  id: "1555464828921978970",
  guild_id: listingGuildId,
  parent_id: parent.id,
  type: 11 as const,
  owner_id: listingBotId,
  name: "Test listing",
  thread_metadata: { archived: false, locked: false },
};
const guild = {
  id: listingGuildId,
  name: "Test guild",
  owner_id: listingBotId,
};
const bot = { user: { id: listingBotId, bot: true }, roles: [] };
const organizer = { user: { id: "407839813769756693", bot: false }, roles: [] };
const permissions =
  (1n << 10n) | (1n << 14n) | (1n << 15n) | (1n << 16n) | (1n << 38n);
const roles = [
  {
    id: listingGuildId,
    name: "@everyone",
    position: 0,
    permissions: permissions.toString(),
    managed: false,
    mentionable: false,
  },
];

test("Forum event permissions use the parent forum and Send Messages in Threads", () => {
  const channel = raidForumChannel(thread, parent, listingBotId);
  assert.equal(channel.id, thread.id);
  assert.equal(
    raidChannelEligible(channel, guild, roles, bot, organizer, parent),
    true,
  );
  assert.equal(
    raidChannelEligible(channel, guild, roles, bot, organizer),
    false,
  );
  assert.equal(
    raidChannelEligible(channel, guild, roles, bot, organizer, {
      ...parent,
      nsfw: true,
    }),
    false,
  );
  assert.equal(
    raidChannelEligible(
      channel,
      guild,
      [
        {
          ...roles[0],
          permissions: ((permissions & ~(1n << 38n)) | (1n << 11n)).toString(),
        },
      ],
      bot,
      organizer,
      parent,
    ),
    false,
  );
  const denied = {
    ...parent,
    permission_overwrites: [
      { id: organizer.user.id, type: 1 as const, allow: "0", deny: "1024" },
    ],
  };
  assert.equal(
    raidChannelEligible(channel, guild, roles, bot, organizer, denied),
    false,
  );
  assert.equal(
    raidChannelEligible(
      channel,
      guild,
      roles,
      bot,
      { ...organizer, pending: true },
      parent,
    ),
    false,
  );
});

test("Forum conversion rejects foreign, private, locked and non-bot-owned threads", () => {
  for (const raw of [
    { ...thread, type: 12 },
    { ...thread, guild_id: organizer.user.id },
    { ...thread, parent_id: organizer.user.id },
  ])
    assert.equal(raidForumThreadSchema.safeParse(raw).success, false);
  assert.throws(() =>
    raidForumChannel(
      { ...thread, owner_id: organizer.user.id },
      parent,
      listingBotId,
    ),
  );
  assert.throws(() =>
    raidForumChannel(
      { ...thread, thread_metadata: { archived: false, locked: true } },
      parent,
      listingBotId,
    ),
  );
  assert.throws(() =>
    raidForumChannel(thread, { ...parent, type: 0 }, listingBotId),
  );
  assert.throws(() =>
    raidForumChannel(
      thread,
      { ...parent, guild_id: organizer.user.id },
      listingBotId,
    ),
  );
  assert.doesNotThrow(() =>
    raidForumChannel(
      { ...thread, thread_metadata: { archived: true, locked: false } },
      parent,
      listingBotId,
    ),
  );
});
test("KFC forum delivery accepts only the exact two approved forums and their matching guild", (): void => {
  const valid = {
    ...thread,
    guild_id: kfcGuildId,
    parent_id: kfcRaidForumIds.forever,
  };
  assert.equal(raidForumThreadSchema.safeParse(valid).success, true);
  assert.equal(
    raidForumThreadSchema.safeParse({ ...valid, guild_id: listingGuildId })
      .success,
    false,
  );
  assert.equal(
    raidForumThreadSchema.safeParse({
      ...valid,
      parent_id: "1556000000000000999",
    }).success,
    false,
  );
  assert.equal(
    raidForumThreadSchema.safeParse({
      ...valid,
      parent_id: listingForums.Alliance.pvp,
    }).success,
    false,
  );
});

const group = {
  id: "source-public-listing",
  title: "5ft of November power leveling",
  region: "EU",
  realm: "",
  faction: "Alliance",
  gameRuleset: "PvP",
  activity: "Questing",
  description:
    "Northshire 08:30 / Goldshire 09:00. Quests and dungeons together.",
  contactDiscord: "djilanov",
  startsAt: new Date("2026-11-05T07:30:00Z"),
  status: "approved",
};
const conversion = listingConversionSchema.parse({
  groupId: group.id,
  organizerDiscordId: organizer.user.id,
  localFinish: "2026-11-05T22:30",
  capacity: 5,
  admission: "open",
  target: "Northshire / Goldshire leveling",
});

test("Conversion preserves the public schedule, ruleset and content without loot or private signups", () => {
  const event = groupConversionEvent(group, conversion);
  const dates = validateEvent(event, new Date("2026-10-08T00:00:00Z"));
  assert.equal(event.title, group.title);
  assert.equal(event.eventType, "questing");
  assert.equal(event.ruleset, "PvP");
  assert.equal(event.localStart, "2026-11-05T08:30");
  assert.equal(dates.startsAt.toISOString(), group.startsAt.toISOString());
  assert.equal(dates.endsAt.toISOString(), "2026-11-05T21:30:00.000Z");
  assert.equal(event.durationMinutes, 840);
  assert.equal(event.admission, "open");
  assert.equal(event.capacity, 5);
  assert.ok(event.description.startsWith(group.description));
  assert.ok(event.description.includes("Discord contact: djilanov"));
  assert.equal(event.catalogId, null);
  assert.equal(event.reserveLimit, 0);
  assert.deepEqual(event.hardReserves, []);
  assert.equal(
    event.requestKey,
    groupConversionEvent(group, conversion).requestKey,
  );
  assert.notEqual(
    event.requestKey,
    groupConversionEvent({ ...group, id: "another-listing" }, conversion)
      .requestKey,
  );
  assert.throws(() =>
    groupConversionEvent({ ...group, gameRuleset: "Unconfirmed" }, conversion),
  );
  assert.throws(() =>
    groupConversionEvent(
      { ...group, description: "x".repeat(3001) },
      conversion,
    ),
  );
  assert.throws(() =>
    groupConversionEvent(group, {
      ...conversion,
      localFinish: "2026-11-05T07:30",
    }),
  );
});

test("Shared creation hashing retains the original service's request format", () => {
  const event = groupConversionEvent(group, conversion);
  const {
    eventType,
    game,
    realm,
    discordChannelId,
    confirmDiscordPublication,
    leaderName,
    assistantName,
    ...legacy
  } = event;
  assert.equal(leaderName, "");
  assert.equal(assistantName, "");
  const oldInput = {
    ...legacy,
    ...(eventType !== "raid" ? { eventType } : {}),
    ...(game !== "forever" ? { game, realm } : {}),
    ...(discordChannelId !== null ? { discordChannelId } : {}),
    ...(confirmDiscordPublication ? { confirmDiscordPublication } : {}),
  };
  assert.equal(
    eventCreationHash(event),
    createHash("sha256").update(JSON.stringify(oldInput)).digest("hex"),
  );
});
