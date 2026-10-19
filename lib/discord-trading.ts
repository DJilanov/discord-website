import { isDeepStrictEqual } from "node:util";
import {
  tradingBanId,
  tradingModeratorId,
  tradingParentId,
  tradingNames,
  tradingGuidelines,
  tradeTagNames,
  auctionTagNames,
  tradingRulesId,
  tradingPromptTitle,
  type TradingKey,
  type TradingIds,
} from "../content/discord-trading";
import {
  experienceApplicationId,
  experienceGuildId,
} from "../content/discord-channel-experience";
import {
  channelPermissions,
  guildPermissions,
  type DiscordAuditSnapshot,
} from "./discord-audit";
import { DiscordAuditError } from "./discord-audit-client";
import {
  experiencePatchMatches,
  type ExperienceChannel,
  type ExperiencePatch,
} from "./discord-channel-experience";
import {
  sameGroupOnboarding,
  type GroupOnboarding,
} from "./discord-group-channels";

const bits = (...values: number[]): bigint =>
  values.reduce((mask, bit) => mask | (1n << BigInt(bit)), 0n);
const read = bits(10, 16),
  post = bits(11, 35, 36, 38),
  mention = bits(17);

export function sameTradingChannel(
  left: ExperienceChannel,
  right: ExperienceChannel,
): boolean {
  const normalized = (channel: ExperienceChannel): ExperienceChannel => ({
    ...channel,
    position: 0,
    permission_overwrites: [...channel.permission_overwrites].sort(
      (a, b) => a.type - b.type || a.id.localeCompare(b.id),
    ),
  });
  return isDeepStrictEqual(normalized(left), normalized(right));
}

export async function prepareTradingForum(
  snapshot: DiscordAuditSnapshot,
  forum: ExperienceChannel,
  key: TradingKey,
  edit: (
    original: ExperienceChannel,
    patch: ExperiencePatch,
  ) => Promise<ExperienceChannel>,
): Promise<ExperienceChannel> {
  if (
    forum.guild_id !== experienceGuildId ||
    forum.type !== 15 ||
    forum.parent_id !== tradingParentId ||
    forum.name !== tradingNames[key]
  )
    throw new DiscordAuditError("Recorded replacement forum changed scope.");
  const payload = tradingForumPayload(snapshot, key);
  delete payload.type;
  delete payload.nsfw;
  // Discord validates REQUIRE_TAG against already persisted non-moderated tags.
  const first = { ...payload };
  delete first.flags;
  const configured = await edit(forum, first);
  const required = await edit(configured, {
    flags: (configured.flags ?? 0) | 16,
  });
  assertTradingForum(snapshot, required, key);
  return required;
}

export function tradingForumPayload(
  snapshot: DiscordAuditSnapshot,
  key: TradingKey,
): Record<string, unknown> {
  if (
    snapshot.guild.id !== experienceGuildId ||
    snapshot.bot.id !== experienceApplicationId
  )
    throw new DiscordAuditError(
      "Trading changes are restricted to the approved Forever server and bot.",
    );
  for (const id of [tradingBanId, tradingModeratorId])
    if (!snapshot.roles.some((role): boolean => role.id === id))
      throw new DiscordAuditError(
        "Required trading moderation roles are missing.",
      );
  return {
    name: tradingNames[key],
    type: 15,
    parent_id: tradingParentId,
    nsfw: false,
    topic: tradingGuidelines(key),
    flags: 16,
    available_tags: (key === "auction" ? auctionTagNames : tradeTagNames).map(
      (name) => ({ name, moderated: false }),
    ),
    default_forum_layout: 1,
    default_sort_order: 1,
    default_auto_archive_duration: 10080,
    rate_limit_per_user: key === "auction" ? 0 : 120,
    default_thread_rate_limit_per_user: 5,
    permission_overwrites: [
      {
        id: experienceGuildId,
        type: 0,
        allow: (
          read |
          bits(38) |
          (key === "auction" ? 0n : bits(11))
        ).toString(),
        deny: (
          mention | (key === "auction" ? bits(11, 35, 36) : 0n)
        ).toString(),
      },
      {
        id: tradingModeratorId,
        type: 0,
        allow: (read | post | bits(13, 34)).toString(),
        deny: mention.toString(),
      },
      { id: tradingBanId, type: 0, allow: "0", deny: (read | post).toString() },
      {
        id: snapshot.bot.id,
        type: 1,
        allow: (read | post | bits(4, 13, 34)).toString(),
        deny: mention.toString(),
      },
    ],
  };
}

export function assertTradingForum(
  snapshot: DiscordAuditSnapshot,
  forum: ExperienceChannel,
  key: TradingKey,
): void {
  const { type, ...expected } = tradingForumPayload(snapshot, key);
  if (
    forum.type !== type ||
    forum.guild_id !== experienceGuildId ||
    !experiencePatchMatches(forum, expected)
  )
    throw new DiscordAuditError("Trading forum settings did not verify.");
  const profiles = [
    [],
    ...snapshot.roles
      .filter(
        (r): boolean =>
          !r.managed &&
          r.id !== tradingModeratorId &&
          r.id !== tradingBanId &&
          (BigInt(r.permissions) & bits(3)) === 0n,
      )
      .map((r): string[] => [r.id]),
  ];
  for (const roles of profiles) {
    const permissions = channelPermissions(
      guildPermissions(snapshot.roles, experienceGuildId, roles),
      forum,
      experienceGuildId,
      roles,
    );
    if (
      (permissions & (read | bits(38))) !== (read | bits(38)) ||
      (key === "auction" && permissions & bits(11, 35, 36))
    )
      throw new DiscordAuditError("Member trading permissions did not verify.");
    const banned = channelPermissions(
      guildPermissions(snapshot.roles, experienceGuildId, [
        ...roles,
        tradingBanId,
      ]),
      forum,
      experienceGuildId,
      [...roles, tradingBanId],
    );
    if (banned & (read | post))
      throw new DiscordAuditError(
        "The intentional BAN role can access trading.",
      );
  }
}

export function tradingOnboarding(
  before: GroupOnboarding,
  ids: TradingIds,
): GroupOnboarding {
  const result = structuredClone(before);
  const options = [
    {
      id: ids.alliance,
      title: "Alliance trading and crafting",
      description: "Item offers and profession listings for your market.",
      channel_ids: [ids.alliance, tradingRulesId],
      role_ids: [],
    },
    {
      id: ids.horde,
      title: "Horde trading and crafting",
      description: "Item offers and profession listings for your market.",
      channel_ids: [ids.horde, tradingRulesId],
      role_ids: [],
    },
    {
      id: ids.auction,
      title: "Auction House research",
      description: "Price-reading guides and data-backed market reports.",
      channel_ids: [ids.auction],
      role_ids: [],
    },
  ];
  const current = result.prompts.find(
    (prompt): boolean => prompt.title === tradingPromptTitle,
  );
  if (current) {
    if (
      current.required ||
      current.single_select ||
      current.in_onboarding ||
      !isDeepStrictEqual(
        current.options.map((option) => ({
          id: option.id,
          title: option.title,
          description: option.description,
          channel_ids: [...option.channel_ids].sort(),
          role_ids: [...option.role_ids].sort(),
        })),
        options.map((o, i) => ({
          ...o,
          id: current.options[i]?.id,
          channel_ids: [...o.channel_ids].sort(),
          role_ids: [...o.role_ids].sort(),
        })),
      )
    )
      throw new DiscordAuditError(
        "The existing trading interest question changed; review without replacing it.",
      );
    return result;
  }
  if (result.prompts.length >= 7)
    throw new DiscordAuditError(
      "Onboarding has no room for an optional trading question; preserve existing questions.",
    );
  result.prompts.push({
    id: ids.auction,
    title: tradingPromptTitle,
    type: 0,
    required: false,
    single_select: false,
    in_onboarding: false,
    options,
  });
  return result;
}

export function assertTradingOnboarding(
  before: GroupOnboarding,
  after: GroupOnboarding,
  ids: TradingIds,
): void {
  tradingOnboarding(after, ids);
  const expected = tradingOnboarding(before, ids);
  const withoutTrading = (value: GroupOnboarding): GroupOnboarding => ({
    ...value,
    prompts: value.prompts.filter(
      (prompt) => prompt.title !== tradingPromptTitle,
    ),
  });
  if (
    after.prompts.filter((prompt) => prompt.title === tradingPromptTitle)
      .length !== 1 ||
    !sameGroupOnboarding(withoutTrading(expected), withoutTrading(after))
  )
    throw new DiscordAuditError(
      "Trading onboarding preservation did not verify.",
    );
}
