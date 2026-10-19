# Native scheduled-event projections

The November 5 WoW Forever leveling session has one canonical schedule in the
website database and two native Discord Event projections:

- KFC: `1411533815356194968` / `1550723826864889886`
- WoW Forever Discord: `1554316932948172940` / `1560892325117435904`
- Canonical event: `cmuz20aal0000fu4s0vf3f2wx`

The forum post, mirrored announcement, native Events and website page are
different presentation surfaces. The website event remains authoritative for
the title, start, finish, status, roster and signup. Discord's Interested count
is not a roster place.

## Synchronization contract

`scripts/kfc-event-maintenance.ts` reads the canonical event and reconciles both
native Events during the same maintenance pass. Watch mode runs every 30
seconds, so a saved schedule change normally reaches both guilds within one
cycle. Discord writes are not an atomic cross-guild transaction: if the second
write fails, the verified first projection is retained and the next cycle
reconciles the remaining projection.

The synchronizer owns only these native fields:

- event name;
- scheduled start;
- scheduled finish;
- cancellation when the canonical event is cancelled.

It deliberately preserves each Event's description, location, cover image and
Interested members. It never creates, deletes, reactivates or silently replaces
a bound Event. A missing Event, unexpected identity, non-external Event, manual
change since the last verified state, lost permission or changed canonical
revision fails closed and is recorded in the private maintenance journal.

The HTTP client accepts only the two approved guild list routes and the exact
bound Event routes. Writes accept only the four owned fields. New native Event
projections require an explicit reviewed binding in
`content/kfc-community.ts`; this prevents every public LFG post from becoming a
Discord Event automatically.

## Operations

Preview without writes:

```sh
node_modules/.bin/tsx scripts/kfc-event-maintenance.ts
```

Run one applying pass:

```sh
node_modules/.bin/tsx scripts/kfc-event-maintenance.ts --apply
```

Production runs `--apply --watch` as the `kfc-community-calendar` PM2 process.
The private `.data/kfc-community/maintenance.json` file stores the last verified
version and read-back for each projection. JSONL journals in the same directory
record pending, matched and verified operations without exposing the bot token.

After deployment, verify both Events through Discord's API and compare their
name, start, finish, type and status to the canonical database event. Also check
that the worker is online and its newest log contains no held or failed
projection. Do not test synchronization by making an untracked manual edit to a
live Event; the ownership guard will correctly hold that projection for review.
