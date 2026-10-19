import "./env";
import { mkdir, open, readFile, rename, lstat, unlink } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { z } from "zod";
import {
  kfcApplicationId,
  kfcGuildId,
  kfcRulesId,
} from "../content/kfc-community";
import { collectDiscordAudit } from "../lib/discord-audit-client";
import { auditCredentialsSchema, discordId } from "../lib/discord-audit";
import { assertKfcScope } from "../lib/kfc-community";
import { resourceMatches } from "../lib/kfc-revision";
import { assertRulesDeletion, retiredRulesIds } from "../lib/kfc-rules-cleanup";

const referencesSchema = z.object({
  rules_channel_id: discordId.nullable(),
  system_channel_id: discordId.nullable(),
  public_updates_channel_id: discordId.nullable(),
  safety_alerts_channel_id: discordId.nullable(),
  afk_channel_id: discordId.nullable(),
});
const messageSchema = z
  .object({
    id: discordId,
    channel_id: discordId,
    author: z.object({ id: discordId }).passthrough(),
    content: z.string(),
    embeds: z.array(z.unknown()),
    attachments: z.array(
      z
        .object({
          id: discordId,
          url: z.string().url(),
          size: z.number().int().nonnegative(),
        })
        .passthrough(),
    ),
    pinned: z.boolean().optional(),
  })
  .passthrough();
const threadSchema = z
  .object({
    id: discordId,
    guild_id: z.literal(kfcGuildId),
    parent_id: discordId,
    thread_metadata: z.object({ archive_timestamp: z.string() }).passthrough(),
  })
  .passthrough();

async function main(): Promise<void> {
  const { values } = parseArgs({ options: { apply: { type: "boolean" } } });
  const credentials = auditCredentialsSchema.parse({
    applicationId: kfcApplicationId,
    guildId: kfcGuildId,
    token: process.env.DISCORD_BOT_TOKEN || process.env.KFCBOT_TOKEN,
  });
  const snapshot = await collectDiscordAudit(credentials);
  assertKfcScope(snapshot);
  const onboardingIds =
    snapshot.onboarding.status === "available"
      ? [
          ...snapshot.onboarding.data.default_channel_ids,
          ...snapshot.onboarding.data.prompts.flatMap((p): string[] =>
            p.options.flatMap((o): string[] => o.channel_ids),
          ),
        ]
      : [];
  if (snapshot.onboarding.status !== "available")
    throw new Error(
      "Cannot verify onboarding references; no deletion attempted.",
    );
  const allowed = new Set<string>(retiredRulesIds);
  allowed.add(kfcRulesId);
  async function request(
    route: string,
    method: "GET" | "DELETE" = "GET",
  ): Promise<unknown> {
    const match =
      /^\/channels\/([1-9]\d{16,19})(?:\/(?:messages(?:\/pins)?|threads\/archived\/(?:public|private)))?(?:\?.*)?$/.exec(
        route,
      );
    if (method === "GET") {
      if (
        route !== `/guilds/${kfcGuildId}` &&
        route !== `/guilds/${kfcGuildId}/threads/active` &&
        !(match && allowed.has(match[1]))
      )
        throw new Error("Unapproved backup route.");
    } else {
      if (
        !values.apply ||
        !retiredRulesIds.some((id): boolean => route === `/channels/${id}`)
      )
        throw new Error("Unapproved deletion route.");
      const refs = referencesSchema.parse(
        await request(`/guilds/${kfcGuildId}`),
      );
      assertRulesDeletion(route.split("/")[2], refs, onboardingIds);
    }
    for (let attempt = 0; ; attempt++) {
      const response = await fetch(`https://discord.com/api/v10${route}`, {
        method,
        redirect: "error",
        signal: AbortSignal.timeout(15000),
        headers: {
          Authorization: `Bot ${credentials.token}`,
          "User-Agent":
            "DiscordBot (https://www.wowforeverdiscord.online, 0.1.0)",
          ...(method === "DELETE"
            ? {
                "X-Audit-Log-Reason":
                  "Owner requested removal of two duplicate rules channels after private backup",
              }
            : {}),
        },
      }).catch((): never => {
        throw new Error(
          "Backup/deletion result uncertain; reconcile before retrying.",
        );
      });
      if (response.status === 429 && attempt < 2) {
        const delay = z
          .object({ retry_after: z.number().nonnegative().max(30) })
          .parse(await response.json());
        await new Promise<void>((resolve): void => {
          setTimeout(resolve, Math.ceil(delay.retry_after * 1000) + 100);
        });
        if (method === "DELETE")
          assertRulesDeletion(
            route.split("/")[2],
            referencesSchema.parse(await request(`/guilds/${kfcGuildId}`)),
            onboardingIds,
          );
        continue;
      }
      if (method === "GET" && response.status === 404) {
        await response.body?.cancel();
        return null;
      }
      if (!response.ok) {
        await response.body?.cancel();
        throw new Error(
          `Rules operation refused (HTTP ${response.status}); details suppressed.`,
        );
      }
      return response.status === 204 ? null : response.json();
    }
  }
  const refs = referencesSchema.parse(await request(`/guilds/${kfcGuildId}`));
  for (const id of retiredRulesIds)
    assertRulesDeletion(id, refs, onboardingIds);
  const existing = retiredRulesIds.filter((id): boolean =>
    snapshot.channels.some((c): boolean => c.id === id),
  );
  if (!values.apply) {
    console.log(
      JSON.stringify({
        keep: kfcRulesId,
        delete: existing,
        mode: "preview-only",
        historyBackupRequired: true,
      }),
    );
    return;
  }
  const root = path.join(process.cwd(), ".data/kfc-rules-cleanup-20261009");
  await mkdir(root, { recursive: true, mode: 0o700 });
  const rootInfo = await lstat(root);
  if (
    !rootInfo.isDirectory() ||
    rootInfo.isSymbolicLink() ||
    (rootInfo.mode & 0o077) !== 0
  )
    throw new Error("Unsafe rules backup directory.");
  const lockPath = path.join(
    process.cwd(),
    ".data/kfc-community/operator.lock",
  );
  const lock = await open(lockPath, "wx", 0o600);
  const journal = await open(
    path.join(root, `${Date.now()}-journal.jsonl`),
    "wx",
    0o600,
  );
  async function checkpoint(record: Record<string, unknown>): Promise<void> {
    await journal.appendFile(
      JSON.stringify({ at: new Date().toISOString(), ...record }) + "\n",
    );
    await journal.sync();
  }
  async function saveBackup(name: string, value: unknown): Promise<void> {
    const serialized = JSON.stringify(value);
    if (
      serialized.includes(credentials.token) ||
      /[\w-]{20,}\.[\w-]{6}\.[\w-]{25,}/.test(serialized)
    )
      throw new Error(
        "Possible secret in backup; review without persisting it.",
      );
    const file = await open(path.join(root, name), "wx", 0o600);
    try {
      await file.writeFile(serialized + "\n");
      await file.sync();
    } finally {
      await file.close();
    }
  }
  try {
    const revisionPath = path.join(
      process.cwd(),
      ".data/kfc-revision/state.json",
    );
    const state = z
      .object({
        messages: z.record(
          z.string(),
          z
            .object({
              channelId: discordId,
              messageId: discordId,
              payload: z.unknown(),
            })
            .passthrough(),
        ),
        before: z.record(z.string(), z.unknown()),
        after: z.record(z.string(), z.unknown()),
      })
      .passthrough()
      .parse(JSON.parse(await readFile(revisionPath, "utf8")) as unknown);
    const binding = state.messages.rules;
    if (!binding || binding.channelId !== kfcRulesId)
      throw new Error(
        "Publish the maintained official rules before deleting duplicates.",
      );
    const liveRules = snapshot.channels.find(
      (c): boolean => c.id === kfcRulesId,
    );
    if (
      liveRules?.parent_id !== "1412555658108211280" ||
      liveRules.name !== "rules"
    )
      throw new Error("Official rules must be under Start Here.");
    const response = await fetch(
      `https://discord.com/api/v10/channels/${kfcRulesId}/messages/${binding.messageId}`,
      {
        method: "GET",
        redirect: "error",
        signal: AbortSignal.timeout(15000),
        headers: { Authorization: `Bot ${credentials.token}` },
      },
    );
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error("Cannot verify canonical rules publication.");
    }
    const current = messageSchema.parse(await response.json());
    if (
      current.author.id !== kfcApplicationId ||
      !current.pinned ||
      !resourceMatches(current, binding.payload)
    )
      throw new Error(
        "Canonical rules ownership/content/pin verification failed.",
      );
    const active = z
      .object({ threads: z.array(threadSchema) })
      .parse(await request(`/guilds/${kfcGuildId}/threads/active`)).threads;
    for (const id of existing) {
      const threads = active.filter((t): boolean => t.parent_id === id);
      for (const kind of ["public", "private"]) {
        let before: string | undefined;
        for (let page = 0; ; page++) {
          if (page >= 100)
            throw new Error("Thread backup limit reached; no deletion.");
          const query = new URLSearchParams({
            limit: "100",
            ...(before ? { before } : {}),
          });
          const result = z
            .object({ threads: z.array(threadSchema), has_more: z.boolean() })
            .parse(
              await request(
                `/channels/${id}/threads/archived/${kind}?${query}`,
              ),
            );
          if (result.threads.some((t): boolean => t.parent_id !== id))
            throw new Error("Unexpected thread parent in backup.");
          threads.push(...result.threads);
          if (!result.has_more) break;
          const cursor =
            result.threads.at(-1)?.thread_metadata.archive_timestamp;
          if (!cursor || cursor === before)
            throw new Error("Thread backup pagination stalled.");
          before = cursor;
        }
      }
      const unique = [
        ...new Map(
          threads.map((thread): [string, typeof thread] => [thread.id, thread]),
        ).values(),
      ];
      for (const thread of unique) allowed.add(thread.id);
      let total = 0,
        attachments = 0;
      for (const channelId of [
        id,
        ...unique.map((thread): string => thread.id),
      ]) {
        const messages: z.infer<typeof messageSchema>[] = [];
        let before: string | undefined;
        for (let page = 0; ; page++) {
          if (page >= 100)
            throw new Error("Message backup limit reached; no deletion.");
          const query = new URLSearchParams({
            limit: "100",
            ...(before ? { before } : {}),
          });
          const batch = z
            .array(messageSchema)
            .parse(await request(`/channels/${channelId}/messages?${query}`));
          if (
            batch.some((message): boolean => message.channel_id !== channelId)
          )
            throw new Error("Backup message channel mismatch.");
          messages.push(...batch);
          if (batch.length < 100) break;
          const cursor = batch.at(-1)?.id;
          if (!cursor || cursor === before)
            throw new Error("Message backup pagination stalled.");
          before = cursor;
        }
        attachments += messages.reduce(
          (count, message): number => count + message.attachments.length,
          0,
        );
        if (messages.some((message): boolean => message.attachments.length > 0))
          throw new Error(
            "This rules history has attachment files. Back up those files before deletion; metadata alone is insufficient.",
          );
        await saveBackup(`${Date.now()}-${channelId}.json`, {
          channel: await request(`/channels/${channelId}`),
          messages,
        });
        total += messages.length;
      }
      await checkpoint({
        operation: "backup-complete",
        channelId: id,
        messages: total,
        threads: unique.length,
        attachments,
      });
      const fresh = await collectDiscordAudit(credentials);
      if (fresh.guild.rules_channel_id !== kfcRulesId)
        throw new Error("Owner changed official rules before deletion.");
      if (fresh.onboarding.status !== "available")
        throw new Error("Cannot recheck onboarding before deletion.");
      const freshIds = [
        ...fresh.onboarding.data.default_channel_ids,
        ...fresh.onboarding.data.prompts.flatMap((p): string[] =>
          p.options.flatMap((o): string[] => o.channel_ids),
        ),
      ];
      assertRulesDeletion(
        id,
        referencesSchema.parse(await request(`/guilds/${kfcGuildId}`)),
        freshIds,
      );
      await checkpoint({
        operation: "delete-channel",
        channelId: id,
        status: "pending",
      });
      await request(`/channels/${id}`, "DELETE");
      if ((await request(`/channels/${id}`)) !== null)
        throw new Error("Deleted channel is still present.");
      await checkpoint({
        operation: "delete-channel",
        channelId: id,
        status: "verified",
      });
      console.log(
        `Deleted duplicate rules channel ${id}; ${total} messages backed up privately.`,
      );
    }
    await saveBackup(`${Date.now()}-revision-before.json`, state);
    for (const id of retiredRulesIds) {
      for (const [key, binding] of Object.entries(state.messages))
        if (binding.channelId === id) delete state.messages[key];
      delete state.before[id];
      delete state.after[id];
    }
    const temporary = `${revisionPath}.${process.pid}.tmp`;
    const file = await open(temporary, "wx", 0o600);
    try {
      await file.writeFile(JSON.stringify(state) + "\n");
      await file.sync();
    } finally {
      await file.close();
    }
    await rename(temporary, revisionPath);
    const after = await collectDiscordAudit(credentials);
    const remaining = after.channels.filter((c): boolean => c.name === "rules");
    if (
      remaining.length !== 1 ||
      remaining[0].id !== kfcRulesId ||
      after.guild.rules_channel_id !== kfcRulesId
    )
      throw new Error("Final single-rules-channel verification failed.");
    console.log(
      JSON.stringify({
        status: "verified",
        rulesChannelId: kfcRulesId,
        rulesChannels: 1,
        deleted: existing,
        backup: ".data/kfc-rules-cleanup-20261009",
      }),
    );
  } finally {
    await journal.close();
    await lock.close();
    await unlink(lockPath);
  }
}
main().catch((error: unknown): void => {
  console.error(
    error instanceof Error ? error.message : "Rules cleanup failed.",
  );
  process.exitCode = 1;
});
