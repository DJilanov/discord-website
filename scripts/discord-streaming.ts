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
  streamersChannelId,
  streamingChannels,
  streamingGuide,
  streamingParentId,
  type StreamingChannelIds,
} from "../content/discord-streaming";
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
import { assertExperienceScope } from "../lib/discord-channel-experience";
import {
  discordChannelRequest,
  type ChannelRequestMethod,
} from "../lib/discord-channel-request";
import {
  assertGroupGuildPreserved,
  groupOnboardingPayload,
  groupOnboardingSchema,
  sameGroupOnboarding,
  type GroupOnboarding,
} from "../lib/discord-group-channels";
import {
  assertStreamingChannel,
  assertStreamingOnboarding,
  streamingChannelPayload,
  streamingChannelSchema,
  streamingOnboarding,
  type StreamingChannel,
} from "../lib/discord-streaming";

const stateSchema = z
  .object({
    version: z.literal(1),
    guildId: z.literal(experienceGuildId),
    channels: z.object({
      alerts: discordId.optional(),
      voice: discordId.optional(),
    }),
    guides: z.object({
      alerts: discordId.optional(),
      voice: discordId.optional(),
    }),
    pendingCreation: z.string().nullable(),
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

async function readState(filename: string): Promise<State> {
  try {
    const info = await lstat(filename);
    if (
      !info.isFile() ||
      info.isSymbolicLink() ||
      (info.mode & 0o077) !== 0 ||
      info.size > 20_000 ||
      (await realpath(filename)) !== filename
    )
      throw new DiscordAuditError(
        "Streaming recovery state must be private and bounded.",
      );
    return stateSchema.parse(
      JSON.parse(await readFile(filename, "utf8")) as unknown,
    );
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT")
      return {
        version: 1,
        guildId: experienceGuildId,
        channels: {},
        guides: {},
        pendingCreation: null,
      };
    throw error;
  }
}

async function main(): Promise<void> {
  const args = parseArgs({
    options: { apply: { type: "boolean" }, help: { type: "boolean" } },
    strict: true,
  });
  if (args.values.help) {
    console.log(
      "GET-only preview by default. npm run bot:streams -- --apply creates live-now and Community Streams, a pinned text guide, a voice-chat guide and one optional post-join question. No Twitch alerts are enabled, role definitions edited, user messages copied, bridges changed or video relayed.",
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
      "Use only the approved Forever bot and server.",
    );
  const before = await collectDiscordAudit(credentials);
  assertExperienceScope(before);
  const request = (
    route: string,
    method: ChannelRequestMethod = "GET",
    body?: unknown,
    recheck?: () => Promise<void>,
  ): Promise<unknown> =>
    discordChannelRequest(credentials, route, method, body, {
      reason:
        "Owner-approved Twitch alert destination and native Discord community streaming",
      recheck,
    });
  const getChannel = async (id: string): Promise<StreamingChannel> => {
    const value = streamingChannelSchema.parse(
      await request(`/channels/${discordId.parse(id)}`),
    );
    if (value.id !== id || value.guild_id !== experienceGuildId)
      throw new DiscordAuditError("Channel identity changed; stop and review.");
    return value;
  };
  const getChannels = async (): Promise<StreamingChannel[]> => {
    const channels = z
      .array(streamingChannelSchema)
      .parse(await request(`/guilds/${experienceGuildId}/channels`));
    if (
      channels.some(
        (channel): boolean => channel.guild_id !== experienceGuildId,
      )
    )
      throw new DiscordAuditError(
        "Unexpected server in the channel inventory.",
      );
    return channels;
  };
  const getOnboarding = async (): Promise<GroupOnboarding> => {
    const onboarding = groupOnboardingSchema.parse(
      await request(`/guilds/${experienceGuildId}/onboarding`),
    );
    if (onboarding.guild_id !== experienceGuildId)
      throw new DiscordAuditError("Unexpected onboarding server.");
    return onboarding;
  };
  const initial = await getChannels();
  const onboardingBefore = await getOnboarding();
  const parent = await getChannel(streamingParentId);
  const streamers = await getChannel(streamersChannelId);
  if (
    parent.type !== 4 ||
    parent.name !== "Social & Media" ||
    streamers.type !== 0 ||
    streamers.parent_id !== parent.id
  )
    throw new DiscordAuditError("Existing creator channels changed scope.");
  const base = guildPermissions(
    before.roles,
    experienceGuildId,
    before.botRoleIds,
  );
  if (
    ![4, 5, 28].every((bit: number): boolean =>
      hasDiscordPermission(base, 1n << BigInt(bit)),
    )
  )
    throw new DiscordAuditError(
      "The operator needs Manage Channels, Manage Server and Manage Roles; no permissions were changed.",
    );
  const root = path.resolve(".data/discord-streaming");
  const statePath = path.join(root, "state.json");
  const state = await readState(statePath);
  if (state.pendingCreation)
    throw new DiscordAuditError(
      "An earlier creation is uncertain. Reconcile the private state and journal before retrying; no duplicate will be created.",
    );
  for (const definition of streamingChannels) {
    const id = state.channels[definition.key];
    const matching = initial.filter(
      (channel): boolean => channel.name === definition.name,
    );
    if (
      (id && (matching.length !== 1 || matching[0].id !== id)) ||
      (!id && matching.length)
    )
      throw new DiscordAuditError(
        "A streaming channel name is already in use or was renamed. Preserve it and reconcile manually.",
      );
    if (id)
      assertStreamingChannel(before, await getChannel(id), definition.key);
    console.log(
      `${id ? "Retain" : "Create"} ${definition.name} (${definition.type === 2 ? "voice" : "read-only text"})`,
    );
  }
  console.log(
    "Preserve all existing channels, roles, onboarding defaults and questions. Add an optional post-join streaming question; no notification role is assigned.",
  );
  console.log(
    "Twitch alerts remain pending creator links and Streamcord dashboard configuration.",
  );
  if (!args.values.apply) return;

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
  try {
    if (!isDeepStrictEqual(state, await readState(statePath)))
      throw new DiscordAuditError(
        "Recovery state changed while acquiring the lock.",
      );
    const auditDirectory = await saveDiscordAudit(
      before,
      analyzeDiscordAudit(before),
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
    const create = async (
      key: string,
      route: string,
      payload: unknown,
      recheck: () => Promise<void>,
    ): Promise<unknown> => {
      state.pendingCreation = key;
      await saveState();
      await checkpoint({ operation: key, status: "pending", route, payload });
      try {
        return await request(route, "POST", payload, recheck);
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
    };
    for (const definition of streamingChannels) {
      const key = definition.key;
      if (state.channels[key]) continue;
      const result = await create(
        `channel:${key}`,
        `/guilds/${experienceGuildId}/channels`,
        streamingChannelPayload(before, key),
        async (): Promise<void> => {
          if (
            !isDeepStrictEqual(parent, await getChannel(parent.id)) ||
            !isDeepStrictEqual(streamers, await getChannel(streamers.id))
          )
            throw new DiscordAuditError(
              "Creator channel configuration changed during creation.",
            );
          if (
            (await getChannels()).some(
              (channel): boolean => channel.name === definition.name,
            )
          )
            throw new DiscordAuditError(
              "A channel with this name appeared during creation.",
            );
        },
      );
      const created = streamingChannelSchema.parse(result);
      assertStreamingChannel(before, created, key);
      state.channels[key] = created.id;
      await saveState();
      assertStreamingChannel(before, await getChannel(created.id), key);
      await checkpoint({
        operation: `channel:${key}`,
        status: "verified",
        channelId: created.id,
      });
      state.pendingCreation = null;
      await saveState();
      console.log(`Created and verified ${definition.name}: ${created.id}`);
    }
    const channels: StreamingChannelIds = {
      alerts: discordId.parse(state.channels.alerts),
      voice: discordId.parse(state.channels.voice),
    };
    for (const definition of streamingChannels) {
      const key = definition.key;
      const channelId = channels[key];
      const content = streamingGuide(key, channels);
      if (content.length > 2000)
        throw new DiscordAuditError(
          "The streaming guide exceeds Discord's message limit.",
        );
      if (!state.guides[key]) {
        const created = messageSchema.parse(
          await create(
            `guide:${key}`,
            `/channels/${channelId}/messages`,
            { content, allowed_mentions: { parse: [] }, flags: 4096 },
            async (): Promise<void> => {
              assertStreamingChannel(before, await getChannel(channelId), key);
            },
          ),
        );
        if (
          created.channel_id !== channelId ||
          created.author.id !== before.bot.id ||
          created.content !== content
        )
          throw new DiscordAuditError(
            "The guide creation returned unexpected identity.",
          );
        state.guides[key] = created.id;
        await saveState();
        await checkpoint({
          operation: `guide:${key}`,
          status: "verified",
          channelId,
          messageId: created.id,
        });
        state.pendingCreation = null;
        await saveState();
      }
      const route = `/channels/${channelId}/messages/${state.guides[key]}`;
      const checkGuide = async (): Promise<z.infer<typeof messageSchema>> => {
        const current = messageSchema.parse(await request(route));
        if (
          current.id !== state.guides[key] ||
          current.channel_id !== channelId ||
          current.author.id !== before.bot.id ||
          current.content !== content
        )
          throw new DiscordAuditError(
            "A recorded guide changed; preserve it and review.",
          );
        return current;
      };
      const guide = await checkGuide();
      // Voice guide pinning was rejected (50019); keep it in the room chat.
      if (definition.pinGuide && !guide.pinned) {
        await checkpoint({
          operation: `pin:${key}`,
          status: "pending",
          channelId,
          messageId: guide.id,
        });
        await request(
          `/channels/${channelId}/messages/pins/${guide.id}`,
          "PUT",
          undefined,
          async (): Promise<void> => {
            await checkGuide();
          },
        );
        if (!(await checkGuide()).pinned)
          throw new DiscordAuditError("Guide pinning did not verify.");
        await checkpoint({
          operation: `pin:${key}`,
          status: "verified",
          channelId,
          messageId: guide.id,
        });
      }
    }
    if (!sameGroupOnboarding(onboardingBefore, await getOnboarding()))
      throw new DiscordAuditError(
        "Onboarding changed during setup. Preserve the owner's edits and rerun the preview.",
      );
    const proposed = streamingOnboarding(onboardingBefore, channels);
    if (!sameGroupOnboarding(onboardingBefore, proposed)) {
      await checkpoint({
        operation: "onboarding",
        status: "pending",
        before: onboardingBefore,
        proposed,
      });
      await request(
        `/guilds/${experienceGuildId}/onboarding`,
        "PUT",
        groupOnboardingPayload(proposed),
        async (): Promise<void> => {
          if (!sameGroupOnboarding(onboardingBefore, await getOnboarding()))
            throw new DiscordAuditError(
              "Onboarding changed before publication; no question was replaced.",
            );
        },
      );
      assertStreamingOnboarding(
        onboardingBefore,
        await getOnboarding(),
        channels,
      );
      await checkpoint({ operation: "onboarding", status: "verified" });
    }
    const after = await collectDiscordAudit(credentials);
    assertGroupGuildPreserved(before, after);
    const current = await getChannels();
    for (const original of initial) {
      const retained = current.find(
        (channel): boolean => channel.id === original.id,
      );
      if (
        !retained ||
        !isDeepStrictEqual(
          { ...original, position: 0 },
          { ...retained, position: 0 },
        )
      )
        throw new DiscordAuditError(
          "An existing channel changed. Review the journal without reverting owner edits.",
        );
    }
    for (const definition of streamingChannels)
      assertStreamingChannel(
        after,
        await getChannel(channels[definition.key]),
        definition.key,
      );
    assertStreamingOnboarding(
      onboardingBefore,
      await getOnboarding(),
      channels,
    );
    console.log(
      `Verified: native streaming permissions, read-only alert feed, guides, optional routing and all ${initial.length} existing channels/roles preserved.`,
    );
    for (const key of ["alerts", "voice"] as const)
      console.log(
        `${key}: https://discord.com/channels/${experienceGuildId}/${channels[key]}`,
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

void main().catch((error: unknown): void => {
  console.error(
    error instanceof DiscordAuditError
      ? error.message
      : "Streaming setup stopped; no secrets or raw upstream responses are printed. Inspect the private recovery state before retrying.",
  );
  process.exitCode = 1;
});
