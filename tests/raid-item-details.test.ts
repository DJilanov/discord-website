import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir, access } from "node:fs/promises";
import {
  itemDetailsBundleSchema,
  itemCategories,
  type ItemDetails,
} from "../lib/raids/item-detail-contracts";
import { catalogBundleSchema } from "../lib/raids/catalog";
import { enrichCatalogItems } from "../lib/raids/item-details";
import {
  categoryItemIds,
  toggleHardReserveCategory,
} from "../lib/raids/hard-reserve-selection";
import { readRaidItemXml } from "../scripts/raid-item-source";
import { raidCatalogFixture } from "./fixtures/raid-catalog";
import type { CatalogItem } from "../lib/raids/contracts";

test("Every reviewed TBC loot item has edition-matched client facts and a local icon", async () => {
  const bundle = itemDetailsBundleSchema.parse(
    JSON.parse(await readFile("content/raid-items/tbc.json", "utf8")),
  );
  assert.equal(bundle.game, "tbc");
  assert.equal(bundle.provider, "WoW Trader");
  const ids = new Set<number>();
  for (const file of (await readdir("content/raid-catalogs/tbc")).filter(
    (file) => file.endsWith(".json"),
  )) {
    const catalog = catalogBundleSchema.parse(
      JSON.parse(await readFile(`content/raid-catalogs/tbc/${file}`, "utf8")),
    );
    const items = enrichCatalogItems("tbc", catalog.items);
    for (const item of items) {
      assert.ok(item.details, `Missing details for ${item.itemId}`);
      assert.equal(item.details.name, item.name);
      assert.equal(item.details.source?.buildNumber, 69795);
      assert.ok(
        item.details.lines.every(
          (line) => !/<(?:script|iframe|img)/i.test(line.left),
        ),
      );
      await access(`public/images/raids/items/tbc/${item.details.icon}.jpg`);
      ids.add(item.itemId);
    }
  }
  assert.equal(ids.size, 768);
  assert.equal(Object.keys(bundle.items).length, ids.size);
  const trinket = bundle.items["32505"];
  assert.ok(
    trinket.lines.some(
      (line) => line.left === "Trinket" && line.right === "Miscellaneous",
    ),
  );
  assert.ok(trinket.lines.some((line) => line.left === "Unique"));
});
test("TBC tooltips never leak into Forever or a mismatched catalog name", () => {
  const item = {
    ...raidCatalogFixture.items[0],
    itemId: 32505,
    name: "Madness of the Betrayer",
  };
  assert.ok(enrichCatalogItems("tbc", [item])[0].details);
  assert.equal(enrichCatalogItems("forever", [item])[0].details, undefined);
  assert.equal(
    enrichCatalogItems("tbc", [{ ...item, name: "Different item" }])[0].details,
    undefined,
  );
});
test("Bulk HR selectors deduplicate explicit IDs and preserve overlapping categories", () => {
  const base: ItemDetails = {
    itemId: 1,
    name: "Test",
    quality: 4,
    icon: "test",
    classId: 4,
    subclassId: 0,
    binding: "equip",
    professionBook: false,
    lines: [{ left: "Test", right: "", tone: "normal" }],
  };
  const items: CatalogItem[] = [
    { ...raidCatalogFixture.items[0], itemId: 1, details: base },
    {
      ...raidCatalogFixture.items[0],
      itemId: 2,
      details: { ...base, itemId: 2, classId: 9 },
    },
    {
      ...raidCatalogFixture.items[0],
      itemId: 3,
      details: { ...base, itemId: 3, classId: 3, binding: "none" },
    },
    {
      ...raidCatalogFixture.items[0],
      itemId: 4,
      details: { ...base, itemId: 4, binding: "pickup", professionBook: true },
    },
    { ...raidCatalogFixture.items[0], itemId: 5 },
  ];
  assert.deepEqual(categoryItemIds(items, "boe"), [1, 2]);
  assert.deepEqual(categoryItemIds(items, "recipes"), [2, 4]);
  assert.deepEqual(categoryItemIds(items, "materials"), [3]);
  const selected = toggleHardReserveCategory(items, [4, 5], "boe", true);
  assert.deepEqual(selected, [4, 5, 1, 2]);
  assert.deepEqual(
    toggleHardReserveCategory(items, selected, "boe", false),
    [4, 5, 2],
  );
  assert.deepEqual(
    toggleHardReserveCategory(items, [5], "materials", true),
    [5, 3],
  );
  assert.equal(
    itemCategories({ ...base, classId: 7, binding: "none" }).materials,
    true,
  );
});
test("XML fallback validates identity, rejects entities and excludes executable tooltip markup", () => {
  const xml = `<wowhead><item id="1"><name><![CDATA[Test recipe]]></name><link>https://www.wowhead.com/tbc/item=1/test</link><quality id="4"/><icon>inv_scroll</icon><class id="9"/><subclass id="0"/><htmlTooltip><![CDATA[<table><tr><td><b>Test recipe</b><br>Binds when picked up</td></tr></table><table><tr><td>Binds when equipped<br><span class="q2">Use: Test effect.</span><script>evil()</script></td></tr></table>]]></htmlTooltip></item></wowhead>`;
  const item = readRaidItemXml(xml, 1, "tbc");
  assert.equal(item.binding, "pickup");
  assert.equal(itemCategories(item).boe, false);
  assert.ok(
    item.lines.some(
      (line) => line.left === "Use: Test effect." && line.tone === "effect",
    ),
  );
  assert.ok(!JSON.stringify(item.lines).includes("evil()"));
  assert.throws(() => readRaidItemXml(xml, 2, "tbc"), /identity/);
  assert.throws(() => readRaidItemXml(xml, 1, "forever"), /edition/);
  assert.throws(
    () =>
      readRaidItemXml(
        `<!DOCTYPE wowhead [<!ENTITY x SYSTEM "file:///etc/passwd">]>${xml}`,
        1,
        "tbc",
      ),
    /Unsupported/,
  );
});
