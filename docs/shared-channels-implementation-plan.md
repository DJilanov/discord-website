# Shared Discord Channels: Implementation Plan

September 30, 2026. Planning only. No relay, command, permission change, schema
change, dependency install or production deployment has been activated.

## 1. Decision And Scope

**The owner selected two-way conversation: KFC Global Pugs <-> WoW Forever
Discord.** This supersedes the earlier one-way preference. Build a transparent
connection between consenting participants, not a feed that appears to be native
member activity. Replies, edits and removals are part of the first usable release.

Recommended first release:

- One new, explicitly labelled shared text channel in each server, provisionally
  `forever-shared-chat`. These are proposed names, not existing channels.
- Both directions use the same validation, consent, moderation and delivery rules.
- Existing KFC discussion/history and the community's general channel stay intact.
- Individual opt-in through a private bot interaction before any post is shared.
- New text and mapped replies only; no bulk history import, attachments, polls,
  reactions, forums, voice, role synchronization or private-message forwarding.
- A dedicated PM2 worker, local PostgreSQL and an authenticated `/admin/discord`
  workspace. No Docker, Redis, Cloudflare or personal Discord account automation.
- Bots and webhooks are not conversation participants. Relayed messages identify
  their human source and originating server/channel, without impersonating them.
- No website chat transcript, searchable Discord archive, AI ingestion or member
  count inflation. Native members and relayed participation remain distinct.

For the initial small cohort, require authors to be members of both servers and
eligible to speak in both shared channels. This is a deliberate, proposed pilot
restriction: it avoids relaying around the other server's bans/timeouts. It does
not force-join anybody. Supporting authors who belong to only one server needs a
separate destination-approval/moderation design and is not silently enabled.

Direction is settled. Actual endpoint creation/IDs, named moderators, the cohort
restriction and the retention defaults below still require launch approval.
Planning authorization is not authorization to publish other people's messages.

Discord requires permission-aware operation and prohibits deceptive engagement
inflation. A useful bridge must stand on its communication purpose, not fabricated
activity; labelling alone is not platform approval. [Developer Policy](https://support-dev.discord.com/hc/en-us/articles/8563934450327-Discord-Developer-Policy).

## 2. Evidence And Existing Architecture

The September 30 GET-only audits confirmed installation in both servers. The
KFC audit returned 117 channels/categories and 37 roles; the community audit
returned 57 and 21. No messages, member lists, threads or attachments were read.
Configuration visibility is not evidence of activity volume or conversation quality.

KFC's relevant category contains general discussion, leveling organization,
class/player planning and guild-invitation requests. Three of those channels are
role-gated, whereas community general is broadly visible. Do not automatically
copy them into a larger audience. Keep invitation/roster content local; later
structured group sharing should require an organizer's explicit submission.

The exact inventory, IDs and permission targets remain in the private local audit
review, not this tracked document. New pilot endpoints do not yet have IDs. Names
must never be used to auto-select channels or inherit all category children.

| Existing code | Reuse or required change |
| --- | --- |
| `lib/discord-audit-client.ts`, `scripts/kfcbot.ts` | Keep GET-only; do not turn the audit into a Gateway reader or writer |
| `lib/discord-audit.ts` | Reuse validated snowflakes and permission calculations; extend live validation without exposing private snapshots |
| `scripts/discord-channel-cleanup.ts` | Leave its fixed, separately approved operation list unchanged |
| `lib/discord-bot.ts`, interaction route | Retain signature/freshness checks; add a narrowly routed bridge command handler, receipts and component validation |
| `scripts/register-discord.ts` | Do not run its eight-command bulk registration for this release; add a scoped, diff-reviewed bridge registrar |
| `ForeverWebhookJob`, `scripts/maintenance.ts` | Do not reuse private moderation notifications as a chat queue; it lacks leases and projection IDs |
| `lib/auth.ts`, `lib/security.ts`, admin navigation | Reuse staff roles, origin checks, bounded input, rate limits and audit conventions |
| Prisma schema and migration runner | Add reviewed `Forever*` tables through the next additive migration; no reset or `db push` |
| PM2, backup and deployment scripts | Extend explicitly for a separate worker and recovery; do not restart other apps |

The earlier integration blueprint remains authoritative for website listings,
reports and member ownership. This plan brings forward the shared-channel use
case, not the whole roadmap. Its B0 reliability/security foundation is mandatory;
guide publication and website member OAuth are not prerequisites for this pilot.

## 3. Participant Experience

### Joining And Leaving

1. The channel topic and a pinned notice identify both communities, both
   directions, retention, moderators, opt-out and what is never shared.
2. `/bridge join` responds ephemerally with the exact destination, readable
   consent terms, current mapping version and a confirmation button.
3. The button is bound to the actor, guild, bridge, policy version and expiry.
   Revalidate membership/permissions and mapping before committing consent.
4. Only subsequent messages are eligible. Editing an old or pre-consent post
   does not make it eligible. Each new opt-in has its own effective start time.
5. `/bridge status` privately shows participation, direction and delivery state.
6. `/bridge leave` immediately stops eligibility and cancels queued publication.
   Default: request deletion of all still-managed copies of that author's posts
   on both sides. Source posts are not deleted. Show pending/failed removals,
   never claim they vanished before Discord confirms it.
7. `/bridge remove <message link>` removes the author's managed copy without
   opting out of everything. A server moderator can suppress a bridge message
   through scoped controls. No role or member-manager permission is granted.

Reading the shared channel does not enroll somebody. A non-participant's local
post or reply is not transmitted; explain this in the notice and private status
flow, without unsolicited DMs or a bot warning under every message. Initial
channel posting access should be limited to the agreed test cohort by the server
administrators. The worker still checks consent independently of Discord roles.

Consent is per bridge and originating guild, keyed by Discord user ID, never
display name. A person writing on both sides opts in on each side. Changing a
destination, audience, direction or material policy pauses publication, increments
the consent version and requires new consent. A channel rename alone does not
change its identity; a meaningful audience/permission change needs review.

No website member account, email, Battle.net credentials, roster download or
automatic Discord role is needed. If somebody leaves both servers, provide a
published support/contact route with a manual identity-verification process;
do not make rejoining or sharing account credentials a condition of removal.

### How Messages Look

Use WoWForeverBot's fixed bot identity. Display a bounded author label, original
server/channel, original timestamp, a source link and an opaque relay reference.
Do not copy avatars or set a webhook username to mimic a real Discord user.
Source links require source-server access; they are attribution, not a promise
that every reader can open them.

The first renderer emits one plain-text bot message. Allocate a body budget after
the attribution/link overhead, suppress unsolicited mentions and link previews,
and explicitly mark truncation. Do not split a long post into a burst of messages.
Render role/user/channel references as neutral text, without querying unrelated
people or hidden channels. Escape source-controlled Markdown where it could alter
the attribution, and bound/control-normalize display names separately from bodies.

Two-way reply example, expressed as behavior rather than invented live content:

1. A consenting KFC author posts A. The bot posts A' in the Forever shared channel.
2. A consenting Forever author replies to A'. The bot posts B' as a native reply
   to A in KFC, with the Forever author's attribution.
3. A later reply to B' resolves to B on its originating side. The bot never treats
   its own A' or B' as a new human source.

Only resolve parents already known to the same bridge and current permission
boundary. Never fetch or quote an excluded parent. Missing, expired or suppressed
parents produce a standalone reply with a neutral context-unavailable marker.
If a destination reply target vanishes during send, retry without the reference
only when the failed request is known not to have created a message.

## 4. Architecture And Runtime

```text
KFC shared channel                  Forever shared channel
        |                                     |
        +--------- Discord Gateway -----------+
                            |
          dedicated wow-forever-bridge PM2 process
          identity / channel / consent / policy gate
                            |
            PostgreSQL: root + projection + outbox
                            |
              leased, bounded REST delivery
                            |
              opposite approved text channel

Discord bridge commands -> signed HTTPS interaction endpoint
                        -> actor-bound consent/control service
                        -> receipt + PostgreSQL transaction

/admin/discord -> existing staff auth + CSRF + domain validation
               -> versioned config / approvals / pause / removal
               -> worker validation requests and status, no bot token
```

Use a maintained Discord client for Gateway reconnection and rate-limit handling,
not a hand-rolled WebSocket protocol. Candidate: pinned `discord.js` 14.27.0.
The registry currently reports that version with engine `>=18`, while the official
documentation requires Node 24.17.0 or newer. Do not infer compatibility from the
looser package declaration. Use an independently pinned Node 24 LTS worker runtime,
candidate 24.21.0, and verify the complete lockfile/runtime in Linux CI before
installing. [discord.js documentation](https://discord.js.org/docs/packages/discord.js/14.27.0),
[Node release status](https://nodejs.org/en/about/previous-releases).

The website's recorded Node 20.20 runtime is now an EOL follow-up, not a reason to
change the host-wide Node binary during bridge delivery. The worker has its own
install/lockfile and immutable release output under the same project ownership
boundary. Prefer the already-used `pg` and `zod` APIs plus the Discord library;
no new queue service. Compile strict TypeScript to Node-compatible JS; do not
depend on Next aliases, request context or a dev runner at runtime.

Keep pure bridge contracts/policy reusable between web and worker. Web persistence
continues through Prisma; the worker may use typed `pg` statements for its queue
and restricted tables. No imports of `next/*`, staff auth or private case services
in the worker. Add a separate typecheck/build target so worker and web contracts
are verified, not accidentally excluded from all checks.

### Process And Data Boundaries

- New PM2 process: `wow-forever-bridge`, one fork initially. A dedicated PostgreSQL
  advisory-lock connection elects one ingest/delivery leader. Lose it: stop new
  work, invalidate leases and reconnect conservatively, not concurrently.
- No public worker port. Heartbeat, build version, Gateway state and sanitized
  diagnostics are stored in a small database status record consumed by admin.
- Use a separate restricted worker OS account and database login. It can access
  only bridge tables, required interaction delivery records and append-only audit
  entries; it cannot read KFC tables, staff passwords, analytics or report evidence.
- Store the bot credential only in the worker's restricted deployment environment.
  The web process needs public application/signature identifiers, not that token.
  Keep existing local `KFCBOT_*` tooling unchanged and do not silently fall back to
  its credentials in production. Exact new configuration keys are a release contract.
- Proposed deployment keys: `BRIDGE_ENABLED=false`, `BRIDGE_APPLICATION_ID`,
  `BRIDGE_ALLOWED_GUILD_IDS`, `BRIDGE_BOT_TOKEN`, `BRIDGE_DATABASE_URL`,
  `BRIDGE_HMAC_KEY`, and a separate short-lived interaction encryption key shared
  only by the HTTP handler and worker. Never send secrets to admin or Git.
- The server allowlist is the two approved communities, not every server where
  somebody installs the bot. An admin-created mapping cannot expand that list.

PostgreSQL locking can coordinate local workers; it does not make a Discord HTTP
request part of a database transaction. Never hold an ordinary SQL transaction
open while waiting on Discord. [PostgreSQL locking](https://www.postgresql.org/docs/current/explicit-locking.html).

## 5. Permissions And Discord Transport

Proposed Gateway intents: Guilds, GuildMessages and MessageContent only. No
presence, roster streaming, DMs, reactions or typing events. Ordinary message
bodies need Message Content access; validate current application eligibility and
enable it only when consent/policies and the implementation are ready. The earlier
configuration audit did not verify this setting. [Gateway intents](https://docs.discord.com/developers/events/gateway#message-content-intent).

At ingress, discard non-allowlisted guild/channel events before caching bodies,
logging, queuing or user lookup. Narrow actual bot permissions as well: a code
allowlist does not prevent Discord from delivering data the bot can see. Configure
the library's caches/sweepers so unselected messages are not retained implicitly.

| Capability | Required boundary |
| --- | --- |
| Read incoming text | View Channel only in selected shared channels |
| Send relays | Send Messages only in those channels; native reply support also needs Read Message History |
| Reconcile known messages | Read Message History in the same endpoints; exact known IDs only |
| Edit/delete copies | Operate only on this application's messages recorded in projections |
| Manage channels/roles/webhooks | Not required for the running bridge; provision endpoints/notices separately |
| Slash commands | Only the guild-installed bridge command group in the two approved guilds |

Administrator, ban/kick, Manage Messages and webhook impersonation are not needed.
Review inherited source roles and the destination's prior cleanup privilege; do
not mutate human roles or intentional staff/trap settings as part of this work.
Validate effective permissions, channel type, NSFW state, bot identity and notices
at activation, periodically, and on relevant guild/channel/role events.

Use HTTP for interactions at the existing signed endpoint; the Gateway worker
handles message events, not a second interaction listener. Route `/bridge` only
after application, guild, actor and command validation. Preserve the existing
single-guild restrictions for unrelated commands. Disabled `/check` and `/role`
must not become available as a side effect. A target-guild allowlist is not a
replacement for command-level authorization.

Persist interaction receipts and compatible acknowledgements. Target initial
response within one second; use a deferred ephemeral response for slower checks.
Continuation tokens, if needed, are encrypted with short expiry and never logged.
Retries return the recorded outcome, not another consent mutation or publication.
Discord's initial response window is three seconds; interaction transport choices
are mutually exclusive. [Interaction delivery](https://docs.discord.com/developers/interactions/receiving-and-responding).

## 6. Proposed Data Model

All names below are new proposals, not existing tables. Use the next available
reviewed migration number after `002_grouping_rulesets`. Add SQL checks, foreign
keys, indexes and explicit deletion rules alongside Prisma definitions.

| Record | Essential contract |
| --- | --- |
| `ForeverDiscordBridge` | ID, both guild/channel endpoints, direction `two_way`, lifecycle state, config/consent version, notices and per-side approval references, activation epoch, validation fingerprint/time, pause reason, optimistic row version |
| `ForeverBridgeConsent` | Bridge + originating guild + actor ID unique; policy version, opt-in/withdrawal times, state, independent moderator block state; user action cannot clear a staff block |
| `ForeverBridgeMessage` | Bridge + originating guild/channel/message unique; source author, originating consent epoch, original/edited timestamps, desired revision, lifecycle state, expiry, reply-root reference; no body |
| `ForeverBridgeProjection` | Root + destination unique; output channel/message ID, create nonce, delivered revision, HMAC payload fingerprint, suppression/deletion/uncertain status and last verification; one opposite-side projection per root in v1 |
| `ForeverDiscordOutbox` | Typed operation, bridge/root/projection or interaction reference, desired revision, dedupe key, due time, lease owner/token/expiry, attempt count, safe error code, first-send time and outcome |
| `ForeverDiscordInteraction` | Interaction ID unique, application/guild/actor, operation, safe acknowledgement/outcome, status, expiry; separate encrypted continuation token only when necessary |
| `ForeverBridgeRuntime` | Global outbound mode, control version, worker heartbeat/build/leader generation, Gateway status and counters; no transcript or secrets |
| Existing `ForeverAuditLog` | Staff/Discord/system actor namespaces, bridge entity, action, before/after versions and reason code; bounded approved details, no raw messages or tokens |

Keep outbox payloads typed and reference-based, not arbitrary JSON containing a
full Gateway event. A delivered body can be fetched again from its exact source
ID when necessary; do not persist transcripts for retries. Use source revision
and a keyed rendered fingerprint to deduplicate edits without retaining text.

Required constraints:

- Snowflakes are strings. Both endpoints belong to the deployment allowlist,
  differ from one another, and are ordinary non-NSFW text channels.
- One channel belongs to at most one enabled bridge in v1. No routing mesh or
  recursive fanout. Future expansion is multiple independent pairs.
- Unique source identity, destination message identity, create nonce, job dedupe
  key and interaction ID, with indexed author-removal and due/expiry scans.
- Config changes use expected-version writes. Jobs retain the config/consent
  generation that authorized them; workers reject stale generations.
- Do not cascade-delete mappings or bridge rows while Discord copies may exist.
  Retirement is cleanup first, metadata purge after confirmed completion.
- Worker authorization uses exact bridge/guild/channel context on every query;
  no caller-selected arbitrary Discord URL or SQL identifier.

## 7. Delivery And State Machines

### Bridge Lifecycle

`draft -> validating -> ready -> active -> paused -> retiring -> retired`.
Validation failures remain visible, not disguised as ready. Becoming active
requires both sides' approval, published notices/policies, current permissions,
scoped command registration, fresh heartbeat and passing pilot tests.

Separate controls:

- **Pause publication:** no new copies or edits; keep deletion/withdrawal/expiry
  cleanup running. Do not accumulate bodies or replay everything written while
  paused. Reactivation starts a new publication epoch.
- **Retire:** cancel create/edit jobs, remove managed copies, then close consent.
- **Hard stop:** no Discord writes, including deletion. Display unresolved cleanup
  explicitly; disabling a process cannot guarantee copies have been removed.

For an in-flight HTTP write, a pause cannot revoke a request already accepted by
Discord. Recheck afterward and schedule compensating deletion when necessary.

### Human Message To Opposite-Side Copy

1. Validate guild/channel/type and reject bots, webhooks, system/forwarded posts,
   excluded formats, out-of-epoch messages and unknown bridge roots.
2. Check actor consent and staff block, then source/destination membership,
   timeout and effective View/Send permissions. The pilot requires both memberships.
   Use targeted member checks, not a roster fetch. A failed check means wait or
   skip, not permission assumed. Discard transient role data afterward.
3. Apply bridge moderation and quotas. The first live cohort is manually approved;
   initial rollout can hold each post for review before automatic relay is enabled.
4. In one short transaction, create/update the root, projection intent and outbox
   job. Deduplicate replays by source identity. Never store the received raw event.
5. Claim an eligible job under `FOR UPDATE SKIP LOCKED`, with a fencing token.
   Serialize conflicting operations for a root/projection. Preserve per-direction
   create order where possible; removals can overtake ordinary publication.
6. Recheck current mapping, epoch, consent, moderation and source existence before
   send. Fetch only the exact eligible source ID; rebuild current sanitized text.
7. Send through the bounded Discord adapter, with mentions disabled and a stable
   nonce. Persist the returned message ID and applied revision transactionally.
8. Recheck for concurrent revocation/removal; never allow the acknowledgement to
   turn a tombstoned root back into a live message.

Targeted membership validation before send also prevents an opted-in user who
was removed or timed out on the other side from continuing through the bot.
Cache eligibility only briefly with an explicit freshness bound; sensitive sends
after stale or changed state require a new check. Server owners are handled by
the actual Discord permission model, not a guessed role bit.

### Edits, Deletions And Replies

| Event | Required outcome |
| --- | --- |
| Source text edited | Fetch current known source, re-run policy, update the existing copy; coalesce superseded edits |
| Partial update without body | Do not overwrite with empty text or infer an intentional deletion; bounded exact-ID refresh |
| Edit to disallowed content | Retract the current copy and mark held/suppressed; do not leave the previously approved content falsely current |
| Source deleted, including bulk event | Cancel queued work and delete only the bot's known counterpart; never delete another user's original |
| Destination copy manually deleted | Record destination suppression; no automatic recreation on retry or source edit |
| Source deleted before initial send | Skip creation; a delayed create event must still fail current-source validation |
| Opt-out or moderator block during send | Invalidate pending publication and remove any returned late copy |
| Reply to a mapped relay | Resolve to its original counterpart in the other server, never repost the bot payload |
| Reply to local unshared/deleted parent | No fetching or quoting that parent; send only the consenting author's own text with context unavailable |
| Already-relayed message arrives again | Source/projection uniqueness and bot/webhook exclusion prevent a loop |

Removing a parent must also remove any cached reference/excerpt in managed child
copies. Re-edit known children to remove the native reply reference; if Discord
cannot reliably clear it, retract those bot copies and report the consequence.
Do not retain a deleted parent's text through reply previews. Demonstrate this
behavior with real test-channel messages before launch.

### Ambiguous Sends And Reconnection

Discord nonce enforcement covers a recent window, not durable exactly-once
delivery. Use a unique stable nonce of supported length and correlate this bot's
own create event with a pending projection before discarding bot events from the
human relay path. [Message API](https://docs.discord.com/developers/resources/message).

On timeout/lost acknowledgement after a create, enter `uncertain`. Configure the
REST library not to blindly repeat ambiguous POSTs. Recover through an already
observed bot echo, a known output ID, or a moderator-supplied exact message link
whose author/channel/relay reference is validated. Never scan arbitrary history
or press a generic retry button that can duplicate an uncertain create. An
operator can abandon the attempt; resending needs an explicit duplicate-risk
decision, not an automatic timeout policy.

For timed-out edits/deletes with an already known output ID, read back that exact
copy and reconcile against the current desired state. A successful not-found
confirms removal only when channel access is independently valid. Never retry a
stale edit body. Network reordering and missed events still make the cross-server
view eventually consistent, not an atomic replica; show unresolved divergence.

An expired lease with a started external create is uncertain, not immediately
available to a second sender. Local lease fencing cannot prevent Discord from
finishing an already-started HTTP request; record and reconcile that boundary.

Resume Gateway sessions through the maintained library. After a non-resumable
gap or process restart, show a coverage gap and reconcile only already-managed
source/output IDs before considering the bridge healthy. Do not import unobserved
messages from the outage. A fresh baseline/epoch prevents late replay of old posts.
Discord supplies create/update/delete and bulk-delete events, but a disconnected
process is not a permanent message archive. [Gateway events](https://docs.discord.com/developers/events/gateway-events).

Periodically verify known active projections to repair missed deletions and stale
edits. Distinguish an exact-message not-found from lost channel access, permission
failure and an unavailable guild. On access uncertainty, pause publication; retain
IDs for cleanup and escalate to staff rather than claiming deletion succeeded.

Retry 429/temporary failures with bounded backoff and Discord's rate-limit signals.
Pause affected routes on authorization/permission failures. Bound all concurrency,
timeouts and queue sizes. Invalid tokens stop the worker without exposing upstream
responses. Deletion jobs take priority over fresh conversation. [Rate limits](https://docs.discord.com/developers/topics/rate-limits).

## 8. Moderation, Consent And Data Handling

Discord AutoMod does not flag posts from server-installed apps. Do not assume a
relay inherits either server's native screening. Apply shared bridge rules and
human moderation before allowing automatic publication. [AutoMod FAQ](https://support.discord.com/hc/en-us/articles/4421269296535-AutoMod-FAQ).

Launch controls:

- Named moderators on both sides, with overlapping pilot coverage and a clear
  escalation channel that is not the public report/appeal forum.
- A separate bridge block state prevents opt-out/opt-in from undoing a moderator
  restriction. This is channel participation control, not a public player blacklist.
- Either side's moderator can stop delivery to their side and suppress received
  copies. Global reactivation and audience changes remain owner/admin actions.
- Apply per-author and per-bridge rate/burst limits to creates and edits; do not
  turn source bursts into a backlog that floods the destination later.
- Reject unwanted mentions, suspicious links and configured prohibited text;
  limits and matches must be bounded and not vulnerable to catastrophic regexes.
  No claim that keyword matching catches all abuse. Unclear cases require review.
- No read-through attachments, external URL fetching, CDN rehosting, impersonated
  avatars, scraping, unsolicited DMs, generated conversation or AI summarization.
- Safety/support/private/age-restricted channels cannot be chosen as endpoints.
  Ordinary visibility alone is not sufficient eligibility for relaying a channel.
- Blocking a bot in a Discord client is not assumed to generate a reliable API
  opt-out event. Offer explicit leave/removal controls and a support route.

Before first collection, publish actual bot terms/privacy and a shared-channel
explanation, proposed at `/bot/terms`, `/bot/privacy`, `/bot/shared-channels`.
These URLs are planned, not existing Developer Portal values. Disclose operator,
both audiences, attribution, storage, retention, contact, moderation, outage
limitations and independent community status. Do not promise removal from human
screenshots, quoted posts by others or Discord's own infrastructure.

### Proposed Operational Defaults

These are initial design limits, not measured platform limits or approved SLAs.

| Item | Pilot default |
| --- | --- |
| Scope | One channel pair; 5-10 consenting testers first |
| Author burst | 5 creates per 10 seconds, 20 per minute; bounded/coalesced edits |
| Conversation queue | At most 100 pending creates per bridge; stop accepting above cap |
| Stale creates | Skip after 2 minutes; do not replay a long backlog into live chat |
| Active copies | At most 1,000 per pair before review/capacity increase |
| Application transcript storage | None; transient text only in bounded processing memory |
| Managed copy lifetime | 30 days, then remove the bot copy; source originals are untouched |
| Mapping/tombstone retention | Until copy removal is confirmed, then 7 days for replay protection |
| Failed/uncertain removals | Retain minimal IDs and surface to operators; never silently purge responsibility |
| Receipt/delivered-job metadata | Up to 7 days unless needed by unresolved cleanup; no bodies |
| Interaction continuation secrets | Remove on completion or expiry, at most Discord's response window |
| Consent evidence | Active duration, then 30 days after completed withdrawal/cleanup; no profile history |
| Bridge control audit | 90 days proposed, separately from existing player-case audit policy |
| Worker heartbeat | Every 15 seconds; stale after 60 seconds |
| Normal relay target | p95 under 5 seconds when healthy and not held for review |

Known-ID reconciliation is throttled and reports coverage age/backlog, not a
guarantee of instant repair. Target a complete pilot sweep within one hour under
normal conditions and alert when that is exceeded. Measure per-channel bucket
limits before increasing the active-copy cap. Gateway-delivered removals should
normally propagate within seconds, but outages/permission loss can delay them.

Backups contain IDs/consent records even without bodies. The current nightly
backup enumerates all `Forever*` tables; add role/grant/restore tests and retention
disclosures for the new records. New worker secrets are not covered by the current
`.env.local` archive: explicitly add restricted recovery or documented re-provisioning.
Preserve deletion tombstones across recovery. Restoring an old backup always starts
the bridge in cleanup-only mode and requires reconciliation; never replay restored
create jobs automatically. Encrypted off-host recovery remains an operational gate.

An older backup can predate revocations and message mappings. Recovery must
invalidate restored participation, use a fresh activation/consent epoch and require
new opt-ins; it cannot reconstruct missing consent by examining chat history.
Remove or explicitly review restored copies before resuming. Post-backup copies
whose IDs were lost are a manual incident: moderators locate them in the selected
channels and supply exact links for verified cleanup. Do not claim a backup gives
zero data loss or that unknown orphaned copies have been removed. Keep restricted
release/recovery records and choose a backup frequency appropriate to this risk.

## 9. Admin And API Plan

Use the existing restrained admin layout, typography, tables and role checks.
One `/admin/discord` section with views/tabs, not a separate dashboard application.

| View | Required controls and states |
| --- | --- |
| Connections | Expected app/guild identity, actual worker build/runtime, Gateway state, heartbeat, intent/permission failures; never show credentials |
| Shared channels | Explicit endpoint pickers limited to approved guilds; channel type/visibility, two-way mode, notices, approvals, draft/ready/active/paused/retiring status |
| Participation | Consented/withdrawn/blocked counts and authorized per-bridge controls; no full Discord member roster |
| Delivery | Queued/held/delivered/superseded/expired/uncertain/failed/removal-pending; source and destination links, age, safe reason, scoped actions |
| Operations | Pause publication, resume with validation, retire, cleanup status and global hard stop; explain their different consequences in confirmation dialogs |

Owner/admin configure and activate. Moderators can inspect assigned bridge
delivery, hold/block/suppress and pause; they cannot expand audiences, register
commands, edit consent or resume a failed privacy boundary. Editors have no bridge
access. Until scoped moderator assignments exist, limit sensitive controls to
owner/admin and explicitly assigned existing moderator accounts.

Admin lists show delivery metadata, not a browseable chat archive. A deliberate
moderation preview may fetch one known message only after authorization and scope
checks, with no browser/server cache and an access audit. It is not a search API.
Each moderator must also be approved for the relevant Discord audience.

Proposed endpoints are a dedicated `/api/admin/discord/[...action]` handler,
separate from the current catch-all's two-segment contract. Actions: create/update
draft, request validation, record approval, activate, pause, retire, request cleanup,
resolve uncertain delivery and list status. GET is read-only; writes use POST,
strict schemas, `requireStaff`, `requireSameOrigin`, bounded bodies and rate limits.
Use expected-version and idempotency keys. Return honest 409/403/503 states.

Do not accept arbitrary webhook URLs, shell commands, destination server IDs or
message bodies as administrative delivery payloads. A status API must not expose
hidden server topology to someone merely allowed to edit website guides.

Test empty/loading/offline/stale-permission/validation-failed/partial-cleanup
states, keyboard focus, destructive confirmations and 320/390/768/1440px layouts.
Use familiar Lucide icons with accessible names, an explicit Two-way indicator
for the initial mapping mode, and toggles only for ordinary binary settings.
Reject other direction values in v1; no unimplemented one-way control. Pausing
and retirement are
explicit actions, not ambiguous switches. Keep private pages/APIs noindex/no-store.

## 10. Work Packages And Release Gates

| Phase | Implementation | Evidence required before moving on |
| --- | --- | --- |
| S0: Contract and governance | Approve two-way endpoints, pilot membership restriction, moderators, retention and notices; confirm app transport/intent settings | Written approved configuration, no selected old-history import |
| S1: Foundation | Worker package/runtime, narrow DB login, bridge/receipt/outbox/projection migration, pure policy/renderer, disabled defaults | Migration apply/rerun, grants tests, strict compile, no network in policy tests |
| S2: Consent and control | Signed `/bridge` flow, scoped registrar, actor-bound components, admin validation/status/pause/cleanup | Replay/forgery/CSRF/role tests, ephemeral consent in isolated Discord channels, desktop/mobile checks |
| S3: Conversation lifecycle | Both directions, mapped replies, edits, deletion/bulk removal, opt-out, suppression, retries and uncertainty | Full two-person conversation and crash/recovery matrix, no loops or stale resurrection |
| S4: Operational hardening | Known-ID reconciliation, moderation holds, capacity limits, expiry, backups, heartbeat/alerts, restricted PM2 release | Fault injection, restore rehearsal, cleanup-only rollback, supported runtime and resource headroom |
| S5: Pilot | New channels and notices, 5-10 explicit opt-ins, moderator-reviewed start, then bounded automatic delivery | 24-48 hours observed usefulness, no unresolved privacy/loop/duplicate failures, owner review before expansion |

S3 depends on consent and pause controls, not the other way around. Do not ship a
quick copy loop first and plan deletion or moderation for later. Enabling further
pairs, larger quotas, source-only guest participants, media or forum threads is a
separate release with its own acceptance tests.

### Planned File Boundaries

- `lib/discord-bridge/`: pure schemas, eligibility, rendering, reply mapping and
  state transitions; web-domain persistence and authorization kept explicit.
- `workers/discord-bridge/`: independently pinned Node package, Gateway adapter,
  typed queue repository, delivery/reconciliation and lifecycle entrypoint.
- `lib/discord-bot.ts` and interaction route: small dispatcher/signature reuse;
  bridge command implementation separated from legacy website commands.
- A scoped command-registration script: dry-run diff by command name; no deletion
  of unrelated application commands or bulk enablement of existing drafts.
- `app/admin/discord/`, `/api/admin/discord/[...action]`, focused admin components
  and navigation entry; reuse auth/security helpers, not a new authentication stack.
- Prisma schema and next additive migration; migration tests include backward
  compatibility with the currently running website.
- `deploy/` worker config/activation/runbook, backup verification and bridge-scoped
  maintenance. Do not fold high-frequency relay work into five-minute website cron.
- Unit/integration, Discord-adapter contract, recovery and Playwright test files
  scoped to the new feature; retain existing site tests as regression gates.

## 11. Acceptance Matrix

| Test | Expected result |
| --- | --- |
| Author without consent, or consent for another pair/guild/version | No publication and no stored body |
| Message older than consent/activation, including an edit or resume replay | No retroactive sharing |
| Unapproved/renamed/deleted/NSFW/private endpoint, missing access | Fail closed, no fallback to a similarly named channel |
| App installed in an unrelated third server | No reading cache, mapping or delivery for that server |
| Non-member, banned/removed participant, timeout or Send denial on either side | No create/edit publication; cleanup remains possible |
| `/bridge join` replay, forged/expired button, wrong actor/guild/application | One authorized state transition or rejection, never duplicate enrollment |
| Invalid/stale HTTP signature, oversized input, CSRF, editor access | Rejected; no database/Discord mutation |
| Two-way A -> A', B replying to A' -> B' | Correct original-parent relation and visible source attribution |
| Bot/webhook/forwarded/system/unsupported-format messages | Never converted into new human conversation |
| Mass mentions, Markdown attribution spoofing, unusual Unicode, long content | No pings/identity spoofing; bounded readable output and explicit truncation |
| Duplicate/reordered creates and edits | One root/copy, latest allowed revision only |
| Source delete before/during/after create, bulk delete | No resurrection; only this bot's counterpart removed |
| Deleted parent with existing reply previews | No retained parent excerpt in managed child copies |
| Destination moderator deletes the copy | Suppressed, not automatically recreated |
| Opt-out/block while queued or during HTTP write | Stale jobs cancelled; any late copy queued for removal |
| Two workers, lost leader connection, expired lease, crashed sender | Fenced local work; ambiguous creates marked uncertain rather than multiplied |
| 429/global limit/5xx/timeout/401/403/404 | Bounded retries or correct pause/uncertainty; no token/raw-body logging |
| Missing cached update/delete after restart | Exact-ID reconciliation; no arbitrary historical backfill |
| DB unavailable or response deadline exceeded | No false success; honest ephemeral failure/deferred outcome, bounded memory |
| Queue saturation or stale conversation backlog | Pause/skip with visible counts; no delayed flood |
| Pause versus hard stop versus retire | Distinct, verified behavior including cleanup and in-flight limitations |
| Copy expiry and failed deletion | Purge only after confirmed removal; unresolved IDs remain actionable |
| Backup restored from before an opt-out/delete | Starts cleanup-only; no automatic send or revival of revoked state |
| Backup lacks recent consent revocations or projection IDs | Fresh opt-in epoch; orphaned copies become an explicit manual cleanup incident |
| Worker database access to KFC/User/ForeverReport | Denied; existing website permissions and services unchanged |
| Admin responsive and accessibility checks | No overflow, usable keyboard/confirmation states and no unauthorized content |

Use generated test fixtures only in the isolated test database and consenting
test channels. Do not use production chat history as a test dataset. Verify real
Discord rendering on desktop and mobile in addition to Playwright's website checks.
No finite test suite establishes perfection or replaces staffed moderation.

## 12. Deployment, Recovery And Success

Before release, recheck current disk/RAM and permissions. The previous site
deployment recorded 91% disk use with roughly 6.8 GB free; this is historical,
not a fresh capacity measurement. Resolve headroom and off-host backup/alerting
before expanding stateful services. Do not erase another app's files or the
website rollback build to fit the worker.

Build and test an immutable Linux worker release with its pinned runtime. Back
up, apply only the additive migration/grants, deploy admin/control support with
the feature disabled, and validate the independent worker in test channels.
Register only approved bridge commands and configure the signed endpoint after
the policy pages actually exist. Freshly verify both endpoint audiences and
staff approvals; then enable the selected two-way pair and observe the pilot.

Activation uses the existing root PM2 daemon but runs the worker as its restricted
account, with an explicit Node interpreter and environment-file path. Restore
ownership, redact logs and set bounded restart delay/memory limits based on measured
tests. Reload only the named new process. Verify KFC, Helper and the website keep
their existing PIDs/restart counts unless their own release explicitly requires
a restart. Discord messages are not a substitute for an independent failure alert.

Rollback first disables publication, cancels unsent work and preserves cleanup
capability. Keep pending deletion IDs, consent tombstones and compatible tables;
do not restore the shared database to undo code. Revert only the worker/admin
release after queues are understood. A hard outage can leave Discord copies
behind, which is an incident to resolve, not a successful rollback claim.

Measure opted-in human exchanges, successful cross-server replies, participant
feedback, moderator burden, delivery/removal lag and unresolved failures. Do not
optimize message volume or count the bot's copies as new native community members.
The bridge connects existing Discord participants; it is not an SEO ranking lever.

### Approval Checklist Before Live Activation

- [ ] Two new endpoint IDs and names approved; no existing history selected.
- [ ] Two-way direction reflected in both notices and consent screens.
- [ ] Pilot membership/permission rule and moderator coverage accepted.
- [ ] Bot terms/privacy/contact and removal process published and tested.
- [ ] Runtime, intent eligibility, minimal permissions and independent secrets checked.
- [ ] Data retention, backup recovery, cleanup and resource limits approved.
- [ ] All lifecycle/failure tests pass in isolated channels and databases.
- [ ] Scoped command diff, endpoint validation and small-cohort launch approved.

Only the two-way product direction is owner-confirmed here. The remaining boxes
are intentionally open; this document does not fabricate approval or test results.
