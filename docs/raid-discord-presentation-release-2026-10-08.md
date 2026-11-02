# Discord Event Presentation Release

Released October 8, 2026. Scope: event-panel formatting and in-place delivery
refresh; no event-data, schema, signup, permission or website-page changes.

## Changes

- Five-player combat groups display names with class/spec icons directly under
  Tanks, Healers and DPS, including planned targets and actual vacancies.
- Paired compact start/finish fields, a single honest roster/admission summary,
  and a short organizer excerpt with a full-details link replace repeated stats.
- Signup ordinals and decorative occupancy bars are removed. Larger events keep
  their class/party layout and bounded overflow.
- Tentative/absent/bench/pending names, named HRs, SR links, existing artwork and
  native controls remain intact. No internal footer IDs are introduced.
- Delivery detects a changed presentation even when event version is unchanged,
  edits the existing bot-owned post, and avoids patching unchanged layouts on
  subsequent polls. Identity/access/deletion guards are retained.

Affected modules: `lib/raids/discord-panel.ts`, `lib/raids/discord-delivery.ts`.
Regression coverage: `tests/raid-native.test.ts`,
`tests/forever-raid-discord.test.ts`, `tests/forever-raids-db.integration.ts`.

## Verification

All 344 unit tests passed. Twenty-four focused database integration tests passed
with isolated local PostgreSQL and mocked Discord. Typecheck, touched-file ESLint,
Prettier and whitespace checks passed. No Next build was required/run: this was
a TSX Discord-worker release, not a website UI deployment.

A temporary Discord-style layout preview used the real rendered public panel,
with Playwright checks at 1440 and 390 pixels. All four class/spec icons and the
event image loaded and there was no horizontal page overflow. Screenshots were
reviewed. This is a layout preview, not access to the actual Discord client;
Discord's own desktop/mobile rendering remains the authoritative final view.

## Deployment

Backed up the prior two modules on the existing server, installed only those
modules and restarted only the `wow-forever-raids` PM2 worker. No Docker,
database migration, website restart or unrelated process change was made.

The live Discord API confirmed both bot-owned posts matched the expected panel
at event version 10, retaining their message IDs and four signups:

| Surface              | Channel ID            | Message ID            |
| -------------------- | --------------------- | --------------------- |
| Forever event thread | `1555464828921978970` | `1555464828921978970` |
| KFC group leveling   | `1548747530790248610` | `1557777146854777023` |

Event: `cmuz20aal0000fu4s0vf3f2wx`. Fields: When, Finish, Roster, Tanks (1/1),
Healers (1/1), DPS (2/3). Posts were edited in place, not reposted as new spam.
Existing attachment/native interaction behavior was preserved.

Rollback source backup:
`/var/backups/wow-forever-discord/event-post-style-20261008/source-before.tar.gz`.

The separate KFC community audit is a proposal only, documented in the KFC repo
at `docs/discord-community-blueprint-2026-10-08.md`; no KFC settings/channels were
changed during that audit. No commit or push was made for this turn.
