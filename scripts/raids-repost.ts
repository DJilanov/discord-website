import "./env";
import { z } from "zod";
import { createHash } from "node:crypto";
import { db } from "../lib/db";
import { requestRaidRepost } from "../lib/raids/repost";
import { raidDestinationForPost } from "../lib/raids/discord-settings";
import { raidDiscordRequest } from "../lib/raids/discord-delivery";

async function main(): Promise<void> {
  const [eventId, flag, ...extra] = process.argv.slice(2);
  if (
    !eventId ||
    !/^[a-z0-9]{20,40}$/.test(eventId) ||
    extra.length ||
    (flag && flag !== "--execute")
  )
    throw new Error("Usage: tsx scripts/raids-repost.ts EVENT_ID [--execute]");
  const event = await db.foreverRaidEvent.findUniqueOrThrow({
    where: { id: eventId },
    include: { organizer: true, discordPost: true },
  });
  const post = event.discordPost;
  const destination = post ? raidDestinationForPost(post) : null;
  if (!post || !destination)
    throw new Error("Event has no configured Discord destination.");
  const request = raidDiscordRequest(destination);
  z.object({
    user: z.object({
      id: z.literal(event.organizer.discordId),
      bot: z.literal(false).optional(),
    }),
  }).parse(
    await request(
      `/guilds/${post.guildId}/members/${event.organizer.discordId}`,
    ),
  );
  if (flag === "--execute") {
    await db.$transaction(async (client) => {
      await client.$queryRaw`SELECT "id" FROM "ForeverRaidEvent" WHERE "id" = ${eventId} FOR UPDATE`;
      const snapshot = async (): Promise<string> =>
        createHash("sha256")
          .update(
            JSON.stringify(
              await client.foreverRaidEvent.findUniqueOrThrow({
                where: { id: eventId },
                include: { signups: { orderBy: { id: "asc" } } },
              }),
            ),
          )
          .digest("hex");
      const before = await snapshot();
      await requestRaidRepost(client, eventId, {
        discordId: event.organizer.discordId,
        guildId: post.guildId,
        channelId: post.channelId,
        administrator: false,
        auditSource: "release-operator",
      });
      if (before !== (await snapshot()))
        throw new Error(
          "Repost changed event settings or participation; transaction rolled back.",
        );
    });
  }
  console.log(
    JSON.stringify({
      eventId,
      executed: flag === "--execute",
      preservationVerified: flag === "--execute",
      channelId: post.channelId,
      previousMessageId: post.messageId,
    }),
  );
}
main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Repost failed.");
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
