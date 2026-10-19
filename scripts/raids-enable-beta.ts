import "./env";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  readFile,
  stat,
  writeFile,
  rename,
  unlink,
  chown,
} from "node:fs/promises";
import { parse } from "dotenv";
import { z } from "zod";
import { auditChannelSchema } from "../lib/discord-audit";
import {
  memberAuthIssues,
  readMemberAuthSettings,
} from "../lib/member-auth-options";

async function main(): Promise<void> {
  const project = "/home/wow-forever-discord";
  const guildId = "1554316932948172940";
  const categoryId = "1554318429115392080";
  const channelName = "event-beta";
  const mode = process.argv[2] ?? "check";
  assert.ok(
    ["check", "prepare", "activate"].includes(mode),
    "Use check, prepare or activate.",
  );
  assert.ok(
    process.platform === "linux" &&
      process.getuid?.() === 0 &&
      process.cwd() === project,
    "Run as root in the production project.",
  );
  const envPath = `${project}/.env.local`;
  const metadata = await stat(envPath);
  assert.ok(
    metadata.isFile() && (metadata.mode & 0o077) === 0,
    "Environment file must be a protected regular file.",
  );
  const source = await readFile(envPath, "utf8");
  const env = parse(source);
  assert.equal(env.DISCORD_GUILD_ID || env.KFCBOT_GUILD_ID, guildId);
  assert.equal(
    env.FOREVER_RAIDS_PUBLIC_ORIGIN,
    "https://www.wowforeverdiscord.online",
  );
  const token = env.DISCORD_BOT_TOKEN || env.KFCBOT_TOKEN;
  assert.ok(token, "Bot configuration missing.");
  const settings = readMemberAuthSettings(true, []);
  assert.equal(
    memberAuthIssues({ ...settings, accessMode: "members" }).length,
    0,
    "Member authentication configuration incomplete.",
  );

  async function request(
    path: string,
    method = "GET",
    body?: unknown,
  ): Promise<unknown> {
    const response = await fetch(`https://discord.com/api/v10${path}`, {
      method,
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json",
        "X-Audit-Log-Reason":
          "Open Discord-member event beta; preserve existing private channels",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok)
      throw new Error(
        `Discord request failed (${response.status}); no response body logged.`,
      );
    return response.json() as Promise<unknown>;
  }

  const list = z
    .array(auditChannelSchema)
    .parse(await request(`/guilds/${guildId}/channels`));
  assert.ok(
    list.some((channel) => channel.id === categoryId && channel.type === 4),
    "Community category missing.",
  );
  const matches = list.filter((channel) => channel.name === channelName);
  assert.ok(
    matches.length <= 1,
    "Duplicate beta channels require manual review.",
  );
  let channel = matches[0];
  if (!channel && mode === "prepare") {
    channel = auditChannelSchema.parse(
      await request(`/guilds/${guildId}/channels`, "POST", {
        name: channelName,
        type: 0,
        parent_id: categoryId,
        topic:
          "Community event beta | https://www.wowforeverdiscord.online/raids | Events and character rosters posted here are visible to server members. Feedback welcome.",
        rate_limit_per_user: 15,
        permission_overwrites: [
          { id: guildId, type: 0, allow: "117760", deny: "0" },
        ],
      }),
    );
  }
  if (channel) {
    assert.ok(
      channel.type === 0 && !channel.nsfw && channel.parent_id === categoryId,
      "Beta destination must be the public Community text channel.",
    );
    const everyone = channel.permission_overwrites.find(
      (overwrite) => overwrite.id === guildId && overwrite.type === 0,
    );
    assert.ok(
      everyone &&
        (BigInt(everyone.allow) & 117760n) === 117760n &&
        (BigInt(everyone.deny) & 117760n) === 0n,
      "Beta channel must allow members to view and post.",
    );
    assert.notEqual(
      channel.id,
      env.FOREVER_RAIDS_DISCORD_CHANNEL_ID,
      "Never repurpose the private test channel.",
    );
  }
  if (mode === "activate") {
    assert.ok(channel, "Run prepare first.");
    const updates: Record<string, string> = {
      FOREVER_RAIDS_ACCESS_MODE: "members",
      FOREVER_RAIDS_BETA_DISCORD_CHANNEL_ID: channel.id,
      FOREVER_RAIDS_BETA_DISCORD_CHANNEL_LABEL: "Community / #event-beta",
    };
    const lines = source
      .split(/\r?\n/)
      .filter(
        (line) =>
          !Object.keys(updates).some((key) =>
            new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=`).test(line),
          ),
      );
    const replacement = `${lines.join("\n").trimEnd()}\n${Object.entries(
      updates,
    )
      .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
      .join("\n")}\n`;
    const next = parse(replacement);
    for (const [key, value] of Object.entries(env))
      if (!(key in updates))
        assert.equal(
          next[key],
          value,
          `Unrelated environment value changed: ${key}`,
        );
    const temporary = `${envPath}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporary, replacement, { mode: 0o600, flag: "wx" });
      await chown(temporary, metadata.uid, metadata.gid);
      await rename(temporary, envPath);
    } finally {
      await unlink(temporary).catch((error: unknown) => {
        if (!(
          error instanceof Error &&
          "code" in error &&
          error.code === "ENOENT"
        ))
          throw error;
      });
    }
  }
  console.log(
    JSON.stringify({
      mode,
      channelId: channel?.id ?? null,
      channelName,
      configuredMode:
        mode === "activate"
          ? "members"
          : env.FOREVER_RAIDS_ACCESS_MODE || "pilot",
      existingPrivateChannelUnchanged: true,
    }),
  );
}
void main().catch(() => {
  console.error(
    "Member beta setup failed. Check the production path, protected configuration and Discord permissions; no credentials were logged.",
  );
  process.exitCode = 1;
});
