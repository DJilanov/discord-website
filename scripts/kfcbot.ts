import "./env";
import { parseArgs } from "node:util";
import {
  analyzeDiscordAudit,
  auditCredentialsSchema,
  auditIdentitySchema,
  auditInstallUrl,
} from "../lib/discord-audit";
import {
  collectDiscordAudit,
  DiscordAuditError,
} from "../lib/discord-audit-client";
import { saveDiscordAudit } from "../lib/discord-audit-files";

async function main(): Promise<void> {
  let argumentsParsed: ReturnType<typeof parseArgs>;
  try {
    argumentsParsed = parseArgs({
      args: process.argv.slice(2),
      allowPositionals: true,
      strict: true,
      options: {
        "application-id": { type: "string" },
        "guild-id": { type: "string" },
        help: { type: "boolean" },
      },
    });
  } catch {
    throw new DiscordAuditError(
      "Unknown or invalid argument. Use npm run bot:setup -- --help. Tokens are accepted only through KFCBOT_TOKEN.",
    );
  }
  const { positionals, values } = argumentsParsed;
  if (values.help) {
    console.log(
      "WoWForeverBot configuration audit (GET-only; no Discord writes).\n\nnpm run bot:setup -- --application-id YOUR_APPLICATION_ID --guild-id YOUR_SERVER_ID\nnpm run bot:audit\n\nSet KFCBOT_APPLICATION_ID, KFCBOT_GUILD_ID and KFCBOT_TOKEN in gitignored .env.local. Setup needs only the two IDs. See docs/kfcbot-setup.md.",
    );
    return;
  }
  if (positionals.length !== 1 || !["setup", "audit"].includes(positionals[0]))
    throw new DiscordAuditError(
      "Choose bot:setup or bot:audit. There is no write/apply command.",
    );
  if (positionals[0] === "audit" && Object.keys(values).length)
    throw new DiscordAuditError(
      "Audit uses only .env.local or environment configuration. Do not override its target with command arguments.",
    );
  const identity = auditIdentitySchema.safeParse({
    applicationId:
      values["application-id"] ?? process.env.KFCBOT_APPLICATION_ID,
    guildId: values["guild-id"] ?? process.env.KFCBOT_GUILD_ID,
  });
  if (!identity.success)
    throw new DiscordAuditError(
      "Set valid KFCBOT_APPLICATION_ID and KFCBOT_GUILD_ID values, or provide both IDs to bot:setup.",
    );
  if (positionals[0] === "setup") {
    console.log(
      "For the owner-created WoWForeverBot application, open this server install link (View Channels only):\n" +
        auditInstallUrl(identity.data.applicationId, identity.data.guildId),
    );
    console.log(
      "No Discord request was made. No token or client secret is needed to generate this link.",
    );
    return;
  }
  const credentials = auditCredentialsSchema.safeParse({
    ...identity.data,
    token: process.env.KFCBOT_TOKEN,
  });
  if (!credentials.success)
    throw new DiscordAuditError(
      "Set KFCBOT_TOKEN to the bot token in gitignored .env.local, without a Bot prefix. Never use a personal account token.",
    );
  const snapshot = await collectDiscordAudit(credentials.data);
  const report = analyzeDiscordAudit(snapshot);
  const directory = await saveDiscordAudit(snapshot, report, process.cwd());
  console.log(
    `Read-only audit saved to ${directory}\n${snapshot.channels.length} returned channels/categories; ${snapshot.roles.length} roles; ${report.findings.filter((entry) => entry.severity === "high").length} high-priority findings; ${report.findings.filter((entry) => entry.severity === "review").length} items for review.\nNo Discord changes were made. Review the coverage limitations before drawing conclusions.`,
  );
}

main().catch((error: unknown): void => {
  console.error(
    error instanceof DiscordAuditError
      ? error.message
      : "WoWForeverBot could not complete the local audit. Check filesystem access and configuration; raw errors are suppressed to protect credentials.",
  );
  process.exitCode = 1;
});
