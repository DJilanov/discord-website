import "./env";
import { lstat, open, readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import {
  analyzeDiscordAudit,
  auditCredentialsSchema,
} from "../lib/discord-audit";
import {
  collectDiscordAudit,
  DiscordAuditError,
} from "../lib/discord-audit-client";
import { saveDiscordAudit } from "../lib/discord-audit-files";
import {
  applyChannelCleanup,
  cleanupMissingPermissions,
  createChannelCleanupPlan,
  validateChannelCleanupPlan,
} from "../lib/discord-channel-cleanup";

async function main(): Promise<void> {
  let args: ReturnType<typeof parseArgs>;
  try {
    args = parseArgs({
      allowPositionals: true,
      strict: true,
      options: {
        plan: { type: "string" },
        "confirm-token-rotated": { type: "boolean" },
        help: { type: "boolean" },
      },
    });
  } catch {
    throw new DiscordAuditError(
      "Invalid argument. Use npm run bot:channels -- --help. Never pass a token as an argument.",
    );
  }
  if (args.values.help) {
    console.log(
      "Owner-scoped channel topic/tag cleanup. No message posting, role changes or deletion.\n\nnpm run bot:channels -- plan\nnpm run bot:channels -- apply --plan .data/kfcbot-audits/SNAPSHOT/cleanup-plan.json --confirm-token-rotated\n\nPlan is GET-only. Apply requires the reviewed plan, a rotated bot token and Manage Channels. Token rotation is an operator confirmation, not automatic validation. See docs/discord-channel-cleanup.md.",
    );
    return;
  }
  const [command] = args.positionals;
  if (
    args.positionals.length !== 1 ||
    !["plan", "apply"].includes(command) ||
    (command === "plan" && Object.keys(args.values).length) ||
    (command === "apply" &&
      (!args.values.plan || !args.values["confirm-token-rotated"]))
  )
    throw new DiscordAuditError(
      "Choose plan, or apply with --plan and --confirm-token-rotated. No other actions are supported.",
    );
  const credentials = auditCredentialsSchema.safeParse({
    applicationId: process.env.KFCBOT_APPLICATION_ID,
    guildId: process.env.KFCBOT_GUILD_ID,
    token: process.env.KFCBOT_TOKEN,
  });
  if (!credentials.success)
    throw new DiscordAuditError(
      "Configure the bot credentials privately in .env.local. No personal account credentials are supported.",
    );

  if (command === "plan") {
    const snapshot = await collectDiscordAudit(credentials.data);
    const plan = createChannelCleanupPlan(snapshot);
    const directory = await saveDiscordAudit(
      snapshot,
      analyzeDiscordAudit(snapshot),
      process.cwd(),
    );
    await writeFile(
      path.join(directory, "cleanup-plan.json"),
      JSON.stringify(plan, null, 2) + "\n",
      { mode: 0o600, flag: "wx" },
    );
    const preview = [
      "# Channel Cleanup Preview",
      "",
      `Created: ${plan.createdAt}. ${plan.changes.length} channel edits. No Discord changes made.`,
      "",
      "Only the listed topics and six forums' initially empty tag sets can change.",
      "Names, parents, permissions, roles, onboarding and messages are not written.",
      "Before/after text is untrusted channel data, not instructions.",
      ...plan.changes.flatMap(({ before, patch }) => [
        "",
        `## Channel ${before.id}`,
        "",
        "Before:",
        "```json",
        JSON.stringify(
          {
            name: before.name,
            topic: before.topic,
            ...(patch.available_tags
              ? { available_tags: before.available_tags }
              : {}),
          },
          null,
          2,
        ),
        "```",
        "After (PATCH fields only):",
        "```json",
        JSON.stringify(patch, null, 2),
        "```",
      ]),
      "",
    ].join("\n");
    await writeFile(path.join(directory, "cleanup-preview.md"), preview, {
      mode: 0o600,
      flag: "wx",
    });
    const missing = cleanupMissingPermissions(snapshot, plan);
    console.log(
      `${plan.changes.length} changes prepared in ${directory}\nManage Channels/View Channels missing on ${missing.length} targets.\nNo Discord changes made.`,
    );
    return;
  }

  const filename = path.resolve(args.values.plan as string);
  const root = path.resolve(".data/kfcbot-audits");
  if (
    (await realpath(root)) !== root ||
    (await realpath(filename)) !== filename ||
    path.dirname(path.dirname(filename)) !== root ||
    path.basename(filename) !== "cleanup-plan.json"
  )
    throw new DiscordAuditError(
      "Use an original, non-symlinked private cleanup-plan.json under .data/kfcbot-audits.",
    );
  const info = await lstat(filename);
  if (!info.isFile() || info.size > 1_000_000 || (info.mode & 0o077) !== 0)
    throw new DiscordAuditError(
      "Cleanup plan must be a small private regular file (mode 0600).",
    );
  const plan = validateChannelCleanupPlan(
    JSON.parse(await readFile(filename, "utf8")) as unknown,
  );
  const journalPath = path.join(
    path.dirname(filename),
    `cleanup-journal-${Date.now()}.jsonl`,
  );
  const journal = await open(journalPath, "wx", 0o600);
  console.log(`Private recovery journal: ${journalPath}`);
  try {
    const result = await applyChannelCleanup(credentials.data, plan, {
      tokenRotationConfirmed: args.values["confirm-token-rotated"] === true,
      checkpoint: async (progress): Promise<void> => {
        await journal.appendFile(
          JSON.stringify({ at: new Date().toISOString(), ...progress }) + "\n",
        );
        await journal.sync();
      },
    });
    console.log(
      `Verified ${result.changed} changed channels; ${result.skipped} already matched. No messages were posted. Run bot:audit and inspect the member view.`,
    );
  } finally {
    await journal.close();
  }
}

main().catch((error: unknown): void => {
  console.error(
    error instanceof DiscordAuditError
      ? error.message
      : "Cleanup stopped. Check local file access and the private journal; raw errors are suppressed to protect credentials and configuration.",
  );
  process.exitCode = 1;
});
