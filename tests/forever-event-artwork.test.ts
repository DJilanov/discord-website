import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import sharp from "sharp";
import { eventTypes } from "../lib/raids/event-types";

const artworkSchema = z.object({
  schema: z.literal("forever-event-artwork.v1"),
  edition: z.literal("forever"),
  generatedOn: z.string(),
  provenance: z.string().min(30),
  source: z.url(),
  sources: z.array(z.url()).min(5),
  coverage: z.object({
    reviewedOn: z.iso.date(),
    newDungeons: z.array(z.string()).length(9),
    returningDungeonsAndWings: z.array(z.string()).length(27),
    raids: z.array(z.string()).length(3),
    battlegrounds: z.array(z.string()).length(4),
  }),
  fallbacks: z.record(z.enum(eventTypes), z.string()),
  items: z.array(
    z.object({
      id: z.string().regex(/^[a-z0-9-]+$/),
      label: z.string().min(3),
      eventType: z.enum(eventTypes),
      aliases: z.array(z.string().min(2)),
      alt: z.string().min(30),
      file: z.string().regex(/^[a-z0-9-]+\.webp$/),
      width: z.number().int().positive(),
      height: z.number().int().positive(),
      bytes: z.number().int().positive().max(500_000),
    }),
  ),
});

const directory = "public/images/raids/events";
const manifest = artworkSchema.parse(
  JSON.parse(readFileSync(`${directory}/manifest.json`, "utf8")),
);

test("Forever artwork has seven type fallbacks and unambiguous named-location aliases", (): void => {
  assert.equal(manifest.items.length, 50);
  assert.equal(new Set(manifest.items.map((item) => item.id)).size, 50);
  assert.equal(new Set(manifest.items.map((item) => item.file)).size, 50);
  assert.match(manifest.provenance, /not official screenshots/i);
  assert.equal(
    new URL(manifest.source).hostname,
    "worldofwarcraft.blizzard.com",
  );
  for (const type of eventTypes) {
    const fallback = manifest.items.find(
      (item) => item.id === manifest.fallbacks[type],
    );
    assert.ok(fallback, type);
    assert.equal(fallback.eventType, type);
    assert.equal(fallback.aliases.length, 0);
  }
  const aliases = new Set<string>();
  for (const item of manifest.items) {
    assert.equal(item.file, `${item.id}.webp`);
    if (item.aliases.length) {
      assert.ok(item.aliases.includes(item.label), item.id);
    }
    for (const alias of item.aliases) {
      const key = `${item.eventType}:${alias.normalize("NFC").trim().toLowerCase()}`;
      assert.ok(!aliases.has(key), key);
      aliases.add(key);
    }
  }
});

test("Artwork covers every announced Forever dungeon, returning wing, raid and battleground", (): void => {
  const expectedCoverage = {
    reviewedOn: "2026-10-03",
    newDungeons: [
      "hall-of-thanes",
      "ruins-of-lordaeron",
      "excavation-site-wetlands",
      "city-of-dalaran",
      "drowned-city",
      "kroldok-stronghold",
      "alcaz-prison",
      "blackmaw-hold",
      "shapers-terrace",
    ],
    returningDungeonsAndWings: [
      "ragefire-chasm",
      "wailing-caverns",
      "deadmines",
      "shadowfang-keep",
      "stockade",
      "blackfathom-deeps",
      "gnomeregan",
      "razorfen-kraul",
      "scarlet-monastery-graveyard",
      "scarlet-monastery-library",
      "scarlet-monastery-armory",
      "scarlet-monastery-cathedral",
      "razorfen-downs",
      "uldaman",
      "zulfarrak",
      "maraudon-wicked-grotto",
      "maraudon-foulspore-cavern",
      "maraudon-earth-song-falls",
      "sunken-temple",
      "blackrock-depths",
      "lower-blackrock-spire",
      "upper-blackrock-spire",
      "scholomance",
      "stratholme",
      "dire-maul-east",
      "dire-maul-north",
      "dire-maul-west",
    ],
    raids: ["hyjal-summit", "barrow-deeps", "onyxias-lair"],
    battlegrounds: [
      "darkspear-islands",
      "warsong-gulch",
      "arathi-basin",
      "alterac-valley",
    ],
  };
  assert.deepEqual(manifest.coverage, expectedCoverage);
  const expectedByType = {
    dungeon: [
      ...expectedCoverage.newDungeons,
      ...expectedCoverage.returningDungeonsAndWings,
    ],
    raid: expectedCoverage.raids,
    battleground: expectedCoverage.battlegrounds,
  };
  for (const [type, expectedIds] of Object.entries(expectedByType)) {
    const named = manifest.items.filter(
      (item) => item.eventType === type && item.aliases.length > 0,
    );
    assert.deepEqual(
      new Set(named.map((item) => item.id)),
      new Set(expectedIds),
    );
  }
  assert.ok(manifest.sources.includes(manifest.source));
  assert.ok(
    manifest.sources.every((source) => new URL(source).protocol === "https:"),
  );
  for (const slug of [
    "dungeons-overview-locations-details",
    "dungeons/every-dungeon-quest-location",
    "raids-overview-hub-dates-locations",
    "pvp-overview-ranking-rewards",
  ]) {
    assert.ok(
      manifest.sources.includes(
        `https://www.wowhead.com/forever/guide/${slug}`,
      ),
    );
  }
});

test("Every generated cover decodes, matches its manifest and is nonblank", async (): Promise<void> => {
  let total = 0;
  for (const item of manifest.items) {
    const data = await readFile(`${directory}/${item.file}`);
    const image = sharp(data);
    const metadata = await image.metadata();
    assert.equal(metadata.format, "webp", item.id);
    assert.equal(metadata.width, item.width, item.id);
    assert.equal(metadata.height, item.height, item.id);
    assert.equal(data.byteLength, item.bytes, item.id);
    assert.ok(item.width >= 1280, item.id);
    assert.ok(item.width / item.height > 1.7, item.id);
    assert.ok(item.width / item.height < 1.85, item.id);
    const statistics = await image.stats();
    assert.ok(
      statistics.channels.some((channel) => channel.stdev > 20),
      item.id,
    );
    total += data.byteLength;
  }
  assert.ok(total < 16 * 1024 * 1024);
});

test("Common activity abbreviations remain unique and ambiguous DM is not mapped", (): void => {
  for (const [alias, id] of [
    ["WC", "wailing-caverns"],
    ["VC", "deadmines"],
    ["SM", "scarlet-monastery-cathedral"],
    ["ZF", "zulfarrak"],
    ["ST", "sunken-temple"],
    ["AB", "arathi-basin"],
    ["AV", "alterac-valley"],
    ["Onyxia\u2019s Lair", "onyxias-lair"],
    ["Shaper\u2019s Terrace", "shapers-terrace"],
  ]) {
    const matches = manifest.items.filter((item) =>
      item.aliases.includes(alias),
    );
    assert.deepEqual(
      matches.map((item) => item.id),
      [id],
      alias,
    );
  }
  assert.ok(!manifest.items.some((item) => item.aliases.includes("DM")));
});

test("Every artwork asset has a recorded built-in generation prompt", async (): Promise<void> => {
  const prompts = z
    .object({
      tool: z.literal("Built-in image_gen"),
      prompts: z.array(
        z.object({
          id: z.string(),
          edit: z.boolean().optional(),
          prompt: z.string().min(200),
        }),
      ),
    })
    .parse(
      JSON.parse(
        await readFile("docs/forever-event-artwork-prompts.json", "utf8"),
      ),
    );
  const generations = prompts.prompts.filter((prompt) => !prompt.edit);
  assert.equal(generations.length, manifest.items.length);
  assert.deepEqual(
    new Set(generations.map((prompt) => prompt.id)),
    new Set(manifest.items.map((item) => item.id)),
  );
  for (const prompt of prompts.prompts) {
    assert.ok(
      manifest.items.some((item) => item.id === prompt.id),
      prompt.id,
    );
  }
});

test("Standalone artwork gallery contains every cover and works without scripts or external assets", async (): Promise<void> => {
  const html = await readFile(`${directory}/preview.html`, "utf8");
  assert.match(html, /name="robots" content="noindex, nofollow"/);
  assert.match(html, /Generated fan art, not official game imagery/);
  assert.equal([...html.matchAll(/<img\s/g)].length, manifest.items.length);
  assert.doesNotMatch(html, /<script\b|(?:src|href)="https?:/i);
  for (const item of manifest.items) {
    assert.ok(html.includes(`src="${item.file}"`), item.id);
    assert.ok(html.includes(`href="${item.file}"`), item.id);
  }
  for (const type of eventTypes) {
    assert.ok(html.includes(`id="category-${type}"`));
    assert.ok(html.includes(`data-event-type="${type}"`));
  }
});
