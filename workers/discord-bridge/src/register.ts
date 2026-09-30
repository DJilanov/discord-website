import { createHash } from "node:crypto";
import { Routes } from "discord-api-types/v10";
import { z } from "zod";
import {
  applicationId,
  guilds,
} from "../../../lib/discord-bridge/contracts.js";
import { bridgeCommand } from "../../../lib/discord-bridge/commands.js";
import { DiscordTransport } from "./transport.js";

async function main(): Promise<void> {
  const token = process.env.BRIDGE_BOT_TOKEN;
  if (!token)
    throw new Error(
      "BRIDGE_BOT_TOKEN is required in the private worker environment.",
    );
  const transport = new DiscordTransport(token);
  await transport.identity();
  const changes: {
    guildId: string;
    commandId: string | null;
    previous: unknown;
    desired: typeof bridgeCommand;
  }[] = [];
  for (const guildId of Object.values(guilds)) {
    const existing = z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          description: z.string(),
          options: z.unknown().optional(),
          type: z.number(),
        }),
      )
      .parse(
        await transport.rest.get(
          Routes.applicationGuildCommands(applicationId, guildId),
        ),
      );
    const command = existing.find((value) => value.name === "bridge");
    changes.push({
      guildId,
      commandId: command?.id || null,
      previous: command || null,
      desired: bridgeCommand,
    });
  }
  const digest = createHash("sha256")
    .update(JSON.stringify(changes))
    .digest("hex");
  console.log(
    JSON.stringify({ action: "bridge-command-only", changes, digest }, null, 2),
  );
  const apply = process.argv
    .find((arg) => arg.startsWith("--apply="))
    ?.slice(8);
  if (!apply) {
    console.log(
      "Dry run only. Review the exact diff, then use --apply=<digest>. Unrelated commands are unchanged.",
    );
    return;
  }
  if (apply !== digest)
    throw new Error("Command configuration changed; review a new dry run.");
  for (const change of changes) {
    if (change.commandId)
      await transport.rest.patch(
        Routes.applicationGuildCommand(
          applicationId,
          change.guildId,
          change.commandId,
        ),
        { body: bridgeCommand },
      );
    else
      await transport.rest.post(
        Routes.applicationGuildCommands(applicationId, change.guildId),
        { body: bridgeCommand },
      );
  }
  console.log("Registered only /bridge in the two approved guilds.");
}
main().catch(() => {
  console.error(
    "Bridge command registration failed. No credentials or Discord error payloads were logged.",
  );
  process.exitCode = 1;
});
