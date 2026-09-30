# Website and Discord Integration Blueprint

Decision date: September 30, 2026. Engineering design for the next bot work,
not a claim that synchronization, member login or signups are already live.
This supersedes the original blueprint's generic bot phase and any suggestion
to scrape conversations or treat invitation clicks as confirmed joins.

The owner-requested [WoWForeverBot configuration audit](kfcbot-setup.md) is now prepared
as a read-only prerequisite. It does not activate the existing slash commands
or implement the publishing/worker phases below. The owner has created the
application and authorized its installation. A local GET-only configuration
audit has completed; private findings and a proposed change plan are stored
beside its snapshot. After owner-confirmed token rotation, the separate
[channel cleanup](discord-channel-cleanup.md) applied 28 topics and six forum
tag sets; ten updates remain permission-blocked. Bot-policy publication and
production interaction/publishing rollout remain outstanding. That local
configuration writer is not the worker or public bot service described here.

The [content, tools and tester program](content-tools-and-community-plan.md)
sets the current resource priorities: existing WoW Trader first, structured
work for the already-invited testers, reviewed guide/addon lookup and explicit
publication. Raid addons wait for relevant Forever testing. Its tool and
market integration contracts extend this design without merging databases
or bypassing the B0/B1 reliability and permission gates.

## Product Decision

Build one community with two useful interfaces. The website is the searchable,
maintained record for guides, approved guilds and planned sessions. Discord is
where people discover those records, discuss them and take deliberate actions.
The bot connects the two; it should not become a second database of conflicting
recruitment posts or an automatic publisher of allegations.

The long-term objective is more people finding compatible groups and returning
to play together. Search visibility is an acquisition measure, not the outcome.
Neither a bot nor a publishing schedule guarantees first place in search.

## Current System and Gaps

| Area | Present in the repository | Next work |
| --- | --- | --- |
| Public discovery | `/discord`, six live guides, guild/group directories, server-rendered metadata and sitemap | Three guide improvements and two preparation resources are now prepared; production publication is separate |
| Identity | Staff-only credential login in `lib/auth.ts` | Separate member identity and explicit Discord linking; no automatic staff account creation |
| Commands | Signed HTTP endpoint, eight guild-scoped commands, ephemeral replies | Durable idempotency, prompt acknowledgement, richer validated command contracts and test-server rollout |
| Roles | `/role` adds configured interest roles | Permission/hierarchy validation, managed-role allowlist, removal and failure recovery |
| Notifications | `ForeverWebhookJob` and five-minute maintenance delivery | Leased durable delivery, retry scheduling, useful delivery status and separate public/private destinations |
| Guilds and groups | Anonymous, challenged submissions; staff review | Verified ownership, revision review, synchronized public messages and withdrawal |
| Moderation | Private reports/evidence, two-reviewer publication, appeals | Keep private forms authoritative; bot supplies private links and staff-only notices |
| Measurement | DNT/GPC-aware sessions, sources and invite clicks | Measure deliberate member actions separately; no IP-to-Discord identity matching |

The existing bot is not production-ready merely because files exist. The local
audit has confirmed the application, guild and returned channel IDs, but the
separate production interaction credentials and approved delivery destinations
remain unconfigured. `handleInteraction` awaits
database/network work before responding; its per-interaction rate-limit entry
does not return a stored result for a legitimate retry. The webhook job has no
lease, external message ID, version or next-attempt timestamp. These are the
first engineering gaps, not reasons to replace the working website.

The [community operations plan](community-excellence-plan.md) supplies the
configuration audit interpretation, competitive research, host/staff workflows
and staged priorities. Its server-access appeal proposal is separate from the
existing FG-reference player-case appeal flow; `/appeals` must not be presented
as an already implemented general Discord-ban appeal service.

September 30 research also identified a product-model prerequisite: current
Blizzard documentation describes rulesets rather than traditional realm
selection and regional full character names. Existing realm-required forms,
group records without a ruleset field and the legacy addon identity parser
need an explicit compatibility/migration review before expanding these flows.
Use the source-backed correction in the community plan; older realm wording
below is not confirmation of Forever's current model or client API behavior.

## Immediate Growth Work

1. Improve invitation troubleshooting, recruitment templates and time-zone
   guidance on existing URLs. Keep the actual channel screenshots.
2. Publish the beta starter and friends/guild launch checklists after review.
   Their full content stays readable without login; downloadable templates
   are companions with `X-Robots-Tag: noindex`, not competing search pages.
3. Use the [outreach kit](community-outreach-kit.md) for permissioned introductions
   and listing requests. No request is recorded as accepted before a real reply.
4. Confirm sitemap Success and Bing ownership in the correct accounts. The
   owner already confirmed Google ownership. Do not ask to verify it again.
5. Enter consenting organizer handles in the existing admin settings. Review
   About, Rules and Safety with moderators; the current pages already disclose
   ownership, independent review and public Discord/private website reporting.
6. After real sessions, publish consented recaps or useful Q&A. Do not invent
   events, beta experience or member numbers while waiting for the migration.

This is consistent with Google's emphasis on useful original content and its
ordinary indexing requirements for AI features, not a special AI markup trick.
[People-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content),
[Google AI features](https://developers.google.com/search/docs/appearance/ai-features).

## User Journeys

### A New Player

Find an answer on the web, read it without an account, open `/discord`, join
voluntarily, and select region/interests through the server's onboarding. Later,
an optional `/start` command can show relevant published guides and upcoming
approved groups. Do not require Battle.net credentials, an addon or KFC membership.

An optional website Discord login should be offered only when it helps an
action such as maintaining a listing or a signup. Keep public browsing open.

### A Recruiter

Read the template, submit a complete listing and prove authority over that
listing. A public Discord handle is not proof of ownership. Initially staff
approve ownership claims through an authenticated member account and a clear
audit trail; never infer ownership from a matching guild name.

After approval, the worker creates one summary in the mapped faction/region
destination, linking the canonical guild page. Later changes create a pending
revision. The old approved version remains public until review; the bot must
not publish an unreviewed edit. Withdrawal hides the website record immediately
and queues removal of the bot's public projection. Provide staff correction
access when a recruiter loses an account.

### A Group Host and Participant

The host creates a dated session with region, realm, faction, named time zone,
end time, roles and expectations. After approval, publish its website record
and Discord summary. A participant can request a place from either interface
only after the ownership/member system exists.

Use explicit states: requested, accepted, waitlisted, declined, withdrawn and
cancelled. "Interested" in a Discord scheduled event is not an accepted roster
place. Do not promise attendance or automatically penalize people for absence.
Capacity changes and duplicate clicks must not overbook. A host sees one roster,
not a Discord list and a separate website spreadsheet.

### An Editor

Write and review a useful resource in `/admin/guides`. Publication updates the
canonical HTML, metadata and sitemap. An explicit "Share to Discord" action
queues a short approved summary with the article URL; editing punctuation does
not repeatedly notify the server. Unpublishing retracts the bot summary where
possible. No auto-generated articles from private chats.

### A Reporter or Moderator

`/report` and `/appeal` respond privately with the correct website process.
Do not accept evidence in a public slash-command option, forum post or public
message component. A private staff notice contains a case reference/link, not
the reporter, accused person's details, evidence or decision narrative.

Website staff authentication and permissions still apply after following a bot
link. A Discord moderator role never bypasses the website's two-reviewer and
independent-appeal requirements. An ordinary Discord forum post remains separate
from a reviewed website case. No automated cross-server blacklists or guild-wide
guilt by association.

## Architecture

```text
Public HTML / member actions / staff admin
                    |
          validated domain services
                    |
     PostgreSQL transaction: record + outbox job
                    |
     dedicated PM2 delivery worker (bounded concurrency)
                    |
          Discord REST API / mapped channels

Discord signed interaction -> existing HTTPS endpoint
                           -> actor + guild + permission validation
                           -> receipt + deferred response when needed
                           -> same domain services / delivery queue
```

Keep Next.js, Nginx, PM2 and the local PostgreSQL instance. No production Docker,
Cloudflare requirement, Redis cluster or separate microservice platform. Use
the existing `Forever*` namespace and additive migration runner; never use
`prisma db push` or reset against the shared KFC database.

Use HTTP interactions for the first bot release. They do not need a persistent
Gateway connection. If later requirements justify member-join or scheduled-event
Gateway events, run that client in a dedicated PM2 worker with a maintained
Discord library such as discord.js, after checking its supported Node version.
Do not put a persistent Gateway connection inside a Next request handler.

Discord supports either HTTP or Gateway interaction delivery; do not process
the same interaction through both. A Gateway client for other event types can
be a later addition. Initial acknowledgement must arrive within three seconds;
follow-up tokens last 15 minutes. Our target is acknowledgement within one
second under expected load, leaving margin for the platform deadline.
[Discord interactions](https://docs.discord.com/developers/interactions/receiving-and-responding).

### Durable Delivery

- Commit the domain change and its outbox record in the same transaction.
  An external Discord request never runs inside that transaction.
- Claim jobs with a short lease and `FOR UPDATE SKIP LOCKED`. Start with one
  worker and low bounded concurrency; retain correct behavior if two run.
- Record entity version, destination, action, attempt, next attempt, lease and
  sanitized failure category. A unique deduplication key prevents duplicate
  enqueueing of the same version/action/destination.
- Re-read publication/expiry state before delivery. Superseded edits must not
  recreate a withdrawn listing. Serialize conflicting operations per entity.
- Store Discord message/thread/event IDs. Edits update the known projection;
  they do not create a fresh advertisement. Staff-deleted messages require an
  explicit reconciliation decision, not automatic endless recreation.
- Treat Discord as eventually consistent: an in-flight send or outage can leave
  an older copy temporarily visible. Keep withdrawal tombstones, reconcile it,
  and show the stale/failed state in admin rather than claiming instant removal.
- Retry temporary failures with bounded backoff and jitter. Honor Discord's
  `retry_after` and global/bucket limits. Authentication and permission failures
  pause the affected destination and require an operator action, not a hot loop.
- A timeout after a successful external write can leave an unknown result.
  Use supported message nonce enforcement where applicable and reconcile by
  a stable reference. Other create operations may need an uncertain/manual
  state. Do not promise universal exactly-once Discord delivery.
- Keep delivered metadata for a bounded period; strip tokens and raw response
  bodies from logs. Exhausted jobs stay visible for deliberate retry.

These are application reliability decisions. Discord's API supplies rate-limit
signals and message identifiers; it does not make a local database transaction
atomic with an external message send.
[Rate limits](https://docs.discord.com/developers/topics/rate-limits),
[message API](https://docs.discord.com/developers/resources/message).

### Interaction Handling

Retain raw-body Ed25519 signature verification, freshness checks and application/
guild binding. Validate snowflakes as strings, command names and option schemas.
Reject unexpected DM and foreign-server contexts in the initial rollout.

Persist an interaction receipt keyed by its ID. A retry returns the compatible
acknowledgement/result rather than another mutation or an unexplained 429. Also
rate-limit by actor and action so changing interaction IDs cannot bypass limits.
Bind component IDs to the actor, entity/version and action, with expiry and
server-side authorization on every click. Never trust a hidden button as access
control. Check permissions again when executing a queued write.

For slow work, persist the necessary job before a deferred ephemeral response.
Keep continuation tokens encrypted and short-lived only when needed; purge them
after completion/expiry. Report an expired response window without undoing a
successful domain action or exposing its result in a public channel. Database
failure returns a clear retryable response, not a false success.

## Identity and Permissions

Create a member model distinct from `ForeverUser`, which currently represents
privileged staff. Website membership never creates an admin/editor/moderator.
The Discord user ID is stable identity; mutable display names are not keys.

Use the authorization-code flow through a maintained auth library, exact
callback allowlists, state bound to the initiating session, and server-side
token exchange. Start with `identify`; request `guilds.members.read` only for
an actual membership requirement. Do not request all guilds, email, DMs,
connections or `guilds.join` simply to sign in. Joining stays voluntary.
Discard access tokens after identity verification unless an approved feature
needs them; encrypt retained tokens and support revocation/unlinking. Never
merge a member into a staff account based on a matching email or handle.
[Discord OAuth2](https://docs.discord.com/developers/topics/oauth2).

| Capability | Initial permissions and boundary |
| --- | --- |
| Commands | Guild-installed application commands; ephemeral replies where appropriate |
| Public summaries | View/Send/Embed only in approved destinations; history access only where reconciliation needs it |
| Interest roles | Optional Manage Roles, with bot above approved interest roles and below staff roles; deny managed/elevated roles |
| Forum threads | Add only when a confirmed mapped destination requires them; validate channel type and permissions |
| Scheduled events | Add only the event permissions required by the chosen operation; do not request blanket guild management |
| Moderation notices | Separate private destination; test access as an ordinary member, not only as an administrator |

Never request Administrator, ban/kick, message-content or presence access for
the initial release. Role selections are interests, not proof of character,
guild leadership or trustworthy conduct. Role hierarchy remains a platform
constraint, even when a permission bit is granted.
[Discord permissions](https://docs.discord.com/developers/topics/permissions).

## Proposed Data Changes

These names describe future migrations, not tables added by this content work.

| Model/change | Essential fields and constraints |
| --- | --- |
| `ForeverMember` | ID, unique Discord user ID, display name, status, creation/update, consent version; separate from staff |
| `ForeverGuildOwner` | Member + listing + owner/editor role; unique pair, approval actor/date, transfer/revocation audit |
| Listing revisions | Entity ID, version, submitted actor, proposed public fields, review status, review actor/date; immutable approved snapshot |
| `ForeverDiscordDestination` | Guild/channel IDs, purpose, region/faction/activity mapping, enabled state, validation date; unique intended mapping |
| `ForeverDiscordProjection` | Entity/type, destination, external message/thread/event IDs, applied version, sync state; unique entity/destination/type |
| `ForeverDiscordOutbox` | Deduplication key, action, entity/version, destination, state, lease, attempts, next attempt, sanitized error; indexed due-job scan |
| `ForeverDiscordInteraction` | Unique interaction ID, actor/guild, command, state, safe response, expiry; no raw evidence or durable plaintext token |
| Group extension | Owner member, version, end time, time-zone context, cancellation state; do not derive an event end from today's six-hour listing expiry |
| `ForeverGroupSignup` | Group + member unique pair, requested role, state, created/updated; capacity check under group lock |
| Member preferences | Explicit notification opt-ins, region/interests, consent/update date; private by default |

Keep record ownership separate from human-visible contact fields. Audit writes
with actor, origin (web/Discord/staff), entity/version and outcome. Add foreign
keys and deletion/retention behavior explicitly. Avoid a catch-all JSON event
payload containing entire reports or member records; queue public projections
by reference and construct them through an allowlisted serializer.

## Admin Experience

Add a restrained `/admin/discord` workspace using existing tables/forms:

1. Connection: configured/not configured, expected guild, last successful check,
   app identity, permission problems. Never display the bot token or webhook URL.
2. Destinations: actual channel IDs, resolved labels, type and visibility check,
   purpose, enabled flag and staff-only test delivery.
3. Delivery: queued, retrying, delivered, uncertain, failed, superseded; next
   attempt and sanitized reason; filter by entity/destination. Retry and pause
   actions must be permission checked and audited.
4. Mapping/ownership: approved claim requests, disputed claims and last-sync
   version; show web state separately from Discord delivery state.
5. Operations: per-feature pause and a global outbound stop. The website keeps
   accepting valid actions while a destination is paused, with honest status.

Owner/admin configure destinations and release toggles. Editors can deliberately
share approved guides; they cannot change credentials or moderation destinations.
Moderators retain existing case permissions. A test button must not publish real
evidence or notify everyone. Use `allowed_mentions: { parse: [] }` by default;
only explicitly subscribed, approved role notifications can opt into a mention.

## Events and Notifications

Start with a Discord summary linking the website record. Scheduled events are
a later projection once groups have explicit end times, ownership and cancellation.
Discord event subscriptions mean interest; a website roster remains a separate
explicit agreement. Changes to time/cancellation need one clear notification,
not a fresh announcement for every edit. Prefer a subscribed channel over DMs;
DMs require opt-in, quiet-hour handling and graceful behavior when blocked.
[Scheduled-event API](https://docs.discord.com/developers/resources/guild-scheduled-event).

Real membership-arrival events require a deliberate Gateway/intents decision.
`GUILD_MEMBERS` is privileged; message content and presence are unnecessary for
this product's first useful flows. Confirm Discord's current approval rules at
implementation time rather than relying on a remembered server-count threshold.
[Gateway and intents](https://docs.discord.com/developers/events/gateway).

Do not infer a specific person's referral from an invite-use counter changing.
Simultaneous joins, existing members and missing events make that unreliable.
Keep unknown attribution unknown. Optional self-reported source is labelled as
self-reported. Do not match IP hashes, browser sessions and Discord identities.

## Content, Search and Privacy

The website remains the canonical place for public guild descriptions, useful
guides and event details. Discord summaries link there with a stable URL; search
crawlers never need a Discord session to read the public answer. Noindex member
dashboards, drafts, preview URLs, OAuth callbacks and private moderation routes.
Private evidence still requires authorization, not just robots exclusions.

Add a public bot/integration guide only after the relevant workflow is deployed
and tested with real screenshots. Until then, do not advertise automatic signup,
sync or reminders as existing benefits. Our custom bot is not Blizzard's game
client integration and does not bridge in-game chat or verify characters.

No automatic indexing of Discord conversations, private roles, member lists or
report forums. Obtain explicit permission before editing a discussion into a
public Q&A or recap; remove irrelevant names and private details. A public post
inside Discord is not blanket consent for a permanent search-engine page.

For KFC, the owner approved preparation of a search-only Bingbot/OAI-SearchBot
policy change. Keep GPTBot and other existing training restrictions, private
route protections and unrelated Nginx behavior. OpenAI distinguishes search
from training; allowing one does not require allowing the other.
[Official OpenAI crawler documentation](https://developers.openai.com/api/docs/bots).

## Metrics and Retention

Establish a baseline before setting numerical targets. Review comparable weekly
periods by source/page/region where available, without inventing search volumes.

| Stage | Measure | Limit |
| --- | --- | --- |
| Discovery | Search Console/Bing impressions, clicks, query/page pairs | No universal personal-search rank; no separate assumed Google AI report |
| Intent | Measured entry sessions and sessions clicking Discord | Existing DNT/GPC protections; click is not a join |
| Activation | Deliberate onboarding/claim/signup actions | Linked participants are not all members; no fabricated attribution |
| Participation | Host-confirmed sessions and opt-in repeat attendance | A scheduled event or RSVP is not proof of attendance |
| Utility | Current approved guilds, filled requests, useful guide corrections | Do not manufacture listings to improve this number |
| Reliability | Acknowledgement latency, queue age, failed/uncertain jobs, stale projections | Report each stage, not just process uptime |

Keep the existing 90-day analytics and 180-day evidence policies. Before member
launch, document identity deletion/unlinking and retention separately from
analytics. Proposed operational defaults: 30-day delivered-job/receipt metadata,
immediate continuation-token removal after completion/expiry, and aggregate
participation reporting without permanent raw chat history. Audit/case retention
must remain compatible with appeals; do not erase evidence merely because a
member disconnects Discord. Update the actual privacy policy before collection.

## Delivery Milestones

| Milestone | Scope | Release gate |
| --- | --- | --- |
| G0: Useful resources | Prepared guide improvements, two new checklists, templates, outreach kit, search-only KFC change | Content review, safe publisher dry run, responsive checks, explicit production release |
| B0: Bot foundation, next task | Test application; guild binding; receipts/deferred replies; durable worker; destination checks; `/help`, `/report`, `/appeal`, `/guild`, `/lfg`, `/events`; optional validated roles | No duplicate actions, no public private-data leaks, retry/restart tests, test-server evidence |
| B1: Web-to-Discord publication | Explicit guide share plus approved guild/group summaries; edit/withdraw; admin delivery view | One record/one projection, version ordering, permissions and cancellation recovery |
| B2: Member ownership | Optional Discord login, claim/review, member-owned revisions, correction/withdrawal | No staff escalation, no account-link takeover, ownership audit and unlink flow |
| B3: Group participation | Shared signup states, capacity/waitlist, host confirmations; scheduled-event projection when suitable | Duplicate/concurrent signup tests, time-zone/cancellation correctness, interested != accepted |
| B4: Sustained community | Opt-in digest/reminders, real recaps, optional Gateway membership signals | Measurable usefulness, retention/consent review, manageable support workload |

Implement B0 and B1 before trying to synchronize arbitrary member messages.
Keep `/check` disabled in the initial rollout unless alert freshness, review and
appeal suspension are independently verified. Do not let the registration script
bulk-enable every existing command simply because it currently lists eight.

### Later Options, After the Core Works

- A subscribed weekly digest of real upcoming groups, current recruitment and
  changed guides. Start with an editor preview and manual send, not a daily
  automated advertisement. Let people choose region/interests and unsubscribe.
- Partner-guild installation only after single-server operation is reliable.
  Each server explicitly authorizes its own destinations and listing ownership;
  tenant boundaries apply to every interaction/job. Never mirror private cases,
  guild member lists or moderation decisions across partner servers by default.
- A `/guide` lookup over published website resources. Start with deterministic
  titles/categories and links, not an AI assistant reading every conversation.
  Add question answering only if measured need and source-grounding justify it.
- Addon release notices can link approved, versioned downloads. The bot does
  not install code on a player's machine or push live changes into the game.
  In-game compatibility and reviewed-alert freshness remain separate release
  gates; an already-installed local export can be stale after an appeal.
- Calendar downloads and saved filters can follow actual demand from hosts.
  Do not build a full raid-management replacement before the simple shared
  listing, ownership and signup workflows prove useful.

## B0 Engineering Backlog

1. Record approved application/guild/channel/interest-role IDs. Put secrets in
   the project's private environment, never chat, docs or a CMS text field.
2. Extract shared command definitions from registration and dispatch. Add
   feature flags and guild-only installation/context constraints. Re-registration
   should reconcile only this application's intended commands in the test guild.
3. Add an allowlisted Discord REST adapter and bounded request handling. Use a
   maintained REST library where it avoids inventing rate-limit machinery; pin
   a version compatible with the deployed Node runtime before adding it.
4. Implement additive receipt/outbox/destination/projection migrations, indexes,
   leases and a dedicated worker. Separate the new public delivery queue from
   moderation notifications until the latter's migration is tested.
5. Refactor mutation paths into authenticated domain operations; keep browser
   challenge checks on browser submissions. Signed bot transport is not a reason
   to disable the public form's challenge, CSRF checks or rate limits.
6. Add `/admin/discord` connection/destination/delivery views and audited pause/
   retry controls. Runtime secrets stay deployment-owned, not browser-readable.
7. Add mocked API tests and test-guild acceptance checks below. Register only
   the approved commands after they pass; publish the setup/runbook and rollback.

## Acceptance and Recovery

- Invalid/stale signatures, wrong guild/app, unknown commands and oversized
  payloads fail; user-generated mentions cannot ping the server.
- Duplicate interactions, concurrent workers and a restart between send and
  acknowledgement do not silently multiply records or advertisements.
- 429, timeout, 5xx, invalid token, missing permissions, deleted channels and
  deleted messages produce the intended retry/uncertain/paused states.
- A stale queued version cannot resurrect an unpublished guide, hidden guild
  or cancelled group. Private reports and tokens never reach public destinations.
- OAuth denial, state mismatch, stale cookies, unlink/relink and an existing
  staff email cannot produce member-to-staff privilege escalation.
- Signup contention, last-slot races, changed start time, DST and cancellation
  are tested before B3. Interested counts remain distinct from accepted places.
- Mobile and desktop admin/member flows have empty, pending, failed and success
  states; keyboard access and no-overlap screenshots are part of acceptance.
- Confirm a normal member cannot read moderation destination history. Test role
  assignment with the actual hierarchy and without Administrator permission.
- Rehearse global outbound pause, worker termination, credential rotation and
  source/build rollback. Keep pending jobs and submissions; never restore the
  shared database over newer records to undo a code release.

Deploy a separately named PM2 worker as the existing restricted account; do not
restart all applications. Start on test channels, then one public destination,
then expand only after observed delivery is stable. Back up before additive
migrations; retain backward-compatible fields until the old worker is retired.
No unattended mass backfill of old posts: an operator reviews the proposed
records and destinations before enabling it.

## Inputs Still Needed

The final channel names are known, but API IDs and bot permissions are not.
The next bot task needs the application configured privately, the actual server
ID, a test guild or isolated test channels, destination IDs, optional role IDs,
and a consenting owner/moderator for live permission tests. Public organizer
handles and the beta guide's ongoing review owner still need confirmation.
Search account outcomes and community listing acceptance cannot be completed
by writing code; record the actual results in the operating checklist.
