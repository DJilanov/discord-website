import type { CatalogBundle } from "../../lib/raids/catalog";
import { classes } from "../../lib/raids/contracts";

// Synthetic source facts for isolated tests, never a publishable raid loot dataset.
export const raidCatalogFixture: CatalogBundle = {
  schema: "forever-wowhead-loot-candidates.v1",
  game: "forever",
  raidName: "Synthetic Forever Raid",
  raidSourceUrl: "https://www.wowhead.com/forever/guide/synthetic-test-raid",
  sourcePatch: "test-patch",
  clientBuild: null,
  availability: "confirmed",
  coverage: "partial",
  capturedAt: "2026-01-01T12:00:00Z",
  authorizedSource: true,
  items: [
    {
      itemId: 900001,
      name: "Synthetic blade",
      sourceUrl: "https://www.wowhead.com/forever/item=900001",
      lootSource: "Test boss",
      kind: "boss",
      classes: [...classes],
      evidence: "source_reported",
    },
    {
      itemId: 900002,
      name: "Synthetic hard reserve",
      sourceUrl: "https://www.wowhead.com/forever/item=900002",
      lootSource: "Test boss",
      kind: "boss",
      classes: [...classes],
      evidence: "source_reported",
    },
    {
      itemId: 900003,
      name: "Synthetic mage item",
      sourceUrl: "https://www.wowhead.com/forever/item=900003",
      lootSource: "Test boss",
      kind: "token",
      classes: ["Mage"],
      evidence: "source_reported",
    },
  ],
};

export const tbcRaidCatalogFixture: CatalogBundle = {
  ...raidCatalogFixture,
  schema: "tbc-wowhead-loot-candidates.v1",
  game: "tbc",
  raidName: "Synthetic TBC Raid",
  raidSourceUrl: "https://www.wowhead.com/tbc/guide/synthetic-test-raid",
  items: raidCatalogFixture.items.map((item) => ({
    ...item,
    sourceUrl: item.sourceUrl.replace("/forever/", "/tbc/"),
  })),
};
