import "./env";
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
  experienceApplicationId,
  experienceGuildId,
} from "../content/discord-channel-experience";
import {
  factionGroupGuide,
  factionRulesTopic,
  groupFactions,
  groupGuidelines,
  groupTags,
  levelingForumId,
  levelingParentId,
} from "../content/discord-group-channels";
import {
  analyzeDiscordAudit,
  auditCredentialsSchema,
  discordId,
  guildPermissions,
  hasDiscordPermission,
} from "../lib/discord-audit";
import {
  collectDiscordAudit,
  DiscordAuditError,
} from "../lib/discord-audit-client";
import { saveDiscordAudit } from "../lib/discord-audit-files";
import {
  assertExperienceAccessPreserved,
  assertExperienceScope,
  assertExperienceUnchanged,
  experienceChannelSchema,
  experiencePatchMatches,
  experiencePermission,
  readOnlyArchiveOverwrites,
  type ExperienceChannel,
  type ExperiencePatch,
} from "../lib/discord-channel-experience";
import {
  discordChannelRequest,
  type ChannelRequestMethod,
} from "../lib/discord-channel-request";
import {
  assertCopiedGroupAccess,
  assertGroupArchive,
  assertGroupForumAccess,
  assertGroupGuildPreserved,
  assertGroupOrder,
  assertGroupTagsRetained,
  factionChannelOrder,
  groupForumPatch,
  groupOnboardingPayload,
  groupOnboardingSchema,
  neutralContributorCopy,
  prepareGroupForum,
  routedGroupOnboarding,
  sameGroupOnboarding,
} from "../lib/discord-group-channels";

const stateSchema = z
  .object({
    version: z.literal(1),
    guildId: z.literal(experienceGuildId),
    channels: z.record(z.string(), discordId),
    guides: z.record(z.string(), discordId),
    sources: z.record(discordId, experienceChannelSchema),
    pendingCreation: z.string().nullable(),
  })
  .strict();
type State = z.infer<typeof stateSchema>;
const productStateSchema = z.object({
  guildId: z.literal(experienceGuildId),
  channels: z.record(z.string(), discordId),
  entries: z.record(
    z.string(),
    z.object({ threadId: discordId, messageId: discordId }),
  ),
  pendingCreation: z.null(),
});
const messageSchema = z.object({
  id: discordId,
  channel_id: discordId,
  author: z.object({ id: discordId }),
  content: z.string(),
  pinned: z.boolean().optional(),
});
const productThreadSchema = z.object({
  id: discordId,
  guild_id: discordId,
  parent_id: discordId,
  owner_id: discordId,
  name: z.string(),
});
const productTitles: Readonly<Record<string, string>> = {
  "trader-web": "WoW Trader - browser workspace",
  "trader-collector": "WoW Trader Collector - approved in-game pilot",
  "trader-companion": "WoW Trader Companion - maintainer-alpha desktop pilot",
};

async function privateJson(filename: string): Promise<unknown> {
  const full = path.resolve(filename);
  const info = await lstat(full);
  if (
    !info.isFile() ||
    info.isSymbolicLink() ||
    (info.mode & 0o077) !== 0 ||
    info.size > 500_000 ||
    (await realpath(full)) !== full
  )
    throw new DiscordAuditError(
      "Recovery state must be a private, bounded, non-symlinked regular file.",
    );
  return JSON.parse(await readFile(full, "utf8")) as unknown;
}

async function main(): Promise<void> {
  const args = parseArgs({
    strict: true,
    options: {
      apply: { type: "boolean" },
      help: { type: "boolean" },
      "reconcile-created": { type: "boolean" },
    },
  });
  if (args.values.help) {
    console.log(
      "Forever group-channel release. Default is GET-only preview.\n\nnpx tsx scripts/discord-group-channels.ts [--apply]\n\nCreates four forums; archives original text channels; updates seven existing forums, faction routing/order and three bot-owned contributor labels. No message/channel deletion, user-message copying, role edits, events, command registration or bridge activation.",
    );
    return;
  }
  const credentials = auditCredentialsSchema.parse({
    applicationId: process.env.KFCBOT_APPLICATION_ID,
    guildId: process.env.KFCBOT_GUILD_ID,
    token: process.env.KFCBOT_TOKEN,
  });
  if (
    credentials.applicationId !== experienceApplicationId ||
    credentials.guildId !== experienceGuildId
  )
    throw new DiscordAuditError(
      "Use only the approved Forever server and bot credentials.",
    );
  const snapshot = await collectDiscordAudit(credentials);
  assertExperienceScope(snapshot);
  const request = (
    route: string,
    method: ChannelRequestMethod = "GET",
    body?: unknown,
    recheck?: () => Promise<void>,
  ): Promise<unknown> =>
    discordChannelRequest(credentials, route, method, body, {
      reason:
        "Owner-approved group-finding forums and neutral contributor attribution",
      recheck,
    });
  const getChannel = async (id: string): Promise<ExperienceChannel> => {
    const channel = experienceChannelSchema.parse(
      await request(`/channels/${discordId.parse(id)}`),
    );
    if (channel.id !== id || channel.guild_id !== experienceGuildId)
      throw new DiscordAuditError(
        "Discord returned an unexpected channel or server.",
      );
    return channel;
  };
  const getChannels = async (): Promise<ExperienceChannel[]> => {
    const channels = z
      .array(experienceChannelSchema)
      .parse(await request(`/guilds/${experienceGuildId}/channels`));
    if (
      channels.some(
        (channel): boolean => channel.guild_id !== experienceGuildId,
      )
    )
      throw new DiscordAuditError(
        "Channel inventory returned an unexpected server.",
      );
    return channels;
  };
  const getOnboarding = async (): Promise<
    z.infer<typeof groupOnboardingSchema>
  > => {
    const result = groupOnboardingSchema.parse(
      await request(`/guilds/${experienceGuildId}/onboarding`),
    );
    if (result.guild_id !== experienceGuildId)
      throw new DiscordAuditError("Onboarding returned an unexpected server.");
    return result;
  };
  const root = path.resolve(".data/discord-group-channels");
  const statePath = path.join(root, "state.json");
  let state: State = {
    version: 1,
    guildId: experienceGuildId,
    channels: {},
    guides: {},
    sources: {},
    pendingCreation: null,
  };
  try {
    state = stateSchema.parse(await privateJson(statePath));
  } catch (error: unknown) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT"))
      throw error;
  }
  if (args.values["reconcile-created"] && !args.values.apply)
    throw new DiscordAuditError(
      "Reconciliation requires --apply and an already recorded creation.",
    );
  if (state.pendingCreation && !args.values["reconcile-created"])
    throw new DiscordAuditError(
      "A previous creation is uncertain. Reconcile private state/journal before retrying; no duplicate will be created.",
    );
  if (
    args.values["reconcile-created"] &&
    (!state.pendingCreation ||
      !state.channels[state.pendingCreation] ||
      !groupFactions.some((faction): boolean =>
        ["pve", "pvp"].some(
          (kind: string): boolean =>
            `${faction.key}-${kind}` === state.pendingCreation,
        ),
      ))
  )
    throw new DiscordAuditError(
      "Only an already recorded replacement forum can use created-channel reconciliation; unrecorded results need manual review.",
    );
  const allBefore = await getChannels();
  const onboardingBefore = await getOnboarding();
  const archiveCandidates = allBefore.filter(
    (channel): boolean => channel.type === 4 && channel.name === "Archives",
  );
  if (archiveCandidates.length !== 1)
    throw new DiscordAuditError(
      "Exactly one existing Archives category is required.",
    );
  const archive = archiveCandidates[0];
  const base = guildPermissions(
    snapshot.roles,
    experienceGuildId,
    snapshot.botRoleIds,
  );
  const initial = new Map(
    allBefore.map((channel): [string, ExperienceChannel] => [
      channel.id,
      channel,
    ]),
  );
  const requiredIds = [
    archive.id,
    levelingForumId,
    ...groupFactions.flatMap((faction): string[] => [
      faction.parentId,
      faction.rulesId,
      faction.pveSourceId,
      faction.pvpSourceId,
      faction.scheduledId,
      faction.lookingId,
      faction.recruitmentId,
    ]),
  ];
  for (const id of requiredIds)
    if (!initial.has(id))
      throw new DiscordAuditError(`A required group channel is missing: ${id}`);
  if (!args.values.apply) {
    console.log(
      JSON.stringify(
        {
          readOnly: true,
          administrator: hasDiscordPermission(base, 8n),
          canModifyOnboarding:
            hasDiscordPermission(base, 1n << 5n) &&
            hasDiscordPermission(base, 1n << 28n),
          manageable: requiredIds.every((id: string): boolean =>
            experiencePermission(snapshot, initial.get(id)!, 4),
          ),
          sourceArchivingAllowed: groupFactions.every((faction): boolean =>
            [faction.pveSourceId, faction.pvpSourceId].every(
              (id: string): boolean =>
                experiencePermission(snapshot, initial.get(id)!, 28),
            ),
          ),
          forums: groupFactions.map((faction) => ({
            faction: faction.label,
            pve: state.channels[`${faction.key}-pve`] ?? "to-create",
            pvp: state.channels[`${faction.key}-pvp`] ?? "to-create",
            scheduled: faction.scheduledId,
            looking: faction.lookingId,
            recruitment: faction.recruitmentId,
          })),
          leveling: levelingForumId,
          tagCounts: {
            pve: groupTags("pve").length,
            pvp: groupTags("pvp").length,
            scheduled: groupTags("scheduled").length,
          },
          neutralContributorEntries: Object.keys(productTitles),
          currentRulesGuides: groupFactions.map((faction) => ({
            faction: faction.label,
            recordedId: state.guides[faction.key] ?? "to-create",
            canPin: experiencePermission(
              snapshot,
              initial.get(faction.rulesId)!,
              51,
            ),
          })),
        },
        null,
        2,
      ),
    );
    return;
  }
  if (
    ![4, 5, 28].every((bit: number): boolean =>
      hasDiscordPermission(base, 1n << BigInt(bit)),
    ) ||
    requiredIds.some(
      (id: string): boolean =>
        !experiencePermission(snapshot, initial.get(id)!, 4) ||
        !experiencePermission(snapshot, initial.get(id)!, 10),
    ) ||
    groupFactions.some((faction): boolean =>
      [faction.pveSourceId, faction.pvpSourceId].some(
        (id: string): boolean =>
          !experiencePermission(snapshot, initial.get(id)!, 28),
      ),
    ) ||
    groupFactions.some(
      (faction): boolean =>
        !experiencePermission(snapshot, initial.get(faction.rulesId)!, 11) ||
        !experiencePermission(snapshot, initial.get(faction.rulesId)!, 51),
    )
  )
    throw new DiscordAuditError(
      "Required channel, archive or onboarding permissions are unavailable; no writes were made.",
    );
  await mkdir(root, { recursive: true, mode: 0o700 });
  if (
    (await realpath(root)) !== root ||
    ((await lstat(root)).mode & 0o077) !== 0
  )
    throw new DiscordAuditError(
      "The recovery directory must be private and non-symlinked.",
    );
  const lockPath = path.join(root, "operator.lock");
  const lock = await open(lockPath, "wx", 0o600);
  let journal: FileHandle | undefined;
  let changed = 0;
  let matched = 0;
  try {
    let lockedState: State = {
      version: 1,
      guildId: experienceGuildId,
      channels: {},
      guides: {},
      sources: {},
      pendingCreation: null,
    };
    try {
      lockedState = stateSchema.parse(await privateJson(statePath));
    } catch (error: unknown) {
      if (!(
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ))
        throw error;
    }
    if (!isDeepStrictEqual(lockedState, state))
      throw new DiscordAuditError(
        "Recovery state changed while acquiring the operator lock. Rerun the preview before applying.",
      );
    const auditDirectory = await saveDiscordAudit(
      snapshot,
      analyzeDiscordAudit(snapshot),
      process.cwd(),
    );
    console.log(`Before snapshot: ${auditDirectory}`);
    journal = await open(
      path.join(root, `journal-${Date.now()}.jsonl`),
      "wx",
      0o600,
    );
    const checkpoint = async (
      record: Record<string, unknown>,
    ): Promise<void> => {
      if (!journal)
        throw new DiscordAuditError("Recovery journal is unavailable.");
      await journal.appendFile(
        JSON.stringify({ at: new Date().toISOString(), ...record }) + "\n",
      );
      await journal.sync();
    };
    const saveState = async (): Promise<void> => {
      const temporary = path.join(root, `state-${process.pid}.tmp`);
      const file = await open(temporary, "wx", 0o600);
      try {
        await file.writeFile(JSON.stringify(stateSchema.parse(state)) + "\n");
        await file.sync();
      } finally {
        await file.close();
      }
      await rename(temporary, statePath);
    };
    const edit = async (
      before: ExperienceChannel,
      patch: ExperiencePatch,
    ): Promise<ExperienceChannel> => {
      if (experiencePatchMatches(before, patch)) {
        matched++;
        return before;
      }
      if (
        !experiencePermission(snapshot, before, 4) ||
        (patch.permission_overwrites &&
          !experiencePermission(snapshot, before, 28))
      )
        throw new DiscordAuditError(
          "Channel edit permissions changed; stop and review.",
        );
      await checkpoint({
        operation: "channel-patch",
        status: "pending",
        before,
        patch,
      });
      await request(
        `/channels/${before.id}`,
        "PATCH",
        patch,
        async (): Promise<void> => {
          assertExperienceUnchanged(before, await getChannel(before.id));
        },
      );
      const after = await getChannel(before.id);
      assertExperienceAccessPreserved(before, after, patch);
      assertGroupTagsRetained(before, after);
      if (!experiencePatchMatches(after, patch))
        throw new DiscordAuditError(
          "Channel patch did not match its read-back; inspect the journal.",
        );
      await checkpoint({
        operation: "channel-patch",
        status: "verified",
        after,
      });
      changed++;
      console.log(`Verified channel ${after.id}`);
      return after;
    };
    if (state.pendingCreation) {
      const key = state.pendingCreation;
      const faction = groupFactions.find(
        (item): boolean =>
          key === `${item.key}-pve` || key === `${item.key}-pvp`,
      )!;
      const kind = key.endsWith("-pve") ? "pve" : "pvp";
      const sourceId =
        kind === "pve" ? faction.pveSourceId : faction.pvpSourceId;
      const original = state.sources[sourceId];
      if (!original)
        throw new DiscordAuditError(
          "The recorded creation has no source baseline; manual reconciliation is required.",
        );
      assertExperienceUnchanged(original, await getChannel(sourceId));
      const forum = await getChannel(state.channels[key]);
      if (
        forum.type !== 15 ||
        forum.parent_id !== faction.parentId ||
        forum.name !== `lfg-${kind}`
      )
        throw new DiscordAuditError(
          "The recorded pending forum changed identity; manual reconciliation is required.",
        );
      const configured = await prepareGroupForum(
        snapshot,
        original,
        forum,
        kind,
        faction,
        edit,
      );
      await checkpoint({
        operation: "reconcile-created-forum",
        status: "verified",
        key,
        after: configured,
      });
      state.pendingCreation = null;
      await saveState();
    }
    for (const faction of groupFactions) {
      for (const kind of ["pve", "pvp"] as const) {
        const key = `${faction.key}-${kind}`;
        const sourceId =
          kind === "pve" ? faction.pveSourceId : faction.pvpSourceId;
        let source = await getChannel(sourceId);
        assertExperienceUnchanged(initial.get(sourceId)!, source);
        if (source.type !== 0)
          throw new DiscordAuditError(
            "An LFG source is no longer a text channel.",
          );
        if (!state.sources[sourceId]) {
          if (
            source.parent_id !== faction.parentId ||
            source.name !== `lfg-${kind}`
          )
            throw new DiscordAuditError(
              "An unrecorded LFG source changed scope; do not adopt or archive it blindly.",
            );
          state.sources[sourceId] = source;
          await saveState();
        }
        const original = state.sources[sourceId];
        if (
          original.id !== sourceId ||
          original.guild_id !== experienceGuildId ||
          original.type !== 0 ||
          original.parent_id !== faction.parentId
        )
          throw new DiscordAuditError(
            "Recovery source identity is inconsistent.",
          );
        if (!state.channels[key]) {
          if (
            allBefore.some(
              (channel): boolean =>
                channel.name === `lfg-${kind}` &&
                channel.parent_id === faction.parentId &&
                channel.type === 15,
            )
          )
            throw new DiscordAuditError(
              "An unrecorded replacement forum exists; reconcile instead of duplicating it.",
            );
          assertExperienceUnchanged(original, source);
          const parent = await getChannel(faction.parentId);
          assertExperienceUnchanged(initial.get(faction.parentId)!, parent);
          const payload = {
            name: `lfg-${kind}`,
            type: 15,
            parent_id: faction.parentId,
            nsfw: original.nsfw ?? false,
            permission_overwrites: original.permission_overwrites,
            topic: groupGuidelines(kind, faction),
            available_tags: groupTags(kind),
            flags: 16,
            default_forum_layout: 1,
            default_sort_order: 1,
            default_auto_archive_duration: 1440,
            rate_limit_per_user: 60,
            default_thread_rate_limit_per_user: 0,
          };
          state.pendingCreation = key;
          await saveState();
          await checkpoint({
            operation: "create-forum",
            status: "pending",
            key,
            payload,
          });
          let response: unknown;
          try {
            response = await request(
              `/guilds/${experienceGuildId}/channels`,
              "POST",
              payload,
              async (): Promise<void> => {
                assertExperienceUnchanged(original, await getChannel(sourceId));
                assertExperienceUnchanged(parent, await getChannel(parent.id));
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
          const created = experienceChannelSchema.parse(response);
          if (
            created.guild_id !== experienceGuildId ||
            created.type !== 15 ||
            created.parent_id !== faction.parentId ||
            created.name !== payload.name
          )
            throw new DiscordAuditError(
              "Forum creation returned unexpected identity; reconcile before retrying.",
            );
          state.channels[key] = created.id;
          await saveState();
          const verified = await getChannel(created.id);
          assertCopiedGroupAccess(original, verified);
          assertGroupForumAccess(snapshot, verified);
          const configured = await prepareGroupForum(
            snapshot,
            original,
            verified,
            kind,
            faction,
            edit,
          );
          await checkpoint({
            operation: "create-forum",
            status: "verified",
            key,
            after: configured,
          });
          state.pendingCreation = null;
          await saveState();
          changed++;
          console.log(`Created ${faction.label} lfg-${kind}: ${created.id}`);
        }
        let forum = await getChannel(state.channels[key]);
        if (
          forum.type !== 15 ||
          forum.parent_id !== faction.parentId ||
          forum.name !== `lfg-${kind}`
        )
          throw new DiscordAuditError(
            "A recorded replacement forum changed scope; preserve it and review.",
          );
        forum = await prepareGroupForum(
          snapshot,
          original,
          forum,
          kind,
          faction,
          edit,
        );
        source = await getChannel(sourceId);
        assertExperienceUnchanged(initial.get(sourceId)!, source);
        const archived = await edit(source, {
          name: `${faction.key}-lfg-${kind}-archive`,
          parent_id: archive.id,
          topic: `Original ${faction.label} ${kind === "pve" ? "PvE" : "PvP"} group chat, preserved read-only. New groups and replies belong in <#${forum.id}>; existing messages and threads are not copied or deleted.`,
          permission_overwrites: readOnlyArchiveOverwrites(source, snapshot),
        });
        assertGroupArchive(snapshot, original, archived);
      }
      for (const [kind, id] of [
        ["scheduled", faction.scheduledId],
        ["looking", faction.lookingId],
        ["recruitment", faction.recruitmentId],
      ] as const) {
        const before = await getChannel(id);
        assertExperienceUnchanged(initial.get(id)!, before);
        if (
          before.type !== 15 ||
          before.parent_id !== faction.parentId ||
          (before.name !==
            (kind === "scheduled"
              ? "pugs-adverts"
              : kind === "looking"
                ? "lf-guild"
                : "guild-recruitment") &&
            !(kind === "scheduled" && before.name === "scheduled-runs"))
        )
          throw new DiscordAuditError(
            "An existing recruitment/run forum changed scope.",
          );
        const after = await edit(
          before,
          groupForumPatch(before, kind, faction),
        );
        assertGroupForumAccess(snapshot, after);
      }
      const rules = await getChannel(faction.rulesId);
      assertExperienceUnchanged(initial.get(rules.id)!, rules);
      if (rules.type !== 5 || rules.parent_id !== faction.parentId)
        throw new DiscordAuditError("Faction posting rules changed scope.");
      await edit(rules, {
        topic: factionRulesTopic(
          faction,
          state.channels[`${faction.key}-pve`],
          state.channels[`${faction.key}-pvp`],
        ),
      });
      const guideContent = factionGroupGuide(
        faction,
        state.channels[`${faction.key}-pve`],
        state.channels[`${faction.key}-pvp`],
      );
      if (guideContent.length > 2000)
        throw new DiscordAuditError(
          "The current rules guide exceeds the message limit.",
        );
      if (!state.guides[faction.key]) {
        state.pendingCreation = `guide:${faction.key}`;
        await saveState();
        await checkpoint({
          operation: "current-rules-guide",
          status: "pending",
          channelId: rules.id,
          content: guideContent,
        });
        let response: unknown;
        try {
          response = await request(
            `/channels/${rules.id}/messages`,
            "POST",
            {
              content: guideContent,
              allowed_mentions: { parse: [] },
              flags: 4096,
            },
            async (): Promise<void> => {
              const current = await getChannel(rules.id);
              if (
                current.type !== 5 ||
                current.parent_id !== faction.parentId ||
                !experiencePermission(snapshot, current, 11)
              )
                throw new DiscordAuditError(
                  "Posting rules changed scope or access before publication.",
                );
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
        const created = messageSchema.parse(response);
        if (
          created.channel_id !== rules.id ||
          created.author.id !== snapshot.bot.id ||
          created.content !== guideContent
        )
          throw new DiscordAuditError(
            "Current guide creation returned unexpected identity; reconcile before retrying.",
          );
        state.guides[faction.key] = created.id;
        await saveState();
        const verified = messageSchema.parse(
          await request(`/channels/${rules.id}/messages/${created.id}`),
        );
        if (!isDeepStrictEqual(verified, created))
          throw new DiscordAuditError("New current guide read-back failed.");
        await checkpoint({
          operation: "current-rules-guide",
          status: "verified",
          faction: faction.key,
          messageId: created.id,
        });
        state.pendingCreation = null;
        await saveState();
        changed++;
      }
      const guideRoute = `/channels/${rules.id}/messages/${state.guides[faction.key]}`;
      const guide = messageSchema.parse(await request(guideRoute));
      if (
        guide.author.id !== snapshot.bot.id ||
        guide.channel_id !== rules.id ||
        guide.id !== state.guides[faction.key] ||
        guide.content !== guideContent
      )
        throw new DiscordAuditError(
          "A recorded current guide was edited; preserve the change and review instead of replacing it.",
        );
      if (!guide.pinned) {
        await checkpoint({
          operation: "pin-current-guide",
          status: "pending",
          channelId: rules.id,
          messageId: guide.id,
        });
        await request(
          `/channels/${rules.id}/messages/pins/${guide.id}`,
          "PUT",
          undefined,
          async (): Promise<void> => {
            const current = messageSchema.parse(await request(guideRoute));
            if (
              current.author.id !== snapshot.bot.id ||
              current.content !== guideContent
            )
              throw new DiscordAuditError(
                "The current guide changed before pinning; preserve it and review.",
              );
          },
        );
        if (!messageSchema.parse(await request(guideRoute)).pinned)
          throw new DiscordAuditError("Current guide pin did not verify.");
        await checkpoint({
          operation: "pin-current-guide",
          status: "verified",
          messageId: guide.id,
        });
        changed++;
      } else matched++;
    }
    const leveling = await getChannel(levelingForumId);
    assertExperienceUnchanged(initial.get(leveling.id)!, leveling);
    if (
      leveling.type !== 15 ||
      leveling.parent_id !== levelingParentId ||
      leveling.name !== "group-leveling"
    )
      throw new DiscordAuditError(
        "The recurring leveling forum changed scope.",
      );
    assertGroupForumAccess(
      snapshot,
      await edit(leveling, groupForumPatch(leveling, "leveling")),
    );

    const desiredOnboarding = routedGroupOnboarding(
      onboardingBefore,
      state.channels,
    );
    for (const faction of groupFactions)
      for (const id of factionChannelOrder(faction, state.channels)) {
        if ([faction.rulesId].includes(id)) continue;
        assertGroupForumAccess(snapshot, await getChannel(id));
      }
    if (!sameGroupOnboarding(onboardingBefore, desiredOnboarding)) {
      await checkpoint({
        operation: "onboarding-routing",
        status: "pending",
        before: onboardingBefore,
        after: desiredOnboarding,
      });
      await request(
        `/guilds/${experienceGuildId}/onboarding`,
        "PUT",
        groupOnboardingPayload(desiredOnboarding),
        async (): Promise<void> => {
          if (!sameGroupOnboarding(await getOnboarding(), onboardingBefore))
            throw new DiscordAuditError(
              "Onboarding changed during the release; preserve the owner edit and review.",
            );
        },
      );
      if (!sameGroupOnboarding(await getOnboarding(), desiredOnboarding))
        throw new DiscordAuditError(
          "Onboarding read-back failed; original prompts, traps and role mappings must remain intact.",
        );
      await checkpoint({ operation: "onboarding-routing", status: "verified" });
      changed++;
    } else matched++;

    for (const faction of groupFactions) {
      const channels = await getChannels();
      const order = factionChannelOrder(faction, state.channels);
      const current = channels
        .filter((channel): boolean => channel.parent_id === faction.parentId)
        .sort(
          (a, b): number => a.position - b.position || a.id.localeCompare(b.id),
        );
      if (
        !isDeepStrictEqual(
          current
            .filter((channel): boolean => order.includes(channel.id))
            .map((channel): string => channel.id),
          order,
        )
      ) {
        if (current.length !== order.length)
          throw new DiscordAuditError(
            "Unexpected faction channels need ordering review; no unrelated channel will be reordered.",
          );
        const positions = current
          .map((channel): number => channel.position)
          .sort((a, b): number => a - b);
        if (new Set(positions).size !== positions.length)
          throw new DiscordAuditError(
            "Overlapping faction positions need review.",
          );
        await checkpoint({
          operation: "faction-order",
          status: "pending",
          faction: faction.key,
          before: current.map((channel) => ({
            id: channel.id,
            position: channel.position,
          })),
          order,
        });
        await request(
          `/guilds/${experienceGuildId}/channels`,
          "PATCH",
          order.map((id: string, index: number) => ({
            id,
            position: positions[index],
          })),
          async (): Promise<void> => {
            const now = await getChannels();
            for (const before of current) {
              const channel = now.find(
                (item): boolean => item.id === before.id,
              );
              if (!channel || channel.position !== before.position)
                throw new DiscordAuditError(
                  "Faction channel order changed concurrently; preserve the edit.",
                );
              assertExperienceUnchanged(before, channel);
            }
          },
        );
        assertGroupOrder(await getChannels(), faction, order);
        await checkpoint({
          operation: "faction-order",
          status: "verified",
          faction: faction.key,
        });
        changed++;
      } else matched++;
    }

    const products = productStateSchema.parse(
      await privateJson(".data/discord-channel-experience/state.json"),
    );
    const directory = await getChannel(products.channels["tool-directory"]);
    if (
      directory.type !== 15 ||
      directory.name !== "tool-directory" ||
      directory.parent_id !== "1554318818237485157"
    )
      throw new DiscordAuditError("The recorded tool directory changed scope.");
    for (const [key, title] of Object.entries(productTitles)) {
      const entry = products.entries[key];
      if (!entry)
        throw new DiscordAuditError(
          "A recorded product entry is missing; do not create a replacement blindly.",
        );
      const thread = productThreadSchema.parse(
        await request(`/channels/${entry.threadId}`),
      );
      const route = `/channels/${entry.threadId}/messages/${entry.messageId}`;
      const message = messageSchema.parse(await request(route));
      if (
        thread.guild_id !== experienceGuildId ||
        thread.parent_id !== directory.id ||
        thread.owner_id !== snapshot.bot.id ||
        thread.name !== title ||
        message.author.id !== snapshot.bot.id ||
        message.id !== entry.messageId ||
        message.channel_id !== entry.threadId
      )
        throw new DiscordAuditError(
          "Contributor changes are limited to the three known bot-authored product entries.",
        );
      const content = neutralContributorCopy(message.content);
      if (content === message.content) {
        matched++;
        continue;
      }
      if (content.length > 2000)
        throw new DiscordAuditError(
          "Contributor update exceeds the message limit.",
        );
      await checkpoint({
        operation: "neutral-contributor-copy",
        status: "pending",
        key,
        before: message,
        content,
      });
      await request(
        route,
        "PATCH",
        { content, allowed_mentions: { parse: [] } },
        async (): Promise<void> => {
          if (
            !isDeepStrictEqual(
              messageSchema.parse(await request(route)),
              message,
            )
          )
            throw new DiscordAuditError(
              "Product entry changed concurrently; preserve it and review.",
            );
          if (
            !isDeepStrictEqual(
              productThreadSchema.parse(
                await request(`/channels/${entry.threadId}`),
              ),
              thread,
            )
          )
            throw new DiscordAuditError(
              "Product thread changed concurrently; preserve it and review.",
            );
        },
      );
      const after = messageSchema.parse(await request(route));
      if (after.author.id !== snapshot.bot.id || after.content !== content)
        throw new DiscordAuditError("Contributor wording did not verify.");
      await checkpoint({
        operation: "neutral-contributor-copy",
        status: "verified",
        key,
      });
      changed++;
    }
    const finalChannels = await getChannels();
    const final = await collectDiscordAudit(credentials);
    assertExperienceScope(final);
    assertGroupGuildPreserved(snapshot, final);
    if (
      allBefore.some(
        (channel): boolean =>
          !finalChannels.some((item): boolean => item.id === channel.id),
      )
    )
      throw new DiscordAuditError(
        "A retained channel identity changed; review the journal.",
      );
    const touched = new Set([
      ...Object.values(state.channels),
      ...groupFactions.flatMap((faction): string[] => [
        faction.rulesId,
        faction.pveSourceId,
        faction.pvpSourceId,
        faction.scheduledId,
        faction.lookingId,
        faction.recruitmentId,
      ]),
      levelingForumId,
    ]);
    for (const before of allBefore) {
      const after = finalChannels.find(
        (channel): boolean => channel.id === before.id,
      )!;
      if (!touched.has(before.id)) assertExperienceUnchanged(before, after);
      else if (
        ![
          ...groupFactions.flatMap((faction): string[] => [
            faction.pveSourceId,
            faction.pvpSourceId,
          ]),
        ].includes(before.id)
      )
        assertExperienceAccessPreserved(before, after, {});
      assertGroupTagsRetained(before, after);
    }
    for (const faction of groupFactions) {
      assertGroupOrder(
        finalChannels,
        faction,
        factionChannelOrder(faction, state.channels),
      );
      for (const kind of ["pve", "pvp"] as const) {
        const sourceId =
          kind === "pve" ? faction.pveSourceId : faction.pvpSourceId;
        const forum = finalChannels.find(
          (channel): boolean =>
            channel.id === state.channels[`${faction.key}-${kind}`],
        )!;
        assertCopiedGroupAccess(state.sources[sourceId], forum);
        assertGroupForumAccess(final, forum);
        assertGroupArchive(
          final,
          state.sources[sourceId],
          finalChannels.find((channel): boolean => channel.id === sourceId)!,
        );
      }
      for (const id of [
        faction.scheduledId,
        faction.lookingId,
        faction.recruitmentId,
      ])
        assertGroupForumAccess(
          final,
          finalChannels.find((channel): boolean => channel.id === id)!,
        );
    }
    assertGroupForumAccess(
      final,
      finalChannels.find((channel): boolean => channel.id === levelingForumId)!,
    );
    if (!sameGroupOnboarding(await getOnboarding(), desiredOnboarding))
      throw new DiscordAuditError(
        "Onboarding changed before final verification.",
      );
    await saveDiscordAudit(final, analyzeDiscordAudit(final), process.cwd());
    await checkpoint({
      operation: "release",
      status: "complete",
      changed,
      matched,
      created: state.channels,
    });
    console.log(
      JSON.stringify(
        {
          verifiedChanges: changed,
          alreadyMatched: matched,
          forums: state.channels,
          retainedSourceChannels: 4,
          standardizedExistingForums: 7,
          contributorEntries: 3,
          pinnedCurrentGuides: state.guides,
          deletedMessages: 0,
          deletedChannels: 0,
          alteredRoles: 0,
          bridgeActivated: false,
        },
        null,
        2,
      ),
    );
  } finally {
    try {
      await journal?.close();
    } finally {
      await lock.close();
      await unlink(lockPath);
    }
  }
}

main().catch((error: unknown): void => {
  console.error(
    error instanceof DiscordAuditError
      ? error.message
      : "Group-channel release stopped. Inspect private recovery state; raw errors are suppressed.",
  );
  process.exitCode = 1;
});
