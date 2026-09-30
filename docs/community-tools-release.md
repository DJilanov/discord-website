# Community Tools Release

September 30, 2026. Published and verified in production from commit `3f0e061`.
No Discord messages, bot activation, crawler-policy changes or collector uploads
are part of this batch.

## Delivered

- `/addons`: WoW Trader first, actual product imagery, and distinct public-web,
  controlled-collection and untested-addon states.
- `/addons/wow-trader`: browser workflow, upload-dependent freshness, history
  limits, KFC Helper ownership and companion distribution boundaries.
- `/contribute`: five assignments for the already-invited testers, manual
  coordination in help-support, private diagnostics boundaries, and a copyable,
  downloadable report. This is not a live claim queue or bot-backed intake.
- Two original articles: playing with friends and reading market estimates. The
  latter uses clearly invented arithmetic, not fabricated current prices.
- Corrected beta, launch, recruitment and group guidance and blank templates.
  Ten source articles now include the previously prepared beta/launch guides.
- Explicit character-ruleset inputs, filters and staff review for guilds/groups,
  without requiring a fabricated realm.
- Navigation, sitemap, article metadata, related reading and llms index links.
  Discoverability improvements do not guarantee rankings.

## Data Safety

`002_grouping_rulesets.sql` adds `gameRuleset` to both listing tables, defaulting
to Unconfirmed. Historical realm/activity fields remain intact and visible to staff.
An old activity value is not proof of a character ruleset, so it is not backfilled.
Groups require Normal, PvP or Roleplaying; guild planning also permits Unconfirmed
and explicitly planned Hardcore. Staff cannot approve a group without confirming an
available ruleset. Social PvP/RP activity filtering is separate from character rulesets.

The migration runner preserves transactions, advisory locking and exact checksums.
The initial migration is unchanged. Report/alert identity and ForeverGuard matching
remain a separate validation gate, not a silently completed migration.

`content/editorial-history.json` preserves exact September 29 and early September
30 revisions for the guarded publisher. Custom titles, excerpts, content, drafts,
authors, covers and metadata retain their existing protection. Future releases need
an exact recognized baseline, not a force-overwrite switch.

The updated group-form screenshot uses a new URL to avoid stale cached imagery.
The old image remains for historical/custom articles. Trader imagery is explicitly
dated, not a live quote or an in-game compatibility claim.

## Production Rollout

- Runtime build: `.next-release-community-tools-3f0e061`, activated through the
  existing root PM2 daemon; the application runs as `wowforever` on port 19320.
- A fresh database/private-files backup was restored into an isolated scratch
  database successfully before deployment. The scratch database was removed.
- Restricted source rollback, configuration fingerprint, process baseline and
  before/after article snapshots are under
  `/var/backups/wow-forever-discord/release-community-tools-3f0e061`.
- The dependency lockfile and production environment were unchanged. Existing
  Linux dependencies were reused; Prisma was regenerated for the additive schema.
  A generated-client ownership mismatch was corrected before publication/build.
- Migration `002_grouping_rulesets` applied once; the subsequent run reported the
  schema current. Existing realm/activity values were retained.
- Production publication created four guides, refreshed five recognized versions
  and preserved one unchanged guide. The subsequent dry run created/updated zero
  and preserved all ten. Existing IDs, dates, covers and custom metadata were
  checked against the private snapshot.
- The previous `.next-release-20260930-community` build remains available for
  rollback. Its hashed static assets were retained in the new build for cached HTML.
- Only `wow-forever-discord` was reloaded. KFC and both Helper processes retained
  their PIDs, restart counts and uptimes. Production database isolation and private
  file permissions passed verification. The post-browser check showed about
  336 MiB application RSS and no additional restart after the intentional reload.

The earlier editorial preparation, planning documents and operator tools were
included in the source commit. Deployment did not execute Discord operator tools,
register commands, activate interactions, change crawlers or upload market data.

## Future Release and Rollback

1. Review the intended source/content changes and worktree before committing;
   exclude credentials, private operator output and unrelated project changes.
2. Back up the database and record the current application and affected articles.
3. Run generation, migration, typecheck, lint, tests, browser checks and build.
   DB-backed tests must use the isolated local database on port 55432, never
   production. Apply the additive migration to the release database separately.
4. Review `npm run content:publish-editorial -- --dry-run` in the intended
   publication environment. Merge preserved editor revisions through /admin.
5. Deploy code through the existing PM2/Postgres runbook before publishing approved
   content with `npm run content:publish-editorial`. Restart the app to load the regenerated
   Prisma client; a long-running dev process can retain its old global client.
6. Verify new routes, sitemap entries, downloads, forms, review and both kinds of
   filtering. Confirm no draft addon or bot publishing was activated.

When rolling back code, retain additive columns and do not erase new submissions.
Keep guild/group intake unavailable during an incompatible rollback until a forward
fix or review is complete. Restore article snapshots only when the current row still
matches the released revision; preserve intervening admin edits.

## Verification

Verified September 30: 65 unit/integration tests and all 27 Playwright tests pass,
along with strict typecheck, lint and the production build. A second migration run
reports the schema current; the final publication dry-run creates/updates zero
articles and preserves all ten. Screenshots were inspected on mobile and desktop.
The fresh Linux production build also passed.

Live verification passed for all 34 sitemap URLs, desktop/mobile rendering,
accessibility, real image decoding, metadata, HTTPS redirects, the configured
Discord invite, anonymous admin/API denial and the absence of test alert entries.
Focused live checks covered all ten guides at 390/1440px, the five new/reworked
screens at 320/390/1440px, 36 internal links, four text downloads, ruleset form
fields and the no-JavaScript tester-report fallback. Live screenshots were inspected;
no production test submissions were made. Screenshots are retained locally under
ignored `artifacts/community-tools-live/`.

Lua assertions and syntax checks passed; `npm audit --omit=dev` reported zero
vulnerabilities. Neither result establishes game-client compatibility. Physical
device and field Core Web Vitals checks remain outside this release's evidence.

The alternate preview uses port 19301 with `FOREVER_BUILD_DIR=.next-tools-preview`
and a matching local auth URL. Run browser tests with `PLAYWRIGHT_PORT=19301`.
The development origin allowlist follows the exact `PORT`; production still
permits only the configured site origin, with no wildcard exception.

New browser checks cover 320, 390, 768 and 1440px, image decoding, overflow,
accessibility, clipboard denial, no-JavaScript reading, downloads, metadata,
sitemap and submission/review flows. Existing home checks also cover 1920px.
Screenshots are in ignored `artifacts/community-tools/`. These are not game-client
or desktop-package compatibility tests.

The server filesystem remained 91% used, with approximately 6.8 GB available after
the build. Plan scoped retention/cleanup separately; rollback builds and unrelated
services were not deleted to make space. Off-host recovery remains outstanding.

## Upload Coverage Next

The owner confirmed market updates depend on voluntary app uploads and can have
gaps. The refreshed September 30 screenshot showed a recent scan but incomplete
history, so freshness and confidence remain distinct throughout the new copy.

Next bot/data work should:

- Coordinate a small rotation of approved collectors for active markets, without
  asking ordinary browser testers to install collection software.
- Read per-market last accepted scan, coverage and stale/unknown state from the
  public service, never infer them from uptime or download counts.
- Offer an optional deduplicated maintainer notice at an agreed stale threshold,
  with a quiet period and recovery notice rather than repeated public pings.
- Define storage retention, scan frequency, deduplication, per-install revocation
  and private support before expanding upload volume.
- Keep B0/B1 bot delivery and Helper search-crawler changes in separate releases.
