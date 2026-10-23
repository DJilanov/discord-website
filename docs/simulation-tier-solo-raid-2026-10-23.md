# Separate Solo and Raid rankings

The existing `wow-forever-dps-tier-list` article now renders independent rankings
with `?scenario=raid` (default) and `?scenario=solo`. Mode links work without
JavaScript and preserve the selected scenario on reload. Both modes rank the same
21 currently published standard builds across eight classes. The nine class guides
retain their separate 25-build research references; their historical scores are
not mixed into the new ranking.

Both datasets use level 60 against one stationary level-63 boss for 300 seconds,
5,000 iterations per build and seed 58723001. Gear, talents, consumables and authored
rotations remain fixed. Solo retains maintained self-support; Raid supplies the
documented shared buffs and boss debuffs. This is sustained boss DPS, not a farming,
survivability or separately optimized solo-build comparison.

The Helper benchmark runner measured 210,000 real WASM fights, retaining complete
binary input/output evidence. `scripts/import-tier-scenarios.ts` authenticates the
snapshots, policies, publication identities, engine/database hashes and decoded
responses before generating the committed bundle and per-mode public downloads.
Exact links use the frozen simulator's standard `?i=gtrcmxeu` import categories,
including recorded iteration count and seed. They do not apply raid-default migration.

`scripts/refresh-tier-guide.ts --dry-run` checks the existing published article.
`--publish --backup=/absolute/private.json` updates only a recognized old revision,
preserves custom metadata and writes a private backup before its compare-and-swap
update. `--rollback-backup=/absolute/private.json` restores that article only while
the published revision and SEO metadata still match this release. Concurrent or
unrecognized editorial changes are refused. Other guides remain untouched.

Local checks passed 389 community tests with an isolated PostgreSQL database, strict
TypeScript, scoped ESLint and 17 focused evidence/publication tests after the final
metadata guard. Browser checks passed both modes at 1440, 390 and 320 pixels,
including filters, image loading, mode history and exact links. Public Fury imports
reproduced 416.68 Solo and 839.87 Raid DPS at the recorded sampling settings.

Publication requires committed/pushed source, an isolated Linux build and candidate
and public browser checks. This document records implementation and local evidence;
deployment receipts record the actual activated commits and article backup.
