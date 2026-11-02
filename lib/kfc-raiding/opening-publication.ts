import { createHash } from "node:crypto";
import { z } from "zod";
import type { PrismaClient } from "@prisma/client";
import { kfcApplicationId, kfcGuildId } from "../../content/kfc-community";
import {
  foreverRaidLootPolicy,
  openingRaidDescription,
  type ForeverOpeningRaid,
} from "../../content/kfc-forever-opening-week";
import { auditCredentialsSchema, discordId } from "../discord-audit";
import { kfcRequest } from "../kfc-community";
import { raidService } from "../raids/service";
import { eventSchema, type MemberIdentity } from "../raids/contracts";
import { raidPresets } from "../raids/games";
import { discordEventPanel } from "../raids/discord-panel";
import { type OpeningPublication, type RaidingConfig } from "./contracts";
import { managedNativeEventSchema } from "./native-events";
import { messageLink } from "./presentation";
import type { RaidingStore } from "./storage";
import type { RaidingClient } from "./transport";

const ruleChannel = "1411570010534449173";
export const openingLeaders = {
  DJ: { discordId: "407839813769756693", name: "DJilanov" },
  Psy: { discordId: "207621498658226176", name: "Psyrogue" },
} as const;

export function openingRequestKey(key: string): string {
  const hash = createHash("sha256")
    .update(`kfc-forever-opening-week:${key}`)
    .digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

export async function ensureOpeningPolicy(
  publication: OpeningPublication,
  store: RaidingStore,
  token: string,
): Promise<string> {
  if (publication.policy)
    return messageLink(
      publication.policy.channelId,
      publication.policy.messageId,
    );
  if (publication.creatingPolicy)
    throw new Error(
      "Policy creation was interrupted; reconcile before another post.",
    );
  publication.creatingPolicy = true;
  await store.savePublication(publication);
  const credentials = auditCredentialsSchema.parse({
    applicationId: kfcApplicationId,
    guildId: kfcGuildId,
    token,
  });
  const allowed = new Set([ruleChannel]);
  const created = z
    .object({
      id: discordId,
      channel_id: z.literal(ruleChannel),
      author: z.object({ id: z.literal(kfcApplicationId) }),
    })
    .parse(
      await kfcRequest(
        credentials,
        `/channels/${ruleChannel}/messages`,
        "POST",
        {
          content: "",
          embeds: [foreverRaidLootPolicy],
          components: [],
          allowed_mentions: { parse: [] },
        },
        { channelIds: allowed },
      ),
    );
  publication.policy = { channelId: ruleChannel, messageId: created.id };
  publication.creatingPolicy = false;
  await store.savePublication(publication);
  await kfcRequest(
    credentials,
    `/channels/${ruleChannel}/messages/pins/${created.id}`,
    "PUT",
    undefined,
    { channelIds: allowed },
  );
  return messageLink(ruleChannel, created.id);
}

export async function openingOrganizer(
  leader: "DJ" | "Psy",
  database: PrismaClient,
  client: RaidingClient,
): Promise<MemberIdentity> {
  const person = openingLeaders[leader];
  client.allowSubscriber(person.discordId);
  const live = z
    .object({
      user: z.object({
        id: z.literal(person.discordId),
        bot: z.boolean().optional(),
      }),
      pending: z.boolean().optional(),
    })
    .parse(
      await client.request(`/guilds/${kfcGuildId}/members/${person.discordId}`),
    );
  if (live.user.bot || live.pending)
    throw new Error(
      "Opening-week organizer must be a current human guild member.",
    );
  const current = await database.foreverMember.findUnique({
    where: { discordId: person.discordId },
  });
  if (current && !current.active)
    throw new Error("Organizer access is disabled; not reactivated.");
  const member =
    current ??
    (await database.foreverMember.create({
      data: { discordId: person.discordId, displayName: person.name },
    }));
  return {
    id: member.id,
    discordId: member.discordId,
    displayName: member.displayName,
  };
}

export async function publishOpeningRaid(
  raid: ForeverOpeningRaid,
  policyUrl: string,
  organizer: MemberIdentity,
  database: PrismaClient,
  config: RaidingConfig,
  publication: OpeningPublication,
  store: RaidingStore,
  client: RaidingClient,
): Promise<{ eventId: string; threadId: string; nativeId: string }> {
  const preset = raidPresets.forever.find(
    (entry): boolean => entry.name === raid.raidName,
  );
  if (!preset || preset.capacity !== raid.capacity)
    throw new Error(
      "Opening raid capacity disagrees with its reviewed preset.",
    );
  const input = eventSchema.parse({
    requestKey: openingRequestKey(raid.key),
    game: "forever",
    realm: "",
    eventType: "raid",
    title: raid.title,
    raidName: raid.raidName,
    region: "EU",
    faction: "Alliance",
    ruleset: "PvP",
    localStart: raid.localStart,
    durationMinutes: raid.durationMinutes,
    signupMinutesBefore: 15,
    reserveMinutesBefore: 15,
    capacity: raid.capacity,
    roleCaps: preset.roleCaps,
    admission: "open",
    description: openingRaidDescription(raid, policyUrl),
    leaderName: raid.leader === "DJ" ? "DJ" : "Psyrogue",
    assistantName: raid.assistant ?? "",
    catalogId: null,
    reserveLimit: 0,
    reserveLimits: null,
    allowDuplicates: false,
    hardReserves: [],
    discordChannelId: null,
    confirmDiscordPublication: true,
  });
  const service = raidService(database, undefined, {
    deferDiscordPublication: true,
  });
  const saved = publication.events[raid.key] ?? {
    creatingForum: false,
    creatingNative: false,
  };
  // Existing campaign entries are edited through the event manager, not recreated.
  const eventId = saved.eventId ?? (await service.create(organizer, input));
  saved.eventId = eventId;
  publication.events[raid.key] = saved;
  await store.savePublication(publication);
  let event = await service.get(organizer, eventId);
  if (!saved.threadId) {
    if (saved.creatingForum)
      throw new Error(
        `Forum creation for ${raid.key} is uncertain; not repeated.`,
      );
    saved.creatingForum = true;
    await store.savePublication(publication);
    const panel = discordEventPanel(
      event,
      "https://www.wowforeverdiscord.online",
    );
    const tags = config.spaces.forever.tags;
    const applied = [
      tags.Open,
      tags["Guild priority"],
      tags[raid.morning ? "Morning/daytime" : "Evening"],
      ...(raid.pace === "Semi-hardcore" ? [tags["Semi-hardcore"]] : []),
    ].filter((tag): tag is string => !!tag);
    const created = z
      .object({
        id: discordId,
        guild_id: z.literal(kfcGuildId),
        parent_id: z.literal(config.spaces.forever.forumId),
        owner_id: z.literal(kfcApplicationId),
        type: z.literal(11),
      })
      .parse(
        await client.request(
          `/channels/${config.spaces.forever.forumId}/threads`,
          "POST",
          {
            name: `${raid.localStart.slice(8, 10)} Dec · ${raid.localStart.slice(11)} CET · ${raid.title}`.slice(
              0,
              100,
            ),
            auto_archive_duration: 10080,
            applied_tags: applied,
            message: { ...panel, flags: 4096 },
          },
        ),
      );
    saved.threadId = created.id;
    saved.creatingForum = false;
    await store.savePublication(publication);
  }
  const threadId = saved.threadId;
  await database.$transaction(async (transaction): Promise<void> => {
    await transaction.$queryRaw`SELECT "id" FROM "ForeverRaidEvent" WHERE "id" = ${eventId} FOR UPDATE`;
    const post = await transaction.foreverRaidDiscordPost.findUnique({
      where: { eventId },
    });
    if (post) {
      if (
        post.guildId !== kfcGuildId ||
        post.channelId !== threadId ||
        post.messageId !== threadId
      )
        throw new Error(
          "Opening raid already has another authoritative signup.",
        );
      return;
    }
    await transaction.foreverRaidDiscordPost.create({
      data: {
        eventId,
        guildId: kfcGuildId,
        channelId: threadId,
        messageId: threadId,
        origin: "https://www.wowforeverdiscord.online",
        visibility: "community",
        label: "KFC / Forever raid forum",
        confirmedAt: new Date(),
        approvedAt: new Date(),
        approvedBy: openingLeaders.DJ.discordId,
        status: "pending",
        desiredVersion: event.version + 1,
      },
    });
    await transaction.foreverRaidAudit.create({
      data: {
        eventId,
        actorId: openingLeaders.DJ.discordId,
        action: "owner_published_opening_week",
        details: {
          campaignKey: raid.key,
          organizerDiscordId: organizer.discordId,
          guildId: kfcGuildId,
          threadId,
          policyUrl,
          source: "owner-request-2026-10-31",
        },
      },
    });
  });
  event = await service.get(organizer, eventId);
  if (!saved.nativeId) {
    if (saved.creatingNative)
      throw new Error(
        `Native event creation for ${raid.key} is uncertain; not repeated.`,
      );
    saved.creatingNative = true;
    await store.savePublication(publication);
    const native = managedNativeEventSchema.parse(
      await client.request(`/guilds/${kfcGuildId}/scheduled-events`, "POST", {
        name: raid.title.slice(0, 100),
        description: `${raid.capacity} players · ${raid.pace}${raid.morning ? " morning raid" : ""} · Host ${raid.leader === "DJ" ? "Djilanov" : "Psyrogue"}${raid.assistant ? ` · Assistant ${raid.assistant}` : ""}.\n\nSign up with your character on the linked raid post. Interested is a reminder, not a confirmed raid seat.\n\nRaid rules: ${policyUrl}\nSoftres and named tank HRs will be published after patch datamining, before the raid.`,
        scheduled_start_time: event.startsAt,
        scheduled_end_time: event.endsAt,
        entity_type: 3,
        privacy_level: 2,
        entity_metadata: { location: messageLink(threadId) },
      }),
    );
    saved.nativeId = native.id;
    saved.creatingNative = false;
    await store.savePublication(publication);
  }
  config.managedNativeEvents[eventId] = saved.nativeId;
  await store.saveConfig(config);
  await store.journal({
    operation: "opening-raid-published",
    key: raid.key,
    eventId,
    threadId,
    nativeId: saved.nativeId,
  });
  return { eventId, threadId, nativeId: saved.nativeId };
}
