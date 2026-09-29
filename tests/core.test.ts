import "../scripts/env";
import assert from "node:assert/strict";
import { test, after } from "node:test";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { zipSync, strToU8 } from "fflate";
import { isDiscordInvite, reportSchema, groupSchema } from "../lib/validation";
import { trafficSource, publicAnalyticsPath } from "../lib/analytics";
import { csvCell } from "../lib/csv";
import { luaString, toLua } from "../lib/safety-export";
import { validateAddonArchive } from "../lib/releases";
import { verifyDiscordSignature } from "../lib/discord-bot";
import { assertReviewTransition } from "../lib/moderation";
import { groupFilter, guildFilter, pageNumber } from "../lib/directory";
import {
  HttpError,
  issueChallenge,
  verifyChallenge,
  readJson,
  requireSameOrigin,
} from "../lib/security";
import { db } from "../lib/db";

after(async () => {
  await db.$disconnect();
});

test("Discord links reject spoofed hosts, credentials and active schemes", () => {
  for (const link of [
    "https://discord.gg/abc",
    "https://discord.com/invite/abc",
  ])
    assert.equal(isDiscordInvite(link), true);
  for (const link of [
    "http://discord.gg/abc",
    "https://discord.gg.evil.test/abc",
    "https://evil.test/?discord.gg/abc",
    "https://user@discord.gg/abc",
    "javascript:alert(1)",
    "https://discord.gg/abc?x=1",
    "https://discord.gg:444/abc",
  ])
    assert.equal(isDiscordInvite(link), false, link);
});

test("attribution is bounded to real referrer domains", () => {
  assert.equal(
    trafficSource("https://www.google.com/search?q=test").source,
    "Organic search",
  );
  assert.equal(
    trafficSource("https://www.google.com.evil.test").source,
    "Referral",
  );
  assert.equal(
    trafficSource("https://chatgpt.com/c/123").source,
    "AI referral",
  );
  assert.equal(trafficSource("https://m.facebook.com/test").source, "Social");
  assert.equal(trafficSource("", "cpc").source, "Paid");
  assert.equal(trafficSource("").source, "Direct");
});

test("analytics excludes private paths and strips query secrets", () => {
  for (const path of [
    "/admin",
    "/admin/reports",
    "/api/cases/status",
    "/reports/status?token=secret",
    "//evil.test",
    "/path\nsecret",
  ])
    assert.equal(publicAnalyticsPath(path), null);
  assert.equal(publicAnalyticsPath("/guides?token=secret#private"), "/guides");
});

test("CSV output escapes quotes and neutralizes spreadsheet formulas", () => {
  assert.equal(csvCell('a"b'), '"a""b"');
  assert.equal(csvCell("=HYPERLINK(1)"), '"\'=HYPERLINK(1)"');
  assert.equal(csvCell("  +SUM(1)"), '"\'  +SUM(1)"');
});

test("Lua strings cannot break into executable source", () => {
  assert.equal(luaString('x"\\\n'), '"x\\"\\\\\\010"');
  assert.equal(luaString("é"), '"\\195\\169"');
  const source = toLua({
    version: "test",
    generatedAt: "now",
    source: "https://example.test",
    entries: [
      {
        id: "FG-test",
        character: '"); error("injected") --',
        realm: "Realm",
        region: "EU",
        category: "Other",
        severity: 2,
        summary: "A neutral summary.",
        lastReviewedAt: "now",
        expiresAt: 1,
      },
    ],
  });
  assert.ok(source.includes('character = "\\"); error(\\"injected\\") --"'));
});

test("archive validator rejects executable files and path traversal", () => {
  const valid = {
    "ForeverGuard/ForeverGuard.toc": strToU8("## Interface: 16001"),
    "ForeverGuard/ForeverGuard.lua": strToU8("return true"),
  };
  assert.doesNotThrow(() => validateAddonArchive(zipSync(valid)));
  assert.throws(
    () =>
      validateAddonArchive(
        zipSync({ ...valid, "ForeverGuard/../../evil.lua": strToU8("bad") }),
      ),
    HttpError,
  );
  assert.throws(
    () =>
      validateAddonArchive(
        zipSync({ ...valid, "ForeverGuard/setup.exe": strToU8("bad") }),
      ),
    HttpError,
  );
  assert.throws(() => validateAddonArchive(strToU8("not a zip")), HttpError);
});

test("Discord signatures verify raw payloads and reject stale replays", () => {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const key = publicKey
    .export({ format: "der", type: "spki" })
    .subarray(-32)
    .toString("hex");
  const timestamp = String(Math.floor(Date.now() / 1000)),
    body = '{"type":1}';
  const signature = sign(
    null,
    Buffer.from(timestamp + body),
    privateKey,
  ).toString("hex");
  assert.equal(verifyDiscordSignature(body, signature, timestamp, key), true);
  assert.equal(
    verifyDiscordSignature(body + " ", signature, timestamp, key),
    false,
  );
  assert.equal(
    verifyDiscordSignature(body, signature, "1000000000", key),
    false,
  );
});

test("moderation cannot skip initial review or publish appealed cases", () => {
  assert.doesNotThrow(() =>
    assertReviewTransition("under_review", "approve_public"),
  );
  for (const state of [
    "submitted",
    "appealed",
    "appeal_under_review",
    "verified_public",
  ])
    assert.throws(() => assertReviewTransition(state, "publish"), HttpError);
});

test("directory parameters cannot override publication requirements", () => {
  assert.deepEqual(
    guildFilter({ status: "pending", faction: "SQL", region: ["EU", "NA"] }),
    { status: "approved" },
  );
  assert.equal(pageNumber({ page: "9999999" }), 1000);
  assert.equal(pageNumber({ page: "-1" }), 1);
});

test("homepage and group directory share approval and expiry rules", () => {
  const now = new Date("2026-09-29T12:00:00Z");
  assert.deepEqual(
    groupFilter({ status: "pending", expiresAt: "yesterday" }, now),
    {
      status: "approved",
      expiresAt: { gt: now },
      startsAt: { gte: now },
    },
  );
  assert.deepEqual(
    groupFilter({ region: "EU", faction: "Horde", activity: "Dungeon" }, now),
    {
      status: "approved",
      expiresAt: { gt: now },
      startsAt: { gte: now },
      region: "EU",
      faction: "Horde",
      activity: "Dungeon",
    },
  );
});

test("bounded body reader and origin checks reject bad requests", async () => {
  const request = new Request("https://example.test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: "x".repeat(200) }),
  });
  await assert.rejects(
    readJson(request, 30),
    (error: unknown) => error instanceof HttpError && error.status === 413,
  );
  assert.throws(
    () =>
      requireSameOrigin(
        new Request("https://example.test", {
          headers: { origin: "https://evil.test" },
        }),
      ),
    HttpError,
  );
});

test("invalid report and schedule data are rejected at the boundary", () => {
  assert.equal(reportSchema.safeParse({ consent: false }).success, false);
  assert.equal(
    groupSchema.safeParse({ startsAt: "not-a-date" }).success,
    false,
  );
});

test("self-hosted challenge requires real work, rejects tampering and single-use replays", async () => {
  const url = new URL(process.env.DATABASE_URL || "");
  assert.equal(
    url.port,
    "55432",
    "This test may only use the isolated local database.",
  );
  const { challenge } = issueChallenge();
  let counter = 0;
  while (
    !createHash("sha256")
      .update(`${challenge}:${counter}`)
      .digest("hex")
      .startsWith("000")
  )
    counter++;
  const proof = `${challenge}.${counter}`;
  await assert.rejects(verifyChallenge(proof, "spam"), HttpError);
  await verifyChallenge(proof, "");
  await assert.rejects(
    verifyChallenge(proof, ""),
    (error: unknown) => error instanceof HttpError && error.status === 429,
  );
  await assert.rejects(
    verifyChallenge(`${challenge.replace(/.$/, "x")}.${counter}`, ""),
    HttpError,
  );
  await db.foreverRateLimit.deleteMany({
    where: { key: `challenge-used:${challenge.split(".")[0]}` },
  });
});
