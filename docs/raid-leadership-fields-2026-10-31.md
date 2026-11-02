# Raid leaders and assistants

The raid template now has **Leader** and **Assistant (optional)** fields on
creation and editing. Creation starts with the organizer's display name; both
names remain editable. Names are limited to 80 characters and one line.

The fields appear on Discord signup cards, the member event overview, public
event previews and calendar snapshots. Blank assistants are omitted. Removing
an assistant in the editor clears the field. Older clients that omit these
fields retain the stored values when editing other settings.

These names identify the people running the event. They do not transfer event
ownership or grant management permissions. Existing organizer authorization,
version checks, audit history and locked/cancelled-event protections remain in
place. Names alone do not change loot policy or invalidate acknowledgements.

## Existing opening-week raids

- All eight events have an explicit Leader.
- Psyrogue leads December 12 Barrow Deeps, December 13 Hyjal and December 14
  evening Onyxia; **DJ is Assistant** on all three.
- DJ leads the morning runs; **Vargos remains Assistant** on all three.
- The two DJ-led semi-hardcore evening runs have no assistant assigned.

The update preserves event IDs, signup posts, organizers, descriptions, rosters,
reserves, request hashes and policy revisions. The three Psy-led native Discord
Event descriptions were updated in place as well. Native Event descriptions
are publication snapshots; the signup card and event editor remain the current
source for names, while the existing schedule worker synchronizes native Event
names, times and cancellation.

## Migration and delivery

Migration `038_raid_leadership` adds two non-null text columns with empty legacy
defaults and database constraints. A dedicated guard prohibits leadership edits
on locked or cancelled events without changing the existing policy guard.
The normal version and delivery triggers refresh existing Discord posts.

The migration runner records and validates the SQL checksum. On this shared
database, applying new DDL requires the database owner; the website role cannot
alter the table. Production migration 038 was applied transactionally by the
owner with the same advisory lock and checksum ledger, then checked through
the standard runner. No application privileges were expanded.

The website release is `kfc-raid-leadership-20261031`, based on the previous live
`kfc-raiding-20261031` source plus reviewed raid changes and their already
deployed dependencies. Other local changes were excluded. Dependencies were
reused; only the Prisma client was isolated for preflight. The production
client was regenerated after the additive migration.

Private receipts and rollback files are under
`.data/kfc-raid-leadership-20261031/`. The previous website config and scoped
source archive remain available. Roll back code rather than dropping the new
columns or erasing real signups. No Git commit or push was created for this task.

## Verification

- 48 focused unit, rendering and contract tests passed.
- 30 native-workflow PostgreSQL checks and 14 core PostgreSQL checks passed on
  a separate temporary local cluster, using synthetic Discord identities.
- The Webpack production build and full TypeScript check passed.
- A headless Chrome check created and edited a synthetic event. Names persisted,
  policy checksums stayed unchanged, and the form fit at 1440, 390 and 320 pixels;
  event details also fit at 390 and 320 pixels. No page errors were recorded.
- The temporary browser server, tunnel and PostgreSQL cluster were stopped.
  Its test database and generated preview build were removed.

The private `live-verification.json` records the final readback of all eight
Discord cards and saved events, six public event pages, the three DJ assistant
assignments and three retained Vargos assignments.
