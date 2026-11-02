import "./env";
import {
  mkdir,
  readFile,
  writeFile,
  rename,
  open,
  unlink,
  lstat,
} from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { createHash } from "node:crypto";
import { z } from "zod";
import {
  classLabs,
  classLabRelease,
  classLabBotId,
  classLabGuildId,
  classLabCategoryId,
  classLabDiscussionId,
  classLabIndex,
  classLabMessage,
  classLabIndexMessage,
  classLabThreadName,
  classLabThreadStarter,
  classLabAnnouncement,
  type ClassLabMessage,
} from "../content/kfc-class-labs";
import {
  assertClassLabPayload,
  classLabPayloadUrls,
  classLabChannelSchema,
  classLabReadMessageSchema,
  assertClassLabOwner,
  classLabReadbackMatches,
  classLabPermissionFingerprint,
  classLabMessageChecksum,
  assertClassLabDiscussion,
  assertClassLabThread,
  type ClassLabChannel,
  type ClassLabReadMessage,
} from "../lib/kfc-class-labs";
import { auditCredentialsSchema } from "../lib/discord-audit";
import { kfcRequest } from "../lib/kfc-community";

const snowflake = z.string().regex(/^[1-9]\d{16,19}$/);
const stateSchema = z.object({
  release: z.literal(classLabRelease),
  guildId: z.literal(classLabGuildId),
  threads: z.record(z.string(), snowflake),
  posts: z.record(
    z.string(),
    z.object({ channelId: snowflake, messageId: snowflake }),
  ),
  beforeChannels: z.record(snowflake, classLabChannelSchema),
  beforeMessages: z.record(snowflake, classLabReadMessageSchema),
  pending: z.string().nullable(),
  completedAt: z.string().nullable(),
});
type PublicationState = z.infer<typeof stateSchema>;

function missing(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

async function publish(apply: boolean, root: string): Promise<void> {
  const credentials = auditCredentialsSchema.parse({
    applicationId: classLabBotId,
    guildId: classLabGuildId,
    token: process.env.DISCORD_BOT_TOKEN || process.env.KFCBOT_TOKEN,
  });
  const statePath = path.join(root, "state.json");
  let state: PublicationState = {
    release: classLabRelease,
    guildId: classLabGuildId,
    threads: {},
    posts: {},
    beforeChannels: {},
    beforeMessages: {},
    pending: null,
    completedAt: null,
  };
  try {
    const info = await lstat(statePath);
    if (!info.isFile() || info.isSymbolicLink() || (info.mode & 0o077) !== 0)
      throw new Error("Unsafe class publication journal");
    state = stateSchema.parse(JSON.parse(await readFile(statePath, "utf8")));
  } catch (error: unknown) {
    if (!missing(error)) throw error;
  }
  if (state.pending)
    throw new Error(
      `An uncertain operation is recorded (${state.pending}); inspect its exact destination before reconciling the journal`,
    );
  const allowed = new Set([
    classLabIndex.channelId,
    classLabDiscussionId,
    ...classLabs.map((lab): string => lab.channelId),
    ...Object.values(state.threads),
  ]);
  const identityResponse = await fetch(
    "https://discord.com/api/v10/users/@me",
    {
      headers: { Authorization: `Bot ${credentials.token}` },
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!identityResponse.ok)
    throw new Error(
      `Bot identity check failed with HTTP ${identityResponse.status}`,
    );
  const identity = z
    .object({ id: snowflake, bot: z.literal(true) })
    .parse(await identityResponse.json());
  if (identity.id !== classLabBotId) throw new Error("Unexpected bot identity");

  async function request(
    route: string,
    method: "GET" | "POST" | "PATCH" = "GET",
    body?: unknown,
  ): Promise<unknown> {
    if (!apply && method !== "GET")
      throw new Error("Preview cannot write to Discord");
    return kfcRequest(credentials, route, method, body, {
      channelIds: allowed,
      transport: async (
        input: string | URL | Request,
        init?: RequestInit,
      ): Promise<Response> => {
        const headers = new Headers(init?.headers);
        if (method !== "GET")
          headers.set(
            "X-Audit-Log-Reason",
            "Owner-approved KFC level-60 class guides and discussion threads",
          );
        return fetch(input, { ...init, headers });
      },
    });
  }
  async function channel(id: string): Promise<ClassLabChannel> {
    const current = classLabChannelSchema.parse(
      await request(`/channels/${id}`),
    );
    if (current.id !== id || current.guild_id !== classLabGuildId)
      throw new Error("Class channel identity changed");
    return current;
  }
  async function message(
    channelId: string,
    messageId: string,
  ): Promise<ClassLabReadMessage> {
    const current = classLabReadMessageSchema.parse(
      await request(`/channels/${channelId}/messages/${messageId}`),
    );
    if (
      current.channel_id !== channelId ||
      current.id !== messageId ||
      current.author.id !== classLabBotId ||
      current.author.bot !== true
    )
      throw new Error("Message is not the expected bot-owned resource");
    return current;
  }

  const baselines = new Map<string, ClassLabChannel>();
  const originals = new Map<string, ClassLabReadMessage>();
  const targets = [classLabIndex, ...classLabs];
  for (const target of targets) {
    const current = await channel(target.channelId);
    if (current.type !== 0 || current.parent_id !== classLabCategoryId)
      throw new Error("Class resource moved outside its approved category");
    baselines.set(current.id, current);
    originals.set(
      target.messageId,
      assertClassLabOwner(
        await message(current.id, target.messageId),
        current.id,
        target.messageId,
      ),
    );
    if (state.completedAt) {
      const lab = classLabs.find(
        (candidate): boolean => candidate.channelId === target.channelId,
      );
      const expected = lab
        ? classLabMessage(lab, state.threads[lab.slug] || "")
        : classLabIndexMessage();
      if (!classLabReadbackMatches(originals.get(target.messageId), expected))
        throw new Error(
          "A completed class guide changed; review a new release instead of overwriting it",
        );
    }
  }
  const discussion = await channel(classLabDiscussionId);
  assertClassLabDiscussion(discussion);
  baselines.set(discussion.id, discussion);
  for (const id of Object.values(state.threads))
    assertClassLabThread(await channel(id));

  const resources = new Set<string>();
  for (const lab of classLabs) {
    const payload = classLabMessage(
      lab,
      state.threads[lab.slug] || classLabDiscussionId,
    );
    assertClassLabPayload(payload);
    for (const url of classLabPayloadUrls(payload))
      if (new URL(url).hostname !== "discord.com") resources.add(url);
    if (
      classLabThreadStarter(lab).length > 2000 ||
      /<@|@everyone|@here/.test(classLabThreadStarter(lab))
    )
      throw new Error("Unsafe discussion starter");
  }
  const index = classLabIndexMessage();
  assertClassLabPayload(index);
  for (const url of classLabPayloadUrls(index))
    if (new URL(url).hostname !== "discord.com") resources.add(url);
  const checked: { url: string; status: number; contentType: string }[] = [];
  for (const url of resources) {
    const response = await fetch(url, {
      redirect: "error",
      signal: AbortSignal.timeout(20000),
    });
    const contentType = response.headers.get("content-type") || "";
    await response.body?.cancel();
    if (
      response.status !== 200 ||
      !(url.endsWith(".jpg")
        ? contentType.startsWith("image/")
        : contentType.includes("text/html"))
    )
      throw new Error(
        `Class resource unavailable: ${url} (HTTP ${response.status})`,
      );
    checked.push({ url, status: response.status, contentType });
  }
  await writeFile(
    path.join(root, "resource-checks.json"),
    JSON.stringify(
      { checkedAt: new Date().toISOString(), resources: checked },
      null,
      2,
    ) + "\n",
    { mode: 0o600 },
  );
  if (!apply) {
    console.log(
      JSON.stringify({
        mode: "preview",
        guildId: classLabGuildId,
        existingPins: targets.length,
        classes: classLabs.length,
        discussionParent: classLabDiscussionId,
        checkedResources: checked.length,
        plannedThreads: classLabs.filter(
          (lab): boolean => !state.threads[lab.slug],
        ).length,
        permissionChanges: 0,
        completedAt: state.completedAt,
      }),
    );
    return;
  }

  const journal = await open(
    path.join(root, `${new Date().toISOString().replaceAll(":", "-")}.jsonl`),
    "wx",
    0o600,
  );
  async function checkpoint(event: Record<string, unknown>): Promise<void> {
    await journal.appendFile(
      JSON.stringify({ at: new Date().toISOString(), ...event }) + "\n",
    );
    await journal.sync();
    const temporary = `${statePath}.${process.pid}.tmp`;
    await writeFile(
      temporary,
      JSON.stringify(stateSchema.parse(state), null, 2) + "\n",
      { flag: "wx", mode: 0o600 },
    );
    await rename(temporary, statePath);
  }
  async function unchanged(id: string): Promise<void> {
    const before = baselines.get(id);
    if (
      !before ||
      classLabPermissionFingerprint(await channel(id)) !==
        classLabPermissionFingerprint(before)
    )
      throw new Error(
        "Channel permissions changed during publication; stop without restoring someone else's changes",
      );
  }
  async function post(
    key: string,
    channelId: string,
    content: string,
  ): Promise<void> {
    const existing = state.posts[key];
    if (existing) {
      const current = await message(existing.channelId, existing.messageId);
      if (
        existing.channelId !== channelId ||
        current.content !== content ||
        current.mention_everyone ||
        current.mentions.length ||
        current.mention_roles.length
      )
        throw new Error(
          "Published starter changed; review instead of duplicating it",
        );
      return;
    }
    if (content.length > 2000 || /<@|@everyone|@here/.test(content))
      throw new Error("Unsafe class discussion message");
    state.pending = `message:${key}:${channelId}`;
    await checkpoint({ kind: "message-request", key, channelId });
    const nonce = createHash("sha256")
      .update(`${classLabRelease}:${key}`)
      .digest("hex")
      .slice(0, 24);
    const created = classLabReadMessageSchema.parse(
      await request(`/channels/${channelId}/messages`, "POST", {
        content,
        flags: 4,
        nonce,
        enforce_nonce: true,
        allowed_mentions: {
          parse: [],
          users: [],
          roles: [],
          replied_user: false,
        },
      }),
    );
    if (
      created.channel_id !== channelId ||
      created.author.id !== classLabBotId ||
      created.content !== content ||
      created.mention_everyone ||
      created.mentions.length ||
      created.mention_roles.length
    )
      throw new Error("Created class message failed its readback");
    state.posts[key] = { channelId, messageId: created.id };
    state.pending = null;
    await checkpoint({
      kind: "message-published",
      key,
      channelId,
      messageId: created.id,
    });
  }
  async function update(
    target: { channelId: string; messageId: string },
    payload: ClassLabMessage,
    topic: string,
  ): Promise<void> {
    assertClassLabPayload(payload);
    const current = await message(target.channelId, target.messageId);
    const original = originals.get(target.messageId);
    if (
      !original ||
      classLabMessageChecksum(current) !== classLabMessageChecksum(original)
    )
      throw new Error("A class resource changed after preflight");
    await unchanged(target.channelId);
    if (!classLabReadbackMatches(current, payload)) {
      const changed = await request(
        `/channels/${target.channelId}/messages/${target.messageId}`,
        "PATCH",
        payload,
      );
      assertClassLabOwner(changed, target.channelId, target.messageId);
      if (!classLabReadbackMatches(changed, payload))
        throw new Error(
          "Class guide update did not match its reviewed payload",
        );
      originals.set(target.messageId, classLabReadMessageSchema.parse(changed));
      await checkpoint({
        kind: "guide-updated",
        channelId: target.channelId,
        messageId: target.messageId,
      });
    }
    const live = await channel(target.channelId);
    const before = state.beforeChannels[target.channelId];
    if (before && live.topic !== before.topic && live.topic !== topic)
      throw new Error("An owner-edited topic needs review before replacement");
    if (live.topic !== topic) {
      await request(`/channels/${target.channelId}`, "PATCH", { topic });
      const readback = await channel(target.channelId);
      if (readback.topic !== topic)
        throw new Error("Class topic update failed its readback");
      await unchanged(target.channelId);
      await checkpoint({ kind: "topic-updated", channelId: target.channelId });
    }
  }
  try {
    for (const [id, current] of baselines) state.beforeChannels[id] ??= current;
    for (const [id, current] of originals) state.beforeMessages[id] ??= current;
    await checkpoint({
      kind: "begin",
      guildId: classLabGuildId,
      resourceCount: checked.length,
    });
    for (const lab of classLabs) {
      await unchanged(classLabDiscussionId);
      if (!state.threads[lab.slug]) {
        state.pending = `thread:${lab.slug}`;
        await checkpoint({
          kind: "thread-request",
          slug: lab.slug,
          parentId: classLabDiscussionId,
        });
        const created = assertClassLabThread(
          await request(`/channels/${classLabDiscussionId}/threads`, "POST", {
            name: classLabThreadName(lab),
            type: 11,
            auto_archive_duration: 1440,
          }),
        );
        state.threads[lab.slug] = created.id;
        allowed.add(created.id);
        state.pending = null;
        await checkpoint({
          kind: "thread-created",
          slug: lab.slug,
          channelId: created.id,
        });
      }
      const threadId = state.threads[lab.slug];
      if (!threadId) throw new Error("Missing class discussion identity");
      assertClassLabThread(await channel(threadId));
      await post(`starter:${lab.slug}`, threadId, classLabThreadStarter(lab));
      await update(
        lab,
        classLabMessage(lab, threadId),
        `WoW Forever ${lab.name} at level 60: our guides, talent calculator and role-specific simulators. Use Discuss on the pinned guide for builds and questions. Check each model's version and assumptions.`,
      );
    }
    await update(
      classLabIndex,
      index,
      "WoW Forever level-60 class guides, talent calculators and damage/tank/healer simulators. Each pinned class guide links its discussion thread. TBC stays separate; beta results are models, not live logs.",
    );
    await unchanged(classLabDiscussionId);
    await post("announcement", classLabDiscussionId, classLabAnnouncement());
    for (const target of targets) {
      const lab = classLabs.find(
        (candidate): boolean => candidate.channelId === target.channelId,
      );
      const expected = lab
        ? classLabMessage(lab, state.threads[lab.slug] || "")
        : index;
      if (
        !classLabReadbackMatches(
          await message(target.channelId, target.messageId),
          expected,
        )
      )
        throw new Error("Final class guide readback failed");
      await unchanged(target.channelId);
    }
    await unchanged(classLabDiscussionId);
    state.completedAt = new Date().toISOString();
    await checkpoint({
      kind: "complete",
      guides: targets.length,
      threads: Object.keys(state.threads).length,
      posts: Object.keys(state.posts).length,
      permissionChanges: 0,
    });
    console.log(
      JSON.stringify({
        status: "published",
        guildId: classLabGuildId,
        guides: targets.length,
        threads: state.threads,
        announcement: state.posts.announcement,
        resourceCount: checked.length,
        permissionChanges: 0,
        completedAt: state.completedAt,
      }),
    );
  } finally {
    await journal.close();
  }
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: { apply: { type: "boolean" }, help: { type: "boolean" } },
  });
  if (values.help) {
    console.log(
      "GET-only preview by default. --apply publishes the owner-approved KFC-only class labs: updates ten existing bot pins/topics, creates nine public threads in Forever discussion and sends one untagged heads-up. No permission changes, deletions, role pings, crossposts, DMs or scheduling. An uncertain creation stops for journal reconciliation, never blind retry.",
    );
    return;
  }
  const root = path.resolve(
    process.env.KFC_CLASS_LAB_STATE_DIR || ".data/kfc-class-labs-20261031",
  );
  await mkdir(root, { recursive: true, mode: 0o700 });
  const directory = await lstat(root);
  if (
    !directory.isDirectory() ||
    directory.isSymbolicLink() ||
    (directory.mode & 0o077) !== 0
  )
    throw new Error("Class publication state requires a private directory");
  const lockPath = path.join(root, "operator.lock");
  const lock = await open(lockPath, "wx", 0o600);
  try {
    await publish(Boolean(values.apply), root);
  } finally {
    await lock.close();
    await unlink(lockPath);
  }
}

main().catch((error: unknown): void => {
  console.error(
    error instanceof Error
      ? error.message
      : "Class resource publication failed; raw upstream details suppressed",
  );
  process.exitCode = 1;
});
