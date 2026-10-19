import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import {
  factionPromptId,
  groupFactions,
  levelingForumId,
  type GroupKind,
} from "../content/discord-group-channels";
import {
  channelPermissions,
  discordId,
  guildPermissions,
  hasDiscordPermission,
  type DiscordAuditSnapshot,
} from "./discord-audit";
import { DiscordAuditError } from "./discord-audit-client";
import {
  experiencePatchMatches,
  mergedExperienceTags,
  sameExperienceChannelIds,
  type ExperienceChannel,
  type ExperiencePatch,
} from "./discord-channel-experience";
import {
  groupGuidelines,
  groupTags,
  type GroupFaction,
} from "../content/discord-group-channels";

export const groupOnboardingSchema = z.object({
  guild_id: discordId,
  enabled: z.boolean(),
  mode: z.number().int(),
  default_channel_ids: z.array(discordId),
  prompts: z.array(
    z.object({
      id: discordId,
      type: z.number().int(),
      title: z.string(),
      single_select: z.boolean(),
      required: z.boolean(),
      in_onboarding: z.boolean(),
      options: z.array(
        z.object({
          id: discordId,
          title: z.string(),
          description: z.string().nullable().optional(),
          channel_ids: z.array(discordId),
          role_ids: z.array(discordId),
          emoji: z
            .object({
              id: discordId.nullable(),
              name: z.string().nullable(),
              animated: z.boolean().optional(),
            })
            .optional(),
        }),
      ),
    }),
  ),
});
export type GroupOnboarding = z.infer<typeof groupOnboardingSchema>;

export function groupForumPatch(
  channel: ExperienceChannel,
  kind: GroupKind,
  faction?: GroupFaction,
): ExperiencePatch {
  return {
    ...(kind === "scheduled" ? { name: "scheduled-runs" } : {}),
    topic: groupGuidelines(kind, faction),
    flags: (channel.flags ?? 0) | 16,
    available_tags: mergedExperienceTags(
      channel.available_tags ?? [],
      groupTags(kind),
    ),
    default_forum_layout: 1,
    default_sort_order: kind === "leveling" ? 0 : 1,
    default_auto_archive_duration:
      kind === "pve" || kind === "pvp" ? 1440 : 10080,
    rate_limit_per_user: 60,
    default_thread_rate_limit_per_user: 0,
  };
}

export function assertGroupTagsRetained(
  before: ExperienceChannel,
  after: ExperienceChannel,
): void {
  for (const tag of before.available_tags ?? []) {
    const current = after.available_tags?.find(
      (item): boolean => item.id === tag.id,
    );
    if (
      !current ||
      current.name !== tag.name ||
      current.moderated !== tag.moderated
    )
      throw new DiscordAuditError(
        "An existing forum tag changed identity or policy. Stop and review.",
      );
  }
}

export function assertGroupGuildPreserved(
  before: DiscordAuditSnapshot,
  after: DiscordAuditSnapshot,
): void {
  const normalizeGuild = (
    snapshot: DiscordAuditSnapshot,
  ): DiscordAuditSnapshot["guild"] => ({
    ...snapshot.guild,
    features: [...snapshot.guild.features].sort(),
  });
  const normalizeRoles = (
    snapshot: DiscordAuditSnapshot,
  ): DiscordAuditSnapshot["roles"] =>
    [...snapshot.roles].sort((a, b): number => a.id.localeCompare(b.id));
  if (
    !isDeepStrictEqual(normalizeGuild(before), normalizeGuild(after)) ||
    !isDeepStrictEqual(normalizeRoles(before), normalizeRoles(after)) ||
    !sameExperienceChannelIds(before.botRoleIds, after.botRoleIds)
  )
    throw new DiscordAuditError(
      "Protected guild settings or role grants changed; review the journal without reverting owner edits.",
    );
}

export function assertGroupForumAccess(
  snapshot: DiscordAuditSnapshot,
  forum: ExperienceChannel,
): void {
  const everyone = channelPermissions(
    guildPermissions(snapshot.roles, snapshot.guild.id, []),
    forum,
    snapshot.guild.id,
    [],
  );
  if (
    forum.type !== 15 ||
    ![10, 11, 16, 38].every((bit: number): boolean =>
      hasDiscordPermission(everyone, 1n << BigInt(bit)),
    )
  )
    throw new DiscordAuditError(
      "Members cannot view, create, read and reply in the forum. Do not archive its source.",
    );
}

export function assertCopiedGroupAccess(
  source: ExperienceChannel,
  forum: ExperienceChannel,
): void {
  if (
    source.guild_id !== forum.guild_id ||
    (source.nsfw ?? false) !== (forum.nsfw ?? false) ||
    !experiencePatchMatches(forum, {
      permission_overwrites: source.permission_overwrites,
    })
  )
    throw new DiscordAuditError(
      "The replacement forum did not preserve source visibility, age restriction or permissions.",
    );
}

export async function prepareGroupForum(
  snapshot: DiscordAuditSnapshot,
  source: ExperienceChannel,
  forum: ExperienceChannel,
  kind: "pve" | "pvp",
  faction: GroupFaction,
  edit: (
    before: ExperienceChannel,
    patch: ExperiencePatch,
  ) => Promise<ExperienceChannel>,
): Promise<ExperienceChannel> {
  assertCopiedGroupAccess(source, forum);
  assertGroupForumAccess(snapshot, forum);
  // Discord can ignore creation flags/defaults; configure and verify before archiving.
  const patch = groupForumPatch(forum, kind, faction);
  const configured = await edit(forum, patch);
  assertCopiedGroupAccess(source, configured);
  assertGroupForumAccess(snapshot, configured);
  if (!experiencePatchMatches(configured, patch))
    throw new DiscordAuditError(
      "Replacement forum settings did not verify; do not archive its source.",
    );
  return configured;
}

export function assertGroupArchive(
  snapshot: DiscordAuditSnapshot,
  source: ExperienceChannel,
  archive: ExperienceChannel,
): void {
  const profiles = [
    [],
    ...snapshot.roles
      .filter(
        (role): boolean =>
          role.id !== snapshot.guild.id &&
          (BigInt(role.permissions) &
            ((1n << 3n) | (1n << 4n) | (1n << 34n))) ===
            0n &&
          role.id !== "1554333297704706098",
      )
      .map((role): string[] => [role.id]),
    ...source.permission_overwrites
      .filter(
        (entry): boolean => entry.type === 1 && entry.id !== snapshot.bot.id,
      )
      .map((entry): string[] => [entry.id]),
  ];
  for (const profile of profiles) {
    const memberId = source.permission_overwrites.find(
      (entry): boolean => entry.type === 1 && entry.id === profile[0],
    )?.id;
    const roles = memberId ? [] : profile;
    const base = guildPermissions(snapshot.roles, snapshot.guild.id, roles);
    const before = channelPermissions(
      base,
      source,
      snapshot.guild.id,
      roles,
      memberId,
    );
    const after = channelPermissions(
      base,
      archive,
      snapshot.guild.id,
      roles,
      memberId,
    );
    if (
      [10, 16].some(
        (bit: number): boolean =>
          hasDiscordPermission(before, 1n << BigInt(bit)) !==
          hasDiscordPermission(after, 1n << BigInt(bit)),
      ) ||
      [11, 35, 36, 38].some((bit: number): boolean =>
        hasDiscordPermission(after, 1n << BigInt(bit)),
      )
    )
      throw new DiscordAuditError(
        "Archive access or read-only permissions did not verify.",
      );
  }
}

export function factionChannelOrder(
  faction: GroupFaction,
  created: Readonly<Record<string, string>>,
): string[] {
  const pve = created[`${faction.key}-pve`];
  const pvp = created[`${faction.key}-pvp`];
  if (!pve || !pvp)
    throw new DiscordAuditError(
      "Both replacement faction forums must be recorded before routing.",
    );
  return [
    faction.rulesId,
    pve,
    pvp,
    faction.scheduledId,
    faction.lookingId,
    faction.recruitmentId,
  ];
}

export function routedGroupOnboarding(
  before: GroupOnboarding,
  created: Readonly<Record<string, string>>,
): GroupOnboarding {
  const result = structuredClone(before);
  const prompt = result.prompts.find(
    (item): boolean => item.id === factionPromptId,
  );
  if (!prompt)
    throw new DiscordAuditError(
      "The approved faction onboarding question is missing.",
    );
  for (const faction of groupFactions) {
    const option = prompt.options.find(
      (item): boolean => item.id === faction.optionId,
    );
    if (!option || option.title !== faction.label)
      throw new DiscordAuditError(
        "A faction onboarding option changed identity; preserve it and review.",
      );
    const replaced = new Set([
      faction.parentId,
      faction.pveSourceId,
      faction.pvpSourceId,
    ]);
    option.channel_ids = [
      ...new Set([
        ...option.channel_ids.filter(
          (id: string): boolean => !replaced.has(id),
        ),
        ...factionChannelOrder(faction, created),
        levelingForumId,
      ]),
    ];
  }
  result.default_channel_ids = before.default_channel_ids.map(
    (id: string): string => {
      for (const faction of groupFactions) {
        if (id === faction.pveSourceId) return created[`${faction.key}-pve`];
        if (id === faction.pvpSourceId) return created[`${faction.key}-pvp`];
      }
      return id;
    },
  );
  if (
    new Set(result.default_channel_ids).size !==
    result.default_channel_ids.length
  )
    throw new DiscordAuditError(
      "Onboarding replacement would duplicate defaults.",
    );
  return result;
}

export function sameGroupOnboarding(
  left: GroupOnboarding,
  right: GroupOnboarding,
): boolean {
  const normalize = (value: GroupOnboarding): GroupOnboarding => ({
    ...value,
    default_channel_ids: [...value.default_channel_ids].sort(),
    prompts: value.prompts.map((prompt) => ({
      ...prompt,
      options: prompt.options.map((option) => ({
        ...option,
        channel_ids: [...option.channel_ids].sort(),
        role_ids: [...option.role_ids].sort(),
      })),
    })),
  });
  return isDeepStrictEqual(normalize(left), normalize(right));
}

export function groupOnboardingPayload(
  value: GroupOnboarding,
): Record<string, unknown> {
  return {
    prompts: value.prompts.map((prompt) => ({
      ...prompt,
      options: prompt.options.map(({ emoji, ...option }) => ({
        ...option,
        ...(emoji
          ? {
              emoji_id: emoji.id,
              emoji_name: emoji.name,
              emoji_animated: emoji.animated ?? false,
            }
          : {}),
      })),
    })),
    default_channel_ids: value.default_channel_ids,
  };
}

export function neutralContributorCopy(content: string): string {
  const former = "Maintainer: the community's KFC tool team";
  const neutral = "Maintainer: Open source contributors";
  if (content.includes(neutral) && !content.includes(former)) return content;
  if (content.split(former).length !== 2 || content.includes(neutral))
    throw new DiscordAuditError(
      "The recorded maintainer line changed; preserve it and review before editing.",
    );
  return content
    .replace(`${former}; joining KFC is not required.`, `${neutral}.`)
    .replace(former, neutral)
    .replace(
      "Raid addons maintained by the guild",
      "Other community raid addons",
    );
}

export function assertGroupOrder(
  channels: readonly ExperienceChannel[],
  faction: GroupFaction,
  expected: readonly string[],
): void {
  const ordered = channels
    .filter(
      (channel): boolean =>
        channel.parent_id === faction.parentId && expected.includes(channel.id),
    )
    .sort((a, b): number => a.position - b.position || a.id.localeCompare(b.id))
    .map((channel): string => channel.id);
  if (
    !sameExperienceChannelIds(ordered, expected) ||
    !isDeepStrictEqual(ordered, expected)
  )
    throw new DiscordAuditError("Faction channel order did not verify.");
}
