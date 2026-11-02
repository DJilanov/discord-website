import "./env";
import { readFile, writeFile, open } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { kfcApplicationId, kfcGuildId } from "../content/kfc-community";
import {
  raidSignupHelpUrl,
  kfcRaidRolloutDescription,
  kfcWelcomeComponents,
} from "../content/kfc-raid-welcome";
import { auditCredentialsSchema } from "../lib/discord-audit";
import { kfcRequest } from "../lib/kfc-community";
import {
  routeRaidOnboarding,
  onboardingWritePayload,
  onboardingReadbackMatches,
} from "../lib/kfc-revision";
import { RaidingStore } from "../lib/kfc-raiding/storage";
import {
  newcomerMessages,
  assertNewcomerMessage,
  assertRaidDiscoveryAccess,
} from "../lib/kfc-raiding/newcomer-content";
import { raidingClient } from "../lib/kfc-raiding/transport";
import { editableMessage } from "../lib/kfc-raiding/delivery";
import { checksum } from "../lib/kfc-raiding/presentation";

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const announce = process.argv.includes("--announce");
  if (
    process.argv
      .slice(2)
      .some((flag) => !["--apply", "--announce"].includes(flag)) ||
    (announce && !apply)
  )
    throw new Error(
      "Use no arguments for preview, or --apply for the saved preview.",
    );
  const store = new RaidingStore(
    path.join(process.cwd(), ".data/kfc-raid-newcomers"),
  );
  await store.initialize();
  const release = await store.lock();
  try {
    const config = await new RaidingStore(
      path.join(process.cwd(), ".data/kfc-raiding"),
    ).config();
    if (!config) throw new Error("KFC raid-space bindings are required.");
    const credentials = auditCredentialsSchema.parse({
      applicationId: kfcApplicationId,
      guildId: kfcGuildId,
      token: process.env.KFCBOT_TOKEN || process.env.DISCORD_BOT_TOKEN,
    });
    const targets = newcomerMessages(config);
    const channels = new Set(targets.map((target) => target.channelId));
    const announcementChannel = "1411545639392645192";
    if (announce) channels.add(announcementChannel);
    const request = async (
      route: string,
      method: "GET" | "PATCH" | "PUT" | "POST" = "GET",
      body?: unknown,
    ): Promise<unknown> =>
      kfcRequest(credentials, route, method, body, { channelIds: channels });
    const identity = z
      .object({ id: z.literal(kfcApplicationId), bot: z.literal(true) })
      .parse(
        await raidingClient(config, credentials.token).request("/users/@me"),
      );
    if (!identity.bot) throw new Error("Unexpected bot identity.");
    const onboardingRoute = `/guilds/${kfcGuildId}/onboarding`;
    const onboarding = await request(onboardingRoute);
    const reads = await Promise.allSettled([
      request(`/guilds/${kfcGuildId}/channels`),
      request(`/guilds/${kfcGuildId}/roles`),
    ]);
    for (const result of reads)
      if (result.status === "rejected") throw result.reason;
    if (reads[0].status !== "fulfilled" || reads[1].status !== "fulfilled")
      throw new Error("Newcomer access could not be verified.");
    assertRaidDiscoveryAccess(
      reads[0].value,
      reads[1].value,
      routeRaidOnboarding(onboarding, config),
      config,
    );
    const filename = path.join(store.root, "preview.json");
    if (!apply) {
      const messages = [];
      for (const target of targets) {
        const before = await request(
          `/channels/${target.channelId}/messages/${target.messageId}`,
        );
        assertNewcomerMessage(before, target);
        const channel = z
          .object({
            id: z.literal(target.channelId),
            topic: z.string().nullable().optional(),
          })
          .parse(await request(`/channels/${target.channelId}`));
        messages.push({
          key: target.key,
          before,
          topic: channel.topic ?? null,
        });
      }
      const desired = routeRaidOnboarding(onboarding, config);
      await writeFile(
        filename,
        JSON.stringify(
          {
            createdAt: new Date().toISOString(),
            messages,
            onboarding,
            desired,
          },
          null,
          2,
        ),
        { mode: 0o600 },
      );
      console.log(
        JSON.stringify(
          {
            preview: filename,
            messages: targets.map((target) => ({
              key: target.key,
              description: target.payload.embeds[0].description,
              buttons: target.payload.components.flatMap((row) =>
                row.components.map((button) => button.label),
              ),
            })),
            onboardingEnabled: desired.enabled,
            newPosts: 0,
            mentions: 0,
          },
          null,
          2,
        ),
      );
      return;
    }
    const preview = z
      .object({
        messages: z.array(
          z.object({
            key: z.string(),
            before: z.unknown(),
            topic: z.string().nullable(),
          }),
        ),
        onboarding: z.unknown(),
        desired: z.unknown(),
      })
      .parse(JSON.parse(await readFile(filename, "utf8")));
    const guide = await fetch(raidSignupHelpUrl, {
      signal: AbortSignal.timeout(15000),
    });
    if (!guide.ok)
      throw new Error(
        "Deploy and verify the signup walkthrough before publishing its links.",
      );
    await guide.body?.cancel();
    for (const target of targets) {
      const saved = preview.messages.find((item) => item.key === target.key);
      if (!saved)
        throw new Error("Message is missing from the reviewed preview.");
      const route = `/channels/${target.channelId}/messages/${target.messageId}`;
      const current = await request(route);
      assertNewcomerMessage(current, target);
      const desired = checksum(editableMessage(target.payload));
      const actual = checksum(editableMessage(current));
      if (actual !== desired) {
        if (actual !== checksum(editableMessage(saved.before)))
          throw new Error(
            `Message changed outside this release: ${target.key}`,
          );
        await store.journal({
          operation: "newcomer-edit",
          key: target.key,
          before: actual,
          desired,
        });
        await request(route, "PATCH", target.payload);
        const after = await request(route);
        assertNewcomerMessage(after, target);
        if (checksum(editableMessage(after)) !== desired)
          throw new Error("Newcomer message readback mismatch.");
      }
      if (target.topic) {
        const before = z
          .object({ topic: z.string().nullable() })
          .parse(await request(`/channels/${target.channelId}`));
        if (before.topic !== target.topic) {
          if (before.topic !== saved.topic)
            throw new Error("Channel topic changed outside this release.");
          await request(`/channels/${target.channelId}`, "PATCH", {
            topic: target.topic,
          });
        }
      }
      await store.journal({
        operation: "newcomer-verified",
        key: target.key,
        desired,
      });
    }
    const desired = routeRaidOnboarding(preview.onboarding, config);
    if (checksum(desired) !== checksum(preview.desired))
      throw new Error("Onboarding source changed since preview.");
    const current = await request(onboardingRoute);
    if (!onboardingReadbackMatches(current, desired, preview.onboarding)) {
      if (
        checksum(onboardingWritePayload(current)) !==
        checksum(onboardingWritePayload(preview.onboarding))
      )
        throw new Error("Onboarding changed outside this release.");
      await store.journal({
        operation: "newcomer-onboarding",
        before: preview.onboarding,
        desired,
      });
      await request(onboardingRoute, "PUT", onboardingWritePayload(desired));
      if (
        !onboardingReadbackMatches(
          await request(onboardingRoute),
          desired,
          preview.onboarding,
        )
      )
        throw new Error("Onboarding readback mismatch.");
    }
    let announcementPosts = 0;
    if (announce) {
      const receipt = path.join(store.root, "announcement.json");
      let recorded: unknown;
      try {
        recorded = JSON.parse(await readFile(receipt, "utf8"));
      } catch (error: unknown) {
        if (!(
          error instanceof Error &&
          "code" in error &&
          error.code === "ENOENT"
        ))
          throw error;
      }
      if (recorded) {
        const saved = z
          .object({
            status: z.literal("sent"),
            messageId: z.string().regex(/^\d{17,20}$/),
          })
          .safeParse(recorded);
        if (!saved.success)
          throw new Error(
            "The announcement creation is uncertain; reconcile its receipt before retrying.",
          );
        console.log(
          JSON.stringify({
            announcementAlreadyPublished: saved.data.messageId,
          }),
        );
      } else {
        const handle = await open(receipt, "wx", 0o600);
        try {
          await handle.writeFile(JSON.stringify({ status: "creating" }));
          await handle.sync();
        } finally {
          await handle.close();
        }
        await store.journal({
          operation: "newcomer-announcement-intent",
          channelId: announcementChannel,
        });
        const message = z
          .object({
            id: z.string(),
            channel_id: z.literal(announcementChannel),
            author: z.object({ id: z.literal(kfcApplicationId) }),
          })
          .parse(
            await request(`/channels/${announcementChannel}/messages`, "POST", {
              content: "",
              embeds: [
                {
                  title: "Raids · Find a run and join",
                  description: kfcRaidRolloutDescription,
                  color: 0xe7b65b,
                },
              ],
              components: kfcWelcomeComponents(),
              allowed_mentions: { parse: [] },
            }),
          );
        await writeFile(
          receipt,
          JSON.stringify({ status: "sent", messageId: message.id }),
          { mode: 0o600 },
        );
        await store.journal({
          operation: "newcomer-announcement-verified",
          messageId: message.id,
          channelId: announcementChannel,
        });
        announcementPosts = 1;
        console.log(JSON.stringify({ announcementPublished: message.id }));
      }
    }
    console.log(
      JSON.stringify({
        messagesVerified: targets.length,
        savedOnboardingUpdated: true,
        onboardingEnabled: desired.enabled,
        newPosts: announcementPosts,
        mentions: 0,
      }),
    );
  } finally {
    await release();
  }
}
main().catch((error: unknown): void => {
  console.error(
    error instanceof Error ? error.message : "Newcomer publication failed.",
  );
  process.exitCode = 1;
});
