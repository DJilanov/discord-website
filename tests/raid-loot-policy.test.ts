import { test } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { reserveQuota, reservePolicyLabel } from "../lib/raids/loot-policy";
import { readLuaData, readTbcItemMetadata } from "../scripts/raid-loot-source";
import { normalizeCatalog } from "../lib/raids/catalog";
import { tbcRaidCatalogFixture } from "./fixtures/raid-catalog";
import { raidPresets } from "../lib/raids/games";

test("Role SR allowances include zero and preserve legacy shared limits", () => {
  const event = {
    reserveLimit: 3,
    reserveLimits: { tank: 3, healer: 2, damage: 0 },
  };
  assert.equal(reserveQuota(event, "tank"), 3);
  assert.equal(reserveQuota(event, "healer"), 2);
  assert.equal(reserveQuota(event, "damage"), 0);
  assert.equal(reserveQuota(event, "participant"), 0);
  assert.equal(reserveQuota({ reserveLimit: 2 }, "damage"), 2);
  assert.match(reservePolicyLabel(event), /Tanks 3.*Healers 2.*DPS 0/);
});

test("Licensed Lua data is parsed without executing calls or accepting unsafe keys", () => {
  assert.deepEqual(
    JSON.parse(
      JSON.stringify(
        readLuaData(
          'local source = { raid = { name = "Karazhan", items = { 1, 2 }, available = true } }',
          "source",
        ),
      ),
    ),
    { raid: { name: "Karazhan", items: [1, 2], available: true } },
  );
  for (const lua of [
    'local source = os.execute("anything")',
    "local source = { key = f() }",
    "local source = { __proto__ = {} }",
    "local source = { a = 1, a = 2 }",
  ])
    assert.throws(() => readLuaData(lua, "source"));
});

test("TBC item class restrictions are read from structured tooltip HTML", () => {
  assert.deepEqual(
    readTbcItemMetadata({
      name: "Test token",
      quality: 4,
      tooltip:
        '<div class="wowhead-tooltip-item-classes">Classes: <a>Warrior</a>, <a>Hunter</a></div>',
    }).classes,
    ["Warrior", "Hunter"],
  );
  assert.equal(
    readTbcItemMetadata({
      name: "Test ring",
      quality: 4,
      tooltip: "<table><tr><td>Ring</td></tr></table>",
    }).classes.length,
    9,
  );
  assert.throws(() =>
    readTbcItemMetadata({
      name: "Bad token",
      quality: 4,
      tooltip: '<div class="wowhead-tooltip-item-classes">Unknown</div>',
    }),
  );
});

test("A licensed catalog cannot masquerade as a Wowhead capture", () => {
  assert.throws(() =>
    normalizeCatalog({
      ...tbcRaidCatalogFixture,
      raidSourceUrl:
        "https://www.curseforge.com/wow/addons/atlas-loot-revival/files/8963708",
    }),
  );
  assert.throws(() =>
    normalizeCatalog({
      ...tbcRaidCatalogFixture,
      schema: "tbc-atlasloot-loot-candidates.v1",
    }),
  );
});

test("The nine real TBC catalogs retain pinned provenance, raid coverage and restricted weapons", async () => {
  const directory = path.join(process.cwd(), "content/raid-catalogs/tbc");
  const files = (await readdir(directory)).filter((name) =>
    name.endsWith(".json"),
  );
  const bundles = [];
  for (const file of files) {
    const { bundle } = normalizeCatalog(
      JSON.parse(await readFile(path.join(directory, file), "utf8")),
    );
    assert.equal(bundle.game, "tbc");
    assert.equal(bundle.schema, "tbc-atlasloot-loot-candidates.v1");
    assert.equal(bundle.coverage, "partial");
    assert.equal(
      bundle.provenance?.archiveSha256,
      "dc7169b383572a9348727cb6818602247a3f08ad133a243778c4ccd5e43a8ea2",
    );
    assert.ok(
      bundle.items.every((item) => item.evidence === "source_reported"),
    );
    assert.ok(bundle.items.every((item) => item.itemId !== 29434));
    bundles.push(bundle);
  }
  assert.deepEqual(
    bundles.map((bundle) => bundle.raidName).sort(),
    raidPresets.tbc.map((raid) => raid.name).sort(),
  );
  assert.equal(
    bundles.reduce((total, bundle) => total + bundle.items.length, 0),
    775,
  );
  const temple = bundles.find((bundle) => bundle.raidName === "Black Temple");
  assert.ok(temple);
  for (const itemId of [32837, 32838])
    assert.deepEqual(
      temple.items.find((item) => item.itemId === itemId)?.classes,
      ["Rogue", "Warrior"],
    );
});
