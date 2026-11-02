import "./env";
import { lstat, open, readFile, writeFile } from "node:fs/promises";
import { z } from "zod";
import { kfcApplicationId, kfcGuildId } from "../content/kfc-community";
import { collectDiscordAudit } from "../lib/discord-audit-client";
import {
  auditChannelSchema,
  auditCredentialsSchema,
  discordId,
} from "../lib/discord-audit";
import { assertKfcScope, kfcRequest } from "../lib/kfc-community";
import { kfcAccessOnboarding } from "../lib/kfc-access-onboarding";
import { analyzeKfcAccess } from "../lib/kfc-access";
import { kfcAccessMemberBindings } from "../lib/kfc-access-members";
import {
  onboardingReadbackMatches,
  onboardingWritePayload,
} from "../lib/kfc-revision";
import { RaidingStore } from "../lib/kfc-raiding/storage";

async function main(): Promise<void> {
  if (process.argv.slice(2).some((arg) => arg !== "--apply"))
    throw new Error(
      "Use no arguments to check readiness, or --apply to finish onboarding after Rules Screening is enabled.",
    );
  const apply = process.argv.includes("--apply");
  const credentials = auditCredentialsSchema.parse({
    applicationId: kfcApplicationId,
    guildId: kfcGuildId,
    token: process.env.KFCBOT_TOKEN || process.env.DISCORD_BOT_TOKEN,
  });
  let snapshot = await collectDiscordAudit(credentials);
  assertKfcScope(snapshot);
  const screening = snapshot.guild.features.includes(
    "MEMBER_VERIFICATION_GATE_ENABLED",
  );
  if (!screening) {
    console.log(
      JSON.stringify({
        ready: false,
        reason:
          "Enable Rules Screening in Discord Safety Setup; the existing MEE6 gate remains available.",
        writes: 0,
      }),
    );
    if (apply) process.exitCode = 2;
    return;
  }
  const access = analyzeKfcAccess(
    snapshot,
    await kfcAccessMemberBindings(snapshot, credentials.token),
  );
  if (!access.passed)
    throw new Error(
      "Finish and verify the scoped access repair before changing onboarding.",
    );
  const store = new RaidingStore(".data/kfc-access");
  await store.initialize();
  const release = await store.lock();
  try {
    const config = await new RaidingStore(".data/kfc-raiding").config();
    if (!config || snapshot.onboarding.status !== "available")
      throw new Error("KFC onboarding and raiding bindings are required.");
    const channelIds = new Set<string>();
    const request = (
      route: string,
      method: "GET" | "POST" | "PUT" | "PATCH" = "GET",
      body?: unknown,
    ): Promise<unknown> =>
      kfcRequest(credentials, route, method, body, { channelIds });
    const filename = `${store.root}/onboarding.json`;
    let receipt: { lobbyId: string } | undefined;
    try {
      const info = await lstat(filename);
      if (!info.isFile() || info.isSymbolicLink() || info.mode & 0o077)
        throw new Error("Unsafe onboarding receipt.");
      receipt = z
        .object({ status: z.enum(["prepared", "active"]), lobbyId: discordId })
        .parse(JSON.parse(await readFile(filename, "utf8")) as unknown);
    } catch (error: unknown) {
      if (!(
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ))
        throw new Error(
          "The lobby creation receipt needs reconciliation before retrying.",
        );
    }
    if (!apply) {
      console.log(
        JSON.stringify({
          ready: true,
          lobby:
            receipt?.lobbyId ?? "One shared public raid lobby will be created",
          defaultChannels: 9,
          rolesChanged: 0,
        }),
      );
      return;
    }
    let lobbyId = receipt?.lobbyId;
    if (!lobbyId) {
      const existing = snapshot.channels.filter(
        (channel) =>
          channel.name === "raid-lobby" &&
          channel.parent_id === "1411601777932894301",
      );
      if (existing.length)
        throw new Error(
          "An existing raid lobby needs a reviewed binding; no duplicate created.",
        );
      const handle = await open(filename, "wx", 0o600);
      try {
        await handle.writeFile(JSON.stringify({ status: "creating" }));
        await handle.sync();
      } finally {
        await handle.close();
      }
      await store.journal({
        operation: "access-lobby-create",
        parentId: "1411601777932894301",
      });
      const created = auditChannelSchema.parse(
        await request(`/guilds/${kfcGuildId}/channels`, "POST", {
          name: "raid-lobby",
          type: 0,
          parent_id: "1411601777932894301",
          rate_limit_per_user: 10,
          topic:
            "Community raid questions for Forever and TBC. For one raid, use its post. Private guild discussions stay in the guild area. https://www.wowforeverdiscord.online/raids/help",
          permission_overwrites: [
            {
              id: kfcGuildId,
              type: 0,
              allow: String(
                (1n << 10n) | (1n << 11n) | (1n << 16n) | (1n << 38n),
              ),
              deny: "0",
            },
          ],
        }),
      );
      if (
        created.type !== 0 ||
        created.parent_id !== "1411601777932894301" ||
        created.name !== "raid-lobby"
      )
        throw new Error("Lobby creation identity mismatch.");
      lobbyId = created.id;
      await writeFile(
        filename,
        JSON.stringify({ status: "prepared", lobbyId }),
        { mode: 0o600 },
      );
    }
    channelIds.add(lobbyId);
    const lobby = auditChannelSchema.parse(
      await request(`/channels/${lobbyId}`),
    );
    if (
      lobby.id !== lobbyId ||
      lobby.type !== 0 ||
      lobby.parent_id !== "1411601777932894301"
    )
      throw new Error("The bound lobby changed.");
    snapshot = await collectDiscordAudit(credentials);
    const onboardingRoute = `/guilds/${kfcGuildId}/onboarding`;
    const current = await request(onboardingRoute);
    const desired = kfcAccessOnboarding(snapshot, current, config, lobbyId);
    await store.journal({
      operation: "access-onboarding",
      before: current,
      desired,
    });
    if (!onboardingReadbackMatches(current, desired, current)) {
      await request(onboardingRoute, "PUT", onboardingWritePayload(desired));
      if (
        !onboardingReadbackMatches(
          await request(onboardingRoute),
          desired,
          current,
        )
      )
        throw new Error("Native onboarding readback mismatch.");
    }
    await writeFile(
      filename,
      JSON.stringify({
        status: "active",
        lobbyId,
        verifiedAt: new Date().toISOString(),
      }),
      { mode: 0o600 },
    );
    console.log(
      JSON.stringify({
        ready: true,
        nativeScreening: true,
        defaultChannels: 9,
        lobbyId,
        rolesChanged: 0,
      }),
    );
  } finally {
    await release();
  }
}

void main().catch((error: unknown): void => {
  console.error(
    error instanceof Error ? error.message : "KFC onboarding update failed.",
  );
  process.exitCode = 1;
});
