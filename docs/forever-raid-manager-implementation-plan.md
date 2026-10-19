# Forever Raid Manager Implementation Blueprint

Decision date: 2 October 2026.
Status: implementation plan; no raid engine, commands, catalog import or service
is activated by this document.

Implementation progress: [private pilot and remaining gates](forever-raid-manager-private-pilot.md).
The first local slice is implemented; public launch and later milestones remain
separate. This blueprint describes the complete target, not completed features.

Presentation follow-up: [Discord post design and adoption plan](forever-raid-discord-experience-plan.md)
compares the owner's Raid-Helper reference with the live private prototype and
defines icon-led rosters, native signup, format migration and client review.

## 1. Product Decision And Boundaries

Build **Forever Raid Manager** inside WoWForeverBot and the community website.
It combines raid/event organization and native soft reserves under one event.
It is our own implementation, not automation of Raid-Helper or softres.it.

The owner's latest scope is authoritative: **WoW Forever only**. There is no
edition selector, cross-edition compatibility layer, other-edition item import,
or fallback to another game's loot tables. Historical KFC observations are
workflow research, not templates or seed data for this feature.

Confirmed operating boundaries:

- Community identity remains WoW Forever Discord; contributor credit is
  **Open source contributors**, not a guild team name.
- Keep the existing domain, PostgreSQL database and PM2/Nginx deployment.
  Add separate `Forever*` tables and a narrowly privileged worker. No Docker,
  Cloudflare dependency, separate database platform or paid queue is required.
- Use the existing Discord application and signed interaction endpoint.
  Do not automate a normal Discord account or invoke another bot's commands.
- Do not require Raid-Helper or Softres API keys for native features.
- One creation flow produces the event, signup interface and reserve space.
  Calendar/Discord delivery is asynchronous and reported honestly.
- Public website discovery still requires a human administrator's protected
  Verified action in Discord. A host cannot approve their own publication
  merely because they can manage a raid.
- Preserve existing guild submissions, simple group listings, moderation,
  auction tips, shared-channel controls and archives.
- Start in private test channels with allowlisted organizers and participants.
  Production deployment and activation are later, separate decisions.

Raid-Helper already documents a Softres argument in `/quickcreate`. The value
of this implementation is a shared identity, roster, loot policy and reserve
workflow, not merely creating two external links. Its documented capability
has not been live-tested in Forever. [Raid-Helper commands](https://raid-helper.xyz/documentation/commands)

## 2. Success Criteria

The first useful release must let an organizer create a Forever session once,
let members sign up and reserve eligible items, and hand a consistent locked
roster/reserve snapshot to the loot master.

Acceptance targets, not current performance claims:

- A returning organizer can publish from a saved template in under one minute.
- A returning member can join with a saved character and reach their reserves
  without re-entering a Discord handle or creating a second service account.
- Simultaneous signups cannot overbook; duplicate requests cannot duplicate
  events, seats or reserves.
- Website and Discord counts reflect the same database state and identify
  projection delays instead of pretending an outdated post is current.
- An ordinary roster update never invalidates human publication approval.
- Loot policy changes and post-lock exceptions are visible to affected members
  and recorded; nothing silently changes an exported loot agreement.
- Unknown, other-edition, unreviewed or unsupported items cannot enter a live
  reserve list or export.
- Event and reserve controls work on mobile, desktop and keyboard navigation.
- Unavailable Discord delivery, closed DMs or calendar capacity do not lose
  a committed signup or cause an extra event to be created.

## 3. Current Repository And Reuse

This is a new domain feature built on existing infrastructure, not an already
implemented signup engine.

| Existing location                                                    | Reuse                                                                                                       | Change required                                                                                                                                  |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `lib/discord-bot.ts`, `app/api/discord/interactions/route.ts`        | Signature, timestamp, body-size and guild checks; preserve bridge dispatch                                  | Add validated raid command/component/modal/autocomplete handling and durable idempotency; avoid the old command-only schema rejecting components |
| `scripts/register-discord.ts`, `lib/discord-bridge/commands.ts`      | Existing command definitions                                                                                | Register a reviewed complete manifest that preserves community and bridge commands; bulk PUT must not erase them                                 |
| `lib/auth.ts`                                                        | Existing staff credential login and `requireStaff`                                                          | Add separate Discord member authentication; never create staff accounts or infer privileges from matching emails                                 |
| `lib/submissions.ts`, `lib/discord-listings/*`                       | Transactional job insertion, strict channel scope, Verified audit checks, uncertain-delivery reconciliation | Keep legacy jobs unchanged; new raid delivery/verifier contracts must support dynamic roster projections                                         |
| `prisma/schema.prisma`, `scripts/migrate.ts`                         | Prisma, PostgreSQL, ordered checksum-verified SQL migrations                                                | Add member, Forever catalog, event, signup, reserve, snapshot and delivery models with database constraints                                      |
| `lib/group-time.ts`                                                  | Readable EU/NA display with date-specific offsets                                                           | Add explicit timezone input/conversion and DST validation; do not parse a wall-clock time with the server's timezone                             |
| `/lfg`, `/admin/groups`, shared UI/security helpers                  | Discovery, review, emergency hiding, layout, validation and origin checks                                   | Link raid-managed directory rows to the event; route management through event authorization                                                      |
| `deploy/listings.ecosystem.config.cjs`, `deploy/listings-grants.sql` | Isolated OS user, PM2 process, narrow PostgreSQL grants                                                     | Add a separately scoped raid worker and explicit grants; do not broaden the existing listings worker into every new table                        |
| `tests/*.test.ts`, `tests/e2e/*`                                     | Node test runner, Playwright and existing fixtures                                                          | Add pure-policy, real PostgreSQL concurrency, delivery, identity, export and responsive tests                                                    |

Important integration hazards found in the current implementation:

1. `ForeverGroup` is a listing, not a roster. It has no character identity,
   capacities, participants, loot policy, reservations or lock snapshots.
2. `lib/auth.ts` accepts staff roles only. A successful public Discord login
   must never satisfy that boundary or replace the staff session cookie.
3. `validateListingThread` compares the original starter content exactly.
   Editing that starter with roster text would currently invalidate it.
4. Legacy group publication hides Full/In progress/Completed/Cancelled posts
   and expires at the start. New raid detail pages must distinguish discovery,
   capacity, lifecycle and approval instead of inheriting that single status.
5. Legacy listing transport allows only a small set of endpoints. Do not turn
   it into an arbitrary Discord API proxy to add calendars or message edits.

### WoW Trader Boundary

Read-only review of the sibling `wow-trader` repository found build-aware item
and world-observation infrastructure worth reusing. Its `game-versions.ts`
currently maps Forever to `wow_classic_beta`; that identifier is evidence about
the current source, not an assumption about the eventual release client.

Its existing item-library document includes another edition's verified
snapshot. Those records are explicitly excluded. The existing
`/api/v1/forever/preview.json` contract labels its data `demo_preview` and warns
that it is not generally client-verified. That endpoint is not a live raid-loot
catalog and must not automatically populate selectable reserves.

Prefer a reviewed Forever-only file export from that pipeline for the first
catalog import. A later bounded, versioned data endpoint is a separate change
in WoW Trader. The raid worker receives neither unrestricted access to Trader's
database nor permission to copy all its product snapshots.

The owner-requested [Wowhead raid-loot source adapter](forever-wowhead-loot-import-plan.md)
provides a second catalog input: bounded Forever-only collection or permitted
source-file parsing, staged item/boss mapping, completeness checks and reviewed
diff publication. It does not require Trader data or activate a crawler.

## 4. Feature Coverage And Release Scope

Functional equivalents use our own code and interface, not copied source,
branding or private provider behavior. All game definitions and tests target
Forever only.

| Capability                                           | First useful release                                                                                   | Expansion                                                                     |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Create/edit/cancel/reopen sessions                   | One create flow, explicit dates, duration, organizer and co-organizers                                 | Saved presets, duplication and recurring series                               |
| Class/spec/role signups                              | Saved declared characters, availability, one active character per member/event                         | Preferred alternatives and richer organizer composition tools                 |
| Capacity and bench                                   | Total/role capacities, approval or automatic acceptance, waitlist, withdrawal and promotion            | Class/spec targets, friend groups, promotion offers                           |
| Late/tentative/absence                               | Separate availability from seat status                                                                 | Check-in and privately recorded attendance                                    |
| Leader management                                    | Event-scoped organizer permissions, reasoned overrides                                                 | Delegation, roster arrangement and batch tools                                |
| Soft/hard reserves                                   | Configured SR allowance, HR declarations, duplicates policy, item restrictions and visible/hidden mode | Series wishlists and optional reviewed fairness policies                      |
| Deadlines and locking                                | Independent signup/SR deadlines, immutable lock snapshot, audited exceptions                           | Versioned re-lock and loot-result reconciliation                              |
| In-game exports                                      | Versioned snapshot, readable export and an organizer-validated Forever loot-master handoff             | Additional tested addon adapters and companion integrations                   |
| Calendar and timezones                               | Native Discord event after Verified; explicit timezone and readable web times                          | Personal calendar feeds and richer scheduling                                 |
| Reminders                                            | Opt-in, targeted reminders with deduplication and delivery state                                       | Member preferences and series reminders                                       |
| Event logging/recovery                               | Append-only operational audit, safe post reconciliation and permission-error states                    | Reviewed post recovery and historical organizer views                         |
| Custom templates/forms                               | Reviewed Forever instance/role definitions and saved organizer defaults                                | Richer requirement profiles and composition presets                           |
| Website integration                                  | One event detail, reserve flow, directory projection and admin controls                                | Member dashboard, discoverable approved event archives                        |
| Mirrored events                                      | Not enabled in the pilot                                                                               | Explicitly authorized server/channel projections of the same event            |
| Temporary roles/voice                                | Not needed for core signup/SR                                                                          | Optional least-privilege voice/role automation with expiry and cleanup        |
| General polls, unrelated game templates, DKP economy | Not part of the SR product                                                                             | Separate scope decision; no automatic commitment to every Raid-Helper utility |

Raid-Helper's premium feature inventory is a coverage reference, not a list of
dependencies we need to purchase. [Premium features](https://raid-helper.xyz/premium)

## 5. Organizer And Participant Journeys

### Organizer: One Command Or One Web Form

Proposed command, not currently registered:

```text
/raid create template:weekly-run loot:sr reserves:2
```

The command loads saved defaults and opens a compact confirmation flow. Required
details are title, region, faction, character ruleset, activity/confirmed instance,
local start and named timezone, end/duration, capacity and loot policy. Advanced
requirements belong in an expandable web editor, not an enormous command string.

1. Check the invoking application, guild, allowed channel, human organizer
   identity and configured hosting permission.
2. Show the resolved date/time, destination forum and loot rules before publish.
3. Persist the canonical event, directory projection, policy revision and
   delivery jobs in one transaction using an idempotency key.
4. A worker creates one bot-authored interactive forum post. The receipt links
   to the event and distinguishes queued/delivered/failed delivery.
5. Members can use the appropriately authorized event page through that link.
   It is not publicly discoverable merely because the draft exists.
6. A human Discord administrator applies Verified. The verified projection
   appears in `/lfg`; native calendar creation is queued separately.
7. The host manages signups, closes deadlines and exports a locked snapshot
   from the same event. No second SR raid needs creating.

The authenticated `/raids/new` form uses exactly the same service and policy
checks. Keep anonymous `/lfg/new` simple submissions working; add a clear route
to structured hosting rather than converting every text listing automatically.

### Participant: One Identity And A Connected Signup/SR Flow

1. Click Join in Discord or on the approved event page.
2. Select a saved character or declare one, choose supported class/spec/role,
   availability and acknowledge the event's exact loot policy revision.
3. Show the resulting state explicitly: accepted, awaiting organizer approval
   or waitlisted. A signup request is not necessarily a guaranteed raid seat.
4. Continue to a mobile-friendly item picker scoped to that event's approved
   Forever catalog and loot pool. Show reserve allowance, eligibility and lock
   time. Signup can remain incomplete rather than fail if the member skips SR.
5. Save reservations atomically and show a personal summary with edit/withdraw
   actions. Do not require typing a Discord contact into another website.

Use Discord components for joining, character/role selection and short actions.
Use the website for searchable loot tables and advanced roster management. Do
not squeeze a large item catalog into a fixed Discord select menu or depend on
DMs being open. Browser authentication may be needed once; it is not a second
signup or separate SR account.

### Organizer Changes And Exceptions

Changing time, faction/ruleset, confirmed instance, loot pool, HRs or loot rules
is a material revision. Record the old/new values, require affected members to
acknowledge when eligibility or agreement changes, and invalidate stale export
readiness. An instance/loot-policy change requires fresh Verified review before
the revised public details are discoverable. Cosmetic and roster-only changes
do not require reapproval. Schedule changes notify participants and reconcile
the calendar without blindly creating a replacement.

Hosts cannot silently swap someone else's declared character. Staff can correct
a record with a reason and audit entry; it is not proof of in-game ownership.

Store event-definition revisions separately from roster/projection versions.
Joining, changing availability or promoting a bench member does not create a
new loot agreement. Material definition changes create an immutable revision;
public discovery requires the current review-sensitive definition to match its
human-approved revision. The event service owns that transition, not an editable
directory status field. Preserve previous definitions for acknowledgement,
disputes and stale export detection.

## 6. Identity, Authorization And Privacy

Add a separate Auth.js Discord configuration for community members, with its
own base path, cookie names and authentication secret. Keep the existing staff
credentials configuration and authorization unchanged. Verify isolation against
the installed Auth.js version before building the routes; the installed core
supports configurable base paths and cookies. [Auth.js Discord provider](https://authjs.dev/getting-started/providers/discord),
[configuration reference](https://authjs.dev/reference/core)

Use minimal `identify` scope; use the bot's scoped guild-member lookup to check
participation/hosting permissions. Do not request email, guild-join or broad
account scopes without a separate demonstrated need. Keep OAuth state/PKCE and
origin/CSRF protection; do not implement a custom Discord account-token login.
OAuth return destinations are allowlisted same-origin paths, not arbitrary
callback URLs supplied in a component or query string.

The member record is keyed by immutable Discord user ID. Display names are
presentation only. A website session and a signed Discord interaction resolve
to that same member. Do not merge a staff account by email or username.

Roles and checks:

- Member: manage their own profiles, signup, reserves and notification settings.
- Organizer/co-organizer: manage only explicitly assigned events; hosting role
  is rechecked on sensitive actions, not trusted forever from a cookie.
- Discord administrator: approve public publication using the existing human
  Verified policy; event ownership alone is insufficient.
- Website staff: emergency hide, review data, revoke hosting and record reasoned
  recovery actions through existing staff authentication.
- Worker: only prescribed external projections/jobs; no human impersonation,
  admin approval or access to private reports/evidence.

Pilot hosting is an allowlist. Public hosting later needs quotas and an approved
organizer-role policy. Permission checks fail closed on unresolved membership.
For private events, verify the participant's actual channel/event audience access;
the bot being able to see a channel does not mean every guild member can see it.
Website staff repair rights are limited to the appropriate owner/admin/moderator
roles, not granted to editorial accounts or every Discord moderator by default.
Withdrawal, notification opt-out and personal-data requests remain possible
after leaving the guild through authenticated identity, without granting new
participation or hosting rights.

Character profiles store only declared Forever information needed for grouping:
name, region, faction, ruleset, supported class/spec/role and optional level.
Do not impose a fictional realm or global name-uniqueness scheme; only add a
namespace identifier when Forever's actual identity model requires it. Do not
claim character ownership is game-verified without a supported verification
method. Name collisions across members are reviewable, not authority grants.

Public discovery exposes aggregate composition and availability by default.
Bot posts contain only signup details members deliberately agree to share in
that channel. Detailed rosters/reserves require the event's audience permission;
hidden SR is visible only to the owner of those reserves and organizers, and
never leaks through embeds, search responses, export URLs or counts per item.

For private pilots, no roster is shared to public forums or calendars. If an
audience becomes narrower, withdraw wider projections before publishing changes.
Changing to a wider audience requires renewed participant sharing agreement.

Before live launch, update privacy/terms with the actual flows and a reviewed
retention schedule. Proposed defaults are 90 days after an event for personal
signup details and 180 days for restricted loot/audit records, with explicitly
documented dispute holds and deletion/redaction behavior. Do not repurpose
attendance for public player ratings, automatic blacklists or marketing.

## 7. Forever-Only Catalog And Release Gates

The catalog is an essential first workstream, not a task to defer until after
the reserve UI has been populated with another edition's items.

### Separate Facts From Availability And Drop Claims

An item existing in a Forever client does not prove it drops from a specific
boss or is available in the current phase. Keep these separately versioned:

1. Build facts: item ID, names, icon reference, quality, slot, definitive
   restrictions and provenance for the exact reviewed Forever client/build.
2. Instance definitions: identity, activity, supported capacities and reviewed
   availability/release state. Do not infer a raid size from an older edition.
3. Loot-source claims: instance/encounter, item, evidence, review state and
   applicable build/release. Client hints are candidates, not confirmed drops.

For the [Wowhead import](forever-wowhead-loot-import-plan.md), source-reported
item facts/loot membership are a separate evidence level from client-observed
facts. Record source patch and exact client build independently; unknown build
stays unknown. A reviewed source-pinned Forever catalog may be published with
honest evidence/availability labels, but must not be called client-verified.

MVP import flow:

- Import a bounded, schema-validated Forever-only manifest as staged data.
- Require source provenance, checksums, client/build context and explicit review.
- Reject foreign products/builds, duplicate IDs with conflicting facts, invalid
  identifiers, unsafe media URLs and unavailable/unreviewed loot memberships.
- Review a diff in `/admin/raids/catalog`; publish a catalog atomically.
- Pin each event to an immutable catalog release and reviewed loot pool.
- Never replace an existing event's loot underneath its participants when a
  new catalog is published. Upgrade through an explicit event revision.
- Support corrected/retired claims without silently rewriting locked exports.

Accept a manually reviewed Forever manifest while an automated Trader export is
being prepared. Validate source terms/attribution before redistribution. Import
media from approved locations or controlled hosting; a source-provided URL must
not become an arbitrary server-side fetch target.

Also prepare the Wowhead adapter during M0: collect only explicit supported loot
sections and their scoped item/boss facts, then normalize, quarantine conflicts,
show a diff and publish through the catalog service. Preserve existing pools
when a source is blocked, incomplete or not yet published. Crawl/review does not
change live event SRs or replace pinned catalogs automatically.

The canonical game is always Forever. Approved upstream client-product labels
are source metadata, not additional supported editions. The current beta label
alone does not prove a payload is Forever; tie approval to a reviewed manifest
and captured client context. Release-client identifiers must be reviewed when
known, rather than guessed today.

Selectable SR requires both a reviewed item and reviewed eligibility in the
event's instance/release. Unknown class restriction is displayed as unknown;
do not invent spec/BiS restrictions. An observed auction item is not proof of a
raid drop, and an AI-generated name or item ID is never catalog evidence.

Future events are allowed; do not reinstate the old 30-day start limit. If their
Forever raid/loot pool is not confirmed, they may be scheduled as clearly marked
planning sessions with SR disabled. Activating SR later requires a reviewed
catalog and a new acknowledged loot policy, not guessed legacy loot.

Private tests may use explicitly labelled test fixtures and actually observed
Forever dungeon items. Production contains no fake encounters or other-edition
IDs. No live raid-validation claim is made before that Forever content can
actually be tested. Available Forever dungeon content can validate the core
engine while raid-specific readiness remains gated.

## 8. Event, Roster And Loot State Machines

Keep independent states instead of overloading the current listing `status`:

| Dimension       | States / representation                                                   | Meaning                                                       |
| --------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Event lifecycle | `draft`, `open`, `signup_closed`, `in_progress`, `completed`, `cancelled` | Session lifecycle, independent of capacity or public approval |
| Publication     | `pending`, `verified`, `hidden`, `rejected`                               | Public discovery authority and emergency hide                 |
| Signup          | `requested`, `accepted`, `waitlisted`, `declined`, `withdrawn`            | Whether the person has a seat                                 |
| Availability    | `confirmed`, `tentative`, `late`, `absent`                                | Member's attendance intention, not another signup             |
| Loot            | `disabled`, `open`, `locked`, `final`                                     | Whether SR can be edited and whether a final snapshot exists  |
| Projection/job  | `queued`, `leased`, `delivered`, `failed`, `uncertain`, `suppressed`      | External delivery, not participant success                    |

Use typed string unions and Zod schemas in TypeScript, and matching SQL checks
where appropriate, following the repository's existing string-status pattern.

### Capacity And Concurrency Rules

- One signup row per event/member; changes of character update that same seat.
  Store a character snapshot so later profile edits do not rewrite history.
- Accepted seats consume total and role capacity, including accepted tentative
  or late members. Requested/waitlisted participants do not consume a seat.
- Admission also checks the declared character against the event's explicit
  faction/ruleset/level and other reviewed requirements. Do not infer Forever
  cross-region/cross-faction restrictions from an older edition or turn a
  discovery region into an IP-geolocation ban. Unknown game rules need review.
- Marking absent withdraws an active seat. After a loot lock, preserve the
  historical snapshot and record the eligibility change explicitly.
- Admission/promotion, capacity changes, character/role changes and reserve
  mutations take a database event-row lock in a consistent order and use
  database uniqueness constraints. Client counts are never authoritative.
- A role/class change that does not fit capacity cannot silently overbook.
  Offer a waitlist/request state or an audited organizer exception.
- Waitlist ordering is deterministic. Automatic promotion is allowed only for
  configured auto-accept events and eligible roles; manual-approval events
  require an organizer. Explain the resulting state to the member.
- Capacity cannot be lowered below accepted occupancy without an explicit
  roster decision. Do not silently kick the last signup.
- Warn an authenticated member about overlapping accepted events; do not
  publish their other private event details to hosts or other members.
- Expired/stale controls must reread current state and return a useful result
  instead of applying a decision against an old embed.

### Soft-Reserve Rules

- Each event has a versioned policy: allowance, duplicates behavior, per-item
  limits, eligibility, HR declarations, visibility and lock deadline.
- Enforce allowance and aggregate per-item limits transactionally, not by
  counting fields in the browser. Never truncate reserves to fit an export.
- Only items in the pinned reviewed loot pool are reservable; definitive item
  restrictions apply. Role desirability is not a factual equip restriction.
- A pending/waitlisted member may prepare reserves, visibly marked inactive.
  Only accepted, eligible participants enter a loot-master export.
- Withdrawal/decline preserves audit history but removes future eligibility.
- Character/spec changes revalidate the selection and cannot bypass a lock.
- Defaults are visible SR and two reserves when the selected template/export
  supports them. HRs are visible before joining; no hidden leader-only HR list.
- Loot policy is acknowledged at signup. Policy or HR changes require a new
  revision and acknowledgement; notification failure never implies acceptance.
- Hidden SR remains private until an explicitly configured reveal. Revealing
  is an audited action, not an accidental side effect of building an embed.

### Locking And Export Rules

Locking captures roster eligibility, character snapshots, policy, HRs, item
versions and reservations together in one transaction. Store a versioned,
canonical snapshot and checksum. Export is generated from that snapshot, not
from changing live rows fetched across several queries.

Deadlines are enforced using database time even if a scheduler is down. A
scheduled job projects the lock and sends optional reminders; it is not the
only thing preventing late edits.

After lock, changes require an organizer reason, an audit entry and a new lock
revision. Preserve previous snapshots. Publish a concise event revision notice
and mark earlier exports stale. A late replacement is a deliberate exception,
not a silent reset of everybody's SR. Initial release restricts these exceptions
to trusted organizers; ordinary members cannot reopen reservations themselves.

Cancellation disables new participation, suppresses reminders, withdraws public
discovery and cancels managed calendar projections. Completing a session freezes
normal editing; corrections remain explicit audited revisions. Duplicating an
event copies configuration only, never signups or reserves without fresh member
confirmation.

## 9. Proposed Persistence Model

These names are proposed additions, not existing tables. Create them only as
their milestone needs them; do not scaffold unused later-phase models.

| Model                     | Responsibility and important constraints                                                                                                                                                        |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ForeverMember`           | Unique Discord ID, display preferences, active/session-revocation version; never a staff role                                                                                                   |
| `ForeverCharacter`        | Member-owned declared profile and normalized Forever identity context; profile edits do not rewrite event snapshots                                                                             |
| `ForeverRaidCatalog`      | Immutable reviewed release, build/source evidence, checksum, provenance, review/publication metadata                                                                                            |
| `ForeverRaidInstance`     | Catalog-scoped identity/availability/activity and reviewed capacities; no edition column or inherited legacy defaults                                                                           |
| `ForeverRaidItem`         | Catalog-scoped item ID/facts/media/restrictions; unique catalog/item identity                                                                                                                   |
| `ForeverRaidLootSource`   | Catalog instance/encounter/item membership and reviewed source evidence; candidate claims excluded from live SR                                                                                 |
| `ForeverRaidTemplate`     | Organizer/community defaults, capacities, role definitions, loot policy and version; only Forever definitions                                                                                   |
| `ForeverRaidEvent`        | Canonical organizer/title/schedule/timezone/scope/capacities; independent lifecycle/publication/loot state and optimistic version                                                               |
| `ForeverRaidRevision`     | Unique event/definition revision, immutable schedule/scope/catalog/requirements/loot policy/audience snapshot and hash; current/approved revision references stay separate from roster versions |
| `ForeverRaidOrganizer`    | Unique event/member assignment and permission level; no authority from a supplied contact string                                                                                                |
| `ForeverRaidSignup`       | Unique event/member; declared character snapshot, role, availability, seat state, policy acknowledgement and version                                                                            |
| `ForeverRaidReserve`      | Unique signup/catalog-item pair with positive quantity; summed allowance/duplicates/per-item eligibility enforced under event lock                                                              |
| `ForeverRaidLootSnapshot` | Unique event/lock revision, canonical payload/checksum/policy; append-only to application roles                                                                                                 |
| `ForeverRaidAudit`        | Append-only actor/event/action/version/reason; redactable personal payload under retention process                                                                                              |
| `ForeverRaidDelivery`     | Per-target operation/version, lease, attempts, due time, external IDs, reconciliation/error state and operation idempotency                                                                     |
| `ForeverRaidInteraction`  | Unique interaction ID or member/web request key, payload fingerprint and stored result; bounded retention                                                                                       |
| `ForeverRaidReminder`     | Unique event/member/type/schedule-version; opt-in, due time and delivery/suppression state                                                                                                      |
| `ForeverRaidSeries`       | Later: recurrence rule/timezone/preset and materialized occurrence keys; never shared SR across occurrences                                                                                     |

HR declarations and policy versions belong to the immutable structured event
revision initially; introduce extra policy-specific relational models only when
query/validation needs justify them. Use real foreign keys, deletion policies
and supporting indexes.
An application-maintained counter cannot replace capacity locking/constraints.

Read-model integration:

- Add a nullable unique raid-event reference to `ForeverGroup`; legacy rows
  stay null and behave exactly as before.
- A native event and its directory row are created/updated transactionally.
  The directory row is a derived discovery projection, not a second editable
  event or signup database.
- Native events use their own delivery/verifier. Do not create a competing
  `ForeverListingDiscordJob` for that directory row.
- Generic group admin/submission paths must recognize raid-managed rows and
  delegate to event services; raw status updates cannot bypass Verified.
- Only approved upcoming recruiting events enter the default LFG view. Full
  events keep approved detail pages and can appear in an explicit full-events
  filter; Full is not a loss of approval.
- Expiry, start, completion and cancellation are projected explicitly. Starting
  a raid removes it from Upcoming, not from its authorized SR/detail pages.
- No automatic conversion of old group posts, Raid-Helper events, signups or
  reserves. Any future migration needs a separate reviewed mapping/consent plan.

## 10. Architecture And File Ownership

Keep a feature-local `lib/raids/` domain. Reuse existing security, database and UI
primitives; do not build a generic framework for every kind of community record.

Proposed modules:

| Location                                                       | Responsibility                                                                           |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `lib/member-auth.ts`                                           | Community Discord session and member lookup, isolated from staff credentials             |
| `lib/raids/contracts.ts`, `policy.ts`                          | Validated commands/API/catalog contracts and pure eligibility/state rules                |
| `lib/raids/service.ts`, `store.ts`                             | Authorized transactions, locking, audit and atomic delivery insertion                    |
| `lib/raids/catalog.ts`                                         | Forever-only import/review/readiness and bounded item search                             |
| `lib/raids/interactions.ts`                                    | Raid slash commands/components/modals/autocomplete without altering bridge dispatch      |
| `lib/raids/discord.ts`, `projections.ts`                       | Allowlisted Discord operations, verified source identity and versioned rendering         |
| `lib/raids/exports.ts`                                         | Locked snapshot and later tested addon adapters                                          |
| `scripts/raids-worker.ts`, `deploy/raids.ecosystem.config.cjs` | Delivery/reconciliation/deadlines/reminders under one isolated PM2 worker                |
| `components/raids/`                                            | Event editor, character picker, roster, item search, reserves and delivery/review states |
| `tests/raids-*.test.ts`, `tests/e2e/raids.spec.ts`             | Unit, database, transport, security and real user journeys                               |

No file must exist merely because this table names it. Keep related small code
together until separation actually clarifies ownership/testing.

Read the installed Next.js guidance before framework implementation. Use strict
types, existing Zod validation and structured parsers. For timezone conversion
and later recurrence, use a proven library rather than ad hoc date-string math;
review a Temporal/timezone library and an RFC 5545 recurrence library only when
those milestones need them. No dependency is added by this plan.

### Proposed Website/API Surfaces

| Route                                                      | Purpose and audience                                                                      |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `/raids/new`                                               | Authenticated hosting, pending Discord verification                                       |
| `/raids/[id]`                                              | Canonical event detail; approved public summary or audience-authorized draft/private view |
| `/raids/[id]/reserves`                                     | Authenticated own reserve editor and permitted shared reserve view                        |
| `/raids/[id]/manage`                                       | Event organizers/staff roster, policy, lock and delivery controls                         |
| `/account/characters`, `/account/events`                   | Own declared profiles, signups and opt-in notifications                                   |
| `/admin/raids`                                             | Staff health, event review, emergency hide and recovery                                   |
| `/admin/raids/catalog`                                     | Catalog diff, evidence review, publication and retirement                                 |
| `/api/community/auth/[...nextauth]`                        | Proposed isolated member OAuth handler; exact routing tested before release               |
| `/api/raids`, `/api/raids/[id]`                            | Validated create/read/material-revision services                                          |
| `/api/raids/[id]/signup`, `/reserves`, `/lock`, `/exports` | Resource-scoped mutations/access; never a generic arbitrary-action proxy                  |

The last row describes resource endpoints below `/api/raids/[id]`. Reads and
writes use field-level audience/ownership checks; guessing an ID is not access.
Exports are authorized responses with `no-store` and `noindex`, not public
bearer URLs in Discord embeds.

## 11. Discord Integration And Source Verification

Register `/raid create`, `/raid list`, `/raid status` and private own-event
management actions as needed. Joining/withdrawing/locking through components
uses the same authorized event service as the website. Do not register commands
before their implementation is complete and enabled for the pilot scope.

Generalize command/component/modal parsing with discriminated schemas. Verify
application ID, allowed guild/channel, actor, event version and message context
for every stateful action. A button's custom ID is a lookup key, not permission.
Expiring signed confirmations bind destructive actions to actor, event and
revision. Recheck server authority at execution rather than trusting a stale
form or component.

Discord requires an initial interaction response within three seconds;
continuation tokens last fifteen minutes. Acknowledge quickly and send long
external work to the durable queue. If a continuation token is required, store
it encrypted with a short TTL, never log it, and purge it after use/expiry.
An expired continuation does not undo a committed event; its receipt/status
remains available. [Interaction responses](https://docs.discord.com/developers/interactions/receiving-and-responding)

### Post Structure

The [Discord experience plan](forever-raid-discord-experience-plan.md) expands
this section with adaptive activity layouts, class/spec iconography, private
member controls and actual Discord desktop/mobile acceptance gates. It does not
activate native components or replace the publication/privacy contract below.

Use a compact interactive starter showing title, resolved start, scope, loot
policy, accepted/capacity counters and the canonical event link. Controls are
Join, My signup, Reserves and authorized organizer actions. Large rosters and
loot tables stay on the web; thread replies remain conversation, not commands.

Every native raid has a stored source identity: guild, parent forum, thread,
starter message, bot author, event ID and delivery generation. Use a stable
reference in the starter and store the expected rendered payload per delivery
version. Dynamic counters can change; authority-bearing fields cannot be
silently replaced by an arbitrary edited embed.

The verifier validates the actual message against a known stored projection
revision, allowing short in-flight transitions between committed revisions.
Unexpected content/source changes suspend publication and require inspection.
Do not accept any bot-authored embed merely because it contains an event ID.
Identity, render checks and Verified actor evidence are independent checks.

Human Verified is validated by protected tag ID and audit actor as in the
existing listing contract. Removing/recreating Verified, removing the tag,
deleting the source, or moving to an unauthorized audience hides discovery.
Emergency website hiding remains effective until fresh administrator review.
Transient Discord errors cannot grant a new approval. Use explicit last-checked
health and a bounded stale-approval policy for native events, reviewed before
launch; retain existing legacy listing behavior.

### Routing And Permissions

Reuse the current routing decision: PvP character ruleset or PvP-premade activity
goes to the faction's PvP forum; remaining raids/RP use scheduled runs; remaining
dungeons/questing use PvE. Activity and ruleset remain separate. Reserve a tag
slot for Verified and preserve existing unrelated tag IDs/permissions.

Pilot destinations are private allowlisted channels with validated access.
Production posting uses only reviewed Forever faction forums. Mirroring into
another server is not automatically authorized by historical bot installation.

Required permissions are scoped View Channel, Send Messages, Read History,
Embed Links, appropriate thread creation/posting and access to verification
audit evidence. Native calendar creation needs Create Events; privileged
thread/tag management is scoped to approved forums. Own-message edits do not
justify server-wide Manage Messages. Do not require Administrator or change
onboarding/traps/other channels during feature activation.

### Native Calendar

Use one bot-owned external event per approved occurrence, linking to the signup
post and canonical event. Store its ID. Calendar Interested is not a roster
seat. Create only after Verified; cancel/hide the managed projection when
authority is withdrawn, recording whether recreation will be needed later.

Discord allows 100 scheduled/active events per guild; external events require
end time and location. Terminal calendar states cannot simply be reopened.
Keep long-future sessions in our database and materialize calendars within a
configurable rolling horizon, with a separate quota and available-capacity
check. Calendar deferral must never reject a valid future website event or
create a second signup. [Scheduled-event contract](https://docs.discord.com/developers/resources/guild-scheduled-event)

## 12. Durable Delivery, Recovery And Reminders

Keep one authoritative event transaction and an outbox; external Discord calls
cannot be atomic with PostgreSQL. Promise idempotent processing and explicit
reconciliation, not magical exactly-once delivery across those systems.

Delivery rules:

1. Persist an operation key and intended event/projection version before sending.
2. Claim due jobs with row locking and expiring leases. Serialize operations
   per external target; an older completion cannot overwrite a newer projection.
3. Use unique request keys and payload fingerprints. Replaying the same request
   returns its stored result; reusing a key for different input returns conflict.
4. Handle Discord bucket/global limits using response headers and `retry_after`;
   coordinate requests with our other processes sharing the same bot token.
5. On explicit rejection, report an actionable error. On timeout/unknown creation
   outcome, hold as uncertain and reconcile the stable event reference before
   any new creation attempt. Never retry a potentially delivered create blindly.
6. Reconcile only allowlisted destinations and our stored external IDs/reference.
   Zero/multiple ambiguous matches require staff review, not content guessing.
7. Coalesce rapid roster edits, render the latest state, and show pending/stale
   delivery honestly. External failure does not roll back a committed signup.
8. Source deletion, permissions lost and manual calendar edits are visible
   admin states. Recover only through an explicitly authorized operation.
9. Stop gracefully, release leases, and suppress superseded/cancelled jobs.

Discord rate limits are shared by bot identity, not isolated just because we
use separate PM2 processes. Start conservatively and test auction/listing/raid
coexistence; a broader distributed limiter is justified only if measured
traffic needs it. [Discord rate limits](https://docs.discord.com/developers/topics/rate-limits)

Reminders are opt-in and purpose-specific: missing reserves, lock approaching,
accepted-seat confirmation and upcoming start. Recheck eligibility and schedule
version immediately before delivery. Rescheduling invalidates old reminders;
cancellation suppresses them. Dedupe event/member/type/revision and cap frequency.
Closed DMs are a nonfatal recorded outcome with a website alternative, not
permission to spam a public channel or keep retrying indefinitely.

## 13. In-Game Export And Future Companion

The first export is our documented `forever-raid-snapshot.v1`: a pinned Forever
catalog, policy/lock revision, character/roster eligibility, item IDs/quantities
and checksum. Provide a readable organizer report and a safe download. This
is useful and testable without claiming another addon already accepts it.

Evaluate the actual Forever loot-master handoff during M0, not at the end of
the project. Before live raid rollout, an organizer must validate a workable
in-game import or explicitly approved readable/manual handoff. A JSON download
alone is not equivalent to a complete Softres replacement. If a basic adapter
or small import companion is needed for that handoff, bring it into M2/M3;
only deeper automatic integrations wait for M5.

Gargul's documentation lists Softres import and group management. Its source
contains the actual import/validation behavior. Build an adapter against a
pinned inspected version, validate every field, and test the result in the
Forever client before calling it compatible. Do not test against another WoW
edition and label that a Forever validation. Unsupported reserve counts or
rules disable that export adapter rather than truncate or silently approximate.
[Gargul documentation](https://github.com/papa-smurf/Gargul),
[SoftRes implementation](https://github.com/papa-smurf/Gargul/blob/master/Classes/SoftRes.lua)

If Gargul is unavailable or unsuitable for Forever, a small separately scoped
companion can import our snapshot and show reserves/roster or prepare invites.
It should not become a complete replacement for in-game loot handling in the
first web/bot release. Confirm actual Forever addon APIs/protected-action rules
in the client before promising automatic invitations or loot assignment.

No addon secret embeds a bot token. Ordinary in-game addons cannot be assumed
to call our HTTP API directly. Start with explicit clipboard/file import and
user-triggered actions; a desktop companion integration is a later opt-in task.
Any loot-results upload needs provenance and organizer review, not automatic
authority over an earlier locked agreement.

## 14. UI, Admin And Discovery

Use the existing site's visual system. The raid workspace is a compact tool,
not another marketing hero or a page of decorative nested cards.

Event view:

- Header: title, actual activity/instance, faction/ruleset/region, readable start,
  local-time alternative, duration, organizer and lifecycle/delivery state.
- Stable tabs: Overview, Roster, Reserves; organizer-only Management/Audit.
- Primary action reflects identity/state: Join, Pending, Waitlisted, My signup,
  Locked or Cancelled. Avoid calling every state a successful signup.
- Roster: clear accepted/bench counts and role composition; accessible web
  controls for organizer arrangement, not drag-only operations.
- Reserves: searchable bounded item list, icons from reviewed sources, selected
  allowance, restrictions, policy acknowledgement, deadline and real lock state.
- Loading, empty catalog, disabled SR, permission loss, stale revision, full
  roster, delivery error, closed DMs and unsupported export are designed states.

Mobile has a single-column flow, compact summaries and no required hover or
wide spreadsheet. Test 360/390/768/1440-pixel widths, long character/item names,
large rosters and maximum supported reserves; no overlap or horizontal page
overflow. Icons use the existing Lucide library, inputs are labelled, and
keyboard/focus behavior remains usable.

Admin adds native events, organizer grants, catalog evidence/diffs, projection
health, uncertain jobs, locks/exports, retention and emergency hide. Retry is
not offered when delivery is uncertain. A staff repair preserves old IDs/audit
evidence and does not delete human conversation. Recovery previews changes
before confirmation.

Approved public event summaries have one canonical URL and useful HTML. Private,
pending, rejected, personal and export surfaces are noindex and access-controlled;
robots directives alone are not privacy. No synthetic raid/event pages for SEO.
Personalized pages/API responses are private and non-shared-cacheable; public
summary caches must contain only approved public fields. Metadata generation,
link previews and client hydration must not leak the authorized roster payload
to an anonymous viewer. Revalidate approved summary caches on material revision,
hide, cancellation and audience changes.
Add only approved public pages to discovery/sitemaps; truthful event structured
data is a later checked enhancement, never fabricated availability/attendance.

## 15. Time, Series And Expanded Coordination

Store start/end/deadlines as UTC instants plus the organizer's named timezone.
EU defaults to `Europe/Berlin`; NA to `America/New_York`; allow an explicit
supported IANA timezone. Display date-specific offsets and Discord timestamps.
OCE must not inherit a made-up regional zone; request a named timezone or use
clearly labelled UTC. Region, ruleset and timezone are independent values.

Reject nonexistent DST times and ask for the intended offset for ambiguous
times. Changing region does not shift an existing instant. Validate end after
start, deadline ordering and rescheduling effects. Far-future creation is
permitted with organizer quotas, not an arbitrary 30-day ban.

Later recurring series store a local wall-clock rule and named timezone, then
materialize independent occurrences within a rolling horizon using a proven
recurrence library. Use unique series/occurrence keys and catch up safely after
an outage. Each occurrence has its own roster, consent, lock and SR; never copy
participation automatically. Handle skips/holidays, single-occurrence changes,
series-wide changes and DST in tests. Avoid competing native Discord recurrence
and our occurrence generator as two scheduling authorities.

Composition enhancements propose group placement from reviewed Forever role
definitions, targets and member preferences. A host approves changes; it is not
an AI decision about player quality. Friend-group constraints, alternate roles
and overlapping events are visible exceptions, not hidden rejected signups.

Cross-server projections require explicit destination approval and participant
audience consent, share the canonical event, and dedupe by Discord ID. They are
separate from the existing conversation bridge and do not import old messages
or KFC raid data. Neutral ground remains the community's identity.

## 16. Ordered Implementation Backlog

Every milestone ends with a working tested slice. Documentation completion is
not feature completion; mark work done only after its acceptance gate passes.

| Milestone                    | Work packages                                                                                                                                                                                 | Acceptance gate                                                                                                                                                                     |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M0: foundations              | Finalize contracts and pilot allowlist; isolated member OAuth; Forever-only catalog staging/review; loot-master handoff feasibility check; migration/grants; complete command manifest        | Staff/community sessions remain isolated; foreign/unreviewed catalogs rejected; migrations apply twice safely; existing commands and flows unchanged                                |
| M1: private event and roster | Canonical event service/directory linkage; create confirmation; compact Discord post; join/change/withdraw; requested/accepted/waitlist; explicit timezones                                   | One Forever test event survives retries/restarts; real PostgreSQL concurrency cannot overbook; all pilot audiences remain private                                                   |
| M2: native SR and locks      | Catalog-scoped picker; allowance/HR/visibility; policy acknowledgement; eligibility; independent deadlines; immutable snapshots; native export                                                | Parallel reserve edits respect policy; hidden data never leaks; post-lock edits require a new audited revision; only eligible accepted players export                               |
| M3: useful public release    | Versioned source verification; protected human Verified; LFG/admin integration; native calendar; targeted reminders; recovery and health; mobile/accessibility; validated loot-master handoff | Approval survives roster-only updates; removal/emergency hide works; calendar failure cannot duplicate events; live Forever pilot, real loot handoff and desktop/mobile review pass |
| M4: organizer efficiency     | Presets/duplication; recurrence; roster/group planning; check-in; privately scoped attendance; personal calendar support                                                                      | DST/recurrence/restart tests pass; no copied signups/reserves; organizer trials show reduced manual work                                                                            |
| M5: validated extensions     | Additional Forever-tested addon/companion integration; authorized cross-server projections; optional temporary voice/roles and reviewed loot-result reconciliation                            | Each extension has its own compatibility, permission, consent, cleanup and rollback gate; none is advertised before validation                                                      |

### First Coding Batch

1. Add the isolated member-auth configuration and identity tests without changing
   `getStaff` or existing staff credential sessions.
2. Define strict Forever catalog/event/signup/policy contracts and immutable
   source fixtures containing Forever evidence only.
3. Add additive SQL models/constraints/grants for M0/M1, registering new
   migrations in `scripts/migrate.ts` without editing applied migrations.
4. Implement catalog staging/review, including the offline Wowhead source adapter
   and one reviewed Forever test pool; public selectable loot remains empty if
   the evidence is not available. Approved network collection is a separate gate.
5. Implement transactional event creation/admission/withdrawal and real-database
   capacity tests before adding interactive Discord controls.

Then add the command dispatcher and private projection worker, followed by SR.
This order tests the authoritative rules before adding several UI entry points.
Catalog review can proceed alongside identity work; missing raid data must not
block building the engine, but it does block advertising live raid compatibility.

### Rough Engineering Envelope

For one experienced full-time engineer with prompt organizer/client testing,
estimate roughly one to two weeks for a narrow private roster/SR prototype,
three to five weeks for a useful first release, and eight to twelve weeks for
expanded production-ready organizer tools. These are cumulative planning ranges,
not delivery promises. Actual Forever catalog availability, addon support and
successful live testing can delay content-specific features independently of
the web/bot work. No time is allocated to other editions or generic game parity.

## 17. Verification Matrix And Feedback Loop

Existing relevant commands are `npm test`, `npm run lint`, `npm run typecheck`,
`npm run build` and `npm run test:e2e`. Add focused raid/real-PostgreSQL suites
as implemented; do not list an uncreated package script as something already
available. Database tests use an isolated test database, never production.

| Area             | Required verification                                                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Identity         | OAuth failure/state replay, member/staff cookie isolation, session revocation, email/name collision, member leaving, organizer role removed            |
| Catalog          | Mixed-edition/build rejection, unknown item, duplicate/conflicting item, unreviewed loot-source claim, unsafe media, retired catalog, event pinning    |
| Creation         | Same-key replay, different-input key conflict, double-click publish, lost acknowledgement, arbitrary channel/guild rejection                           |
| Roster           | Many parallel joins for final seat, role cap races, capacity reduction, class/character changes, withdrawal/promotion race, stale UI actions           |
| Reserves         | Concurrent allowance/per-item edits, HR conflict, duplicates policy, wrong pool, definitive restrictions, hidden visibility, pending/bench eligibility |
| Locks            | Edit racing deadline/lock, scheduler offline at deadline, atomic snapshot, post-lock replacement, policy revision, stale export refusal                |
| Publication      | Non-admin/bot Verified rejected, absent audit, changed tag ID, source tampering/deletion, approved dynamic roster updates, emergency hide retained     |
| Time             | EU/NA DST boundaries, ambiguous/nonexistent local time, OCE zone selection, far-future session, rescheduling with existing participants/reminders      |
| Delivery         | 429/global limits, timeout after creation, crash after external success, stale lease, out-of-order edits, duplicate worker, safe reconciliation        |
| Calendar         | Missing permission, full calendar, delayed materialization, terminal-state reschedule, cancellation/reapproval, Interested not a seat                  |
| UI               | First/repeat signup, denied/pending/waitlisted/full/cancelled states, keyboard, long names, large lists, all four viewport widths                      |
| Regression       | Legacy guild/group submissions, PvP routing, EU/NA readable times, staff login/admin, bridge commands, auction/listing workers                         |
| In-game          | Only Forever client: exact locked snapshot, accepted roster, real item IDs, quantities, HRs, restrictions and intended addon version                   |
| Privacy/recovery | ID enumeration, unauthorized export, private roster leakage, notification opt-out, retention, backup restore and cleanup of only managed resources     |

Feedback loop for each milestone:

1. Self-review the diff and state transitions; run focused tests first.
2. Run broader regression/type/lint/build checks for shared contract changes.
3. Exercise real PostgreSQL transactions and mocked Discord partial failures.
4. Use a private bot pilot with consenting testers; verify what Discord actually
   displays, not only the REST response. No fabricated signups in public channels.
5. Review Playwright desktop/mobile screenshots, accessibility and browser errors.
6. Have an organizer complete the creation/signup/lock/export journey and record
   friction and remaining manual steps. Correct issues and rerun the failed cases.
7. When relevant content is available, test the exported result in Forever and
   record client/build/addon versions and limitations.
8. Write a release record with evidence, known limitations and rollback steps.
   A milestone is not passed merely because its code builds.

Initial live readiness requires no unresolved authorization, capacity,
reservation-lock, privacy or duplicate-delivery defect. "Perfect" is not an
unverifiable completion criterion; every release must meet these concrete gates.

## 18. Deployment, Operations And Rollback

Deployment is additive and feature-flagged. Proposed flags are separate for
native raid mutations, public discovery, calendar, reminders and optional export
adapters. Default all off; use a reviewed private pilot profile first. Do not
store secrets in flags, audit payloads or admin responses.

Proposed new worker: `wow-forever-raids`, isolated OS/PostgreSQL role, PM2 fork
mode and private 0600 `.env.raids`. Its environment contains only its scoped
database credential, bot credential and required worker configuration. The
website receives the isolated member OAuth client ID/secret and auth secret in
its private environment. All names are new proposed configuration, not a claim
that they are currently set. No secret should be sent in chat or committed.

Keep schema/admin/catalog management with the migration/staff boundary. Worker
grants cover delivery/reconciliation, scheduled event state and narrowly scoped
reminder data, not users' credentials, private reports/evidence, unrestricted
audit history, KFC tables or Trader tables. Sensitive snapshots/audits are
append-only to application roles; retention is a separately authorized process.

Release procedure:

1. Snapshot the database/configuration and verify restoration on an isolated DB.
2. Apply checksum-tracked additive migrations/grants with feature flags off.
3. Deploy tested website/worker code without changing other PM2 services.
4. Configure member OAuth callback, pilot destinations/roles and reviewed catalog.
5. Register the complete guild command manifest only after endpoint validation;
   save the previous manifest for rollback.
6. Enable private pilot mutations/delivery; exercise the full flow with testers.
7. Enable public posting/discovery/calendar/reminders individually after their
   gates and explicit activation decision. Do not assume rollout authorization
   from approval of this plan.
8. Monitor mutation errors, queue age, uncertain creates, projection lag, lock
   readiness, calendar quota, reminder failures and unauthorized-action attempts.

Graceful shutdown stops new leases and finishes or safely releases current work.
Backups include catalogs, roster/policy revisions and locked loot snapshots, not
just event titles. Alert staff on held uncertain jobs; do not repeatedly ping
players about operational failures.

Rollback disables new mutations/outbound work but preserves read-only access to
existing participant receipts and locked exports. Keep schema and event data;
do not delete live signups or drop tables. Restore prior code/command manifest
only when it is compatible with any live projections. Stop all obsolete external
writers before recovery. Unpost/cancel only resources linked to our delivery
records; human messages, old Raid-Helper posts and other services are untouched.

Once live events exist, a rollback must retain a read-only event/export handler
or a reviewed equivalent; reverting to code that cannot read those events is
not an acceptable operational rollback.

## 19. Decisions That Need Evidence, Not Assumptions

Planning can proceed with conservative defaults; these are launch gates rather
than reasons to invent data or repeatedly ask for unrelated credentials:

- Approved Forever client/build/catalog provenance and instance loot pool.
- Which trusted people/roles can host the pilot and later public sessions.
- Actual event composition and rules for the selected Forever content.
- Member OAuth callback configuration and securely installed client secret.
- Forever-tested Gargul support, or approval for a small import companion.
- Final privacy/retention defaults, public roster fields and private event policy.
- Organizer feedback from actual pilot runs and confirmed content availability.

Default to one active declared character per member/event, manual organizer
approval for raids, visible SR, declared HRs, independent configurable deadlines,
no automatic attendance penalties, and no cross-server projection in the pilot.
All are explicit versioned settings rather than invisible inferred behavior.

The first build should deliver **one Forever event, one roster and one reserve
workflow**. Expansion follows successful tested organizer journeys, not a claim
of cloning every provider feature or supporting content that is not available.
