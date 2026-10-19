import "./env";
import { lstat, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { kfcApplicationId, kfcGuildId } from "../content/kfc-community";
import { revision } from "../content/kfc-revision";
import {
  analyzeDiscordAudit,
  auditCredentialsSchema,
  discordId,
} from "../lib/discord-audit";
import {
  collectDiscordAudit,
  DiscordAuditError,
} from "../lib/discord-audit-client";
import { analyzeKfcReadiness } from "../lib/kfc-readiness";
import { saveDiscordAudit } from "../lib/discord-audit-files";

interface PublisherBindings {
  channels: Record<string, string>;
  shamanId?: string;
}

async function bindings(directory: string): Promise<PublisherBindings> {
  const root = path.join(process.cwd(), ".data", directory);
  const file = path.join(root, "state.json");
  for (const [filename, isDirectory] of [
    [path.join(process.cwd(), ".data"), true],
    [root, true],
    [file, false],
  ] as const) {
    const stat = await lstat(filename);
    if (
      stat.isSymbolicLink() ||
      (stat.mode & 0o077) !== 0 ||
      (isDirectory ? !stat.isDirectory() : !stat.isFile())
    )
      throw new Error(
        "Readiness requires private, non-symlink publisher state.",
      );
  }
  const data: unknown = JSON.parse(await readFile(file, "utf8"));
  return z
    .object({
      guildId: z.literal(kfcGuildId),
      ...(directory === "kfc-revision"
        ? { revision: z.literal(revision) }
        : { shamanId: discordId }),
      channels: z.record(z.string(), discordId),
    })
    .parse(data);
}

async function main(): Promise<void> {
  if (process.argv.length !== 2)
    throw new Error("Readiness is GET-only and accepts no arguments.");
  const credentials = auditCredentialsSchema.parse({
    applicationId: kfcApplicationId,
    guildId: kfcGuildId,
    token: process.env.DISCORD_BOT_TOKEN || process.env.KFCBOT_TOKEN,
  });
  const community = await bindings("kfc-community");
  const revisionBindings = await bindings("kfc-revision");
  if (!community.shamanId) throw new Error("Shaman binding is missing.");
  const snapshot = await collectDiscordAudit(credentials);
  const report = analyzeKfcReadiness(snapshot, {
    community: community.channels,
    revision: revisionBindings.channels,
    shamanId: community.shamanId,
  });
  const privateAudit = await saveDiscordAudit(
    snapshot,
    analyzeDiscordAudit(snapshot),
    process.cwd(),
  );
  await writeFile(
    path.join(privateAudit, "readiness.json"),
    JSON.stringify(report, null, 2) + "\n",
    {
      mode: 0o600,
      flag: "wx",
    },
  );
  console.log(JSON.stringify({ ...report, privateAudit }, null, 2));
  if (!report.automatedChecksPassed) process.exitCode = 1;
}

main().catch((error: unknown): void => {
  console.error(
    error instanceof DiscordAuditError
      ? error.message
      : "KFC readiness failed. Check private publisher state and bot configuration; no changes made.",
  );
  process.exitCode = 1;
});
