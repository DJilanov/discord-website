import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import {
  channelCleanupTargets,
  cleanupApplicationId,
  cleanupGuildId,
} from "../content/discord-channel-cleanup";
import {
  auditChannelSchema,
  auditCredentialsSchema,
  channelPermissions,
  guildPermissions,
  hasDiscordPermission,
  type AuditCredentials,
  type DiscordAuditSnapshot,
} from "./discord-audit";
import { collectDiscordAudit, DiscordAuditError } from "./discord-audit-client";

const tagSchema = z
  .object({
    name: z.string().min(1).max(20),
    moderated: z.literal(false),
  })
  .strict();
const patchSchema = z
  .object({
    topic: z.string().min(1).max(4096),
    available_tags: z.array(tagSchema).min(1).max(20).optional(),
  })
  .strict();
export const channelCleanupPlanSchema = z
  .object({
    version: z.literal(1),
    applicationId: z.literal(cleanupApplicationId),
    guildId: z.literal(cleanupGuildId),
    createdAt: z.iso.datetime(),
    changes: z
      .array(
        z
          .object({
            before: auditChannelSchema,
            patch: patchSchema,
          })
          .strict(),
      )
      .max(channelCleanupTargets.length),
  })
  .strict();
export type ChannelCleanupPlan = z.infer<typeof channelCleanupPlanSchema>;
type Channel = z.infer<typeof auditChannelSchema>;
type Patch = z.infer<typeof patchSchema>;
const manageChannels = 1n << 4n;

function desiredPatch(id: string): Patch {
  const target = channelCleanupTargets.find((entry) => entry.id === id);
  if (!target)
    throw new DiscordAuditError(
      "Channel is outside the approved cleanup scope.",
    );
  return patchSchema.parse({
    topic: target.topic,
    ...(target.tags
      ? {
          available_tags: target.tags.map((name) => ({
            name,
            moderated: false,
          })),
        }
      : {}),
  });
}

function matchesPatch(channel: Channel, patch: Patch): boolean {
  return (
    channel.topic === patch.topic &&
    (!patch.available_tags ||
      isDeepStrictEqual(
        channel.available_tags?.map(({ name, moderated }) => ({
          name,
          moderated,
        })),
        patch.available_tags,
      ))
  );
}

function sameProtectedFields(before: Channel, current: Channel): boolean {
  // Topics and tags are the only mutable fields in this operation.
  const { topic: beforeTopic, available_tags: beforeTags, ...left } = before;
  const {
    topic: currentTopic,
    available_tags: currentTags,
    ...right
  } = current;
  void beforeTopic;
  void beforeTags;
  void currentTopic;
  void currentTags;
  return isDeepStrictEqual(left, right);
}

export function createChannelCleanupPlan(
  snapshot: DiscordAuditSnapshot,
): ChannelCleanupPlan {
  if (
    snapshot.guild.id !== cleanupGuildId ||
    snapshot.application.id !== cleanupApplicationId
  )
    throw new DiscordAuditError(
      "Cleanup is restricted to the owner-approved application and server.",
    );
  const changes: ChannelCleanupPlan["changes"] = [];
  for (const target of channelCleanupTargets) {
    const before = snapshot.channels.find(
      (channel) => channel.id === target.id,
    );
    if (
      !before ||
      before.type !== target.type ||
      before.guild_id !== cleanupGuildId
    )
      throw new DiscordAuditError(
        `Expected channel ${target.id} is missing or has changed type/server.`,
      );
    const patch = desiredPatch(target.id);
    if (matchesPatch(before, patch)) continue;
    // Never replace existing tags: their IDs may already be attached to posts.
    if (patch.available_tags && before.available_tags?.length) {
      const existing = before.available_tags.map(({ name, moderated }) => ({
        name,
        moderated,
      }));
      if (!isDeepStrictEqual(existing, patch.available_tags))
        throw new DiscordAuditError(
          `Forum ${target.id} already has different tags. Review instead of replacing them.`,
        );
      delete patch.available_tags;
    }
    changes.push({ before, patch });
  }
  return validateChannelCleanupPlan({
    version: 1,
    applicationId: cleanupApplicationId,
    guildId: cleanupGuildId,
    createdAt: snapshot.capturedAt,
    changes,
  });
}

export function validateChannelCleanupPlan(input: unknown): ChannelCleanupPlan {
  const result = channelCleanupPlanSchema.safeParse(input);
  if (!result.success)
    throw new DiscordAuditError(
      "Invalid cleanup plan. Generate a fresh plan; raw contents are not logged.",
    );
  const plan = result.data;
  const seen = new Set<string>();
  for (const { before, patch } of plan.changes) {
    const target = channelCleanupTargets.find(
      (entry) => entry.id === before.id,
    );
    const expected = desiredPatch(before.id);
    if (!patch.available_tags) delete expected.available_tags;
    if (
      !target ||
      seen.has(before.id) ||
      before.guild_id !== plan.guildId ||
      before.type !== target.type ||
      !isDeepStrictEqual(patch, expected) ||
      (before.type !== 15 && patch.topic.length > 1024)
    )
      throw new DiscordAuditError(
        "Cleanup plan differs from the fixed, reviewed topic/tag scope.",
      );
    if (patch.available_tags && before.available_tags?.length)
      throw new DiscordAuditError(
        "The cleanup cannot replace existing forum tags.",
      );
    seen.add(before.id);
  }
  return plan;
}

export function cleanupMissingPermissions(
  snapshot: DiscordAuditSnapshot,
  plan: ChannelCleanupPlan,
): string[] {
  const base = guildPermissions(
    snapshot.roles,
    snapshot.guild.id,
    snapshot.botRoleIds,
  );
  return plan.changes.flatMap(({ before }) => {
    const current = snapshot.channels.find(
      (channel) => channel.id === before.id,
    );
    if (!current) return [before.id];
    const permissions = channelPermissions(
      base,
      current,
      snapshot.guild.id,
      snapshot.botRoleIds,
      snapshot.bot.id,
    );
    return hasDiscordPermission(permissions, manageChannels) &&
      hasDiscordPermission(permissions, 1n << 10n)
      ? []
      : [before.id];
  });
}

export interface CleanupProgress {
  channelId: string;
  status: "pending" | "verified" | "already-applied";
  before: Channel;
  after?: Channel;
}
interface CleanupOptions {
  tokenRotationConfirmed: boolean;
  checkpoint: (progress: CleanupProgress) => Promise<void>;
  fetch?: typeof fetch;
  sleep?: (milliseconds: number) => Promise<void>;
}

export async function applyChannelCleanup(
  input: AuditCredentials,
  inputPlan: unknown,
  options: CleanupOptions,
): Promise<{ changed: number; skipped: number }> {
  const plan = validateChannelCleanupPlan(inputPlan);
  const credentials = auditCredentialsSchema.safeParse(input);
  if (
    !credentials.success ||
    input.applicationId !== plan.applicationId ||
    input.guildId !== plan.guildId
  )
    throw new DiscordAuditError(
      "Cleanup credentials do not match the approved application/server.",
    );
  if (!options.tokenRotationConfirmed)
    throw new DiscordAuditError(
      "Rotate the exposed bot token and confirm rotation before applying channel changes.",
    );
  const configured = credentials.data;
  const request = options.fetch ?? fetch;
  const sleep =
    options.sleep ??
    ((ms: number): Promise<void> =>
      new Promise((resolve) => setTimeout(resolve, ms)));
  const snapshot = await collectDiscordAudit(configured, {
    fetch: request,
    sleep,
  });
  const denied = cleanupMissingPermissions(snapshot, plan);
  if (denied.length)
    throw new DiscordAuditError(
      `Manage Channels/View Channels missing on ${denied.length} target channels. No changes made.`,
    );

  function checkCurrent(
    before: Channel,
    current: Channel,
    patch: Patch,
  ): "pending" | "already-applied" {
    if (!sameProtectedFields(before, current))
      throw new DiscordAuditError(
        `Channel ${before.id} changed outside the cleanup fields. Stop and review.`,
      );
    if (matchesPatch(current, patch)) return "already-applied";
    if (!isDeepStrictEqual(current, before))
      throw new DiscordAuditError(
        `Channel ${before.id} has stale topic/tag settings. Stop and review.`,
      );
    return "pending";
  }
  // Check the whole batch before the first PATCH, then each resource again.
  for (const change of plan.changes) {
    const current = snapshot.channels.find(
      (channel) => channel.id === change.before.id,
    );
    if (!current)
      throw new DiscordAuditError(
        "A target channel disappeared. No changes made.",
      );
    checkCurrent(change.before, current, change.patch);
  }

  async function channelRequest(id: string, patch?: Patch): Promise<Channel> {
    for (let attempt = 0; ; attempt++) {
      let response: Response;
      try {
        response = await request(`https://discord.com/api/v10/channels/${id}`, {
          method: patch ? "PATCH" : "GET",
          redirect: "error",
          headers: {
            Authorization: `Bot ${configured.token}`,
            "User-Agent":
              "DiscordBot (https://www.wowforeverdiscord.online, 0.1.0)",
            ...(patch
              ? {
                  "Content-Type": "application/json",
                  "X-Audit-Log-Reason":
                    "Owner-approved channel topic and forum tag cleanup",
                }
              : {}),
          },
          ...(patch ? { body: JSON.stringify(patch) } : {}),
          signal: AbortSignal.timeout(15_000),
        });
      } catch {
        throw new DiscordAuditError(
          "Discord request failed or timed out. Stop and inspect the journal/current channel before retrying; delivery may have succeeded.",
        );
      }
      if (response.status === 429) {
        const body: unknown = await response.json().catch(() => null);
        const retry = z
          .object({ retry_after: z.number().finite().min(0).max(30) })
          .safeParse(body);
        if (attempt >= 2 || !retry.success)
          throw new DiscordAuditError(
            "Discord rate limit exceeded cleanup retry bounds. Stop and resume after review.",
            429,
          );
        await sleep(Math.ceil(retry.data.retry_after * 1000) + 100);
        // The 429 response confirms rejection. Recheck the channel before retrying a write.
        if (patch) {
          const current = await channelRequest(id);
          const change = plan.changes.find((entry) => entry.before.id === id)!;
          if (checkCurrent(change.before, current, patch) === "already-applied")
            return current;
        }
        continue;
      }
      if (!response.ok) {
        await response.body?.cancel();
        throw new DiscordAuditError(
          `Discord channel operation failed (HTTP ${response.status}). Stop and review the journal; raw errors are suppressed.`,
          response.status,
        );
      }
      const data: unknown = await response.json().catch(() => null);
      const parsed = auditChannelSchema.safeParse(data);
      if (
        !parsed.success ||
        parsed.data.id !== id ||
        parsed.data.guild_id !== plan.guildId
      )
        throw new DiscordAuditError(
          "Discord returned an unexpected channel. Stop and reconcile the journal before retrying.",
        );
      return parsed.data;
    }
  }

  const result = { changed: 0, skipped: 0 };
  for (const { before, patch } of plan.changes) {
    const current = await channelRequest(before.id);
    const status = checkCurrent(before, current, patch);
    await options.checkpoint({
      channelId: before.id,
      status,
      before,
      ...(status === "already-applied" ? { after: current } : {}),
    });
    if (status === "already-applied") {
      result.skipped++;
      continue;
    }
    const returned = await channelRequest(before.id, patch);
    const after = await channelRequest(before.id);
    if (
      !sameProtectedFields(before, returned) ||
      !sameProtectedFields(before, after) ||
      !matchesPatch(returned, patch) ||
      !matchesPatch(after, patch)
    )
      throw new DiscordAuditError(
        `Channel ${before.id} did not verify. Stop and reconcile; do not replay blindly.`,
      );
    await options.checkpoint({
      channelId: before.id,
      status: "verified",
      before,
      after,
    });
    result.changed++;
    await sleep(300);
  }
  return result;
}
