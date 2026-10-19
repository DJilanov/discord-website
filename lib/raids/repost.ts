import type { Prisma } from "@prisma/client";
import { HttpError } from "@/lib/security";
import { raidDestinationForPost } from "./discord-settings";

export async function requestRaidRepost(
  client: Prisma.TransactionClient,
  eventId: string,
  actor: {
    discordId: string;
    guildId: string;
    channelId: string;
    administrator: boolean;
    auditSource?: "release-operator";
  },
): Promise<void> {
  await client.$queryRaw`SELECT "id" FROM "ForeverRaidEvent" WHERE "id" = ${eventId} FOR UPDATE`;
  const event = await client.foreverRaidEvent.findUnique({
    where: { id: eventId },
    include: { organizer: true },
  });
  if (!event) throw new HttpError(404, "Event not found.");
  await client.$queryRaw`SELECT "eventId" FROM "ForeverRaidDiscordPost" WHERE "eventId" = ${eventId} FOR UPDATE`;
  const post = await client.foreverRaidDiscordPost.findUnique({
    where: { eventId },
  });
  const destination = post ? raidDestinationForPost(post) : null;
  if (
    !post ||
    !destination ||
    post.guildId !== actor.guildId ||
    post.channelId !== actor.channelId
  )
    throw new HttpError(
      403,
      "Run this command in the event's original Discord channel.",
    );
  if (!actor.administrator && event.organizer.discordId !== actor.discordId)
    throw new HttpError(
      403,
      "Only the event creator or a server administrator can repost it.",
    );
  if (!event.organizer.active)
    throw new HttpError(403, "Organizer access is disabled.");
  const [{ now }] = await client.$queryRaw<
    Array<{ now: Date }>
  >`SELECT clock_timestamp() AS now`;
  if (event.status !== "open" || event.startsAt <= now)
    throw new HttpError(409, "Only upcoming, open events can be reposted.");
  if (
    post.status !== "sent" ||
    !post.messageId ||
    post.deliveredVersion !== event.version
  )
    throw new HttpError(
      409,
      "Wait for the current Discord post to finish syncing first.",
    );
  if (post.previousMessageId && !post.previousRetiredAt)
    throw new HttpError(
      409,
      "The previous repost is still being retired. Ask a moderator to check it.",
    );
  if (
    post.lastRepostedAt &&
    now.getTime() - post.lastRepostedAt.getTime() < 600000
  )
    throw new HttpError(
      429,
      "Wait ten minutes between reposts of the same event.",
    );
  await client.foreverRaidDiscordPost.update({
    where: { eventId },
    data: {
      previousMessageId: post.messageId,
      previousRetiredAt: null,
      lastRepostedAt: now,
      messageId: null,
      repostNumber: { increment: 1 },
      status: "pending",
      deliveredVersion: 0,
      attempts: 0,
      lastError: null,
      startedAt: null,
      nextAttemptAt: now,
    },
  });
  await client.foreverRaidAudit.create({
    data: {
      eventId,
      actorId:
        actor.auditSource === "release-operator"
          ? "operator:raid-release"
          : `discord:${actor.discordId}`,
      action: "discord_repost_requested",
      details: {
        channelId: actor.channelId,
        previousMessageId: post.messageId,
        repostNumber: post.repostNumber + 1,
        source: actor.auditSource ?? "discord-command",
      },
    },
  });
}
