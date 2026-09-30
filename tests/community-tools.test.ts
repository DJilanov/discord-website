import "../scripts/env";
import assert from "node:assert/strict";
import { test, after } from "node:test";
import { randomUUID } from "node:crypto";
import { db } from "../lib/db";
import { guildSchema, groupSchema } from "../lib/validation";
import { guildFilter, groupFilter } from "../lib/directory";
import { GUILD_RULESETS, RULESETS } from "../lib/config";
import {
  contributorTasks,
  testerReportTemplate,
} from "../content/contributor-tasks";
import { GET as downloadTemplate } from "../app/templates/[slug]/route";
import { communityTemplates } from "../content/templates";
import { editorialGuides } from "../content/editorial";
import { requireSameOrigin } from "../lib/security";

test("alternate dev ports remain loopback-only and are never allowed in production", () => {
  const previousMode = process.env.NODE_ENV;
  const previousPort = process.env.PORT;
  const request = (origin: string): Request =>
    new Request("https://example.test/api/challenge", { headers: { origin } });
  try {
    Object.assign(process.env, { NODE_ENV: "test", PORT: "19301" });
    assert.doesNotThrow(() =>
      requireSameOrigin(request("http://127.0.0.1:19301")),
    );
    assert.throws(() => requireSameOrigin(request("http://127.0.0.1:19302")));
    assert.throws(() =>
      requireSameOrigin(request("http://example.test:19301")),
    );
    Object.assign(process.env, { NODE_ENV: "production" });
    assert.throws(() => requireSameOrigin(request("http://127.0.0.1:19301")));
    Object.assign(process.env, { NODE_ENV: "test", PORT: "19301/path" });
    assert.throws(() => requireSameOrigin(request("http://127.0.0.1:19301")));
  } finally {
    if (previousMode === undefined)
      Reflect.deleteProperty(process.env, "NODE_ENV");
    else Object.assign(process.env, { NODE_ENV: previousMode });
    if (previousPort === undefined) delete process.env.PORT;
    else process.env.PORT = previousPort;
  }
});

after(async (): Promise<void> => {
  await db.$disconnect();
});

const guild = {
  name: "Schema test",
  region: "EU",
  faction: "Alliance",
  gameRuleset: "Normal",
  language: "English",
  playstyle: "Casual",
  raidDays: [],
  raidTime: "20:00 UTC",
  lootSystem: "Written rules",
  recruitingClasses: ["Shaman"],
  description:
    "A local validation fixture for complete guild submissions and explicit character ruleset selection.",
  contactDiscord: "fixture",
};
const group = {
  title: "Schema test group",
  region: "EU",
  faction: "Horde",
  gameRuleset: "Normal",
  activity: "Dungeon",
  description: "An isolated validation fixture for group posts.",
  contactDiscord: "fixture",
  startsAt: new Date(Date.now() + 3600000).toISOString(),
};

test("Forever guild and group forms require a character ruleset, not a realm", () => {
  for (const gameRuleset of GUILD_RULESETS)
    assert.equal(
      guildSchema.safeParse({ ...guild, gameRuleset }).success,
      true,
    );
  for (const gameRuleset of RULESETS)
    assert.equal(
      groupSchema.safeParse({ ...group, gameRuleset }).success,
      true,
    );
  for (const gameRuleset of ["PvE", "RP", "", undefined]) {
    assert.equal(
      guildSchema.safeParse({
        ...guild,
        gameRuleset,
        ruleset: "PvP",
        realm: "Old realm",
      }).success,
      false,
    );
    assert.equal(
      groupSchema.safeParse({ ...group, gameRuleset }).success,
      false,
    );
  }
  for (const gameRuleset of ["Hardcore (planned)", "Unconfirmed"])
    assert.equal(
      groupSchema.safeParse({ ...group, gameRuleset }).success,
      false,
    );
  const parsed = guildSchema.parse({
    ...guild,
    realm: "Legacy",
    ruleset: "PvP",
  });
  assert.equal("realm" in parsed, false);
  assert.equal("ruleset" in parsed, false);
});

test("ruleset filters cannot silently match a legacy activity", () => {
  assert.equal(guildFilter({ ruleset: "Normal" }).gameRuleset, "Normal");
  assert.equal(
    groupFilter({ ruleset: "Roleplaying" }).gameRuleset,
    "Roleplaying",
  );
  assert.equal(guildFilter({ ruleset: "PvE" }).gameRuleset, undefined);
  assert.equal(groupFilter({ ruleset: "RP" }).gameRuleset, undefined);
  assert.equal(guildFilter({ playstyle: "PvP" }).playstyle, "PvP");
});

test("legacy guild fields survive and are not interpreted as confirmed rulesets", async () => {
  assert.equal(new URL(process.env.DATABASE_URL || "").port, "55432");
  const slug = `ruleset-test-${randomUUID()}`;
  try {
    const created = await db.foreverGuild.create({
      data: {
        ...guildSchema.parse(guild),
        slug,
        realm: "Legacy realm",
        ruleset: "PvP",
        gameRuleset: undefined,
      },
    });
    assert.equal(created.gameRuleset, "Unconfirmed");
    const updated = await db.foreverGuild.update({
      where: { id: created.id },
      data: guildSchema.parse({ ...guild, gameRuleset: "Roleplaying" }),
    });
    assert.equal(updated.realm, "Legacy realm");
    assert.equal(updated.ruleset, "PvP");
    assert.equal(updated.gameRuleset, "Roleplaying");
  } finally {
    await db.foreverGuild.deleteMany({ where: { slug } });
  }
});

test("tester tasks have explicit boundaries and a safe downloadable report", async () => {
  assert.equal(new Set(contributorTasks.map((task) => task.id)).size, 5);
  assert.equal(
    contributorTasks.filter((task) => task.status === "Open browser check")
      .length,
    3,
  );
  const response = await downloadTemplate(
    new Request("https://example.test/templates/tester-report"),
    {
      params: Promise.resolve({ slug: testerReportTemplate.slug }),
    },
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("X-Robots-Tag"), "noindex");
  assert.equal(
    await response.text(),
    `${testerReportTemplate.title}\n\n${testerReportTemplate.text}\n`,
  );
  assert.match(
    contributorTasks.find((task) => task.id === "collector")!.completion,
    /privately/,
  );
});

test("current planning templates do not ask for a traditional realm", () => {
  for (const template of communityTemplates) {
    assert.doesNotMatch(template.text, /realm/i);
    assert.match(template.text, /ruleset/i);
  }
  const friends = editorialGuides.find(
    (guide) => guide.slug === "wow-forever-playing-with-friends",
  )!;
  const prices = editorialGuides.find(
    (guide) => guide.slug === "wow-trader-read-market-prices",
  )!;
  assert.match(friends.content, /news.blizzard.com/);
  assert.match(prices.content, /when someone uploads/);
  assert.match(prices.content, /deliberately invented/);
});
