# Native Raid Pilot Release

Release date: 3 October 2026. Discord-member beta; anonymous access remains disabled.

## Event Editing And Member Beta

Active build: `.next-release-party-roster-20261004-r6`.
See [Raid Party Roster and Composition Guidance](raid-party-roster-release.md) for
the five-player party builder, composition guidance and current release checks.
See [Loot Experience And Discord Reposts](raid-loot-experience-release.md) for the
dedicated visual SR page, category HR, compact open-signup presentation, repost
command, item-data limitations and current release verification.
Previous event-editing build: `.next-release-event-editing-beta-20261003-r4`.

October 4 release: member authorization accepts
current membership in either KFC Guild or WoW Forever Discord, with a two-choice
join dialog and reserve-page OAuth return support. The production auth check
confirms both eligible Discord servers.

Event creators use **Edit event** on the preview to change all event settings:
edition, realm, activity, schedule, scope, capacity/composition, description,
signup mode, catalog, role SR limits, duplicates, HR and closing times. Existing
signups, reserves and the Discord message are retained. The destination and
creator are not editable; publication cannot silently move a private roster.
Locked/cancelled events and immutable loot snapshots cannot be rewritten.

Conflicting changes fail atomically: bench players before reducing confirmed
capacity, resolve affected SR before adding HR/reducing quotas, and withdraw
incompatible characters before changing scope. Unchanged closed deadlines may
be retained. Concurrent edits require refresh instead of overwriting new work.

Every successful settings edit appends a database-protected audit entry. The
preview's bottom **Change history** shows changed fields, before/after values,
named HR items and regional minute-level timestamps. Earlier edits are paginated,
not silently dropped. Only members allowed to view the event can read its history.
Settings changes invalidate website approval and participation acknowledgement;
players review updated rules without losing their seat or SR. Locking requires
the current acknowledgement from every confirmed player. Withdrawal stays available.

`FOREVER_RAIDS_ACCESS_MODE=members` removes the account pilot allowlist for
members of either configured community Discord. OAuth, disabled-account checks, session
revocation and live Discord membership checks remain. Previously private events
retain their restricted audience; explicitly confirmed community posts become
available to members. New events default to the dedicated `#event-beta` channel,
with explicit organizer confirmation of roster visibility. The channel picker
remains Discord-administrator-only, enforced server-side, not just hidden in UI.
Directory publication still requires Discord-admin approval; TBC stays out of
the Forever public LFG directory.

Live beta channel: `#event-beta` (`1555987477595029595`) in Community. The
private test channel remains `1555817928841109545`. Activation preserves the
original pilot IDs for private-event audiences, not as a member-beta login gate.

Production setup: run `scripts/raids-enable-beta.ts check`, then `prepare` to
create only the dedicated Community channel, then `activate` after installing
the verified release. Activation updates only the three beta environment values
atomically, preserving private secrets and the old private destination. Reload
only the website and raid worker. Migrations 029/030 add policy revisions and
allow audience revocation, never expansion. The original creation hash remains
immutable; untouched legacy policies keep their existing checksums.

Retain the R3 source/build and the R4 private release backup. Once edited events
exist, older code cannot enforce revised acknowledgements; prefer a forward fix.
Do not downgrade the database or erase participation to roll back.

## Open Signup And Public Post Follow-Up

Previous build: `.next-release-open-signup-20261003-r3`.

Admission offers three modes: automatic seats/overflow bench, organizer approval,
and **Open signup / select roster later**. Open signup immediately records players
as `registered`, including more applicants than the final roster capacity. They
can choose/save SR immediately. Registered players now appear in the same compact
role/class signup groups, do not consume confirmed seats, and are not described as awaiting approval.
The organizer adds selected players to the roster or moves them to the bench.
Seat limits remain enforced; only confirmed players enter the locked loot export.
Changing character/spec/role on an open-signup event returns that player to the
unselected list; an unchanged repeat signup preserves the organizer's selection.
Existing open events can now switch admission mode through the preview editor.

Public Discord posts name hard-reserved items, and native signup discloses those
names before confirmation. Long HR lists are bounded with an explicit remaining
count and link to full event details. Public posts no longer show the internal
event ID, approval/pilot footer or embed posting timestamp. Cancellation and roster
lock states remain explicit. Recovery identifies the canonical event URL, bot author
and channel; legacy footer matching remains accepted for existing-message updates.
The two existing active posts were edited in place and verified against Discord:
no internal footer/timestamp remained, and the one HR item was disclosed by name.
No event rules, signups or approval decisions were changed by that refresh.

Migration 028 adds the new admission/signup states. The rollback source archive
is in `/var/backups/wow-forever-discord/release-open-signup-20261003-r3` and the
prior R2 build remains intact. Retain any new registered rows during rollback;
older code cannot present the new registration pool correctly. Prefer a forward
fix once open-signup events exist, never rewriting player participation to roll back.

## TBC Loot Follow-Up

TBC loot follow-up build: `.next-release-raid-loot-20261003-r2`.

Create event now always offers a raid selector. Selecting a TBC raid automatically
selects its latest published loot catalog. Hosts set separate tank, healer and
DPS SR allowances (0-10 each), choose duplicate rules, and search/select HR items.
Both browser signup and native Discord confirmation lead into member SR selection.
The saved signup role determines the allowance server-side; HR and explicit item
class restrictions are enforced. Pending/bench players may select reserves without
being promised a confirmed seat. Changing roles cannot preserve an excessive SR
basket, and character/spec changes continue to clear saved reserves.

All nine TBC raid catalogs are published: Karazhan, Gruul, Magtheridon, SSC,
The Eye, Hyjal, Black Temple, Zul'Aman and Sunwell. There are 775 raid-item entries.
Relations come from the pinned MIT AtlasLoot Revival 0.2.4 release; English names
and explicit class restrictions were validated against TBC Wowhead metadata.
See `content/raid-catalogs/tbc/README.md` for provenance, licenses and regeneration.
Coverage is partial, source-reported, and does not assert current phase availability
or client verification. No Forever loot was invented or imported from TBC.

Open planning events can now acquire a matching reviewed catalog through the
preview editor; existing SR conflicts must be resolved first. Publication is
audited as an owner-authorized automated pilot import, not a manual per-drop review.

Migrations 026/027 are additive. The prior native build remains available, and
the follow-up source rollback archive is in
`/var/backups/wow-forever-discord/release-raid-loot-20261003-r2`.
Rollback source and build together to `.next-release-native-raids-20261003-r1`,
reloading only the website and raid worker. Retain the database and private secrets.
The install helper accepts `RAIDS_STAGE`, `RAIDS_BUILD` and `RAIDS_BACKUP` for
each new staged release; default values describe the initial native release.

## Hosted Service

- Website: https://www.wowforeverdiscord.online/raids
- Project: `/home/wow-forever-discord`; PM2 website `wow-forever-discord`.
- Durable worker: PM2 `wow-forever-raids`, OS account `wowforever`.
- Local PostgreSQL, isolated `forever_web` role and `Forever*` tables; no Docker.
- Existing interaction endpoint and production member OAuth callback retained.
- Separate production member-session secret; OAuth uses only `identify`.
- Current membership in KFC Guild or WoW Forever Discord is required; private
  events retain audience restrictions.
- Channel selection is Discord-administrator-only in both the browser and API.
  Ordinary users cannot inject a destination; the configured default is used.
- Only the real questing event was moved, retaining its Discord message ID.
  No synthetic events, catalogs, OAuth sessions or transient jobs were transferred.

## Implemented Native Controls

Sign up selects an edition/realm-compatible character, class/spec and role, then
asks for explicit participation confirmation. New character registration is
separate from signup. Returning players can manage/withdraw their own signup;
confirmed, pending and bench states are never conflated. Private roster views
are paginated and filter by class/role and status. Organizers can accept/bench
players and lock the immutable roster with a separate confirmation.

Public posts use activity covers, 36 application-owned class/spec emojis,
truthful capacity/role counters and budgeted named rosters with overflow counts.
The worker updates existing bot messages, not duplicate announcements.

Reviewed raid catalogs support private SR search, class restrictions, HR
exclusion, duplicate rules, independent deadlines and explicit saving. Open event
definitions and loot policies are creator-editable with visible history. Availability states,
automatic bench promotion, assigned groups, recurring events, reminders and
full Raid-Helper/Softres addon-format compatibility remain future work.

## Reliability And Security

Component requests acknowledge privately before network work. Durable work
stores only minimal inputs and an encrypted, short-lived continuation token;
tokens are never logged and are cleared after delivery/failure/expiry. Drafts
expire after ten minutes; queued work after fourteen. Membership, audience,
canonical bot/source message and actor-bound draft revision are rechecked.

Event-row locks serialize canonical mutations. The result and receipt commit
together; retrying a Discord delivery never repeats the signup. Cached private
responses are checked again before delivery, including audience revocation.
Browser/member APIs stay no-store/noindex; the private layout has no analytics.

## Operations

`deploy/raids-release-files.txt` is the scoped source manifest. Install only
verified Linux output into a new build directory; never rebuild active output.
Restore uploaded source/dependency ownership before starting the worker and test
access as `wowforever`. `FOREVER_RAIDS_NATIVE_ENABLED` is a separate kill switch.
Restart only the website and raid worker when changing their configuration.
Never restart all PM2 processes or the bridge as part of a raid release.

Register the main server's commands with `npm run bot:register`. For configured
KFC/feedback servers, use `npm run bot:register -- --feedback-approvals`.
This upserts the administrator-restricted `/approve`, message context menu
`Approve event`, and creator/admin `/raid repost`, preserving the bridge and unrelated commands. Both
registration modes have an explicit `--dry-run` option.

Backups include all `Forever*` tables and their trigger function definitions.
Restore pre-data and data, install the backed-up trigger functions, then restore
post-data; use the existing bridge-boundary restore step afterward. A disposable
scratch-database restore passed after the native deployment. Keep backups private;
live queued continuation tokens are encrypted and expire independently.

## Initial Rollback

The pre-native build `.next-release-group-pvp-time-20261002-r1` and scoped source
archive remain available. Stop only `wow-forever-raids`, disable native controls,
restore that release's source and activate its original build. The source backup
is in `/var/backups/wow-forever-discord/release-native-raids-20261003-r1`.
`backup-tools-before.tar.gz` separately preserves the prior backup scripts.
Retain the corrected backup tools during rollback unless they are the fault.
Do not roll back the shared database, erase new events or replace private secrets.

## Verification

Initial native release: typecheck and lint passed, 224 unit tests passed excluding
the previously hanging bridge suite, 18 native DB tests, 12 canonical DB tests,
and 18 desktop/mobile browser tests passed. Linux production build, HTTPS
private-route headers, unauthenticated API denial, OAuth callback origin, actual
Discord message/component payload, and independent PM2 worker health checked.
The owner subsequently confirmed the hosted controls work. Other website,
bridge, auction and listing processes were not restarted.

TBC follow-up: typecheck, lint and Linux production build passed; production
dependency audit reported zero vulnerabilities. 229 unit tests passed (the same
previously hanging bridge suite excluded), 19 native DB tests and 12 canonical
DB tests passed. The full browser suite passed 18 tests, with its opt-in channel
publication case skipped; that case was then enabled and passed separately.
Screenshots and accessibility/layout checks cover desktop, tablet and mobile.
Live catalog choices, HTTPS private-route headers, anonymous API rejection,
existing Discord post synchronization, worker health and the post-release
scratch restore were checked. The real-user native SR follow-up still needs
confirmation using a newly created loot-enabled raid.

Open signup/presentation follow-up: typecheck, lint and Linux build passed.
231 unit tests passed with the same previously hanging bridge suite excluded;
20 native DB tests, 12 canonical DB tests and all 20 browser tests passed.
The new regression covers registration beyond capacity, immediate SR saving,
organizer selection, capacity enforcement and exclusion of unselected players
from exports. Automatic and open TBC flows run on desktop/mobile, including
admin-only channel publication checks. Live Discord payloads, HTTPS privacy
headers, PM2 isolation and a new post-release scratch restore were verified.

Editing/member-beta follow-up: typecheck, lint and Linux build passed. 236 unit
tests passed with the same previously hanging bridge suite excluded; 27 native
DB tests, 12 canonical DB tests and 22 browser tests passed (21 main cases plus
the dedicated non-allowlisted-member beta case). Browser checks cover 1440, 768,
390, 360 and 320px, including accessibility scans. The history regression covers
32 edits over two pages, immutable audit rows and event-specific cursor checks.
Tests cover stale confirmations, concurrent edits, conflict rollback, closed
deadlines, audience revocation, private-event isolation and admin-only destinations.

Production signed-in preview/history, anonymous denial, HTTPS privacy headers,
member auth configuration, existing Discord native controls and PM2 health were
checked. The existing TBC event stayed at version 4 with its same signup, settings,
HR and Discord message; only routine projection retry timestamps/counters changed.
The post-release backup restored in an isolated scratch database. KFC, bridge,
auction and listings retained their existing processes. No live event settings or
player participation were changed to demonstrate the editor.
