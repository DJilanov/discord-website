import "./env";
import { bridgeCommand } from "../lib/discord-bridge/commands";
import { raidCommand } from "../lib/raids/commands";
import { raidsEnabled } from "../lib/raids/config";
import { approveCommand, approveMessageCommand } from "../lib/raids/approval";
import { raidDiscordGuildIds } from "../lib/raids/discord-settings";

async function main(): Promise<void> {
  const { DISCORD_BOT_TOKEN, DISCORD_APPLICATION_ID, DISCORD_GUILD_ID } =
    process.env;
  if (
    !process.argv.includes("--dry-run") &&
    (!DISCORD_BOT_TOKEN || !DISCORD_APPLICATION_ID || !DISCORD_GUILD_ID)
  )
    throw new Error(
      "Configure DISCORD_BOT_TOKEN, DISCORD_APPLICATION_ID and DISCORD_GUILD_ID first.",
    );
  if (process.argv.includes("--feedback-approvals")) {
    if (!raidsEnabled())
      throw new Error("The private event pilot is disabled.");
    const guildIds = raidDiscordGuildIds().filter(
      (guildId) => guildId !== DISCORD_GUILD_ID,
    );
    const feedbackCommands = [
      approveCommand,
      approveMessageCommand,
      {
        ...raidCommand,
        options: raidCommand.options.filter(
          (option) => option.name === "repost",
        ),
      },
    ];
    if (process.argv.includes("--dry-run")) {
      console.log(
        JSON.stringify({ guildIds, commands: feedbackCommands }, null, 2),
      );
      return;
    }
    for (const guildId of guildIds) {
      for (const command of feedbackCommands) {
        const response = await fetch(
          `https://discord.com/api/v10/applications/${DISCORD_APPLICATION_ID}/guilds/${guildId}/commands`,
          {
            method: "POST",
            headers: {
              Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(command),
            signal: AbortSignal.timeout(10000),
          },
        );
        if (!response.ok)
          throw new Error(
            `Feedback approval registration failed with HTTP ${response.status}. Other commands were not overwritten.`,
          );
        await response.body?.cancel();
      }
    }
    console.log(
      `Upserted event approval and creator/admin repost commands in ${guildIds.length} feedback servers; unrelated commands preserved.`,
    );
    return;
  }
  const commands = [
    bridgeCommand,
    ...(raidsEnabled()
      ? [raidCommand, approveCommand, approveMessageCommand]
      : []),
    ...[
      { name: "report", description: "Open the private community report form" },
      { name: "appeal", description: "Appeal a community moderation decision" },
      { name: "guild", description: "Find or submit a guild listing" },
      { name: "lfg", description: "Find or post a group" },
      { name: "events", description: "Find upcoming community events" },
      { name: "help", description: "Community links and help" },
    ],
    {
      name: "check",
      description:
        "Check current reviewed alerts for an exact in-game identity",
      options: [
        {
          type: 3,
          name: "character",
          description: "Character name",
          required: true,
        },
        { type: 3, name: "realm", description: "Realm name", required: true },
        {
          type: 3,
          name: "region",
          description: "Game region",
          required: true,
          choices: ["EU", "NA", "OCE"].map((name) => ({ name, value: name })),
        },
      ],
    },
    {
      name: "role",
      description: "Choose a community role",
      options: [
        {
          type: 3,
          name: "role",
          description: "Role to add",
          required: true,
          choices: ["EU", "NA", "ALLIANCE", "HORDE", "PVE", "PVP", "RP"].map(
            (name) => ({ name, value: name }),
          ),
        },
      ],
    },
  ];
  if (process.argv.includes("--dry-run")) {
    console.log(JSON.stringify(commands, null, 2));
    return;
  }
  const endpoint = `https://discord.com/api/v10/applications/${DISCORD_APPLICATION_ID}/guilds/${DISCORD_GUILD_ID}/commands`;
  const existing = await fetch(endpoint, {
    headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!existing.ok)
    throw new Error(
      `Cannot inspect existing Discord commands (HTTP ${existing.status}). Nothing was overwritten.`,
    );
  const remote: unknown = await existing.json();
  if (
    !Array.isArray(remote) ||
    remote.some(
      (command: unknown) =>
        typeof command !== "object" ||
        command === null ||
        !("name" in command) ||
        typeof command.name !== "string",
    )
  )
    throw new Error(
      "Unexpected Discord command list. Nothing was overwritten.",
    );
  const owned = new Set([
    "report",
    "appeal",
    "guild",
    "lfg",
    "events",
    "help",
    "check",
    "role",
    "bridge",
    "raid",
    "approve",
    "Approve event",
  ]);
  if (remote.some((command: { name: string }) => !owned.has(command.name)))
    throw new Error(
      "An unrecognized remote command is missing from this manifest. Review it before bulk registration; nothing was overwritten.",
    );
  const response = await fetch(
    `https://discord.com/api/v10/applications/${DISCORD_APPLICATION_ID}/guilds/${DISCORD_GUILD_ID}/commands`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(commands),
      signal: AbortSignal.timeout(10000),
    },
  );
  if (!response.ok)
    throw new Error(
      `Discord command registration failed with HTTP ${response.status}.`,
    );
  console.log(
    `Registered ${commands.length} community commands, including bridge controls${raidsEnabled() ? " and the private raid pilot" : ""}. Set the interaction URL to /api/discord/interactions on the website domain.`,
  );
}
main().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});
