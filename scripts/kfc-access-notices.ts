import "./env";
import { lstat, open, readFile, writeFile } from "node:fs/promises";
import { z } from "zod";
import { kfcApplicationId, kfcGuildId } from "../content/kfc-community";
import { kfcAccessNotices } from "../content/kfc-access-guidance";
import { kfcAccessIds } from "../content/kfc-access";
import {
  auditChannelSchema,
  auditCredentialsSchema,
  channelPermissions,
  discordId,
  guildPermissions,
  hasDiscordPermission,
} from "../lib/discord-audit";
import { collectDiscordAudit } from "../lib/discord-audit-client";
import { assertKfcScope, kfcRequest } from "../lib/kfc-community";
import { editableMessage } from "../lib/kfc-raiding/delivery";
import { checksum } from "../lib/kfc-raiding/presentation";
import { RaidingStore } from "../lib/kfc-raiding/storage";

async function main(): Promise<void> {
  if (process.argv.slice(2).some((arg) => arg !== "--apply"))
    throw new Error(
      "Use no arguments to preview, or --apply to publish the two maintained notices.",
    );
  const targets = kfcAccessNotices();
  if (!process.argv.includes("--apply")) {
    console.log(JSON.stringify(targets, null, 2));
    return;
  }
  const credentials = auditCredentialsSchema.parse({
    applicationId: kfcApplicationId,
    guildId: kfcGuildId,
    token: process.env.KFCBOT_TOKEN || process.env.DISCORD_BOT_TOKEN,
  });
  const snapshot = await collectDiscordAudit(credentials);
  assertKfcScope(snapshot);
  const store = new RaidingStore(".data/kfc-access");
  await store.initialize();
  const release = await store.lock();
  try {
    const channelIds = new Set(targets.map((target) => target.channelId));
    channelIds.add(kfcAccessIds.introductions);
    const request = (
      route: string,
      method: "GET" | "POST" | "PATCH" | "PUT" = "GET",
      body?: unknown,
    ): Promise<unknown> =>
      kfcRequest(credentials, route, method, body, { channelIds });
    for (const target of targets) {
      const filename = `${store.root}/notice-${target.key}.json`;
      let receipt: { messageId: string; checksum: string } | undefined;
      try {
        const stat = await lstat(filename);
        if (!stat.isFile() || stat.isSymbolicLink() || stat.mode & 0o077)
          throw new Error("Unsafe notice receipt.");
        receipt = z
          .object({
            status: z.literal("sent"),
            messageId: discordId,
            checksum: z.string().length(64),
          })
          .parse(JSON.parse(await readFile(filename, "utf8")) as unknown);
      } catch (error: unknown) {
        if (!(
          error instanceof Error &&
          "code" in error &&
          error.code === "ENOENT"
        ))
          throw new Error(
            "Notice receipt needs reconciliation before retrying.",
          );
      }
      const desired = checksum(editableMessage(target.payload));
      let messageId: string;
      if (receipt) {
        messageId = receipt.messageId;
        const route = `/channels/${target.channelId}/messages/${messageId}`;
        const current = z
          .object({
            id: z.literal(messageId),
            channel_id: z.literal(target.channelId),
            author: z.object({
              id: z.literal(kfcApplicationId),
              bot: z.literal(true),
            }),
          })
          .passthrough()
          .parse(await request(route));
        const actual = checksum(editableMessage(current));
        if (actual !== desired) {
          if (actual !== receipt.checksum)
            throw new Error(
              "The maintained notice changed outside this release.",
            );
          await store.journal({
            operation: "access-notice-edit",
            key: target.key,
            messageId,
            before: actual,
            desired,
          });
          await request(route, "PATCH", target.payload);
        }
      } else {
        const handle = await open(filename, "wx", 0o600);
        try {
          await handle.writeFile(JSON.stringify({ status: "creating" }));
          await handle.sync();
        } finally {
          await handle.close();
        }
        await store.journal({
          operation: "access-notice-create",
          key: target.key,
          channelId: target.channelId,
        });
        const created = z
          .object({
            id: discordId,
            channel_id: z.literal(target.channelId),
            author: z.object({
              id: z.literal(kfcApplicationId),
              bot: z.literal(true),
            }),
          })
          .parse(
            await request(
              `/channels/${target.channelId}/messages`,
              "POST",
              target.payload,
            ),
          );
        messageId = created.id;
      }
      const route = `/channels/${target.channelId}/messages/${messageId}`;
      const after = z
        .object({
          id: z.literal(messageId),
          channel_id: z.literal(target.channelId),
          author: z.object({
            id: z.literal(kfcApplicationId),
            bot: z.literal(true),
          }),
          pinned: z.boolean(),
        })
        .passthrough()
        .parse(await request(route));
      if (checksum(editableMessage(after)) !== desired)
        throw new Error("Notice readback mismatch.");
      await writeFile(
        filename,
        JSON.stringify({ status: "sent", messageId, checksum: desired }),
        { mode: 0o600 },
      );
      if (!after.pinned)
        await request(
          `/channels/${target.channelId}/messages/pins/${messageId}`,
          "PUT",
        );
      const pinned = z
        .object({ pinned: z.literal(true) })
        .parse(await request(route));
      if (!pinned.pinned) throw new Error("Notice pin readback failed.");
      console.log(
        JSON.stringify({
          notice: target.key,
          messageId,
          pinned: true,
          mentions: 0,
        }),
      );
    }
    const introRoute = `/channels/${kfcAccessIds.introductions}`;
    const intro = auditChannelSchema.parse(await request(introRoute));
    if (
      intro.id !== kfcAccessIds.introductions ||
      intro.type !== 0 ||
      !hasDiscordPermission(
        channelPermissions(
          guildPermissions(snapshot.roles, kfcGuildId, []),
          intro,
          kfcGuildId,
          [],
        ),
        (1n << 10n) | (1n << 16n),
      )
    )
      throw new Error("The public welcome destination is inaccessible.");
    if (!intro.topic?.includes(kfcAccessIds.start)) {
      const topic = `${intro.topic?.trim() || "Say hello if you like; introducing yourself is optional."} Start here: https://discord.com/channels/${kfcGuildId}/${kfcAccessIds.start}`;
      if (topic.length > 1024)
        throw new Error(
          "Review the introductions topic before adding the welcome link.",
        );
      await store.journal({
        operation: "access-welcome-topic",
        channelId: intro.id,
        before: intro.topic ?? null,
        after: topic,
      });
      await request(introRoute, "PATCH", { topic });
      if (auditChannelSchema.parse(await request(introRoute)).topic !== topic)
        throw new Error("Welcome topic readback mismatch.");
    }
    const guildRoute = `/guilds/${kfcGuildId}`;
    const guildSchema = z.object({
      id: z.literal(kfcGuildId),
      system_channel_id: discordId.nullable(),
    });
    const current = guildSchema.parse(await request(guildRoute));
    const destination = snapshot.channels.find(
      (channel) => channel.id === current.system_channel_id,
    );
    const visible =
      destination &&
      hasDiscordPermission(
        channelPermissions(
          guildPermissions(snapshot.roles, kfcGuildId, []),
          destination,
          kfcGuildId,
          [],
        ),
        (1n << 10n) | (1n << 16n),
      );
    if (!visible) {
      if (current.system_channel_id !== snapshot.guild.system_channel_id)
        throw new Error(
          "The system welcome destination changed during this update.",
        );
      await store.journal({
        operation: "access-system-welcome",
        before: current.system_channel_id,
        after: intro.id,
      });
      await request(guildRoute, "PATCH", { system_channel_id: intro.id });
      if (
        guildSchema.parse(await request(guildRoute)).system_channel_id !==
        intro.id
      )
        throw new Error("System welcome readback mismatch.");
    }
    console.log(
      JSON.stringify({
        welcomeDestination: visible ? current.system_channel_id : intro.id,
        public: true,
        mentions: 0,
      }),
    );
  } finally {
    await release();
  }
}

void main().catch((error: unknown): void => {
  console.error(
    error instanceof Error ? error.message : "Access notices failed.",
  );
  process.exitCode = 1;
});
