import "../scripts/env";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { Pool } from "pg";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { raidService } from "../lib/raids/service";
import {
  raidHelperSuggestion,
  type ImportSelection,
  type ImportAttendance,
} from "../lib/raids/signup-import";
import type { ServerMembership } from "../lib/member-auth-options";
import { raidHelperFixture } from "./fixtures/raid-helper";

test("Signup import PostgreSQL: preview, atomic roster migration, replay and player acknowledgement", async (context) => {
  const url = new URL(process.env.DATABASE_URL || "postgresql://invalid");
  if (
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    url.port !== "55432"
  )
    throw new Error(
      "Import tests require the isolated local PostgreSQL instance.",
    );
  const schema = `signup_import_${randomUUID().replaceAll("-", "")}`;
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
  const environment = {
    FOREVER_RAIDS_ENABLED: "true",
    FOREVER_RAIDS_ACCESS_MODE: "members",
    FOREVER_RAIDS_DISCORD_ENABLED: "false",
    FOREVER_RAIDS_PILOT_DISCORD_IDS: raidHelperFixture.signUps
      .map((row) => row.userId)
      .join(","),
    DISCORD_GUILD_ID: raidHelperFixture.serverId,
    FOREVER_RAIDS_MEMBER_GUILD_IDS: raidHelperFixture.serverId,
  };
  const previous = new Map(
    Object.keys(environment).map((key) => [key, process.env[key]]),
  );
  Object.assign(process.env, environment);
  try {
    const migrations = (await readdir("prisma/migrations"))
      .filter(
        (name) =>
          name.endsWith(".sql") &&
          ([1, 2, 13, 35, 36].includes(Number(name.slice(0, 3))) ||
            (Number(name.slice(0, 3)) >= 14 && Number(name.slice(0, 3)) <= 33)),
      )
      .sort();
    for (const name of migrations)
      await pool.query(await readFile(`prisma/migrations/${name}`, "utf8"));
    const organizer = await database.foreverMember.create({
      data: {
        discordId: raidHelperFixture.signUps[0].userId,
        displayName: "Synthetic organizer",
      },
    });
    const outsider = await database.foreverMember.create({
      data: {
        discordId: "1556000000000000080",
        displayName: "Synthetic outsider",
      },
    });
    let membership: ServerMembership = "member";
    let calls = 0;
    const service = raidService(database, undefined, {
      deferDiscordPublication: true,
      importMembership: async () => {
        calls += 1;
        return membership;
      },
    });
    const source = JSON.stringify(raidHelperFixture);
    const selections: ImportSelection[] = raidHelperFixture.signUps.map(
      (row) => {
        const suggestion = raidHelperSuggestion(row);
        if (
          !suggestion.className ||
          !suggestion.specialization ||
          !suggestion.role ||
          !suggestion.attendance
        )
          throw new Error("Invalid fixture suggestion");
        return {
          userId: row.userId,
          characterId: null,
          name: suggestion.name || "Playerone",
          className: suggestion.className,
          specialization: suggestion.specialization,
          role: suggestion.role,
          attendance: suggestion.attendance,
        };
      },
    );
    async function create(
      admission: "open" | "automatic" | "approval" = "open",
    ): Promise<string> {
      return service.create(organizer, {
        requestKey: randomUUID(),
        game: "forever",
        realm: "",
        eventType: "questing",
        title: "Import integration test",
        raidName: "Northshire questing",
        region: "EU",
        faction: "Alliance",
        ruleset: "PvP",
        localStart: "2035-11-05T08:30",
        durationMinutes: 840,
        signupMinutesBefore: 0,
        reserveMinutesBefore: 0,
        capacity: 3,
        roleCaps: { tank: 1, healer: 1, damage: 1 },
        admission,
        description: "Synthetic local event",
        catalogId: null,
        reserveLimit: 0,
        reserveLimits: null,
        allowDuplicates: false,
        hardReserves: [],
      });
    }
    const id = await create();
    const input = {
      source,
      version: (await service.get(organizer, id)).version,
      requestKey: randomUUID(),
      confirm: true as const,
      selections,
    };
    await context.test(
      "non-organizers, foreign servers and stale previews fail before Discord I/O",
      async () => {
        await assert.rejects(
          service.previewSignups(outsider, id, source),
          /Event not found|organizer/,
        );
        await assert.rejects(
          service.importSignups(outsider, id, input),
          /Event not found|organizer/,
        );
        await assert.rejects(
          service.previewSignups(
            organizer,
            id,
            JSON.stringify({
              ...raidHelperFixture,
              serverId: "1556000000000000999",
            }),
          ),
          /source must be/,
        );
        await assert.rejects(
          service.importSignups(organizer, id, { ...input, version: 999 }),
          /event changed/,
        );
        assert.equal(calls, 0);
      },
    );
    await context.test(
      "preview preserves source aliases and asks for invalid nickname corrections",
      async () => {
        const preview = await service.previewSignups(organizer, id, source);
        assert.equal(preview.rows.length, 4);
        assert.equal(preview.rows[0].className, "Warrior");
        assert.equal(preview.rows[3].name, "");
        assert.equal(preview.rows[1].note, raidHelperFixture.signUps[1].note);
        assert.equal(await database.foreverRaidSignup.count(), 0);
      },
    );
    await context.test(
      "membership failure and bad character mappings roll back all player writes",
      async () => {
        membership = "unavailable";
        await assert.rejects(
          service.importSignups(organizer, id, input),
          /No players were imported/,
        );
        membership = "member";
        await assert.rejects(
          service.importSignups(organizer, id, {
            ...input,
            selections: selections.map((row, index) =>
              index === 3 ? { ...row, specialization: "Fury" } : row,
            ),
          }),
          /specialization/,
        );
        assert.equal(await database.foreverRaidSignup.count(), 0);
        assert.equal(await database.foreverCharacter.count(), 0);
        assert.equal(await database.foreverMember.count(), 2);
      },
    );
    await context.test(
      "open signup imports identities, notes and time without fake rule acknowledgements",
      async () => {
        const result = await service.importSignups(organizer, id, input);
        assert.deepEqual(result, {
          imported: 4,
          skipped: 0,
          statuses: { registered: 4 },
        });
        const signups = await database.foreverRaidSignup.findMany({
          where: { eventId: id },
          include: { member: true },
        });
        assert.equal(signups.length, 4);
        assert.ok(
          signups.every(
            (row) =>
              row.policyChecksum === null &&
              row.acknowledgedAt === null &&
              row.partyIndex === null &&
              row.reserves.length === 0,
          ),
        );
        assert.deepEqual(
          signups.map((row) => row.member.discordId).sort(),
          raidHelperFixture.signUps.map((row) => row.userId).sort(),
        );
        const organizerSignup = signups.find(
          (row) => row.memberId === organizer.id,
        )!;
        const originalEntryTime = raidHelperFixture.signUps[0].entryTime;
        assert.ok(originalEntryTime !== undefined);
        assert.equal(
          organizerSignup.createdAt.getTime(),
          originalEntryTime * 1000,
        );
        const event = await service.get(organizer, id);
        assert.ok(
          event.signups.every(
            (row) => row.imported && row.needsAcknowledgement,
          ),
        );
        assert.equal(
          event.signups.find((row) => row.role === "healer")?.note,
          raidHelperFixture.signUps[1].note,
        );
        await assert.rejects(
          database.foreverRaidSignup.update({
            where: { id: organizerSignup.id },
            data: { acknowledgedAt: new Date() },
          }),
          /constraint/,
        );
        await assert.rejects(
          database.foreverRaidSignup.update({
            where: { id: organizerSignup.id },
            data: { importSource: {} },
          }),
          /constraint/,
        );
        const history = await service.history(organizer, id);
        assert.equal(history.changes[0].fields[0].label, "Imported signups");
        assert.equal(history.changes[0].fields[0].after, "4");
        await service.acknowledge(organizer, id, {
          acknowledge: true,
          policyChecksum: event.policyChecksum,
        });
        assert.equal(
          (await service.get(organizer, id)).signups.find((row) => row.isMine)
            ?.needsAcknowledgement,
          false,
        );
      },
    );
    await context.test(
      "receipt replay is stable and reimports cannot overwrite live signups",
      async () => {
        const before = await service.get(organizer, id);
        assert.equal(
          (await service.importSignups(organizer, id, input)).imported,
          4,
        );
        assert.equal(
          (await service.get(organizer, id)).version,
          before.version,
        );
        await assert.rejects(
          service.importSignups(organizer, id, {
            ...input,
            selections: selections.slice(0, 3),
          }),
          /already used/,
        );
        const again = await service.importSignups(organizer, id, {
          ...input,
          version: before.version,
          requestKey: randomUUID(),
        });
        assert.equal(again.skipped, 4);
        assert.equal(again.imported, 0);
        assert.equal(
          await database.foreverRaidSignup.count({ where: { eventId: id } }),
          4,
        );
        assert.equal(
          (await service.previewSignups(organizer, id, source)).rows.every(
            (row) => row.blocked?.includes("Already"),
          ),
          true,
        );
      },
    );
    await context.test(
      "automatic/approval modes, availability and capacity retain native semantics",
      async () => {
        for (const admission of ["automatic", "approval"] as const) {
          const target = await create(admission);
          const result = await service.importSignups(organizer, target, {
            ...input,
            version: (await service.get(organizer, target)).version,
            requestKey: randomUUID(),
          });
          assert.deepEqual(
            result.statuses,
            admission === "automatic"
              ? { accepted: 3, bench: 1 }
              : { pending: 4 },
          );
          if (admission === "automatic")
            await assert.rejects(
              service.manage(organizer, target, {
                action: "lock",
                version: (await service.get(organizer, target)).version,
              }),
              /must acknowledge/,
            );
        }
        const target = await create();
        const attendance: ImportAttendance[] = [
          "joining",
          "tentative",
          "absent",
          "bench",
        ];
        const result = await service.importSignups(organizer, target, {
          ...input,
          version: (await service.get(organizer, target)).version,
          requestKey: randomUUID(),
          selections: selections.map((row, index) => ({
            ...row,
            attendance: attendance[index],
          })),
        });
        assert.deepEqual(result.statuses, {
          registered: 1,
          tentative: 1,
          absent: 1,
          bench: 1,
        });
        const absent = await database.foreverRaidSignup.findFirstOrThrow({
          where: { eventId: target, status: "absent" },
          include: { member: true },
        });
        await service.signup(absent.member, target, {
          characterId: absent.characterId,
          role: absent.role,
          specialization: "Retribution",
          attendance: "joining",
          acknowledge: true,
        });
        assert.equal(
          (
            await database.foreverRaidSignup.findUniqueOrThrow({
              where: { id: absent.id },
            })
          ).status,
          "registered",
        );
      },
    );
    await context.test(
      "disabled members, inaccessible audiences, foreign characters and closed events are protected",
      async () => {
        const target = await create();
        const version = (await service.get(organizer, target)).version;
        const healer = await database.foreverMember.findUniqueOrThrow({
          where: { discordId: selections[1].userId },
        });
        await database.foreverMember.update({
          where: { id: healer.id },
          data: { active: false },
        });
        await assert.rejects(
          service.importSignups(organizer, target, {
            ...input,
            version,
            requestKey: randomUUID(),
          }),
          /access is disabled/,
        );
        assert.equal(
          await database.foreverRaidSignup.count({
            where: { eventId: target },
          }),
          0,
        );
        await database.foreverMember.update({
          where: { id: healer.id },
          data: { active: true },
        });
        const otherCharacter = await database.foreverCharacter.findFirstOrThrow(
          { where: { memberId: organizer.id } },
        );
        await assert.rejects(
          service.importSignups(organizer, target, {
            ...input,
            version,
            requestKey: randomUUID(),
            selections: [{ ...selections[1], characterId: otherCharacter.id }],
          }),
          /does not belong/,
        );
        await database.foreverRaidEvent.update({
          where: { id: target },
          data: { audience: [organizer.discordId] },
        });
        await assert.rejects(
          service.importSignups(organizer, target, {
            ...input,
            version,
            requestKey: randomUUID(),
          }),
          /cannot access/,
        );
        await database.foreverRaidEvent.update({
          where: { id: target },
          data: { status: "cancelled" },
        });
        await assert.rejects(
          service.previewSignups(organizer, target, source),
          /locked or cancelled/,
        );
      },
    );
  } finally {
    await database.$disconnect();
    await pool.end();
    await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.end();
    for (const [key, value] of previous)
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
  }
});
