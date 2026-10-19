import "./env";
import { createHash } from "node:crypto";
import { isDeepStrictEqual, parseArgs } from "node:util";
import {
  lstat,
  mkdir,
  open,
  readFile,
  realpath,
  rename,
  unlink,
  type FileHandle,
} from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import {
  categoryOrder,
  classChannelIds,
  defaultChannelIds,
  experienceApplicationId,
  experienceForums,
  experienceGuildId,
  experienceTargets,
  safetyForums,
  safetyTags,
  type ExperienceForum,
} from "../content/discord-channel-experience";
import {
  auditCredentialsSchema,
  channelPermissions,
  discordId,
  guildPermissions,
  hasDiscordPermission,
} from "../lib/discord-audit";
import { discordChannelRequest } from "../lib/discord-channel-request";
import {
  collectDiscordAudit,
  DiscordAuditError,
} from "../lib/discord-audit-client";
import { analyzeDiscordAudit } from "../lib/discord-audit";
import { saveDiscordAudit } from "../lib/discord-audit-files";
import {
  assertExperienceAccessPreserved,
  assertExperienceScope,
  assertExperienceUnchanged,
  experienceChannelSchema,
  experiencePatchMatches,
  experiencePermission,
  mergedExperienceTags,
  readOnlyArchiveOverwrites,
  sameExperienceChannelIds,
  type ExperienceChannel,
  type ExperiencePatch,
} from "../lib/discord-channel-experience";

const stateSchema = z
  .object({
    version: z.literal(1),
    guildId: z.literal(experienceGuildId),
    channels: z.record(z.string(), discordId),
    entries: z.record(
      z.string(),
      z.object({ threadId: discordId, messageId: discordId }),
    ),
    pendingCreation: z.string().nullable(),
  })
  .strict();
type State = z.infer<typeof stateSchema>;

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

const messageSchema = z.object({
  id: discordId,
  channel_id: discordId,
  author: z.object({ id: discordId }),
  content: z.string(),
});

async function main(): Promise<void> {
  const args = parseArgs({
    strict: true,
    options: { apply: { type: "boolean" }, help: { type: "boolean" } },
  });
  if (args.values.help) {
    console.log(
      "Scoped non-LFG channel experience release. Default is GET-only preview.\n\nnpx tsx scripts/discord-channel-experience.ts\nnpx tsx scripts/discord-channel-experience.ts --apply\n\nNo channel/message deletion, role edits, bridge activation or history copying. Runtime recovery state is private under .data/discord-channel-experience.",
    );
    return;
  }
  const credentials = auditCredentialsSchema.parse({
    applicationId: process.env.KFCBOT_APPLICATION_ID,
    guildId: process.env.KFCBOT_GUILD_ID,
    token: process.env.KFCBOT_TOKEN,
  });
  if (
    credentials.guildId !== experienceGuildId ||
    credentials.applicationId !== experienceApplicationId
  )
    throw new DiscordAuditError(
      "Use only the approved Forever server and bot credentials.",
    );
  const snapshot = await collectDiscordAudit(credentials);
  assertExperienceScope(snapshot);
  const base = guildPermissions(
    snapshot.roles,
    snapshot.guild.id,
    snapshot.botRoleIds,
  );
  if (!args.values.apply) {
    console.log(
      JSON.stringify(
        {
          readOnly: true,
          targets: experienceTargets.map((target) => {
            const channel = snapshot.channels.find(
              (item): boolean => item.id === target.id,
            );
            return {
              id: target.id,
              exists: Boolean(channel),
              manageable: Boolean(
                channel && experiencePermission(snapshot, channel, 4),
              ),
              patch: {
                ...(target.name ? { name: target.name } : {}),
                ...(target.topic ? { topic: target.topic } : {}),
              },
            };
          }),
          forums: experienceForums.map((forum: ExperienceForum) => ({
            name: forum.name,
            sourceId: forum.sourceId,
            tags: forum.tags.length,
          })),
          canModifyOnboarding:
            hasDiscordPermission(base, 1n << 5n) &&
            hasDiscordPermission(base, 1n << 28n),
          missingLevelingArchive: !snapshot.channels.some(
            (channel): boolean => channel.id === "1554898196721967137",
          ),
        },
        null,
        2,
      ),
    );
    return;
  }

  const root = path.resolve(".data/discord-channel-experience");
  await mkdir(root, { recursive: true, mode: 0o700 });
  if (
    (await realpath(root)) !== root ||
    ((await lstat(root)).mode & 0o077) !== 0
  )
    throw new DiscordAuditError(
      "Recovery directory must be private and non-symlinked.",
    );
  const lockPath = path.join(root, "operator.lock");
  const lock = await open(lockPath, "wx", 0o600);
  await lock.writeFile(String(process.pid));
  let journal: FileHandle | undefined;
  try {
    const directory = await saveDiscordAudit(
      snapshot,
      analyzeDiscordAudit(snapshot),
      process.cwd(),
    );
    console.log(`Before snapshot: ${directory}`);
    journal = await open(
      path.join(root, `journal-${Date.now()}.jsonl`),
      "wx",
      0o600,
    );
    const statePath = path.join(root, "state.json");
    let state: State = {
      version: 1,
      guildId: experienceGuildId,
      channels: {},
      entries: {},
      pendingCreation: null,
    };
    try {
      const info = await lstat(statePath);
      if (
        !info.isFile() ||
        info.isSymbolicLink() ||
        (info.mode & 0o077) !== 0 ||
        info.size > 100_000
      )
        throw new DiscordAuditError(
          "Recovery state must be a private, small regular file.",
        );
      state = stateSchema.parse(
        JSON.parse(await readFile(statePath, "utf8")) as unknown,
      );
    } catch (error: unknown) {
      if (!(
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ))
        throw error;
    }
    if (state.pendingCreation)
      throw new DiscordAuditError(
        "A previous creation has an uncertain result. Reconcile the private journal/state before retrying; no duplicate will be created.",
      );

    async function checkpoint(record: Record<string, unknown>): Promise<void> {
      if (!journal)
        throw new DiscordAuditError("Recovery journal is unavailable.");
      await journal.appendFile(
        JSON.stringify({ at: new Date().toISOString(), ...record }) + "\n",
      );
      await journal.sync();
    }
    async function saveState(): Promise<void> {
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
    async function request(
      route: string,
      method: "GET" | "PATCH" | "POST" | "PUT" = "GET",
      body?: unknown,
      recheck?: () => Promise<void>,
    ): Promise<unknown> {
      return discordChannelRequest(credentials, route, method, body, {
        reason: "Owner-approved non-LFG channel experience improvements",
        recheck,
      });
    }
    async function getChannel(id: string): Promise<ExperienceChannel> {
      const channel = experienceChannelSchema.parse(
        await request(`/channels/${discordId.parse(id)}`),
      );
      if (channel.id !== id || channel.guild_id !== experienceGuildId)
        throw new DiscordAuditError(
          "Discord returned a different channel/server.",
        );
      return channel;
    }
    const pending: string[] = [];
    let changed = 0;
    let matched = 0;
    async function edit(
      before: ExperienceChannel,
      patch: ExperiencePatch,
    ): Promise<ExperienceChannel> {
      if (experiencePatchMatches(before, patch)) {
        matched++;
        return before;
      }
      if (
        !experiencePermission(snapshot, before, 4) ||
        !experiencePermission(snapshot, before, 10) ||
        (patch.permission_overwrites &&
          !experiencePermission(snapshot, before, 28))
      ) {
        pending.push(`permission:${before.id}`);
        return before;
      }
      const current = await getChannel(before.id);
      assertExperienceUnchanged(before, current);
      await checkpoint({
        operation: "patch",
        status: "pending",
        before: current,
        patch,
      });
      await request(
        `/channels/${before.id}`,
        "PATCH",
        patch,
        async (): Promise<void> => {
          assertExperienceUnchanged(current, await getChannel(before.id));
        },
      );
      const after = await getChannel(before.id);
      assertExperienceAccessPreserved(current, after, patch);
      if (!experiencePatchMatches(after, patch))
        throw new DiscordAuditError(
          "A channel update did not match its read-back. Review the recovery journal.",
        );
      await checkpoint({
        operation: "patch",
        status: "verified",
        id: after.id,
        after,
      });
      changed++;
      console.log(`Verified channel ${after.id}`);
      return after;
    }
    for (const target of experienceTargets) {
      const initial = snapshot.channels.find(
        (channel): boolean => channel.id === target.id,
      );
      if (!initial || initial.type !== target.type)
        throw new DiscordAuditError(
          `Expected channel ${target.id} is missing or changed type.`,
        );
      const before = await getChannel(target.id);
      assertExperienceUnchanged(initial, before);
      await edit(before, {
        ...(target.name ? { name: target.name } : {}),
        ...(target.topic ? { topic: target.topic } : {}),
      });
    }
    for (const id of classChannelIds) {
      const before = await getChannel(id);
      if (before.type !== 0 || before.parent_id !== "1554318866291757077")
        throw new DiscordAuditError("A class channel changed scope.");
      await edit(before, {
        topic:
          "Class questions, builds and UI discussion. For technical advice include your goal, level/spec, ruleset and client/build. Distinguish tested Forever advice from older-client guides. Reviewed community guides: https://www.wowforeverdiscord.online/guides",
      });
    }

    async function create(
      key: string,
      payload: Record<string, unknown>,
    ): Promise<ExperienceChannel> {
      state.pendingCreation = key;
      await saveState();
      await checkpoint({
        operation: "create-channel",
        status: "pending",
        key,
        payload,
      });
      let result: unknown;
      try {
        result = await request(
          `/guilds/${experienceGuildId}/channels`,
          "POST",
          payload,
        );
      } catch (error: unknown) {
        if (
          error instanceof DiscordAuditError &&
          error.httpStatus &&
          error.httpStatus >= 400 &&
          error.httpStatus < 500
        ) {
          state.pendingCreation = null;
          await saveState();
        }
        throw error;
      }
      const created = experienceChannelSchema.parse(result);
      if (
        created.guild_id !== experienceGuildId ||
        created.type !== payload.type ||
        created.name !== payload.name
      )
        throw new DiscordAuditError(
          "Creation returned an unexpected channel. Its uncertain result remains recorded; do not retry blindly.",
        );
      state.channels[key] = created.id;
      state.pendingCreation = null;
      await saveState();
      const after = await getChannel(created.id);
      await checkpoint({
        operation: "create-channel",
        status: "verified",
        key,
        after,
      });
      changed++;
      return after;
    }
    async function ensureCategory(
      name: "Archives" | "Operations",
    ): Promise<ExperienceChannel> {
      if (state.channels[name]) {
        const known = await getChannel(state.channels[name]);
        if (known.type !== 4 || known.name !== name)
          throw new DiscordAuditError(
            "A recorded category changed identity; review before proceeding.",
          );
        return known;
      }
      const candidates = snapshot.channels.filter(
        (channel): boolean => channel.type === 4 && channel.name === name,
      );
      if (candidates.length > 1)
        throw new DiscordAuditError(
          "Duplicate destination categories need manual review.",
        );
      if (candidates.length === 1) {
        state.channels[name] = candidates[0].id;
        await saveState();
        return getChannel(candidates[0].id);
      }
      return create(name, { name, type: 4, permission_overwrites: [] });
    }
    const archive = await ensureCategory("Archives");
    const operations = await ensureCategory("Operations");
    for (const spec of experienceForums) {
      const source = await getChannel(spec.sourceId);
      if (source.type !== 0)
        throw new DiscordAuditError(
          "A tool forum source is no longer a text channel.",
        );
      const parentId = "1554318818237485157";
      let forum: ExperienceChannel;
      if (state.channels[spec.name])
        forum = await getChannel(state.channels[spec.name]);
      else {
        const candidates = snapshot.channels.filter(
          (channel): boolean =>
            channel.name === spec.name && channel.parent_id === parentId,
        );
        if (candidates.length)
          throw new DiscordAuditError(
            "An unrecorded tool forum already exists. Review it before creating or adopting anything.",
          );
        forum = await create(spec.name, {
          name: spec.name,
          type: 15,
          parent_id: parentId,
          permission_overwrites: source.permission_overwrites,
          topic: spec.guidelines,
          available_tags: spec.tags,
          flags: 16,
          default_forum_layout: 1,
          default_sort_order: spec.sort,
          default_auto_archive_duration: 10080,
          rate_limit_per_user: spec.cooldown,
          default_thread_rate_limit_per_user: 0,
        });
      }
      if (
        forum.type !== 15 ||
        forum.parent_id !== parentId ||
        forum.name !== spec.name
      )
        throw new DiscordAuditError("A recorded forum changed scope.");
      forum = await edit(forum, {
        topic: spec.guidelines,
        available_tags: mergedExperienceTags(
          forum.available_tags ?? [],
          spec.tags,
        ),
        flags: (forum.flags ?? 0) | 16,
        default_forum_layout: 1,
        default_sort_order: spec.sort,
        default_auto_archive_duration: 10080,
        rate_limit_per_user: spec.cooldown,
        default_thread_rate_limit_per_user: 0,
      });
      const everyone = channelPermissions(
        guildPermissions(snapshot.roles, experienceGuildId, []),
        forum,
        experienceGuildId,
        [],
      );
      if (
        ![10, 11, 16, 38].every((bit: number): boolean =>
          hasDiscordPermission(everyone, 1n << BigInt(bit)),
        )
      )
        throw new DiscordAuditError(
          "The new forum does not allow ordinary members to view, post, read and reply. Its original text channel was not archived.",
        );
      await edit(source, {
        name: `${spec.name}-archive`,
        parent_id: archive.id,
        topic: `Original ${spec.name === "tool-directory" ? "addon listings" : "support conversations"} are preserved here. New posts belong in <#${forum.id}>. This archive is read-only for ordinary members.`,
        permission_overwrites: readOnlyArchiveOverwrites(source, snapshot),
      });
    }

    for (const spec of safetyForums) {
      const before = await getChannel(spec.id);
      if (before.type !== 15)
        throw new DiscordAuditError("A safety forum changed type.");
      await edit(before, {
        topic: spec.guidelines,
        available_tags: mergedExperienceTags(
          before.available_tags ?? [],
          safetyTags,
        ),
        default_forum_layout: 1,
        default_sort_order: 1,
        default_auto_archive_duration: 10080,
        rate_limit_per_user: 60,
        default_thread_rate_limit_per_user: 0,
      });
    }
    for (const spec of [
      {
        id: "1554889798743887984",
        name: "forever-shared-chat-archive",
        parent: archive.id,
      },
      {
        id: "1554613971636584468",
        name: "activity-checker",
        parent: operations.id,
      },
      {
        id: "1554337768006488174",
        name: "server-updates",
        parent: operations.id,
      },
      {
        id: "1554955387105710221",
        name: "safety-review",
        parent: operations.id,
      },
    ]) {
      const initial = snapshot.channels.find(
        (channel): boolean => channel.id === spec.id,
      );
      if (!initial || !experiencePermission(snapshot, initial, 10)) {
        pending.push(`access:${spec.id}`);
        continue;
      }
      const before = await getChannel(spec.id);
      await edit(before, {
        name: spec.name,
        parent_id: spec.parent,
        ...(spec.id === "1554889798743887984"
          ? {
              topic:
                "Archived unused pilot channel. Everyday conversation is in general. Existing messages remain here; this channel is read-only for ordinary members.",
              permission_overwrites: readOnlyArchiveOverwrites(
                before,
                snapshot,
              ),
            }
          : {}),
      });
    }
    if (
      !snapshot.channels.some(
        (channel): boolean => channel.id === "1554898196721967137",
      )
    )
      pending.push("missing-leveling-archive:1554898196721967137");

    const onboarding = onboardingSchema.parse(
      await request(`/guilds/${experienceGuildId}/onboarding`),
    );
    if (onboarding.guild_id !== experienceGuildId)
      throw new DiscordAuditError("Onboarding belongs to a different server.");
    if (
      !hasDiscordPermission(base, 1n << 5n) ||
      !hasDiscordPermission(base, 1n << 28n)
    )
      pending.push("onboarding-permissions");
    else if (
      !sameExperienceChannelIds(
        onboarding.default_channel_ids,
        defaultChannelIds,
      )
    ) {
      const candidate = await Promise.all(
        defaultChannelIds.map((id: string): Promise<ExperienceChannel> =>
          getChannel(id),
        ),
      );
      const writable = candidate.filter(
        (channel: ExperienceChannel): boolean => {
          const permissions = channelPermissions(
            guildPermissions(snapshot.roles, experienceGuildId, []),
            channel,
            experienceGuildId,
            [],
          );
          return (
            channel.type === 0 &&
            hasDiscordPermission(permissions, 1n << 10n) &&
            hasDiscordPermission(permissions, 1n << 11n)
          );
        },
      );
      if (writable.length < 5 || candidate.length < 7)
        throw new DiscordAuditError(
          "Onboarding defaults do not satisfy ordinary-member access constraints.",
        );
      await checkpoint({
        operation: "onboarding-defaults",
        status: "pending",
        before: onboarding.default_channel_ids,
        after: defaultChannelIds,
      });
      await request(
        `/guilds/${experienceGuildId}/onboarding`,
        "PUT",
        {
          default_channel_ids: defaultChannelIds,
        },
        async (): Promise<void> => {
          const current = onboardingSchema.parse(
            await request(`/guilds/${experienceGuildId}/onboarding`),
          );
          if (!isDeepStrictEqual(current, onboarding))
            throw new DiscordAuditError(
              "Onboarding changed during the rate-limit wait. Preserve the owner edit and review before retrying.",
            );
        },
      );
      const after = onboardingSchema.parse(
        await request(`/guilds/${experienceGuildId}/onboarding`),
      );
      if (
        !sameExperienceChannelIds(
          after.default_channel_ids,
          defaultChannelIds,
        ) ||
        !isDeepStrictEqual(after.prompts, onboarding.prompts) ||
        after.enabled !== onboarding.enabled ||
        after.mode !== onboarding.mode
      )
        throw new DiscordAuditError(
          "Onboarding verification failed; original questions must remain unchanged.",
        );
      await checkpoint({
        operation: "onboarding-defaults",
        status: "verified",
      });
      changed++;
    }

    const all = z
      .array(experienceChannelSchema)
      .parse(await request(`/guilds/${experienceGuildId}/channels`));
    const order = [...categoryOrder, operations.id, archive.id];
    const currentOrder = all
      .filter(
        (channel: ExperienceChannel): boolean =>
          channel.type === 4 && order.includes(channel.id),
      )
      .sort(
        (a: ExperienceChannel, b: ExperienceChannel): number =>
          a.position - b.position,
      )
      .map((channel: ExperienceChannel): string => channel.id);
    if (!isDeepStrictEqual(order, currentOrder)) {
      await checkpoint({
        operation: "category-order",
        status: "pending",
        before: all
          .filter((channel: ExperienceChannel): boolean => channel.type === 4)
          .map((channel: ExperienceChannel) => ({
            id: channel.id,
            position: channel.position,
          })),
      });
      await request(
        `/guilds/${experienceGuildId}/channels`,
        "PATCH",
        order.map((id: string, position: number) => ({ id, position })),
      );
      const after = z
        .array(experienceChannelSchema)
        .parse(await request(`/guilds/${experienceGuildId}/channels`));
      const actual = after
        .filter(
          (channel: ExperienceChannel): boolean =>
            channel.type === 4 && order.includes(channel.id),
        )
        .sort(
          (a: ExperienceChannel, b: ExperienceChannel): number =>
            a.position - b.position,
        )
        .map((channel: ExperienceChannel): string => channel.id);
      if (!isDeepStrictEqual(actual, order))
        throw new DiscordAuditError("Category order did not verify.");
      await checkpoint({ operation: "category-order", status: "verified" });
      changed++;
    }

    const directoryForum = await getChannel(state.channels["tool-directory"]);
    const entries = [
      {
        key: "trader-web",
        title: "WoW Trader - browser workspace",
        tags: ["Web tool", "Trading"],
        content:
          "Browse crafting costs and auction observations in the maintained Forever web workspace.\n\nOpen: https://helper.kfcguild.online/forever/trader\nGuide and support boundaries: https://www.wowforeverdiscord.online/addons/wow-trader\n\nMaintainer: Open source contributors. The web workspace is publicly available without installing a desktop app. Prices depend on voluntary uploads: check the selected market, last accepted scan and history coverage. Asking prices are not confirmed sales or guaranteed profit. A screenshot or site uptime is not evidence of a fresh scan.\n\nFor a problem, use tool-support with the market, page and observation time. Never post account details or raw uploads. This entry describes the public web tool, not approval of every addon or desktop build.",
      },
      {
        key: "trader-collector",
        title: "WoW Trader Collector - approved in-game pilot",
        tags: ["In-game addon", "Trading"],
        content:
          "The Collector supports the maintained market-data collection workflow.\n\nProject and collection information: https://helper.kfcguild.online/forever/addon\nRead distribution boundaries first: https://www.wowforeverdiscord.online/addons/wow-trader\n\nMaintainer: Open source contributors. The owner reports Forever testing; this entry does not yet record an exact tested build or certify every feature. Collector participation remains an approved, supported pilot, not a requirement to browse WoW Trader or join the community. Arrange the package and upload workflow with a maintainer before testing.\n\nDo not share pairing codes or production credentials. Do not post raw scan files or private diagnostics in public support. Browser testers can complete the assignments at https://www.wowforeverdiscord.online/contribute without installing collection software. Other community raid addons have not yet been tested on Forever.",
      },
      {
        key: "trader-companion",
        title: "WoW Trader Companion - maintainer-alpha desktop pilot",
        tags: ["Desktop app", "Trading"],
        content:
          "The desktop Companion is a separate component of the collection workflow; web availability does not mean unrestricted desktop distribution.\n\nRead the product and pilot boundaries: https://www.wowforeverdiscord.online/addons/wow-trader\n\nMaintainer: Open source contributors. Distribution remains maintainer-alpha and requires an agreed package and supported setup. Confirm the exact version, OS and installation instructions with the maintainer. This entry is not a clean-machine compatibility test or a signing/notarization claim. Do not disable operating-system protection to install an unverified package.\n\nPairing and collection participation are separate from ordinary browser testing. Never post credentials, pairing codes or private diagnostics. Use tool-support for a redacted issue and ask the maintainer for a private route before sensitive details.",
      },
    ];
    for (const entry of entries) {
      const tagIds = entry.tags.map((name: string): string => {
        const tag = directoryForum.available_tags?.find(
          (item): boolean => item.name === name,
        );
        if (!tag || tag.moderated)
          throw new DiscordAuditError(
            "A product entry needs a missing or staff-only tag.",
          );
        return tag.id;
      });
      if (entry.content.length > 2000 || tagIds.length > 5)
        throw new DiscordAuditError(
          "A product entry exceeds Discord message or applied-tag limits.",
        );
      const saved = state.entries[entry.key];
      if (saved) {
        const thread = z
          .object({
            id: discordId,
            guild_id: discordId,
            parent_id: discordId,
            owner_id: discordId,
            name: z.string(),
            applied_tags: z.array(discordId),
          })
          .parse(await request(`/channels/${saved.threadId}`));
        const message = messageSchema.parse(
          await request(
            `/channels/${saved.threadId}/messages/${saved.messageId}`,
          ),
        );
        if (
          thread.guild_id !== experienceGuildId ||
          thread.parent_id !== directoryForum.id ||
          thread.owner_id !== snapshot.bot.id ||
          thread.name !== entry.title ||
          message.author.id !== snapshot.bot.id ||
          message.content !== entry.content
        )
          throw new DiscordAuditError(
            "A recorded product entry was modified. Preserve the edit and review instead of replacing it.",
          );
        if (!sameExperienceChannelIds(thread.applied_tags, tagIds)) {
          const betaId = directoryForum.available_tags?.find(
            (tag): boolean => tag.name === "Beta",
          )?.id;
          if (
            !betaId ||
            entry.key === "trader-web" ||
            !sameExperienceChannelIds(thread.applied_tags, [...tagIds, betaId])
          )
            throw new DiscordAuditError(
              "Product tags differ from the known initial release. Preserve owner changes and review instead of replacing them.",
            );
          await checkpoint({
            operation: "product-tags",
            status: "pending",
            id: thread.id,
            before: thread.applied_tags,
            after: tagIds,
          });
          await request(
            `/channels/${thread.id}`,
            "PATCH",
            { applied_tags: tagIds },
            async (): Promise<void> => {
              const current = z
                .object({
                  owner_id: discordId,
                  name: z.string(),
                  applied_tags: z.array(discordId),
                })
                .parse(await request(`/channels/${thread.id}`));
              if (
                current.owner_id !== thread.owner_id ||
                current.name !== thread.name ||
                !sameExperienceChannelIds(
                  current.applied_tags,
                  thread.applied_tags,
                )
              )
                throw new DiscordAuditError(
                  "Product tags changed during the retry wait; preserve the edit.",
                );
            },
          );
          const verified = z
            .object({ applied_tags: z.array(discordId) })
            .parse(await request(`/channels/${thread.id}`));
          if (!sameExperienceChannelIds(verified.applied_tags, tagIds))
            throw new DiscordAuditError("Product-tag read-back failed.");
          await checkpoint({
            operation: "product-tags",
            status: "verified",
            id: thread.id,
          });
          changed++;
        } else matched++;
        continue;
      }
      state.pendingCreation = `entry:${entry.key}`;
      await saveState();
      await checkpoint({
        operation: "product-entry",
        status: "pending",
        key: entry.key,
        title: entry.title,
        contentHash: createHash("sha256").update(entry.content).digest("hex"),
      });
      let response: unknown;
      try {
        response = await request(
          `/channels/${directoryForum.id}/threads`,
          "POST",
          {
            name: entry.title,
            auto_archive_duration: 10080,
            applied_tags: tagIds,
            message: {
              content: entry.content,
              allowed_mentions: { parse: [] },
              flags: 4096,
            },
          },
        );
      } catch (error: unknown) {
        if (
          error instanceof DiscordAuditError &&
          error.httpStatus &&
          error.httpStatus >= 400 &&
          error.httpStatus < 500
        ) {
          state.pendingCreation = null;
          await saveState();
        }
        throw error;
      }
      const created = z
        .object({
          id: discordId,
          guild_id: discordId,
          parent_id: discordId,
          owner_id: discordId,
          message: messageSchema,
        })
        .parse(response);
      if (
        created.guild_id !== experienceGuildId ||
        created.parent_id !== directoryForum.id ||
        created.owner_id !== snapshot.bot.id ||
        created.message.author.id !== snapshot.bot.id
      )
        throw new DiscordAuditError(
          "A product entry returned unexpected ownership; reconcile before retrying.",
        );
      state.entries[entry.key] = {
        threadId: created.id,
        messageId: created.message.id,
      };
      state.pendingCreation = null;
      await saveState();
      const verified = messageSchema.parse(
        await request(`/channels/${created.id}/messages/${created.message.id}`),
      );
      if (verified.content !== entry.content)
        throw new DiscordAuditError("Product entry read-back failed.");
      await checkpoint({
        operation: "product-entry",
        status: "verified",
        key: entry.key,
        ...state.entries[entry.key],
      });
      changed++;
    }
    const final = await collectDiscordAudit(credentials);
    await saveDiscordAudit(final, analyzeDiscordAudit(final), process.cwd());
    await checkpoint({
      operation: "release",
      status: "complete",
      changed,
      matched,
      pending,
    });
    console.log(
      JSON.stringify(
        {
          verifiedChanges: changed,
          alreadyMatched: matched,
          pending,
          forums: experienceForums.map((forum: ExperienceForum) => ({
            name: forum.name,
            id: state.channels[forum.name],
          })),
          deletedMessages: 0,
          deletedChannels: 0,
          alteredRoles: 0,
        },
        null,
        2,
      ),
    );
  } finally {
    await journal?.close();
    await lock.close();
    await unlink(lockPath);
  }
}

main().catch((error: unknown): void => {
  console.error(
    error instanceof DiscordAuditError
      ? error.message
      : "Channel experience release stopped. Inspect private recovery state; raw errors are suppressed to protect credentials and configuration.",
  );
  process.exitCode = 1;
});
