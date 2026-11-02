import "./env";
import { lstat, readFile, writeFile } from "node:fs/promises";
import { z } from "zod";
import { kfcApplicationId, kfcGuildId } from "../content/kfc-community";
import { collectDiscordAudit } from "../lib/discord-audit-client";
import {
  analyzeDiscordAudit,
  auditChannelSchema,
  auditCredentialsSchema,
  discordId,
} from "../lib/discord-audit";
import { saveDiscordAudit } from "../lib/discord-audit-files";
import {
  analyzeKfcAccess,
  kfcAccessPatches,
  kfcOverwriteFingerprint,
  snapshotWithKfcAccessPatches,
} from "../lib/kfc-access";
import { kfcAccessMemberBindings } from "../lib/kfc-access-members";
import { applyKfcAccessPatches } from "../lib/kfc-access-runner";
import { kfcRequest } from "../lib/kfc-community";
import { RaidingStore } from "../lib/kfc-raiding/storage";

const patchSchema = z.object({
  channelId: discordId,
  channelName: z.string(),
  channelType: z.number().int(),
  parentId: discordId.nullable(),
  scope: z.enum([
    "guild",
    "staff",
    "instructions",
    "community",
    "applications",
    "legacy-menu",
  ]),
  before: auditChannelSchema.shape.permission_overwrites,
  after: auditChannelSchema.shape.permission_overwrites,
});
const previewSchema = z.object({
  createdAt: z.string(),
  snapshotDirectory: z.string(),
  patches: z.array(patchSchema),
});

async function main(): Promise<void> {
  if (process.argv.slice(2).some((arg) => arg !== "--apply"))
    throw new Error(
      "Use no arguments for preview, or --apply for the saved preview.",
    );
  const applying = process.argv.includes("--apply");
  const store = new RaidingStore(".data/kfc-access");
  await store.initialize();
  const release = await store.lock();
  try {
    const credentials = auditCredentialsSchema.parse({
      applicationId: kfcApplicationId,
      guildId: kfcGuildId,
      token: process.env.KFCBOT_TOKEN || process.env.DISCORD_BOT_TOKEN,
    });
    const snapshot = await collectDiscordAudit(credentials);
    const bindings = await kfcAccessMemberBindings(snapshot, credentials.token);
    const snapshotDirectory = await saveDiscordAudit(
      snapshot,
      analyzeDiscordAudit(snapshot),
      process.cwd(),
    );
    const filename = `${store.root}/preview.json`;
    if (!applying) {
      const patches = kfcAccessPatches(snapshot, bindings);
      const after = analyzeKfcAccess(
        snapshotWithKfcAccessPatches(snapshot, patches),
        bindings,
      );
      if (!after.passed) {
        console.error(JSON.stringify(after));
        throw new Error(
          "The proposed access policy failed its permission checks.",
        );
      }
      await writeFile(
        filename,
        JSON.stringify(
          { createdAt: new Date().toISOString(), snapshotDirectory, patches },
          null,
          2,
        ),
        { mode: 0o600 },
      );
      console.log(
        JSON.stringify(
          {
            preview: filename,
            before: analyzeKfcAccess(snapshot, bindings),
            after,
            changes: patches.map(({ channelId, channelName, scope }) => ({
              channelId,
              channelName,
              scope,
            })),
          },
          null,
          2,
        ),
      );
      return;
    }
    const info = await lstat(filename);
    if (!info.isFile() || info.isSymbolicLink() || info.mode & 0o077)
      throw new Error("Unsafe access preview.");
    const preview = previewSchema.parse(
      JSON.parse(await readFile(filename, "utf8")) as unknown,
    );
    const desired = new Map(
      kfcAccessPatches(snapshot, bindings).map((patch) => [
        patch.channelId,
        patch,
      ]),
    );
    for (const patch of preview.patches) {
      const current = snapshot.channels.find(
        (channel) => channel.id === patch.channelId,
      );
      if (
        !current ||
        current.name !== patch.channelName ||
        current.type !== patch.channelType ||
        current.parent_id !== patch.parentId
      )
        throw new Error("A reviewed access destination changed.");
      const expected = desired.get(patch.channelId);
      if (
        expected &&
        kfcOverwriteFingerprint(expected.after) !==
          kfcOverwriteFingerprint(patch.after)
      )
        throw new Error("Access policy changed since preview.");
      if (
        !expected &&
        kfcOverwriteFingerprint(current.permission_overwrites) !==
          kfcOverwriteFingerprint(patch.after)
      )
        throw new Error("Unrecognized access patch.");
      desired.delete(patch.channelId);
    }
    if (desired.size)
      throw new Error("New access changes need another preview.");
    const channelIds = new Set(preview.patches.map((patch) => patch.channelId));
    const changed = await applyKfcAccessPatches(preview.patches, {
      request: async (route, method, body): Promise<unknown> =>
        kfcRequest(credentials, route, method, body, { channelIds }),
      journal: (record): Promise<void> => store.journal(record),
    });
    const fresh = await collectDiscordAudit(credentials);
    const finalBindings = await kfcAccessMemberBindings(
      fresh,
      credentials.token,
    );
    const report = analyzeKfcAccess(fresh, finalBindings);
    const receipt = {
      checkedAt: new Date().toISOString(),
      changed,
      snapshotDirectory,
      report,
      nativeScreeningEnabled: fresh.guild.features.includes(
        "MEMBER_VERIFICATION_GATE_ENABLED",
      ),
    };
    await writeFile(
      `${store.root}/verification.json`,
      JSON.stringify(receipt, null, 2),
      { mode: 0o600 },
    );
    if (!report.passed)
      throw new Error(
        "Live access verification failed; inspect the saved receipt.",
      );
    console.log(JSON.stringify(receipt, null, 2));
  } finally {
    await release();
  }
}

void main().catch((error: unknown): void => {
  console.error(
    error instanceof Error ? error.message : "KFC access repair failed.",
  );
  process.exitCode = 1;
});
