# Native scheduled-event projections

## November 2 — restored both KFC leveling entries

DJ's former KFC native Event `1550723826864889886` was deleted; the worker
correctly refused to recreate an externally removed Event. Psyrogue's new
signup had no native Event or binding. The owner's repair request authorized
creating both missing KFC entries:

- DJ: <https://discord.com/events/1411533815356194968/1566688030972969075>,
  canonical `cmuz20aal0000fu4s0vf3f2wx`.
- Psyrogue: <https://discord.com/events/1411533815356194968/1566688035708473495>,
  canonical `cmvy07lb500000m4sbok6tgqq`.

Both run November 5, 08:30–20:30 CET and point to their separate signup posts.
The old deleted KFC ID is retired; the existing Forever projection remains.
Psyrogue's entry also exposed an eligibility bug: maintenance required a KFC
mirror even when the primary signup was already in KFC. The new publication
predicate accepts an approved, consented, delivered KFC primary post or an
approved community post with a sent KFC mirror. Private, unapproved and
undelivered publications remain excluded. Creation still requires an explicit
reviewed binding; the synchronizer does not automatically recreate deleted Events.

The worker-only three-file correction was installed November 2 at 05:42:24 UTC.
Only `kfc-community-calendar` restarted. Fifteen focused tests, strict scoped
TypeScript and lint passed. Actual Discord readback, matched worker state and
fresh logs verified both bindings. Eight existing KFC raid Events, the Forever
Event, canonical website settings and all signup records were unchanged. The
worker was online through multiple cycles with no projection holds/errors.
No website build, migration, signup or attendance DM was needed.

Private backup, source manifest, creation receipts and verification:
`/home/wow-forever-discord/.data/leveling-calendar-20261102/`.
Local receipts: `wow-trader/artifacts/leveling-calendar-20261102/`.
To roll back code, stop only the calendar worker, restore the three recorded
source backups, clear only locks whose owning process is confirmed dead, and
restart the same named worker. Do not delete the new native Events or change
rosters as part of a code rollback. Source changes are retained locally; no
commit or push was requested.


October 31 extension: eight additional KFC-only opening-week raid projections
are live. Their exact bindings are in `.data/kfc-raiding/config.json` under
`managedNativeEvents`, with creation receipts in `opening-week.json`. The
`lib/kfc-raiding/native-events.ts` synchronizer reuses the cycle's native Event
list and owns only bound name/start/finish/cancellation fields. Manual changes
are held and deleted Events are not recreated. These bindings are separate from
the November 5 cross-server projections below. See the
[release ledger](kfc-raiding-release-2026-10-31.md) for all eight dates and links.

The November 5 WoW Forever leveling session has one canonical schedule in the
website database and two native Discord Event projections:

- KFC: `1411533815356194968` / `1566688030972969075`
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
