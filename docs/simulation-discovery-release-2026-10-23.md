# Solo/Raid comparison guide and ranking discovery

Status: implementation and local checks complete; production rollout pending.

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
