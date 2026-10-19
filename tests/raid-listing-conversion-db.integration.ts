import "../scripts/env";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { Pool } from "pg";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  listingBotId,
  listingGuildId,
  listingForums,
  groupListingDraft,
} from "../lib/discord-listings/contracts";
import {
  planGroupListingConversion,
  convertGroupListing,
  groupConversionEvent,
} from "../lib/raids/listing-conversion";
import { raidService } from "../lib/raids/service";
import {
  deliverRaidPosts,
  type RaidDiscordRequest,
} from "../lib/raids/discord-delivery";
import { validateNativeSource } from "../lib/raids/native-interactions";
import { nativeInputSchema, nativeTarget } from "../lib/raids/native-contracts";

test("Listing conversion PostgreSQL: in-place signup, unchanged private prototype and recovery", async (context) => {
  const url = new URL(process.env.DATABASE_URL || "postgresql://invalid");
  if (
    !["127.0.0.1", "localhost"].includes(url.hostname) ||
    url.port !== "55432"
  )
    throw new Error(
      "Conversion tests require the isolated local PostgreSQL instance.",
    );
  const schema = `conversion_test_${randomUUID().replaceAll("-", "")}`;
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
  const organizerId = "407839813769756693";
  const environment = {
    FOREVER_RAIDS_ENABLED: "true",
    FOREVER_RAIDS_ACCESS_MODE: "members",
    FOREVER_RAIDS_DISCORD_ENABLED: "true",
    FOREVER_RAIDS_NATIVE_ENABLED: "true",
    FOREVER_RAIDS_PILOT_DISCORD_IDS: organizerId,
    DISCORD_GUILD_ID: listingGuildId,
    DISCORD_APPLICATION_ID: listingBotId,
    DISCORD_BOT_TOKEN: "synthetic-test-only",
    COMMUNITY_AUTH_SECRET: "s".repeat(64),
    FOREVER_RAIDS_DISCORD_CHANNEL_ID: "1556000000000000011",
    FOREVER_RAIDS_BETA_DISCORD_CHANNEL_ID: "1556000000000000012",
    FOREVER_RAIDS_PUBLIC_ORIGIN: "http://127.0.0.1:19300",
    FOREVER_RAIDS_DISCORD_DESTINATIONS: "[]",
    FOREVER_RAIDS_DISCORD_FEEDBACK_GUILD_IDS: "",
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
          ([1, 2, 13, 35, 36].includes(number) ||
            (number >= 14 && number <= 33))
        );
      })
      .sort();
    for (const migration of migrations)
      await pool.query(
        await readFile(`prisma/migrations/${migration}`, "utf8"),
      );
    const member = await database.foreverMember.create({
      data: { discordId: organizerId, displayName: "Test organizer" },
    });
    const outsider = await database.foreverMember.create({
      data: { discordId: "1556000000000000099", displayName: "Test member" },
    });
    const group = await database.foreverGroup.create({
      data: {
        title: "Public future questing",
        region: "EU",
        faction: "Alliance",
        gameRuleset: "PvP",
        activity: "Questing",
        description: "Meet in Northshire at 08:30. Public source details.",
        contactDiscord: "test-organizer",
        startsAt: new Date("2027-11-05T07:30:00Z"),
        expiresAt: new Date("2027-11-05T13:30:00Z"),
        status: "approved",
      },
    });
    const draft = groupListingDraft(
      {
        ...group,
        region: "EU",
        faction: "Alliance",
        gameRuleset: "PvP",
        activity: "Questing",
        startsAt: group.startsAt.toISOString(),
      },
      group.id,
    );
    const threadId = "1555464828921978970";
    await database.foreverListingDiscordJob.create({
      data: {
        kind: "group",
        entityId: group.id,
        ...draft,
        status: "posted",
        threadId,
      },
    });
    const input = {
      groupId: group.id,
      organizerDiscordId: member.discordId,
      localFinish: "2027-11-05T22:30",
      capacity: 5,
      admission: "open" as const,
      target: "Northshire / Goldshire leveling",
    };
    const service = raidService(database);
    const character = await service.addCharacter(member, {
      name: "Private Character",
      game: "forever",
      realm: "",
      className: "Warrior",
      specialization: "Fury",
      region: "EU",
      faction: "Alliance",
      ruleset: "PvP",
    });
    const prototype = await raidService(database, undefined, {
      deferDiscordPublication: true,
    }).create(member, {
      ...groupConversionEvent(group, input),
      requestKey: randomUUID(),
      admission: "approval",
      title: "Private prototype",
    });
    await service.signup(member, prototype, {
      characterId: character.id,
      specialization: "Fury",
      role: "damage",
      acknowledge: true,
    });
    const prototypeBefore = await database.foreverRaidEvent.findUniqueOrThrow({
      where: { id: prototype },
      include: { signups: true, audits: true },
    });
    let administrator = true;
    let failAfterPatch = false;
    let patches = 0;
    const parent = {
      id: listingForums.Alliance.pvp,
      type: 15,
      guild_id: listingGuildId,
      name: "lfg-pvp",
      position: 1,
      parent_id: null,
      permission_overwrites: [],
      nsfw: false,
    };
    let thread = {
      id: threadId,
      type: 11,
      guild_id: listingGuildId,
      parent_id: parent.id,
      owner_id: listingBotId,
      name: group.title,
      thread_metadata: { archived: false, locked: false },
    };
    let message: unknown = {
      id: threadId,
      channel_id: threadId,
      author: { id: listingBotId, bot: true },
      content: draft.content,
      embeds: [],
      attachments: [],
      components: [],
    };
    const permissions = (
      (1n << 10n) |
      (1n << 14n) |
      (1n << 15n) |
      (1n << 16n) |
      (1n << 38n)
    ).toString();
    const request: RaidDiscordRequest = async (
      route,
      method = "GET",
      body,
    ): Promise<unknown> => {
      if (route === "/users/@me") return { id: listingBotId, bot: true };
      if (route === `/guilds/${listingGuildId}`)
        return {
          id: listingGuildId,
          name: "Synthetic server",
          owner_id: administrator ? member.discordId : listingBotId,
        };
      if (route === `/guilds/${listingGuildId}/roles`)
        return [
          {
            id: listingGuildId,
            name: "@everyone",
            position: 0,
            permissions,
            managed: false,
            mentionable: false,
          },
        ];
      if (route === `/guilds/${listingGuildId}/members/${listingBotId}`)
        return { user: { id: listingBotId, bot: true }, roles: [] };
      if (route === `/guilds/${listingGuildId}/members/${member.discordId}`)
        return { user: { id: member.discordId, bot: false }, roles: [] };
      if (route === `/channels/${parent.id}`) return parent;
      if (route === `/channels/${threadId}`) {
        if (method === "PATCH") {
          assert.deepEqual(body, { archived: false });
          thread = {
            ...thread,
            thread_metadata: { archived: false, locked: false },
          };
        }
        return thread;
      }
      if (route === `/channels/${threadId}/messages/${threadId}`) {
        if (method === "PATCH") {
          patches++;
          message = {
            ...(body as Record<string, unknown>),
            id: threadId,
            channel_id: threadId,
            author: { id: listingBotId, bot: true },
            attachments: [],
          };
          if (failAfterPatch) {
            failAfterPatch = false;
            throw new Error(
              "Synthetic lost response after Discord applied the edit",
            );
          }
        }
        return message;
      }
      throw new Error(`Unexpected test route: ${route}`);
    };

    await context.test(
      "Unauthorized and stale previews perform no writes",
      async () => {
        administrator = false;
        await assert.rejects(
          planGroupListingConversion(database, input, request),
          /administrator/,
        );
        administrator = true;
        const plan = await planGroupListingConversion(database, input, request);
        assert.equal(plan.eventId, null);
        assert.equal(await database.foreverRaidEvent.count(), 1);
        assert.equal(patches, 0);
        await database.foreverGroup.update({
          where: { id: group.id },
          data: { description: "Changed source" },
        });
        await assert.rejects(
          convertGroupListing(
            database,
            { ...input, expectedSourceChecksum: plan.sourceChecksum },
            request,
          ),
          /changed after preview/,
        );
        await database.foreverGroup.update({
          where: { id: group.id },
          data: { description: group.description },
        });
        assert.equal(await database.foreverRaidEvent.count(), 1);
      },
    );

    await context.test(
      "Uncertain in-place edits resume without another event or message",
      async () => {
        failAfterPatch = true;
        await assert.rejects(
          convertGroupListing(database, input, request),
          /lost response/,
        );
        assert.equal(await database.foreverRaidEvent.count(), 2);
        const pending = await database.foreverRaidDiscordPost.findFirstOrThrow({
          where: { channelId: threadId },
        });
        assert.equal(pending.status, "failed");
        assert.equal(pending.lastError, "listing_conversion_pending");
        assert.equal(pending.approvedAt, null);
        const id = await convertGroupListing(database, input, request);
        const post = await database.foreverRaidDiscordPost.findUniqueOrThrow({
          where: { eventId: id },
        });
        assert.equal(post.messageId, threadId);
        assert.equal(post.status, "sent");
        assert.ok(post.approvedAt);
        assert.equal(post.visibility, "community");
        const event = await service.get(outsider, id);
        assert.equal(event.signups.length, 0);
        assert.equal(event.admission, "open");
        assert.equal(event.capacity, 5);
        assert.equal(event.endsAt, "2027-11-05T21:30:00.000Z");
        assert.equal(await convertGroupListing(database, input, request), id);
        assert.equal(await database.foreverRaidEvent.count(), 2);
        assert.equal(patches, 2);
        assert.equal(
          (
            await database.foreverGroup.findUniqueOrThrow({
              where: { id: group.id },
            })
          ).status,
          "hidden",
        );
        assert.equal(
          (
            await database.foreverListingDiscordJob.findUniqueOrThrow({
              where: { kind_entityId: { kind: "group", entityId: group.id } },
            })
          ).status,
          "removed",
        );
        assert.deepEqual(
          await database.foreverRaidEvent.findUniqueOrThrow({
            where: { id: prototype },
            include: { signups: true, audits: true },
          }),
          prototypeBefore,
        );
        await assert.rejects(service.get(outsider, prototype), /not found/);
        await assert.rejects(
          convertGroupListing(
            database,
            {
              ...input,
              capacity: 10,
              roleCaps: { tank: 2, healer: 2, damage: 6 },
            },
            request,
          ),
          /does not match/,
        );
        assert.equal(
          await database.foreverRaidAudit.count({
            where: { eventId: id, action: "listing_conversion_activated" },
          }),
          1,
        );
      },
    );

    await context.test(
      "Native controls bind to the original forum starter and roster updates reopen archived threads",
      async () => {
        const post = await database.foreverRaidDiscordPost.findFirstOrThrow({
          where: { channelId: threadId },
        });
        const target = nativeTarget(`nraid:e:${post.eventId}:join`);
        const interaction = nativeInputSchema.parse({
          id: "1556000000000000022",
          type: 3,
          application_id: listingBotId,
          guild_id: listingGuildId,
          channel_id: threadId,
          member: { user: { id: outsider.discordId, bot: false } },
          message: {
            id: threadId,
            author: { id: listingBotId, bot: true },
            flags: 0,
          },
          data: { custom_id: `nraid:e:${post.eventId}:join` },
        });
        assert.equal(
          await validateNativeSource(database, interaction, target),
          post.eventId,
        );
        await assert.rejects(
          validateNativeSource(
            database,
            { ...interaction, channel_id: parent.id },
            target,
          ),
          /unavailable/,
        );
        const publicCharacter = await service.addCharacter(outsider, {
          name: "Public Character",
          game: "forever",
          realm: "",
          className: "Rogue",
          specialization: "Subtlety",
          region: "EU",
          faction: "Alliance",
          ruleset: "PvP",
        });
        await service.signup(outsider, post.eventId, {
          characterId: publicCharacter.id,
          specialization: "Subtlety",
          role: "damage",
          acknowledge: true,
        });
        thread = {
          ...thread,
          thread_metadata: { archived: true, locked: false },
        };
        const settings = (
          await planGroupListingConversion(database, input, request)
        ).settings;
        assert.equal(await deliverRaidPosts(database, settings, request), 1);
        assert.equal(thread.thread_metadata.archived, false);
        const current = await service.get(outsider, post.eventId);
        assert.equal(current.signups[0].status, "registered");
        assert.equal(
          (
            await database.foreverRaidDiscordPost.findUniqueOrThrow({
              where: { eventId: post.eventId },
            })
          ).deliveredVersion,
          current.version,
        );
        assert.equal(current.discord?.inSync, true);
      },
    );
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await database.$disconnect();
    await pool.end();
    await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.end();
  }
});
