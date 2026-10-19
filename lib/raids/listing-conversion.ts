import type { PrismaClient } from "@prisma/client";
import { Temporal } from "@js-temporal/polyfill";
import { z } from "zod";
import { auditChannelSchema, auditRoleSchema } from "@/lib/discord-audit";
import { HttpError } from "@/lib/security";
import { eventSchema, type EventInput, type MemberIdentity } from "./contracts";
import { eventTypeDefinitions, type EventType } from "./event-types";
import { resolveStart, regionZone, validateEvent } from "./policy";
import { jsonChecksum } from "./json";
import { raidService } from "./service";
import {
  raidDiscordSettings,
  type RaidDiscordSettings,
} from "./discord-settings";
import {
  raidDiscordRequest,
  type RaidDiscordRequest,
} from "./discord-delivery";
import { raidForumChannel, raidForumThreadSchema } from "./discord-forum";
import {
  canManageRaidChannels,
  raidChannelEligible,
  raidChannelGuildSchema,
  raidChannelMemberSchema,
} from "./discord-channels";
import { discordEventPanel } from "./discord-panel";
import { nativeRaidsEnabled } from "./discord-format";
import { eventArtwork } from "./event-artwork";
import { eventCreationHash } from "./event-request";

export const listingConversionSchema = z
  .object({
    groupId: z.string().min(1).max(100),
    organizerDiscordId: z.string().regex(/^\d{17,20}$/),
    localFinish: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
    capacity: eventSchema.shape.capacity,
    admission: eventSchema.shape.admission,
    target: eventSchema.shape.raidName,
    roleCaps: eventSchema.shape.roleCaps.optional(),
    expectedSourceChecksum: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
  })
  .strict();
export type ListingConversionInput = z.infer<typeof listingConversionSchema>;

interface ConversionSource {
  group: {
    id: string;
    title: string;
    region: string;
    realm: string;
    faction: string;
    gameRuleset: string;
    activity: string;
    description: string;
    contactDiscord: string;
    startsAt: Date;
    status: string;
  };
  job: {
    id: string;
    forumId: string;
    threadId: string | null;
    content: string;
    attachment: string | null;
    status: string;
  };
}

export interface ListingConversionPlan {
  groupId: string;
  threadId: string;
  member: MemberIdentity;
  event: EventInput;
  eventId: string | null;
  sourceChecksum: string;
  settings: RaidDiscordSettings;
}

const activityTypes: Record<string, EventType | undefined> = {
  Dungeon: "dungeon",
  Raid: "raid",
  Questing: "questing",
  "PvP premade": "battleground",
  "RP event": "social",
};
const conversionError = "listing_conversion_pending";
const messageSchema = z.object({
  id: z.string(),
  channel_id: z.string(),
  author: z.object({ id: z.string(), bot: z.literal(true) }),
  content: z.string(),
  embeds: z.array(z.object({ url: z.string().optional() })).default([]),
  attachments: z.array(z.object({ filename: z.string() })).default([]),
  components: z
    .array(
      z.object({
        components: z.array(z.object({ custom_id: z.string().optional() })),
      }),
    )
    .default([]),
});

function conversionKey(groupId: string): string {
  const hash = jsonChecksum({
    purpose: "group-listing-event.v1",
    groupId,
  }).slice(0, 32);
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20)}`;
}

function sourceChecksum(source: ConversionSource): string {
  const { status: groupStatus, ...group } = source.group;
  const { status: jobStatus, ...job } = source.job;
  void groupStatus;
  void jobStatus;
  return jsonChecksum({
    group: { ...group, startsAt: group.startsAt.toISOString() },
    job,
  });
}

export function groupConversionEvent(
  group: ConversionSource["group"],
  input: ListingConversionInput,
): EventInput {
  const eventType = activityTypes[group.activity];
  if (!eventType || group.realm)
    throw new HttpError(
      400,
      "This listing needs an explicit event activity/realm review before conversion.",
    );
  const finish = resolveStart(input.localFinish, group.region);
  return eventSchema.parse({
    requestKey: conversionKey(group.id),
    game: "forever",
    realm: "",
    discordChannelId: null,
    confirmDiscordPublication: true,
    title: group.title,
    eventType,
    raidName: input.target,
    region: group.region,
    faction: group.faction,
    ruleset: group.gameRuleset,
    localStart: Temporal.Instant.from(group.startsAt.toISOString())
      .toZonedDateTimeISO(regionZone(group.region))
      .toPlainDateTime()
      .toString({ smallestUnit: "minute" }),
    durationMinutes: (finish.getTime() - group.startsAt.getTime()) / 60000,
    signupMinutesBefore: 0,
    reserveMinutesBefore: 0,
    capacity: input.capacity,
    roleCaps: input.roleCaps ?? eventTypeDefinitions[eventType].roleCaps,
    admission: input.admission,
    description: `${group.description}\n\nDiscord contact: ${group.contactDiscord}`,
    catalogId: null,
    reserveLimit: 0,
    reserveLimits: null,
    allowDuplicates: false,
    hardReserves: [],
  });
}

async function conversionSource(
  database: Pick<PrismaClient, "foreverGroup" | "foreverListingDiscordJob">,
  groupId: string,
): Promise<ConversionSource> {
  const group = await database.foreverGroup.findUnique({
    where: { id: groupId },
    select: {
      id: true,
      title: true,
      region: true,
      realm: true,
      faction: true,
      gameRuleset: true,
      activity: true,
      description: true,
      contactDiscord: true,
      startsAt: true,
      status: true,
    },
  });
  const job = await database.foreverListingDiscordJob.findUnique({
    where: { kind_entityId: { kind: "group", entityId: groupId } },
    select: {
      id: true,
      forumId: true,
      threadId: true,
      content: true,
      attachment: true,
      status: true,
    },
  });
  if (!group || !job?.threadId)
    throw new HttpError(
      404,
      "A delivered, consented group listing is required.",
    );
  return { group, job };
}

function assertStarter(
  raw: unknown,
  source: ConversionSource,
  plan: ListingConversionPlan,
): boolean {
  const message = messageSchema.parse(raw);
  if (
    message.id !== plan.threadId ||
    message.channel_id !== plan.threadId ||
    message.author.id !== plan.settings.applicationId
  )
    throw new HttpError(
      409,
      "The listing starter is not the original bot message.",
    );
  const controls = message.components.flatMap((row) =>
    row.components.map((control) => control.custom_id),
  );
  const converted =
    !!plan.eventId &&
    message.embeds.some(
      (embed) => embed.url === `${plan.settings.origin}/raids/${plan.eventId}`,
    ) &&
    ["join", "mine", "roster"].every((action) =>
      controls.includes(`nraid:e:${plan.eventId}:${action}`),
    );
  if (
    !converted &&
    (message.content !== source.job.content ||
      message.embeds.length ||
      message.components.length ||
      (source.job.attachment &&
        !message.attachments.some(
          (attachment) => attachment.filename === "listing.txt",
        )))
  )
    throw new HttpError(
      409,
      "The listing starter changed; review it before conversion.",
    );
  return converted;
}

export async function planGroupListingConversion(
  database: PrismaClient,
  raw: unknown,
  suppliedRequest?: RaidDiscordRequest,
): Promise<ListingConversionPlan> {
  const input = listingConversionSchema.parse(raw);
  const configured = raidDiscordSettings();
  if (!configured || !nativeRaidsEnabled())
    throw new HttpError(
      503,
      "Native event signup must be enabled before conversion.",
    );
  const source = await conversionSource(database, input.groupId);
  if (
    input.expectedSourceChecksum &&
    input.expectedSourceChecksum !== sourceChecksum(source)
  )
    throw new HttpError(
      409,
      "The listing changed after preview; preview it again.",
    );
  const member = await database.foreverMember.findUnique({
    where: { discordId: input.organizerDiscordId },
  });
  if (!member?.active)
    throw new HttpError(
      403,
      "The organizer must have an active Discord member account.",
    );
  const event = groupConversionEvent(source.group, input);
  const settings: RaidDiscordSettings = {
    ...configured,
    channelId: source.job.threadId!,
    visibility: "community",
  };
  const request = suppliedRequest ?? raidDiscordRequest(settings);
  if (
    !(await canManageRaidChannels(member.discordId, (route) => request(route)))
  )
    throw new HttpError(
      403,
      "Only a Discord administrator can convert a legacy listing.",
    );
  const thread = raidForumThreadSchema.parse(
    await request(`/channels/${settings.channelId}`),
  );
  if (
    thread.id !== source.job.threadId ||
    thread.parent_id !== source.job.forumId ||
    thread.guild_id !== settings.guildId
  )
    throw new HttpError(
      409,
      "The listing is outside its original group forum.",
    );
  const parent = auditChannelSchema.parse(
    await request(`/channels/${thread.parent_id}`),
  );
  const channel = raidForumChannel(thread, parent, settings.applicationId);
  const guild = raidChannelGuildSchema.parse(
    await request(`/guilds/${settings.guildId}`),
  );
  const roles = z
    .array(auditRoleSchema)
    .parse(await request(`/guilds/${settings.guildId}/roles`));
  const bot = raidChannelMemberSchema.parse(
    await request(
      `/guilds/${settings.guildId}/members/${settings.applicationId}`,
    ),
  );
  const organizer = raidChannelMemberSchema.parse(
    await request(`/guilds/${settings.guildId}/members/${member.discordId}`),
  );
  if (
    guild.id !== settings.guildId ||
    bot.user.id !== settings.applicationId ||
    organizer.user.id !== member.discordId ||
    !raidChannelEligible(channel, guild, roles, bot, organizer, parent)
  )
    throw new HttpError(
      403,
      "The bot and organizer must have access to this forum thread.",
    );
  const previous = await database.foreverRaidEvent.findUnique({
    where: {
      organizerId_requestKey: {
        organizerId: member.id,
        requestKey: event.requestKey,
      },
    },
    include: { discordPost: true },
  });
  if (previous) {
    if (
      !previous.discordPost ||
      previous.discordPost.channelId !== settings.channelId ||
      previous.discordPost.messageId !== settings.channelId ||
      previous.requestHash !== eventCreationHash(event)
    )
      throw new HttpError(
        409,
        "The previous conversion does not match these settings.",
      );
  } else {
    if (source.group.status !== "approved" || source.job.status !== "posted")
      throw new HttpError(
        409,
        "Only an approved, posted listing can be converted.",
      );
    validateEvent(event, new Date());
  }
  const plan = {
    groupId: input.groupId,
    threadId: settings.channelId,
    member,
    event,
    eventId: previous?.id ?? null,
    sourceChecksum: sourceChecksum(source),
    settings,
  };
  assertStarter(
    await request(
      `/channels/${settings.channelId}/messages/${settings.channelId}`,
    ),
    source,
    plan,
  );
  return plan;
}

export async function convertGroupListing(
  database: PrismaClient,
  raw: unknown,
  suppliedRequest?: RaidDiscordRequest,
): Promise<string> {
  const plan = await planGroupListingConversion(database, raw, suppliedRequest);
  const request = suppliedRequest ?? raidDiscordRequest(plan.settings);
  const eventId = await database.$transaction(async (client) => {
    await client.$queryRaw`SELECT "id" FROM "ForeverListingDiscordJob" WHERE "kind"='group' AND "entityId"=${plan.groupId} FOR UPDATE`;
    await client.$queryRaw`SELECT "id" FROM "ForeverGroup" WHERE "id"=${plan.groupId} FOR UPDATE`;
    const source = await conversionSource(client, plan.groupId);
    if (sourceChecksum(source) !== plan.sourceChecksum)
      throw new HttpError(
        409,
        "The listing changed after preview; preview it again.",
      );
    const prior = await client.foreverRaidEvent.findUnique({
      where: {
        organizerId_requestKey: {
          organizerId: plan.member.id,
          requestKey: plan.event.requestKey,
        },
      },
      include: { discordPost: true },
    });
    if (prior) {
      if (
        prior.requestHash !== eventCreationHash(plan.event) ||
        prior.discordPost?.channelId !== plan.threadId ||
        prior.discordPost.messageId !== plan.threadId ||
        source.group.status !== "hidden" ||
        source.job.status !== "removed"
      )
        throw new HttpError(
          409,
          "The conversion receipt does not match the original listing.",
        );
      return prior.id;
    }
    if (source.group.status !== "approved" || source.job.status !== "posted")
      throw new HttpError(
        409,
        "The listing is no longer eligible for conversion.",
      );
    const id = await raidService(database, client, {
      deferDiscordPublication: true,
    }).create(plan.member, plan.event);
    const event = await client.foreverRaidEvent.findUniqueOrThrow({
      where: { id },
    });
    await client.foreverRaidDiscordPost.create({
      data: {
        eventId: id,
        guildId: plan.settings.guildId,
        channelId: plan.threadId,
        messageId: plan.threadId,
        origin: plan.settings.origin,
        visibility: "community",
        label: source.group.title,
        confirmedAt: new Date(),
        status: "failed",
        lastError: conversionError,
        desiredVersion: event.version,
      },
    });
    await client.foreverGroup.update({
      where: { id: plan.groupId },
      data: { status: "hidden" },
    });
    await client.foreverListingDiscordJob.update({
      where: { id: source.job.id },
      data: {
        status: "removed",
        lastError: `Converted to managed event ${id}; starter owned by event worker.`,
      },
    });
    await client.foreverRaidAudit.create({
      data: {
        eventId: id,
        actorId: `operator:${plan.member.discordId}`,
        action: "listing_conversion_prepared",
        details: {
          groupId: plan.groupId,
          jobId: source.job.id,
          threadId: plan.threadId,
          sourceChecksum: plan.sourceChecksum,
        },
      },
    });
    await client.foreverAuditLog.create({
      data: {
        actorId: `operator:${plan.member.discordId}`,
        entityType: "group",
        entityId: plan.groupId,
        action: "converted_to_event",
        details: { eventId: id, threadId: plan.threadId },
      },
    });
    return id;
  });
  const current = await database.foreverRaidDiscordPost.findUniqueOrThrow({
    where: { eventId },
  });
  if (current.lastError !== conversionError) return eventId;
  const source = await conversionSource(database, plan.groupId);
  const activePlan = { ...plan, eventId };
  assertStarter(
    await request(`/channels/${plan.threadId}/messages/${plan.threadId}`),
    source,
    activePlan,
  );
  const event = await raidService(database).get(plan.member, eventId);
  if (event.status !== "open")
    throw new HttpError(409, "The converted event is no longer open.");
  const thread = raidForumThreadSchema.parse(
    await request(`/channels/${plan.threadId}`),
  );
  if (
    thread.id !== plan.threadId ||
    thread.owner_id !== plan.settings.applicationId ||
    thread.thread_metadata.locked
  )
    throw new HttpError(
      409,
      "The forum thread's ownership or access changed. Preview the conversion again.",
    );
  if (thread.thread_metadata.archived) {
    const reopened = raidForumThreadSchema.parse(
      await request(`/channels/${plan.threadId}`, "PATCH", { archived: false }),
    );
    if (
      reopened.id !== plan.threadId ||
      reopened.thread_metadata.archived ||
      reopened.thread_metadata.locked
    )
      throw new HttpError(409, "The forum thread could not be reopened.");
  }
  const cover = eventArtwork(event.game, event.eventType, event.raidName);
  await request(
    `/channels/${plan.threadId}/messages/${plan.threadId}`,
    "PATCH",
    discordEventPanel(
      event,
      plan.settings.origin,
      "attachment://event-cover.webp",
    ),
    { file: cover.file, description: cover.alt },
  );
  const verified = await request(
    `/channels/${plan.threadId}/messages/${plan.threadId}`,
  );
  if (!assertStarter(verified, source, activePlan))
    throw new HttpError(
      409,
      "The native event post could not be verified; retry the same conversion.",
    );
  await database.$transaction(async (client) => {
    await client.$queryRaw`SELECT "id" FROM "ForeverRaidEvent" WHERE "id"=${eventId} FOR UPDATE`;
    const latest = await client.foreverRaidEvent.findUniqueOrThrow({
      where: { id: eventId },
    });
    if (latest.version !== event.version || latest.policyRevision !== 0)
      throw new HttpError(
        409,
        "Event details changed during conversion; moderator review is required.",
      );
    const activated = await client.foreverRaidDiscordPost.updateMany({
      where: {
        eventId,
        lastError: conversionError,
        messageId: plan.threadId,
        channelId: plan.threadId,
      },
      data: {
        status: "sent",
        lastError: null,
        deliveredVersion: event.version,
        approvedAt: new Date(),
        approvedBy: plan.member.discordId,
        nextAttemptAt: new Date(),
      },
    });
    if (activated.count)
      await client.foreverRaidAudit.create({
        data: {
          eventId,
          actorId: `operator:${plan.member.discordId}`,
          action: "listing_conversion_activated",
          details: {
            groupId: plan.groupId,
            threadId: plan.threadId,
            deliveredVersion: event.version,
          },
        },
      });
  });
  return eventId;
}
