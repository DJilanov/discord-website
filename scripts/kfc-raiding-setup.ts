import "./env";
import { mkdir, open, readFile, rename } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { z } from "zod";
import {
  kfcApplicationId,
  kfcGuildId,
  kfcManagementRoleId,
} from "../content/kfc-community";
import {
  alertGuide,
  forumGuide,
  helpTags,
  raidTags,
  raidingLayout,
} from "../content/kfc-raiding";
import { collectDiscordAudit } from "../lib/discord-audit-client";
import {
  auditChannelSchema,
  auditCredentialsSchema,
  discordId,
} from "../lib/discord-audit";
import { kfcOverwrites, kfcRequest } from "../lib/kfc-community";
import {
  editions,
  messageBindingSchema,
  raidingConfigSchema,
  type Edition,
  type MessagePayload,
  type RaidingConfig,
} from "../lib/kfc-raiding/contracts";
import { raidingClient } from "../lib/kfc-raiding/transport";

const setupSchema = z.object({
  pending: z.string().nullable().default(null),
  channels: z.record(z.string(), discordId).default({}),
  roles: z.record(z.string(), discordId).default({}),
  messages: z.record(z.string(), messageBindingSchema).default({}),
});

async function main(): Promise<void> {
  const { values } = parseArgs({ options: { apply: { type: "boolean" } } });
  const credentials = auditCredentialsSchema.parse({
    applicationId: kfcApplicationId,
    guildId: kfcGuildId,
    token: process.env.KFCBOT_TOKEN || process.env.DISCORD_BOT_TOKEN,
  });
  const snapshot = await collectDiscordAudit(credentials);
  const root = path.join(process.cwd(), ".data/kfc-raiding");
  const wanted = [
    "forever-schedule",
    "forever-raids",
    "Forever Raid Voice 1",
    "tbc-raids",
    "tbc-raid-help",
  ];
  if (!values.apply) {
    console.log(
      JSON.stringify({
        create: wanted,
        rename: [
          "tbc-announcements → tbc-schedule",
          "raid-chat → tbc-raid-chat",
        ],
        newAlertRoles: ["Forever raid alerts", "TBC raid alerts"],
        liveRaidsPreserved: true,
      }),
    );
    return;
  }
  try {
    const existing = raidingConfigSchema.parse(
      JSON.parse(await readFile(path.join(root, "config.json"), "utf8")),
    );
    console.log(
      JSON.stringify({
        configured: true,
        schedules: existing.spaces,
        changed: false,
      }),
    );
    return;
  } catch (error: unknown) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT"))
      throw error;
  }
  await mkdir(root, { recursive: true, mode: 0o700 });
  const setupFile = path.join(root, "setup.json");
  let state = setupSchema.parse({});
  try {
    state = setupSchema.parse(JSON.parse(await readFile(setupFile, "utf8")));
  } catch (error: unknown) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT"))
      throw error;
  }
  if (state.pending)
    throw new Error(
      `Setup has an uncertain operation (${state.pending}); reconcile its receipt before continuing.`,
    );
  const backup = await open(
    path.join(root, `before-${Date.now()}.json`),
    "wx",
    0o600,
  );
  try {
    await backup.writeFile(JSON.stringify(snapshot));
    await backup.sync();
  } finally {
    await backup.close();
  }
  const allowed = new Set(
    snapshot.channels.map((channel): string => channel.id),
  );
  const save = async (): Promise<void> => {
    const temporary = `${setupFile}.${process.pid}.tmp`;
    const handle = await open(temporary, "wx", 0o600);
    try {
      await handle.writeFile(JSON.stringify(state));
      await handle.sync();
    } finally {
      await handle.close();
    }
    await rename(temporary, setupFile);
  };
  const create = async (
    key: string,
    route: string,
    payload: unknown,
  ): Promise<unknown> => {
    state.pending = key;
    await save();
    const result = await kfcRequest(credentials, route, "POST", payload, {
      channelIds: allowed,
    });
    return result;
  };
  const finish = async (): Promise<void> => {
    state.pending = null;
    await save();
  };
  const view = (1n << 10n) | (1n << 16n),
    send = 1n << 11n,
    replies = 1n << 38n;
  const overwrites = (
    kind: "schedule" | "raid" | "help" | "voice",
  ): Array<{ id: string; type: 0 | 1; allow: string; deny: string }> => [
    {
      id: kfcGuildId,
      type: 0,
      allow: (kind === "voice"
        ? (1n << 10n) | (1n << 20n) | (1n << 21n)
        : view |
          (kind === "schedule" ? 0n : replies) |
          (kind === "help" ? send : 0n)
      ).toString(),
      deny: (kind === "schedule"
        ? send | replies | (1n << 35n) | (1n << 36n)
        : kind === "raid"
          ? send
          : 0n
      ).toString(),
    },
    ...[kfcManagementRoleId, "1411544512949391546"].map((id) => ({
      id,
      type: 0 as const,
      allow: (view | send | replies | (1n << 14n) | (1n << 15n)).toString(),
      deny: "0",
    })),
    {
      id: kfcApplicationId,
      type: 1,
      allow: (
        view |
        send |
        replies |
        (1n << 14n) |
        (1n << 15n) |
        (1n << 34n)
      ).toString(),
      deny: "0",
    },
  ];
  const ensureChannel = async (
    key: string,
    name: string,
    parent: string,
    kind: "schedule" | "raid" | "help" | "voice",
  ): Promise<string> => {
    if (state.channels[key]) {
      allowed.add(state.channels[key]);
      return state.channels[key];
    }
    if (
      snapshot.channels.some(
        (channel): boolean =>
          channel.name === name && channel.parent_id === parent,
      )
    )
      throw new Error(`Unbound existing ${name}; do not create a duplicate.`);
    const forum = kind === "raid" || kind === "help";
    const payload = {
      name,
      type: forum ? 15 : kind === "voice" ? 2 : 0,
      parent_id: parent,
      permission_overwrites: overwrites(kind),
      ...(forum
        ? {
            default_forum_layout: 1,
            default_sort_order: kind === "raid" ? 1 : 0,
            default_auto_archive_duration: 10080,
            rate_limit_per_user: 60,
            available_tags: (kind === "raid" ? raidTags : helpTags).map(
              (tag): object => ({
                name: tag,
                moderated: ["Cancelled", "Finished"].includes(tag),
              }),
            ),
            topic:
              kind === "raid"
                ? "One post per raid session. Include date/time, host/team, access, preparation, loot and one authoritative signup. Keep updates and conversation in that post. No mass mentions or bump spam."
                : "One request per post. Include your TBC character/spec and a clear question. Keep private information out of screenshots. Tag Gear, Logs, Preparation or Attendance; mark resolved when answered.",
          }
        : {}),
    };
    const channel = auditChannelSchema.parse(
      await create(`channel:${key}`, `/guilds/${kfcGuildId}/channels`, payload),
    );
    if (
      channel.guild_id !== kfcGuildId ||
      channel.name !== name ||
      channel.parent_id !== parent
    )
      throw new Error("Setup channel readback mismatch.");
    state.channels[key] = channel.id;
    allowed.add(channel.id);
    await finish();
    return channel.id;
  };
  const ensureMessage = async (
    key: string,
    channelId: string,
    payload: MessagePayload,
    forum = false,
  ): Promise<{ channelId: string; messageId: string }> => {
    if (state.messages[key]) return state.messages[key];
    const raw = await create(
      `message:${key}`,
      `/channels/${channelId}/${forum ? "threads" : "messages"}`,
      forum
        ? {
            name: "Read first · How to join a raid",
            auto_archive_duration: 10080,
            message: payload,
          }
        : payload,
    );
    const result = z.object({ id: discordId }).parse(raw);
    const binding = {
      channelId: forum ? result.id : channelId,
      messageId: result.id,
    };
    allowed.add(binding.channelId);
    state.messages[key] = binding;
    await finish();
    await kfcRequest(
      credentials,
      `/channels/${binding.channelId}/messages/pins/${binding.messageId}`,
      "PUT",
      undefined,
      { channelIds: allowed },
    );
    if (forum)
      await kfcRequest(
        credentials,
        `/channels/${binding.channelId}`,
        "PATCH",
        { flags: 2 },
        { channelIds: allowed },
      );
    return binding;
  };
  for (const game of editions) {
    if (!state.roles[game]) {
      const role = z
        .object({
          id: discordId,
          permissions: z.literal("0"),
          managed: z.literal(false),
        })
        .parse(
          await create(`role:${game}`, `/guilds/${kfcGuildId}/roles`, {
            name: `${game === "forever" ? "Forever" : "TBC"} raid alerts`,
            permissions: "0",
            mentionable: false,
            hoist: false,
          }),
        );
      state.roles[game] = role.id;
      await finish();
    }
    const layout = raidingLayout[game];
    if (game === "forever")
      await ensureChannel(
        `${game}:schedule`,
        layout.scheduleName,
        layout.categoryId,
        "schedule",
      );
    else {
      state.channels["tbc:schedule"] = "1460899582824153140";
      const channel = snapshot.channels.find(
        (entry): boolean => entry.id === state.channels["tbc:schedule"],
      );
      if (!channel || channel.parent_id !== layout.categoryId)
        throw new Error("TBC announcements moved since review.");
      await kfcRequest(
        credentials,
        `/channels/${channel.id}`,
        "PATCH",
        {
          name: layout.scheduleName,
          topic:
            "Upcoming TBC runs in start-time order. Use the pinned schedule; open the original signup for roster, preparation and loot. Optional alerts are below.",
          permission_overwrites: kfcOverwrites(channel, snapshot, "read-only"),
        },
        { channelIds: allowed },
      );
    }
    const forumId = await ensureChannel(
      `${game}:forum`,
      layout.forumName,
      layout.categoryId,
      "raid",
    );
    await ensureMessage(`${game}:guide`, forumId, forumGuide(game), true);
    const scheduleId = state.channels[`${game}:schedule`];
    await ensureMessage(`${game}:schedule`, scheduleId, {
      content: "",
      embeds: [
        {
          title: `${game === "forever" ? "Forever" : "TBC"} raid schedule`,
          description:
            "The maintained schedule is being connected. Open the raid forum for current signup posts.",
        },
      ],
      components: [
        {
          type: 1,
          components: [
            {
              type: 2,
              style: 5,
              label: "Raid posts",
              url: `https://discord.com/channels/${kfcGuildId}/${forumId}`,
            },
          ],
        },
      ],
      allowed_mentions: { parse: [] },
    });
    await ensureMessage(`${game}:alerts`, scheduleId, alertGuide(game));
  }
  await ensureChannel(
    "forever:voice",
    raidingLayout.forever.voiceName,
    raidingLayout.forever.categoryId,
    "voice",
  );
  const helpId = await ensureChannel(
    "tbc:help",
    "tbc-raid-help",
    raidingLayout.tbc.categoryId,
    "help",
  );
  await ensureMessage(
    "tbc:help-guide",
    helpId,
    {
      content: "",
      embeds: [
        {
          title: "TBC raid help",
          description:
            "Start one post per gear, logs or preparation question. Include your character/spec, what you need help with and the relevant raid. Replies stay with the request.\n\nFor availability changes use Tentative or Absent on your actual signup and tell the host if late. An attendance question is not a public conduct report. Keep applications, disputes and personal information private.",
        },
      ],
      components: [],
      allowed_mentions: { parse: [] },
    },
    true,
  );
  await kfcRequest(
    credentials,
    `/channels/${raidingLayout.tbc.chatId}`,
    "PATCH",
    {
      name: "tbc-raid-chat",
      parent_id: raidingLayout.tbc.categoryId,
      topic:
        "General TBC raid questions. Session-specific questions, late arrivals and loot discussions belong in that raid's post.",
    },
    { channelIds: allowed },
  );
  const buildSpace = (game: Edition): RaidingConfig["spaces"]["forever"] => ({
    categoryId: raidingLayout[game].categoryId,
    schedule: state.messages[`${game}:schedule`],
    forumId: state.channels[`${game}:forum`],
    forumGuideId: state.messages[`${game}:guide`].messageId,
    chatId: raidingLayout[game].chatId,
    alertRoleId: state.roles[game],
    alerts: state.messages[`${game}:alerts`],
    tags: {},
    ...(game === "tbc" ? { helpId } : {}),
  });
  const spaces = { forever: buildSpace("forever"), tbc: buildSpace("tbc") };
  const fresh = await collectDiscordAudit(credentials);
  for (const game of editions) {
    const space = spaces[game];
    space.tags = Object.fromEntries(
      (
        fresh.channels.find((channel): boolean => channel.id === space.forumId)
          ?.available_tags ?? []
      ).map((tag): [string, string] => [tag.name, tag.id]),
    );
  }
  const config = raidingConfigSchema.parse({
    version: 1,
    guildId: kfcGuildId,
    applicationId: kfcApplicationId,
    hub: { channelId: "1557974287602819164", messageId: "1557974404913438731" },
    spaces,
    externalEditions: { "1565828787868926013": "tbc" },
    digestsEnabled: true,
  });
  const client = raidingClient(config, credentials.token);
  for (const game of editions) {
    const target = config.spaces[game].alerts;
    await client.request(
      `/channels/${target.channelId}/messages/${target.messageId}/reactions/%F0%9F%94%94/@me`,
      "PUT",
    );
  }
  const file = await open(path.join(root, "config.json"), "wx", 0o600);
  try {
    await file.writeFile(JSON.stringify(config, null, 2));
    await file.sync();
  } finally {
    await file.close();
  }
  console.log(
    JSON.stringify(
      {
        configured: true,
        schedules: editions.map((game): object => ({
          game,
          ...config.spaces[game].schedule,
        })),
        helpId,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown): void => {
  console.error(
    error instanceof Error ? error.message : "Raiding setup failed.",
  );
  process.exitCode = 1;
});
