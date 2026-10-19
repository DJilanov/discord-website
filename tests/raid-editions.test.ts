import "../scripts/env";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  characterSchema,
  storedCharacterSchema,
  eventSchema,
} from "../lib/raids/contracts";
import { normalizeCatalog, isGameWowheadUrl } from "../lib/raids/catalog";
import { characterCanJoin, raidPresets } from "../lib/raids/games";
import {
  raidCatalogFixture,
  tbcRaidCatalogFixture,
} from "./fixtures/raid-catalog";
import {
  raidDiscordDestination,
  raidDiscordDestinationViews,
  raidDestinationForPost,
} from "../lib/raids/discord-settings";

const character = {
  name: "Dimitar",
  className: "Warrior",
  specialization: "Fury",
  region: "EU",
  faction: "Alliance",
  ruleset: "PvP",
};
test("Legacy characters remain Forever; TBC characters require a realm and classic names", () => {
  assert.equal(characterSchema.parse(character).game, "forever");
  assert.equal(
    storedCharacterSchema.parse({ ...character, specialization: null }).realm,
    "",
  );
  const tbc = characterSchema.parse({
    ...character,
    game: "tbc",
    realm: " Spineshatter ",
  });
  assert.equal(tbc.realm, "spineshatter");
  for (const input of [
    { ...character, game: "tbc" },
    { ...character, game: "tbc", realm: "spineshatter", name: "First Last" },
    {
      ...character,
      game: "tbc",
      realm: "spineshatter",
      name: "abcdefghijklmn",
    },
    { ...character, game: "forever", realm: "spineshatter" },
    { ...character, game: "retail" },
  ])
    assert.equal(characterSchema.safeParse(input).success, false);
  const forever = characterSchema.parse(character);
  assert.equal(characterCanJoin(forever, tbc), false);
  assert.equal(characterCanJoin(tbc, { ...tbc, realm: "other realm" }), false);
  assert.equal(characterCanJoin(tbc, tbc), true);
});
test("Catalogs reject cross-edition URLs and schema mismatches without changing legacy checksums", () => {
  const forever = normalizeCatalog(raidCatalogFixture),
    tbc = normalizeCatalog(tbcRaidCatalogFixture);
  assert.equal(tbc.bundle.game, "tbc");
  assert.notEqual(tbc.checksum, forever.checksum);
  assert.equal(
    isGameWowheadUrl(
      "https://www.wowhead.com/tbc/item=28773/gorehowl",
      "tbc",
      "item",
    ),
    true,
  );
  for (const raw of [
    { ...tbcRaidCatalogFixture, schema: raidCatalogFixture.schema },
    {
      ...tbcRaidCatalogFixture,
      raidSourceUrl: raidCatalogFixture.raidSourceUrl,
    },
    { ...tbcRaidCatalogFixture, items: raidCatalogFixture.items },
    { ...raidCatalogFixture, items: tbcRaidCatalogFixture.items },
    {
      ...tbcRaidCatalogFixture,
      items: [
        {
          ...tbcRaidCatalogFixture.items[0],
          sourceUrl: "https://www.wowhead.com/item=900001",
        },
      ],
    },
  ])
    assert.throws(() => normalizeCatalog(raw));
  assert.equal(
    isGameWowheadUrl(
      "https://www.wowhead.com/classic/item=28773",
      "tbc",
      "item",
    ),
    false,
  );
});
test("TBC presets cover nine raids with editable 10/25-person roster defaults", () => {
  assert.equal(raidPresets.tbc.length, 9);
  assert.equal(new Set(raidPresets.tbc.map((preset) => preset.name)).size, 9);
  assert.deepEqual(
    raidPresets.tbc
      .filter((preset) => preset.capacity === 10)
      .map((preset) => preset.name),
    ["Karazhan", "Zul'Aman"],
  );
  for (const preset of raidPresets.tbc)
    assert.equal(
      Object.values(preset.roleCaps).reduce((sum, count) => sum + count, 0),
      preset.capacity,
    );
  assert.equal(eventSchema.shape.game.parse(undefined), "forever");
});
test("Channel choices expose labels and IDs only; forged and removed destinations fail closed", () => {
  const values = {
    FOREVER_RAIDS_ENABLED: "true",
    FOREVER_RAIDS_DISCORD_ENABLED: "true",
    DISCORD_GUILD_ID: "1556000000000000010",
    DISCORD_APPLICATION_ID: "1556000000000000012",
    DISCORD_BOT_TOKEN: "synthetic-test-only",
    FOREVER_RAIDS_PUBLIC_ORIGIN: "http://127.0.0.1:19300",
    FOREVER_RAIDS_DISCORD_CHANNEL_ID: "1556000000000000011",
    FOREVER_RAIDS_DISCORD_DESTINATIONS: JSON.stringify([
      {
        channelId: "1556000000000000021",
        guildId: "1556000000000000020",
        label: "KFC private test",
      },
    ]),
  };
  const previous = new Map(
    Object.keys(values).map((key) => [key, process.env[key]]),
  );
  Object.assign(process.env, values);
  try {
    assert.deepEqual(raidDiscordDestinationViews(), [
      {
        guildId: "1556000000000000010",
        channelId: "1556000000000000011",
        label: "Private raid-manager test",
        visibility: "private",
      },
      {
        guildId: "1556000000000000020",
        channelId: "1556000000000000021",
        label: "KFC private test",
        visibility: "private",
      },
    ]);
    const selected = raidDiscordDestination("1556000000000000021");
    assert.ok(selected);
    assert.equal(selected.guildId, "1556000000000000020");
    assert.ok(raidDestinationForPost(selected));
    assert.equal(
      raidDestinationForPost({ ...selected, origin: "https://evil.example" }),
      null,
    );
    assert.throws(
      () => raidDiscordDestination("1556000000000000099"),
      /approved private/,
    );
    process.env.FOREVER_RAIDS_DISCORD_DESTINATIONS = "[]";
    assert.equal(raidDestinationForPost(selected), null);
    process.env.FOREVER_RAIDS_DISCORD_DESTINATIONS = "not JSON";
    assert.throws(() => raidDiscordDestinationViews(), /Invalid/);
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
