import "./env";
import {
  open,
  mkdir,
  lstat,
  readFile,
  rename,
  unlink,
  type FileHandle,
} from "node:fs/promises";
import path from "node:path";
import { isDeepStrictEqual, parseArgs } from "node:util";
import { z } from "zod";
import {
  kfcApplicationId,
  kfcGuildId,
  kfcArchiveId,
  kfcManagementRoleId,
  kfcRulesId,
  kfcTargets,
  kfcNewChannels,
  kfcDescription,
  kfcResources,
} from "../content/kfc-community";
import {
  auditCredentialsSchema,
  auditRoleSchema,
  discordId,
  guildPermissions,
  hasDiscordPermission,
  channelPermissions,
  analyzeDiscordAudit,
} from "../lib/discord-audit";
import {
  collectDiscordAudit,
  DiscordAuditError,
} from "../lib/discord-audit-client";
import { saveDiscordAudit } from "../lib/discord-audit-files";
import {
  experienceChannelSchema,
  experiencePatchMatches,
  assertExperienceUnchanged,
  assertExperienceAccessPreserved,
  type ExperienceChannel,
  type ExperiencePatch,
} from "../lib/discord-channel-experience";
import {
  assertKfcScope,
  kfcOverwrites,
  assertKfcArchiveVisibility,
  kfcOnboarding,
  kfcOnboardingMatches,
  kfcMovePatch,
  kfcRequest,
} from "../lib/kfc-community";

const stateSchema = z
  .object({
    version: z.literal(1),
    guildId: z.literal(kfcGuildId),
    channels: z.record(z.string(), discordId),
    shamanId: discordId.nullable(),
    messages: z.record(
      z.string(),
      z.object({
        channelId: discordId,
        messageId: discordId,
        payload: z.unknown(),
      }),
    ),
    originalChannels: z.record(discordId, experienceChannelSchema),
    expectedChannels: z.record(discordId, experienceChannelSchema),
    originalGuild: z.record(z.string(), z.unknown()).nullable(),
    expectedGuild: z.record(z.string(), z.unknown()).nullable(),
    deferredGuildFields: z.array(z.literal("rules_channel_id")).default([]),
    originalOnboarding: z.unknown(),
    expectedOnboarding: z.unknown(),
    pendingCreation: z.string().nullable(),
  })
  .strict();
type State = z.infer<typeof stateSchema>;
const guildSettings = z.object({
  id: discordId,
  description: z.string().nullable(),
  rules_channel_id: discordId.nullable(),
  public_updates_channel_id: discordId.nullable(),
  safety_alerts_channel_id: discordId.nullable(),
  system_channel_flags: z.number().int(),
});
const messageSchema = z.object({
  id: discordId,
  channel_id: discordId,
  author: z.object({ id: discordId }),
  embeds: z.array(z.unknown()),
  content: z.string(),
  pinned: z.boolean().optional(),
});
const onboardingSchema = z.object({
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
          role_ids: z.array(discordId),
          channel_ids: z.array(discordId),
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

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      apply: { type: "boolean" },
      restore: { type: "boolean" },
      "groups-only": { type: "boolean" },
      help: { type: "boolean" },
    },
  });
  if (values.help) {
    console.log(
      "GET-only preview by default. --apply performs the owner-approved KFC migration; --apply --groups-only updates game-category names, shared placement and the welcome resource only, preserving other edits. --restore restores recorded configuration only, retaining created channels/messages/roles. Never deletes history or edits existing roles. Private recovery state: .data/kfc-community. Native screening, staff 2FA and Server Guide require owner UI setup.",
    );
    return;
  }
  if (values.apply && values.restore)
    throw new Error("Choose apply or restore, not both.");
  if (values.restore && values["groups-only"])
    throw new Error("Groups-only is not a restoration mode.");
  const groupsOnly = Boolean(values["groups-only"]);
  const apply = Boolean(values.apply || values.restore);
  const credentials = auditCredentialsSchema.parse({
    applicationId: kfcApplicationId,
    guildId: kfcGuildId,
    token: process.env.DISCORD_BOT_TOKEN || process.env.KFCBOT_TOKEN,
  });
  const root = path.join(process.cwd(), ".data/kfc-community");
  await mkdir(root, { recursive: true, mode: 0o700 });
  const rootInfo = await lstat(root);
  if (
    !rootInfo.isDirectory() ||
    rootInfo.isSymbolicLink() ||
    (rootInfo.mode & 0o077) !== 0
  )
    throw new Error(
      "Migration state directory must be private and not a symlink.",
    );
  const statePath = path.join(root, "state.json");
  let state: State = {
    version: 1,
    guildId: kfcGuildId,
    channels: {},
    shamanId: null,
    messages: {},
    originalChannels: {},
    expectedChannels: {},
    originalGuild: null,
    expectedGuild: null,
    deferredGuildFields: [],
    originalOnboarding: null,
    expectedOnboarding: null,
    pendingCreation: null,
  };
  try {
    const info = await lstat(statePath);
    if (!info.isFile() || info.isSymbolicLink() || (info.mode & 0o077) !== 0)
      throw new Error("Unsafe migration state file.");
    state = stateSchema.parse(JSON.parse(await readFile(statePath, "utf8")));
  } catch (error: unknown) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT"))
      throw error;
  }
  if (state.pendingCreation)
    throw new Error(
      "An uncertain creation is recorded. Inspect Discord and the journal before reconciling its ID; do not retry blindly.",
    );
  if (
    groupsOnly &&
    (kfcNewChannels.some(
      (c): boolean => c.type !== 4 && !state.channels[c.key],
    ) ||
      !state.messages.welcome)
  )
    throw new Error(
      "The initial KFC community release must exist before this split.",
    );
  let lock: FileHandle | undefined, journal: FileHandle | undefined;
  const lockPath = path.join(root, "operator.lock");
  try {
    if (apply) {
      lock = await open(lockPath, "wx", 0o600);
      await lock.writeFile(String(process.pid));
      journal = await open(
        path.join(
          root,
          `${new Date().toISOString().replaceAll(":", "-")}-${values.restore ? "restore" : "apply"}.jsonl`,
        ),
        "wx",
        0o600,
      );
    }
    async function checkpoint(record: Record<string, unknown>): Promise<void> {
      if (!journal) throw new Error("Recovery journal missing.");
      await journal.appendFile(
        JSON.stringify({ at: new Date().toISOString(), ...record }) + "\n",
      );
      await journal.sync();
    }
    async function save(): Promise<void> {
      const temporary = path.join(root, `state-${process.pid}.tmp`);
      const file = await open(temporary, "wx", 0o600);
      try {
        await file.writeFile(JSON.stringify(stateSchema.parse(state)) + "\n");
        await file.sync();
      } finally {
        await file.close();
      }
      await rename(temporary, statePath);
    }
    let snapshot = await collectDiscordAudit(credentials);
    assertKfcScope(snapshot);
    const auditPath = await saveDiscordAudit(
      snapshot,
      analyzeDiscordAudit(snapshot),
      process.cwd(),
    );
    const base = guildPermissions(
      snapshot.roles,
      kfcGuildId,
      snapshot.botRoleIds,
    );
    const ready = [4, 5, 28].every((bit): boolean =>
      hasDiscordPermission(base, 1n << BigInt(bit)),
    );
    if (apply && !ready)
      throw new Error(
        "Manage Channels, Manage Server and Manage Roles are required; no writes attempted.",
      );
    const allowedIds = new Set(snapshot.channels.map((c): string => c.id));
    async function request(
      route: string,
      method: "GET" | "POST" | "PATCH" | "PUT" = "GET",
      body?: unknown,
      recheck?: () => Promise<void>,
    ): Promise<unknown> {
      if (method !== "GET" && !apply) throw new Error("Preview cannot write.");
      return kfcRequest(credentials, route, method, body, {
        channelIds: allowedIds,
        recheck,
      });
    }
    async function channel(id: string): Promise<ExperienceChannel> {
      const value = experienceChannelSchema.parse(
        await request(`/channels/${discordId.parse(id)}`),
      );
      if (value.id !== id || value.guild_id !== kfcGuildId)
        throw new Error("Channel identity mismatch.");
      return value;
    }
    async function patchChannel(
      before: ExperienceChannel,
      patch: ExperiencePatch,
    ): Promise<void> {
      if (experiencePatchMatches(before, patch)) return;
      const current = await channel(before.id);
      assertExperienceUnchanged(before, current);
      const destination = patch.parent_id
        ? await channel(patch.parent_id)
        : null;
      if (destination) kfcMovePatch(current, destination, snapshot);
      const perms = channelPermissions(
        base,
        current,
        kfcGuildId,
        snapshot.botRoleIds,
        snapshot.bot.id,
      );
      if (
        !hasDiscordPermission(perms, 1n << 4n) ||
        (patch.permission_overwrites && !hasDiscordPermission(perms, 1n << 28n))
      )
        throw new Error(`Channel permission missing: ${before.id}`);
      if (!state.originalChannels[before.id])
        state.originalChannels[before.id] = current;
      await save();
      await checkpoint({
        operation: "channel",
        before: current,
        patch,
        status: "pending",
      });
      await request(
        `/channels/${before.id}`,
        "PATCH",
        patch,
        async (): Promise<void> => {
          assertExperienceUnchanged(current, await channel(before.id));
          if (destination)
            assertExperienceUnchanged(
              destination,
              await channel(destination.id),
            );
        },
      );
      const after = await channel(before.id);
      assertExperienceAccessPreserved(current, after, patch);
      if (!experiencePatchMatches(after, patch))
        throw new Error("Channel patch read-back mismatch.");
      if (before.parent_id === kfcArchiveId && patch.permission_overwrites)
        assertKfcArchiveVisibility(current, after, snapshot);
      state.expectedChannels[before.id] = after;
      await save();
      await checkpoint({
        operation: "channel",
        id: before.id,
        after,
        status: "verified",
      });
      console.log(`Verified channel ${after.id} (${after.name})`);
    }
    async function create(
      key: string,
      route: string,
      payload: Record<string, unknown>,
    ): Promise<unknown> {
      state.pendingCreation = key;
      await save();
      await checkpoint({
        operation: "create",
        key,
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
    const guild = guildSettings.parse(await request(`/guilds/${kfcGuildId}`));
    if (guild.id !== kfcGuildId) throw new Error("Guild identity mismatch.");
    const originalOnboarding = onboardingSchema.parse(
      await request(`/guilds/${kfcGuildId}/onboarding`),
    );
    const autoMod = z
      .array(
        z.object({
          id: discordId,
          guild_id: discordId,
          trigger_type: z.number().int(),
          name: z.string(),
          enabled: z.boolean(),
        }),
      )
      .parse(await request(`/guilds/${kfcGuildId}/auto-moderation/rules`));
    if (!apply) {
      console.log(
        JSON.stringify(
          {
            mode: "GET-only",
            auditPath,
            permissionReady: ready,
            targets: kfcTargets.filter(
              (c): boolean =>
                !groupsOnly ||
                ["1441654698519040114", "1548517693957869619"].includes(c.id),
            ),
            missingChannels: kfcNewChannels.filter(
              (c): boolean => !state.channels[c.key],
            ),
            archiveCount: snapshot.channels.filter(
              (c): boolean => c.parent_id === kfcArchiveId,
            ).length,
            onboardingEnabled: originalOnboarding.enabled,
            autoMod: autoMod.map((r) => ({
              id: r.id,
              trigger: r.trigger_type,
              enabled: r.enabled,
            })),
            ownerUi: [
              "Native Rules Screening",
              "Moderator 2FA after staff readiness",
              "Server Guide welcome/tasks/resources",
              "Discovery eligibility",
              "Blizzard application and real staff coverage",
            ],
          },
          null,
          2,
        ),
      );
      return;
    }
    if (values.restore) {
      for (const [id, before] of Object.entries(state.originalChannels)) {
        const current = await channel(id),
          expected = state.expectedChannels[id];
        if (!expected)
          throw new Error(
            `Uncertain channel mutation ${id}; reconcile its journal first.`,
          );
        assertExperienceUnchanged(expected, current);
        const restoration = {
          name: before.name,
          parent_id: before.parent_id,
          ...(before.topic !== undefined ? { topic: before.topic } : {}),
          permission_overwrites: before.permission_overwrites,
        };
        await checkpoint({
          operation: "restore-channel",
          status: "pending",
          before: current,
          patch: restoration,
        });
        await request(
          `/channels/${id}`,
          "PATCH",
          restoration,
          async (): Promise<void> => {
            assertExperienceUnchanged(current, await channel(id));
          },
        );
        const after = await channel(id);
        assertExperienceUnchanged(before, after);
        state.expectedChannels[id] = after;
        await save();
        await checkpoint({
          operation: "restore-channel",
          status: "verified",
          after,
        });
      }
      if (state.originalGuild && state.expectedGuild) {
        if (!isDeepStrictEqual(guild, state.expectedGuild))
          throw new Error(
            "Guild settings changed outside this migration; preserve owner changes.",
          );
        const before = Object.fromEntries(
          Object.entries(state.originalGuild).filter(
            ([key]): boolean => key !== "id",
          ),
        );
        await checkpoint({
          operation: "restore-guild",
          before: guild,
          patch: before,
        });
        await request(`/guilds/${kfcGuildId}`, "PATCH", before);
        const restored = guildSettings.parse(
          await request(`/guilds/${kfcGuildId}`),
        );
        if (!isDeepStrictEqual(restored, state.originalGuild))
          throw new Error(
            "Guild restoration read-back failed; inspect the journal.",
          );
        state.expectedGuild = restored;
        await save();
      }
      if (state.originalOnboarding && state.expectedOnboarding) {
        if (!isDeepStrictEqual(originalOnboarding, state.expectedOnboarding))
          throw new Error(
            "Onboarding changed outside this migration; preserve owner changes.",
          );
        const previous = onboardingSchema.parse(state.originalOnboarding);
        await request(`/guilds/${kfcGuildId}/onboarding`, "PUT", {
          enabled: previous.enabled,
          mode: previous.mode,
          default_channel_ids: previous.default_channel_ids,
          prompts: previous.prompts.map((p) => ({
            ...p,
            options: p.options.map(({ emoji, ...o }) => ({
              ...o,
              ...(emoji
                ? {
                    emoji_id: emoji.id,
                    emoji_name: emoji.name,
                    emoji_animated: emoji.animated ?? false,
                  }
                : {}),
            })),
          })),
        });
        const restored = onboardingSchema.parse(
          await request(`/guilds/${kfcGuildId}/onboarding`),
        );
        if (!isDeepStrictEqual(restored, previous))
          throw new Error(
            "Onboarding restoration read-back failed; inspect the journal.",
          );
        state.expectedOnboarding = restored;
        await save();
      }
      console.log(
        "Restored recorded settings. Newly created channels, messages and Shaman role retained for owner review; no history deleted.",
      );
      return;
    }
    // Never overwrite questions that an owner added after reviewing the blueprint.
    if (
      !groupsOnly &&
      originalOnboarding.prompts.length &&
      !state.expectedOnboarding
    )
      throw new Error(
        "Existing onboarding questions require review before the initial release.",
      );
    for (const [id, expected] of Object.entries(state.expectedChannels))
      if (
        !groupsOnly ||
        ["1441654698519040114", "1548517693957869619"].includes(id)
      )
        assertExperienceUnchanged(expected, await channel(id));
    await checkpoint({
      operation: "scope",
      mode: groupsOnly ? "game-sections-only" : "full-community-release",
      beforeAudit: auditPath,
    });
    for (const target of kfcTargets.filter(
      (c): boolean =>
        !groupsOnly ||
        ["1441654698519040114", "1548517693957869619"].includes(c.id),
    )) {
      const initial = snapshot.channels.find(
        (c): boolean => c.id === target.id,
      );
      if (!initial) throw new Error(`Missing target ${target.id}.`);
      const targetAccess = channelPermissions(
        base,
        initial,
        kfcGuildId,
        snapshot.botRoleIds,
        snapshot.bot.id,
      );
      if (
        !hasDiscordPermission(targetAccess, (1n << 10n) | (1n << 4n)) ||
        ((target.public || target.readOnly) &&
          !hasDiscordPermission(targetAccess, 1n << 28n))
      ) {
        console.log(
          `Owner review: hidden destination ${target.id} left unchanged.`,
        );
        continue;
      }
      const before = await channel(target.id);
      await patchChannel(before, {
        name: target.name,
        ...(target.topic ? { topic: target.topic } : {}),
        ...(target.public || target.readOnly
          ? {
              permission_overwrites: kfcOverwrites(
                before,
                snapshot,
                target.readOnly ? "read-only" : "chat",
              ),
            }
          : {}),
      });
    }
    for (const initial of snapshot.channels.filter(
      (c): boolean =>
        !groupsOnly && c.parent_id === kfcArchiveId && c.type === 0,
    )) {
      const access = channelPermissions(
        base,
        initial,
        kfcGuildId,
        snapshot.botRoleIds,
        snapshot.bot.id,
      );
      if (
        !hasDiscordPermission(access, (1n << 10n) | (1n << 4n) | (1n << 28n))
      ) {
        console.log(
          `Owner review: hidden archive ${initial.id} left unchanged.`,
        );
        continue;
      }
      const before = await channel(initial.id);
      await patchChannel(before, {
        permission_overwrites: kfcOverwrites(before, snapshot, "archive"),
      });
    }
    for (const target of kfcNewChannels.filter(
      (c): boolean =>
        !groupsOnly || c.key === "groups" || c.parentKey === "groups",
    )) {
      const parentId = target.parentKey
        ? state.channels[target.parentKey]
        : target.parentId;
      if (target.parentKey && !parentId)
        throw new Error("Shared group category must be created first.");
      if (state.channels[target.key]) {
        const existing = await channel(state.channels[target.key]);
        if (
          existing.type !== target.type ||
          ((!groupsOnly || target.type === 4) && existing.name !== target.name)
        )
          throw new Error("Recorded new channel changed identity.");
        const patch: ExperiencePatch = {
          ...(existing.parent_id !== parentId && parentId
            ? kfcMovePatch(existing, await channel(parentId), snapshot)
            : {}),
          ...(!groupsOnly && target.topic ? { topic: target.topic } : {}),
        };
        await patchChannel(existing, patch);
        continue;
      }
      if (snapshot.channels.some((c): boolean => c.name === target.name))
        throw new Error(
          `Unrecorded channel named ${target.name} needs explicit reconciliation.`,
        );
      const template: ExperienceChannel = {
        id: kfcGuildId,
        guild_id: kfcGuildId,
        type: target.type,
        name: target.name,
        position: 0,
        parent_id: parentId,
        permission_overwrites: [],
      };
      const payload = {
        name: target.name,
        type: target.type,
        parent_id: parentId,
        ...(target.topic ? { topic: target.topic } : {}),
        permission_overwrites: kfcOverwrites(
          template,
          snapshot,
          target.readOnly ? "read-only" : "chat",
        ),
        ...(target.type === 4
          ? {
              position:
                snapshot.channels.find(
                  (c): boolean => c.id === "1441654698519040114",
                )!.position + 1,
            }
          : { rate_limit_per_user: target.type === 15 ? 60 : 0 }),
        ...(target.type === 15
          ? {
              available_tags: target.tags?.map(
                (name): { name: string; moderated: boolean } => ({
                  name,
                  moderated: false,
                }),
              ),
              default_auto_archive_duration: 1440,
              default_thread_rate_limit_per_user: 5,
              default_sort_order: 0,
              default_forum_layout: 1,
            }
          : {}),
      };
      const created = experienceChannelSchema.parse(
        await create(
          `channel:${target.key}`,
          `/guilds/${kfcGuildId}/channels`,
          payload,
        ),
      );
      if (
        created.guild_id !== kfcGuildId ||
        created.name !== target.name ||
        created.type !== target.type
      )
        throw new Error("Created channel identity uncertain.");
      allowedIds.add(created.id);
      state.channels[target.key] = created.id;
      state.pendingCreation = null;
      await save();
      const after = await channel(created.id);
      const { parent_id: createdParent, ...createdPatch } = payload;
      if (
        after.parent_id !== createdParent ||
        !experiencePatchMatches(after, createdPatch)
      )
        throw new Error("Created channel configuration mismatch.");
      state.expectedChannels[after.id] = after;
      await save();
      await checkpoint({
        operation: "create-channel",
        key: target.key,
        after,
        status: "verified",
      });
      console.log(`Created ${target.name} (${created.id})`);
    }
    if (!groupsOnly && !state.shamanId) {
      if (snapshot.roles.some((r): boolean => r.name === "Shaman"))
        throw new Error("Unrecorded Shaman role needs reconciliation.");
      const role = auditRoleSchema.parse(
        await create("role:shaman", `/guilds/${kfcGuildId}/roles`, {
          name: "Shaman",
          permissions: "0",
          color: 0x0070de,
          mentionable: false,
          hoist: false,
        }),
      );
      if (role.name !== "Shaman" || role.permissions !== "0" || role.managed)
        throw new Error("Unexpected Shaman role permissions.");
      state.shamanId = role.id;
      state.pendingCreation = null;
      await save();
      await checkpoint({
        operation: "create-role",
        after: role,
        status: "verified",
      });
    }
    for (const resource of kfcResources(state.channels).filter(
      (r): boolean => !groupsOnly || r.key === "welcome",
    )) {
      const destination = await channel(resource.channelId);
      const canEmbed = hasDiscordPermission(
        channelPermissions(
          base,
          destination,
          kfcGuildId,
          snapshot.botRoleIds,
          snapshot.bot.id,
        ),
        1n << 14n,
      );
      const payload = {
        content: canEmbed
          ? ""
          : `**${resource.title}**\n\n${resource.description}`,
        allowed_mentions: { parse: [] },
        embeds: canEmbed
          ? [
              {
                title: resource.title,
                description: resource.description,
                color: 0x8bbd73,
                footer: { text: "Maintained resource - 9 October 2026" },
              },
            ]
          : [],
      };
      if (
        resource.description.length > 4096 ||
        resource.title.length > 256 ||
        payload.content.length > 2000
      )
        throw new Error("Resource exceeds embed budget.");
      const previous = state.messages[resource.key];
      if (previous) {
        const current = messageSchema.parse(
          await request(
            `/channels/${previous.channelId}/messages/${previous.messageId}`,
          ),
        );
        if (
          current.author.id !== snapshot.bot.id ||
          current.channel_id !== resource.channelId
        )
          throw new Error("Resource author/channel changed.");
        if (!isDeepStrictEqual(previous.payload, payload)) {
          await checkpoint({
            operation: "resource-update",
            before: current,
            patch: payload,
          });
          await request(
            `/channels/${previous.channelId}/messages/${previous.messageId}`,
            "PATCH",
            payload,
          );
          previous.payload = payload;
          await save();
        }
        continue;
      }
      const message = messageSchema.parse(
        await create(
          `resource:${resource.key}`,
          `/channels/${resource.channelId}/messages`,
          payload,
        ),
      );
      if (
        message.author.id !== snapshot.bot.id ||
        message.channel_id !== resource.channelId
      )
        throw new Error("Resource identity mismatch.");
      state.messages[resource.key] = {
        channelId: resource.channelId,
        messageId: message.id,
        payload,
      };
      state.pendingCreation = null;
      await save();
      await checkpoint({
        operation: "resource",
        key: resource.key,
        messageId: message.id,
        status: "verified",
      });
    }
    if (groupsOnly) {
      console.log(
        JSON.stringify({
          status: "verified-game-sections",
          sharedCategoryId: state.channels.groups,
          preserved: [
            "existing channel overwrites and forum settings",
            "event IDs, signup rosters and bridge mappings",
            "owner changes outside this category split",
          ],
        }),
      );
      return;
    }
    for (const resource of Object.values(state.messages)) {
      const destination = await channel(resource.channelId);
      if (
        !hasDiscordPermission(
          channelPermissions(
            base,
            destination,
            kfcGuildId,
            snapshot.botRoleIds,
            snapshot.bot.id,
          ),
          1n << 51n,
        )
      )
        continue;
      const route = `/channels/${resource.channelId}/messages/${resource.messageId}`;
      const before = messageSchema.parse(await request(route));
      if (
        before.author.id !== snapshot.bot.id ||
        before.channel_id !== resource.channelId
      )
        throw new Error("Pin target identity mismatch.");
      if (before.pinned) continue;
      await checkpoint({
        operation: "pin-resource",
        status: "pending",
        channelId: resource.channelId,
        messageId: resource.messageId,
      });
      await request(
        `/channels/${resource.channelId}/messages/pins/${resource.messageId}`,
        "PUT",
        undefined,
        async (): Promise<void> => {
          if (
            !isDeepStrictEqual(
              messageSchema.parse(await request(route)),
              before,
            )
          )
            throw new Error("Resource changed before pinning.");
        },
      );
      if (!messageSchema.parse(await request(route)).pinned)
        throw new Error("Resource pin read-back failed.");
      await checkpoint({
        operation: "pin-resource",
        status: "verified",
        messageId: resource.messageId,
      });
    }
    // Use a new private alert destination, not an unread historical staff channel.
    if (!state.channels.safety) {
      const payload = {
        name: "community-safety-alerts",
        type: 0,
        topic:
          "Private native safety/AutoMod alerts. KFC Management reviews false positives; no automatic timeout rules are introduced by this release.",
        permission_overwrites: [
          {
            id: kfcGuildId,
            type: 0 as const,
            allow: "0",
            deny: (1n << 10n).toString(),
          },
          {
            id: kfcManagementRoleId,
            type: 0 as const,
            allow: ((1n << 10n) | (1n << 11n) | (1n << 16n)).toString(),
            deny: "0",
          },
          {
            id: snapshot.bot.id,
            type: 1 as const,
            allow: ((1n << 10n) | (1n << 11n) | (1n << 16n)).toString(),
            deny: "0",
          },
        ],
      };
      const created = experienceChannelSchema.parse(
        await create(
          "channel:safety",
          `/guilds/${kfcGuildId}/channels`,
          payload,
        ),
      );
      if (
        created.guild_id !== kfcGuildId ||
        created.name !== payload.name ||
        created.type !== 0
      )
        throw new Error("Safety channel identity mismatch.");
      allowedIds.add(created.id);
      state.channels.safety = created.id;
      state.pendingCreation = null;
      await save();
      const after = await channel(created.id);
      if (!experiencePatchMatches(after, payload))
        throw new Error("Safety channel read-back failed.");
      state.expectedChannels[after.id] = after;
      await save();
      await checkpoint({
        operation: "safety-channel",
        after,
        status: "verified",
      });
    }
    const desiredSettings = {
      description: kfcDescription,
      rules_channel_id: kfcRulesId,
      safety_alerts_channel_id: state.channels.safety,
    };
    const settingsPatch = Object.fromEntries(
      Object.entries(desiredSettings).filter(
        ([key]): boolean =>
          !state.deferredGuildFields.some((field): boolean => field === key),
      ),
    );
    if (
      !Object.entries(settingsPatch).every(
        ([key, value]): boolean => guild[key as keyof typeof guild] === value,
      )
    ) {
      if (state.expectedGuild && !isDeepStrictEqual(guild, state.expectedGuild))
        throw new Error(
          "Owner changed guild settings; review before overwriting.",
        );
      state.originalGuild ??= guild;
      await save();
      await checkpoint({
        operation: "guild",
        before: guild,
        patch: settingsPatch,
        status: "pending",
      });
      await request(
        `/guilds/${kfcGuildId}`,
        "PATCH",
        settingsPatch,
        async (): Promise<void> => {
          if (
            !isDeepStrictEqual(
              guildSettings.parse(await request(`/guilds/${kfcGuildId}`)),
              guild,
            )
          )
            throw new Error("Guild settings changed while waiting.");
        },
      );
      const after = guildSettings.parse(await request(`/guilds/${kfcGuildId}`));
      const mismatched = Object.entries(settingsPatch)
        .filter(
          ([key, value]): boolean => after[key as keyof typeof after] !== value,
        )
        .map(([key]): string => key);
      if (mismatched.some((key): boolean => key !== "rules_channel_id"))
        throw new Error("Guild settings read-back failed.");
      if (mismatched.length) state.deferredGuildFields = ["rules_channel_id"];
      if (mismatched.length)
        console.log(
          "Owner setup: Discord retained the old official rules destination. Select the maintained rules channel in Community > Overview before onboarding publication.",
        );
      state.expectedGuild = after;
      await save();
      await checkpoint({ operation: "guild", after, status: "verified" });
    }
    // Existing native rules are retained; do not duplicate a one-per-guild trigger.
    for (const trigger of [5, 4]) {
      if (autoMod.some((r): boolean => r.trigger_type === trigger)) continue;
      const payload = {
        name:
          trigger === 5
            ? "KFC mention flood protection"
            : "KFC severe abuse filter",
        event_type: 1,
        trigger_type: trigger,
        trigger_metadata:
          trigger === 5
            ? { mention_total_limit: 8, mention_raid_protection_enabled: true }
            : { presets: [2, 3], allow_list: [] },
        actions: [
          {
            type: 1,
            metadata: {
              custom_message:
                "Please keep messages respectful and avoid mass mentions. Contact KFC Management privately if this is a false positive.",
            },
          },
          { type: 2, metadata: { channel_id: state.channels.safety } },
        ],
        enabled: true,
        exempt_roles: [],
        exempt_channels: [],
      };
      const created = z
        .object({
          id: discordId,
          guild_id: z.literal(kfcGuildId),
          trigger_type: z.number().int(),
          enabled: z.literal(true),
        })
        .parse(
          await create(
            `automod:${trigger}`,
            `/guilds/${kfcGuildId}/auto-moderation/rules`,
            payload,
          ),
        );
      if (created.trigger_type !== trigger)
        throw new Error("AutoMod trigger identity mismatch.");
      state.pendingCreation = null;
      await save();
      await checkpoint({
        operation: "automod",
        after: created,
        status: "verified",
      });
    }
    snapshot = await collectDiscordAudit(credentials);
    if (!state.shamanId)
      throw new Error("The maintained Shaman interest role is unavailable.");
    const wanted = kfcOnboarding(snapshot, state.channels, state.shamanId);
    const screeningReady =
      snapshot.guild.features.includes("MEMBER_VERIFICATION_GATE_ENABLED") &&
      snapshot.guild.rules_channel_id === kfcRulesId;
    wanted.enabled = screeningReady;
    const currentOnboarding = onboardingSchema.parse(
      await request(`/guilds/${kfcGuildId}/onboarding`),
    );
    if (
      state.expectedOnboarding &&
      !isDeepStrictEqual(currentOnboarding, state.expectedOnboarding) &&
      !kfcOnboardingMatches(snapshot.onboarding, wanted)
    )
      throw new Error(
        "Owner changed onboarding since release; preserve those changes.",
      );
    if (!kfcOnboardingMatches(snapshot.onboarding, wanted)) {
      state.originalOnboarding ??= currentOnboarding;
      await save();
      await checkpoint({
        operation: "onboarding",
        before: currentOnboarding,
        patch: wanted,
        status: "pending",
      });
      await request(
        `/guilds/${kfcGuildId}/onboarding`,
        "PUT",
        wanted,
        async (): Promise<void> => {
          if (
            !isDeepStrictEqual(
              onboardingSchema.parse(
                await request(`/guilds/${kfcGuildId}/onboarding`),
              ),
              currentOnboarding,
            )
          )
            throw new Error("Onboarding changed while waiting.");
        },
      );
      snapshot = await collectDiscordAudit(credentials);
      if (!kfcOnboardingMatches(snapshot.onboarding, wanted))
        throw new Error("Onboarding read-back failed.");
      state.expectedOnboarding = onboardingSchema.parse(
        await request(`/guilds/${kfcGuildId}/onboarding`),
      );
      await save();
      await checkpoint({
        operation: "onboarding",
        after: state.expectedOnboarding,
        status: "verified",
      });
    }
    const finalAudit = await saveDiscordAudit(
      snapshot,
      analyzeDiscordAudit(snapshot),
      process.cwd(),
    );
    console.log(
      JSON.stringify(
        {
          status: screeningReady
            ? "verified-and-published"
            : "verified-draft-owner-screening-required",
          finalAudit,
          channels: state.channels,
          resources: Object.fromEntries(
            Object.entries(state.messages).map(([key, m]) => [
              key,
              `https://discord.com/channels/${kfcGuildId}/${m.channelId}/${m.messageId}`,
            ]),
          ),
          ownerRemaining: [
            "Rules Screening and old verification cutover",
            "Server Guide welcome/tasks/resources",
            "Staff 2FA and assignments",
            "Discovery/Blizzard owner application",
            "Live member desktop/mobile preview",
          ],
          preserved: [
            "119 original IDs and message history",
            "active raid contracts and signups",
            "bridge mappings and sharing preferences",
            "private guild/staff destinations",
          ],
        },
        null,
        2,
      ),
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
    error instanceof Error
      ? error.message
      : "KFC migration failed; inspect the private journal.",
  );
  process.exitCode = 1;
});
