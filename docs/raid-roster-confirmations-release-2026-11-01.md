# Raid roster confirmations release

## November 2 — roster card presentation

The public card reuses the signup's artwork and shows class/spec icons and
Confirmed / Waiting / Declined columns, concise schedule/reply deadline, status
accents and links to the original Discord signup and full roster. Empty groups,
large-roster overflow, manual/expired replies and cancelled events retain their
meaning; decline explanations remain private. The native output schema supports
optional images, fields and URLs with Discord size validation.

New cards use the event-roster URL as their identity marker. Recovery also accepts
the previous internal-ID footer, so the visible footer can be human-readable
without duplicating an existing announcement. Keep the persisted receipts.

Activated only the two bot renderer/contract files in the existing worker release
at 07:13:27 UTC. The website build was unchanged. Forty-five focused tests, strict
TypeScript, lint and formatting passed. Actual Discord readback verified the same
message ID, matching signup artwork, class icons, status fields and bot-accessible
image. The selected players and actual replies are unchanged. Backups/rollback:
`.data/roster-card-design-20261102/`. Include the canonical source changes in future
worker releases; no new migration, build, commit or push was requested.

## November 2 — public roster and closed signup

Publishing now closes new signup/import paths using the existence of the stored
publication. It leaves the configured deadline, policy checksum, approval and
acknowledgements intact. Web, native Discord and the anonymous public summary
show the closed state. Organizers retain management of existing players before
the configured deadline; selected players can still answer, decline and review
rules. Publication replay remains idempotent.

The raid worker posts one public roster card in the approved event's primary
channel. It shows Waiting / Confirmed / Declined names and class/spec, start time
and reply deadline, then edits that same card when replies change. Manual and
expired replies retain their labels. Decline explanations stay private. The
original signup card now prints explicit attendance labels as well.

`lib/raids/roster-announcements.ts` uses private atomic state under
`.data/roster-announcements/`. Preserve this directory when deploying a new raid
worker. Exclusive PID locks, stable nonces and bot-owned marker reconciliation
protect restart/retry delivery. Unknown sends with no unique receipt are held;
an operator must review before retrying. A deleted card is not blindly recreated.
New cards require an approved community event and correct primary guild/channel.

DJ's November 5 leveling group was explicitly moved to its existing KFC primary
post. The Forever post remains a mirror. All five KFC memberships and private
invitation links were verified. The first operational deadline close triggered
the existing policy/approval guard; refreshed only unanswered invitations and
restored approval under the owner's explicit instruction, with immutable audit
provenance. Future publication uses state instead of changing this deadline.
Psy's separate group remains unchanged.

Worker delivery started 06:57:45 UTC; final website build activated 07:02:58 UTC:
`/home/wow-forever-discord-source-releases/roster-announcements-20261102`,
`.next-release-roster-announcements-20261102-r2`. The worker retains its prior
release with the reviewed overlay. Only web and raid worker restarted.

Fifty focused unit tests, 36 isolated PostgreSQL checks, strict TypeScript, ESLint
and a full Linux build passed. Preview/live checks covered metadata, images,
public closed state and anonymous API 401. Discord readback verified the actual
public tracker, five private links, selected five and separate Psy event. A real
player confirmation appeared in the public card; no synthetic response was sent.
No schema migration or new Git commit/push was requested. Private evidence and
rollback are under `.data/roster-announcements-20261102/` and
`.data/leveling-kfc-primary-20261102/` on the Discord host.

## November 2 follow-up

Removed the prerequisite that all selected players first review rules through
My signup. Both preview and publication now accept imported/unreviewed signups
and stale acknowledgements. The invitation includes the current terms, and only
the player's actual confirmation updates their acknowledgement. Empty rosters,
inactive accounts, organizer access, deadlines and event-version checks still apply.

Raid signup and soft-reserve pages now generate event-specific titles,
descriptions, regional start times, Open Graph/Twitter tags and existing artwork.
The anonymous metadata query uses the approved community-publication filter for
Forever and TBC and selects no member, character or reserve-choice data. Private,
unapproved, missing and unavailable events receive generic sign-in metadata.
The interactive pages remain noindex/nofollow and still require member access.

Released November 2 at 06:36:27 UTC. Website source/build:
`/home/wow-forever-discord-source-releases/roster-publication-rules-20261102`,
`.next-release-roster-publication-rules-20261102`. The raid worker retains its
existing source directory with only `lib/raids/roster-confirmations.ts` updated.
The previous compact class/spec renderer is preserved in both releases.

Verification: 45 unit tests, 36 isolated PostgreSQL checks, strict scoped
TypeScript, ESLint/formatting and the full Linux production build passed. The
new regressions failed against the old guard before passing with the fix.
Seven preview/live Discordbot HTML cases verified event metadata and images;
anonymous confirmation access still returns 401. Read-only previews succeeded
for DJ's selected five and Psy's selected organizer without changing their signup
rows, consent records, event revisions or attendance. No production invitation
or test signup was sent. Protected Helper, calendar and guild processes retained
their PIDs; only community web and the raid worker restarted.

Operations, private backups and rollback configs:
`/home/wow-forever-discord/.data/roster-publication-rules-20261102/`. The isolated
build uses webpack, the existing bridge dependency link, and a byte-verified
archive of the previous build's nine real WOFF2 assets because the current Google
Fonts response failed Next's URL parser. This changes no font source or runtime
dependency. Build instructions/evidence are in the local matching artifact folder.
No migration or commit/push was requested for this follow-up.

## Original release

The leader can publish a selected roster and request attendance replies. Members
confirm, decline with a private reason, or read preparation inside Discord. The
same controls appear in My signup when DMs are blocked. Registered, selected,
attendance-confirmed and message-delivered remain separate states.

Publication is explicit and reviewed before any DM is queued. Draft party moves
send no invitations. Selected players do not need to visit My signup to review
rules before the organizer publishes. Invitations carry the current offer; the
player's confirmation records their acknowledgement. Publishing alone does not
change existing acknowledgements or mark anyone as attendance-confirmed.
Publications, invitations, reply history and the notification
outbox are persisted by additive migration 039. Reply ownership, source guild,
message receipts, current offer and deadline are validated. KFC-only and Forever-
only members retain the November 1 signup correction.

The leader dashboard exposes awaiting, confirmed, declined, expired and delivery
problem states. Pre-lock declines release the selected seat; locked declines flag
a vacancy without changing the original loot snapshot. An explicit organizer
replacement creates a checksummed successor export with its verification reason.
Manual confirmations retain their provenance. Material offer changes require a
fresh reply; group changes update the information without discarding a Yes.

Preparation supports event-wide, role and class guidance, meeting/muster times,
HTTPS links and loot rules. Members can choose channel-only messages. Reminders
are bounded and suppressed for cancelled/removed/blocked/expired invitations.
Ambiguous sends reconcile receipts rather than blindly sending again. Private
reasons are visible only to the member and organizer and are redacted after 90
days. Unrelated roster participants and public calendar feeds cannot read them.

## Verification

- 81 focused unit tests passed for native interactions, roster contracts/renderers
  and guild guidance; 34 isolated PostgreSQL integration checks passed.
- Strict focused TypeScript, ESLint and the production Next build passed.
- 13 browser checks passed on the final roster build: leader preview/publication,
  member confirmation and decline, live owner updates, private-note isolation,
  denied organizer impersonation, anonymous 401, and widths 1440/390/320.
- Production home, help and exact raid returned 200; private confirmations API
  returned 401 anonymously. No synthetic signup or invitation was added to prod.
- The deployment startup check found the scoped worker overlay imported the new
  notification module before dotenv. It was corrected to load `./env` first;
  a startup-order regression was added. The actual worker resumed successfully,
  with no fresh configuration errors during subsequent observation.
- Actual Discord desktop/mobile DM delivery was not piloted with a real member.
  Mocked transports cover blocked DMs, ambiguous receipts and both guilds.

## Deployment and operations

Roster web/worker activation: 2026-11-01 05:32:50 UTC, source
`/home/wow-forever-discord-source-releases/raid-roster-confirmations-20261101`,
production build `.next-release-roster-confirmations-20261101-final`.
The worker remains there after the calendar-only web follow-up. The additive
migration was backed up before applying; unrelated PM2 applications were retained.
The later calendar-only website source is recorded by its separate release.

`RAID_ROSTER_NEW_SENDS_ENABLED=false` pauses publication/new sends while replies
remain supported. Deployment itself does not create invitations: the leader
must publish the roster. Never mark historic selected signups attendance-confirmed.

Private receipts, rollback settings, database and browser checks are under
`.data/raid-roster-delivery-20261101/`. Synthetic preview credentials and the
isolated preview DB must be removed after testing. Retain evidence and production
backups without exposing tokens or personal notes. Source changes are not committed;
no new commit/push was requested for this task.
