import "./env";

async function main(): Promise<void> {
  const { DISCORD_BOT_TOKEN, DISCORD_APPLICATION_ID, DISCORD_GUILD_ID } =
    process.env;
  if (!DISCORD_BOT_TOKEN || !DISCORD_APPLICATION_ID || !DISCORD_GUILD_ID)
    throw new Error(
      "Configure DISCORD_BOT_TOKEN, DISCORD_APPLICATION_ID and DISCORD_GUILD_ID first.",
    );
  const commands = [
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
  const response = await fetch(
    `https://discord.com/api/v10/applications/${DISCORD_APPLICATION_ID}/guilds/${DISCORD_GUILD_ID}/commands`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(commands),
    },
  );
  if (!response.ok)
    throw new Error(
      `Discord command registration failed with HTTP ${response.status}.`,
    );
  console.log(
    "Registered eight community commands. Set the interaction URL to /api/discord/interactions on the website domain.",
  );
}
main().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});
