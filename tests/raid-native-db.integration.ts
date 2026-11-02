import "../scripts/env";
import {
  publishRoster,
  previewRosterPublication,
  replyToRoster,
  rosterDashboard,
  amendRoster,
  manuallyConfirmRoster,
  reconcileRosterInvitations,
} from "../lib/raids/roster-confirmations";
import { rosterInteraction } from "../lib/raids/roster-confirmation-interactions";
import { rosterControl } from "../lib/raids/roster-confirmation-ui";
import { defaultPreparation } from "../lib/raids/roster-confirmation-contracts";
import {
  deliverRosterNotification,
  RosterDeliveryError,
  type RosterDeliveryTransport,
} from "../lib/raids/roster-confirmation-delivery";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { Pool } from "pg";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { raidService } from "../lib/raids/service";
import {
  eventSchema,
  eventSettingsSchema,
  type EventInput,
  type EventSettings,
  type EventView,
  type MemberIdentity,
} from "../lib/raids/contracts";
import { stageCatalog, reviewCatalog } from "../lib/raids/catalog-store";
import { raidCatalogFixture } from "./fixtures/raid-catalog";
import { localRaidStart } from "../lib/raids/time";
import { findRaidShareEvent } from "../lib/raids/share-metadata";
import { nativeRaidInteraction } from "../lib/raids/native-interactions";
import {
  nativeMessageSchema,
  type NativeInput,
  type NativeMessage,
  type NativeButton,
  type NativeSelect,
} from "../lib/raids/native-contracts";
import {
  NativeResponseError,
  runNativeRaidWork,
  nativeWorkerTransport,
  type NativeWorkerTransport,
} from "../lib/raids/native-worker";

test("Native Discord PostgreSQL: draft confirmation, registration, reserves, permissions and durable retries", async (context) => {
  const url = new URL(process.env.DATABASE_URL || "postgresql://invalid");
  if (
    !["127.0.0.1", "localhost"].includes(url.hostname) ||
    url.port !== "55432"
  )
    throw new Error("Native raid tests require isolated local PostgreSQL.");
  const schema = `native_raid_test_${randomUUID().replaceAll("-", "")}`;
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
  const guildId = "1557000000000000010",
    botId = "1557000000000000011",
    channelId = "1557000000000000012";
  const ids = [
    "1557000000000000001",
    "1557000000000000002",
    "1557000000000000003",
    "1557000000000000004",
  ];
  const settings: Record<string, string> = {
    FOREVER_RAIDS_ENABLED: "true",
    FOREVER_RAIDS_ACCESS_MODE: "pilot",
    FOREVER_RAIDS_PILOT_DISCORD_IDS: ids.join(","),
    FOREVER_RAIDS_DISCORD_ENABLED: "true",
    FOREVER_RAIDS_NATIVE_ENABLED: "true",
    DISCORD_GUILD_ID: guildId,
    DISCORD_APPLICATION_ID: botId,
    DISCORD_BOT_TOKEN: "synthetic-test-bot",
    COMMUNITY_AUTH_SECRET: "synthetic-native-test-session-secret-only",
    FOREVER_RAIDS_DISCORD_CHANNEL_ID: channelId,
    FOREVER_RAIDS_DISCORD_DESTINATIONS: "[]",
    FOREVER_RAIDS_PUBLIC_ORIGIN: "http://127.0.0.1:19300",
  };
  const oldSettings = Object.fromEntries(
    Object.keys(settings).map((key) => [key, process.env[key]]),
  );
  Object.assign(process.env, settings);
  let nextId = 1557000000000010000n;
  const snowflake = (): string => String(nextId++);
  const replies = new Map<string, NativeMessage>();
  const transport: NativeWorkerTransport = {
    membership: async (): Promise<"member"> => "member",
    respond: async (token: string, message: NativeMessage): Promise<void> => {
      replies.set(token, nativeMessageSchema.parse(message));
    },
  };
  type Payload = NativeInput & { token: string };
  function privateInput(
    member: MemberIdentity,
    customId: string,
    values?: string[],
  ): Payload {
    const id = snowflake();
    return {
      id,
      token: `native-test-${id}`,
      type: 3,
      application_id: botId,
      guild_id: guildId,
      channel_id: channelId,
      member: { user: { id: member.discordId } },
      message: { id: snowflake(), author: { id: botId, bot: true }, flags: 64 },
      data: {
        custom_id: customId,
        component_type: values ? 3 : 2,
        ...(values ? { values } : {}),
      },
    };
  }
  function control(message: NativeMessage, action: string): string {
    const component = message.components
      .flatMap<NativeButton | NativeSelect>((row) => row.components)
      .find((item) => item.custom_id?.endsWith(`:${action}`));
    assert.ok(
      component?.custom_id,
      `Missing ${action}: ${message.content} ${message.embeds[0]?.description}`,
    );
    return component.custom_id;
  }
  async function finish(
    payload: Payload,
    workerTransport: NativeWorkerTransport = transport,
  ): Promise<NativeMessage> {
    const acknowledgement = await nativeRaidInteraction(payload, database);
    assert.ok([5, 6].includes(acknowledgement.type));
    // TIMESTAMPTZ(3) can round a just-created job slightly ahead of the poll clock.
    await database.foreverRaidNativeWork.updateMany({
      where: { id: payload.id, status: "pending" },
      data: { nextAttemptAt: new Date(0) },
    });
    assert.equal(
      await runNativeRaidWork(database, workerTransport),
      1,
      `Worker did not claim ${payload.id}: ${JSON.stringify(await database.foreverRaidNativeWork.findUnique({ where: { id: payload.id }, select: { status: true, attempts: true, lastError: true, nextAttemptAt: true } }))}`,
    );
    const response = replies.get(payload.token);
    assert.ok(
      response,
      `Native worker must complete the acknowledged interaction: ${(await database.foreverRaidNativeWork.findUniqueOrThrow({ where: { id: payload.id } })).lastError}`,
    );
    assert.equal(
      (
        await database.foreverRaidNativeWork.findUniqueOrThrow({
          where: { id: payload.id },
        })
      ).tokenCipher,
      null,
    );
    return response;
  }
  async function act(
    member: MemberIdentity,
    message: NativeMessage,
    action: string,
    value?: string,
  ): Promise<NativeMessage> {
    return finish(
      privateInput(
        member,
        control(message, action),
        value === undefined ? undefined : [value],
      ),
    );
  }
  const service = raidService(database);
  const members: MemberIdentity[] = [];
  let catalogId: string;
  function eventSettings(
    event: EventView,
    overrides: Partial<EventSettings> = {},
  ): EventSettings {
    return eventSettingsSchema.parse({
      title: event.title,
      game: event.game,
      realm: event.realm,
      eventType: event.eventType,
      raidName: event.raidName,
      region: event.region,
      faction: event.faction,
      ruleset: event.ruleset,
      description: event.description,
      localStart: localRaidStart(event.startsAt, event.region),
      durationMinutes:
        (Date.parse(event.endsAt) - Date.parse(event.startsAt)) / 60000,
      signupMinutesBefore:
        (Date.parse(event.startsAt) - Date.parse(event.signupClosesAt)) / 60000,
      reserveMinutesBefore:
        (Date.parse(event.startsAt) - Date.parse(event.reservesCloseAt)) /
        60000,
      capacity: event.capacity,
      roleCaps: event.roleCaps,
      admission: event.admission,
      catalogId: event.catalog?.id ?? null,
      reserveLimit: event.reserveLimit,
      reserveLimits: event.reserveLimits ?? null,
      allowDuplicates: event.allowDuplicates,
      hardReserves: event.hardReserves,
      ...overrides,
    });
  }
  async function edit(
    eventId: string,
    overrides: Partial<EventSettings> = {},
    member = members[0],
  ): Promise<void> {
    const event = await service.get(member, eventId);
    await service.manage(member, eventId, {
      action: "edit",
      version: event.version,
      settings: eventSettings(event, overrides),
    });
  }
  async function createEvent(
    overrides: Partial<EventInput> = {},
  ): Promise<string> {
    const input = eventSchema.parse({
      requestKey: randomUUID(),
      game: "forever",
      realm: "",
      eventType: "dungeon",
      title: "Synthetic native event",
      raidName: "Ragefire Chasm",
      region: "EU",
      faction: "Alliance",
      ruleset: "PvP",
      localStart: "2035-11-05T19:00",
      durationMinutes: 180,
      signupMinutesBefore: 15,
      reserveMinutesBefore: 60,
      capacity: 5,
      roleCaps: { tank: 1, healer: 1, damage: 3 },
      admission: "automatic",
      description: "Explicit participation rules",
      catalogId: null,
      reserveLimit: 0,
      allowDuplicates: false,
      hardReserves: [],
      ...overrides,
    });
    const eventId = await service.create(members[0], input);
    await database.foreverRaidDiscordPost.update({
      where: { eventId },
      data: { messageId: snowflake(), status: "sent", deliveredVersion: 2 },
    });
    return eventId;
  }
  async function publicInput(
    eventId: string,
    member: MemberIdentity,
    action = "join",
  ): Promise<Payload> {
    const post = await database.foreverRaidDiscordPost.findUniqueOrThrow({
      where: { eventId },
    });
    const result = privateInput(member, `nraid:e:${eventId}:${action}`);
    result.message = {
      id: post.messageId!,
      author: { id: botId, bot: true },
      flags: 0,
    };
    return result;
  }
  async function open(
    eventId: string,
    member: MemberIdentity,
    action = "join",
  ): Promise<NativeMessage> {
    return finish(await publicInput(eventId, member, action));
  }
  async function addCharacter(
    member: MemberIdentity,
    game: "forever" | "tbc" = "forever",
  ): Promise<string> {
    const character = await service.addCharacter(member, {
      game,
      realm: game === "tbc" ? "Spineshatter" : "",
      name:
        game === "tbc"
          ? "Testhero"
          : `Test ${["Alpha", "Bravo", "Charlie", "Delta"][members.indexOf(member)]}`,
      className: "Warrior",
      specialization: "Fury",
      region: "EU",
      faction: "Alliance",
      ruleset: "PvP",
    });
    return character.id;
  }
  try {
    const migrations = (await readdir("prisma/migrations"))
      .filter(
        (filename) =>
          filename.endsWith(".sql") &&
          (filename.startsWith("001_") ||
            (Number(filename.slice(0, 3)) >= 14 &&
              Number(filename.slice(0, 3)) <= 32) ||
            filename.startsWith("035_") ||
            filename.startsWith("036_") ||
            filename.startsWith("038_") ||
            filename.startsWith("039_")),
      )
      .sort();
    for (const filename of migrations)
      await pool.query(await readFile(`prisma/migrations/${filename}`, "utf8"));
    assert.equal(
      (
        await database.$queryRaw<
          Array<{ name: string }>
        >`SELECT current_schema() AS name`
      )[0].name,
      schema,
    );
    context.beforeEach(async () => {
      await database.foreverRateLimit.deleteMany({
        where: { key: { in: ids.map((id) => `raid-native:${id}`) } },
      });
    });
    for (const discordId of ids)
      members.push(
        await database.foreverMember.create({
          data: { discordId, displayName: "Synthetic native member" },
        }),
      );
    await addCharacter(members[0]);
    await addCharacter(members[1]);
    catalogId = await stageCatalog(raidCatalogFixture, "local-test", database);
    await reviewCatalog(
      catalogId,
      "local-test",
      "published",
      "Synthetic isolated fixture only",
      database,
    );

    await context.test(
      "Link metadata exposes only approved public events from the configured community",
      async () => {
        assert.equal(await findRaidShareEvent("invalid", database), null);
        for (const game of ["forever", "tbc"] as const) {
          const eventId = await createEvent({
            game,
            realm: game === "tbc" ? "spineshatter" : "",
          });
          assert.equal(await findRaidShareEvent(eventId, database), null);
          const post = await database.foreverRaidDiscordPost.update({
            where: { eventId },
            data: {
              visibility: "community",
              confirmedAt: new Date(),
              approvedAt: new Date(),
              approvedBy: members[0].discordId,
              label: "Synthetic public sharing test",
            },
          });
          const shared = await findRaidShareEvent(eventId, database);
          assert.ok(shared);
          assert.equal(shared.game, game);
          for (const field of [
            "signups",
            "organizer",
            "description",
            "audience",
            "discordPost",
            "hardReserves",
          ])
            assert.equal(field in shared, false, field);
          for (const data of [
            { visibility: "private" },
            { approvedAt: null, approvedBy: null },
            { origin: "https://other.invalid" },
            { guildId: "1557000000000000099" },
            { status: "failed" },
          ]) {
            await database.foreverRaidDiscordPost.update({
              where: { eventId },
              data,
            });
            assert.equal(
              await findRaidShareEvent(eventId, database),
              null,
              JSON.stringify(data),
            );
            await database.foreverRaidDiscordPost.update({
              where: { eventId },
              data: {
                visibility: post.visibility,
                approvedAt: post.approvedAt,
                approvedBy: post.approvedBy,
                origin: post.origin,
                guildId: post.guildId,
                status: post.status,
              },
            });
          }
        }
      },
    );
    await context.test(
      "Public click acknowledges privately, encrypts the continuation, and selection does not sign up",
      async () => {
        const eventId = await createEvent();
        const payload = await publicInput(eventId, members[1]);
        assert.deepEqual(await nativeRaidInteraction(payload, database), {
          type: 5,
          data: { flags: 64 },
        });
        const work = await database.foreverRaidNativeWork.findUniqueOrThrow({
          where: { id: payload.id },
        });
        assert.ok(
          work.tokenCipher && !work.tokenCipher.includes(payload.token),
        );
        assert.ok(!JSON.stringify(work.input).includes(payload.token));
        await database.foreverRaidNativeWork.update({
          where: { id: payload.id },
          data: { nextAttemptAt: new Date(0) },
        });
        await runNativeRaidWork(database, transport);
        const message = replies.get(payload.token);
        assert.ok(
          message,
          `First response failed: ${JSON.stringify(await database.foreverRaidNativeWork.findUniqueOrThrow({ where: { id: payload.id }, select: { status: true, lastError: true, attempts: true } }))}; received replies: ${replies.size}`,
        );
        const selected = await act(members[1], message, "spec", "Arms");
        assert.equal(
          await database.foreverRaidSignup.count({ where: { eventId } }),
          0,
        );
        const confirmed = await act(members[1], selected, "confirm");
        assert.match(confirmed.content, /Selected/);
        const signup = await database.foreverRaidSignup.findFirstOrThrow({
          where: { eventId },
        });
        assert.equal(
          (signup.character as { specialization: string }).specialization,
          "Arms",
        );
        assert.ok(signup.acknowledgedAt && signup.policyChecksum);
      },
    );
    await context.test(
      "Exact replay and simultaneous confirm clicks mutate participation only once",
      async () => {
        const eventId = await createEvent();
        const message = await open(eventId, members[1]);
        const first = privateInput(members[1], control(message, "confirm"));
        const second = privateInput(members[1], control(message, "confirm"));
        const acknowledgements = await Promise.all([
          nativeRaidInteraction(first, database),
          nativeRaidInteraction(first, database),
          nativeRaidInteraction(second, database),
        ]);
        assert.deepEqual(acknowledgements, [
          { type: 6 },
          { type: 6 },
          { type: 6 },
        ]);
        await database.foreverRaidNativeWork.updateMany({
          where: { id: { in: [first.id, second.id] } },
          data: { nextAttemptAt: new Date(0) },
        });
        await Promise.all([
          runNativeRaidWork(database, transport),
          runNativeRaidWork(database, transport),
        ]);
        assert.equal(
          await database.foreverRaidSignup.count({ where: { eventId } }),
          1,
        );
        assert.equal(
          await database.foreverRaidAudit.count({
            where: { eventId, action: "signup" },
          }),
          1,
        );
        assert.ok(
          [...replies.values()].some((reply) =>
            reply.content.includes("private view changed"),
          ),
        );
        assert.deepEqual(await nativeRaidInteraction(first, database), {
          type: 6,
        });
      },
    );
    await context.test(
      "New Discord-only members can register in either server without joining the other server",
      async () => {
        const otherGuild = "1557000000000000020";
        const otherChannel = "1557000000000000021";
        const actors = ["1557000000000000030", "1557000000000000031"];
        const originalFetch = globalThis.fetch;
        const originalPilot = process.env.FOREVER_RAIDS_PILOT_DISCORD_IDS;
        const originalDestinations =
          process.env.FOREVER_RAIDS_DISCORD_DESTINATIONS;
        process.env.FOREVER_RAIDS_PILOT_DISCORD_IDS = [...ids, ...actors].join(
          ",",
        );
        process.env.FOREVER_RAIDS_DISCORD_DESTINATIONS = JSON.stringify([
          {
            guildId: otherGuild,
            channelId: otherChannel,
            label: "Second server",
          },
        ]);
        try {
          for (const [index, server] of [guildId, otherGuild].entries()) {
            const channel = index === 0 ? channelId : otherChannel;
            const actor: MemberIdentity = {
              id: "not-a-website-member",
              discordId: actors[index],
              displayName: "Discord-only newcomer",
            };
            assert.equal(
              await database.foreverMember.findUnique({
                where: { discordId: actor.discordId },
              }),
              null,
            );
            const checkedGuilds: string[] = [];
            globalThis.fetch = async (request): Promise<Response> => {
              const url = new URL(
                request instanceof Request ? request.url : String(request),
              );
              assert.equal(url.origin, "https://discord.com");
              const match = /^\/api\/v10\/guilds\/(\d+)\/members\/(\d+)$/.exec(
                url.pathname,
              );
              assert.ok(
                match,
                "Signup must not start OAuth or any other HTTP flow",
              );
              checkedGuilds.push(match[1]);
              return match[1] === server && match[2] === actor.discordId
                ? Response.json({ user: { id: actor.discordId } })
                : Response.json({ code: 10007 }, { status: 404 });
            };
            const nativeTransport = {
              ...nativeWorkerTransport(),
              respond: transport.respond,
            };
            const eventId = await createEvent();
            await database.foreverRaidDiscordPost.update({
              where: { eventId },
              data: { guildId: server, channelId: channel },
            });
            const clicked = await publicInput(eventId, actor);
            clicked.guild_id = server;
            clicked.channel_id = channel;
            let message = await finish(clicked, nativeTransport);
            assert.equal(
              message.embeds[0]?.title,
              "Step 1 of 2 · Your character",
            );
            async function next(action: string, value?: string): Promise<void> {
              const input = privateInput(
                actor,
                control(message, action),
                value === undefined ? undefined : [value],
              );
              input.guild_id = server;
              input.channel_id = channel;
              message = await finish(input, nativeTransport);
            }
            await next("class", "Warrior");
            await next("spec", "Fury");
            const nameRequest = privateInput(actor, control(message, "name"));
            nameRequest.guild_id = server;
            nameRequest.channel_id = channel;
            assert.equal(
              (await nativeRaidInteraction(nameRequest, database)).type,
              9,
            );
            message = await finish(
              {
                ...nameRequest,
                id: snowflake(),
                token: `native-test-${snowflake()}`,
                type: 5,
                data: {
                  custom_id: control(message, "name"),
                  components: [
                    {
                      type: 18,
                      component: {
                        type: 4,
                        custom_id: "name",
                        value: `New ${index === 0 ? "Alpha" : "Bravo"}`,
                      },
                    },
                  ],
                },
              },
              nativeTransport,
            );
            await next("register");
            assert.equal(
              await database.foreverRaidSignup.count({ where: { eventId } }),
              0,
            );
            await next("confirm");
            const signup = await database.foreverRaidSignup.findFirstOrThrow({
              where: { eventId },
            });
            const member = await database.foreverMember.findUniqueOrThrow({
              where: { discordId: actor.discordId },
            });
            assert.equal(signup.memberId, member.id);
            assert.equal(signup.status, "accepted");
            assert.ok(checkedGuilds.length >= 6);
            assert.ok(checkedGuilds.every((checked) => checked === server));
          }
        } finally {
          globalThis.fetch = originalFetch;
          process.env.FOREVER_RAIDS_PILOT_DISCORD_IDS = originalPilot;
          process.env.FOREVER_RAIDS_DISCORD_DESTINATIONS = originalDestinations;
        }
      },
    );
    await context.test(
      "First character registration uses class/spec and a modal; saving is separate from signup",
      async () => {
        const eventId = await createEvent();
        let message = await open(eventId, members[2]);
        message = await act(members[2], message, "class", "Warrior");
        message = await act(members[2], message, "spec", "Protection");
        const request = privateInput(members[2], control(message, "name"));
        const modal = await nativeRaidInteraction(request, database);
        assert.equal(modal.type, 9);
        assert.equal(
          await database.foreverRaidNativeWork.count({
            where: { id: request.id },
          }),
          0,
        );
        const submit = {
          ...privateInput(members[2], control(message, "name")),
          type: 5 as const,
          data: {
            custom_id: control(message, "name"),
            components: [
              {
                type: 18,
                component: {
                  type: 4 as const,
                  custom_id: "name",
                  value: "New Tester",
                },
              },
            ],
          },
        };
        message = await finish(submit);
        message = await act(members[2], message, "register");
        assert.equal(
          await database.foreverRaidSignup.count({ where: { eventId } }),
          0,
        );
        assert.match(message.content, /press Confirm signup/);
        await act(members[2], message, "confirm");
        const row = await database.foreverRaidSignup.findFirstOrThrow({
          where: { eventId },
        });
        assert.equal(row.role, "tank");
        assert.equal(
          (row.character as { specialization: string }).specialization,
          "Protection",
        );
      },
    );
    await context.test(
      "TBC signup selects only edition/realm-compatible characters",
      async () => {
        const tbcCharacter = await addCharacter(members[1], "tbc");
        const eventId = await createEvent({
          game: "tbc",
          realm: "Spineshatter",
        });
        const message = await open(eventId, members[1]);
        const selector = message.components
          .flatMap<NativeButton | NativeSelect>((row) => row.components)
          .find(
            (item) => item.type === 3 && item.custom_id.endsWith(":character"),
          );
        assert.ok(selector?.type === 3);
        assert.deepEqual(
          selector.options
            .filter((option) => option.value !== "new")
            .map((option) => option.value),
          [tbcCharacter],
        );
        await act(members[1], message, "confirm");
        assert.equal(
          (await service.get(members[1], eventId)).signups[0].character.game,
          "tbc",
        );
      },
    );
    await context.test(
      "Approval, organizer admission, and a full roster produce honest pending/bench states",
      async () => {
        const eventId = await createEvent({
          admission: "approval",
          capacity: 1,
          roleCaps: { tank: 1, healer: 1, damage: 1 },
        });
        const pending = await act(
          members[1],
          await open(eventId, members[1]),
          "confirm",
        );
        assert.match(pending.content, /Pending organizer approval/);
        let manager = await open(eventId, members[0], "manage");
        const signup = (await service.get(members[0], eventId)).signups[0];
        manager = await act(members[0], manager, "candidate", signup.id);
        await act(members[0], manager, "accept");
        assert.equal(
          (await service.get(members[0], eventId)).signups[0].status,
          "accepted",
        );
        const fullId = await createEvent({
          capacity: 1,
          roleCaps: { tank: 1, healer: 1, damage: 1 },
        });
        await act(members[1], await open(fullId, members[1]), "confirm");
        const bench = await act(
          members[0],
          await open(fullId, members[0]),
          "confirm",
        );
        assert.match(bench.content, /On the bench/);
      },
    );
    await context.test(
      "Native signup immediately opens SR and role quotas govern baskets and role changes",
      async () => {
        const eventId = await createEvent({
          eventType: "raid",
          raidName: raidCatalogFixture.raidName,
          catalogId,
          reserveLimit: 3,
          reserveLimits: { tank: 3, healer: 2, damage: 1 },
          allowDuplicates: true,
        });
        const selected = await act(
          members[1],
          await open(eventId, members[1]),
          "role",
          "tank",
        );
        let basket = await act(members[1], selected, "confirm");
        assert.equal(basket.embeds?.[0]?.title, "My soft reserves");
        assert.match(basket.content, /Choose your items/);
        for (let count = 0; count < 3; count += 1)
          basket = await act(members[1], basket, "add", "900001");
        await act(members[1], basket, "save");
        const char = (await service.characters(members[1])).find(
          (record) => record.game === "forever",
        )!;
        await assert.rejects(
          service.signup(members[1], eventId, {
            acknowledge: true,
            characterId: char.id,
            specialization: "Fury",
            role: "damage",
          }),
          /Reduce your existing reserves/,
        );
        await service.reserves(members[1], eventId, { itemIds: [900001] });
        await service.signup(members[1], eventId, {
          acknowledge: true,
          characterId: char.id,
          specialization: "Fury",
          role: "damage",
        });
        await assert.rejects(
          service.reserves(members[1], eventId, { itemIds: [900001, 900001] }),
          /quota/,
        );
        const view = await service.get(members[1], eventId);
        assert.deepEqual(view.reserveLimits, { tank: 3, healer: 2, damage: 1 });
        assert.deepEqual(
          view.signups.find((row) => row.isMine)!.reserves,
          [900001],
        );
        const revised = await database.foreverRaidEvent.update({
          where: { id: eventId },
          data: { reserveLimits: { tank: 3, healer: 1, damage: 1 } },
        });
        assert.equal(revised.policyRevision, 1);
        assert.equal(
          (await service.get(members[1], eventId)).signups.find(
            (row) => row.isMine,
          )?.needsAcknowledgement,
          true,
        );
      },
    );
    await context.test(
      "Availability releases seats and SR, lists responses, and rejoining follows each admission mode",
      async () => {
        for (const admission of ["automatic", "approval", "open"] as const) {
          const eventId = await createEvent({
            admission,
            eventType: "raid",
            raidName: raidCatalogFixture.raidName,
            capacity: 1,
            roleCaps: { tank: 0, healer: 0, damage: 1 },
            catalogId,
            reserveLimit: 1,
          });
          await act(members[1], await open(eventId, members[1]), "confirm");
          await service.reserves(members[1], eventId, { itemIds: [900001] });
          const before = (await service.get(members[1], eventId)).signups.find(
            (row) => row.isMine,
          )!;
          const prompt = await open(eventId, members[1], "absent");
          assert.equal(
            (await service.get(members[1], eventId)).signups[0].status,
            before.status,
          );
          assert.match(
            prompt.embeds[0].description,
            /releases any confirmed seat/,
          );
          const absent = await act(members[1], prompt, "confirm");
          assert.match(absent.embeds[0].description, /Absent/);
          assert.equal(absent.embeds[0].title, "My signup");
          let view = await service.get(members[1], eventId);
          let mine = view.signups.find((row) => row.isMine)!;
          assert.equal(mine.status, "absent");
          assert.equal(mine.id, before.id);
          assert.deepEqual(mine.reserves, []);
          assert.equal(mine.partyIndex, null);
          assert.equal(mine.slotIndex, null);
          await assert.rejects(
            service.reserves(members[1], eventId, { itemIds: [900001] }),
            /Joining/,
          );
          await assert.rejects(
            service.manage(members[0], eventId, {
              action: "admit",
              version: view.version,
              signupId: mine.id,
              status: "accepted",
            }),
            /choose Joining/,
          );
          const roster = await open(eventId, members[0], "roster");
          const absentList = await act(
            members[0],
            roster,
            "view",
            "class:absent",
          );
          assert.match(absentList.embeds[0].description, /Absent.*1 players/);
          assert.match(absentList.embeds[0].description, /Test Bravo/);
          const manage = await act(
            members[0],
            await open(eventId, members[0], "manage"),
            "view",
            "class:absent",
          );
          assert.ok(
            !manage.components
              .flatMap<NativeButton | NativeSelect>((row) => row.components)
              .some((control) => control.custom_id?.endsWith(":accept")),
          );
          await act(
            members[1],
            await open(eventId, members[1], "tentative"),
            "confirm",
          );
          assert.equal(
            (await service.get(members[1], eventId)).signups[0].status,
            "tentative",
          );
          const rejoin = await open(eventId, members[1], "join");
          assert.equal(
            rejoin.embeds[0].title,
            "Step 2 of 2 · Confirm your signup",
          );
          await act(members[1], rejoin, "confirm");
          view = await service.get(members[1], eventId);
          mine = view.signups.find((row) => row.isMine)!;
          assert.equal(mine.id, before.id);
          assert.equal(
            mine.status,
            admission === "open"
              ? "registered"
              : admission === "approval"
                ? "pending"
                : "accepted",
          );
          assert.deepEqual(mine.reserves, []);
          const confirmation = await act(
            members[1],
            await open(eventId, members[1], "absent"),
            "attendance",
            "tentative",
          );
          await act(members[1], confirmation, "confirm");
          assert.equal(
            (await service.get(members[1], eventId)).signups[0].status,
            "tentative",
          );
          if (admission === "automatic") {
            await act(members[0], await open(eventId, members[0]), "confirm");
            await act(members[1], await open(eventId, members[1]), "confirm");
            assert.equal(
              (await service.get(members[1], eventId)).signups.find(
                (row) => row.isMine,
              )!.status,
              "bench",
            );
          }
          const audits = await database.foreverRaidAudit.findMany({
            where: { eventId, action: "signup" },
          });
          assert.ok(audits.length >= 5);
          const expired = await createEvent();
          const charId = (await service.characters(members[1]))[0].id;
          await database.foreverRaidEvent.update({
            where: { id: expired },
            data: { signupClosesAt: new Date(0) },
          });
          await assert.rejects(
            service.signup(members[1], expired, {
              acknowledge: true,
              characterId: charId,
              specialization: "Fury",
              role: "damage",
              attendance: "absent",
            }),
            /closed/,
          );
        }
      },
    );
    await context.test(
      "Open signup collects beyond capacity, permits SR immediately and lets the organizer choose seats later",
      async () => {
        const eventId = await createEvent({
          admission: "open",
          eventType: "raid",
          raidName: raidCatalogFixture.raidName,
          capacity: 1,
          roleCaps: { tank: 0, healer: 0, damage: 1 },
          catalogId,
          reserveLimit: 1,
          hardReserves: [900002],
        });
        const guestPrompt = await open(eventId, members[1]);
        assert.match(guestPrompt.embeds[0].description, /Immediate signup/);
        assert.match(
          guestPrompt.embeds[0].description,
          /Synthetic hard reserve/,
        );
        const basket = await act(members[1], guestPrompt, "confirm");
        assert.match(basket.content, /Signed up; roster not selected/);
        assert.equal(basket.embeds[0].title, "My soft reserves");
        await act(
          members[1],
          await act(members[1], basket, "add", "900001"),
          "save",
        );
        await act(members[0], await open(eventId, members[0]), "confirm");
        const signups = await database.foreverRaidSignup.findMany({
          where: { eventId },
        });
        assert.equal(signups.length, 2);
        assert.ok(signups.every((signup) => signup.status === "registered"));
        const guest = signups.find(
          (signup) => signup.memberId === members[1].id,
        )!;
        assert.deepEqual(guest.reserves, [900001]);
        const manage = await open(eventId, members[0], "manage");
        assert.match(manage.embeds[0].description, /Signed up.*2 players/);
        const selected = await act(members[0], manage, "candidate", guest.id);
        await act(members[0], selected, "accept");
        const event = await service.get(members[0], eventId);
        assert.equal(
          event.signups.filter((signup) => signup.status === "accepted").length,
          1,
        );
        assert.equal(
          event.signups.filter((signup) => signup.status === "registered")
            .length,
          1,
        );
        const remaining = event.signups.find(
          (signup) => signup.status === "registered",
        )!;
        await assert.rejects(
          service.manage(members[0], eventId, {
            action: "admit",
            signupId: remaining.id,
            status: "accepted",
            version: event.version,
          }),
          /No seat is available/,
        );
        await service.manage(members[0], eventId, {
          action: "lock",
          version: event.version,
        });
        const exported = await service.export(members[0], eventId);
        assert.equal(
          (exported.payload as { roster: unknown[] }).roster.length,
          1,
        );
      },
    );
    await context.test(
      "Leadership edits retain signups, approvals and policy, without granting assistant management access",
      async (): Promise<void> => {
        const eventId = await createEvent({
          leaderName: "Psyrogue",
          assistantName: "DJ",
          admission: "open",
        });
        await act(members[1], await open(eventId, members[1]), "confirm");
        await database.foreverRaidDiscordPost.update({
          where: { eventId },
          data: { approvedAt: new Date(), approvedBy: members[0].discordId },
        });
        const before = await service.get(members[0], eventId);
        assert.equal(
          await service.revision(members[0], eventId),
          before.version,
        );
        const storedBefore = await database.foreverRaidEvent.findUniqueOrThrow({
          where: { id: eventId },
          include: { discordPost: true },
        });
        await edit(eventId, { assistantName: "Vargos" });
        const after = await service.get(members[0], eventId);
        const storedAfter = await database.foreverRaidEvent.findUniqueOrThrow({
          where: { id: eventId },
          include: { discordPost: true },
        });
        assert.equal(after.leaderName, "Psyrogue");
        assert.equal(after.assistantName, "Vargos");
        assert.deepEqual(after.signups, before.signups);
        assert.equal(after.policyChecksum, before.policyChecksum);
        assert.equal(storedAfter.policyRevision, storedBefore.policyRevision);
        assert.equal(storedAfter.requestHash, storedBefore.requestHash);
        assert.equal(storedAfter.organizerId, storedBefore.organizerId);
        assert.equal(after.version, before.version + 1);
        assert.equal(
          await service.revision(members[0], eventId),
          after.version,
        );
        assert.equal(storedAfter.discordPost?.desiredVersion, after.version);
        assert.equal(
          storedAfter.discordPost?.approvedAt?.toISOString(),
          storedBefore.discordPost?.approvedAt?.toISOString(),
        );
        await assert.rejects(
          edit(eventId, { assistantName: "DJ" }, members[1]),
          /Only the event organizer/,
        );
        await service.manage(members[0], eventId, {
          action: "edit",
          version: after.version,
          settings: eventSettings(after),
        });
        assert.equal(
          (await service.get(members[0], eventId)).assistantName,
          "Vargos",
          "Older forms omit the fields without erasing them",
        );
        await edit(eventId, { assistantName: "" });
        assert.equal(
          (await service.get(members[0], eventId)).assistantName,
          "",
        );
        const current = await service.get(members[0], eventId);
        await service.manage(members[0], eventId, {
          action: "cancel",
          version: current.version,
          reason: "Synthetic cancellation for leadership guard check",
        });
        await assert.rejects(
          database.foreverRaidEvent.update({
            where: { id: eventId },
            data: { assistantName: "DJ" },
          }),
          /leadership is immutable/,
        );
      },
    );
    await context.test(
      "Existing event editing preserves confirmed signups, reserves and Discord identity and requires current acknowledgement",
      async () => {
        const eventId = await createEvent({
          eventType: "raid",
          raidName: raidCatalogFixture.raidName,
          catalogId,
          reserveLimit: 1,
          admission: "approval",
        });
        await act(members[1], await open(eventId, members[1]), "confirm");
        await service.reserves(members[1], eventId, { itemIds: [900001] });
        let event = await service.get(members[0], eventId);
        await service.manage(members[0], eventId, {
          action: "admit",
          version: event.version,
          signupId: event.signups[0].id,
          status: "accepted",
        });
        await act(members[0], await open(eventId, members[0]), "confirm");
        const before = await database.foreverRaidEvent.findUniqueOrThrow({
          where: { id: eventId },
          include: { discordPost: true },
        });
        const oldPolicy = (await service.get(members[1], eventId))
          .policyChecksum;
        await database.foreverRaidDiscordPost.update({
          where: { eventId },
          data: { approvedAt: new Date(), approvedBy: members[0].discordId },
        });
        const stale = await open(eventId, members[2]);
        await edit(eventId, {
          title: "Updated organizer title",
          admission: "open",
          description: "Updated rules",
          localStart: "2035-11-06T20:00",
          durationMinutes: 240,
          signupMinutesBefore: 30,
          reserveMinutesBefore: 45,
          reserveLimit: 3,
          reserveLimits: { tank: 3, healer: 3, damage: 2 },
          hardReserves: [900002],
        });
        event = await service.get(members[0], eventId);
        const selected = event.signups.find(
          (row) => row.status === "accepted",
        )!;
        assert.deepEqual(selected.reserves, [900001]);
        assert.equal(selected.needsAcknowledgement, true);
        assert.equal(
          event.signups.find((row) => row.isMine)!.status,
          "registered",
        );
        assert.equal(event.title, "Updated organizer title");
        assert.equal(event.admission, "open");
        const after = await database.foreverRaidEvent.findUniqueOrThrow({
          where: { id: eventId },
          include: { discordPost: true },
        });
        assert.equal(after.requestHash, before.requestHash);
        assert.equal(after.requestKey, before.requestKey);
        assert.equal(after.policyRevision, 1);
        assert.equal(
          after.discordPost?.messageId,
          before.discordPost?.messageId,
        );
        assert.equal(
          after.discordPost?.channelId,
          before.discordPost?.channelId,
        );
        assert.equal(after.discordPost?.approvedAt, null);
        assert.equal(after.discordPost?.desiredVersion, event.version);
        await assert.rejects(
          service.manage(members[0], eventId, {
            action: "lock",
            version: event.version,
          }),
          /acknowledge/,
        );
        await assert.rejects(
          service.acknowledge(members[1], eventId, {
            acknowledge: true,
            policyChecksum: oldPolicy,
          }),
          /changed again/,
        );
        await assert.rejects(
          service.acknowledge(members[1], eventId, {
            acknowledge: true,
            policyChecksum: "a".repeat(64),
          }),
          /changed again/,
        );
        await assert.rejects(
          service.reserves(members[1], eventId, { itemIds: [900001] }),
          /acknowledge/,
        );
        const rejected = await act(members[2], stale, "confirm");
        assert.match(rejected.content, /Event rules changed/);
        const prompt = await open(eventId, members[1], "mine");
        assert.match(prompt.embeds[0].description, /organizer updated/);
        await act(members[1], prompt, "acknowledge");
        event = await service.get(members[1], eventId);
        assert.equal(
          event.signups.find((row) => row.isMine)?.status,
          "accepted",
        );
        assert.equal(
          event.signups.find((row) => row.isMine)?.needsAcknowledgement,
          false,
        );
        await service.signup(members[1], eventId, {
          acknowledge: true,
          policyChecksum: event.policyChecksum,
          characterId: (await service.characters(members[1])).find(
            (row) => row.game === "forever",
          )!.id,
          specialization: "Fury",
          role: "damage",
        });
        assert.equal(
          (await service.get(members[1], eventId)).signups.find(
            (row) => row.isMine,
          )?.status,
          "accepted",
        );
        event = await service.get(members[0], eventId);
        await service.manage(members[0], eventId, {
          action: "lock",
          version: event.version,
        });
        const payload = (await service.export(members[0], eventId)).payload as {
          roster: Array<{ reserves: number[] }>;
        };
        assert.deepEqual(payload.roster[0].reserves, [900001]);
        await assert.rejects(
          edit(eventId, { title: "Forbidden locked edit" }),
          /locked/,
        );
        await assert.rejects(
          database.foreverRaidEvent.update({
            where: { id: eventId },
            data: { title: "Forbidden locked SQL" },
          }),
          /immutable/,
        );
      },
    );
    await context.test(
      "Conflicting loot, role capacity and character scope edits fail atomically; organizers alone can edit",
      async () => {
        const eventId = await createEvent({
          eventType: "raid",
          raidName: raidCatalogFixture.raidName,
          catalogId,
          reserveLimit: 2,
          allowDuplicates: true,
        });
        await act(members[1], await open(eventId, members[1]), "confirm");
        await service.reserves(members[1], eventId, {
          itemIds: [900001, 900001],
        });
        const before = await service.get(members[0], eventId);
        await assert.rejects(
          edit(eventId, { title: "Unauthorized" }, members[1]),
          /Only the event organizer/,
        );
        await assert.rejects(
          edit(eventId, { roleCaps: { tank: 5, healer: 5, damage: 0 } }),
          /confirmed roster/,
        );
        await assert.rejects(
          edit(eventId, { reserveLimit: 1 }),
          /new SR allowance/,
        );
        await assert.rejects(
          edit(eventId, { allowDuplicates: false }),
          /contain duplicates/,
        );
        await assert.rejects(
          edit(eventId, { hardReserves: [900001] }),
          /soft reserve conflicts/,
        );
        await assert.rejects(
          edit(eventId, { catalogId: null, reserveLimit: 0 }),
          /new SR allowance/,
        );
        await assert.rejects(
          edit(eventId, { faction: "Horde" }),
          /Existing signups do not match/,
        );
        await assert.rejects(
          edit(eventId, {
            eventType: "social",
            catalogId: null,
            reserveLimit: 0,
            allowDuplicates: false,
            roleCaps: { tank: 0, healer: 0, damage: 0 },
          }),
          /confirmed roster|signup roles/,
        );
        assert.deepEqual(await service.get(members[0], eventId), before);
        assert.equal(
          await database.foreverRaidAudit.count({
            where: { eventId, action: "settings_updated" },
          }),
          0,
        );
      },
    );
    await context.test(
      "Admission changes seat only unselected players within capacity and reject stale concurrent edits",
      async () => {
        const eventId = await createEvent({
          admission: "open",
          capacity: 1,
          roleCaps: { tank: 1, healer: 1, damage: 1 },
        });
        await act(members[1], await open(eventId, members[1]), "confirm");
        await act(members[0], await open(eventId, members[0]), "confirm");
        await edit(eventId, { admission: "approval" });
        assert.ok(
          (await service.get(members[0], eventId)).signups.every(
            (row) => row.status === "pending",
          ),
        );
        await edit(eventId, { admission: "automatic" });
        let event = await service.get(members[0], eventId);
        assert.equal(
          event.signups.filter((row) => row.status === "accepted").length,
          1,
        );
        assert.equal(
          event.signups.filter((row) => row.status === "bench").length,
          1,
        );
        const unchanged = event.version;
        await edit(eventId);
        assert.equal(
          (await service.get(members[0], eventId)).version,
          unchanged,
        );
        const saves = await Promise.allSettled(
          ["First edit", "Second edit"].map((title) =>
            service.manage(members[0], eventId, {
              action: "edit",
              version: event.version,
              settings: eventSettings(event, { title }),
            }),
          ),
        );
        assert.equal(
          saves.filter((result) => result.status === "fulfilled").length,
          1,
        );
        const failure = saves.find((result) => result.status === "rejected");
        assert.ok(failure?.status === "rejected");
        assert.match(String(failure.reason), /Refresh/);
        await edit(eventId, { admission: "open" });
        event = await service.get(members[0], eventId);
        assert.equal(
          event.signups.filter((row) => row.status === "accepted").length,
          1,
        );
        assert.equal(
          event.signups.filter((row) => row.status === "bench").length,
          1,
        );
        await service.manage(members[0], eventId, {
          action: "cancel",
          version: event.version,
          reason: "Synthetic cancelled editing test",
        });
        await assert.rejects(
          edit(eventId, { title: "Forbidden" }),
          /cancelled/,
        );
      },
    );
    await context.test(
      "Planning events can acquire reviewed loot and events without signups can change edition, activity and scope",
      async () => {
        const eventId = await createEvent();
        await edit(eventId, {
          eventType: "raid",
          raidName: raidCatalogFixture.raidName,
          catalogId,
          reserveLimit: 2,
          reserveLimits: { tank: 2, healer: 1, damage: 1 },
          hardReserves: [900002],
        });
        let event = await service.get(members[0], eventId);
        assert.equal(event.catalog?.id, catalogId);
        assert.deepEqual(event.hardReserves, [900002]);
        await edit(eventId, {
          game: "tbc",
          realm: "spineshatter",
          eventType: "questing",
          raidName: "Nagrand",
          region: "NA",
          faction: "Horde",
          ruleset: "PvE",
          catalogId: null,
          reserveLimit: 0,
          reserveLimits: null,
          hardReserves: [],
          roleCaps: { tank: 1, healer: 1, damage: 3 },
        });
        event = await service.get(members[0], eventId);
        assert.equal(event.game, "tbc");
        assert.equal(event.eventType, "questing");
        assert.match(event.timeLabel, /America\/New_York/);
        assert.equal(event.catalog, null);
      },
    );
    await context.test(
      "Change history is readable by participants, paginated and append-only",
      async () => {
        const eventId = await createEvent();
        for (let index = 0; index < 32; index += 1)
          await edit(eventId, { title: `Audited event title ${index}` });
        const latest = await service.history(members[1], eventId);
        assert.equal(latest.changes.length, 30);
        assert.ok(latest.nextCursor);
        assert.equal(latest.changes[0].fields[0].label, "Title");
        assert.equal(
          latest.changes[0].fields[0].after,
          "Audited event title 31",
        );
        assert.match(latest.changes[0].timeLabel, /\d\d:\d\d/);
        const earlier = await service.history(
          members[1],
          eventId,
          latest.nextCursor,
        );
        assert.equal(earlier.changes.length, 2);
        assert.equal(earlier.nextCursor, null);
        assert.equal(
          new Set([...latest.changes, ...earlier.changes].map((row) => row.id))
            .size,
          32,
        );
        const otherId = await createEvent();
        await assert.rejects(
          service.history(members[1], otherId, latest.changes[0].id),
          /Invalid change history cursor/,
        );
        await assert.rejects(
          database.foreverRaidAudit.update({
            where: { id: latest.changes[0].id },
            data: { details: {} },
          }),
          /append-only/,
        );
      },
    );
    await context.test(
      "Member beta admits additional members to community events, not old private events, and native signup still checks membership",
      async () => {
        const additional = await database.foreverMember.create({
          data: {
            discordId: "1557000000000000005",
            displayName: "Synthetic beta member",
          },
        });
        const privateId = await createEvent();
        const sharedId = await createEvent();
        await database.foreverRaidDiscordPost.update({
          where: { eventId: sharedId },
          data: {
            visibility: "community",
            confirmedAt: new Date(),
            label: "Synthetic public beta",
          },
        });
        await assert.rejects(
          service.get(additional, sharedId),
          /private event pilot/,
        );
        process.env.FOREVER_RAIDS_ACCESS_MODE = "members";
        try {
          assert.equal((await service.get(additional, sharedId)).id, sharedId);
          assert.ok(
            (await service.list(additional)).some((row) => row.id === sharedId),
          );
          assert.ok(
            !(await service.list(additional)).some(
              (row) => row.id === privateId,
            ),
          );
          await assert.rejects(
            service.get(additional, privateId),
            /Event not found/,
          );
          await assert.rejects(
            service.history(additional, privateId),
            /Event not found/,
          );
          await service.addCharacter(additional, {
            game: "forever",
            realm: "",
            name: "Beta Tester",
            className: "Warrior",
            specialization: "Fury",
            region: "EU",
            faction: "Alliance",
            ruleset: "PvP",
          });
          const prompt = await open(sharedId, additional);
          const refused = await finish(
            privateInput(additional, control(prompt, "confirm")),
            {
              ...transport,
              membership: async (): Promise<"not_member"> => "not_member",
            },
          );
          assert.match(refused.content, /Join.*Discord server/);
          assert.equal(
            await database.foreverRaidSignup.count({
              where: { eventId: sharedId },
            }),
            0,
          );
          const success = await act(
            additional,
            await open(sharedId, additional),
            "confirm",
          );
          assert.match(success.content, /Selected/);
          const signup = (await service.get(additional, sharedId)).signups.find(
            (row) => row.isMine,
          )!;
          assert.equal(signup.character.name, "Beta Tester");
          const event = await service.get(additional, sharedId);
          await assert.rejects(
            service.manage(additional, sharedId, {
              action: "edit",
              version: event.version,
              settings: eventSettings(event, {
                title: "Unauthorized beta edit",
              }),
            }),
            /Only the event organizer/,
          );
        } finally {
          process.env.FOREVER_RAIDS_ACCESS_MODE = "pilot";
        }
      },
    );
    await context.test(
      "Closed signup deadlines can be retained while editing and members can acknowledge without losing their seat",
      async () => {
        const eventId = await createEvent();
        await act(members[1], await open(eventId, members[1]), "confirm");
        const nextDay = new Date(Date.now() + 86400000);
        nextDay.setSeconds(0, 0);
        const startsAt = new Date(nextDay.getTime());
        const closedAt = new Date(startsAt.getTime() - 2880 * 60000);
        await database.foreverRaidEvent.update({
          where: { id: eventId },
          data: {
            startsAt,
            endsAt: new Date(startsAt.getTime() + 180 * 60000),
            signupClosesAt: closedAt,
            reservesCloseAt: closedAt,
          },
        });
        await edit(eventId, { title: "Closed signup deadline retained" });
        let event = await service.get(members[1], eventId);
        assert.equal(event.signups[0].needsAcknowledgement, true);
        await service.acknowledge(members[1], eventId, {
          acknowledge: true,
          policyChecksum: event.policyChecksum,
        });
        event = await service.get(members[1], eventId);
        assert.equal(event.signups[0].needsAcknowledgement, false);
        assert.equal(event.signups[0].status, "accepted");
        assert.equal(event.signupClosesAt, closedAt.toISOString());
      },
    );
    await context.test(
      "Soft-reserve baskets do not save before confirmation and enforce HR/class/quota rules",
      async () => {
        const eventId = await createEvent({
          eventType: "raid",
          raidName: raidCatalogFixture.raidName,
          catalogId,
          reserveLimit: 1,
          hardReserves: [900002],
        });
        await act(members[1], await open(eventId, members[1]), "confirm");
        let basket = await open(eventId, members[1], "reserves");
        const forged = await finish(
          privateInput(members[1], control(basket, "add"), ["900002"]),
        );
        assert.match(forged.content, /hard.reserved/);
        basket = await act(members[1], basket, "add", "900001");
        assert.deepEqual(
          (await service.get(members[1], eventId)).signups[0].reserves,
          [],
        );
        await act(members[1], basket, "save");
        assert.deepEqual(
          (await service.get(members[1], eventId)).signups[0].reserves,
          [900001],
        );
        const current = await open(eventId, members[1], "mine");
        const change = await act(members[1], current, "join");
        const spec = await act(members[1], change, "spec", "Arms");
        await act(members[1], spec, "confirm");
        assert.deepEqual(
          (await service.get(members[1], eventId)).signups[0].reserves,
          [],
        );
      },
    );
    await context.test(
      "Another player's signup does not invalidate a draft; your website change does",
      async () => {
        const eventId = await createEvent();
        const message = await open(eventId, members[1]);
        const characterId = (await service.characters(members[0]))[0].id;
        await service.signup(members[0], eventId, {
          acknowledge: true,
          characterId,
          specialization: "Fury",
          role: "damage",
        });
        await act(members[1], message, "confirm");
        const stale = await act(
          members[1],
          await open(eventId, members[1], "mine"),
          "join",
        );
        const mine = (await service.characters(members[1])).find(
          (character) => character.game === "forever",
        )!;
        await service.signup(members[1], eventId, {
          acknowledge: true,
          characterId: mine.id,
          specialization: "Arms",
          role: "damage",
        });
        const response = await act(members[1], stale, "confirm");
        assert.match(response.content, /signup changed elsewhere/);
        assert.equal(
          (await service.get(members[1], eventId)).signups.find(
            (signup) => signup.isMine,
          )!.character.specialization,
          "Arms",
        );
      },
    );
    await context.test(
      "Cross-actor, forged source, bot callers and non-organizer management are rejected",
      async () => {
        const eventId = await createEvent();
        const message = await open(eventId, members[1]);
        await assert.rejects(
          nativeRaidInteraction(
            privateInput(members[0], control(message, "confirm")),
            database,
          ),
          /not yours/,
        );
        const source = await publicInput(eventId, members[1]);
        source.message!.id = snowflake();
        await assert.rejects(
          nativeRaidInteraction(source, database),
          /unavailable/,
        );
        const bot = await publicInput(eventId, members[1]);
        bot.member.user.bot = true;
        await assert.rejects(
          nativeRaidInteraction(bot, database),
          /different bot/,
        );
        const managed = await open(eventId, members[1], "manage");
        assert.match(managed.content, /Only the event organizer/);
        const expiredId = control(message, "confirm").split(":")[2];
        await database.foreverRaidNativeDraft.update({
          where: { id: expiredId },
          data: { expiresAt: new Date(0) },
        });
        await assert.rejects(
          nativeRaidInteraction(
            privateInput(members[1], control(message, "confirm")),
            database,
          ),
          /expired/,
        );
      },
    );
    await context.test(
      "Lost membership after acknowledgement blocks mutation and clears the continuation",
      async () => {
        const eventId = await createEvent();
        const message = await open(eventId, members[1]);
        const response = await finish(
          privateInput(members[1], control(message, "confirm")),
          {
            ...transport,
            membership: async (): Promise<"not_member"> => "not_member",
          },
        );
        assert.match(response.content, /Join.*Discord server/);
        assert.equal(
          await database.foreverRaidSignup.count({ where: { eventId } }),
          0,
        );
      },
    );
    await context.test(
      "Response failure after commit retries the cached receipt without duplicate signup",
      async () => {
        const eventId = await createEvent();
        const message = await open(eventId, members[1]);
        const payload = privateInput(members[1], control(message, "confirm"));
        await nativeRaidInteraction(payload, database);
        await database.foreverRaidNativeWork.update({
          where: { id: payload.id },
          data: { nextAttemptAt: new Date(0) },
        });
        await runNativeRaidWork(database, {
          ...transport,
          respond: async (): Promise<void> => {
            throw new NativeResponseError(429, 1);
          },
        });
        let work = await database.foreverRaidNativeWork.findUniqueOrThrow({
          where: { id: payload.id },
        });
        assert.equal(work.status, "pending");
        assert.ok(work.response && work.tokenCipher);
        assert.equal(
          await database.foreverRaidAudit.count({
            where: { eventId, action: "signup" },
          }),
          1,
        );
        await database.foreverRaidNativeWork.update({
          where: { id: payload.id },
          data: { nextAttemptAt: new Date(0) },
        });
        await runNativeRaidWork(database, transport);
        work = await database.foreverRaidNativeWork.findUniqueOrThrow({
          where: { id: payload.id },
        });
        assert.equal(work.status, "done");
        assert.equal(work.tokenCipher, null);
        assert.equal(
          await database.foreverRaidAudit.count({
            where: { eventId, action: "signup" },
          }),
          1,
        );
        assert.match(replies.get(payload.token)!.content, /Selected/);
      },
    );
    await context.test(
      "Deadline recheck and expired work never add participation",
      async () => {
        const eventId = await createEvent();
        const message = await open(eventId, members[1]);
        await database.foreverRaidEvent.update({
          where: { id: eventId },
          data: { signupClosesAt: new Date(0) },
        });
        const response = await act(members[1], message, "confirm");
        assert.match(response.content, /Event rules changed/);
        const freshResponse = await act(
          members[1],
          await open(eventId, members[1]),
          "confirm",
        );
        assert.match(freshResponse.content, /closed/);
        const payload = await publicInput(eventId, members[1], "roster");
        await nativeRaidInteraction(payload, database);
        await database.foreverRaidNativeWork.update({
          where: { id: payload.id },
          data: { expiresAt: new Date(0) },
        });
        assert.equal(await runNativeRaidWork(database, transport), 0);
        assert.equal(
          (
            await database.foreverRaidNativeWork.findUniqueOrThrow({
              where: { id: payload.id },
            })
          ).tokenCipher,
          null,
        );
        assert.equal(
          await database.foreverRaidSignup.count({ where: { eventId } }),
          0,
        );
      },
    );
    await context.test(
      "Organizer lock requires a second confirmation and creates an immutable snapshot",
      async () => {
        const eventId = await createEvent();
        await act(members[1], await open(eventId, members[1]), "confirm");
        const manager = await open(eventId, members[0], "manage");
        const confirmation = await act(members[0], manager, "lock");
        assert.equal((await service.get(members[0], eventId)).status, "open");
        assert.match(confirmation.embeds[0].description, /immutable/);
        await act(members[0], confirmation, "lock_confirm");
        assert.equal((await service.get(members[0], eventId)).status, "locked");
        assert.equal(
          await database.foreverRaidLootSnapshot.count({ where: { eventId } }),
          1,
        );
      },
    );
    await context.test(
      "Native withdrawal releases participation and reserves even after signup closes",
      async () => {
        const eventId = await createEvent({
          eventType: "raid",
          raidName: raidCatalogFixture.raidName,
          catalogId,
          reserveLimit: 1,
        });
        await act(members[1], await open(eventId, members[1]), "confirm");
        await service.reserves(members[1], eventId, { itemIds: [900001] });
        const leave = await act(
          members[1],
          await open(eventId, members[1], "mine"),
          "leave",
        );
        await database.foreverRaidEvent.update({
          where: { id: eventId },
          data: { signupClosesAt: new Date(0) },
        });
        const response = await act(members[1], leave, "withdraw");
        assert.match(response.content, /withdrawn/);
        const row = await database.foreverRaidSignup.findFirstOrThrow({
          where: { eventId },
        });
        assert.equal(row.status, "withdrawn");
        assert.deepEqual(row.reserves, []);
      },
    );
    await context.test(
      "Reserve search modal, forged class-ineligible item and stale basket are safe",
      async () => {
        const eventId = await createEvent({
          eventType: "raid",
          raidName: raidCatalogFixture.raidName,
          catalogId,
          reserveLimit: 1,
        });
        await act(members[1], await open(eventId, members[1]), "confirm");
        let basket = await open(eventId, members[1], "reserves");
        const request = privateInput(members[1], control(basket, "search"));
        assert.equal((await nativeRaidInteraction(request, database)).type, 9);
        basket = await finish({
          ...privateInput(members[1], control(basket, "search")),
          type: 5,
          data: {
            custom_id: control(basket, "search"),
            components: [
              {
                type: 18,
                component: { type: 4, custom_id: "search", value: "blade" },
              },
            ],
          },
        });
        const rejected = await finish(
          privateInput(members[1], control(basket, "add"), ["900003"]),
        );
        assert.match(rejected.content, /ineligible/);
        basket = await act(members[1], basket, "add", "900001");
        await service.reserves(members[1], eventId, { itemIds: [900002] });
        const stale = await act(members[1], basket, "save");
        assert.match(stale.content, /changed elsewhere/);
        assert.deepEqual(
          (await service.get(members[1], eventId)).signups[0].reserves,
          [900002],
        );
      },
    );
    await context.test(
      "Stale organizer admission never overwrites a newer roster",
      async () => {
        const eventId = await createEvent({ admission: "approval" });
        await act(members[1], await open(eventId, members[1]), "confirm");
        let manager = await open(eventId, members[0], "manage");
        const signup = (await service.get(members[0], eventId)).signups[0];
        manager = await act(members[0], manager, "candidate", signup.id);
        await act(members[2], await open(eventId, members[2]), "confirm");
        const response = await act(members[0], manager, "accept");
        assert.match(response.content, /roster changed/);
        assert.ok(
          (await service.get(members[0], eventId)).signups.every(
            (member) => member.status === "pending",
          ),
        );
      },
    );
    await context.test(
      "Lost audience between acknowledgement and worker execution blocks mutation",
      async () => {
        const eventId = await createEvent();
        const message = await open(eventId, members[1]);
        const payload = privateInput(members[1], control(message, "confirm"));
        await nativeRaidInteraction(payload, database);
        await database.foreverRaidEvent.update({
          where: { id: eventId },
          data: { audience: [members[0].discordId] },
        });
        await assert.rejects(
          service.revision(members[1], eventId),
          /Event not found/,
        );
        await database.foreverRaidNativeWork.update({
          where: { id: payload.id },
          data: { nextAttemptAt: new Date(0) },
        });
        await runNativeRaidWork(database, transport);
        assert.match(
          replies.get(payload.token)!.content,
          /outside your permitted audience/,
        );
        assert.equal(
          await database.foreverRaidSignup.count({ where: { eventId } }),
          0,
        );
      },
    );
    await context.test(
      "Imported players can acknowledge and change attendance through native Discord controls",
      async () => {
        const eventId = await createEvent();
        const character = (await service.characters(members[1])).find(
          (row) => row.game === "forever",
        )!;
        const importing = raidService(database, undefined, {
          importMembership: async () => "member",
        });
        await importing.importSignups(members[0], eventId, {
          source: JSON.stringify({
            id: snowflake(),
            serverId: guildId,
            title: "Synthetic imported event",
            signUps: [
              {
                userId: members[1].discordId,
                name: character.name,
                className: "Warrior",
                specName: "Fury",
                roleName: "Melee",
                status: "primary",
              },
            ],
          }),
          version: (await service.get(members[0], eventId)).version,
          requestKey: randomUUID(),
          confirm: true,
          selections: [
            {
              userId: members[1].discordId,
              characterId: character.id,
              name: character.name,
              className: "Warrior",
              specialization: "Fury",
              role: "damage",
              attendance: "joining",
            },
          ],
        });
        let event = await service.get(members[1], eventId);
        assert.equal(event.signups[0].needsAcknowledgement, true);
        const imported = await database.foreverRaidSignup.findFirstOrThrow({
          where: { eventId, memberId: members[1].id },
        });
        assert.equal(imported.acknowledgedAt, null);
        const preview = await previewRosterPublication(
          members[0],
          eventId,
          {
            requestKey: randomUUID(),
            version: event.version,
            deadline: new Date(
              Date.parse(event.startsAt) - 3600000,
            ).toISOString(),
            preparation: defaultPreparation(event.raidName, event.game),
          },
          database,
        );
        assert.equal(preview.recipients.length, 1);
        assert.equal(
          preview.recipients[0].policyChecksum,
          event.policyChecksum,
        );
        assert.deepEqual(
          await database.foreverRaidSignup.findUniqueOrThrow({
            where: { id: imported.id },
          }),
          imported,
        );
        const prompt = await open(eventId, members[1], "mine");
        assert.match(prompt.embeds[0].description, /signup was imported/);
        await act(members[1], prompt, "acknowledge");
        event = await service.get(members[1], eventId);
        assert.equal(event.signups[0].needsAcknowledgement, false);
        assert.equal(event.signups[0].status, "accepted");
        const absent = await open(eventId, members[1], "absent");
        await act(members[1], absent, "confirm");
        assert.equal(
          (await service.get(members[1], eventId)).signups[0].status,
          "absent",
        );
        await act(members[1], await open(eventId, members[1]), "confirm");
        assert.equal(
          (await service.get(members[1], eventId)).signups[0].status,
          "accepted",
        );
        assert.equal(
          await database.foreverRaidSignup.count({ where: { eventId } }),
          1,
        );
      },
    );
    await context.test(
      "Cached private responses are not replayed after audience revocation",
      async () => {
        const eventId = await createEvent();
        const payload = await publicInput(eventId, members[1], "roster");
        await nativeRaidInteraction(payload, database);
        await database.foreverRaidNativeWork.update({
          where: { id: payload.id },
          data: { nextAttemptAt: new Date(0) },
        });
        await runNativeRaidWork(database, {
          ...transport,
          respond: async (): Promise<void> => {
            throw new NativeResponseError(429, 1);
          },
        });
        await database.foreverRaidEvent.update({
          where: { id: eventId },
          data: { audience: [members[0].discordId] },
        });
        await database.foreverRaidNativeWork.update({
          where: { id: payload.id },
          data: { nextAttemptAt: new Date(0) },
        });
        await runNativeRaidWork(database, transport);
        const response = replies.get(payload.token)!;
        assert.match(response.content, /access could not be verified/);
        assert.deepEqual(response.embeds, []);
      },
    );
    await context.test(
      "Roster publication sends current rules without requiring a prior My signup review",
      async () => {
        const eventId = await createEvent();
        await act(members[1], await open(eventId, members[1]), "confirm");
        await edit(eventId, { description: "Updated rules for this roster" });
        const approvedAt = new Date();
        await database.foreverRaidDiscordPost.update({
          where: { eventId },
          data: {
            visibility: "community",
            confirmedAt: approvedAt,
            approvedAt,
            approvedBy: members[0].discordId,
          },
        });
        const event = await service.get(members[0], eventId);
        const signup = await database.foreverRaidSignup.findFirstOrThrow({
          where: { eventId, memberId: members[1].id },
        });
        assert.notEqual(signup.policyChecksum, event.policyChecksum);
        const publication = {
          requestKey: randomUUID(),
          version: event.version,
          deadline: new Date(
            Date.parse(event.startsAt) - 3600000,
          ).toISOString(),
          preparation: defaultPreparation(event.raidName, event.game),
        };
        const preview = await previewRosterPublication(
          members[0],
          eventId,
          publication,
          database,
        );
        assert.equal(preview.recipients.length, 1);
        assert.equal(
          preview.recipients[0].policyChecksum,
          event.policyChecksum,
        );
        assert.equal(preview.recipients[0].description, event.description);
        await database.foreverMember.update({
          where: { id: members[1].id },
          data: { active: false },
        });
        try {
          await assert.rejects(
            previewRosterPublication(
              members[0],
              eventId,
              publication,
              database,
            ),
            /inactive members/,
          );
          await assert.rejects(
            publishRoster(members[0], eventId, publication, database),
            /inactive members/,
          );
        } finally {
          await database.foreverMember.update({
            where: { id: members[1].id },
            data: { active: true },
          });
        }
        await publishRoster(members[0], eventId, publication, database);
        const published = await service.get(members[0], eventId);
        assert.deepEqual(
          (
            await database.foreverRaidDiscordPost.findUniqueOrThrow({
              where: { eventId },
            })
          ).approvedAt,
          approvedAt,
        );
        assert.equal(published.rosterPublished, true);
        assert.equal(published.signupClosesAt, event.signupClosesAt);
        assert.equal(published.policyChecksum, event.policyChecksum);
        await assert.rejects(
          service.signup(members[0], eventId, {
            acknowledge: true,
            policyChecksum: published.policyChecksum,
            characterId: (await service.characters(members[0])).find(
              (c) => c.game === "forever",
            )!.id,
            role: "damage",
            specialization: "Fury",
          }),
          /Signups have closed/,
        );
        assert.deepEqual(
          await database.foreverRaidSignup.findUniqueOrThrow({
            where: { id: signup.id },
          }),
          signup,
        );
        const dashboard = await rosterDashboard(members[0], eventId, database);
        assert.equal(dashboard.invitations.length, 1);
        const invitation = dashboard.invitations[0];
        assert.equal(invitation.state, "pending");
        assert.equal(invitation.offer.policyChecksum, published.policyChecksum);
        await replyToRoster(
          members[1].discordId,
          {
            requestKey: randomUUID(),
            invitationId: invitation.id,
            version: invitation.version,
            choice: "confirmed",
            reason: "",
          },
          database,
          async () => "member",
        );
        const acknowledged = await database.foreverRaidSignup.findUniqueOrThrow(
          {
            where: { id: signup.id },
          },
        );
        assert.equal(acknowledged.policyChecksum, published.policyChecksum);
        assert.ok(acknowledged.acknowledgedAt);
      },
    );
    await context.test(
      "Roster publication, DM replies, privacy, delivery recovery and locked amendments",
      async () => {
        const eventId = await createEvent();
        await act(members[1], await open(eventId, members[1]), "confirm");
        await act(members[2], await open(eventId, members[2]), "confirm");
        let event = await service.get(members[0], eventId);
        const replacement = event.signups.find(
          (row) => row.character.name === "New Tester",
        )!;
        await service.manage(members[0], eventId, {
          action: "admit",
          version: event.version,
          signupId: replacement.id,
          status: "bench",
        });
        event = await service.get(members[0], eventId);
        const publication = {
          requestKey: randomUUID(),
          version: event.version,
          deadline: new Date(
            Date.parse(event.startsAt) - 3600000,
          ).toISOString(),
          preparation: defaultPreparation(event.raidName, event.game),
        };
        await assert.rejects(
          publishRoster(members[1], eventId, publication, database),
          /organizer/,
        );
        const id = await publishRoster(
          members[0],
          eventId,
          publication,
          database,
        );
        assert.equal(
          await publishRoster(members[0], eventId, publication, database),
          id,
        );
        assert.equal(
          await database.foreverRaidRosterInvitation.count({
            where: { eventId },
          }),
          1,
        );
        await assert.rejects(
          publishRoster(
            members[0],
            eventId,
            { ...publication, deadline: event.startsAt },
            database,
          ),
          /different request/,
        );
        let dashboard = await rosterDashboard(members[0], eventId, database);
        const invitation = dashboard.invitations[0];
        const channel = snowflake(),
          sent: Array<{ id: string; nonce: string; message: NativeMessage }> =
            [];
        const dm: RosterDeliveryTransport = {
          membership: async (_actor, server) => {
            assert.equal(server, guildId);
            return "member";
          },
          open: async () => channel,
          send: async (_channel, message, nonce) => {
            const id = snowflake();
            sent.push({ id, nonce, message });
            return id;
          },
          edit: async (_channel, _id, message) => {
            nativeMessageSchema.parse(message);
          },
          find: async (_channel, nonce) =>
            sent.find((row) => row.nonce === nonce)?.id ?? null,
        };
        for (let count = 0; count < 20; count++)
          if (!(await deliverRosterNotification(database, dm))) break;
        const stored =
          await database.foreverRaidRosterInvitation.findUniqueOrThrow({
            where: { id: invitation.id },
          });
        assert.ok(stored.dmChannelId && stored.dmMessageId);
        function dmInput(action: "confirm" | "decline" | "preparation") {
          const id = snowflake();
          return {
            id,
            token: `rsvp-test-${id}`,
            type: 3 as const,
            application_id: botId,
            user: { id: members[1].discordId },
            channel_id: stored.dmChannelId!,
            message: {
              id: stored.dmMessageId!,
              author: { id: botId, bot: true as const },
              flags: 0,
            },
            data: {
              custom_id: rosterControl(invitation, action),
              component_type: 2 as const,
            },
          };
        }
        const clicked = dmInput("confirm");
        await assert.rejects(
          rosterInteraction(
            { ...clicked, id: snowflake(), user: { id: members[2].discordId } },
            database,
          ),
          /another player/,
        );
        assert.equal((await rosterInteraction(clicked, database)).type, 6);
        assert.equal((await rosterInteraction(clicked, database)).type, 6);
        await database.foreverRaidNativeWork.update({
          where: { id: clicked.id },
          data: { nextAttemptAt: new Date(0) },
        });
        await runNativeRaidWork(database, {
          membership: dm.membership,
          respond: transport.respond,
        });
        assert.match(
          replies.get(clicked.token)!.embeds[0].description,
          /Attendance confirmed/,
        );
        assert.equal(
          await database.foreverRaidRosterResponse.count({
            where: { invitationId: invitation.id },
          }),
          1,
        );
        assert.equal(
          (await rosterDashboard(members[2], eventId, database)).invitations
            .length,
          0,
        );
        const confirmed = await service.get(members[0], eventId);
        await service.manage(members[0], eventId, {
          action: "lock",
          version: confirmed.version,
        });
        const original =
          await database.foreverRaidLootSnapshot.findUniqueOrThrow({
            where: { eventId },
          });
        await replyToRoster(
          members[1].discordId,
          {
            requestKey: randomUUID(),
            invitationId: invitation.id,
            version: invitation.version,
            choice: "declined",
            reason: "Private schedule conflict",
          },
          database,
          async () => "not_member",
        );
        assert.equal(
          (
            await database.foreverRaidLootSnapshot.findUniqueOrThrow({
              where: { eventId },
            })
          ).checksum,
          original.checksum,
        );
        assert.equal(
          (await rosterDashboard(members[2], eventId, database)).invitations
            .length,
          0,
        );
        dashboard = await rosterDashboard(members[0], eventId, database);
        assert.equal(
          dashboard.invitations[0].reason,
          "Private schedule conflict",
        );
        event = await service.get(members[0], eventId);
        const removedSignup = event.signups.find(
          (signup) => signup.isMine === false && signup.status === "accepted",
        )!;
        const amendment = {
          requestKey: randomUUID(),
          version: event.version,
          removedSignupId: removedSignup.id,
          replacementSignupId: replacement.id,
          manualVerified: true,
          reason: "Replacement verified in voice",
        };
        const revision = await amendRoster(
          members[0],
          eventId,
          amendment,
          database,
        );
        assert.equal(revision, 1);
        assert.equal(
          await amendRoster(members[0], eventId, amendment, database),
          1,
        );
        assert.equal(
          (
            await database.foreverRaidLootSnapshot.findUniqueOrThrow({
              where: { eventId },
            })
          ).checksum,
          original.checksum,
        );
        const exported = await service.export(members[0], eventId);
        assert.equal(
          (exported.payload as { schema: string }).schema,
          "forever-raid-loot.v3",
        );
        assert.notEqual(exported.checksum, original.checksum);
        await assert.rejects(
          replyToRoster(
            members[1].discordId,
            {
              requestKey: randomUUID(),
              invitationId: invitation.id,
              version: invitation.version,
              choice: "confirmed",
              reason: "",
            },
            database,
            async () => "member",
          ),
          /no longer active/,
        );
        const retryEvent = await createEvent();
        await act(members[1], await open(retryEvent, members[1]), "confirm");
        const retryView = await service.get(members[0], retryEvent);
        const retryPublication = {
          ...publication,
          requestKey: randomUUID(),
          version: retryView.version,
        };
        await publishRoster(members[0], retryEvent, retryPublication, database);
        const retryInvite = (
          await rosterDashboard(members[0], retryEvent, database)
        ).invitations[0];
        // Isolate this event's job from older, valid notification updates.
        await database.foreverRaidNotification.updateMany({
          where: { invitationId: { not: retryInvite.id }, status: "pending" },
          data: { nextAttemptAt: new Date(Date.now() + 3600000) },
        });
        await deliverRosterNotification(database, {
          ...dm,
          send: async () => {
            throw new RosterDeliveryError(403, 50007);
          },
        });
        assert.equal(
          (await rosterDashboard(members[0], retryEvent, database))
            .invitations[0].delivery,
          "blocked",
        );
        assert.equal(
          (await rosterDashboard(members[0], retryEvent, database))
            .invitations[0].state,
          "pending",
        );
        await replyToRoster(
          members[1].discordId,
          {
            requestKey: randomUUID(),
            invitationId: retryInvite.id,
            version: retryInvite.version,
            choice: "confirmed",
            reason: "",
          },
          database,
          dm.membership,
        );
        assert.equal(
          (await rosterDashboard(members[1], retryEvent, database))
            .invitations[0].state,
          "confirmed",
        );
        await manuallyConfirmRoster(
          members[0],
          retryInvite.id,
          "Already personally confirmed",
          database,
        );
        assert.equal(
          (await rosterDashboard(members[1], retryEvent, database))
            .invitations[0].state,
          "confirmed",
        );
        await reconcileRosterInvitations(database);
      },
    );
    await context.test(
      "Roster replies use the invitation's server in both guilds and preserve deadline/privacy failures",
      async () => {
        const otherGuild = "1557000000000000050",
          otherChannel = "1557000000000000051";
        const originalDestinations =
          process.env.FOREVER_RAIDS_DISCORD_DESTINATIONS;
        process.env.FOREVER_RAIDS_DISCORD_DESTINATIONS = JSON.stringify([
          {
            guildId: otherGuild,
            channelId: otherChannel,
            label: "Second RSVP server",
          },
        ]);
        try {
          for (const currentGuild of [guildId, otherGuild]) {
            const eventId = await createEvent();
            await act(members[1], await open(eventId, members[1]), "confirm");
            await database.foreverRaidDiscordPost.update({
              where: { eventId },
              data: {
                guildId: currentGuild,
                channelId: currentGuild === guildId ? channelId : otherChannel,
              },
            });
            const event = await service.get(members[0], eventId);
            await publishRoster(
              members[0],
              eventId,
              {
                requestKey: randomUUID(),
                version: event.version,
                deadline: new Date(
                  Date.parse(event.startsAt) - 3600000,
                ).toISOString(),
                preparation: defaultPreparation(event.raidName, event.game),
              },
              database,
            );
            const invite = (
              await rosterDashboard(members[1], eventId, database)
            ).invitations[0];
            await replyToRoster(
              members[1].discordId,
              {
                requestKey: randomUUID(),
                invitationId: invite.id,
                version: invite.version,
                choice: "confirmed",
                reason: "",
              },
              database,
              async (actor, checkedGuild) => {
                assert.equal(actor, members[1].discordId);
                assert.equal(checkedGuild, currentGuild);
                return "member";
              },
            );
            assert.equal(
              (await rosterDashboard(members[0], eventId, database))
                .invitations[0].state,
              "confirmed",
            );
            await edit(eventId, { localStart: "2035-11-06T19:00" });
            await reconcileRosterInvitations(database);
            assert.equal(
              (await rosterDashboard(members[0], eventId, database))
                .invitations[0].state,
              "changed",
            );
            await assert.rejects(
              replyToRoster(
                members[1].discordId,
                {
                  requestKey: randomUUID(),
                  invitationId: invite.id,
                  version: invite.version,
                  choice: "confirmed",
                  reason: "",
                },
                database,
                async () => "member",
              ),
              /details changed/,
            );
          }
        } finally {
          process.env.FOREVER_RAIDS_DISCORD_DESTINATIONS = originalDestinations;
        }
      },
    );
    await context.test(
      "Ambiguous DM sends reconcile a receipt without a duplicate; channel-only and expired invitations stay honest",
      async () => {
        const eventId = await createEvent();
        await act(members[1], await open(eventId, members[1]), "confirm");
        const event = await service.get(members[0], eventId);
        await publishRoster(
          members[0],
          eventId,
          {
            requestKey: randomUUID(),
            version: event.version,
            deadline: new Date(Date.now() + 1800).toISOString(),
            preparation: defaultPreparation(event.raidName, event.game),
          },
          database,
        );
        const invite = (await rosterDashboard(members[0], eventId, database))
          .invitations[0];
        await database.foreverRaidNotification.updateMany({
          where: {
            invitationId: { not: invite.id },
            status: { in: ["pending", "sending", "uncertain"] },
          },
          data: { nextAttemptAt: new Date(Date.now() + 3600000) },
        });
        const channel = snowflake(),
          receipt = snowflake();
        let sends = 0;
        const ambiguous: RosterDeliveryTransport = {
          membership: async () => "member",
          open: async () => channel,
          edit: async () => {},
          find: async () => receipt,
          send: async () => {
            sends++;
            throw new TypeError(
              "Connection lost after Discord accepted the message",
            );
          },
        };
        await deliverRosterNotification(database, ambiguous);
        assert.equal(
          (await rosterDashboard(members[0], eventId, database)).invitations[0]
            .delivery,
          "uncertain",
        );
        await database.foreverRaidNotification.updateMany({
          where: { invitationId: invite.id },
          data: { nextAttemptAt: new Date(0) },
        });
        await deliverRosterNotification(database, ambiguous);
        assert.equal(sends, 1);
        assert.equal(
          (await rosterDashboard(members[0], eventId, database)).invitations[0]
            .delivery,
          "sent",
        );
        await new Promise((resolve) => setTimeout(resolve, 1900));
        await assert.rejects(
          replyToRoster(
            members[1].discordId,
            {
              requestKey: randomUUID(),
              invitationId: invite.id,
              version: invite.version,
              choice: "confirmed",
              reason: "",
            },
            database,
            async () => "member",
          ),
          /deadline passed/,
        );
        await reconcileRosterInvitations(database);
        assert.equal(
          (await rosterDashboard(members[0], eventId, database)).invitations[0]
            .state,
          "expired",
        );
        const oldNote = await database.foreverRaidRosterResponse.create({
          data: {
            invitationId: invite.id,
            requestKey: randomUUID(),
            actorId: members[1].discordId,
            version: 1,
            choice: "declined",
            reason: "Expired private note",
            createdAt: new Date("2020-01-01"),
          },
        });
        await database.foreverRaidRosterResponse.update({
          where: { id: oldNote.id },
          data: { reason: null },
        });
        await assert.rejects(
          database.foreverRaidRosterResponse.update({
            where: { id: oldNote.id },
            data: { choice: "confirmed" },
          }),
          /append-only/,
        );
      },
    );
  } finally {
    for (const [key, value] of Object.entries(oldSettings)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await database.$disconnect();
    await pool.end();
    await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.end();
  }
});
