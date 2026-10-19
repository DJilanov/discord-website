import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import { kfcApplicationId, kfcGuildId } from "../content/kfc-community";
import type { ResourcePayload } from "../content/kfc-revision";
import {
  channelPermissions,
  discordId,
  guildPermissions,
  hasDiscordPermission,
  type DiscordAuditSnapshot,
} from "./discord-audit";
import { assertKfcScope } from "./kfc-community";
import type {
  ExperienceChannel,
  ExperiencePatch,
} from "./discord-channel-experience";

export function assertRevisionAudience(
  before: ExperienceChannel,
  after: ExperienceChannel,
  snapshot: DiscordAuditSnapshot,
): void {
  assertKfcScope(snapshot);
  if (
    before.id !== after.id ||
    after.guild_id !== kfcGuildId ||
    before.type !== after.type
  )
    throw new Error("Revision channel identity changed.");
  const audienceMask = (1n << 10n) | (1n << 16n) | (1n << 20n);
  for (const entry of [
    ...before.permission_overwrites,
    ...after.permission_overwrites,
  ]) {
    if (entry.type === 1 && entry.id === kfcApplicationId) continue;
    const oldEntry = before.permission_overwrites.find(
      (o): boolean => o.id === entry.id && o.type === entry.type,
    );
    const newEntry = after.permission_overwrites.find(
      (o): boolean => o.id === entry.id && o.type === entry.type,
    );
    for (const field of ["allow", "deny"] as const)
      if (
        (BigInt(oldEntry?.[field] ?? "0") & audienceMask) !==
        (BigInt(newEntry?.[field] ?? "0") & audienceMask)
      )
        throw new Error("Revision changes an audience overwrite.");
  }
  const roleIds = snapshot.roles
    .filter((r): boolean => r.id !== kfcGuildId)
    .map((r): string => r.id);
  const profiles = [[], ...roleIds.map((id): string[] => [id]), roleIds];
  for (const roles of profiles) {
    const base = guildPermissions(snapshot.roles, kfcGuildId, roles);
    const oldAccess = channelPermissions(base, before, kfcGuildId, roles);
    const newAccess = channelPermissions(base, after, kfcGuildId, roles);
    for (const bit of [10, 16, ...(before.type === 2 ? [20] : [])])
      if (
        hasDiscordPermission(oldAccess, 1n << BigInt(bit)) !==
        hasDiscordPermission(newAccess, 1n << BigInt(bit))
      )
        throw new Error("Revision changes effective channel audience.");
  }
}

export function botMaintenancePatch(
  channel: ExperienceChannel,
  forum: boolean,
): ExperiencePatch {
  if (channel.guild_id !== kfcGuildId || channel.type !== (forum ? 15 : 0))
    throw new Error("Invalid bot maintenance destination.");
  const allow =
    (1n << 10n) |
    (1n << 11n) |
    (1n << 14n) |
    (1n << 15n) |
    (1n << 16n) |
    (1n << 51n) |
    (forum ? (1n << 34n) | (1n << 38n) : 0n);
  const overwrites = channel.permission_overwrites.map((entry) => ({
    ...entry,
  }));
  const existing = overwrites.find(
    (entry): boolean => entry.type === 1 && entry.id === kfcApplicationId,
  );
  if (existing) {
    existing.allow = (BigInt(existing.allow) | allow).toString();
    existing.deny = (BigInt(existing.deny) & ~allow).toString();
  } else
    overwrites.push({
      id: kfcApplicationId,
      type: 1,
      allow: allow.toString(),
      deny: "0",
    });
  return { permission_overwrites: overwrites };
}
const embedSchema = z.object({
  title: z.string(),
  description: z.string(),
  color: z.number(),
  footer: z.object({ text: z.string() }),
  thumbnail: z.object({ url: z.string() }).optional(),
  image: z.object({ url: z.string() }).optional(),
});
export function renderedResource(value: unknown): {
  content: string;
  embeds: z.infer<typeof embedSchema>[];
} {
  return z
    .object({ content: z.string(), embeds: z.array(embedSchema) })
    .parse(value);
}
export function resourceMatches(actual: unknown, expected: unknown): boolean {
  return isDeepStrictEqual(
    renderedResource(actual),
    renderedResource(expected),
  );
}
export function resourceChecksum(payload: ResourcePayload): string {
  return createHash("sha256")
    .update(JSON.stringify(renderedResource(payload)))
    .digest("hex");
}

export function forumCreationFields(tags: readonly string[]): {
  available_tags: { name: string; moderated: boolean }[];
  default_auto_archive_duration: number;
  default_sort_order: number;
  default_forum_layout: number;
  rate_limit_per_user: number;
  default_thread_rate_limit_per_user: number;
} {
  if (
    !tags.length ||
    tags.length > 20 ||
    new Set(tags).size !== tags.length ||
    tags.some((tag): boolean => !tag.length || tag.length > 20)
  )
    throw new Error("Invalid forum tag catalogue.");
  // REQUIRE_TAG is deliberately set through Modify Channel after creation.
  return {
    available_tags: tags.map((name): { name: string; moderated: boolean } => ({
      name,
      moderated: name === "Reviewed",
    })),
    default_auto_archive_duration: 1440,
    default_sort_order: 0,
    default_forum_layout: 1,
    rate_limit_per_user: 60,
    default_thread_rate_limit_per_user: 5,
  };
}
const onboardingSchema = z.object({
  enabled: z.boolean(),
  mode: z.number(),
  default_channel_ids: z.array(z.string()),
  prompts: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      type: z.number(),
      required: z.boolean(),
      single_select: z.boolean(),
      in_onboarding: z.boolean(),
      options: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          channel_ids: z.array(z.string()),
          role_ids: z.array(z.string()),
          description: z.string().nullable().optional(),
          emoji: z.unknown().optional(),
        }),
      ),
    }),
  ),
});

export function attachClassSubscriptions(
  value: unknown,
  ids: Record<string, string>,
): Record<string, unknown> {
  const data = onboardingSchema.parse(value);
  const prompt = data.prompts.find(
    (p): boolean => p.title === "Which classes do you play?",
  );
  if (
    !prompt ||
    prompt.options.length !== 9 ||
    prompt.required ||
    prompt.in_onboarding
  )
    throw new Error(
      "Owner's class question needs review; no onboarding overwrite attempted.",
    );
  for (const option of prompt.options) {
    const channelId = ids[option.title.toLowerCase()];
    if (!channelId)
      throw new Error("Unknown class interest; review owner changes.");
    option.channel_ids = [...new Set([...option.channel_ids, channelId])];
  }
  return data;
}

export function splitPvpSubscriptions(
  value: unknown,
  sharedPvpId: string,
): Record<string, unknown> {
  discordId.parse(sharedPvpId);
  const data = onboardingSchema.parse(value);
  const prompts = data.prompts.filter(
    (prompt): boolean => prompt.title === "What brings you here?",
  );
  if (
    prompts.length !== 1 ||
    prompts[0].type !== 0 ||
    !prompts[0].required ||
    !prompts[0].in_onboarding ||
    prompts[0].single_select
  )
    throw new Error(
      "The edition question needs review; no routing overwrite attempted.",
    );
  const prompt = prompts[0];
  const identities = data.prompts.flatMap((item): string[] => [
    item.id,
    ...item.options.map((option): string => option.id),
  ]);
  if (
    new Set(identities).size !== identities.length ||
    new Set(prompt.options.map((option): string => option.title)).size !==
      prompt.options.length ||
    !prompt.options.some((option): boolean => option.title === "TBC raids") ||
    !prompt.options.some((option): boolean => option.title === "WoW Forever")
  )
    throw new Error("Conflicting onboarding option identities.");
  const routes = {
    "TBC PvP": [sharedPvpId, "1463110825790148639", "1463605381342429195"],
    "Forever PvP": [sharedPvpId, "1548519535177629707"],
  };
  const legacy = prompt.options.find(
    (option): boolean => option.title === "PvP groups",
  );
  if (!legacy) {
    for (const [title, channels] of Object.entries(routes)) {
      const option = prompt.options.find(
        (item): boolean => item.title === title,
      );
      if (
        !option ||
        option.role_ids.length ||
        !isDeepStrictEqual([...option.channel_ids].sort(), [...channels].sort())
      )
        throw new Error(
          "Edition-specific PvP routing changed; review it before updating.",
        );
    }
    return data;
  }
  const foreverOptionId = "1554796912673170014";
  if (
    legacy.role_ids.length ||
    !isDeepStrictEqual(
      [...legacy.channel_ids].sort(),
      [...routes["TBC PvP"]].sort(),
    ) ||
    prompt.options.some(
      (option): boolean =>
        option.title === "TBC PvP" || option.title === "Forever PvP",
    ) ||
    identities.includes(foreverOptionId)
  )
    throw new Error(
      "The existing PvP answer changed; no interests or privileges were overwritten.",
    );
  const index = prompt.options.indexOf(legacy);
  prompt.options.splice(
    index,
    1,
    {
      ...legacy,
      title: "TBC PvP",
      description: "Find TBC arena and battleground teammates.",
      channel_ids: routes["TBC PvP"],
    },
    {
      id: foreverOptionId,
      title: "Forever PvP",
      description: "Find Forever battleground and world PvP groups.",
      channel_ids: routes["Forever PvP"],
      role_ids: [],
    },
  );
  return data;
}

const onboardingEmojiSchema = z.object({
  id: discordId.nullable().optional(),
  name: z.string().nullable().optional(),
  animated: z.boolean().optional(),
});

export function onboardingWritePayload(
  value: unknown,
): Record<string, unknown> {
  const data = onboardingSchema.parse(value);
  return {
    ...data,
    prompts: data.prompts.map((prompt) => ({
      ...prompt,
      options: prompt.options.map((option) => {
        const { emoji, ...fields } = option;
        const parsed = onboardingEmojiSchema.parse(emoji ?? {});
        if (!parsed.id && !parsed.name) return fields;
        return {
          ...fields,
          emoji_id: parsed.id ?? null,
          emoji_name: parsed.name ?? null,
          emoji_animated: parsed.animated ?? false,
        };
      }),
    })),
  };
}

function normalizedOnboarding(
  value: unknown,
): z.infer<typeof onboardingSchema> {
  const data = onboardingSchema.parse(value);
  data.default_channel_ids.sort();
  for (const prompt of data.prompts)
    for (const option of prompt.options) {
      option.channel_ids.sort();
      option.role_ids.sort();
      const emoji = onboardingEmojiSchema.parse(option.emoji ?? {});
      if (!emoji.id && !emoji.name) delete option.emoji;
      else
        option.emoji = {
          id: emoji.id ?? null,
          name: emoji.name ?? null,
          animated: emoji.animated ?? false,
        };
    }
  return data;
}

export function onboardingReadbackMatches(
  actual: unknown,
  desired: unknown,
  previous: unknown,
): boolean {
  const received = normalizedOnboarding(actual);
  const wanted = normalizedOnboarding(desired);
  const before = normalizedOnboarding(previous);
  const identities = before.prompts.flatMap((prompt): string[] => [
    prompt.id,
    ...prompt.options.map((option): string => option.id),
  ]);
  const actualIds = received.prompts.flatMap((prompt): string[] => [
    prompt.id,
    ...prompt.options.map((option): string => option.id),
  ]);
  if (
    received.prompts.length !== wanted.prompts.length ||
    new Set(actualIds).size !== actualIds.length
  )
    return false;
  for (const [index, prompt] of wanted.prompts.entries()) {
    const returned = received.prompts[index];
    const oldPrompt = before.prompts.find(
      (item): boolean => item.id === prompt.id,
    );
    if (
      !oldPrompt ||
      returned.id !== prompt.id ||
      returned.options.length !== prompt.options.length
    )
      return false;
    for (const [optionIndex, option] of prompt.options.entries()) {
      if (identities.includes(option.id)) continue;
      const actualOption = returned.options[optionIndex];
      if (
        option.id !== "1554796912673170014" ||
        option.title !== "Forever PvP" ||
        !oldPrompt.options.some(
          (item): boolean => item.title === "PvP groups",
        ) ||
        identities.includes(actualOption.id) ||
        !discordId.safeParse(actualOption.id).success
      )
        return false;
      // Only this newly created choice may receive a server-assigned identity.
      option.id = actualOption.id;
    }
  }
  return isDeepStrictEqual(received, wanted);
}
