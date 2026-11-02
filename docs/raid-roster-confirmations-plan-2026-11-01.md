# Raid roster publication, player confirmation and preparation

Status: implemented and deployed November 1, 2026. See the
[release and verification record](raid-roster-confirmations-release-2026-11-01.md).
Publishing remains an explicit leader action; deployment sends no invitations.
Owning project: `discord-website`; applies to KFC and WoW Forever Discord raids.

## Product decision

The leader finishes assigning groups, reviews **Publish roster & request
confirmations**, and sends one personal Discord invitation to each selected
player. Players confirm or decline inside Discord and receive their raid
preparation instructions. Their replies update the same canonical raid roster.

Dragging players into parties remains draft work. Publishing is an explicit
leader action. Existing **Lock roster** freezes the loot export and is a later
step, normally after player replies have been collected.

Keep three independent concepts visible:

| Concept | Meaning | Example states |
| --- | --- | --- |
| Roster selection | Leader's choice of player/seat | Selected, bench, unselected |
| Player reply | Player's response to this invitation | Awaiting reply, confirmed, declined, no response, revoked |
| Message delivery | Bot's ability to send the invitation | Queued, sent, blocked, retrying, delivery uncertain |

Currently internal `accepted` signups are labelled Confirmed in several views.
That means leader-selected/automatically admitted, not a fresh attendance reply.
Retain the internal selection contract initially; update labels to distinguish
Selected from Attendance confirmed. Historical players must not be backfilled as
having replied to an invitation they never received. An API-accepted DM is Sent,
not proof that the recipient read it.

## Current code that can be reused

- `lib/raids/service.ts`: event-row transactions, organizer authorization, version
  checks, capacity, party assignments, policy acknowledgement and audit records.
- `event-preview.ts`, `discord-panel.ts`, `native-ui.ts` and
  `components/raids/event-roster.tsx`: shared roster summaries and member/leader UI.
- `native-interactions.ts` and `native-worker.ts`: signed interaction ingress,
  actor-bound actions, durable deferred work and response recovery.
- `lib/discord-listings/transport.ts`: verified bot DM channel/message identity,
  stored send receipts, nonce/enforce_nonce usage. Reuse its pattern with a
  raid-owned transport; do not reuse listing credentials or recipient policy.
- `content/kfc-forever-opening-week.ts` and the existing raid guides: reviewed guild
  preparation/loot copy. Reuse these sources instead of inventing requirements.
- `ForeverRaidLootSnapshot`: immutable final export. Do not turn sending an
  invitation into an irreversible loot lock.

The November 1 membership fix must survive this implementation: use the
invitation's actual approved raid guild, not the global default guild and not a
requirement to belong to both servers.

## Leader journey

1. Build the parties using the current roster builder. Only selected, available
   signups with a compatible character are candidates for invitations.
2. Click **Publish roster & request confirmations**. Review recipients, roles,
   reply deadline, muster/start/end times, preparation and the exact DM preview.
3. Choose the reply deadline. Suggested default: the earlier of 24 hours from
   publication or two hours before raid start. If that is already past, require
   an explicit future short-notice deadline before the raid; never send an
   already-expired invitation.
4. Publish atomically: persist the publication, per-player invitations and outbox
   jobs under the event lock. A repeated click with the same request key and
   payload returns the existing publication. Do not send network messages while
   holding a database transaction.
5. Show a confirmations panel with character, class/spec, assigned role/group,
   reply, delivery issue, deadline and latest update. Reasons are organizer-only.
   Grouped filters: Awaiting, Confirmed, Declined, No response, Delivery problems.
6. Declines and deadline problems create a concise organizer alert and a vacancy
   requiring attention. Suggest eligible bench players using the existing role,
   capacity and composition rules. The leader chooses the replacement, who gets
   their own invitation. Do not silently promote the first bench player.

The current assistant-name field is display metadata, not delegated authority.
Use the existing organizer authorization. Real co-organizer privileges would
need an explicit ACL; do not infer them from a nickname or display field.

## Player message and interactions

Illustrative DM:

> You have been selected for KFC's Hyjal raid.
>
> Your character: the character you signed up with · specialization · Tank
> Your group: 1 · Leader: the raid organizer
> Be ready: localized muster time · Pull: localized start time
> Expected finish: localized end time · Reply by: localized deadline
>
> Preparation: repairs, required consumables, access/attunements and the
> leader's instructions below. Loot terms are included or available in the
> preparation panel.
>
> Confirm that you can attend, or decline so the leader can arrange a replacement.

Buttons: **Confirm attendance**, **Decline**, **Preparation**, **Open raid in Discord**.
Use Discord timestamps for each date/time so the member sees their own timezone.
Use the selected character and role snapshot, not a current nickname or a changed
profile. The original Discord raid remains the authoritative public post.

- Confirm persists an idempotent attendance reply and updates the DM with the
  saved result, time and preparation shortcut. It cannot claim a removed seat.
- Decline asks for a short reason/category, with optional detail and a
  Prefer not to say option. Record the response and free the active pre-lock
  selection, party position and active SR according to the existing absence
  rules. The profile remains saved. Notify the organizer privately.
- A confirmed player can later report that they cannot attend. Never trap them
  in Yes. Record the change and notify the leader; apply the late/locked rules
  below instead of overwriting a frozen export.
- Preparation opens a bounded Discord panel with role/class-specific guidance.
  Optional web guides can provide more detail; browser login, Companion and a
  website account are not prerequisites for replying.
- If a reply races with removal, cancellation, a replacement or another reply,
  check the current invitation/seat under the event lock before applying it.

## Preparation content

Store a validated event preparation configuration with a reviewed preset and
leader overrides. Include muster time, meeting location, voice channel, expected
end, preparation bullets, required versus recommended items, access requirements,
loot/SR/HR rules and tactics links. Add small role/class sections only where they
apply to that edition and event. Do not copy TBC supplies into Forever by guesswork.

Support Normal and Semi-hardcore presets from the actual guild rules. A checklist
may help the player prepare, but checking it is not a gear inspection or proof of
readiness. Avoid automatically imposing unverified gear, resistance, consumable
or performance requirements. The leader reviews the outgoing preparation text.

## Replies must work in DMs and in the server

The existing native schema requires `guild_id` and `member.user`. Discord DMs
supply `user` and omit the guild context. Add a dedicated strict invitation
interaction schema/dispatcher rather than weakening the guild signup schema.

Bind every action to the stored invitation, intended Discord user, bot-owned DM
channel/message and action revision. Modal submissions remain recipient-bound
even if their payload omits the original message. An opaque custom ID identifies
an invitation; it is not permission to act on somebody else's behalf. Preserve
Discord signature verification, request replay receipts and input limits.

Check membership against the stored raid guild for positive confirmation and
private preparation access. A recipient may still decline their own existing
invitation after leaving the server, so they can release a place; that operation
must not expose further private event data. A membership outage is not a decline.

Acknowledge each button click promptly, then process durable work. Invitations
can live until the event's reply deadline, independent of the existing ten-minute
native drafts. Each click creates a fresh Discord interaction; do not try to send
the original invitation through an old interaction token days after signup.

Add the same **Respond to roster invitation** actions under the existing private
**My signup** view. Both surfaces call the same service. This keeps the flow inside
Discord if DMs are disabled or the original DM cannot be found.

## Delivery, privacy and reminders

Only notify people who signed up for this event and are selected for publication.
Explain event-specific messages during signup and respect a channel-only
preference. Imported, unacknowledged entries need member review; they must not be
silently treated as personal participation or notification consent. No server-wide
DM campaign or marketing subscription is involved.

Use a persistent outbox with bounded concurrency, leases, shared rate-limit
handling and a unique invitation/message-kind/revision key. Persist DM channel
and message receipts. Use deterministic nonces as short-term deduplication;
Discord only enforces nonce uniqueness for a few minutes. For an ambiguous send,
reconcile the known bot message/nonce before retrying. Otherwise mark Delivery
uncertain for review; never promise exactly-once delivery after arbitrary crashes.

Blocked DMs are visible to the leader and recoverable through My signup. Do not
retry permanent privacy failures forever or count them as player declines.
Public rosters may show reply status; decline explanations and delivery details
are private to the member and organizer. Do not put the explanation into the
existing participant-readable event history or public Discord post.

Default reminders: at most one to unanswered invitations before the deadline,
with enough spacing after the initial message. Offer one preparation reminder to
confirmed players before muster. Suppress overdue, duplicate, revoked, blocked
and cancelled reminders. A short-notice invitation should not immediately produce
a second reminder. No response becomes an explicit organizer-visible state;
replacing that person is a deliberate leader action, not an automatic no-show label.

## Changes, deadlines and final locking

- A start-time, required role, character/spec, edition, raid destination or material
  loot/rules change supersedes the affected invitation and requests a new reply.
  Show the changed terms. Keep an audit of the previous response.
- Reordering groups or unrelated players responding does not invalidate another
  player's Yes. Informational preparation edits can update the existing DM.
  Separate an invitation terms checksum from the event's general version counter.
- Removing/benching a selected player revokes their invitation and updates its
  controls. Cancellation invalidates active requests and sends one event update
  to the affected members. A removed player cannot reclaim a seat with an old DM.
- Ordinary signup closing must not prevent replies to already-issued invitations
  before their own deadline. Implement this as a dedicated response command;
  do not reopen general signup or capacity bypasses.
- Final loot locking normally requires current policy acknowledgement and positive
  replies from the selected roster. An explicit leader override can record a
  manually verified or unresolved player without pretending the player clicked Yes.
- After final lock, record late declines/availability changes separately, notify
  the leader and mark an operational vacancy. Never rewrite the original locked
  loot snapshot. A replacement requires an explicit versioned roster amendment
  and revised export, with the old snapshot retained. Do not silently unlock.
- After a deadline, old confirmation buttons cannot acquire a seat. The leader can
  issue/reopen a valid request if a place remains. A member can still report absence.

## Proposed data and implementation boundaries

Use the next additive migration, preserving existing event/signup rows:

1. `ForeverRaidRosterPublication`: event, publication revision, organizer,
   selected-roster checksum, terms/preparation snapshots and deadline.
2. `ForeverRaidRosterInvitation`: publication/signup/member, original guild,
   character/role offer, semantic terms checksum, active state, reply/revision and
   timestamps. Enforce one active offer per event/signup.
3. `ForeverRaidRosterResponse`: append-only recipient reply history and private
   reason. Deduplicate by the signed interaction receipt, not by arbitrary text.
4. `ForeverRaidNotification`: durable invitation/update/reminder/organizer-alert
   outbox with retry/lease state, nonce and verified message receipt.
5. `ForeverRaidRosterAmendment`: append-only successor to a locked roster, with
   original snapshot reference, revision, previous revision/checksum, actor,
   reason and a new frozen payload/checksum. Its current effective revision must
   be explicit in operational views and exports; the initial snapshot stays intact.

Store only safe public summaries in the existing event audit. New private data
needs narrow API response shapes, authorized reads, runtime grants, appropriate
retention and inclusion in the enumerated backup/restore checks. Locked roster
amendments must preserve snapshot history rather than replacing the unique
original `ForeverRaidLootSnapshot` record. General locked-event mutations remain
prohibited; the explicit amendment service owns the constrained replacement
transaction and validates roles, capacity, policy acknowledgement and publication.
Exports need an explicit revision-aware contract and consumer validation; never
silently pass an amended roster off as the original locked export.

New feature-owned modules should cover validated contracts, transactional service,
DM presentation/transport and outbox delivery. Integrate them through the existing
`app/api/discord/interactions/route.ts`, raid API, shared roster views and
`scripts/raids-discord-worker.ts`. Keep native signup processing responsive while
DM jobs run. Reuse the existing queue patterns and dependencies; a new chat agent,
AI model, Electron feature or external messaging service is unnecessary.

## Delivery sequence and acceptance checks

1. Schema and domain service: publication, replies, private reasons, replacement,
   semantic revisions and deadline/locking rules, with PostgreSQL regressions.
2. Bot: real DM transport, strict DM button/modal dispatch, native My signup
   fallback, bounded preparation panels and resilient delivery/reminders.
3. Leader experience: publication preview, confirmation dashboard, private reasons,
   delivery problems, replacement suggestions and explicit final locking/amendment.
4. Validate the complete feature, then coordinate web/worker deployment. Preview
   against isolated data; use only explicitly authorized recipients for a live DM
   pilot. Disabling new sends must leave existing response handlers available.

Required checks include KFC-only and WoW-Forever-only recipients; no prior website
account; reply hours/days after the initial send; blocked DMs; invalid/forwarded
controls; another user clicking; modal retries; concurrent confirm/decline;
post-signup-close replies; late absence; changed rules/time; removed players;
role/capacity constraints; cancellation; lost receipts; process restarts; 429s;
unknown membership; stale message updates; private reason access; and original
locked snapshot preservation. Verify desktop and phone layouts, publication
idempotency and no DM from a draft roster drag. Keep existing native signup,
attendance, composition and loot regressions passing.

## Primary sources reviewed

- [Discord: DM creation and user-triggered messaging](https://docs.discord.com/developers/resources/user#create-dm).
- [Discord: interaction payloads, response deadlines and token lifetime](https://docs.discord.com/developers/interactions/receiving-and-responding).
- [Discord: message creation and bounded nonce deduplication](https://docs.discord.com/developers/resources/message#create-message).
- [Discord: rate-limit handling](https://docs.discord.com/developers/topics/rate-limits).
- [Discord: why DMs can be blocked](https://support.discord.com/hc/en-us/articles/360060145013-Why-isn-t-my-DM-going-through).
