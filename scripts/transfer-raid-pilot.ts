import "./env";
import { parseArgs } from "node:util";
import { spawn } from "node:child_process";
import { z } from "zod";
import { Client } from "pg";
import { db } from "../lib/db";
import {
  characterSchema,
  storedCharacterSchema,
  classes,
  signupRoles,
} from "../lib/raids/contracts";
import { eventTypes } from "../lib/raids/event-types";
import { pilotDiscordIds } from "../lib/raids/config";
import { jsonChecksum } from "../lib/raids/json";

const id = z.string().regex(/^[a-z0-9]{20,40}$/),
  snowflake = z.string().regex(/^\d{17,20}$/),
  date = z.iso.datetime();
const payloadSchema = z
  .object({
    format: z.literal("private-raid-pilot-transfer.v1"),
    event: z
      .object({
        id,
        organizerId: id,
        requestKey: z.uuid(),
        requestHash: z.string().regex(/^[a-f0-9]{64}$/),
        policyRevision: z.number().int().nonnegative().default(0),
        audience: z.array(snowflake).min(1).max(100),
        game: z.enum(["forever", "tbc"]),
        realm: z.string().max(80),
        eventType: z.enum(eventTypes),
        title: z.string().max(120),
        raidName: z.string().max(120),
        region: z.enum(["EU", "NA", "OCE"]),
        faction: z.enum(["Alliance", "Horde"]),
        ruleset: z.enum(["PvP", "PvE", "RP"]),
        description: z.string().max(4000),
        startsAt: date,
        endsAt: date,
        signupClosesAt: date,
        reservesCloseAt: date,
        createdAt: date,
        capacity: z.number().int().min(1).max(100),
        roleCaps: z.object({
          tank: z.number().int().nonnegative(),
          healer: z.number().int().nonnegative(),
          damage: z.number().int().nonnegative(),
        }),
        admission: z.enum(["automatic", "approval", "open"]),
        catalogId: z.null(),
        reserveLimit: z.literal(0),
        reserveLimits: z.null(),
        allowDuplicates: z.literal(false),
        hardReserves: z.array(z.never()),
        status: z.literal("open"),
        version: z.number().int().positive(),
      })
      .strict(),
    members: z
      .array(
        z
          .object({
            id,
            discordId: snowflake,
            displayName: z.string().max(200),
            active: z.boolean(),
            sessionVersion: z.number().int().positive(),
            createdAt: date,
          })
          .strict(),
      )
      .min(1)
      .max(100),
    characters: z
      .array(
        z
          .object({
            id,
            memberId: id,
            name: z.string().max(40),
            game: z.enum(["forever", "tbc"]),
            realm: z.string().max(80),
            className: z.enum(classes),
            specialization: characterSchema.shape.specialization.nullable(),
            region: z.string(),
            faction: z.string(),
            ruleset: z.string(),
            createdAt: date,
          })
          .strict(),
      )
      .max(2000),
    signups: z
      .array(
        z
          .object({
            id,
            eventId: id,
            memberId: id,
            characterId: id,
            character: storedCharacterSchema,
            role: z.enum(signupRoles),
            status: z.enum([
              "accepted",
              "registered",
              "pending",
              "bench",
              "withdrawn",
            ]),
            reserves: z.array(z.never()),
            policyChecksum: z.string().regex(/^[a-f0-9]{64}$/),
            acknowledgedAt: date,
            createdAt: date,
          })
          .strict(),
      )
      .max(100),
    audits: z
      .array(
        z
          .object({
            id,
            eventId: id,
            actorId: z.string().max(100),
            action: z.string().max(100),
            details: z.record(z.string(), z.unknown()),
            createdAt: date,
          })
          .strict(),
      )
      .max(2000),
    post: z
      .object({
        eventId: id,
        guildId: snowflake,
        channelId: snowflake,
        messageId: snowflake,
        visibility: z.literal("private"),
        label: z.string().max(80),
      })
      .strict(),
  })
  .strict();
async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      event: { type: "string" },
      host: { type: "string" },
      import: { type: "boolean", default: false },
    },
  });
  const url = new URL(process.env.DATABASE_URL || "");
  if (values.import) {
    if (
      process.platform !== "linux" ||
      process.getuid?.() !== 0 ||
      process.cwd() !== "/home/wow-forever-discord" ||
      url.username !== "forever_web" ||
      !["localhost", "127.0.0.1"].includes(url.hostname)
    )
      throw new Error(
        "Import requires the production project and isolated database role.",
      );
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of process.stdin) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += buffer.length;
      if (size > 1000000) throw new Error("Transfer is too large.");
      chunks.push(buffer);
    }
    const data = payloadSchema.parse(
      JSON.parse(Buffer.concat(chunks).toString("utf8")),
    );
    if (
      !data.event.audience.every((discordId) =>
        pilotDiscordIds().includes(discordId),
      ) ||
      data.post.eventId !== data.event.id ||
      data.post.guildId !== process.env.DISCORD_GUILD_ID ||
      data.post.channelId !== process.env.FOREVER_RAIDS_DISCORD_CHANNEL_ID ||
      !data.members.some((member) => member.id === data.event.organizerId) ||
      data.characters.some(
        (character) =>
          !data.members.some((member) => member.id === character.memberId),
      ) ||
      data.signups.some(
        (signup) =>
          signup.eventId !== data.event.id ||
          !data.members.some((member) => member.id === signup.memberId) ||
          !data.characters.some(
            (character) =>
              character.id === signup.characterId &&
              character.memberId === signup.memberId,
          ),
      ) ||
      data.audits.some((audit) => audit.eventId !== data.event.id)
    )
      throw new Error("Transfer ownership, audience or private post mismatch.");
    const client = new Client({ connectionString: url.toString() });
    await client.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1,0))",
        [`raid-transfer:${data.event.id}`],
      );
      const existing = await client.query<{ requestHash: string }>(
        'SELECT "requestHash" FROM "ForeverRaidEvent" WHERE "id"=$1',
        [data.event.id],
      );
      if (existing.rowCount) {
        if (existing.rows[0].requestHash !== data.event.requestHash)
          throw new Error("Existing event has different provenance.");
        await client.query("COMMIT");
        console.log(
          "Event already imported; live participation was left unchanged.",
        );
        return;
      }
      // Structured JSON records retain dates/IDs; only these enumerated tables can be inserted.
      for (const [table, rows] of [
        ["ForeverMember", data.members],
        ["ForeverCharacter", data.characters],
        ["ForeverRaidEvent", [data.event]],
        ["ForeverRaidSignup", data.signups],
        ["ForeverRaidAudit", data.audits],
      ] as const) {
        for (const record of rows)
          await client.query(
            `INSERT INTO "${table}" SELECT * FROM jsonb_populate_record(NULL::"${table}",$1::jsonb)`,
            [JSON.stringify(record)],
          );
      }
      await client.query(
        'INSERT INTO "ForeverRaidDiscordPost" ("eventId","guildId","channelId","messageId","origin","visibility","label","desiredVersion","deliveredVersion","status") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,0,\'pending\')',
        [
          data.event.id,
          data.post.guildId,
          data.post.channelId,
          data.post.messageId,
          "https://www.wowforeverdiscord.online",
          "private",
          data.post.label,
          data.event.version,
        ],
      );
      await client.query("COMMIT");
      console.log(
        `Imported one real private event, ${data.members.length} members and ${data.signups.length} signups; existing Discord message retained.`,
      );
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      await client.end();
    }
    return;
  }
  if (
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    url.port !== "55432" ||
    !values.event ||
    values.host !== "root@89.167.46.193"
  )
    throw new Error(
      "Export requires the isolated local database, an explicit event and the approved production host.",
    );
  const eventId = id.parse(values.event);
  const data = await db.$transaction(
    async (client) => {
      const event = await client.foreverRaidEvent.findUniqueOrThrow({
        where: { id: eventId },
        include: {
          signups: true,
          audits: true,
          discordPost: true,
          snapshot: true,
        },
      });
      if (
        event.snapshot ||
        event.catalogId ||
        event.title.startsWith("Synthetic") ||
        event.discordPost?.visibility !== "private" ||
        !event.discordPost.messageId ||
        !["localhost", "127.0.0.1"].includes(
          new URL(event.discordPost.origin).hostname,
        )
      )
        throw new Error(
          "Only a real, unlocked, local private event without imported loot can transfer.",
        );
      const { signups, audits, discordPost, snapshot, ...record } = event;
      if (snapshot)
        throw new Error(
          "Locked events cannot transfer through this pilot path.",
        );
      const memberIds = [
        ...new Set([
          record.organizerId,
          ...signups.map((signup) => signup.memberId),
        ]),
      ];
      return payloadSchema.parse(
        JSON.parse(
          JSON.stringify({
            format: "private-raid-pilot-transfer.v1",
            event: record,
            members: await client.foreverMember.findMany({
              where: { id: { in: memberIds } },
            }),
            characters: await client.foreverCharacter.findMany({
              where: { memberId: { in: memberIds } },
            }),
            signups,
            audits,
            post: {
              eventId,
              guildId: discordPost.guildId,
              channelId: discordPost.channelId,
              messageId: discordPost.messageId,
              visibility: discordPost.visibility,
              label: discordPost.label,
            },
          }),
        ),
      );
    },
    { isolationLevel: "RepeatableRead" },
  );
  const child = spawn(
    "ssh",
    [
      "-o",
      "BatchMode=yes",
      values.host,
      "cd /home/wow-forever-discord && npx tsx scripts/transfer-raid-pilot.ts --import",
    ],
    { stdio: ["pipe", "inherit", "inherit"] },
  );
  child.stdin.end(JSON.stringify(data));
  const code = await new Promise<number>((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code) => resolve(code ?? 1));
  });
  if (code !== 0) throw new Error("Private transfer failed.");
  const current = await db.foreverRaidEvent.findUniqueOrThrow({
    where: { id: eventId },
    select: { version: true },
  });
  if (current.version !== data.event.version)
    throw new Error(
      "Local event changed during transfer. Reconcile it before activating the worker.",
    );
  console.log(
    `Transfer verified at event version ${current.version}; checksum ${jsonChecksum(data).slice(0, 12)}. No credentials or member payloads logged.`,
  );
}
main()
  .catch(() => {
    console.error(
      "Private event transfer failed; check schema, audience, event provenance and database grants without logging member data.",
    );
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
