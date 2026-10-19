import "./env";
import {
  mkdir,
  open,
  readFile,
  rename,
  unlink,
  lstat,
  type FileHandle,
} from "node:fs/promises";
import path from "node:path";
import { isDeepStrictEqual, parseArgs } from "node:util";
import { z } from "zod";
import {
  kfcApplicationId,
  kfcGuildId,
  kfcArchiveId,
  kfcRulesId,
} from "../content/kfc-community";
import {
  revision,
  revisionTargets,
  newRevisionChannels,
  revisionResources,
  type RevisionChannel,
  type RevisionResource,
} from "../content/kfc-revision";
import {
  auditCredentialsSchema,
  discordId,
  type DiscordAuditSnapshot,
} from "../lib/discord-audit";
import {
  collectDiscordAudit,
  DiscordAuditError,
} from "../lib/discord-audit-client";
import {
  experienceChannelSchema,
  experiencePatchMatches,
  assertExperienceUnchanged,
  type ExperienceChannel,
  type ExperiencePatch,
} from "../lib/discord-channel-experience";
import {
  assertKfcScope,
  kfcOverwrites,
  kfcRequest,
} from "../lib/kfc-community";
import {
  assertRevisionAudience,
  resourceMatches,
  resourceChecksum,
  attachClassSubscriptions,
  splitPvpSubscriptions,
  onboardingReadbackMatches,
  onboardingWritePayload,
  forumCreationFields,
  botMaintenancePatch,
} from "../lib/kfc-revision";

const messageSchema = z.object({
  id: discordId,
  channel_id: discordId,
  author: z.object({ id: discordId }),
  content: z.string(),
  embeds: z.array(z.unknown()),
  pinned: z.boolean().optional(),
});
const stateSchema = z
  .object({
    revision: z.literal(revision),
    guildId: z.literal(kfcGuildId),
    channels: z.record(z.string(), discordId),
    before: z.record(discordId, experienceChannelSchema),
    after: z.record(discordId, experienceChannelSchema),
    messages: z.record(
      z.string(),
      z.object({
        channelId: discordId,
        messageId: discordId,
        payload: z.unknown(),
        checksum: z.string(),
        publishedAt: z.string(),
      }),
    ),
    pendingCreation: z.string().nullable(),
    originalRules: discordId.nullable().optional(),
    rulesDeferred: z.boolean().default(false),
    originalOnboarding: z.unknown().optional(),
    expectedOnboarding: z.unknown().optional(),
  })
  .strict();
type State = z.infer<typeof stateSchema>;

async function privateDirectory(root: string): Promise<void> {
  await mkdir(root, { recursive: true, mode: 0o700 });
  const info = await lstat(root);
  if (!info.isDirectory() || info.isSymbolicLink() || (info.mode & 0o077) !== 0)
    throw new Error("Revision state must use a private directory.");
}
async function privateJson(file: string): Promise<unknown> {
  const info = await lstat(file);
  if (!info.isFile() || info.isSymbolicLink() || (info.mode & 0o077) !== 0)
    throw new Error("Unsafe revision state file.");
  return JSON.parse(await readFile(file, "utf8")) as unknown;
}
function missingFile(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      apply: { type: "boolean" },
      applications: { type: "boolean" },
      onboarding: { type: "boolean" },
      "maintenance-access": { type: "boolean" },
      reconcile: { type: "boolean" },
      help: { type: "boolean" },
    },
  });
  if (values.help) {
    console.log(
      "GET-only preview by default; --apply executes the approved October 9 KFC revision. After the initial revision, --applications limits work to application channels and welcome/joining links; --onboarding limits work to edition-specific PvP and class subscriptions, preserving the enabled state; --maintenance-access changes only the bot's explicit access to existing maintained resources and the crafting forum. Choose only one scope. --onboarding --apply --reconcile records an already accepted update only if it exactly matches the approved transformation. Preserves history and audiences; never edits roles or live event messages. Recovery: .data/kfc-revision. Native screening and Server Guide remain owner UI tasks.",
    );
    return;
  }
  const apply = Boolean(values.apply);
  const applicationsOnly = Boolean(values.applications);
  const onboardingOnly = Boolean(values.onboarding);
  const maintenanceOnly = Boolean(values["maintenance-access"]);
  if (
    [applicationsOnly, onboardingOnly, maintenanceOnly].filter(Boolean).length >
    1
  )
    throw new Error(
      "Choose only one update scope: applications, onboarding or maintenance-access.",
    );
  if (values.reconcile && (!onboardingOnly || !apply))
    throw new Error("Reconciliation requires --onboarding --apply.");
  const scopedUpdate = applicationsOnly || onboardingOnly || maintenanceOnly;
  const credentials = auditCredentialsSchema.parse({
    applicationId: kfcApplicationId,
    guildId: kfcGuildId,
    token: process.env.DISCORD_BOT_TOKEN || process.env.KFCBOT_TOKEN,
  });
  const root = path.join(process.cwd(), ".data/kfc-revision");
  const legacyRoot = path.join(process.cwd(), ".data/kfc-community");
  await privateDirectory(root);
  await privateDirectory(legacyRoot);
  const statePath = path.join(root, "state.json");
  let state: State = {
    revision,
    guildId: kfcGuildId,
    channels: {},
    before: {},
    after: {},
    messages: {},
    pendingCreation: null,
    rulesDeferred: false,
  };
  try {
    state = stateSchema.parse(await privateJson(statePath));
  } catch (error: unknown) {
    if (!missingFile(error)) throw error;
  }
  if (state.pendingCreation)
    throw new Error(
      "Uncertain creation recorded. Reconcile its ID using the private journal; never retry blindly.",
    );
  if (
    scopedUpdate &&
    newRevisionChannels.some(
      (target): boolean =>
        target.key !== "application-forever" && !state.channels[target.key],
    )
  )
    throw new Error("The initial revision must finish before a scoped update.");
  const legacy = z
    .object({
      messages: z.record(
        z.string(),
        z.object({
          channelId: discordId,
          messageId: discordId,
          payload: z.unknown(),
        }),
      ),
    })
    .parse(await privateJson(path.join(legacyRoot, "state.json")));
  const lockPath = path.join(legacyRoot, "operator.lock");
  let lock: FileHandle | undefined, journal: FileHandle | undefined;
  let changes = 0;
  try {
    if (apply) {
      lock = await open(lockPath, "wx", 0o600);
      await lock.writeFile(String(process.pid));
      journal = await open(
        path.join(
          root,
          `${new Date().toISOString().replaceAll(":", "-")}.jsonl`,
        ),
        "wx",
        0o600,
      );
    }
    async function checkpoint(record: Record<string, unknown>): Promise<void> {
      if (!journal) throw new Error("Missing revision journal.");
      await journal.appendFile(
        JSON.stringify({ at: new Date().toISOString(), revision, ...record }) +
          "\n",
      );
      await journal.sync();
    }
    async function save(): Promise<void> {
      const temporary = `${statePath}.${process.pid}.tmp`;
      const file = await open(temporary, "wx", 0o600);
      try {
        await file.writeFile(JSON.stringify(stateSchema.parse(state)) + "\n");
        await file.sync();
      } finally {
        await file.close();
      }
      await rename(temporary, statePath);
    }
    let snapshot: DiscordAuditSnapshot = await collectDiscordAudit(credentials);
    assertKfcScope(snapshot);
    const baselineIds = snapshot.channels.map((c): string => c.id);
    const allowed = new Set([...baselineIds, ...Object.values(state.channels)]);
    async function request(
      route: string,
      method: "GET" | "POST" | "PUT" | "PATCH" = "GET",
      body?: unknown,
      recheck?: () => Promise<void>,
    ): Promise<unknown> {
      if (!apply && method !== "GET") throw new Error("Preview cannot write.");
      return kfcRequest(credentials, route, method, body, {
        channelIds: allowed,
        recheck,
      });
    }
    async function channel(id: string): Promise<ExperienceChannel> {
      const data = experienceChannelSchema.parse(
        await request(`/channels/${discordId.parse(id)}`),
      );
      if (data.id !== id || data.guild_id !== kfcGuildId)
        throw new Error("Channel identity mismatch.");
      return data;
    }
    async function creation(
      key: string,
      route: string,
      payload: unknown,
    ): Promise<unknown> {
      if (state.pendingCreation)
        throw new Error("Another creation is unresolved.");
      state.pendingCreation = key;
      await save();
      await checkpoint({
        operation: "create",
        key,
        route,
        payload,
        status: "pending",
      });
      try {
        return await request(route, "POST", payload);
      } catch (error: unknown) {
        if (
          error instanceof DiscordAuditError &&
          error.httpStatus &&
          error.httpStatus >= 400 &&
          error.httpStatus < 500
        ) {
          state.pendingCreation = null;
          await save();
        }
        throw error;
      }
    }
    async function patchChannel(
      id: string,
      patch: ExperiencePatch,
    ): Promise<void> {
      const before = await channel(id);
      if (state.after[id]) assertExperienceUnchanged(state.after[id], before);
      if (experiencePatchMatches(before, patch)) return;
      assertRevisionAudience(
        before,
        experienceChannelSchema.parse({ ...before, ...patch }),
        snapshot,
      );
      changes++;
      console.log(
        `${apply ? "Update" : "Would update"}: ${patch.name ?? before.name}`,
      );
      if (!apply) return;
      state.before[id] ??= before;
      await save();
      const destination = patch.parent_id
        ? await channel(patch.parent_id)
        : null;
      if (destination && destination.type !== 4)
        throw new Error("Destination isn't a category.");
      const guard = async (): Promise<void> => {
        assertExperienceUnchanged(before, await channel(id));
        if (destination)
          assertExperienceUnchanged(destination, await channel(destination.id));
      };
      await checkpoint({
        operation: "patch-channel",
        id,
        before,
        patch,
        status: "pending",
      });
      await request(`/channels/${id}`, "PATCH", patch, guard);
      const after = await channel(id);
      assertRevisionAudience(before, after, snapshot);
      if (!experiencePatchMatches(after, patch))
        throw new Error("Channel read-back mismatch.");
      state.after[id] = after;
      await save();
      await checkpoint({ operation: "patch-channel", id, status: "verified" });
    }
    if (maintenanceOnly) {
      const ids = new Set([
        legacy.messages.calendar.channelId,
        ...revisionResources(state.channels).map(
          (resource): string => resource.channelId,
        ),
        state.channels.crafting,
      ]);
      for (const id of ids) {
        const before = await channel(id);
        await patchChannel(
          id,
          botMaintenancePatch(before, id === state.channels.crafting),
        );
      }
      const after = await collectDiscordAudit(credentials);
      if (
        baselineIds.some(
          (id): boolean =>
            !after.channels.some((entry): boolean => entry.id === id),
        )
      )
        throw new Error(
          "A channel disappeared during maintenance access review.",
        );
      console.log(
        JSON.stringify({
          status: apply ? "applied-and-read-back" : "preview-only",
          scope: "maintenance-access",
          changes,
          channelsRetained: baselineIds.length,
          ordinaryAudiencesPreserved: true,
          rolesAndOnboardingUnchanged: true,
          privateState: ".data/kfc-revision",
        }),
      );
      return;
    }
    async function createChannel(target: RevisionChannel): Promise<void> {
      const parentId = target.parentKey
        ? state.channels[target.parentKey]
        : target.parentId;
      const recorded = state.channels[target.key];
      if (recorded) {
        const actual = await channel(recorded);
        if (
          actual.name !== target.name ||
          actual.type !== target.type ||
          (actual.parent_id ?? null) !== (parentId ?? null)
        )
          throw new Error("Created channel changed outside the revision.");
        if (state.after[recorded])
          assertExperienceUnchanged(state.after[recorded], actual);
        allowed.add(actual.id);
        return;
      }
      if (
        snapshot.channels.some(
          (c): boolean =>
            c.name === target.name &&
            c.type === target.type &&
            (c.parent_id ?? null) === (parentId ?? null),
        )
      )
        throw new Error(
          "Unrecorded channel collision requires reconciliation.",
        );
      changes++;
      console.log(`${apply ? "Create" : "Would create"}: ${target.name}`);
      if (!apply) return;
      if (target.parentKey && !parentId)
        throw new Error("Missing parent category.");
      const template: ExperienceChannel = {
        id: kfcGuildId,
        guild_id: kfcGuildId,
        name: target.name,
        type: target.type,
        parent_id: parentId ?? null,
        position: 0,
        permission_overwrites: [],
      };
      const payload = {
        name: target.name,
        type: target.type,
        parent_id: parentId ?? null,
        permission_overwrites: kfcOverwrites(
          template,
          snapshot,
          target.type === 15 ? "chat" : "read-only",
        ),
        ...(target.topic ? { topic: target.topic } : {}),
        ...(target.type === 15 ? forumCreationFields(target.tags!) : {}),
      };
      const result = experienceChannelSchema.parse(
        await creation(
          `channel:${target.key}`,
          `/guilds/${kfcGuildId}/channels`,
          payload,
        ),
      );
      if (
        result.guild_id !== kfcGuildId ||
        result.type !== target.type ||
        result.name !== target.name
      )
        throw new Error("Created channel identity mismatch.");
      state.channels[target.key] = result.id;
      state.pendingCreation = null;
      allowed.add(result.id);
      await save();
      const actual = await channel(result.id);
      const { parent_id: createdParent, ...createdPatch } = payload;
      if (
        actual.parent_id !== createdParent ||
        !experiencePatchMatches(actual, createdPatch)
      )
        throw new Error("Created channel read-back mismatch.");
      state.after[result.id] = actual;
      await save();
      await checkpoint({
        operation: "create-channel",
        key: target.key,
        channelId: result.id,
        status: "verified",
      });
    }
    // Check existing managed posts before creating any replacement channels.
    for (const key of [
      "welcome",
      "joining",
      "loot",
      "preparation",
      "tools",
      "guides",
      "class",
    ]) {
      if (onboardingOnly) continue;
      if (applicationsOnly && key !== "welcome" && key !== "joining") continue;
      const previous = state.messages[key] ?? legacy.messages[key];
      if (!previous)
        throw new Error(`Missing managed resource binding: ${key}`);
      const actual = messageSchema.parse(
        await request(
          `/channels/${previous.channelId}/messages/${previous.messageId}`,
        ),
      );
      if (
        actual.author.id !== kfcApplicationId ||
        actual.channel_id !== previous.channelId ||
        !resourceMatches(actual, previous.payload)
      )
        throw new Error(`Managed resource requires reconciliation: ${key}`);
    }
    // Establish usable replacements before retiring any old request surfaces.
    for (const target of newRevisionChannels) {
      if (onboardingOnly) continue;
      if (applicationsOnly && target.key !== "application-forever") continue;
      await createChannel(target);
    }
    if (apply && !scopedUpdate) {
      const forum = await channel(state.channels.crafting);
      // Discord accepts REQUIRE_TAG through Modify Channel, not Create Guild Channel.
      await patchChannel(forum.id, { flags: (forum.flags ?? 0) | 16 });
    }
    if (apply) snapshot = await collectDiscordAudit(credentials);
    const resources =
      !onboardingOnly &&
      (apply ||
        newRevisionChannels.every((target): boolean =>
          Boolean(state.channels[target.key]),
        ))
        ? revisionResources(state.channels)
        : [];
    async function publishResource(resource: RevisionResource): Promise<void> {
      const previous =
        state.messages[resource.key] ??
        (resource.legacyKey ? legacy.messages[resource.legacyKey] : undefined);
      const payload = resource.payload;
      if (previous) {
        if (previous.channelId !== resource.channelId)
          throw new Error("Managed resource destination mismatch.");
        const route = `/channels/${previous.channelId}/messages/${previous.messageId}`;
        const before = messageSchema.parse(await request(route));
        if (
          before.author.id !== kfcApplicationId ||
          before.channel_id !== resource.channelId
        )
          throw new Error("Managed resource ownership mismatch.");
        if (!resourceMatches(before, previous.payload))
          throw new Error(
            `Managed resource changed outside publisher: ${resource.key}`,
          );
        if (!resourceMatches(before, payload)) {
          changes++;
          console.log(
            `${apply ? "Publish" : "Would publish"}: ${resource.key}`,
          );
          if (!apply) return;
          await checkpoint({
            operation: "resource-update",
            key: resource.key,
            before,
            payload,
            status: "pending",
          });
          await request(route, "PATCH", payload, async (): Promise<void> => {
            if (
              !resourceMatches(
                messageSchema.parse(await request(route)),
                before,
              )
            )
              throw new Error("Resource edited while waiting.");
          });
        }
        if (apply) {
          const after = messageSchema.parse(await request(route));
          if (
            after.author.id !== kfcApplicationId ||
            !resourceMatches(after, payload)
          )
            throw new Error("Resource read-back failed.");
          state.messages[resource.key] = {
            channelId: resource.channelId,
            messageId: previous.messageId,
            payload,
            checksum: resourceChecksum(payload),
            publishedAt:
              state.messages[resource.key]?.checksum ===
              resourceChecksum(payload)
                ? state.messages[resource.key].publishedAt
                : new Date().toISOString(),
          };
          await save();
          if (!after.pinned) {
            await request(
              `/channels/${resource.channelId}/messages/pins/${after.id}`,
              "PUT",
            );
            if (!messageSchema.parse(await request(route)).pinned)
              throw new Error("Resource pin read-back failed.");
          }
          await checkpoint({
            operation: "resource-update",
            key: resource.key,
            checksum: resourceChecksum(payload),
            status: "verified",
          });
        }
      } else {
        changes++;
        console.log(`${apply ? "Publish" : "Would publish"}: ${resource.key}`);
        if (!apply) return;
        const result = messageSchema.parse(
          await creation(
            `resource:${resource.key}`,
            `/channels/${resource.channelId}/messages`,
            payload,
          ),
        );
        if (
          result.author.id !== kfcApplicationId ||
          result.channel_id !== resource.channelId
        )
          throw new Error("Resource identity mismatch.");
        state.messages[resource.key] = {
          channelId: result.channel_id,
          messageId: result.id,
          payload,
          checksum: resourceChecksum(payload),
          publishedAt: new Date().toISOString(),
        };
        state.pendingCreation = null;
        await save();
        if (
          !resourceMatches(
            messageSchema.parse(
              await request(
                `/channels/${result.channel_id}/messages/${result.id}`,
              ),
            ),
            payload,
          )
        )
          throw new Error("Created resource read-back failed.");
        await request(
          `/channels/${result.channel_id}/messages/pins/${result.id}`,
          "PUT",
        );
        await checkpoint({
          operation: "resource-create",
          key: resource.key,
          messageId: result.id,
          status: "verified",
        });
      }
    }
    for (const resource of resources) {
      if (
        applicationsOnly &&
        ![
          "welcome",
          "joining",
          "application-tbc",
          "application-forever",
        ].includes(resource.key)
      )
        continue;
      await publishResource(resource);
    }
    if (apply && !scopedUpdate) {
      const forum = await channel(state.channels.crafting);
      const policy = resources.find(
        (r): boolean => r.key === "crafting-policy",
      )!;
      const payload = {
        ...policy.payload,
        embeds: [
          {
            ...policy.payload.embeds[0],
            title: "Read first | Crafting requests",
            description: `${forum.topic}\n\n**Start a new post for your own request or provider listing.**\n[Current crafting policy](https://discord.com/channels/${kfcGuildId}/1413355626699952228/${state.messages[policy.key].messageId}).`,
          },
        ],
      };
      let threadId = state.channels.craftingGuide;
      if (!threadId) {
        const reviewed = forum.available_tags?.find(
          (tag): boolean => tag.name === "Reviewed" && tag.moderated,
        );
        if (!reviewed)
          throw new Error("Missing staff-controlled forum guide tag.");
        const created = z
          .object({
            id: discordId,
            guild_id: z.literal(kfcGuildId),
            parent_id: z.literal(forum.id),
            type: z.literal(11),
            name: z.literal("Read first | Crafting requests"),
          })
          .parse(
            await creation(
              "thread:crafting-guide",
              `/channels/${forum.id}/threads`,
              {
                name: "Read first | Crafting requests",
                auto_archive_duration: 4320,
                applied_tags: [reviewed.id],
                message: payload,
              },
            ),
          );
        threadId = created.id;
        state.channels.craftingGuide = threadId;
        state.pendingCreation = null;
        allowed.add(threadId);
        await save();
        const starter = messageSchema.parse(
          await request(`/channels/${threadId}/messages/${threadId}`),
        );
        if (
          starter.author.id !== kfcApplicationId ||
          starter.channel_id !== threadId ||
          !resourceMatches(starter, payload)
        )
          throw new Error("Forum guide ownership/read-back mismatch.");
        state.messages["crafting-guide"] = {
          channelId: threadId,
          messageId: threadId,
          payload,
          checksum: resourceChecksum(payload),
          publishedAt: new Date().toISOString(),
        };
        await save();
        await checkpoint({
          operation: "forum-guide-create",
          threadId,
          status: "verified",
        });
        changes++;
      }
      if (!state.messages["crafting-guide"])
        throw new Error(
          "Forum guide binding is incomplete; reconcile before continuing.",
        );
      await publishResource({
        key: "crafting-guide",
        channelId: threadId,
        payload,
      });
      const before = z
        .object({
          id: discordId,
          guild_id: z.literal(kfcGuildId),
          parent_id: discordId,
          type: z.number().int(),
          name: z.string(),
        })
        .parse(await request(`/channels/${threadId}`));
      if (
        before.parent_id !== forum.id ||
        before.type !== 11 ||
        before.name !== "Read first | Crafting requests"
      )
        throw new Error("Forum guide thread identity changed.");
      const thread = z
        .object({
          flags: z.number().int(),
          thread_metadata: z.object({ locked: z.boolean() }),
        })
        .parse(await request(`/channels/${threadId}`));
      if (!(thread.flags & 2) || !thread.thread_metadata.locked) {
        await checkpoint({
          operation: "forum-guide-pin-lock",
          before: thread,
          status: "pending",
        });
        await request(`/channels/${threadId}`, "PATCH", {
          flags: thread.flags | 2,
          locked: true,
        });
        const after = z
          .object({
            flags: z.number().int(),
            thread_metadata: z.object({ locked: z.boolean() }),
          })
          .parse(await request(`/channels/${threadId}`));
        if (!(after.flags & 2) || !after.thread_metadata.locked)
          throw new Error("Forum guide pin/lock read-back mismatch.");
        await checkpoint({
          operation: "forum-guide-pin-lock",
          status: "verified",
        });
        changes++;
      }
    }
    for (const target of revisionTargets) {
      if (onboardingOnly) continue;
      if (
        applicationsOnly &&
        !["1411545946155909150", "1411545672313737346"].includes(target.id)
      )
        continue;
      const before = await channel(target.id);
      const parentId = target.parentKey
        ? state.channels[target.parentKey]
        : target.parentId;
      await patchChannel(target.id, {
        name: target.name,
        ...(parentId
          ? {
              parent_id: parentId,
              permission_overwrites: before.permission_overwrites,
            }
          : {}),
        ...(target.topic ? { topic: target.topic } : {}),
        ...(target.readOnly
          ? {
              permission_overwrites: kfcOverwrites(
                before,
                snapshot,
                target.maintained ? "maintained" : "archive",
              ),
            }
          : {}),
      });
    }
    // Strip decoration from historical names without rewriting dates or meanings.
    for (const archived of snapshot.channels.filter(
      (c): boolean =>
        c.parent_id === kfcArchiveId &&
        !scopedUpdate &&
        !revisionTargets.some((t): boolean => t.id === c.id),
    )) {
      const name = archived.name.replace(/[^a-zA-Z0-9-]/g, "");
      await patchChannel(archived.id, {
        ...(name && name !== archived.name ? { name } : {}),
        permission_overwrites: kfcOverwrites(
          await channel(archived.id),
          snapshot,
          "archive",
        ),
      });
    }
    const guildRoute = `/guilds/${kfcGuildId}`;
    const guild = z
      .object({ id: discordId, rules_channel_id: discordId.nullable() })
      .parse(await request(guildRoute));
    const rulesReady = guild.rules_channel_id === kfcRulesId;
    if (!rulesReady)
      throw new Error(
        "The official rules destination changed. Reconcile before retiring a rules channel.",
      );
    if (!applicationsOnly && (apply || state.channels.classes)) {
      const route = `/guilds/${kfcGuildId}/onboarding`;
      const before = await request(route);
      const desired = splitPvpSubscriptions(
        attachClassSubscriptions(before, state.channels),
        "1557974303432118272",
      );
      const defaultIds = z
        .object({ default_channel_ids: z.array(discordId) })
        .parse(desired).default_channel_ids;
      if (
        defaultIds.some(
          (id): boolean =>
            snapshot.channels.find((item): boolean => item.id === id)
              ?.parent_id === "1441654698519040114",
        )
      )
        throw new Error(
          "TBC-specific channels must remain opt-in, not shared defaults.",
        );
      if (values.reconcile) {
        if (!state.expectedOnboarding)
          throw new Error("No recorded onboarding baseline to reconcile.");
        const approved = splitPvpSubscriptions(
          attachClassSubscriptions(state.expectedOnboarding, state.channels),
          "1557974303432118272",
        );
        if (
          !onboardingReadbackMatches(before, approved, state.expectedOnboarding)
        )
          throw new Error(
            "Live onboarding differs from the approved update; no state was reconciled.",
          );
        await checkpoint({
          operation: "onboarding-reconcile",
          before: state.expectedOnboarding,
          approved,
          actual: before,
          status: "pending",
        });
        state.expectedOnboarding = before;
        await save();
        await checkpoint({
          operation: "onboarding-reconcile",
          status: "verified",
        });
        console.log(
          "Reconciled accepted onboarding; no Discord settings were resent.",
        );
      }
      if (
        !isDeepStrictEqual(
          desired,
          z
            .object({
              enabled: z.boolean(),
              mode: z.number(),
              default_channel_ids: z.array(z.string()),
              prompts: z.array(z.unknown()),
            })
            .parse(before),
        )
      ) {
        changes++;
        console.log(
          `${apply ? "Update" : "Would update"}: edition-specific PvP and optional class subscriptions (enabled state preserved)`,
        );
        if (apply) {
          if (
            state.expectedOnboarding &&
            !isDeepStrictEqual(before, state.expectedOnboarding)
          )
            throw new Error("Owner changed onboarding; reconcile first.");
          state.originalOnboarding ??= before;
          await save();
          const payload = onboardingWritePayload(desired);
          await checkpoint({
            operation: "onboarding",
            before,
            desired,
            payload,
            status: "pending",
          });
          await request(route, "PUT", payload, async (): Promise<void> => {
            if (!isDeepStrictEqual(await request(route), before))
              throw new Error("Onboarding changed while waiting.");
          });
          const after = await request(route);
          const normalized = z
            .object({
              enabled: z.boolean(),
              mode: z.number(),
              default_channel_ids: z.array(z.string()),
              prompts: z.array(z.unknown()),
            })
            .parse(after);
          if (!onboardingReadbackMatches(normalized, desired, before))
            throw new Error("Onboarding read-back mismatch.");
          state.expectedOnboarding = after;
          await save();
          await checkpoint({
            operation: "onboarding",
            status: "verified",
            enabled: normalized.enabled,
          });
        }
      }
    }
    const finalSnapshot = await collectDiscordAudit(credentials);
    if (
      baselineIds.some(
        (id): boolean =>
          !finalSnapshot.channels.some((c): boolean => c.id === id),
      )
    )
      throw new Error("An original channel disappeared during revision.");
    if (!scopedUpdate && (apply || state.channels.classes)) {
      const order = [
        "1412555658108211280",
        "1557983288738451486",
        "1441654698519040114",
        "1548517693957869619",
        state.channels.classes,
        state.channels.raids,
        "1411616134356009021",
        "1411601777932894301",
        "1411614900861800589",
        "1411533816060842014",
        "1413349255263031458",
        "1411564696644882552",
        "1411540931093598229",
        "1411600830251012096",
        kfcArchiveId,
      ];
      const actualOrder = finalSnapshot.channels
        .filter((c): boolean => c.type === 4)
        .sort((a, b): number => a.position - b.position)
        .map((c): string => c.id);
      if (
        !isDeepStrictEqual(
          actualOrder.filter((id): boolean => order.includes(id)),
          order,
        )
      ) {
        changes++;
        console.log(`${apply ? "Order" : "Would order"}: approved categories`);
        if (apply) {
          const positions = order.map(
            (id, position): { id: string; position: number } => ({
              id,
              position,
            }),
          );
          await checkpoint({
            operation: "category-order",
            before: finalSnapshot.channels.filter((c): boolean => c.type === 4),
            positions,
            status: "pending",
          });
          await request(`/guilds/${kfcGuildId}/channels`, "PATCH", positions);
          const after = await collectDiscordAudit(credentials);
          const resultingOrder = after.channels
            .filter((c): boolean => c.type === 4 && order.includes(c.id))
            .sort((a, b): number => a.position - b.position)
            .map((c): string => c.id);
          if (!isDeepStrictEqual(resultingOrder, order))
            throw new Error("Category ordering read-back mismatch.");
          await checkpoint({ operation: "category-order", status: "verified" });
        }
      }
    }
    console.log(
      JSON.stringify({
        status: apply ? "applied-and-read-back" : "preview-only",
        scope: applicationsOnly
          ? "applications"
          : onboardingOnly
            ? "onboarding"
            : "full-revision",
        changes,
        resources: Object.keys(state.messages).length,
        newChannels: Object.keys(state.channels).filter(
          (key): boolean => key !== "craftingGuide",
        ).length,
        forumGuides: state.channels.craftingGuide ? 1 : 0,
        officialRulesReady: rulesReady,
        originalChannelsRetained: baselineIds.length,
        onboardingEnabled:
          finalSnapshot.onboarding.status === "available"
            ? finalSnapshot.onboarding.data.enabled
            : null,
        ownerUiRemaining: [
          "Rules Screening/new-member preview",
          "Server Guide welcome, tasks and resources",
          "moderator 2FA",
          "legacy reaction-role review",
          "scoped bot reauthorization after handover",
        ],
        privateState: ".data/kfc-revision",
      }),
    );
  } finally {
    await journal?.close();
    if (lock) {
      await lock.close();
      await unlink(lockPath);
    }
  }
}
main().catch((error: unknown): void => {
  console.error(
    error instanceof Error ? error.message : "KFC revision failed.",
  );
  process.exitCode = 1;
});
