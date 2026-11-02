import { z } from "zod";
import type { PrismaClient } from "@prisma/client";
import {
  kfcGuildId,
  scheduledEventBindings,
} from "../../content/kfc-community";
import {
  auditChannelSchema,
  channelPermissions,
  guildPermissions,
  hasDiscordPermission,
  type DiscordAuditSnapshot,
} from "../discord-audit";
import {
  discordMessageSchema,
  raidHelperId,
  type Edition,
  type RaidSession,
  type RaidingConfig,
} from "./contracts";
import type { RaidingClient } from "./transport";

const nativeSchema = z.object({
  id: z.string(),
  guild_id: z.literal(kfcGuildId),
  name: z.string(),
  scheduled_start_time: z.string().datetime({ offset: true }),
  scheduled_end_time: z.string().datetime({ offset: true }).nullable(),
  entity_type: z.number(),
  status: z.number(),
  entity_metadata: z.object({ location: z.string() }).nullable(),
});

export async function managedSessions(
  database: Pick<PrismaClient, "foreverRaidEvent">,
  config: RaidingConfig,
  now: Date,
): Promise<RaidSession[]> {
  const events = await database.foreverRaidEvent.findMany({
    where: {
      game: { in: ["forever", "tbc"] },
      organizer: { active: true },
      endsAt: { gt: new Date(now.getTime() - 7 * 86400000) },
      startsAt: { lt: new Date(now.getTime() + 90 * 86400000) },
      discordPost: {
        is: {
          visibility: "community",
          confirmedAt: { not: null },
          OR: [
            { approvedAt: { not: null } },
            {
              eventId: { in: Object.keys(config.managedNativeEvents) },
              guildId: kfcGuildId,
            },
          ],
          messageId: { not: null },
          origin: "https://www.wowforeverdiscord.online",
          status: { in: ["sent", "pending", "delivering"] },
        },
      },
      OR: [
        { discordPost: { is: { guildId: kfcGuildId } } },
        { discordMirrors: { some: { guildId: kfcGuildId, status: "sent" } } },
        { id: { in: config.explicitManagedIds } },
      ],
    },
    include: {
      discordPost: true,
      organizer: { select: { displayName: true } },
      signups: {
        where: { status: { in: ["accepted", "registered"] } },
        select: { status: true },
      },
    },
    orderBy: [{ startsAt: "asc" }, { id: "asc" }],
    take: 200,
  });
  return events.flatMap((event): RaidSession[] => {
    const post = event.discordPost;
    if (
      !post?.messageId ||
      post.visibility !== "community" ||
      !post.confirmedAt ||
      (!post.approvedAt &&
        !(post.guildId === kfcGuildId && config.managedNativeEvents[event.id]))
    )
      return [];
    if (!(["forever", "tbc"] as string[]).includes(event.game)) return [];
    return [
      {
        key: `managed:${event.id}`,
        game: event.game as Edition,
        title: event.title,
        activity: event.raidName,
        eventType: event.eventType,
        startsAt: event.startsAt.toISOString(),
        endsAt: event.endsAt.toISOString(),
        status:
          event.status === "cancelled"
            ? "cancelled"
            : event.status === "locked"
              ? "locked"
              : "open",
        signupUrl: `https://www.wowforeverdiscord.online/raids/${event.id}`,
        sourceChannelId: post.channelId,
        sourceGuildId: post.guildId,
        sourceMessageId: post.messageId,
        host: event.organizer.displayName,
        capacity: event.capacity,
        confirmed: event.signups.filter(
          (signup): boolean => signup.status === "accepted",
        ).length,
        registered: event.signups.filter(
          (signup): boolean => signup.status === "registered",
        ).length,
        source: "managed",
      },
    ];
  });
}

export interface SourceInventory {
  channels: z.infer<typeof auditChannelSchema>[];
  roles: DiscordAuditSnapshot["roles"];
}

export async function externalSessions(
  config: RaidingConfig,
  client: RaidingClient,
  inventory: SourceInventory,
  nativeRaw: unknown,
  now: Date,
): Promise<RaidSession[]> {
  const nativeEvents = z.array(nativeSchema).parse(nativeRaw);
  const result: RaidSession[] = [];
  for (const event of nativeEvents) {
    if (
      scheduledEventBindings.some((binding): boolean =>
        binding.projections.some(
          (projection): boolean =>
            projection.guildId === kfcGuildId &&
            projection.scheduledId === event.id,
        ),
      )
    )
      continue;
    if (
      event.entity_type !== 3 ||
      !event.entity_metadata ||
      ![1, 2, 3, 4].includes(event.status)
    )
      continue;
    const match =
      /^https:\/\/discord\.com\/channels\/1411533815356194968\/([1-9]\d{16,19})\/([1-9]\d{16,19})$/.exec(
        event.entity_metadata.location,
      );
    if (!match) continue;
    let channel = inventory.channels.find(
      (entry): boolean => entry.id === match[1],
    );
    let sourceForumId: string | undefined;
    if (!channel) {
      client.allowChannel(match[1]);
      const thread = z
        .object({
          id: z.literal(match[1]),
          guild_id: z.literal(kfcGuildId),
          type: z.literal(11),
          parent_id: z.string(),
          name: z.string(),
        })
        .safeParse(await client.request(`/channels/${match[1]}`));
      if (!thread.success) continue;
      const parent = inventory.channels.find(
        (entry): boolean =>
          entry.id === thread.data.parent_id &&
          entry.type === 15 &&
          [config.spaces.forever.forumId, config.spaces.tbc.forumId].includes(
            entry.id,
          ),
      );
      if (!parent) continue;
      sourceForumId = parent.id;
      channel = {
        ...parent,
        id: thread.data.id,
        type: 11,
        parent_id: parent.id,
        name: thread.data.name,
      };
    }
    const game =
      config.externalEditions[event.id] ??
      (sourceForumId === config.spaces.forever.forumId
        ? "forever"
        : sourceForumId === config.spaces.tbc.forumId ||
            channel?.parent_id === config.spaces.tbc.categoryId
          ? "tbc"
          : null);
    if (!game || !channel || channel.guild_id !== kfcGuildId) continue;
    const publicView = hasDiscordPermission(
      channelPermissions(
        guildPermissions(inventory.roles, kfcGuildId, []),
        channel,
        kfcGuildId,
        [],
      ),
      1n << 10n,
    );
    // Native events expose their own public summary; never copy a restricted roster.
    if (!publicView && !config.externalEditions[event.id]) continue;
    client.allowChannel(channel.id);
    const message = discordMessageSchema.parse(
      await client.request(`/channels/${channel.id}/messages/${match[2]}`),
    );
    if (
      message.id !== match[2] ||
      message.channel_id !== channel.id ||
      message.author.id !== raidHelperId ||
      !message.author.bot
    )
      continue;
    const timestamps = message.embeds.flatMap((embed): number[] =>
      (embed.fields ?? [])
        .slice(0, 3)
        .flatMap((field): number[] =>
          [...field.value.matchAll(/<t:(\d{9,11}):/g)].map(
            (value): number => Number(value[1]) * 1000,
          ),
        ),
    );
    if (
      timestamps.length &&
      timestamps.some(
        (time): boolean => time !== Date.parse(event.scheduled_start_time),
      )
    )
      throw new Error(`Raid-Helper/native start mismatch for ${event.id}.`);
    if (!Number.isFinite(Date.parse(event.scheduled_start_time))) continue;
    if (
      event.scheduled_end_time &&
      Date.parse(event.scheduled_end_time) <=
        Date.parse(event.scheduled_start_time)
    )
      throw new Error("Invalid external session finish.");
    if (Date.parse(event.scheduled_start_time) > now.getTime() + 30 * 86400000)
      continue;
    result.push({
      key: `raid-helper:${message.id}`,
      game,
      title: event.name,
      activity: event.name,
      eventType: "raid",
      startsAt: event.scheduled_start_time,
      // Raid-Helper's native Event often has a one-hour placeholder; no promised end is inferred.
      endsAt: null,
      status: event.status === 4 ? "cancelled" : "open",
      signupUrl: event.entity_metadata.location,
      sourceChannelId: channel.id,
      sourceMessageId: message.id,
      ...(sourceForumId ? { sourceForumId } : {}),
      host: null,
      capacity: null,
      confirmed: null,
      registered: null,
      source: "raid-helper",
    });
  }
  return result;
}
