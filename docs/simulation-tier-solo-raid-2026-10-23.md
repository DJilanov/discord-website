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

Local checks passed 393 community tests after rebasing onto the current sign-in and
OAuth-header fixes, with isolated PostgreSQL, strict TypeScript and scoped ESLint.
Browser checks passed both modes at 1440, 390 and 320 pixels,
including filters, image loading, mode history and exact links. Public Fury imports
reproduced 416.68 Solo and 839.87 Raid DPS at the recorded sampling settings.

The committed/pushed application release `c8ad9cab901f6a761ad7917b675f56410d2c0684`
was built on Linux and activated with Helper `e1b02de4eaa46717b8136b2e26e30e29c27fe9cf`.
Candidate and public checks each passed all 12 ranking cases. Public SSR, canonicals,
indexability, Helper JSON-LD and sitemap checks passed; a 13-page/127-asset sweep
included both site homes, simulators and existing recipe icons. The article update
preserved all 26 other guides and its own category, author, cover, visibility and
publication date. No new numerical engines were published.

An initial publication attempt could not traverse the private audit directory and
safely restored the previous website without changing the article. The guarded CLI
then ran as the deployment operator, preserving private permissions and the
unprivileged website runtime. The article backup is root-owned mode 0600. Owned
candidates and the isolated local database were stopped after verification.

Private deployment receipts and rollback are under
`/home/wow-forever-discord-release-audit/tier-solo-raid-20261023-c8ad9ca/`.
From that directory, `node control.mjs --rollback` restores the article and previous
website only while their current identities still match this release. The separate
documentation follow-up does not change the deployed application commit above.
