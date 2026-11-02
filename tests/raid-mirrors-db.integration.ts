import "../scripts/env";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { Pool } from "pg";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { z } from "zod";
import { raidService } from "../lib/raids/service";
import { eventSettingsSchema } from "../lib/raids/contracts";
import {
  registerRaidMirror,
  deliverRaidMirrors,
} from "../lib/raids/discord-mirrors";
import {
  RaidDiscordError,
  type RaidDiscordRequest,
} from "../lib/raids/discord-delivery";

test("Linked Discord posts persist, follow event edits and never recreate deleted messages", async (context) => {
  const url = new URL(process.env.DATABASE_URL || "postgresql://invalid");
  if (
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    url.port !== "55432"
  )
    throw new Error("Mirror tests require isolated local PostgreSQL.");
  const schema = `raid_mirrors_${randomUUID().replaceAll("-", "")}`;
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
  const organizerId = "1557000000000000001",
    botId = "1557000000000000011";
  const sourceGuild = "1554316932948172940",
    guildId = "1411533815356194968";
  const channelId = "1557000000000000012",
    messageId = "1557000000000000013";
  const origin = "http://127.0.0.1:19300";
  const environment = {
    FOREVER_RAIDS_ENABLED: "true",
    FOREVER_RAIDS_ACCESS_MODE: "members",
    FOREVER_RAIDS_DISCORD_ENABLED: "false",
    DISCORD_GUILD_ID: sourceGuild,
    DISCORD_APPLICATION_ID: botId,
    DISCORD_BOT_TOKEN: "synthetic-mirror-test-token",
    FOREVER_RAIDS_DISCORD_CHANNEL_ID: "1557000000000000014",
    FOREVER_RAIDS_PUBLIC_ORIGIN: origin,
    FOREVER_RAIDS_DISCORD_DESTINATIONS: "[]",
    FOREVER_RAIDS_DISCORD_FEEDBACK_GUILD_IDS: guildId,
  };
  const previous = new Map(
    Object.keys(environment).map((key) => [key, process.env[key]]),
  );
  Object.assign(process.env, environment);
  try {
    const migrations = (await readdir("prisma/migrations"))
      .filter((name) => {
        const number = Number(name.slice(0, 3));
        return (
          name.endsWith(".sql") &&
          ([1, 2, 13, 35, 36, 37, 38].includes(number) ||
            (number >= 14 && number <= 33))
        );
      })
      .sort();
    for (const name of migrations)
      await pool.query(await readFile(`prisma/migrations/${name}`, "utf8"));
    const organizer = await database.foreverMember.create({
      data: {
        discordId: organizerId,
        displayName: "Synthetic mirror organizer",
      },
    });
    const service = raidService(database, undefined, {
      deferDiscordPublication: true,
    });
    const settings = eventSettingsSchema.parse({
      game: "forever",
      realm: "",
      eventType: "questing",
      title: "Synthetic linked event",
      raidName: "Northshire questing",
      region: "EU",
      faction: "Alliance",
      ruleset: "PvP",
      localStart: "2035-11-05T08:30",
      durationMinutes: 840,
      signupMinutesBefore: 0,
      reserveMinutesBefore: 0,
      capacity: 5,
      roleCaps: { tank: 1, healer: 1, damage: 3 },
      admission: "open",
      description: "Synthetic isolated integration test",
      catalogId: null,
      reserveLimit: 0,
      reserveLimits: null,
      allowDuplicates: false,
      hardReserves: [],
    });
    const eventId = await service.create(organizer, {
      ...settings,
      requestKey: randomUUID(),
    });
    const character = await service.addCharacter(organizer, {
      game: "forever",
      realm: "",
      name: "Mirror Warrior",
      className: "Warrior",
      specialization: "Protection",
      region: "EU",
      faction: "Alliance",
      ruleset: "PvP",
    });
    await service.signup(organizer, eventId, {
      characterId: character.id,
      specialization: "Protection",
      role: "tank",
      attendance: "joining",
      acknowledge: true,
    });
    const initial = await database.foreverRaidEvent.findUniqueOrThrow({
      where: { id: eventId },
    });
    await database.foreverRaidDiscordPost.create({
      data: {
        eventId,
        guildId: sourceGuild,
        channelId: "1557000000000000014",
        messageId: "1557000000000000015",
        origin,
        visibility: "community",
        confirmedAt: new Date(),
        desiredVersion: initial.version,
      },
    });
    process.env.FOREVER_RAIDS_DISCORD_ENABLED = "true";
    const target = { eventId, guildId, channelId, messageId };
    const panelSchema = z.object({
      embeds: z.array(
        z.object({
          url: z.string(),
          fields: z.array(z.object({ name: z.string(), value: z.string() })),
        }),
      ),
      components: z.array(
        z.object({
          type: z.literal(1),
          components: z.array(
            z.object({
              type: z.literal(2),
              style: z.literal(5),
              url: z.string(),
            }),
          ),
        }),
      ),
    });
    type CapturedPanel = z.infer<typeof panelSchema>;
    const patches: CapturedPanel[] = [];
    let foreignAuthor = false,
      removed = false,
      permissionDenied = false;
    let patchError: number | null = null;
    let onPatch: (() => Promise<void>) | null = null;
    const permissions = (
      (1n << 10n) |
      (1n << 11n) |
      (1n << 14n) |
      (1n << 15n) |
      (1n << 16n)
    ).toString();
    const request: RaidDiscordRequest = async (
      route,
      method = "GET",
      body,
    ): Promise<unknown> => {
      assert.notEqual(
        method,
        "POST",
        "Mirror workers must never create messages",
      );
      if (route === `/channels/${channelId}/messages/${messageId}`) {
        if (removed) throw new RaidDiscordError(404);
        if (method === "PATCH") {
          if (patchError !== null) {
            const code = patchError;
            patchError = null;
            throw new RaidDiscordError(code);
          }
          patches.push(panelSchema.parse(body));
          const change = onPatch;
          onPatch = null;
          if (change) await change();
        }
        return {
          id: messageId,
          channel_id: channelId,
          author: { id: foreignAuthor ? organizerId : botId, bot: true },
          embeds: [{ url: `${origin}/raids/${eventId}` }],
        };
      }
      assert.equal(method, "GET");
      if (route === "/users/@me")
        return { id: botId, username: "SyntheticBot", bot: true };
      if (route === `/channels/${channelId}`)
        return {
          id: channelId,
          guild_id: guildId,
          name: "synthetic-linked-events",
          type: 0,
          position: 0,
          parent_id: null,
          nsfw: false,
          permission_overwrites: [],
        };
      if (route === `/guilds/${guildId}`)
        return {
          id: guildId,
          name: "Synthetic target guild",
          owner_id: organizerId,
        };
      if (route === `/guilds/${guildId}/roles`)
        return [
          {
            id: guildId,
            name: "everyone",
            position: 0,
            permissions: permissionDenied ? "0" : permissions,
            managed: false,
            mentionable: false,
          },
        ];
      if (route === `/guilds/${guildId}/members/${botId}`)
        return { user: { id: botId, bot: true }, roles: [] };
      if (route === `/guilds/${guildId}/members/${organizerId}`)
        return { user: { id: organizerId, bot: false }, roles: [] };
      throw new Error("Unexpected isolated Discord route");
    };
    async function due(): Promise<void> {
      await database.foreverRaidDiscordMirror.updateMany({
        where: { eventId },
        data: { nextAttemptAt: new Date(0) },
      });
    }
    function latestField(name: string): string {
      const field = patches
        .at(-1)
        ?.embeds.flatMap((embed) => embed.fields)
        .find((entry) => entry.name === name);
      assert.ok(field);
      return field.value;
    }
    await context.test(
      "registration is previewable, idempotent and rejects private or foreign content",
      async () => {
        await registerRaidMirror(database, target, false, request);
        assert.equal(await database.foreverRaidDiscordMirror.count(), 0);
        foreignAuthor = true;
        await assert.rejects(
          registerRaidMirror(database, target, true, request),
          /identity_mismatch/,
        );
        foreignAuthor = false;
        await database.foreverRaidDiscordPost.update({
          where: { eventId },
          data: { visibility: "private" },
        });
        await assert.rejects(
          registerRaidMirror(database, target, true, request),
          /public_primary/,
        );
        await database.foreverRaidDiscordPost.update({
          where: { eventId },
          data: { visibility: "community" },
        });
        const before = await database.foreverRaidEvent.findUniqueOrThrow({
          where: { id: eventId },
          include: { signups: true },
        });
        await registerRaidMirror(database, target, true, request);
        await registerRaidMirror(database, target, true, request);
        assert.equal(await database.foreverRaidDiscordMirror.count(), 1);
        assert.equal(
          await database.foreverRaidAudit.count({
            where: { eventId, action: "discord_mirror_attached" },
          }),
          1,
        );
        assert.deepEqual(
          await database.foreverRaidEvent.findUniqueOrThrow({
            where: { id: eventId },
            include: { signups: true },
          }),
          before,
        );
      },
    );
    await context.test(
      "initial delivery and durable unchanged polls do not duplicate updates",
      async () => {
        await due();
        assert.equal(await deliverRaidMirrors(database, () => request), 1);
        assert.match(latestField("Finish"), /14h/);
        assert.match(latestField("Roster"), /1 signed up/);
        const count = patches.length;
        await due();
        assert.equal(await deliverRaidMirrors(database, () => request), 0);
        assert.equal(patches.length, count);
      },
    );
    await context.test(
      "duration edits enqueue and update the same message without altering the roster",
      async () => {
        const rosterBefore = await database.foreverRaidSignup.findMany({
          where: { eventId },
        });
        const before = await service.get(organizer, eventId);
        await service.manage(organizer, eventId, {
          action: "edit",
          version: before.version,
          settings: { ...settings, durationMinutes: 720 },
        });
        const event = await service.get(organizer, eventId);
        const mirror = await database.foreverRaidDiscordMirror.findFirstOrThrow(
          { where: { eventId } },
        );
        assert.equal(mirror.desiredVersion, event.version);
        assert.ok(mirror.deliveredVersion < mirror.desiredVersion);
        await due();
        assert.equal(await deliverRaidMirrors(database, () => request), 1);
        assert.equal(
          latestField("Finish"),
          `<t:${Date.parse(event.endsAt) / 1000}:f>\n12h`,
        );
        assert.deepEqual(
          await database.foreverRaidSignup.findMany({ where: { eventId } }),
          rosterBefore,
        );
      },
    );
    await context.test(
      "an edit racing with delivery is not lost and concurrent workers claim once",
      async () => {
        const before = await service.get(organizer, eventId);
        await service.manage(organizer, eventId, {
          action: "edit",
          version: before.version,
          settings: { ...settings, durationMinutes: 660 },
        });
        onPatch = async (): Promise<void> => {
          const current = await service.get(organizer, eventId);
          await service.manage(organizer, eventId, {
            action: "edit",
            version: current.version,
            settings: { ...settings, durationMinutes: 600 },
          });
        };
        await due();
        await deliverRaidMirrors(database, () => request);
        const changed =
          await database.foreverRaidDiscordMirror.findFirstOrThrow({
            where: { eventId },
          });
        assert.ok(changed.desiredVersion > changed.deliveredVersion);
        await due();
        const results = await Promise.all([
          deliverRaidMirrors(database, () => request),
          deliverRaidMirrors(database, () => request),
        ]);
        assert.equal(
          results.reduce((sum, count) => sum + count, 0),
          1,
        );
        assert.match(latestField("Finish"), /10h/);
      },
    );
    await context.test(
      "transient failures persist for retry and permissions fail closed",
      async () => {
        const current = await service.get(organizer, eventId);
        await service.manage(organizer, eventId, {
          action: "edit",
          version: current.version,
          settings: { ...settings, durationMinutes: 540 },
        });
        patchError = 429;
        await due();
        await deliverRaidMirrors(database, () => request);
        const failed = await database.foreverRaidDiscordMirror.findFirstOrThrow(
          { where: { eventId } },
        );
        assert.equal(failed.status, "pending");
        assert.equal(failed.lastError, "discord_http_429");
        await due();
        assert.equal(await deliverRaidMirrors(database, () => request), 1);
        permissionDenied = true;
        await due();
        await deliverRaidMirrors(database, () => request);
        assert.equal(
          (
            await database.foreverRaidDiscordMirror.findFirstOrThrow({
              where: { eventId },
            })
          ).status,
          "failed",
        );
        permissionDenied = false;
        await registerRaidMirror(database, target, true, request);
      },
    );
    await context.test(
      "deleted messages stay deleted and stop polling",
      async () => {
        removed = true;
        await due();
        assert.equal(await deliverRaidMirrors(database, () => request), 0);
        const mirror = await database.foreverRaidDiscordMirror.findFirstOrThrow(
          { where: { eventId } },
        );
        assert.equal(mirror.status, "failed");
        assert.equal(mirror.lastError, "discord_post_removed");
        await due();
        assert.equal(await deliverRaidMirrors(database, () => request), 0);
      },
    );
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await database.$disconnect();
    await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.end();
  }
});
