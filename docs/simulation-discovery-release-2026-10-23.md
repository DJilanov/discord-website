# Solo/Raid comparison guide and ranking discovery

Status: committed, pushed, deployed and publicly verified.

The legacy tier-list article keeps its URL and becomes a unique editorial comparison
guide. KFC hosts the complete numerical rankings; this article explains when to use
each one, why support changes DPS and how to compare builds fairly. Its title and
excerpt match that purpose, and its duplicated full ranking board is removed.
The article remains indexable with its own canonical because it now serves a
distinct purpose. Existing query-mode links still reach the explanatory guide.

All nine class guides link directly to KFC's Solo and Raid pages with descriptive
anchor text. Their own study references remain distinct from numerical ranking
publication. Paladin remains explicitly outside the current 21-build ranking.

Use `scripts/refresh-simulation-discovery.ts --dry-run` before publication.
`--publish --backup=/absolute/private.json` atomically refreshes exactly the ten
known, currently published guides, preserving custom SEO metadata and all other
fields. It authenticates the prior publication and refuses editorial changes.
`--rollback-backup=/absolute/private.json` restores only this revision and refuses
later text or SEO edits. Backups are created exclusively with mode 0600.
The original one-article refresh CLI remains tied to its own historical release.

Validation: 398 ordinary tests passed, alongside TypeScript and scoped ESLint.
The isolated PostgreSQL integration test exercises real dry-run, publication,
idempotence, untouched articles, metadata and guarded rollback through the CLI.
Candidate and public checks must verify the article's new purpose and all nine
class-guide links after the actual database refresh; source changes alone do not
update already published database content.

Application release: `af3a56a8c2bec838e80cbf03165b4e83f8f78700`, paired with Helper
`65ce30606f600f91994f06075945705c98bdbd14`. Both exact source archives were built
on Linux. All 30 private preview cases and all 30 public article/class-guide cases
passed at 1440, 390 and 320 pixels. The Helper passed 12 candidate and 12 public
discovery cases without JavaScript. Public verification also passed 13 SEO checks
and a 22-page/453-asset sweep, including the site homes and existing recipe icons.

The actual publication atomically updated ten guides. All other 17 records and the
updated articles' protected fields stayed unchanged. A repeat dry-run reports zero
updates and ten preserved guides. The backup is private and revision-bound. Existing
query-mode links resolve to the same self-canonical explanatory article, which no
longer embeds the ranking board.

Private receipts and rollback are under
`/home/wow-forever-discord-release-audit/seo-discovery-20261023-af3a56a/`.
From there, `node control.mjs --rollback` restores the ten articles and previous
website only while release and content identities still match. The frozen numerical
installation and unrelated services were preserved. Owned previews and the isolated
test database were stopped. The server retains the live community source and its
two most recent rollback sources; obsolete clones were checked and pruned.
Documentation-only follow-ups do not change the application release identity above.
