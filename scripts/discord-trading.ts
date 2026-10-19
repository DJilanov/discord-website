import "./env";
import { createHash } from "node:crypto";
import { isDeepStrictEqual, parseArgs } from "node:util";
import {
  mkdir,
  open,
  readFile,
  rename,
  unlink,
  lstat,
  realpath,
  type FileHandle,
} from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import {
  experienceApplicationId,
  experienceGuildId,
} from "../content/discord-channel-experience";
import {
  tradingSources,
  tradingNames,
  tradingRulesId,
  tradingParentId,
  tradingArchiveId,
  tradingGuide,
  tradingGuidelines,
  type TradingIds,
  type TradingKey,
} from "../content/discord-trading";
import {
  auditCredentialsSchema,
  discordId,
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
  readOnlyArchiveOverwrites,
  type ExperienceChannel,
  type ExperiencePatch,
} from "../lib/discord-channel-experience";
import {
  discordChannelRequest,
  type ChannelRequestMethod,
} from "../lib/discord-channel-request";
import {
  assertGroupArchive,
  assertGroupGuildPreserved,
  groupOnboardingSchema,
  groupOnboardingPayload,
  sameGroupOnboarding,
} from "../lib/discord-group-channels";
import {
  tradingForumPayload,
  assertTradingForum,
  tradingOnboarding,
  prepareTradingForum,
  assertTradingOnboarding,
  sameTradingChannel,
} from "../lib/discord-trading";

const keys: TradingKey[] = ["alliance", "horde", "auction"];
const previousCopyHashes = {
  alliance: {
    guide: "d709b7ceef3fbf6cbf62ba45e00f7900d49a7c7a272b334000035e9b60c1ee81",
    topic: "5ff5202a504629e7ba0aac3bb76cf83563f6cabcc5bbd1a94dfef89a310ceb05",
  },
  horde: {
    guide: "0d8629f3abc9df76e0ed55112237ebab03541e785a4d45ebf6a2f2246eec3eb5",
    topic: "53f5fec821b17006084b9f6cffd39291bea7c1925b0d20347efd10a118c61675",
  },
  auction: {
    guide: "3123695cfcd5ab130c95fa70ffae5dd914cf501943fe719977c5426082ee4c17",
    topic: "4ce59126b203f0933a3d5ef1eac9c536fd801e9887738741ed595fa1f2b9c28f",
  },
};
const copyHash = (value: string): string =>
  createHash("sha256").update(value).digest("hex");
const stateSchema = z
  .object({
    version: z.literal(1),
    guildId: z.literal(experienceGuildId),
    channels: z.object({
      alliance: discordId.optional(),
      horde: discordId.optional(),
      auction: discordId.optional(),
    }),
    guides: z.record(z.string(), discordId),
    pending: z.string().nullable(),
  })
  .strict();
type State = z.infer<typeof stateSchema>;
const messageSchema = z.object({
  id: discordId,
  channel_id: discordId,
  author: z.object({ id: discordId }),
  content: z.string(),
  pinned: z.boolean().optional(),
});
const threadSchema = z.object({
  id: discordId,
  guild_id: z.literal(experienceGuildId),
  parent_id: discordId,
  owner_id: z.literal(experienceApplicationId),
  flags: z.number().int().optional(),
});

async function main(): Promise<void> {
  const args = parseArgs({
    options: {
      apply: { type: "boolean" },
      help: { type: "boolean" },
      "reconcile-created": { type: "boolean" },
      "refresh-guides": { type: "boolean" },
    },
    strict: true,
  });
  if (args.values.help) {
    console.log(
      "GET-only preview by default. --apply creates two trading forums and Auction House, pins guides, archives the two old chats without deleting history, and adds optional onboarding. No recommendations or scheduled publication are enabled.",
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
      "Approved Forever application and guild required.",
    );
  const request = (
    route: string,
    method: ChannelRequestMethod = "GET",
    body?: unknown,
  ): Promise<unknown> =>
    discordChannelRequest(credentials, route, method, body, {
      reason:
        "Owner-approved trading forums and Auction House educational channel",
    });
  const get = async (id: string): Promise<ExperienceChannel> => {
    const channel = experienceChannelSchema.parse(
      await request(`/channels/${discordId.parse(id)}`),
    );
    if (channel.guild_id !== experienceGuildId || channel.id !== id)
      throw new DiscordAuditError("Unexpected channel identity.");
    return channel;
  };
  const channels = async (): Promise<ExperienceChannel[]> =>
    z
      .array(experienceChannelSchema)
      .parse(await request(`/guilds/${experienceGuildId}/channels`));
  const onboarding = async (): Promise<z.infer<typeof groupOnboardingSchema>> =>
    groupOnboardingSchema.parse(
      await request(`/guilds/${experienceGuildId}/onboarding`),
    );
  const root = path.resolve(".data/discord-trading"),
    filename = path.join(root, "state.json");
  let state: State = {
    version: 1,
    guildId: experienceGuildId,
    channels: {},
    guides: {},
    pending: null,
  };
  try {
    const info = await lstat(filename);
    if (
      !info.isFile() ||
      info.isSymbolicLink() ||
      (info.mode & 0o077) !== 0 ||
      info.size > 20000
    )
      throw new DiscordAuditError(
        "Trading recovery state is not private and bounded.",
      );
    state = stateSchema.parse(
      JSON.parse(await readFile(filename, "utf8")) as unknown,
    );
  } catch (error: unknown) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT"))
      throw error;
  }
  const recoveryKey = keys.find(
    (key): boolean =>
      state.pending === `forum:${key}` && Boolean(state.channels[key]),
  );
  if (args.values["reconcile-created"] && (!args.values.apply || !recoveryKey))
    throw new DiscordAuditError(
      "Recovery is limited to an already recorded replacement forum with --apply.",
    );
  if (state.pending && !args.values["reconcile-created"])
    throw new DiscordAuditError(
      "An earlier creation is uncertain. Reconcile private recovery state before retrying; no duplicate will be created.",
    );
  const before = await collectDiscordAudit(credentials),
    initial = await channels(),
    onBefore = await onboarding();
  if (
    (await get(tradingParentId)).type !== 4 ||
    (await get(tradingArchiveId)).type !== 4
  )
    throw new DiscordAuditError("Trading or Archives category changed scope.");
  const rules = await get(tradingRulesId);
  const sources = {
    alliance: await get(tradingSources.alliance),
    horde: await get(tradingSources.horde),
  };
  for (const key of keys) {
    const id = state.channels[key];
    const duplicates = initial.filter(
      (c): boolean =>
        c.name === tradingNames[key] &&
        !Object.values(tradingSources).includes(
          c.id as typeof tradingSources.alliance,
        ),
    );
    if (
      id
        ? duplicates.length !== 1 || duplicates[0].id !== id
        : duplicates.length > 0
    )
      throw new DiscordAuditError(
        "A trading channel name is already in use; preserve and review.",
      );
    if (id && key !== recoveryKey) {
      const forum = await get(id);
      if (
        args.values["refresh-guides"] &&
        copyHash(forum.topic ?? "") === previousCopyHashes[key].topic
      )
        assertTradingForum(
          before,
          { ...forum, topic: tradingGuidelines(key) },
          key,
        );
      else assertTradingForum(before, forum, key);
    }
    console.log(`${id ? "Retain" : "Create"} ${tradingNames[key]} forum`);
  }
  for (const key of ["alliance", "horde"] as const) {
    const source = sources[key];
    if (
      source.type !== 0 ||
      (source.name !== tradingNames[key] &&
        source.name !== `${key}-trade-archive`)
    )
      throw new DiscordAuditError("Original trade chat changed scope.");
    for (const visibility of ["public", "private"] as const) {
      let cursor: string | undefined,
        count = 0;
      for (let page = 0; page < 100; page++) {
        const result = z
          .object({
            threads: z.array(
              z.object({
                id: discordId,
                thread_metadata: z.object({ archive_timestamp: z.string() }),
              }),
            ),
            has_more: z.boolean(),
          })
          .parse(
            await request(
              `/channels/${source.id}/threads/archived/${visibility}?limit=100${cursor ? `&before=${encodeURIComponent(cursor)}` : ""}`,
            ),
          );
        count += result.threads.length;
        if (!result.has_more) break;
        const next = result.threads.at(-1)?.thread_metadata.archive_timestamp;
        if (!next || cursor === next || page === 99)
          throw new DiscordAuditError(
            "Archived thread inventory is incomplete; stop before migration.",
          );
        cursor = next;
      }
      console.log(`${key}: preserve ${count} archived ${visibility} threads`);
    }
  }
  const active = z
    .object({
      threads: z.array(
        z.object({ id: discordId, parent_id: discordId.nullable().optional() }),
      ),
    })
    .parse(await request(`/guilds/${experienceGuildId}/threads/active`));
  console.log(
    `Preserve ${active.threads.filter((t): boolean => Object.values(tradingSources).includes(t.parent_id as typeof tradingSources.alliance)).length} active trade threads; no user messages copied or deleted.`,
  );
  const previewIds: TradingIds = {
    alliance: state.channels.alliance ?? "1555101000000000011",
    horde: state.channels.horde ?? "1555101000000000012",
    auction: state.channels.auction ?? "1555101000000000013",
  };
  tradingOnboarding(onBefore, previewIds);
  if (!args.values.apply) return;
  await mkdir(root, { recursive: true, mode: 0o700 });
  if (
    (await realpath(root)) !== root ||
    ((await lstat(root)).mode & 0o077) !== 0
  )
    throw new DiscordAuditError(
      "Trading recovery directory must be private and non-symlinked.",
    );
  const lock = await open(path.join(root, "operator.lock"), "wx", 0o600);
  let journal: FileHandle | undefined;
  try {
    await saveDiscordAudit(before, analyzeDiscordAudit(before), process.cwd());
    journal = await open(
      path.join(root, `journal-${Date.now()}.jsonl`),
      "wx",
      0o600,
    );
    const checkpoint = async (
      entry: Record<string, unknown>,
    ): Promise<void> => {
      await journal!.appendFile(
        JSON.stringify({ at: new Date().toISOString(), ...entry }) + "\n",
      );
      await journal!.sync();
    };
    const save = async (): Promise<void> => {
      const temp = path.join(root, `state-${process.pid}.tmp`),
        file = await open(temp, "wx", 0o600);
      try {
        await file.writeFile(JSON.stringify(stateSchema.parse(state)) + "\n");
        await file.sync();
      } finally {
        await file.close();
      }
      await rename(temp, filename);
    };
    const create = async (
      operation: string,
      route: string,
      body: unknown,
    ): Promise<unknown> => {
      state.pending = operation;
      await save();
      await checkpoint({ operation, status: "pending", route, body });
      try {
        return await request(route, "POST", body);
      } catch (error: unknown) {
        if (
          error instanceof DiscordAuditError &&
          error.httpStatus &&
          error.httpStatus >= 400 &&
          error.httpStatus < 500
        ) {
          state.pending = null;
          await save();
        }
        throw error;
      }
    };
    const edit = async (
      original: ExperienceChannel,
      patch: ExperiencePatch,
    ): Promise<ExperienceChannel> => {
      if (!isDeepStrictEqual(await get(original.id), original))
        throw new DiscordAuditError(
          "Channel changed concurrently; preserve the owner's edits.",
        );
      await checkpoint({
        operation: "patch",
        channelId: original.id,
        before: original,
        patch,
      });
      await request(`/channels/${original.id}`, "PATCH", patch);
      const after = await get(original.id);
      if (!experiencePatchMatches(after, patch))
        throw new DiscordAuditError("Channel patch read-back failed.");
      return after;
    };
    for (const key of keys) {
      if (state.channels[key] && args.values["refresh-guides"]) {
        const forum = await get(state.channels[key]);
        if (forum.topic !== tradingGuidelines(key)) {
          if (copyHash(forum.topic ?? "") !== previousCopyHashes[key].topic)
            throw new DiscordAuditError(
              "Trading topic changed; preserve and review.",
            );
          await edit(forum, { topic: tradingGuidelines(key) });
        }
      }
      if (!state.channels[key]) {
        const payload = tradingForumPayload(before, key);
        const created = experienceChannelSchema.parse(
          await create(
            `forum:${key}`,
            `/guilds/${experienceGuildId}/channels`,
            {
              name: payload.name,
              type: 15,
              parent_id: tradingParentId,
              nsfw: false,
              permission_overwrites: payload.permission_overwrites,
            },
          ),
        );
        if (
          created.guild_id !== experienceGuildId ||
          created.type !== 15 ||
          created.name !== payload.name
        )
          throw new DiscordAuditError("Unexpected forum creation result.");
        state.channels[key] = created.id;
        await save();
        await prepareTradingForum(before, await get(created.id), key, edit);
        state.pending = null;
        await save();
        await checkpoint({
          operation: `forum:${key}`,
          status: "verified",
          channelId: created.id,
        });
      }
      if (key === recoveryKey && state.channels[key]) {
        await prepareTradingForum(
          before,
          await get(state.channels[key]),
          key,
          edit,
        );
        state.pending = null;
        await save();
        await checkpoint({
          operation: `recover-forum:${key}`,
          status: "verified",
          channelId: state.channels[key],
        });
      }
    }
    const ids = state.channels as TradingIds;
    for (const key of keys) {
      const forum = await get(ids[key]),
        content = tradingGuide(key);
      if (content.length > 2000)
        throw new DiscordAuditError("Trading guide exceeds message limit.");
      if (!state.guides[key]) {
        const tag = forum.available_tags?.find(
          (t): boolean => t.name === (key === "auction" ? "Guide" : "Other"),
        );
        if (!tag?.id) throw new DiscordAuditError("Forum guide tag missing.");
        const result = z
          .object({
            id: discordId,
            guild_id: discordId,
            parent_id: discordId,
            message: messageSchema,
          })
          .parse(
            await create(`guide:${key}`, `/channels/${forum.id}/threads`, {
              name:
                key === "auction"
                  ? "Start here: market coverage and price-reading guide"
                  : "Start here: listing format and trading rules",
              applied_tags: [tag.id],
              auto_archive_duration: 10080,
              message: {
                content,
                allowed_mentions: { parse: [] },
                flags: 4096,
              },
            }),
          );
        if (
          result.guild_id !== experienceGuildId ||
          result.parent_id !== forum.id ||
          result.message.author.id !== before.bot.id ||
          result.message.content !== content
        )
          throw new DiscordAuditError("Unexpected guide author or content.");
        state.guides[key] = result.id;
        await save();
        state.pending = null;
        await save();
      }
      const thread = threadSchema.parse(
        await request(`/channels/${state.guides[key]}`),
      );
      if (thread.parent_id !== forum.id)
        throw new DiscordAuditError("Guide moved outside approved forum.");
      let starter = messageSchema.parse(
        await request(`/channels/${thread.id}/messages/${thread.id}`),
      );
      if (
        starter.author.id === before.bot.id &&
        starter.content !== content &&
        args.values["refresh-guides"] &&
        copyHash(starter.content) === previousCopyHashes[key].guide
      ) {
        await checkpoint({
          operation: "refresh-owned-guide",
          threadId: thread.id,
          before: starter.content,
          content,
        });
        await request(`/channels/${thread.id}/messages/${thread.id}`, "PATCH", {
          content,
          allowed_mentions: { parse: [] },
        });
        starter = messageSchema.parse(
          await request(`/channels/${thread.id}/messages/${thread.id}`),
        );
      }
      if (starter.author.id !== before.bot.id || starter.content !== content)
        throw new DiscordAuditError(
          "Existing guide changed; preserve and review.",
        );
      if (!((thread.flags ?? 0) & 2)) {
        await request(`/channels/${thread.id}`, "PATCH", {
          flags: (thread.flags ?? 0) | 2,
        });
        const verified = threadSchema.parse(
          await request(`/channels/${thread.id}`),
        );
        if (!(verified.flags! & 2))
          throw new DiscordAuditError("Guide pin read-back failed.");
      }
    }
    for (const key of ["alliance", "horde"] as const) {
      const original = await get(sources[key].id);
      const archived = await edit(original, {
        name: `${key}-trade-archive`,
        parent_id: tradingArchiveId,
        topic: `Original ${key} trading chat preserved read-only. Current listings: <#${ids[key]}>. Historical messages are not current offers. No history was copied or deleted.`,
        permission_overwrites: readOnlyArchiveOverwrites(original, before),
      });
      assertGroupArchive(before, sources[key], archived);
    }
    const policy = [
      "**Current trading-board policy**",
      `Item and profession offers belong in <#${ids.alliance}> or <#${ids.horde}>. These updated board rules supersede conflicting permissions in older messages below.`,
      `No RMT, account/character/name sales, raid-loot sales, paid boost advertisements, community boost matchmaking, commissions or escrow. Items and profession listings must identify game version, region, character ruleset, price/terms and availability. Name a market or shard only if applicable; a traditional realm is not assumed. Mark completed offers Fulfilled or Cancelled.`,
      `This community is not a boosting service or transaction guarantor. Blizzard's policies vary by game version; do not treat Discord access as permission to conduct prohibited in-game services. Official reference: https://us.forums.blizzard.com/en/wow/t/in-game-advertising-services-channel-in-burning-crusade-classic-anniversary/2238861/`,
      `Market research and scan limitations: <#${ids.auction}>. Maintained by Open source contributors; all guilds welcome.`,
    ].join("\n\n");
    if (!state.guides.rules) {
      const message = messageSchema.parse(
        await create("rules", `/channels/${rules.id}/messages`, {
          content: policy,
          allowed_mentions: { parse: [] },
          flags: 4096,
        }),
      );
      if (message.author.id !== before.bot.id || message.content !== policy)
        throw new DiscordAuditError("Unexpected trading policy result.");
      state.guides.rules = message.id;
      await save();
      state.pending = null;
      await save();
    }
    let policyMessage = messageSchema.parse(
      await request(`/channels/${rules.id}/messages/${state.guides.rules}`),
    );
    if (
      args.values["refresh-guides"] &&
      policyMessage.author.id === before.bot.id &&
      copyHash(policyMessage.content) ===
        "4ff86edc4252573c824206214418ec3c76dc4f28d79679a989ad1309b85e743b"
    ) {
      await checkpoint({
        operation: "refresh-owned-policy",
        messageId: policyMessage.id,
        before: policyMessage.content,
        content: policy,
      });
      await request(
        `/channels/${rules.id}/messages/${policyMessage.id}`,
        "PATCH",
        { content: policy, allowed_mentions: { parse: [] } },
      );
      policyMessage = messageSchema.parse(
        await request(`/channels/${rules.id}/messages/${policyMessage.id}`),
      );
    }
    if (
      policyMessage.author.id !== before.bot.id ||
      policyMessage.content !== policy
    )
      throw new DiscordAuditError(
        "Recorded policy changed; preserve and review.",
      );
    if (!policyMessage.pinned)
      await request(
        `/channels/${rules.id}/messages/pins/${policyMessage.id}`,
        "PUT",
      );
    await edit(await get(rules.id), {
      topic: `Current item and profession trading rules are pinned. Listings: <#${ids.alliance}> and <#${ids.horde}>. No paid boost advertising, RMT, escrow or community commissions. Historical policies below may be superseded.`,
    });
    if (!sameGroupOnboarding(onBefore, await onboarding()))
      throw new DiscordAuditError(
        "Onboarding changed during setup; preserve and rerun.",
      );
    const wanted = tradingOnboarding(onBefore, ids);
    if (!sameGroupOnboarding(onBefore, wanted))
      await request(
        `/guilds/${experienceGuildId}/onboarding`,
        "PUT",
        groupOnboardingPayload(wanted),
      );
    assertTradingOnboarding(onBefore, await onboarding(), ids);
    const after = await collectDiscordAudit(credentials);
    assertGroupGuildPreserved(before, after);
    const current = await channels(),
      changedIds = new Set([
        tradingRulesId,
        ...Object.values(tradingSources),
        ...Object.values(ids),
      ]);
    for (const original of initial.filter(
      (c): boolean => !changedIds.has(c.id),
    )) {
      const retained = current.find((c): boolean => c.id === original.id);
      if (!retained || !sameTradingChannel(original, retained))
        throw new DiscordAuditError(
          `Unrelated channel ${original.id} changed fields: ${Object.keys(
            original,
          )
            .filter(
              (field) =>
                field !== "position" &&
                !isDeepStrictEqual(
                  original[field as keyof ExperienceChannel],
                  retained?.[field as keyof ExperienceChannel],
                ),
            )
            .join(", ")}; review without reverting owner edits.`,
        );
    }
    for (const key of keys) {
      assertTradingForum(after, await get(ids[key]), key);
      console.log(
        `${key}: https://discord.com/channels/${experienceGuildId}/${ids[key]}`,
      );
    }
    console.log(
      "Verified trading forums, pinned guides, read-only archives and optional onboarding. No market recommendations are enabled.",
    );
  } finally {
    await journal?.close();
    await lock.close();
    await unlink(path.join(root, "operator.lock"));
  }
}
void main().catch((error: unknown): void => {
  console.error(
    error instanceof DiscordAuditError
      ? error.message
      : "Trading setup failed; secrets and raw upstream responses suppressed. Review private recovery state.",
  );
  process.exitCode = 1;
});
