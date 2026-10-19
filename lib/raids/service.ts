import { Prisma, type PrismaClient } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/security";
import { pilotDiscordIds, requireRaidPilot } from "./config";
import { catalogBundleSchema, catalogItems } from "./catalog";
import {
  characterSchema,
  characterSpecializationSchema,
  storedCharacterSchema,
  eventSchema,
  eventActionSchema,
  signupSchema,
  participatingStatuses,
  reservesSchema,
  policyAcknowledgementSchema,
  reserveLimitsSchema,
  signupRoles,
  roles,
  type CharacterView,
  type EventView,
  type EventSummary,
  type MemberIdentity,
  type EventHistoryPage,
  type StoredCharacter,
} from "./contracts";
import {
  characterCanJoin,
  formatRaidTime,
  seatAvailable,
  validateEvent,
} from "./policy";
import { reserveQuota } from "./loot-policy";
import { jsonChecksum } from "./json";
import { eventPolicyChecksum } from "./event-policy";
import { enrichCatalogItems } from "./item-details";
import { eventTypes, eventTypeDefinitions } from "./event-types";
import {
  raidDiscordDestination,
  raidDestinationForPost,
} from "./discord-settings";
import { gameSchema } from "./games";
import { resolveRaidDestination } from "./discord-channels";
import { raidAudienceIncludes, raidAudienceFilter } from "./access";
import { eventChangeView } from "./event-history";
import { compositionRevisions } from "./composition";
import { RAID_PARTY_SIZE, raidPartyCount } from "./roster-layout";
import { eventCreationHash } from "./event-request";
import { checkServerMembership } from "@/lib/member-discord";
import {
  readMemberAuthSettings,
  type ServerMembership,
} from "@/lib/member-auth-options";
import { raidsEnabled } from "./config";
import {
  parseRaidHelperExport,
  raidHelperSuggestion,
  signupImportRequestSchema,
  signupImportResultSchema,
  signupImportSourceSchema,
  type RaidHelperExport,
  type SignupImportPreview,
  type SignupImportResult,
} from "./signup-import";

const capsSchema = z
  .object({
    tank: z.number().int().nonnegative(),
    healer: z.number().int().nonnegative(),
    damage: z.number().int().nonnegative(),
  })
  .strict();
const includeEvent = {
  catalog: true,
  snapshot: true,
  discordPost: true,
  signups: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
} satisfies Prisma.ForeverRaidEventInclude;
type StoredEvent = Prisma.ForeverRaidEventGetPayload<{
  include: typeof includeEvent;
}>;
type Transaction = Prisma.TransactionClient;
interface StoredPartyPosition {
  id: string;
  status: string;
  partyIndex: number | null;
  slotIndex: number | null;
}
export interface RaidService {
  characters(member: MemberIdentity): Promise<CharacterView[]>;
  addCharacter(member: MemberIdentity, raw: unknown): Promise<CharacterView>;
  updateCharacterSpecialization(
    member: MemberIdentity,
    raw: unknown,
  ): Promise<void>;
  list(member: MemberIdentity): Promise<EventSummary[]>;
  get(member: MemberIdentity, id: string): Promise<EventView>;
  history(
    member: MemberIdentity,
    id: string,
    cursor?: string,
  ): Promise<EventHistoryPage>;
  create(member: MemberIdentity, raw: unknown): Promise<string>;
  signup(member: MemberIdentity, id: string, raw: unknown): Promise<void>;
  previewSignups(
    member: MemberIdentity,
    id: string,
    source: string,
  ): Promise<SignupImportPreview>;
  importSignups(
    member: MemberIdentity,
    id: string,
    raw: unknown,
  ): Promise<SignupImportResult>;
  withdraw(member: MemberIdentity, id: string): Promise<void>;
  acknowledge(member: MemberIdentity, id: string, raw: unknown): Promise<void>;
  reserves(member: MemberIdentity, id: string, raw: unknown): Promise<void>;
  manage(member: MemberIdentity, id: string, raw: unknown): Promise<void>;
  export(
    member: MemberIdentity,
    id: string,
  ): Promise<{ payload: Prisma.JsonValue; checksum: string }>;
  publishDiscord(member: MemberIdentity, id: string): Promise<void>;
}

async function assertMember(
  client: Transaction,
  member: MemberIdentity,
): Promise<void> {
  requireRaidPilot(member.discordId);
  const record = await client.foreverMember.findUnique({
    where: { id: member.id },
  });
  if (!record?.active || record.discordId !== member.discordId)
    throw new HttpError(403, "Member access is disabled.");
}
function authorize(
  event: Pick<StoredEvent, "audience" | "organizerId" | "discordPost">,
  member: MemberIdentity,
  organizer = false,
): void {
  if (!raidAudienceIncludes(event, member.discordId))
    throw new HttpError(404, "Event not found.");
  if (organizer && event.organizerId !== member.id)
    throw new HttpError(403, "Only the event organizer can do this.");
}
async function clock(client: Transaction): Promise<Date> {
  const [row] = await client.$queryRaw<
    { now: Date }[]
  >`SELECT clock_timestamp() AS now`;
  return row.now;
}
async function lockedEvent(
  client: Transaction,
  id: string,
): Promise<StoredEvent> {
  await client.$queryRaw`SELECT "id" FROM "ForeverRaidEvent" WHERE "id" = ${id} FOR UPDATE`;
  const event = await client.foreverRaidEvent.findUnique({
    where: { id },
    include: includeEvent,
  });
  if (!event) throw new HttpError(404, "Event not found.");
  return event;
}
async function audit(
  client: Transaction,
  eventId: string,
  actorId: string,
  action: string,
  details: Prisma.InputJsonValue,
): Promise<void> {
  await client.foreverRaidAudit.create({
    data: { eventId, actorId, action, details },
  });
  await client.foreverRaidEvent.update({
    where: { id: eventId },
    data: { version: { increment: 1 } },
  });
}
function requireOpen(event: StoredEvent): void {
  if (event.status !== "open")
    throw new HttpError(409, "This event is locked or cancelled.");
}
function signupImportSource(text: string): RaidHelperExport {
  const source = parseRaidHelperExport(text);
  if (!source)
    throw new HttpError(
      400,
      "Choose a valid Raid-Helper JSON export with up to 100 unique Discord signups.",
    );
  const settings = readMemberAuthSettings(raidsEnabled(), pilotDiscordIds());
  if (!settings.guildIds.includes(source.serverId))
    throw new HttpError(
      400,
      "The source must be one of this service's Discord servers.",
    );
  return source;
}
function characterSnapshot(character: {
  name: string;
  game: string;
  realm: string;
  className: string;
  specialization: string | null;
  region: string;
  faction: string;
  ruleset: string;
}): StoredCharacter {
  return storedCharacterSchema.parse({
    name: character.name,
    game: character.game,
    realm: character.realm,
    className: character.className,
    specialization: character.specialization,
    region: character.region,
    faction: character.faction,
    ruleset: character.ruleset,
  });
}
function firstAvailablePartyPosition(
  capacity: number,
  signups: readonly StoredPartyPosition[],
  excludedId?: string,
  preferredParty?: number,
): { partyIndex: number; slotIndex: number } {
  const occupied = new Set(
    signups
      .filter(
        (signup) =>
          signup.id !== excludedId &&
          signup.status === "accepted" &&
          signup.partyIndex !== null &&
          signup.slotIndex !== null,
      )
      .map((signup) => `${signup.partyIndex}:${signup.slotIndex}`),
  );
  const parties = raidPartyCount(capacity);
  let partyOrder = Array.from({ length: parties }, (_, index) => index);
  if (preferredParty !== undefined) {
    if (preferredParty < 0 || preferredParty >= parties)
      throw new HttpError(400, "Requested party is outside event capacity.");
    partyOrder = [preferredParty];
  }
  for (const partyIndex of partyOrder) {
    const partyCapacity = Math.min(
      RAID_PARTY_SIZE,
      capacity - partyIndex * RAID_PARTY_SIZE,
    );
    for (let slotIndex = 0; slotIndex < partyCapacity; slotIndex += 1)
      if (!occupied.has(`${partyIndex}:${slotIndex}`))
        return { partyIndex, slotIndex };
  }
  throw new HttpError(
    409,
    preferredParty === undefined
      ? "No roster position is available."
      : "That party is already full.",
  );
}

function normalizedPartyPositions(
  capacity: number,
  signups: readonly StoredPartyPosition[],
): Map<string, { partyIndex: number; slotIndex: number }> {
  const accepted = signups.filter((signup) => signup.status === "accepted");
  const parties = raidPartyCount(capacity, accepted.length);
  const occupied = new Set<string>();
  const result = new Map<string, { partyIndex: number; slotIndex: number }>();
  const unassigned: StoredPartyPosition[] = [];
  for (const signup of accepted) {
    const { partyIndex, slotIndex } = signup;
    const key = `${partyIndex}:${slotIndex}`;
    if (
      partyIndex !== null &&
      slotIndex !== null &&
      partyIndex >= 0 &&
      partyIndex < parties &&
      slotIndex >= 0 &&
      slotIndex < RAID_PARTY_SIZE &&
      partyIndex * RAID_PARTY_SIZE + slotIndex < capacity &&
      !occupied.has(key)
    ) {
      occupied.add(key);
      result.set(signup.id, { partyIndex, slotIndex });
    } else {
      unassigned.push(signup);
    }
  }
  for (const signup of unassigned) {
    let assigned = false;
    for (let partyIndex = 0; partyIndex < parties && !assigned; partyIndex += 1)
      for (let slotIndex = 0; slotIndex < RAID_PARTY_SIZE; slotIndex += 1) {
        if (partyIndex * RAID_PARTY_SIZE + slotIndex >= capacity) break;
        const key = `${partyIndex}:${slotIndex}`;
        if (occupied.has(key)) continue;
        occupied.add(key);
        result.set(signup.id, { partyIndex, slotIndex });
        assigned = true;
        break;
      }
  }
  return result;
}
function view(event: StoredEvent, member: MemberIdentity): EventView {
  const bundle = event.catalog
    ? catalogBundleSchema.parse(event.catalog.bundle)
    : null;
  return {
    id: event.id,
    game: gameSchema.parse(event.game),
    realm: event.realm,
    eventType: z.enum(eventTypes).parse(event.eventType),
    title: event.title,
    raidName: event.raidName,
    region: event.region,
    faction: event.faction,
    ruleset: event.ruleset,
    description: event.description,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(),
    signupClosesAt: event.signupClosesAt.toISOString(),
    reservesCloseAt: event.reservesCloseAt.toISOString(),
    timeLabel: formatRaidTime(event.startsAt, event.region),
    signupCloseLabel: formatRaidTime(event.signupClosesAt, event.region),
    reservesCloseLabel: formatRaidTime(event.reservesCloseAt, event.region),
    capacity: event.capacity,
    roleCaps: capsSchema.parse(event.roleCaps),
    admission: event.admission,
    status: event.status,
    compositionRevision: event.compositionRevision,
    version: event.version,
    policyChecksum: eventPolicyChecksum(event),
    reserveLimit: event.reserveLimit,
    reserveLimits:
      event.reserveLimits === null
        ? null
        : reserveLimitsSchema.parse(event.reserveLimits),
    allowDuplicates: event.allowDuplicates,
    hardReserves: event.hardReserves,
    catalog:
      event.catalog && bundle
        ? {
            id: event.catalog.id,
            game: bundle.game,
            raidName: event.catalog.raidName,
            checksum: event.catalog.checksum,
            sourcePatch: bundle.sourcePatch,
            clientBuild: bundle.clientBuild,
            items: enrichCatalogItems(bundle.game, bundle.items),
          }
        : null,
    signups: event.signups
      .filter((signup) => signup.status !== "withdrawn")
      .map((signup) => ({
        id: signup.id,
        character: storedCharacterSchema.parse(signup.character),
        role: z.enum(signupRoles).parse(signup.role),
        status: signup.status,
        partyIndex: signup.partyIndex,
        slotIndex: signup.slotIndex,
        isMine: signup.memberId === member.id,
        reserves: signup.reserves,
        needsAcknowledgement:
          signup.policyChecksum !== eventPolicyChecksum(event) ||
          signup.acknowledgedAt === null,
        ...(signup.importSource !== null
          ? {
              imported: true,
              note: signupImportSourceSchema.parse(signup.importSource).note,
            }
          : {}),
      })),
    isOrganizer: event.organizerId === member.id,
    locked: event.snapshot !== null,
    discordAvailable:
      (event.discordPost
        ? raidDestinationForPost(event.discordPost)
        : raidDiscordDestination(null)) !== null,
    discord: event.discordPost
      ? {
          visibility:
            event.discordPost.visibility === "community"
              ? "community"
              : "private",
          label: event.discordPost.label || "Private raid-manager test",
          status: event.discordPost.status,
          url: event.discordPost.messageId
            ? `https://discord.com/channels/${event.discordPost.guildId}/${event.discordPost.channelId}/${event.discordPost.messageId}`
            : null,
          approved: event.discordPost.approvedAt !== null,
          inSync:
            event.discordPost.deliveredVersion === event.version &&
            event.discordPost.status === "sent",
          lastError: event.discordPost.lastError,
        }
      : null,
  };
}

export function raidService(
  database: PrismaClient = db,
  transaction?: Transaction,
  creation: {
    deferDiscordPublication?: boolean;
    importMembership?: (
      discordId: string,
      guildId: string,
    ) => Promise<ServerMembership>;
  } = {},
): RaidService {
  const connection = transaction ?? database;
  function runTransaction<T>(
    action: (client: Transaction) => Promise<T>,
  ): Promise<T> {
    return transaction ? action(transaction) : database.$transaction(action);
  }
  return {
    async characters(member: MemberIdentity): Promise<CharacterView[]> {
      await assertMember(connection, member);
      const records = await connection.foreverCharacter.findMany({
        where: { memberId: member.id },
        orderBy: { name: "asc" },
      });
      return records.map((record) => ({
        id: record.id,
        ...storedCharacterSchema.parse({
          name: record.name,
          game: record.game,
          realm: record.realm,
          className: record.className,
          specialization: record.specialization,
          region: record.region,
          faction: record.faction,
          ruleset: record.ruleset,
        }),
      }));
    },
    async addCharacter(
      member: MemberIdentity,
      raw: unknown,
    ): Promise<CharacterView> {
      const input = characterSchema.parse(raw);
      return runTransaction(async (client) => {
        await client.$queryRaw`SELECT "id" FROM "ForeverMember" WHERE "id" = ${member.id} FOR UPDATE`;
        await assertMember(client, member);
        if (
          (await client.foreverCharacter.count({
            where: { memberId: member.id },
          })) >= 20
        )
          throw new HttpError(400, "Character limit reached.");
        const record = await client.foreverCharacter.create({
          data: { memberId: member.id, ...input },
        });
        return { id: record.id, ...input };
      });
    },
    async updateCharacterSpecialization(
      member: MemberIdentity,
      raw: unknown,
    ): Promise<void> {
      const input = characterSpecializationSchema.parse(raw);
      await runTransaction(async (client) => {
        await client.$queryRaw`SELECT "id" FROM "ForeverMember" WHERE "id" = ${member.id} FOR UPDATE`;
        await assertMember(client, member);
        const character = await client.foreverCharacter.findFirst({
          where: { id: input.id, memberId: member.id },
        });
        if (!character) throw new HttpError(404, "Character not found.");
        characterSchema.parse({
          name: character.name,
          game: character.game,
          realm: character.realm,
          className: character.className,
          region: character.region,
          faction: character.faction,
          ruleset: character.ruleset,
          specialization: input.specialization,
        });
        await client.foreverCharacter.update({
          where: { id: character.id },
          data: { specialization: input.specialization },
        });
      });
    },
    async list(member: MemberIdentity): Promise<EventSummary[]> {
      await assertMember(connection, member);
      const events = await connection.foreverRaidEvent.findMany({
        where: raidAudienceFilter(member.discordId),
        select: {
          id: true,
          game: true,
          realm: true,
          eventType: true,
          title: true,
          raidName: true,
          region: true,
          faction: true,
          ruleset: true,
          startsAt: true,
          endsAt: true,
          capacity: true,
          status: true,
          _count: { select: { signups: { where: { status: "accepted" } } } },
        },
        orderBy: { startsAt: "desc" },
        take: 100,
      });
      return events.map((event) => ({
        id: event.id,
        game: gameSchema.parse(event.game),
        realm: event.realm,
        eventType: z.enum(eventTypes).parse(event.eventType),
        title: event.title,
        raidName: event.raidName,
        region: event.region,
        faction: event.faction,
        ruleset: event.ruleset,
        endsAt: event.endsAt.toISOString(),
        timeLabel: formatRaidTime(event.startsAt, event.region),
        capacity: event.capacity,
        status: event.status,
        acceptedCount: event._count.signups,
      }));
    },
    async get(member: MemberIdentity, id: string): Promise<EventView> {
      await assertMember(connection, member);
      const event = await connection.foreverRaidEvent.findUnique({
        where: { id },
        include: includeEvent,
      });
      if (!event) throw new HttpError(404, "Event not found.");
      authorize(event, member);
      return view(event, member);
    },
    async history(
      member: MemberIdentity,
      id: string,
      cursor?: string,
    ): Promise<EventHistoryPage> {
      await assertMember(connection, member);
      const event = await connection.foreverRaidEvent.findUnique({
        where: { id },
        select: {
          audience: true,
          organizerId: true,
          region: true,
          discordPost: true,
        },
      });
      if (!event) throw new HttpError(404, "Event not found.");
      authorize(event, member);
      if (
        cursor &&
        !(await connection.foreverRaidAudit.findFirst({
          where: {
            id: cursor,
            eventId: id,
            action: { in: ["settings_updated", "signups_imported"] },
          },
          select: { id: true },
        }))
      )
        throw new HttpError(400, "Invalid change history cursor.");
      const rows = await connection.foreverRaidAudit.findMany({
        where: {
          eventId: id,
          action: { in: ["settings_updated", "signups_imported"] },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 31,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: { id: true, createdAt: true, details: true },
      });
      return {
        changes: rows
          .slice(0, 30)
          .map((row) => eventChangeView(row, event.region)),
        nextCursor: rows.length > 30 ? rows[29].id : null,
      };
    },
    async create(member: MemberIdentity, raw: unknown): Promise<string> {
      const input = eventSchema.parse(raw);
      const {
        eventType,
        game,
        realm,
        discordChannelId,
        confirmDiscordPublication,
      } = input;
      const requestHash = eventCreationHash(input);
      await assertMember(connection, member);
      const prior = await connection.foreverRaidEvent.findUnique({
        where: {
          organizerId_requestKey: {
            organizerId: member.id,
            requestKey: input.requestKey,
          },
        },
      });
      if (prior) {
        if (prior.requestHash !== requestHash)
          throw new HttpError(
            409,
            "Submission key was already used for a different event.",
          );
        return prior.id;
      }
      // Discord reads happen before the short database transaction, never during it.
      const discord = creation.deferDiscordPublication
        ? null
        : await resolveRaidDestination(
            discordChannelId,
            member.discordId,
            confirmDiscordPublication,
          );
      return runTransaction(async (client) => {
        await assertMember(client, member);
        // Serialize duplicate submissions before checking time-dependent validation.
        await client.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${member.id + ":" + input.requestKey}, 0))`;
        const existing = await client.foreverRaidEvent.findUnique({
          where: {
            organizerId_requestKey: {
              organizerId: member.id,
              requestKey: input.requestKey,
            },
          },
        });
        if (existing) {
          if (existing.requestHash !== requestHash)
            throw new HttpError(
              409,
              "Submission key was already used for a different event.",
            );
          return existing.id;
        }
        const times = validateEvent(input, await clock(client));
        const catalog = input.catalogId
          ? await client.foreverRaidCatalog.findUnique({
              where: { id: input.catalogId },
            })
          : null;
        if (
          input.catalogId &&
          (!catalog ||
            catalog.status !== "published" ||
            catalogBundleSchema.parse(catalog.bundle).game !== game ||
            catalog.raidName !== input.raidName)
        )
          throw new HttpError(
            400,
            "Choose a published catalog matching this raid and game edition.",
          );
        if (catalog) {
          const ids = new Set(
            catalogItems(catalog.bundle).map((item) => item.itemId),
          );
          if (input.hardReserves.some((id) => !ids.has(id)))
            throw new HttpError(400, "Hard reserve is not in this catalog.");
        }
        const event = await client.foreverRaidEvent.create({
          data: {
            requestKey: input.requestKey,
            requestHash,
            organizerId: member.id,
            audience: [...new Set([...pilotDiscordIds(), member.discordId])],
            title: input.title,
            eventType,
            game,
            realm,
            raidName: input.raidName,
            region: input.region,
            faction: input.faction,
            ruleset: input.ruleset,
            description: input.description,
            ...times,
            capacity: input.capacity,
            roleCaps: input.roleCaps,
            admission: input.admission,
            catalogId: input.catalogId,
            reserveLimit: input.reserveLimit,
            reserveLimits: input.reserveLimits ?? Prisma.DbNull,
            allowDuplicates: input.allowDuplicates,
            hardReserves: input.hardReserves,
            compositionRevision: compositionRevisions[game],
          },
        });
        await audit(client, event.id, member.id, "created", {
          game,
          eventType,
          publication: discord?.visibility ?? "private",
          discordChannelId: discord?.channelId ?? null,
          catalogChecksum: catalog?.checksum ?? null,
        });
        if (discord)
          await client.foreverRaidDiscordPost.create({
            data: {
              eventId: event.id,
              guildId: discord.guildId,
              channelId: discord.channelId,
              origin: discord.origin,
              visibility: discord.visibility ?? "private",
              label: discord.label,
              confirmedAt:
                discord.visibility === "community" ? new Date() : null,
              desiredVersion: event.version + 1,
            },
          });
        return event.id;
      });
    },
    async publishDiscord(member: MemberIdentity, id: string): Promise<void> {
      await runTransaction(async (client) => {
        await assertMember(client, member);
        const event = await lockedEvent(client, id);
        authorize(event, member, true);
        if (event.status === "cancelled")
          throw new HttpError(409, "Cancelled events cannot be published.");
        const post = event.discordPost;
        const settings = post
          ? raidDestinationForPost(post)
          : raidDiscordDestination(null);
        if (!settings)
          throw new HttpError(
            503,
            "Discord event destination is not configured.",
          );
        if (!post && settings.visibility === "community")
          throw new HttpError(
            409,
            "This private event cannot be moved to a community channel without a new publication consent flow.",
          );
        if (
          post &&
          (post.guildId !== settings.guildId ||
            post.channelId !== settings.channelId ||
            post.origin !== settings.origin)
        )
          throw new HttpError(
            409,
            "This event belongs to a different Discord destination. Ask staff to review it.",
          );
        if (post && ["delivering", "uncertain"].includes(post.status))
          throw new HttpError(
            409,
            "Delivery is being reconciled. Retrying now could create a duplicate post.",
          );
        if (post?.messageId && post.lastError === "discord_post_removed")
          throw new HttpError(
            409,
            "The Discord post was removed. It will not be recreated automatically.",
          );
        if (post && ["pending", "sent"].includes(post.status)) return;
        await audit(client, id, member.id, "discord_requested", {
          channelId: settings.channelId,
        });
        await client.foreverRaidDiscordPost.upsert({
          where: { eventId: id },
          create: {
            eventId: id,
            guildId: settings.guildId,
            channelId: settings.channelId,
            origin: settings.origin,
            desiredVersion: event.version + 1,
          },
          update: {
            status: "pending",
            nextAttemptAt: new Date(),
            lastError: null,
          },
        });
      });
    },
    async previewSignups(
      member: MemberIdentity,
      id: string,
      text: string,
    ): Promise<SignupImportPreview> {
      await assertMember(connection, member);
      const event = await connection.foreverRaidEvent.findUnique({
        where: { id },
        include: includeEvent,
      });
      if (!event) throw new HttpError(404, "Event not found.");
      authorize(event, member, true);
      requireOpen(event);
      if ((await clock(connection)) >= event.signupClosesAt)
        throw new HttpError(409, "Signups have closed.");
      const source = signupImportSource(text);
      const members = await connection.foreverMember.findMany({
        where: { discordId: { in: source.signUps.map((row) => row.userId) } },
        include: {
          characters: {
            where: {
              game: event.game,
              realm: event.realm,
              region: event.region,
              faction: event.faction,
              ruleset: event.ruleset,
            },
          },
        },
      });
      const combat =
        eventTypeDefinitions[z.enum(eventTypes).parse(event.eventType)]
          .combatRoles;
      return {
        version: event.version,
        sourceEventId: source.id,
        sourceTitle: source.title,
        sourceStartLabel:
          source.startTime !== undefined
            ? formatRaidTime(new Date(source.startTime * 1000), event.region)
            : null,
        warnings: [
          ...(source.startTime !== undefined &&
          source.startTime * 1000 !== event.startsAt.getTime()
            ? [
                "The source starts at a different time. This event's schedule will not change.",
              ]
            : []),
          "Imported players must review this event's rules themselves before reserving loot or locking the roster.",
        ],
        rows: [...source.signUps]
          .sort((a, b) => (a.position ?? 100000) - (b.position ?? 100000))
          .map((row) => {
            const saved = members.find(
              (record) => record.discordId === row.userId,
            );
            const characters = (saved?.characters ?? []).map((character) => ({
              id: character.id,
              ...characterSnapshot(character),
            }));
            const suggestion = raidHelperSuggestion(row);
            const matching = characters.filter(
              (character) =>
                suggestion.className === null ||
                character.className === suggestion.className,
            );
            const character =
              matching.find(
                (candidate) => candidate.name === suggestion.name,
              ) ?? (matching.length === 1 ? matching[0] : null);
            return {
              userId: row.userId,
              originalName: row.name,
              originalClass: row.className,
              originalSpec: row.specName ?? "",
              note: row.note ?? null,
              ...suggestion,
              name: character?.name ?? suggestion.name,
              className: character?.className ?? suggestion.className,
              specialization:
                suggestion.specialization ?? character?.specialization ?? null,
              role: combat ? suggestion.role : "participant",
              characterId: character?.id ?? null,
              characters,
              blocked: !raidAudienceIncludes(event, row.userId)
                ? "This player cannot access this event."
                : saved && !saved.active
                  ? "This member's access is disabled."
                  : saved &&
                      event.signups.some(
                        (signup) => signup.memberId === saved.id,
                      )
                    ? "Already has a signup; it will not be overwritten."
                    : null,
            };
          }),
      };
    },
    async importSignups(
      member: MemberIdentity,
      id: string,
      raw: unknown,
    ): Promise<SignupImportResult> {
      const input = signupImportRequestSchema.parse(raw);
      const source = signupImportSource(input.source);
      const checksum = jsonChecksum(source);
      const requestHash = jsonChecksum({
        source: checksum,
        selections: input.selections,
      });
      const prepare = async (
        client: Transaction,
      ): Promise<{ event: StoredEvent; replay: SignupImportResult | null }> => {
        await assertMember(client, member);
        const event = await lockedEvent(client, id);
        authorize(event, member, true);
        const receipt = await client.foreverRaidAudit.findFirst({
          where: {
            eventId: id,
            action: "signups_imported",
            details: { path: ["requestKey"], equals: input.requestKey },
          },
        });
        if (receipt) {
          const stored = z
            .object({
              requestHash: z.string(),
              result: signupImportResultSchema,
            })
            .parse(receipt.details);
          if (stored.requestHash !== requestHash)
            throw new HttpError(
              409,
              "This import request was already used with different players. Preview the export again.",
            );
          return { event, replay: stored.result };
        }
        requireOpen(event);
        if (event.version !== input.version)
          throw new HttpError(
            409,
            "The event changed. Preview the export again before importing.",
          );
        if ((await clock(client)) >= event.signupClosesAt)
          throw new HttpError(409, "Signups have closed.");
        for (const selection of input.selections) {
          if (!source.signUps.some((row) => row.userId === selection.userId))
            throw new HttpError(
              400,
              "Every selected player must belong to the source export.",
            );
          if (!raidAudienceIncludes(event, selection.userId))
            throw new HttpError(
              403,
              "A selected player cannot access this event.",
            );
          requireRaidPilot(selection.userId);
        }
        return { event, replay: null };
      };
      const initial = await runTransaction(prepare);
      if (initial.replay) return initial.replay;
      // Discord I/O stays outside the transaction; the event/version is rechecked
      // under a row lock before any accounts, characters or signups are written.
      const settings = readMemberAuthSettings(
        raidsEnabled(),
        pilotDiscordIds(),
      );
      for (const selection of input.selections) {
        const membership = creation.importMembership
          ? await creation.importMembership(selection.userId, source.serverId)
          : await checkServerMembership(
              selection.userId,
              source.serverId,
              settings.botToken,
            );
        if (membership !== "member")
          throw new HttpError(
            membership === "unavailable" ? 503 : 400,
            membership === "unavailable"
              ? "Discord membership could not be checked. No players were imported; try again shortly."
              : "A selected player is no longer a member of the source server. No players were imported.",
          );
      }
      return runTransaction(async (client) => {
        const { event, replay } = await prepare(client);
        if (replay) return replay;
        const now = await clock(client);
        const result: SignupImportResult = {
          imported: 0,
          skipped: 0,
          statuses: {},
        };
        const combat =
          eventTypeDefinitions[z.enum(eventTypes).parse(event.eventType)]
            .combatRoles;
        const seating = [...event.signups];
        for (const selection of input.selections) {
          const row = source.signUps.find(
            (entry) => entry.userId === selection.userId,
          )!;
          let account = await client.foreverMember.findUnique({
            where: { discordId: selection.userId },
          });
          if (account && !account.active)
            throw new HttpError(
              403,
              "A selected member's access is disabled. No players were imported.",
            );
          const existingMemberId = account?.id;
          if (
            existingMemberId &&
            event.signups.some((signup) => signup.memberId === existingMemberId)
          ) {
            result.skipped += 1;
            continue;
          }
          if (
            combat
              ? selection.role === "participant" || !selection.specialization
              : selection.role !== "participant"
          )
            throw new HttpError(
              400,
              combat
                ? "Choose a class, specialization and combat role for every selected player."
                : "This event accepts participants without combat roles.",
            );
          const snapshot = storedCharacterSchema.parse({
            name: selection.name,
            className: selection.className,
            specialization: selection.specialization,
            game: event.game,
            realm: event.realm,
            region: event.region,
            faction: event.faction,
            ruleset: event.ruleset,
          });
          if (
            event.game === "tbc" &&
            !/^[\p{L}\p{M}]{2,12}$/u.test(snapshot.name)
          )
            throw new HttpError(
              400,
              "TBC character names must use 2-12 letters.",
            );
          if (!account)
            account = await client.foreverMember.upsert({
              where: { discordId: selection.userId },
              create: { discordId: selection.userId, displayName: row.name },
              update: {},
            });
          if (!account.active)
            throw new HttpError(
              403,
              "A selected member's access is disabled. No players were imported.",
            );
          let character;
          if (selection.characterId) {
            character = await client.foreverCharacter.findFirst({
              where: { id: selection.characterId, memberId: account.id },
            });
            if (
              !character ||
              !characterCanJoin(characterSnapshot(character), event) ||
              character.className !== snapshot.className ||
              character.name !== snapshot.name
            )
              throw new HttpError(
                400,
                "A selected saved character does not belong to that player or match this event.",
              );
          } else {
            character = await client.foreverCharacter.upsert({
              where: {
                memberId_name_game_realm_region_faction_ruleset: {
                  memberId: account.id,
                  name: snapshot.name,
                  game: event.game,
                  realm: event.realm,
                  region: event.region,
                  faction: event.faction,
                  ruleset: event.ruleset,
                },
              },
              create: { memberId: account.id, ...snapshot },
              update: {},
            });
            if (character.className !== snapshot.className)
              throw new HttpError(
                400,
                "An existing character has a different class. Choose the saved character instead.",
              );
          }
          const status =
            selection.attendance !== "joining"
              ? selection.attendance
              : event.admission === "open"
                ? "registered"
                : event.admission === "approval"
                  ? "pending"
                  : seatAvailable(
                        seating,
                        selection.role,
                        event.capacity,
                        capsSchema.parse(event.roleCaps),
                      )
                    ? "accepted"
                    : "bench";
          const position =
            status === "accepted"
              ? firstAvailablePartyPosition(event.capacity, seating)
              : { partyIndex: null, slotIndex: null };
          const signup = await client.foreverRaidSignup.create({
            data: {
              eventId: id,
              memberId: account.id,
              characterId: character.id,
              character: snapshot,
              role: selection.role,
              status,
              ...position,
              reserves: [],
              policyChecksum: null,
              acknowledgedAt: null,
              createdAt:
                row.entryTime !== undefined &&
                row.entryTime * 1000 <= now.getTime()
                  ? new Date(row.entryTime * 1000)
                  : now,
              importSource: signupImportSourceSchema.parse({
                kind: "raid_helper",
                eventId: source.id,
                guildId: source.serverId,
                checksum,
                originalName: row.name,
                originalClass: row.className,
                originalSpec: row.specName ?? null,
                originalStatus: row.status,
                entryTime: row.entryTime ?? null,
                position: row.position ?? null,
                note: row.note ?? null,
              }),
            },
          });
          seating.push(signup);
          result.imported += 1;
          result.statuses[status] = (result.statuses[status] ?? 0) + 1;
        }
        await audit(client, id, member.id, "signups_imported", {
          requestKey: input.requestKey,
          requestHash,
          sourceChecksum: checksum,
          sourceEventId: source.id,
          sourceGuildId: source.serverId,
          sourceTitle: source.title,
          result,
          changedFields: ["signupImport"],
          before: { signupImport: 0 },
          after: { signupImport: result.imported },
        });
        return result;
      });
    },
    async signup(
      member: MemberIdentity,
      id: string,
      raw: unknown,
    ): Promise<void> {
      const input = signupSchema.parse(raw);
      await runTransaction(async (client) => {
        await assertMember(client, member);
        const event = await lockedEvent(client, id);
        authorize(event, member);
        requireOpen(event);
        if ((await clock(client)) >= event.signupClosesAt)
          throw new HttpError(409, "Signups have closed.");
        if (
          (event.policyRevision > 0 || input.policyChecksum !== undefined) &&
          input.policyChecksum !== eventPolicyChecksum(event)
        )
          throw new HttpError(
            409,
            "Event rules changed. Refresh and review them before confirming your signup.",
          );
        const character = await client.foreverCharacter.findFirst({
          where: { id: input.characterId, memberId: member.id },
        });
        if (!character) throw new HttpError(404, "Character not found.");
        const combatRoles =
          eventTypeDefinitions[z.enum(eventTypes).parse(event.eventType)]
            .combatRoles;
        if (
          combatRoles
            ? input.role === "participant"
            : input.role !== "participant"
        )
          throw new HttpError(
            400,
            combatRoles
              ? "Choose a combat role for this event."
              : "This event accepts participants without combat roles.",
          );
        if (combatRoles && !input.specialization)
          throw new HttpError(400, "Choose a specialization for this event.");
        const snapshot = storedCharacterSchema.parse({
          name: character.name,
          game: character.game,
          realm: character.realm,
          className: character.className,
          specialization: input.specialization,
          region: character.region,
          faction: character.faction,
          ruleset: character.ruleset,
        });
        if (!characterCanJoin(snapshot, event))
          throw new HttpError(
            400,
            "Character game, realm, region, faction and ruleset must match the event.",
          );
        const old = event.signups.find(
          (signup) => signup.memberId === member.id,
        );
        const sameSpecialization =
          old !== undefined &&
          storedCharacterSchema.parse(old.character).specialization ===
            snapshot.specialization;
        const policyChecksum = eventPolicyChecksum(event);
        const sameSignup =
          old !== undefined &&
          (input.attendance === "joining"
            ? participatingStatuses.some((status) => status === old.status)
            : old.status === input.attendance) &&
          old?.characterId === character.id &&
          sameSpecialization &&
          old.role === input.role;
        if (sameSignup && old.policyChecksum === policyChecksum) return;
        const available = seatAvailable(
          event.signups,
          input.role,
          event.capacity,
          capsSchema.parse(event.roleCaps),
          old?.id,
        );
        const status = sameSignup
          ? old.status
          : input.attendance !== "joining"
            ? input.attendance
            : event.admission === "open"
              ? "registered"
              : event.admission === "approval"
                ? "pending"
                : available
                  ? "accepted"
                  : "bench";
        const acknowledgement = {
          policyChecksum,
          acknowledgedAt: await clock(client),
        };
        // Character/spec changes require a new loot selection; role-only changes do not.
        const reserves =
          input.attendance === "joining" &&
          old?.characterId === character.id &&
          participatingStatuses.some((status) => status === old.status) &&
          sameSpecialization
            ? old.reserves
            : [];
        const limit = reserveQuota(
          {
            reserveLimit: event.reserveLimit,
            reserveLimits:
              event.reserveLimits === null
                ? null
                : reserveLimitsSchema.parse(event.reserveLimits),
          },
          input.role,
        );
        if (reserves.length > limit)
          throw new HttpError(
            400,
            `This role allows ${limit} soft reserves. Reduce your existing reserves before changing roles.`,
          );
        const position =
          status === "accepted"
            ? old?.status === "accepted" &&
              old.partyIndex !== null &&
              old.slotIndex !== null
              ? { partyIndex: old.partyIndex, slotIndex: old.slotIndex }
              : firstAvailablePartyPosition(
                  event.capacity,
                  event.signups,
                  old?.id,
                )
            : { partyIndex: null, slotIndex: null };
        await client.foreverRaidSignup.upsert({
          where: { eventId_memberId: { eventId: id, memberId: member.id } },
          create: {
            eventId: id,
            memberId: member.id,
            characterId: character.id,
            character: snapshot,
            role: input.role,
            status,
            ...position,
            reserves,
            ...acknowledgement,
          },
          update: {
            characterId: character.id,
            character: snapshot,
            role: input.role,
            status,
            ...position,
            reserves,
            ...acknowledgement,
          },
        });
        await audit(client, id, member.id, "signup", {
          role: input.role,
          status,
          previousStatus: old?.status ?? null,
          character: snapshot.name,
          className: snapshot.className,
          specialization: snapshot.specialization,
        });
      });
    },
    async withdraw(member: MemberIdentity, id: string): Promise<void> {
      await runTransaction(async (client) => {
        await assertMember(client, member);
        const event = await lockedEvent(client, id);
        authorize(event, member);
        requireOpen(event);
        const signup = event.signups.find((row) => row.memberId === member.id);
        if (!signup || signup.status === "withdrawn") return;
        await client.foreverRaidSignup.update({
          where: { id: signup.id },
          data: {
            status: "withdrawn",
            partyIndex: null,
            slotIndex: null,
            reserves: [],
          },
        });
        await audit(client, id, member.id, "withdrawn", {});
      });
    },
    async acknowledge(
      member: MemberIdentity,
      id: string,
      raw: unknown,
    ): Promise<void> {
      const input = policyAcknowledgementSchema.parse(raw);
      await runTransaction(async (client) => {
        await assertMember(client, member);
        const event = await lockedEvent(client, id);
        authorize(event, member);
        requireOpen(event);
        const signup = event.signups.find(
          (row) => row.memberId === member.id && row.status !== "withdrawn",
        );
        if (!signup)
          throw new HttpError(
            400,
            "Join the event before acknowledging its rules.",
          );
        const policyChecksum = eventPolicyChecksum(event);
        if (input.policyChecksum !== policyChecksum)
          throw new HttpError(
            409,
            "Event rules changed again. Refresh and review them before acknowledging.",
          );
        if (signup.policyChecksum === policyChecksum) return;
        await client.foreverRaidSignup.update({
          where: { id: signup.id },
          data: { policyChecksum, acknowledgedAt: await clock(client) },
        });
        await audit(client, id, member.id, "policy_acknowledged", {
          policyChecksum,
        });
      });
    },
    async reserves(
      member: MemberIdentity,
      id: string,
      raw: unknown,
    ): Promise<void> {
      const { itemIds } = reservesSchema.parse(raw);
      await runTransaction(async (client) => {
        await assertMember(client, member);
        const event = await lockedEvent(client, id);
        authorize(event, member);
        requireOpen(event);
        if ((await clock(client)) >= event.reservesCloseAt)
          throw new HttpError(409, "Soft reserves have closed.");
        const signup = event.signups.find(
          (row) => row.memberId === member.id && row.status !== "withdrawn",
        );
        if (!signup)
          throw new HttpError(400, "Join the roster before reserving items.");
        if (!participatingStatuses.some((status) => status === signup.status))
          throw new HttpError(
            409,
            "Change your response to Joining before selecting soft reserves.",
          );
        if (signup.policyChecksum !== eventPolicyChecksum(event))
          throw new HttpError(
            409,
            "Event rules changed. Review and acknowledge them before saving reserves.",
          );
        if (!event.catalog || !event.reserveLimit)
          throw new HttpError(
            400,
            "Soft reserves are disabled for this event.",
          );
        const limit = reserveQuota(
          {
            reserveLimit: event.reserveLimit,
            reserveLimits:
              event.reserveLimits === null
                ? null
                : reserveLimitsSchema.parse(event.reserveLimits),
          },
          z.enum(signupRoles).parse(signup.role),
        );
        if (
          itemIds.length > limit ||
          (!event.allowDuplicates && new Set(itemIds).size !== itemIds.length)
        )
          throw new HttpError(
            400,
            "Reserve quota or duplicate-item rule exceeded.",
          );
        const character = storedCharacterSchema.parse(signup.character);
        if (!character.specialization)
          throw new HttpError(
            409,
            "Choose a specialization in your signup before selecting reserves.",
          );
        const items = catalogItems(event.catalog.bundle);
        for (const itemId of itemIds) {
          const item = items.find((candidate) => candidate.itemId === itemId);
          if (
            !item ||
            !item.classes.includes(character.className) ||
            event.hardReserves.includes(itemId)
          )
            throw new HttpError(
              400,
              "An item is unavailable, hard-reserved or ineligible for your class.",
            );
        }
        const sorted = [...itemIds].sort((a, b) => a - b);
        if (JSON.stringify(sorted) === JSON.stringify(signup.reserves)) return;
        await client.foreverRaidSignup.update({
          where: { id: signup.id },
          data: { reserves: sorted },
        });
        await audit(client, id, member.id, "reserves_updated", {
          count: sorted.length,
        });
      });
    },
    async manage(
      member: MemberIdentity,
      id: string,
      raw: unknown,
    ): Promise<void> {
      const input = eventActionSchema.parse(raw);
      await runTransaction(async (client) => {
        await assertMember(client, member);
        const event = await lockedEvent(client, id);
        authorize(event, member, true);
        if (input.action === "lock" && event.status === "locked") return;
        if (event.version !== input.version)
          throw new HttpError(
            409,
            "The roster changed. Refresh and review it again.",
          );
        if (input.action === "cancel") {
          if (event.status === "cancelled") return;
          await client.foreverRaidEvent.update({
            where: { id },
            data: { status: "cancelled" },
          });
          await audit(client, id, member.id, "cancelled", {
            reason: input.reason,
          });
          return;
        }
        requireOpen(event);
        if (input.action === "edit") {
          const settings = input.settings;
          const times = validateEvent(settings, await clock(client), event);
          const catalog = settings.catalogId
            ? await client.foreverRaidCatalog.findUnique({
                where: { id: settings.catalogId },
              })
            : null;
          if (
            settings.catalogId &&
            (!catalog ||
              catalog.status !== "published" ||
              catalogBundleSchema.parse(catalog.bundle).game !==
                settings.game ||
              catalog.raidName !== settings.raidName)
          )
            throw new HttpError(
              400,
              "Choose a published catalog matching this raid and game edition.",
            );
          const items = catalog ? catalogItems(catalog.bundle) : [];
          if (
            settings.hardReserves.some(
              (itemId) => !items.some((item) => item.itemId === itemId),
            )
          )
            throw new HttpError(400, "Hard reserve is not in this catalog.");
          const signups = event.signups.filter(
            (row) => row.status !== "withdrawn",
          );
          const accepted = signups.filter((row) => row.status === "accepted");
          if (
            accepted.length > settings.capacity ||
            roles.some(
              (role) =>
                accepted.filter((row) => row.role === role).length >
                settings.roleCaps[role],
            )
          )
            throw new HttpError(
              409,
              "Capacity and role limits cannot be lower than the confirmed roster. Move players to the bench first.",
            );
          for (const signup of signups) {
            const character = storedCharacterSchema.parse(signup.character);
            if (!characterCanJoin(character, settings))
              throw new HttpError(
                409,
                "Existing signups do not match the new game, realm, region, faction or ruleset. Those players must withdraw before changing these settings.",
              );
            if (
              eventTypeDefinitions[settings.eventType].combatRoles
                ? signup.role === "participant"
                : signup.role !== "participant"
            )
              throw new HttpError(
                409,
                "Existing signup roles do not match this event type. Those players must withdraw before changing the type.",
              );
            const role = z.enum(signupRoles).parse(signup.role);
            if (signup.reserves.length > reserveQuota(settings, role))
              throw new HttpError(
                409,
                "An existing signup exceeds the new SR allowance. Ask the player to reduce their reserves first.",
              );
            if (
              !settings.allowDuplicates &&
              new Set(signup.reserves).size !== signup.reserves.length
            )
              throw new HttpError(
                409,
                "Existing reserves contain duplicates. Ask those players to update their reserves before disabling duplicates.",
              );
            for (const itemId of signup.reserves) {
              const item = items.find((entry) => entry.itemId === itemId);
              if (
                !item ||
                !item.classes.includes(character.className) ||
                settings.hardReserves.includes(itemId)
              )
                throw new HttpError(
                  409,
                  "An existing soft reserve conflicts with the new loot catalog or hard reserves. Ask the player to change that reserve first.",
                );
            }
          }
          const fields = {
            title: settings.title,
            game: settings.game,
            realm: settings.realm,
            eventType: settings.eventType,
            raidName: settings.raidName,
            region: settings.region,
            faction: settings.faction,
            ruleset: settings.ruleset,
            description: settings.description,
            capacity: settings.capacity,
            roleCaps: settings.roleCaps,
            admission: settings.admission,
            catalogId: settings.catalogId,
            reserveLimit: settings.reserveLimit,
            reserveLimits: settings.reserveLimits,
            allowDuplicates: settings.allowDuplicates,
            hardReserves: settings.hardReserves,
            compositionRevision: compositionRevisions[settings.game],
          };
          const data = { ...fields, ...times };
          const changes = Object.keys(data).filter((field) => {
            const key = field as keyof typeof data;
            const before = event[key];
            const after = data[key];
            return (
              jsonChecksum(
                before instanceof Date ? before.toISOString() : before,
              ) !==
              jsonChecksum(after instanceof Date ? after.toISOString() : after)
            );
          });
          if (!changes.length) return;
          await client.foreverRaidEvent.update({
            where: { id },
            data: {
              ...data,
              reserveLimits: fields.reserveLimits ?? Prisma.DbNull,
            },
          });
          const resetLayout = settings.capacity !== event.capacity;
          if (resetLayout)
            await client.foreverRaidSignup.updateMany({
              where: { eventId: id },
              data: { partyIndex: null, slotIndex: null },
            });
          // Keep selected and benched players; only the unselected pool follows the new admission mode.
          const seating = signups.map((row) => ({
            id: row.id,
            role: row.role,
            status: row.status,
            partyIndex: resetLayout ? null : row.partyIndex,
            slotIndex: resetLayout ? null : row.slotIndex,
          }));
          for (const signup of signups.filter((row) =>
            ["pending", "registered"].includes(row.status),
          )) {
            if (settings.admission === event.admission) break;
            const status =
              settings.admission === "open"
                ? "registered"
                : settings.admission === "approval"
                  ? "pending"
                  : seatAvailable(
                        seating,
                        z.enum(signupRoles).parse(signup.role),
                        settings.capacity,
                        settings.roleCaps,
                      )
                    ? "accepted"
                    : "bench";
            const position =
              status === "accepted"
                ? firstAvailablePartyPosition(
                    settings.capacity,
                    seating,
                    signup.id,
                  )
                : { partyIndex: null, slotIndex: null };
            await client.foreverRaidSignup.update({
              where: { id: signup.id },
              data: { status, ...position },
            });
            Object.assign(
              seating.find((row) => row.id === signup.id)!,
              {
                status,
                ...position,
              },
            );
          }
          await audit(client, id, member.id, "settings_updated", {
            changedFields: changes,
            lootNames: {
              before: event.hardReserves.map((itemId) =>
                event.catalog
                  ? (catalogItems(event.catalog.bundle).find(
                      (item) => item.itemId === itemId,
                    )?.name ?? `Item ${itemId}`)
                  : `Item ${itemId}`,
              ),
              after: settings.hardReserves.map(
                (itemId) => items.find((item) => item.itemId === itemId)!.name,
              ),
            },
            catalogs: {
              before: event.catalog?.raidName ?? null,
              after: catalog?.raidName ?? null,
            },
            before: Object.fromEntries(
              changes.map((field) => [
                field,
                event[field as keyof typeof data] instanceof Date
                  ? (event[field as keyof typeof data] as Date).toISOString()
                  : event[field as keyof typeof data],
              ]),
            ) as Prisma.InputJsonObject,
            after: Object.fromEntries(
              changes.map((field) => [
                field,
                data[field as keyof typeof data] instanceof Date
                  ? (data[field as keyof typeof data] as Date).toISOString()
                  : data[field as keyof typeof data],
              ]),
            ) as Prisma.InputJsonObject,
          });
          return;
        }
        if (input.action === "admit") {
          if ((await clock(client)) >= event.signupClosesAt)
            throw new HttpError(409, "Roster changes have closed.");
          const signup = event.signups.find(
            (row) => row.id === input.signupId && row.status !== "withdrawn",
          );
          if (!signup) throw new HttpError(404, "Signup not found.");
          if (!participatingStatuses.some((status) => status === signup.status))
            throw new HttpError(
              409,
              "This player must choose Joining before being added to the roster or bench.",
            );
          if (signup.status === input.status) return;
          const role = z.enum(signupRoles).parse(signup.role);
          if (
            input.status === "accepted" &&
            !seatAvailable(
              event.signups,
              role,
              event.capacity,
              capsSchema.parse(event.roleCaps),
              signup.id,
            )
          )
            throw new HttpError(409, "No seat is available for this role.");
          await client.foreverRaidSignup.update({
            where: { id: signup.id },
            data:
              input.status === "accepted"
                ? {
                    status: input.status,
                    ...firstAvailablePartyPosition(
                      event.capacity,
                      event.signups,
                      signup.id,
                      input.partyIndex,
                    ),
                  }
                : {
                    status: input.status,
                    partyIndex: null,
                    slotIndex: null,
                  },
          });
          await audit(client, id, member.id, "admission_changed", {
            signupId: signup.id,
            status: input.status,
          });
          return;
        }
        if (input.action === "set_roster_layout") {
          const accepted = event.signups.filter(
            (signup) => signup.status === "accepted",
          );
          const acceptedIds = new Set(accepted.map((signup) => signup.id));
          const submittedIds = new Set(
            input.assignments.map((assignment) => assignment.signupId),
          );
          if (
            input.assignments.length !== accepted.length ||
            submittedIds.size !== input.assignments.length ||
            [...acceptedIds].some((signupId) => !submittedIds.has(signupId))
          )
            throw new HttpError(
              409,
              "The confirmed roster changed. Refresh before arranging parties.",
            );
          const occupied = new Set<string>();
          for (const assignment of input.assignments) {
            if (
              assignment.partyIndex >= raidPartyCount(event.capacity) ||
              assignment.partyIndex * RAID_PARTY_SIZE + assignment.slotIndex >=
                event.capacity
            )
              throw new HttpError(
                400,
                "Roster position is outside event capacity.",
              );
            const key = `${assignment.partyIndex}:${assignment.slotIndex}`;
            if (occupied.has(key))
              throw new HttpError(
                400,
                "Two players cannot occupy one roster position.",
              );
            occupied.add(key);
          }
          await client.foreverRaidSignup.updateMany({
            where: { eventId: id, status: "accepted" },
            data: { partyIndex: null, slotIndex: null },
          });
          for (const assignment of input.assignments)
            await client.foreverRaidSignup.update({
              where: { id: assignment.signupId },
              data: {
                partyIndex: assignment.partyIndex,
                slotIndex: assignment.slotIndex,
              },
            });
          await audit(client, id, member.id, "roster_layout_changed", {
            assignments: input.assignments,
            compositionRevision: event.compositionRevision,
          });
          return;
        }
        const lockedAt = await clock(client);
        const policyChecksum = eventPolicyChecksum(event);
        if (
          event.signups.some(
            (row) =>
              row.status === "accepted" &&
              (row.policyChecksum !== policyChecksum ||
                row.acknowledgedAt === null),
          )
        )
          throw new HttpError(
            409,
            "An accepted player must acknowledge the current loot policy before locking.",
          );
        if (
          eventTypeDefinitions[z.enum(eventTypes).parse(event.eventType)]
            .combatRoles &&
          event.signups.some(
            (row) =>
              row.status === "accepted" &&
              !storedCharacterSchema.parse(row.character).specialization,
          )
        )
          throw new HttpError(
            409,
            "Accepted players must select a specialization in their signup before locking.",
          );
        const positions = normalizedPartyPositions(
          event.capacity,
          event.signups,
        );
        const payload = {
          schema:
            event.eventType === "raid"
              ? `${event.game}-raid-loot.v2`
              : `${event.game}-event-roster.v2`,
          game: event.game,
          ...(event.game === "tbc" ? { realm: event.realm } : {}),
          eventId: id,
          title: event.title,
          eventType: event.eventType,
          raidName: event.raidName,
          lockedAt: lockedAt.toISOString(),
          eventVersion: event.version,
          startsAt: event.startsAt.toISOString(),
          region: event.region,
          faction: event.faction,
          ruleset: event.ruleset,
          compositionRevision: event.compositionRevision,
          catalog: event.catalog
            ? {
                id: event.catalog.id,
                checksum: event.catalog.checksum,
                bundle: event.catalog.bundle,
              }
            : null,
          policy: {
            reserveLimit: event.reserveLimit,
            ...(event.reserveLimits === null
              ? {}
              : {
                  reserveLimits: reserveLimitsSchema.parse(event.reserveLimits),
                }),
            allowDuplicates: event.allowDuplicates,
            hardReserves: event.hardReserves,
          },
          roster: event.signups
            .filter((row) => row.status === "accepted")
            .map((row) => ({
              signupId: row.id,
              character: row.character,
              role: row.role,
              ...positions.get(row.id),
              reserves: row.reserves,
              policyChecksum: row.policyChecksum,
              acknowledgedAt: row.acknowledgedAt?.toISOString() ?? null,
            })),
        };
        const checksum = jsonChecksum(payload);
        await client.foreverRaidLootSnapshot.create({
          data: { eventId: id, payload, checksum },
        });
        await client.foreverRaidEvent.update({
          where: { id },
          data: { status: "locked" },
        });
        await audit(client, id, member.id, "locked", {
          checksum,
          accepted: payload.roster.length,
        });
      });
    },
    async export(
      member: MemberIdentity,
      id: string,
    ): Promise<{ payload: Prisma.JsonValue; checksum: string }> {
      await assertMember(connection, member);
      const event = await connection.foreverRaidEvent.findUnique({
        where: { id },
        include: includeEvent,
      });
      if (!event) throw new HttpError(404, "Event not found.");
      authorize(event, member, true);
      if (!event.snapshot)
        throw new HttpError(409, "Lock the roster before exporting.");
      return {
        payload: event.snapshot.payload,
        checksum: event.snapshot.checksum,
      };
    },
  };
}
export const raids = raidService();
export async function serverRaidTime(): Promise<number> {
  return (await clock(db)).getTime();
}
