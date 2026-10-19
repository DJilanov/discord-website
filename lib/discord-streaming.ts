import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import { experienceGuildId } from "../content/discord-channel-experience";
import {
  streamcordRoleId,
  streamersChannelId,
  streamingBanRoleId,
  streamingChannels,
  streamingModeratorId,
  streamingParentId,
  streamingPromptTitle,
  type StreamingChannelIds,
  type StreamingChannelKey,
} from "../content/discord-streaming";
import {
  channelPermissions,
  discordId,
  guildPermissions,
  hasDiscordPermission,
  type DiscordAuditSnapshot,
} from "./discord-audit";
import { DiscordAuditError } from "./discord-audit-client";
import { experienceChannelSchema } from "./discord-channel-experience";
import {
  sameGroupOnboarding,
  type GroupOnboarding,
} from "./discord-group-channels";

export const streamingChannelSchema = experienceChannelSchema.extend({
  bitrate: z.number().int().optional(),
  user_limit: z.number().int().optional(),
  rtc_region: z.string().nullable().optional(),
  video_quality_mode: z.number().int().optional(),
});
export type StreamingChannel = z.infer<typeof streamingChannelSchema>;

function mask(bits: readonly number[]): bigint {
  return bits.reduce(
    (result: bigint, bit: number): bigint => result | (1n << BigInt(bit)),
    0n,
  );
}

const read = mask([10, 16]);
const write = mask([11, 35, 36, 38, 46]);
const voice = mask([9, 20, 21, 25]);
const mentions = 1n << 17n;
const administrative = mask([1, 2, 3, 4, 5, 28, 29, 34, 40]);

export function streamingOverwrites(
  snapshot: DiscordAuditSnapshot,
  key: StreamingChannelKey,
): StreamingChannel["permission_overwrites"] {
  if (snapshot.guild.id !== experienceGuildId)
    throw new DiscordAuditError(
      "Streaming is restricted to the Forever server.",
    );
  for (const id of [streamcordRoleId, streamingModeratorId, streamingBanRoleId])
    if (!snapshot.roles.some((role): boolean => role.id === id))
      throw new DiscordAuditError("An approved streaming role is missing.");
  const grants = [
    {
      id: experienceGuildId,
      type: 0 as const,
      allow: (key === "voice" ? read | voice | (1n << 11n) : read).toString(),
      deny: (key === "alerts" ? write | mentions : mentions).toString(),
    },
    {
      id: streamingModeratorId,
      type: 0 as const,
      allow: (
        read |
        (1n << 11n) |
        (1n << 13n) |
        (key === "voice" ? voice | mask([22, 23, 24]) : 0n)
      ).toString(),
      deny: "0",
    },
    {
      id: streamingBanRoleId,
      type: 0 as const,
      allow: "0",
      deny: (read | write | voice).toString(),
    },
  ];
  if (key === "alerts")
    grants.push({
      id: streamcordRoleId,
      type: 0,
      allow: (read | mask([11, 14, 15])).toString(),
      deny: mentions.toString(),
    });
  return grants;
}

export function streamingChannelPayload(
  snapshot: DiscordAuditSnapshot,
  key: StreamingChannelKey,
): Record<string, unknown> {
  const definition = streamingChannels.find(
    (channel): boolean => channel.key === key,
  );
  if (!definition) throw new DiscordAuditError("Unexpected streaming channel.");
  return {
    name: definition.name,
    type: definition.type,
    parent_id: streamingParentId,
    nsfw: false,
    permission_overwrites: streamingOverwrites(snapshot, key),
    ...(key === "alerts" && "topic" in definition
      ? { topic: definition.topic, rate_limit_per_user: 0 }
      : {
          bitrate: 64000,
          user_limit: 0,
          rtc_region: null,
          video_quality_mode: 1,
          rate_limit_per_user: 5,
        }),
  };
}

export function assertStreamingChannel(
  snapshot: DiscordAuditSnapshot,
  channel: StreamingChannel,
  key: StreamingChannelKey,
): void {
  const payload = streamingChannelPayload(snapshot, key);
  const normalize = (value: unknown): unknown =>
    Array.isArray(value)
      ? [...(value as StreamingChannel["permission_overwrites"])].sort(
          (left, right): number => left.id.localeCompare(right.id),
        )
      : value;
  if (
    channel.guild_id !== experienceGuildId ||
    Object.entries(payload).some(
      ([field, wanted]): boolean =>
        !isDeepStrictEqual(
          normalize(channel[field as keyof StreamingChannel]),
          normalize(wanted),
        ),
    )
  )
    throw new DiscordAuditError("Streaming channel settings did not verify.");
  const base = guildPermissions(snapshot.roles, snapshot.guild.id, []);
  const member = channelPermissions(base, channel, snapshot.guild.id, []);
  const needed = key === "voice" ? read | voice | (1n << 11n) : read;
  if (
    !hasDiscordPermission(member, needed) ||
    (member & administrative) !== (base & administrative) ||
    Boolean(member & mentions) ||
    (key === "alerts" && Boolean(member & write))
  )
    throw new DiscordAuditError(
      "Regular member streaming access is incorrect.",
    );
  for (const role of snapshot.roles.filter(
    (item): boolean =>
      !item.managed &&
      item.id !== streamingModeratorId &&
      item.id !== streamingBanRoleId &&
      item.id !== snapshot.guild.id &&
      !hasDiscordPermission(BigInt(item.permissions), 1n << 3n),
  )) {
    const roleBase = guildPermissions(snapshot.roles, snapshot.guild.id, [
      role.id,
    ]);
    const permissions = channelPermissions(
      roleBase,
      channel,
      snapshot.guild.id,
      [role.id],
    );
    if (
      !hasDiscordPermission(permissions, needed) ||
      (permissions & administrative) !== (roleBase & administrative) ||
      (key === "alerts" && Boolean(permissions & write))
    )
      throw new DiscordAuditError(
        "A regular role has unsafe streaming access.",
      );
  }
  const restricted = channelPermissions(
    guildPermissions(snapshot.roles, snapshot.guild.id, [streamingBanRoleId]),
    channel,
    snapshot.guild.id,
    [streamingBanRoleId],
  );
  if (restricted & (read | write | voice))
    throw new DiscordAuditError(
      "The intentional BAN role can access streaming.",
    );
}

export function streamingOnboarding(
  before: GroupOnboarding,
  channels: StreamingChannelIds,
): GroupOnboarding {
  discordId.parse(channels.alerts);
  discordId.parse(channels.voice);
  const result = structuredClone(before);
  const candidates = result.prompts.filter(
    (prompt): boolean => prompt.title === streamingPromptTitle,
  );
  if (candidates.length > 1)
    throw new DiscordAuditError("Duplicate streaming onboarding questions.");
  const expected = {
    id: channels.voice,
    type: 0,
    title: streamingPromptTitle,
    required: false,
    single_select: false,
    in_onboarding: false,
    options: [
      {
        id: channels.alerts,
        title: "Twitch creators and live alerts",
        description:
          "Creator introductions, schedules and Twitch stream links.",
        channel_ids: [streamersChannelId, channels.alerts],
        role_ids: [],
      },
      {
        id: streamersChannelId,
        title: "Watch or stream inside Discord",
        description: "Share gameplay, watch other members and talk together.",
        channel_ids: [channels.voice],
        role_ids: [],
      },
    ],
  };
  if (candidates.length) {
    const current = candidates[0];
    const normalized = {
      id: expected.id,
      type: current.type,
      title: current.title,
      required: current.required,
      single_select: current.single_select,
      in_onboarding: current.in_onboarding,
      options: current.options.map((option, index) => ({
        id: expected.options[index]?.id,
        title: option.title,
        description: option.description,
        channel_ids: option.channel_ids,
        role_ids: option.role_ids,
      })),
    };
    if (!isDeepStrictEqual(normalized, expected))
      throw new DiscordAuditError(
        "The streaming question was edited. Preserve it and review.",
      );
    return result;
  }
  if (result.prompts.length >= 7)
    throw new DiscordAuditError(
      "Onboarding needs review before adding a question.",
    );
  const existingIds = new Set(
    result.prompts.flatMap((prompt): string[] => [
      prompt.id,
      ...prompt.options.map((option): string => option.id),
    ]),
  );
  if (
    [expected.id, ...expected.options.map((option): string => option.id)].some(
      (id: string): boolean => existingIds.has(id),
    )
  )
    throw new DiscordAuditError("New onboarding identifiers conflict.");
  result.prompts.push(expected);
  return result;
}

export function assertStreamingOnboarding(
  before: GroupOnboarding,
  after: GroupOnboarding,
  channels: StreamingChannelIds,
): void {
  // Discord assigns IDs to new prompts/options; existing identities must survive.
  const expected = streamingOnboarding(before, channels);
  const current = streamingOnboarding(after, channels);
  const withoutStreams = (value: GroupOnboarding): GroupOnboarding => ({
    ...value,
    prompts: value.prompts.filter(
      (prompt): boolean => prompt.title !== streamingPromptTitle,
    ),
  });
  if (
    current.prompts.length !== after.prompts.length ||
    !sameGroupOnboarding(withoutStreams(expected), withoutStreams(after))
  )
    throw new DiscordAuditError("Onboarding preservation did not verify.");
}
