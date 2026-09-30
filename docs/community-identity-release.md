# Community Identity Release

September 30, 2026. Both releases were explicitly approved, including KFC's
existing WoW Forever rebrand. The next editorial work is planned in
[Discovery Before the Member Move](pre-migration-growth-plan.md), not published
by this release.

## Published Changes

- KFC commit `abc91ba`, pushed to `main`: the approved recruitment, navigation,
  metadata and Forever page rebrand; a homepage announcement of the separate
  community; a contextual link from `/wow-forever`; regression tests; and a
  configurable output directory for safe production builds.
- Community commit `c7d0072`, pushed to `main`: a literal, visible
  `WoW Forever Discord` homepage heading, a clear independent-community
  introduction, matching description, no-JavaScript regression coverage and
  the research-backed growth plan. The existing logo and artwork remain.
- The announcement discloses shared organizers without requiring KFC
  membership. KFC's guild invitation remains separate from the community
  invitation. No membership totals, endorsements or activity were invented.
- Local tool settings, private files and the unrelated local KFC Nginx
  configuration were excluded. Existing KFC crawler restrictions were not
  changed on the server.

## Deployment

Both projects use `.next-release-20260930-community`, built independently on
Linux. The dependency lockfiles matched production, so existing pinned Linux
dependencies were retained. There were no schema migrations, content seeds,
database edits, dependency updates or Nginx changes.

Only the named root-managed PM2 applications were restarted: `kfc-website`
and `wow-forever-discord`. Unrelated application PIDs were unchanged across
each activation. The community app still runs as `wowforever`; production
continues to use the existing local PostgreSQL service, without Docker.

Both builds passed local-only staging checks before activation. Previous
immutable static files were retained for visitors with older HTML. PM2 saved
the new build selections. SHA-256 comparisons confirmed that all 25 KFC and
five community files in the implementation commits matched production.

## Verification

- KFC: changed-file ESLint, TypeScript, two announcement tests and production
  builds passed. Live checks covered six changed routes, widths 320/390/1440,
  contextual links, the no-JavaScript announcement, scoped accessibility,
  canonical/share metadata, the 1200-by-630 share image and anonymous admin
  protection.
- Community: ESLint, TypeScript, 24 unit/integration tests, the complete
  20-test Playwright suite and production builds passed.
- `npm run verify:public` passed against production: all 28 sitemap URLs,
  desktop/mobile rendering and accessibility, decoded images, HTTPS
  redirects, invitation redirect, metadata and private-route denial.
- Additional production checks verified the exact community heading,
  introduction, schema name and canonical without JavaScript at
  320/390/1440 pixels. Live desktop/mobile screenshots were visually reviewed.
- Public browser verification used DNT. No production recruitment, report or
  guild submissions were created. Temporary staging listeners were stopped.
- At the post-verification process check, the community app had approximately
  360 MiB RSS and neither application had restarted unexpectedly. This is a
  bounded release check, not a load-test result or memory ceiling.

## Recovery

Restricted source snapshots are retained at:

- `/var/backups/kfc-website/release-20260930-community/source-before.tgz`
- `/var/backups/wow-forever-discord/release-20260930-community/source-before.tgz`

The community database/private-file backup completed before deployment.
Previous build selections are `.next` for KFC and
`.next-release-20260929-editorial-v2` for the community. Restore the appropriate
source snapshot and select that prior build using the project's runbook.
Preserve environment files, uploads, private storage and later submissions;
do not restore the shared database for this content-only rollback.

Google/Bing account actions, outreach, organizer approvals and the proposed
articles remain separate work. Deployment is not proof of recrawling, a
ranking increase or an AI recommendation.
