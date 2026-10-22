import "../scripts/env";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { Pool } from "pg";
import { Prisma, PrismaClient } from "@prisma/client";
import { communityOutcomes } from "../lib/community-outcomes";
import { PrismaPg } from "@prisma/adapter-pg";
import { raidService } from "../lib/raids/service";
import { stageCatalog, reviewCatalog } from "../lib/raids/catalog-store";
import { jsonChecksum } from "../lib/raids/json";
import { raidInteraction } from "../lib/raids/interactions";
import type {
  CharacterView,
  EventInput,
  MemberIdentity,
} from "../lib/raids/contracts";
import { eventSchema } from "../lib/raids/contracts";
import { eventTypes, eventTypeDefinitions } from "../lib/raids/event-types";
import {
  raidCatalogFixture,
  tbcRaidCatalogFixture,
} from "./fixtures/raid-catalog";
import { approveRaidInteraction } from "../lib/raids/approval";
import {
  deliverRaidPosts,
  RaidDiscordError,
  type RaidDiscordRequest,
} from "../lib/raids/discord-delivery";
import {
  raidDiscordSettings,
  raidDiscordDestination,
  raidDestinationForPost,
  type RaidDiscordSettings,
} from "../lib/raids/discord-settings";
import { approvedRaidEvents } from "../lib/raids/directory";
import {
  findPublicEvent,
  publicEventSitemap,
} from "../lib/raids/public-events";
import { requestRaidRepost } from "../lib/raids/repost";
import { z } from "zod";

async function pollRaidPosts(
  database: PrismaClient,
  settings: RaidDiscordSettings,
  request: RaidDiscordRequest,
): Promise<number> {
  // Each fixture call represents a due worker poll, independent of timestamp rounding.
  await database.foreverRaidDiscordPost.updateMany({
    where: {
      guildId: settings.guildId,
      channelId: settings.channelId,
      origin: settings.origin,
    },
    data: { nextAttemptAt: new Date(0) },
  });
  return deliverRaidPosts(database, settings, request);
}

test("Private pilot PostgreSQL: concurrency, authorization, reserves and immutable exports", async (context) => {
  const url = new URL(process.env.DATABASE_URL || "postgresql://invalid");
  if (
    !["127.0.0.1", "localhost"].includes(url.hostname) ||
    url.port !== "55432"
  )
    throw new Error(
      "Raid integration tests require the isolated local PostgreSQL instance.",
    );
  const schema = `raid_test_${randomUUID().replaceAll("-", "")}`;
  const admin = new Pool({ connectionString: url.toString(), max: 1 });
  await admin.query(`CREATE SCHEMA "${schema}"`);
  const pool = new Pool({
    connectionString: url.toString(),
    options: `-c search_path=${schema}`,
    max: 8,
  });
  const database = new PrismaClient({
    adapter: new PrismaPg(pool, { schema }),
  });
  const oldEnabled = process.env.FOREVER_RAIDS_ENABLED,
    oldIds = process.env.FOREVER_RAIDS_PILOT_DISCORD_IDS,
    oldDiscordEnabled = process.env.FOREVER_RAIDS_DISCORD_ENABLED;
  const ids = [
    "1556000000000000001",
    "1556000000000000002",
    "1556000000000000003",
    "1556000000000000004",
  ];
  process.env.FOREVER_RAIDS_ENABLED = "true";
  process.env.FOREVER_RAIDS_DISCORD_ENABLED = "false";
  process.env.FOREVER_RAIDS_PILOT_DISCORD_IDS = ids.join(",");
  try {
    await pool.query(
      await readFile("prisma/migrations/001_initial.sql", "utf8"),
    );
    await pool.query(
      await readFile("prisma/migrations/014_forever_raids.sql", "utf8"),
    );
    await pool.query(
      await readFile("prisma/migrations/015_forever_raid_requests.sql", "utf8"),
    );
    await pool.query(
      await readFile(
        "prisma/migrations/016_forever_raid_interactions.sql",
        "utf8",
      ),
    );
    await pool.query(
      await readFile(
        "prisma/migrations/017_forever_raid_acknowledgement.sql",
        "utf8",
      ),
    );
    await pool.query(
      await readFile(
        "prisma/migrations/018_forever_catalog_contract.sql",
        "utf8",
      ),
    );
    await pool.query(
      await readFile(
        "prisma/migrations/019_forever_character_specialization.sql",
        "utf8",
      ),
    );
    await pool.query(
      await readFile("prisma/migrations/020_forever_event_types.sql", "utf8"),
    );
    await pool.query(
      await readFile(
        "prisma/migrations/021_forever_questing_event.sql",
        "utf8",
      ),
    );
    await pool.query(
      await readFile("prisma/migrations/022_forever_raid_discord.sql", "utf8"),
    );
    await pool.query(
      await readFile("prisma/migrations/023_raid_game_editions.sql", "utf8"),
    );
    await pool.query(
      await readFile(
        "prisma/migrations/024_raid_feedback_channels.sql",
        "utf8",
      ),
    );
    const service = raidService(database),
      roleMigrations = [
        "026_raid_role_reserves",
        "027_tbc_catalog_provenance",
        "028_raid_open_signup",
        "029_raid_event_editing",
        "030_raid_audience_revocation",
        "031_raid_repost",
        "032_raid_party_rosters",
        "035_raid_attendance",
        "036_raid_signup_import",
      ],
      members: MemberIdentity[] = [];
    for (const migration of roleMigrations)
      await pool.query(
        await readFile(`prisma/migrations/${migration}.sql`, "utf8"),
      );
    for (const discordId of ids)
      members.push(
        await database.foreverMember.create({
          data: { discordId, displayName: "Synthetic test member" },
        }),
      );
    const characters: CharacterView[] = [];
    for (const [index, member] of members.entries())
      characters.push(
        await service.addCharacter(member, {
          name: ["  Dimitar   Jilanovw  ", "Two", "Three", "Native Character"][
            index
          ],
          className: "Warrior",
          specialization: "Fury",
          region: "EU",
          faction: "Alliance",
          ruleset: "PvP",
        }),
      );
    assert.equal(characters[0].name, "Dimitar Jilanovw");
    assert.equal(
      (await service.characters(members[0]))[0].name,
      "Dimitar Jilanovw",
    );
    const catalogId = await stageCatalog(
      raidCatalogFixture,
      "local-test",
      database,
    );
    assert.equal(
      await stageCatalog(raidCatalogFixture, "local-test", database),
      catalogId,
    );
    await reviewCatalog(
      catalogId,
      "local-test",
      "published",
      "Synthetic fixture, isolated database only",
      database,
    );
    assert.equal(
      await stageCatalog(raidCatalogFixture, "local-test", database),
      catalogId,
    );
    const input: EventInput = {
      requestKey: randomUUID(),
      game: "forever",
      realm: "",
      discordChannelId: null,
      confirmDiscordPublication: false,
      eventType: "raid",
      title: "Synthetic raid",
      raidName: raidCatalogFixture.raidName,
      region: "EU",
      faction: "Alliance",
      ruleset: "PvP",
      localStart: "2035-11-05T19:00",
      durationMinutes: 180,
      signupMinutesBefore: 15,
      reserveMinutesBefore: 60,
      capacity: 1,
      roleCaps: { tank: 1, healer: 1, damage: 1 },
      admission: "automatic",
      description: "Private test",
      catalogId,
      reserveLimit: 2,
      reserveLimits: null,
      allowDuplicates: false,
      hardReserves: [900002],
    };
    const [eventId, retryId] = await Promise.all([
      service.create(members[0], input),
      service.create(members[0], input),
    ]);
    assert.equal(eventId, retryId);
    const {
      eventType: _legacyType,
      game: _game,
      realm: _realm,
      discordChannelId: _channel,
      confirmDiscordPublication: _confirmation,
      ...legacyInput
    } = eventSchema.parse(input);
    assert.equal(_legacyType, "raid");
    assert.equal(_game, "forever");
    assert.equal(_realm, "");
    assert.equal(_channel, null);
    assert.equal(_confirmation, false);
    assert.equal(
      (
        await database.foreverRaidEvent.findUniqueOrThrow({
          where: { id: eventId },
        })
      ).requestHash,
      createHash("sha256").update(JSON.stringify(legacyInput)).digest("hex"),
    );
    assert.equal(await service.create(members[0], legacyInput), eventId);
    await assert.rejects(
      service.create(members[0], { ...input, title: "Changed submission" }),
      /different event/,
    );
    await context.test(
      "TBC loot, characters and immutable exports cannot mix editions or realms",
      async () => {
        const tbcCatalogId = await stageCatalog(
          tbcRaidCatalogFixture,
          "local-test",
          database,
        );
        await reviewCatalog(
          tbcCatalogId,
          "local-test",
          "published",
          "Synthetic TBC fixture only",
          database,
        );
        const tbc = await service.addCharacter(members[1], {
          name: "Two",
          className: "Warrior",
          specialization: "Fury",
          game: "tbc",
          realm: "Spineshatter",
          region: "EU",
          faction: "Alliance",
          ruleset: "PvP",
        });
        const { id: _tbcId, ...tbcCharacter } = tbc;
        assert.ok(_tbcId);
        const differentRealm = await service.addCharacter(members[1], {
          ...tbcCharacter,
          realm: "other realm",
        });
        const tbcInput = {
          ...input,
          requestKey: randomUUID(),
          game: "tbc",
          realm: "spineshatter",
          raidName: tbcRaidCatalogFixture.raidName,
          catalogId: tbcCatalogId,
        };
        const tbcEventId = await service.create(members[0], tbcInput);
        assert.equal(await service.create(members[0], tbcInput), tbcEventId);
        await assert.rejects(
          service.create(members[0], {
            ...tbcInput,
            game: "forever",
            realm: "",
          }),
          /different event/,
        );
        await assert.rejects(
          service.create(members[0], {
            ...tbcInput,
            requestKey: randomUUID(),
            catalogId,
          }),
          /matching this raid and game edition/,
        );
        await assert.rejects(
          service.create(members[0], {
            ...input,
            requestKey: randomUUID(),
            catalogId: tbcCatalogId,
          }),
          /matching this raid and game edition/,
        );
        for (const characterId of [characters[1].id, differentRealm.id])
          await assert.rejects(
            service.signup(members[1], tbcEventId, {
              acknowledge: true,
              characterId,
              specialization: "Fury",
              role: "damage",
            }),
            /game, realm/,
          );
        await service.signup(members[1], tbcEventId, {
          acknowledge: true,
          characterId: tbc.id,
          specialization: "Fury",
          role: "damage",
        });
        await service.reserves(members[1], tbcEventId, { itemIds: [900001] });
        const event = await service.get(members[0], tbcEventId);
        assert.equal(event.game, "tbc");
        assert.equal(event.signups[0].character.realm, "spineshatter");
        await assert.rejects(
          database.foreverRaidEvent.update({
            where: { id: tbcEventId },
            data: { game: "forever", realm: "" },
          }),
        );
        await assert.rejects(
          database.foreverRaidEvent.update({
            where: { id: tbcEventId },
            data: { catalogId },
          }),
        );
        await service.manage(members[0], tbcEventId, {
          action: "lock",
          version: event.version,
        });
        const exported = await service.export(members[0], tbcEventId);
        const payload = z
          .object({
            schema: z.literal("tbc-raid-loot.v2"),
            game: z.literal("tbc"),
            realm: z.literal("spineshatter"),
            compositionRevision: z.string().min(1),
            roster: z.array(
              z.object({
                partyIndex: z.number().int().nonnegative(),
                slotIndex: z.number().int().min(0).max(4),
              }),
            ),
          })
          .parse(exported.payload);
        assert.equal(payload.game, "tbc");
        assert.equal(jsonChecksum(exported.payload), exported.checksum);
        assert.deepEqual(
          await service.export(members[0], tbcEventId),
          exported,
        );
      },
    );
    await context.test(
      "All event types persist; participant capacity, combat validation and pinned exports stay consistent",
      async () => {
        for (const eventType of eventTypes) {
          const definition = eventTypeDefinitions[eventType];
          const typeId = await service.create(members[0], {
            ...input,
            requestKey: randomUUID(),
            eventType,
            title: `Synthetic ${eventType}`,
            raidName: `Synthetic ${eventType} activity`,
            capacity: 1,
            roleCaps: definition.combatRoles
              ? { tank: 1, healer: 1, damage: 1 }
              : definition.roleCaps,
            catalogId: null,
            reserveLimit: 0,
            hardReserves: [],
          });
          assert.equal(
            (await service.get(members[0], typeId)).eventType,
            eventType,
          );
          assert.equal(
            (await service.list(members[0])).find((row) => row.id === typeId)
              ?.eventType,
            eventType,
          );
          const signup = {
            acknowledge: true,
            characterId: characters[0].id,
            specialization: definition.combatRoles ? "Fury" : null,
            role: definition.combatRoles ? "damage" : "participant",
          };
          await assert.rejects(
            service.signup(members[0], typeId, {
              ...signup,
              role: definition.combatRoles ? "participant" : "tank",
            }),
            /combat role|without combat roles/,
          );
          if (definition.combatRoles)
            await assert.rejects(
              service.signup(members[0], typeId, {
                ...signup,
                specialization: null,
              }),
              /Choose a specialization/,
            );
          await Promise.all([
            service.signup(members[0], typeId, signup),
            service.signup(members[1], typeId, {
              ...signup,
              characterId: characters[1].id,
            }),
          ]);
          const event = await service.get(members[0], typeId);
          assert.equal(
            event.signups.filter((row) => row.status === "accepted").length,
            1,
          );
          assert.equal(
            event.signups.filter((row) => row.status === "bench").length,
            1,
          );
          await assert.rejects(
            database.foreverRaidEvent.update({
              where: { id: typeId },
              data: { eventType: "invalid" },
            }),
          );
          if (eventType !== "raid") {
            await assert.rejects(
              database.foreverRaidEvent.update({
                where: { id: typeId },
                data: { catalogId },
              }),
            );
            await assert.rejects(
              service.create(members[0], {
                ...input,
                eventType,
                requestKey: randomUUID(),
              }),
              /only for raid events/,
            );
          }
          await service.manage(members[0], typeId, {
            action: "lock",
            version: event.version,
          });
          const exported = await service.export(members[0], typeId);
          assert.equal(jsonChecksum(exported.payload), exported.checksum);
          assert.ok(
            exported.payload &&
              typeof exported.payload === "object" &&
              !Array.isArray(exported.payload),
          );
          assert.equal(exported.payload.eventType, eventType);
          assert.equal(
            exported.payload.schema,
            eventType === "raid"
              ? "forever-raid-loot.v2"
              : "forever-event-roster.v2",
          );
          await assert.rejects(
            service.signup(members[0], typeId, signup),
            /locked/,
          );
          assert.deepEqual(await service.export(members[0], typeId), exported);
        }
      },
    );
    await context.test(
      "organizer party layouts are atomic, versioned and pinned into v2 snapshots",
      async () => {
        const partyEventId = await service.create(members[0], {
          ...input,
          requestKey: randomUUID(),
          title: "Party layout test",
          capacity: 4,
          roleCaps: { tank: 0, healer: 0, damage: 4 },
          catalogId: null,
          reserveLimit: 0,
          hardReserves: [],
        });
        for (let index = 0; index < members.length; index += 1)
          await service.signup(members[index], partyEventId, {
            acknowledge: true,
            characterId: characters[index].id,
            specialization: "Fury",
            role: "damage",
          });
        const before = await service.get(members[0], partyEventId);
        const accepted = before.signups.filter(
          (signup) => signup.status === "accepted",
        );
        assert.equal(accepted.length, 4);
        const assignments = [...accepted]
          .reverse()
          .map((signup, slotIndex) => ({
            signupId: signup.id,
            partyIndex: 0,
            slotIndex,
          }));
        await assert.rejects(
          service.manage(members[0], partyEventId, {
            action: "set_roster_layout",
            version: before.version,
            assignments: assignments.map((assignment) => ({
              ...assignment,
              slotIndex: 0,
            })),
          }),
          /cannot occupy one roster position/,
        );
        await service.manage(members[0], partyEventId, {
          action: "set_roster_layout",
          version: before.version,
          assignments,
        });
        const arranged = await service.get(members[0], partyEventId);
        assert.deepEqual(
          [...arranged.signups]
            .filter((signup) => signup.status === "accepted")
            .sort(
              (left, right) => (left.slotIndex ?? 0) - (right.slotIndex ?? 0),
            )
            .map((signup) => signup.id),
          assignments.map((assignment) => assignment.signupId),
        );
        await assert.rejects(
          service.manage(members[0], partyEventId, {
            action: "set_roster_layout",
            version: before.version,
            assignments,
          }),
          /roster changed/,
        );
        await service.manage(members[0], partyEventId, {
          action: "lock",
          version: arranged.version,
        });
        const exported = await service.export(members[0], partyEventId);
        const payload = z
          .object({
            schema: z.literal("forever-raid-loot.v2"),
            compositionRevision: z.literal("forever-preview-2026.09.15"),
            roster: z.array(
              z.object({
                signupId: z.string(),
                partyIndex: z.literal(0),
                slotIndex: z.number().int().min(0).max(3),
              }),
            ),
          })
          .parse(exported.payload);
        assert.equal(payload.roster.length, 4);
      },
    );
    await context.test(
      "Discord delivery, uncertain recovery and administrator-only publication share one event",
      async () => {
        const values: Record<string, string> = {
          FOREVER_RAIDS_DISCORD_ENABLED: "true",
          FOREVER_RAIDS_DISCORD_CHANNEL_ID: "1556000000000000011",
          FOREVER_RAIDS_DISCORD_DESTINATIONS: "[]",
          FOREVER_RAIDS_PUBLIC_ORIGIN: "http://127.0.0.1:19300",
          DISCORD_GUILD_ID: "1554316932948172940",
          DISCORD_APPLICATION_ID: "1554796912673169428",
          DISCORD_BOT_TOKEN: "synthetic-discord-delivery-token",
        };
        const previous = new Map(
          Object.keys(values).map((key) => [key, process.env[key]]),
        );
        Object.assign(process.env, values);
        const originalFetch = globalThis.fetch;
        globalThis.fetch = async (url, init): Promise<Response> => {
          const request = new Request(url, init);
          assert.equal(request.method, "GET");
          const route = new URL(request.url).pathname.replace(
            /^\/api\/v10/,
            "",
          );
          if (route === `/guilds/${values.DISCORD_GUILD_ID}`)
            return Response.json({
              id: values.DISCORD_GUILD_ID,
              name: "Forever fixture",
              owner_id: ids[0],
            });
          if (route === `/guilds/${values.DISCORD_GUILD_ID}/members/${ids[0]}`)
            return Response.json({
              user: { id: ids[0], bot: false },
              roles: [],
            });
          throw new Error(
            "Unexpected administrator lookup in isolated delivery fixture",
          );
        };
        try {
          const initialSettings = raidDiscordSettings();
          assert.ok(initialSettings);
          let settings: RaidDiscordSettings = initialSettings;
          const messages = new Map<string, object>();
          let posts = 0,
            patches = 0,
            loseResponse = false,
            loseRetirementResponse = false;
          const request: RaidDiscordRequest = async (
            route,
            method = "GET",
            body,
          ): Promise<unknown> => {
            if (route === "/users/@me")
              return { id: settings.applicationId, bot: true };
            if (route === `/channels/${settings.channelId}`)
              return {
                id: settings.channelId,
                guild_id: settings.guildId,
                type: 0,
                permission_overwrites: [
                  { id: settings.guildId, type: 0, allow: "0", deny: "1024" },
                ],
              };
            if (route.startsWith(`/guilds/${settings.guildId}/members/`))
              return { user: { id: route.split("/").pop(), bot: false } };
            if (route.endsWith("?limit=100")) return [...messages.values()];
            if (method === "POST") {
              const id = String(1556000000000000100n + BigInt(posts++));
              const message = {
                ...z.record(z.string(), z.unknown()).parse(body),
                id,
                channel_id: settings.channelId,
                author: { id: settings.applicationId, bot: true },
              };
              messages.set(id, message);
              if (loseResponse) {
                loseResponse = false;
                throw new Error("Synthetic response lost after Discord commit");
              }
              return message;
            }
            const id = route.split("/").pop()!;
            const current = messages.get(id);
            if (!current) throw new RaidDiscordError(404);
            if (method === "PATCH") {
              patches++;
              const updated = {
                ...current,
                ...z.record(z.string(), z.unknown()).parse(body),
              };
              messages.set(id, updated);
              if (
                loseRetirementResponse &&
                z.record(z.string(), z.unknown()).parse(body).content
              ) {
                loseRetirementResponse = false;
                throw new Error(
                  "Synthetic retirement response lost after Discord commit",
                );
              }
              return updated;
            }
            return current;
          };
          const eventId = await service.create(members[0], {
            ...input,
            requestKey: randomUUID(),
            eventType: "questing",
            title: "Synthetic Discord questing",
            catalogId: null,
            reserveLimit: 0,
            hardReserves: [],
          });
          assert.equal(
            (
              await database.foreverRaidDiscordPost.findUniqueOrThrow({
                where: { eventId },
              })
            ).status,
            "pending",
          );
          assert.equal((await approvedRaidEvents({}, database)).length, 0);
          await Promise.all([
            pollRaidPosts(database, settings, request),
            pollRaidPosts(database, settings, request),
          ]);
          assert.equal(posts, 1);
          await service.signup(members[0], eventId, {
            acknowledge: true,
            characterId: characters[0].id,
            specialization: "Fury",
            role: "damage",
          });
          await pollRaidPosts(database, settings, request);
          assert.equal(posts, 1);
          assert.equal(patches, 1);
          const post = await database.foreverRaidDiscordPost.findUniqueOrThrow({
            where: { eventId },
          });
          const approval = {
            id: "1556000000000000120",
            type: 2,
            application_id: settings.applicationId,
            guild_id: settings.guildId,
            channel_id: settings.channelId,
            member: { permissions: "8", user: { id: ids[0] } },
            data: { name: "Approve event", type: 3, target_id: post.messageId },
          };
          await assert.rejects(
            approveRaidInteraction(
              { ...approval, member: { ...approval.member, permissions: "0" } },
              database,
            ),
            /human administrator/,
          );
          await assert.rejects(
            approveRaidInteraction(
              {
                ...approval,
                member: { ...approval.member, user: { id: ids[0], bot: true } },
              },
              database,
            ),
            /human administrator/,
          );
          await assert.rejects(
            approveRaidInteraction(
              { ...approval, guild_id: "1556000000000000099" },
              database,
            ),
            /human administrator/,
          );
          const reply = await approveRaidInteraction(approval, database);
          assert.match(reply.data.content ?? "", /Approved for the website/);
          assert.deepEqual(
            await approveRaidInteraction(approval, database),
            reply,
          );
          assert.equal(
            await database.foreverRaidAudit.count({
              where: { eventId, action: "website_approved" },
            }),
            1,
          );
          assert.equal(
            await findPublicEvent(eventId, database),
            null,
            "An administrator approval must not publish a private test event",
          );
          assert.equal((await approvedRaidEvents({}, database)).length, 0);
          assert.deepEqual(await publicEventSitemap(database), []);
          await database.foreverRaidDiscordPost.update({
            where: { eventId },
            data: { visibility: "community", confirmedAt: new Date() },
          });
          const publicSummary = await findPublicEvent(eventId, database);
          assert.ok(publicSummary);
          assert.deepEqual(await communityOutcomes(new Date(0), database), {
            approvedEventsCreated: 1,
            nativeSignups: 1,
            signupMembers: 1,
            repeatSignupMembers: 0,
            toolOpens: 0,
            eventStarts: 0,
            guildContacts: 0,
            calendarDownloads: 0,
          });
          await database.foreverRaidSignup.updateMany({
            where: { eventId },
            data: { importSource: { kind: "raid_helper" } },
          });
          assert.equal(
            (await communityOutcomes(new Date(0), database)).nativeSignups,
            0,
            "Historical imports are not new product activation",
          );
          await database.foreverRaidSignup.updateMany({
            where: { eventId },
            data: { importSource: Prisma.DbNull },
          });
          for (const field of [
            "signups",
            "organizer",
            "audience",
            "discordPost",
            "reserves",
            "_count",
            "requestKey",
            "requestHash",
          ])
            assert.equal(field in publicSummary, false, field);
          for (const data of [
            { visibility: "private" },
            { approvedAt: null, approvedBy: null },
            { origin: "https://other.invalid" },
            { guildId: "1556000000000000099" },
            { status: "failed" },
            { messageId: null, approvedAt: null, approvedBy: null },
          ]) {
            const saved =
              await database.foreverRaidDiscordPost.findUniqueOrThrow({
                where: { eventId },
              });
            await database.foreverRaidDiscordPost.update({
              where: { eventId },
              data,
            });
            assert.equal(
              await findPublicEvent(eventId, database),
              null,
              JSON.stringify(data),
            );
            assert.equal((await approvedRaidEvents({}, database)).length, 0);
            assert.deepEqual(await publicEventSitemap(database), []);
            await database.foreverRaidDiscordPost.update({
              where: { eventId },
              data: {
                confirmedAt: saved.confirmedAt,
                visibility: saved.visibility,
                approvedAt: saved.approvedAt,
                approvedBy: saved.approvedBy,
                origin: saved.origin,
                guildId: saved.guildId,
                status: saved.status,
                messageId: saved.messageId,
              },
            });
          }
          await assert.rejects(
            database.foreverRaidDiscordPost.update({
              where: { eventId },
              data: { confirmedAt: null },
            }),
            /visibility_check/,
          );
          assert.equal(
            (await approvedRaidEvents({ activity: "Questing" }, database))[0]
              ?.id,
            eventId,
          );
          assert.equal(
            (await approvedRaidEvents({ activity: "Raid" }, database)).length,
            0,
          );
          assert.equal(
            (await approvedRaidEvents({ faction: "Horde" }, database)).length,
            0,
          );
          await database.foreverRaidDiscordPost.update({
            where: { eventId },
            data: { visibility: "private", confirmedAt: null },
          });
          await pollRaidPosts(database, settings, request);
          const slash = {
            ...approval,
            id: "1556000000000000121",
            data: {
              name: "approve",
              type: 1,
              options: [
                {
                  name: "post",
                  type: 3,
                  value: `https://discord.com/channels/${settings.guildId}/${settings.channelId}/${post.messageId}`,
                },
              ],
            },
          };
          assert.match(
            (await approveRaidInteraction(slash, database)).data.content ?? "",
            /Approved for the website/,
          );
          await service.withdraw(members[0], eventId);
          assert.equal(
            (await approvedRaidEvents({}, database)).length,
            0,
            "Private events stay out of the directory after roster changes",
          );
          assert.ok(
            (
              await database.foreverRaidDiscordPost.findUniqueOrThrow({
                where: { eventId },
              })
            ).approvedAt,
            "Roster changes retain publication approval",
          );
          await database.foreverRaidEvent.update({
            where: { id: eventId },
            data: { title: "Changed definition", version: { increment: 1 } },
          });
          assert.equal(
            (await approvedRaidEvents({}, database)).length,
            0,
            "Material changes require fresh administrator approval",
          );
          messages.delete(post.messageId!);
          await pollRaidPosts(database, settings, request);
          assert.equal(
            (
              await database.foreverRaidDiscordPost.findUniqueOrThrow({
                where: { eventId },
              })
            ).lastError,
            "discord_post_removed",
          );
          await assert.rejects(
            service.publishDiscord(members[0], eventId),
            /not be recreated/,
          );
          const uncertainId = await service.create(members[0], {
            ...input,
            requestKey: randomUUID(),
            catalogId: null,
            reserveLimit: 0,
            hardReserves: [],
          });
          loseResponse = true;
          await pollRaidPosts(database, settings, request);
          assert.equal(
            (
              await database.foreverRaidDiscordPost.findUniqueOrThrow({
                where: { eventId: uncertainId },
              })
            ).status,
            "uncertain",
          );
          await database.foreverRaidDiscordPost.update({
            where: { eventId: uncertainId },
            data: { nextAttemptAt: new Date(0) },
          });
          await pollRaidPosts(database, settings, request);
          assert.equal(
            posts,
            2,
            "Reconciliation does not create a duplicate event post",
          );
          assert.equal(
            (
              await database.foreverRaidDiscordPost.findUniqueOrThrow({
                where: { eventId: uncertainId },
              })
            ).status,
            "sent",
          );
          const beforeRepost = await service.get(members[0], uncertainId);
          const actor = {
            discordId: ids[0],
            guildId: settings.guildId,
            channelId: settings.channelId,
            administrator: false,
          };
          const repost = (actorOverride = actor): Promise<void> =>
            database.$transaction((client) =>
              requestRaidRepost(client, uncertainId, actorOverride),
            );
          await assert.rejects(
            repost({ ...actor, discordId: ids[1] }),
            /creator or a server administrator/,
          );
          await assert.rejects(
            repost({ ...actor, channelId: "1556000000000000999" }),
            /original Discord channel/,
          );
          const oldPost =
            await database.foreverRaidDiscordPost.findUniqueOrThrow({
              where: { eventId: uncertainId },
            });
          const repostInput = {
            id: "1556000000000000140",
            type: 2,
            application_id: settings.applicationId,
            guild_id: settings.guildId,
            channel_id: settings.channelId,
            member: { permissions: "0", user: { id: ids[0] } },
            data: {
              name: "raid",
              options: [
                {
                  type: 1,
                  name: "repost",
                  options: [{ type: 3, name: "event", value: uncertainId }],
                },
              ],
            },
          };
          const replies = await Promise.all([
            raidInteraction(repostInput, database),
            raidInteraction(repostInput, database),
          ]);
          assert.deepEqual(replies[0], replies[1]);
          assert.match(replies[0].data.content!, /Repost queued/);
          assert.equal(
            (
              await database.foreverRaidDiscordPost.findUniqueOrThrow({
                where: { eventId: uncertainId },
              })
            ).repostNumber,
            1,
          );
          loseResponse = true;
          await pollRaidPosts(database, settings, request);
          assert.equal(
            posts,
            3,
            "Repost creates one new message even when Discord's response is lost",
          );
          await pollRaidPosts(database, settings, request);
          const republished =
            await database.foreverRaidDiscordPost.findUniqueOrThrow({
              where: { eventId: uncertainId },
            });
          assert.equal(posts, 3, "Recovery excludes the old canonical post");
          assert.notEqual(republished.messageId, oldPost.messageId);
          assert.ok(republished.previousRetiredAt);
          assert.deepEqual(
            (messages.get(oldPost.messageId!) as { embeds: unknown[] }).embeds,
            [],
          );
          const afterRepost = await service.get(members[0], uncertainId);
          assert.equal(afterRepost.version, beforeRepost.version);
          assert.deepEqual(afterRepost.signups, beforeRepost.signups);
          assert.equal(afterRepost.policyChecksum, beforeRepost.policyChecksum);
          await assert.rejects(repost(), /ten minutes/);
          await database.foreverRaidDiscordPost.update({
            where: { eventId: uncertainId },
            data: { lastRepostedAt: new Date(0) },
          });
          await repost({ ...actor, discordId: ids[1], administrator: true });
          loseRetirementResponse = true;
          await pollRaidPosts(database, settings, request);
          assert.equal(
            posts,
            4,
            "A server administrator can repost after the cooldown",
          );
          assert.equal(
            (
              await database.foreverRaidDiscordPost.findUniqueOrThrow({
                where: { eventId: uncertainId },
              })
            ).lastError,
            "previous_post_retirement_failed",
          );
          await pollRaidPosts(database, settings, request);
          assert.ok(
            (
              await database.foreverRaidDiscordPost.findUniqueOrThrow({
                where: { eventId: uncertainId },
              })
            ).previousRetiredAt,
            "Retirement recovers after a lost PATCH response without creating another post",
          );
          assert.equal(posts, 4);
          const defaultSettings = settings;
          process.env.FOREVER_RAIDS_DISCORD_DESTINATIONS = JSON.stringify([
            {
              channelId: "1556000000000000021",
              guildId: "1556000000000000020",
              label: "Other private test",
            },
          ]);
          const selectedSettings = raidDiscordDestination(
            "1556000000000000021",
          );
          assert.ok(selectedSettings);
          settings = selectedSettings;
          await assert.rejects(
            service.create(members[0], {
              ...input,
              requestKey: randomUUID(),
              discordChannelId: "1556000000000000099",
            }),
            /Confirm that the event/,
          );
          const alternateId = await service.create(members[0], {
            ...input,
            requestKey: randomUUID(),
            game: "tbc",
            realm: "spineshatter",
            raidName: "Karazhan",
            discordChannelId: settings.channelId,
            catalogId: null,
            reserveLimit: 0,
            hardReserves: [],
          });
          const alternatePost =
            await database.foreverRaidDiscordPost.findUniqueOrThrow({
              where: { eventId: alternateId },
            });
          assert.equal(alternatePost.guildId, settings.guildId);
          assert.equal(alternatePost.channelId, settings.channelId);
          settings = defaultSettings;
          await pollRaidPosts(database, settings, request);
          settings = selectedSettings;
          assert.equal(
            (
              await database.foreverRaidDiscordPost.findUniqueOrThrow({
                where: { eventId: alternateId },
              })
            ).status,
            "pending",
          );
          await pollRaidPosts(database, settings, request);
          const deliveredAlternate =
            await database.foreverRaidDiscordPost.findUniqueOrThrow({
              where: { eventId: alternateId },
            });
          assert.equal(deliveredAlternate.status, "sent");
          const alternateApproval = {
            ...approval,
            id: "1556000000000000122",
            guild_id: settings.guildId,
            channel_id: settings.channelId,
            data: {
              name: "Approve event",
              type: 3,
              target_id: deliveredAlternate.messageId,
            },
          };
          const alternateReply = await approveRaidInteraction(
            alternateApproval,
            database,
          );
          assert.match(
            alternateReply.data.content ?? "",
            /TBC pilot event approved/,
          );
          assert.equal(
            (await approvedRaidEvents({}, database)).some(
              (event) => event.id === alternateId,
            ),
            false,
          );
          await assert.rejects(
            approveRaidInteraction(
              {
                ...alternateApproval,
                id: "1556000000000000123",
                guild_id: defaultSettings.guildId,
                data: {
                  name: "approve",
                  type: 1,
                  options: [
                    {
                      name: "post",
                      type: 3,
                      value: `https://discord.com/channels/${settings.guildId}/${settings.channelId}/${deliveredAlternate.messageId}`,
                    },
                  ],
                },
              },
              database,
            ),
            /approved event channels/,
          );
          process.env.FOREVER_RAIDS_DISCORD_DESTINATIONS = "[]";
          await assert.rejects(
            service.publishDiscord(members[0], alternateId),
            /not configured/,
          );
        } finally {
          globalThis.fetch = originalFetch;
          for (const [key, value] of previous) {
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
          }
        }
      },
    );
    await context.test(
      "Community feedback requires confirmation, checks live permissions and never moves a private post",
      async () => {
        const values: Record<string, string> = {
          FOREVER_RAIDS_DISCORD_ENABLED: "true",
          FOREVER_RAIDS_DISCORD_CHANNEL_ID: "1556000000000000011",
          FOREVER_RAIDS_DISCORD_DESTINATIONS: "[]",
          FOREVER_RAIDS_PUBLIC_ORIGIN: "http://127.0.0.1:19300",
          DISCORD_GUILD_ID: "1554316932948172940",
          DISCORD_APPLICATION_ID: "1554796912673169428",
          DISCORD_BOT_TOKEN: "synthetic-feedback-token",
          FOREVER_RAIDS_DISCORD_FEEDBACK_GUILD_IDS: "1411533815356194968",
        };
        const previous = new Map(
          Object.keys(values).map((key) => [key, process.env[key]]),
        );
        Object.assign(process.env, values);
        const originalFetch = globalThis.fetch;
        const targetGuild = "1411533815356194968",
          targetChannel = "1556000000000000014";
        const channel = {
          id: targetChannel,
          guild_id: targetGuild,
          name: "raid-feedback",
          position: 0,
          parent_id: null,
          type: 0,
          permission_overwrites: [],
        };
        let canAttach = true,
          discoveryCalls = 0,
          posted = 0;
        const guild = {
          id: targetGuild,
          name: "KFC fixture",
          owner_id: ids[0],
        };
        const roles = (): object[] => [
          {
            id: targetGuild,
            name: "@everyone",
            position: 0,
            managed: false,
            mentionable: false,
            permissions: canAttach ? "117760" : "84992",
          },
        ];
        function member(id: string): object {
          return {
            user: { id, bot: id === values.DISCORD_APPLICATION_ID },
            roles: [],
          };
        }
        globalThis.fetch = async (url, init): Promise<Response> => {
          const request = new Request(url, init);
          assert.equal(request.method, "GET");
          const route = new URL(request.url).pathname.replace(
            /^\/api\/v10/,
            "",
          );
          discoveryCalls++;
          if (route === `/guilds/${values.DISCORD_GUILD_ID}`)
            return Response.json({
              id: values.DISCORD_GUILD_ID,
              name: "Forever fixture",
              owner_id: ids[0],
            });
          if (route.startsWith(`/guilds/${values.DISCORD_GUILD_ID}/members/`))
            return Response.json(member(route.split("/").pop()!));
          if (route === `/guilds/${values.DISCORD_GUILD_ID}/roles`)
            return Response.json([
              { ...roles()[0], id: values.DISCORD_GUILD_ID },
            ]);
          if (route === `/guilds/${values.DISCORD_GUILD_ID}/channels`)
            return Response.json([]);
          if (route === `/guilds/${targetGuild}`) return Response.json(guild);
          if (route === `/guilds/${targetGuild}/roles`)
            return Response.json(roles());
          if (route === `/guilds/${targetGuild}/channels`)
            return Response.json([channel]);
          if (route === `/guilds/${targetGuild}/members/${ids[0]}`)
            return Response.json(member(ids[0]));
          if (
            route ===
            `/guilds/${targetGuild}/members/${values.DISCORD_APPLICATION_ID}`
          )
            return Response.json(member(values.DISCORD_APPLICATION_ID));
          throw new Error("Unexpected discovery route in database fixture");
        };
        try {
          const base = {
            ...input,
            requestKey: randomUUID(),
            catalogId: null,
            reserveLimit: 0,
            hardReserves: [],
          };
          const privateId = await service.create(members[0], base);
          const shared = {
            ...base,
            requestKey: randomUUID(),
            game: "tbc",
            realm: "spineshatter",
            raidName: "Karazhan",
            discordChannelId: targetChannel,
          };
          await assert.rejects(service.create(members[0], shared), /Confirm/);
          assert.equal(discoveryCalls, 0);
          const confirmed = { ...shared, confirmDiscordPublication: true };
          const deniedKey = randomUUID();
          await assert.rejects(
            service.create(members[1], { ...confirmed, requestKey: deniedKey }),
            /Only Discord server administrators/,
          );
          assert.equal(
            await database.foreverRaidEvent.count({
              where: { requestKey: deniedKey },
            }),
            0,
          );
          const id = await service.create(members[0], confirmed);
          const calls = discoveryCalls;
          assert.equal(await service.create(members[0], confirmed), id);
          assert.equal(
            discoveryCalls,
            calls,
            "An idempotent retry does not depend on Discord availability",
          );
          await assert.rejects(
            service.create(members[0], shared),
            /different event/,
          );
          const post = await database.foreverRaidDiscordPost.findUniqueOrThrow({
            where: { eventId: id },
          });
          assert.equal(post.visibility, "community");
          assert.equal(post.guildId, targetGuild);
          assert.ok(post.confirmedAt);
          const privatePost =
            await database.foreverRaidDiscordPost.findUniqueOrThrow({
              where: { eventId: privateId },
            });
          assert.equal(privatePost.visibility, "private");
          assert.equal(
            privatePost.channelId,
            values.FOREVER_RAIDS_DISCORD_CHANNEL_ID,
          );
          const ordinaryId = await service.create(members[1], {
            ...base,
            requestKey: randomUUID(),
          });
          assert.equal(
            (
              await database.foreverRaidDiscordPost.findUniqueOrThrow({
                where: { eventId: ordinaryId },
              })
            ).channelId,
            values.FOREVER_RAIDS_DISCORD_CHANNEL_ID,
          );
          const settings = raidDestinationForPost(post);
          assert.ok(settings);
          const request: RaidDiscordRequest = async (
            route,
            method = "GET",
            body,
          ): Promise<unknown> => {
            if (route === "/users/@me")
              return { id: settings.applicationId, bot: true };
            if (route === `/channels/${targetChannel}`) return channel;
            if (route === `/guilds/${targetGuild}`) return guild;
            if (route === `/guilds/${targetGuild}/roles`) return roles();
            if (route.startsWith(`/guilds/${targetGuild}/members/`))
              return member(route.split("/").pop()!);
            assert.equal(method, "POST");
            assert.equal(route, `/channels/${targetChannel}/messages`);
            posted++;
            return {
              ...z.record(z.string(), z.unknown()).parse(body),
              id: "1556000000000000160",
              channel_id: targetChannel,
              author: { id: settings.applicationId, bot: true },
            };
          };
          canAttach = false;
          await pollRaidPosts(database, settings, request);
          assert.equal(posted, 0);
          assert.equal(
            (await service.get(members[0], id)).discord?.lastError,
            "discord_posting_permission_missing",
          );
          canAttach = true;
          await service.publishDiscord(members[0], id);
          await pollRaidPosts(database, settings, request);
          assert.equal(posted, 1);
          const delivered =
            await database.foreverRaidDiscordPost.findUniqueOrThrow({
              where: { eventId: id },
            });
          assert.equal(delivered.status, "sent");
          const before = (await approvedRaidEvents({}, database)).length;
          const approval = {
            id: "1556000000000000161",
            type: 2,
            application_id: settings.applicationId,
            guild_id: targetGuild,
            channel_id: targetChannel,
            member: { user: { id: ids[0] }, permissions: "8" },
            data: {
              name: "Approve event",
              type: 3,
              target_id: delivered.messageId,
            },
          };
          await assert.rejects(
            approveRaidInteraction(
              { ...approval, guild_id: values.DISCORD_GUILD_ID },
              database,
            ),
            /delivered event/,
          );
          await approveRaidInteraction(approval, database);
          assert.equal(
            (await approvedRaidEvents({}, database)).length,
            before,
            "TBC does not enter the Forever directory",
          );
          assert.equal(
            (
              await database.foreverRaidDiscordPost.findUniqueOrThrow({
                where: { eventId: privateId },
              })
            ).status,
            "pending",
          );
        } finally {
          globalThis.fetch = originalFetch;
          for (const [key, value] of previous) {
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
          }
        }
      },
    );
    await context.test(
      "Legacy profiles, class validation, ownership and immutable spec snapshots",
      async () => {
        const legacy = await database.foreverCharacter.create({
          data: {
            memberId: members[0].id,
            name: "Legacy Character",
            className: "Warrior",
            region: "EU",
            faction: "Alliance",
            ruleset: "PvP",
          },
        });
        assert.equal(
          (await service.characters(members[0])).find(
            (row) => row.id === legacy.id,
          )?.specialization,
          null,
        );
        await assert.rejects(
          service.updateCharacterSpecialization(members[1], {
            id: legacy.id,
            specialization: "Fury",
          }),
          /Character not found/,
        );
        await assert.rejects(
          service.updateCharacterSpecialization(members[0], {
            id: legacy.id,
            specialization: "Holy",
          }),
          /specialization for this class/,
        );
        await assert.rejects(
          database.foreverCharacter.update({
            where: { id: legacy.id },
            data: { specialization: "Holy" },
          }),
        );
        await service.updateCharacterSpecialization(members[0], {
          id: legacy.id,
          specialization: "Fury",
        });
        const specEventId = await service.create(members[0], {
          ...input,
          requestKey: randomUUID(),
        });
        const signup = {
          acknowledge: true,
          characterId: legacy.id,
          specialization: "Fury",
          role: "damage",
        };
        await assert.rejects(
          service.signup(members[0], specEventId, {
            ...signup,
            specialization: "Holy",
          }),
          /specialization for this class/,
        );
        await service.signup(members[0], specEventId, signup);
        await service.reserves(members[0], specEventId, { itemIds: [900001] });
        await service.signup(members[0], specEventId, signup);
        assert.deepEqual(
          (await service.get(members[0], specEventId)).signups[0].reserves,
          [900001],
        );
        await service.updateCharacterSpecialization(members[0], {
          id: legacy.id,
          specialization: "Arms",
        });
        assert.equal(
          (await service.get(members[0], specEventId)).signups[0].character
            .specialization,
          "Fury",
        );
        await service.signup(members[0], specEventId, {
          ...signup,
          specialization: "Arms",
        });
        let specEvent = await service.get(members[0], specEventId);
        assert.equal(specEvent.signups[0].character.specialization, "Arms");
        assert.deepEqual(specEvent.signups[0].reserves, []);
        const legacySnapshot = {
          name: legacy.name,
          className: "Warrior",
          region: "EU",
          faction: "Alliance",
          ruleset: "PvP",
        };
        await database.foreverRaidSignup.update({
          where: { id: specEvent.signups[0].id },
          data: { character: legacySnapshot },
        });
        specEvent = await service.get(members[0], specEventId);
        assert.equal(specEvent.signups[0].character.specialization, null);
        await assert.rejects(
          service.reserves(members[0], specEventId, { itemIds: [900001] }),
          /Choose a specialization/,
        );
        await assert.rejects(
          service.manage(members[0], specEventId, {
            action: "lock",
            version: specEvent.version,
          }),
          /select a specialization/,
        );
        await service.signup(members[0], specEventId, signup);
        specEvent = await service.get(members[0], specEventId);
        await service.manage(members[0], specEventId, {
          action: "lock",
          version: specEvent.version,
        });
        const locked = await service.export(members[0], specEventId);
        assert.equal(
          (
            locked.payload as {
              roster: { character: { specialization: string } }[];
            }
          ).roster[0].character.specialization,
          "Fury",
        );
        await service.updateCharacterSpecialization(members[0], {
          id: legacy.id,
          specialization: "Protection",
        });
        assert.deepEqual(await service.export(members[0], specEventId), locked);
        assert.equal(jsonChecksum(locked.payload), locked.checksum);
        await assert.rejects(
          service.signup(members[0], specEventId, {
            ...signup,
            specialization: "Protection",
            role: "tank",
          }),
          /locked/,
        );

        const approvalId = await service.create(members[0], {
          ...input,
          requestKey: randomUUID(),
          admission: "approval",
        });
        await service.signup(members[0], approvalId, signup);
        const pending = await service.get(members[0], approvalId);
        await service.manage(members[0], approvalId, {
          action: "admit",
          version: pending.version,
          signupId: pending.signups[0].id,
          status: "accepted",
        });
        await service.signup(members[0], approvalId, {
          ...signup,
          specialization: "Arms",
        });
        assert.equal(
          (await service.get(members[0], approvalId)).signups[0].status,
          "pending",
        );
      },
    );
    await context.test(
      "Concurrent last-seat admission never overbooks; character ownership enforced",
      async () => {
        await Promise.all([
          service.signup(members[1], eventId, {
            characterId: characters[1].id,
            specialization: "Fury",
            acknowledge: true,
            role: "damage",
          }),
          service.signup(members[2], eventId, {
            characterId: characters[2].id,
            specialization: "Fury",
            acknowledge: true,
            role: "damage",
          }),
        ]);
        const event = await service.get(members[0], eventId);
        assert.equal(
          event.signups.filter((signup) => signup.status === "accepted").length,
          1,
        );
        assert.equal(
          event.signups.filter((signup) => signup.status === "bench").length,
          1,
        );
        await assert.rejects(
          service.signup(members[3], eventId, {
            characterId: characters[1].id,
            specialization: "Fury",
            acknowledge: true,
            role: "damage",
          }),
          /Character not found/,
        );
        await assert.rejects(
          service.manage(members[1], eventId, {
            action: "lock",
            version: event.version,
          }),
          /organizer/,
        );
      },
    );
    await context.test(
      "Catalog, HR, class, quota, duplicate rules and parallel reserve edits",
      async () => {
        for (const itemIds of [
          [900002],
          [900003],
          [7],
          [900001, 900001],
          [900001, 900001, 900001],
        ])
          await assert.rejects(
            service.reserves(members[1], eventId, { itemIds }),
          );
        await Promise.all([
          service.reserves(members[1], eventId, { itemIds: [900001] }),
          service.reserves(members[1], eventId, { itemIds: [] }),
        ]);
        await service.reserves(members[1], eventId, { itemIds: [900001] });
        await service.reserves(members[2], eventId, { itemIds: [900001] });
        const event = await service.get(members[0], eventId);
        assert.equal(
          event.signups.every((signup) => signup.reserves.length <= 2),
          true,
        );
        await assert.rejects(
          database.foreverRaidCatalog.update({
            where: { id: catalogId },
            data: { bundle: { game: "tbc" } },
          }),
        );
      },
    );
    await context.test(
      "Independent deadlines are enforced using database time without a worker",
      async () => {
        const closedId = await service.create(members[0], {
          ...input,
          requestKey: randomUUID(),
        });
        await service.signup(members[1], closedId, {
          characterId: characters[1].id,
          specialization: "Fury",
          acknowledge: true,
          role: "damage",
        });
        await database.foreverRaidEvent.update({
          where: { id: closedId },
          data: { reservesCloseAt: new Date("2020-01-01") },
        });
        await assert.rejects(
          service.reserves(members[1], closedId, { itemIds: [900001] }),
          /reserves have closed/,
        );
        await service.signup(members[2], closedId, {
          policyChecksum: (await service.get(members[2], closedId))
            .policyChecksum,
          characterId: characters[2].id,
          specialization: "Fury",
          acknowledge: true,
          role: "damage",
        });
        await database.foreverRaidEvent.update({
          where: { id: closedId },
          data: { signupClosesAt: new Date("2020-01-01") },
        });
        await assert.rejects(
          service.signup(members[3], closedId, {
            characterId: characters[3].id,
            specialization: "Fury",
            acknowledge: true,
            role: "damage",
          }),
          /Signups have closed/,
        );
        await service.withdraw(members[1], closedId);
      },
    );
    await context.test(
      "Stale versions rejected, locking is idempotent and export excludes the bench",
      async () => {
        const event = await service.get(members[0], eventId);
        await assert.rejects(
          service.manage(members[0], eventId, { action: "lock", version: 1 }),
          /roster changed/,
        );
        await service.manage(members[0], eventId, {
          action: "lock",
          version: event.version,
        });
        await service.manage(members[0], eventId, {
          action: "lock",
          version: event.version,
        });
        const exported = await service.export(members[0], eventId);
        assert.equal(jsonChecksum(exported.payload), exported.checksum);
        assert.equal(
          (exported.payload as { roster: unknown[] }).roster.length,
          1,
        );
        await assert.rejects(service.export(members[1], eventId), /organizer/);
        await assert.rejects(
          service.reserves(members[1], eventId, { itemIds: [] }),
          /locked/,
        );
        await assert.rejects(
          database.foreverRaidLootSnapshot.update({
            where: { eventId },
            data: { checksum: "tampered" },
          }),
        );
        await assert.rejects(
          database.foreverRaidAudit.deleteMany({ where: { eventId } }),
        );
        assert.equal(
          await database.foreverListingDiscordJob.count().catch(() => 0),
          0,
        );
      },
    );
    await context.test(
      "Native Discord join replays return a stored response without duplicate roster writes",
      async () => {
        const oldApp = process.env.DISCORD_APPLICATION_ID,
          oldGuild = process.env.DISCORD_GUILD_ID;
        process.env.DISCORD_APPLICATION_ID = "1556000000000000701";
        process.env.DISCORD_GUILD_ID = "1556000000000000702";
        try {
          const nativeId = await service.create(members[0], {
            ...input,
            requestKey: randomUUID(),
          });
          const interaction = {
            id: "1556000000000000703",
            type: 2,
            application_id: process.env.DISCORD_APPLICATION_ID,
            guild_id: process.env.DISCORD_GUILD_ID,
            member: { user: { id: members[3].discordId } },
            data: {
              name: "raid",
              options: [
                {
                  type: 1,
                  name: "join",
                  options: [
                    { type: 3, name: "event", value: nativeId },
                    { type: 3, name: "character", value: characters[3].name },
                    { type: 3, name: "role", value: "damage" },
                    { type: 3, name: "specialization", value: "Arms" },
                    { type: 5, name: "accept_rules", value: true },
                  ],
                },
              ],
            },
          };
          const [first, replay] = await Promise.all([
            raidInteraction(interaction, database),
            raidInteraction(interaction, database),
          ]);
          assert.deepEqual(first, replay);
          const socialId = await service.create(members[0], {
            ...input,
            requestKey: randomUUID(),
            eventType: "social",
            raidName: "Synthetic social activity",
            roleCaps: eventTypeDefinitions.social.roleCaps,
            catalogId: null,
            reserveLimit: 0,
            hardReserves: [],
          });
          const socialInteraction = {
            ...interaction,
            id: "1556000000000000711",
            data: {
              name: "raid",
              options: [
                {
                  type: 1,
                  name: "join",
                  options: [
                    { type: 3, name: "event", value: socialId },
                    { type: 3, name: "character", value: characters[3].name },
                    { type: 5, name: "accept_rules", value: true },
                  ],
                },
              ],
            },
          };
          const socialJoined = await raidInteraction(
            socialInteraction,
            database,
          );
          assert.match(socialJoined.data.content ?? "", /Signup saved/);
          assert.deepEqual(
            await raidInteraction(socialInteraction, database),
            socialJoined,
          );
          const socialSignup = (await service.get(members[0], socialId))
            .signups[0];
          assert.equal(socialSignup.role, "participant");
          assert.equal(socialSignup.character.specialization, null);
          const missingCombatOptions = await raidInteraction(
            {
              ...socialInteraction,
              id: "1556000000000000712",
              data: {
                name: "raid",
                options: [
                  {
                    type: 1,
                    name: "join",
                    options: [
                      { type: 3, name: "event", value: nativeId },
                      { type: 3, name: "character", value: characters[3].name },
                      { type: 5, name: "accept_rules", value: true },
                    ],
                  },
                ],
              },
            },
            database,
          );
          assert.match(
            missingCombatOptions.data.content ?? "",
            /Combat events require/,
          );
          assert.equal(
            (await service.get(members[0], nativeId)).signups[0].character
              .specialization,
            "Arms",
          );
          const mismatched = await raidInteraction(
            {
              ...interaction,
              id: "1556000000000000710",
              data: {
                ...interaction.data,
                options: [
                  {
                    ...interaction.data.options[0],
                    options: interaction.data.options[0].options.map(
                      (option) =>
                        option.name === "specialization"
                          ? { ...option, value: "Holy" }
                          : option,
                    ),
                  },
                ],
              },
            },
            database,
          );
          assert.equal(typeof mismatched.data.content, "string");
          assert.match(mismatched.data.content ?? "", /specialization/);
          assert.equal(
            (await service.get(members[0], nativeId)).signups[0].character
              .specialization,
            "Arms",
          );
          const rollbackId = await service.create(members[0], {
            ...input,
            requestKey: randomUUID(),
          });
          await pool.query(
            `CREATE FUNCTION fail_test_receipt() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN IF NEW."id" = '1556000000000000709' THEN RAISE EXCEPTION 'synthetic receipt failure'; END IF; RETURN NEW; END $$`,
          );
          await pool.query(
            'CREATE TRIGGER fail_test_receipt BEFORE INSERT ON "ForeverRaidInteraction" FOR EACH ROW EXECUTE FUNCTION fail_test_receipt()',
          );
          try {
            const failed = {
              ...interaction,
              id: "1556000000000000709",
              data: {
                ...interaction.data,
                options: [
                  {
                    ...interaction.data.options[0],
                    options: interaction.data.options[0].options.map(
                      (option) =>
                        option.name === "event"
                          ? { ...option, value: rollbackId }
                          : option,
                    ),
                  },
                ],
              },
            };
            await assert.rejects(raidInteraction(failed, database));
            assert.equal(
              await database.foreverRaidSignup.count({
                where: { eventId: rollbackId },
              }),
              0,
            );
            assert.equal(
              await database.foreverRaidAudit.count({
                where: { eventId: rollbackId, action: "signup" },
              }),
              0,
            );
          } finally {
            await pool.query(
              'DROP TRIGGER fail_test_receipt ON "ForeverRaidInteraction"',
            );
            await pool.query("DROP FUNCTION fail_test_receipt()");
          }
          assert.equal(
            await database.foreverRaidSignup.count({
              where: { eventId: nativeId },
            }),
            1,
          );
          assert.equal(
            await database.foreverRaidAudit.count({
              where: { eventId: nativeId, action: "signup" },
            }),
            1,
          );
          await assert.rejects(
            raidInteraction(
              {
                ...interaction,
                member: { user: { id: members[2].discordId } },
              },
              database,
            ),
            /original request/,
          );
          await assert.rejects(
            service.signup(members[2], nativeId, {
              characterId: characters[2].id,
              specialization: "Fury",
              role: "damage",
              acknowledge: false,
            }),
          );
          const duplicateId = await service.create(members[0], {
            ...input,
            requestKey: randomUUID(),
            allowDuplicates: true,
          });
          await service.signup(members[2], duplicateId, {
            characterId: characters[2].id,
            specialization: "Fury",
            role: "damage",
            acknowledge: true,
          });
          await service.reserves(members[2], duplicateId, {
            itemIds: [900001, 900001],
          });
          assert.deepEqual(
            (await service.get(members[2], duplicateId)).signups[0].reserves,
            [900001, 900001],
          );
        } finally {
          if (oldApp === undefined) delete process.env.DISCORD_APPLICATION_ID;
          else process.env.DISCORD_APPLICATION_ID = oldApp;
          if (oldGuild === undefined) delete process.env.DISCORD_GUILD_ID;
          else process.env.DISCORD_GUILD_ID = oldGuild;
        }
      },
    );
    await context.test(
      "Unknown availability cannot publish; newly allowlisted members cannot access old audiences",
      async () => {
        const staged = await stageCatalog(
          {
            ...raidCatalogFixture,
            raidName: "Unreleased raid",
            availability: "unreleased",
          },
          "local-test",
          database,
        );
        await assert.rejects(
          reviewCatalog(
            staged,
            "local-test",
            "published",
            "Cannot publish missing release evidence",
            database,
          ),
          /availability/,
        );
        const extra = await database.foreverMember.create({
          data: {
            discordId: "1556000000000000005",
            displayName: "Late addition",
          },
        });
        process.env.FOREVER_RAIDS_PILOT_DISCORD_IDS += ",1556000000000000005";
        await assert.rejects(service.get(extra, eventId), /not found/);
        await database.foreverMember.update({
          where: { id: members[1].id },
          data: { active: false },
        });
        await assert.rejects(service.get(members[1], eventId), /disabled/);
      },
    );
  } finally {
    if (oldEnabled === undefined) delete process.env.FOREVER_RAIDS_ENABLED;
    else process.env.FOREVER_RAIDS_ENABLED = oldEnabled;
    if (oldIds === undefined)
      delete process.env.FOREVER_RAIDS_PILOT_DISCORD_IDS;
    else process.env.FOREVER_RAIDS_PILOT_DISCORD_IDS = oldIds;
    if (oldDiscordEnabled === undefined)
      delete process.env.FOREVER_RAIDS_DISCORD_ENABLED;
    else process.env.FOREVER_RAIDS_DISCORD_ENABLED = oldDiscordEnabled;
    await database.$disconnect();
    await pool.end();
    await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.end();
  }
});
