import assert from "node:assert/strict";
import { test } from "node:test";
import {
  experienceApplicationId,
  experienceGuildId,
} from "../content/discord-channel-experience";
import {
  tradingBanId,
  tradingModeratorId,
  tradingNames,
  tradeTagNames,
  tradingGuide,
  type TradingIds,
} from "../content/discord-trading";
import { type DiscordAuditSnapshot } from "../lib/discord-audit";
import {
  tradingForumPayload,
  assertTradingForum,
  tradingOnboarding,
  assertTradingOnboarding,
  prepareTradingForum,
  sameTradingChannel,
} from "../lib/discord-trading";
import {
  experienceChannelSchema,
  type ExperiencePatch,
} from "../lib/discord-channel-experience";
import { groupOnboardingSchema } from "../lib/discord-group-channels";
import { discordChannelRequest } from "../lib/discord-channel-request";
const ids: TradingIds = {
  alliance: "1555101000000000011",
  horde: "1555101000000000012",
  auction: "1555101000000000013",
};
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
        id: tradingBanId,
        name: "BAN",
        permissions: "0",
        position: 1,
        managed: false,
        mentionable: false,
      },
      {
        id: tradingModeratorId,
        name: "Moderator",
        permissions: "0",
        position: 2,
        managed: false,
        mentionable: false,
      },
      {
        id: "1554332903603966043",
        name: "Ordinary class",
        permissions: "0",
        position: 3,
        managed: false,
        mentionable: false,
      },
    ],
    botRoleIds: [],
    channels: [],
    onboarding: { status: "unavailable", httpStatus: 403 },
  };
}
test("trade forums and bot-started Auction House have exact scopes, stable tags and restricted-role protection", (): void => {
  const before = snapshot(),
    original = structuredClone(before);
  for (const key of ["alliance", "horde", "auction"] as const) {
    const payload = tradingForumPayload(before, key);
    const forum = experienceChannelSchema.parse({
      id: ids[key],
      guild_id: experienceGuildId,
      position: 1,
      ...payload,
      available_tags: (
        payload.available_tags as { name: string; moderated: boolean }[]
      ).map((tag, index) => ({
        ...tag,
        id: String(1555101000000000100n + BigInt(index)),
      })),
    });
    assertTradingForum(before, forum, key);
    assert.ok(
      sameTradingChannel(forum, {
        ...forum,
        position: 99,
        permission_overwrites: [...forum.permission_overwrites].reverse(),
      }),
    );
    const altered = structuredClone(forum);
    altered.permission_overwrites[0].deny = "0";
    assert.equal(sameTradingChannel(forum, altered), false);
    assert.equal(forum.name, tradingNames[key]);
    assert.equal(forum.default_sort_order, 1);
    assert.ok((forum.available_tags?.length ?? 0) <= 20);
    const modified = structuredClone(forum);
    modified.permission_overwrites = modified.permission_overwrites.filter(
      (x) => x.id !== tradingBanId,
    );
    assert.throws(() => assertTradingForum(before, modified, key));
  }
  assert.deepEqual(before, original);
  assert.equal(new Set(tradeTagNames).size, tradeTagNames.length);
});
test("guides fit Discord and describe limitations without invented offers", (): void => {
  for (const key of ["alliance", "horde", "auction"] as const)
    assert.ok(tradingGuide(key).length <= 2000);
  assert.match(tradingGuide("auction"), /Open source contributors/);
  assert.doesNotMatch(tradingGuide("auction"), /KFC team/);
  assert.match(tradingGuide("alliance"), /Region \/ character ruleset/);
  assert.doesNotMatch(tradingGuide("alliance"), /Region \/ realm:/);
});
test("forum setup saves tags before requiring them and recovers only an approved forum", async (): Promise<void> => {
  const before = snapshot();
  const payload = tradingForumPayload(before, "alliance");
  const forum = experienceChannelSchema.parse({
    ...payload,
    id: ids.alliance,
    guild_id: experienceGuildId,
    position: 1,
    flags: 0,
    available_tags: [],
  });
  const writes: ExperiencePatch[] = [];
  const configured = await prepareTradingForum(
    before,
    forum,
    "alliance",
    async (original, patch) => {
      writes.push(patch);
      assert.ok(!(patch.flags && !original.available_tags?.length));
      return experienceChannelSchema.parse({
        ...original,
        ...patch,
        available_tags: patch.available_tags
          ? (
              patch.available_tags as { name: string; moderated: boolean }[]
            ).map((tag, index) => ({
              ...tag,
              id: String(1555101000000000100n + BigInt(index)),
            }))
          : original.available_tags,
      });
    },
  );
  assert.equal(writes.length, 2);
  assert.equal(writes[0].flags, undefined);
  assert.equal(writes[1].flags, 16);
  assertTradingForum(before, configured, "alliance");
  await assert.rejects(
    prepareTradingForum(
      before,
      { ...forum, name: "other-forum" },
      "alliance",
      async () => {
        throw new Error("Should not write");
      },
    ),
    /changed scope/,
  );
});
test("optional trading onboarding preserves existing role mappings and intentional BOT trap", (): void => {
  const before = groupOnboardingSchema.parse({
    guild_id: experienceGuildId,
    enabled: true,
    mode: 1,
    default_channel_ids: ["1554319918714060840"],
    prompts: [
      {
        id: "1554617788549697598",
        title: "Faction",
        type: 0,
        required: true,
        single_select: false,
        in_onboarding: true,
        options: [
          {
            id: "1554617788549697601",
            title: "BOT",
            channel_ids: [],
            role_ids: [tradingBanId],
          },
        ],
      },
    ],
  });
  const original = structuredClone(before),
    after = tradingOnboarding(before, ids);
  assert.deepEqual(before, original);
  assert.deepEqual(after.prompts[0], before.prompts[0]);
  assert.deepEqual(after.default_channel_ids, before.default_channel_ids);
  assert.equal(after.prompts[1].required, false);
  assert.equal(after.prompts[1].in_onboarding, false);
  assert.deepEqual(tradingOnboarding(after, ids), after);
  const persisted = structuredClone(after);
  persisted.prompts[1].id = "1555209000000000011";
  persisted.prompts[1].options.forEach((option, index): void => {
    option.id = String(1555209000000000020n + BigInt(index));
    option.channel_ids.reverse();
  });
  assertTradingOnboarding(before, persisted, ids);
  persisted.prompts[0].options[0].role_ids = [];
  assert.throws(
    () => assertTradingOnboarding(before, persisted, ids),
    /preservation/,
  );
});
test("archive inventory remains GET-only and never bypasses the approved application scope", async (): Promise<void> => {
  const credentials = {
      applicationId: experienceApplicationId,
      guildId: experienceGuildId,
      token: "test-bot-token",
    },
    route = `/channels/${ids.alliance}/threads/archived/private?limit=100`;
  const transport: typeof fetch = async (): Promise<Response> =>
    Response.json({ threads: [], has_more: false });
  await discordChannelRequest(credentials, route, "GET", undefined, {
    reason: "Test history inventory",
    transport,
  });
  await assert.rejects(
    discordChannelRequest(
      { ...credentials, applicationId: "1555101000000000014" },
      route,
      "GET",
      undefined,
      { reason: "Test", transport },
    ),
    /restricted/,
  );
  await assert.rejects(
    discordChannelRequest(
      credentials,
      route,
      "POST",
      {},
      { reason: "Test", transport },
    ),
    /Unexpected/,
  );
});
