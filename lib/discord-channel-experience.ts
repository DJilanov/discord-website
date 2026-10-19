import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import {
  experienceApplicationId,
  experienceGuildId,
  type ExperienceTag,
} from "../content/discord-channel-experience";
import {
  auditChannelSchema,
  channelPermissions,
  guildPermissions,
  hasDiscordPermission,
  type DiscordAuditSnapshot,
} from "./discord-audit";
import { DiscordAuditError } from "./discord-audit-client";

export const experienceChannelSchema = auditChannelSchema.extend({
  default_auto_archive_duration: z.number().int().optional(),
  default_thread_rate_limit_per_user: z.number().int().optional(),
  default_sort_order: z.number().int().nullable().optional(),
  default_forum_layout: z.number().int().optional(),
});
export type ExperienceChannel = z.infer<typeof experienceChannelSchema>;
export interface ExperiencePatch {
  name?: string;
  topic?: string;
  parent_id?: string;
  permission_overwrites?: ExperienceChannel["permission_overwrites"];
  default_auto_archive_duration?: number;
  default_thread_rate_limit_per_user?: number;
  default_sort_order?: number;
  default_forum_layout?: number;
  rate_limit_per_user?: number;
  flags?: number;
  available_tags?: ExperienceTag[];
}

function sameOverwrites(
  left: ExperienceChannel["permission_overwrites"],
  right: ExperienceChannel["permission_overwrites"],
): boolean {
  const normalized = (
    entries: ExperienceChannel["permission_overwrites"],
  ): ExperienceChannel["permission_overwrites"] =>
    [...entries].sort(
      (a, b): number => a.type - b.type || a.id.localeCompare(b.id),
    );
  return isDeepStrictEqual(normalized(left), normalized(right));
}

export function assertExperienceScope(snapshot: DiscordAuditSnapshot): void {
  if (
    snapshot.guild.id !== experienceGuildId ||
    snapshot.application.id !== experienceApplicationId
  )
    throw new DiscordAuditError(
      "Channel experience changes are restricted to the approved Forever server and bot.",
    );
}

export function sameExperienceChannelIds(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return (
    left.length === new Set(left).size &&
    right.length === new Set(right).size &&
    isDeepStrictEqual([...left].sort(), [...right].sort())
  );
}

export function experiencePermission(
  snapshot: DiscordAuditSnapshot,
  channel: ExperienceChannel,
  bit: number,
): boolean {
  const base = guildPermissions(
    snapshot.roles,
    snapshot.guild.id,
    snapshot.botRoleIds,
  );
  return hasDiscordPermission(
    channelPermissions(
      base,
      channel,
      snapshot.guild.id,
      snapshot.botRoleIds,
      snapshot.bot.id,
    ),
    1n << BigInt(bit),
  );
}

export function mergedExperienceTags(
  existing: readonly ExperienceTag[],
  desired: readonly ExperienceTag[],
): ExperienceTag[] {
  const tags = existing.map((tag: ExperienceTag): ExperienceTag => ({
    ...tag,
  }));
  for (const wanted of desired) {
    const matching = tags.filter(
      (tag: ExperienceTag): boolean => tag.name === wanted.name,
    );
    if (matching.length > 1)
      throw new DiscordAuditError(
        "Duplicate forum tag names need manual review.",
      );
    if (matching.length) matching[0].moderated = wanted.moderated;
    else tags.push({ ...wanted });
  }
  if (
    tags.length > 20 ||
    tags.some(
      (tag: ExperienceTag): boolean => !tag.name.length || tag.name.length > 20,
    )
  )
    throw new DiscordAuditError(
      "The proposed forum tags exceed Discord limits; existing tags were not removed.",
    );
  return tags;
}

const archiveWriteMask = (1n << 11n) | (1n << 35n) | (1n << 36n) | (1n << 38n);

export function readOnlyArchiveOverwrites(
  channel: ExperienceChannel,
  snapshot: DiscordAuditSnapshot,
): ExperienceChannel["permission_overwrites"] {
  const trusted = new Set(
    snapshot.roles
      .filter(
        (role): boolean =>
          role.id !== snapshot.guild.id &&
          (BigInt(role.permissions) &
            ((1n << 3n) | (1n << 4n) | (1n << 34n))) !==
            0n,
      )
      .map((role): string => role.id),
  );
  trusted.add("1554333297704706098");
  const current = channel.permission_overwrites.map(
    (overwrite): ExperienceChannel["permission_overwrites"][number] => ({
      ...overwrite,
    }),
  );
  if (
    !current.some(
      (overwrite): boolean =>
        overwrite.id === snapshot.guild.id && overwrite.type === 0,
    )
  )
    current.push({ id: snapshot.guild.id, type: 0, allow: "0", deny: "0" });
  return current.map(
    (overwrite): ExperienceChannel["permission_overwrites"][number] => {
      if (
        (overwrite.type === 0 && trusted.has(overwrite.id)) ||
        overwrite.id === snapshot.bot.id
      )
        return overwrite;
      return {
        ...overwrite,
        allow: (BigInt(overwrite.allow) & ~archiveWriteMask).toString(),
        deny: (BigInt(overwrite.deny) | archiveWriteMask).toString(),
      };
    },
  );
}

export function experiencePatchMatches(
  channel: ExperienceChannel,
  patch: ExperiencePatch,
): boolean {
  return Object.entries(patch).every(([key, value]): boolean => {
    if (key === "permission_overwrites")
      return sameOverwrites(
        channel.permission_overwrites,
        value as ExperienceChannel["permission_overwrites"],
      );
    if (key === "available_tags") {
      const desired = value as ExperienceTag[];
      const actual = channel.available_tags ?? [];
      return (
        actual.length === desired.length &&
        desired.every(
          (tag: ExperienceTag, index: number): boolean =>
            actual[index]?.name === tag.name &&
            actual[index]?.moderated === tag.moderated &&
            (!tag.id || actual[index].id === tag.id),
        )
      );
    }
    return isDeepStrictEqual(channel[key as keyof ExperienceChannel], value);
  });
}

export function assertExperienceUnchanged(
  before: ExperienceChannel,
  current: ExperienceChannel,
): void {
  const fields = [
    "id",
    "guild_id",
    "type",
    "name",
    "topic",
    "parent_id",
    "permission_overwrites",
    "available_tags",
    "flags",
    "rate_limit_per_user",
    "default_sort_order",
    "default_forum_layout",
    "default_auto_archive_duration",
    "default_thread_rate_limit_per_user",
  ] as const;
  if (
    fields.some(
      (key): boolean =>
        Object.hasOwn(before, key) &&
        (key === "permission_overwrites"
          ? !sameOverwrites(
              before.permission_overwrites,
              current.permission_overwrites,
            )
          : !isDeepStrictEqual(before[key], current[key])),
    )
  )
    throw new DiscordAuditError(
      "Channel configuration changed during the operation. Review the private journal before retrying.",
    );
}

export function assertExperienceAccessPreserved(
  before: ExperienceChannel,
  after: ExperienceChannel,
  patch: ExperiencePatch,
): void {
  if (
    before.id !== after.id ||
    before.type !== after.type ||
    before.guild_id !== after.guild_id ||
    (!patch.permission_overwrites &&
      !sameOverwrites(
        before.permission_overwrites,
        after.permission_overwrites,
      ))
  )
    throw new DiscordAuditError(
      "Discord changed protected channel identity or access. Stop and review the recovery journal.",
    );
}
