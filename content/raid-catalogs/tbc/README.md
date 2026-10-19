# TBC Raid Loot Catalogs

Source: [AtlasLoot Revival 0.2.4](https://www.curseforge.com/wow/addons/atlas-loot-revival/files/8963708),
MIT-licensed. Boss/trash/event/quest relationships come from the pinned addon
release, not a fabricated Wowhead crawl. English item names and explicit class
restrictions were validated against Wowhead's TBC tooltip endpoint on 3 October
2026. Item URLs lead to the TBC item page; no raw tooltip HTML is redistributed.

The nine catalogs contain 775 raid-item entries. They include rare-or-better
items and exclude Badge of Justice. Coverage is explicitly partial: curated
trash, lower-quality drops and quest/crafting reward chains are not asserted
complete. Class filtering enforces explicit item class restrictions, not
spec-specific best-in-slot, armor/weapon proficiency or master-loot eligibility.
Host policies remain authoritative. This is source-reported TBC data, not
client-observed Forever loot or proof that a phase is currently unlocked.

The source archive SHA-256 is recorded in every bundle. Preserve the accompanying
MIT license and third-party notices when distributing this derived data.

Regenerate locally using development-only Lua/HTML parsers. The importer reads
static Lua tables without executing addon code. Requests are paced, respect
429 retries, stop on missing metadata and resume from the normalized cache.

```sh
npx tsx scripts/raids-tbc-catalogs.ts --archive /tmp/AtlasLootRevival-v0.2.4.zip \
  --output content/raid-catalogs/tbc --cache artifacts/tbc-item-metadata.json
npx tsx scripts/publish-tbc-catalogs.ts content/raid-catalogs/tbc
```

Publication requires an explicit `--publish` argument and an active owner/admin
staff ID. Staging/review are audited. Reimporting identical content is idempotent;
existing event catalogs, acknowledgements and locked exports are never rewritten.
