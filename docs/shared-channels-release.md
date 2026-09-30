# Shared Channels Release

The owner's later [existing-chat selection](shared-channels-existing-chats.md)
supersedes the original dedicated-channel pilot below: discussion and leveling are
selected; who-plays-what and guild-invite requests are excluded. The historical
rollout and verification below describe `d721bcd`, not the follow-up release.

September 30, 2026. This implements the two-way bridge from the
[implementation plan](shared-channels-implementation-plan.md). Commit `d721bcd`
is deployed to the website and the independent worker. **Message relaying is not
active:** the worker is healthy in `cleanup_only`, with no configured pair or
participants. See the verified rollout and remaining activation gates below.

## Production Rollout

Verified September 30, 2026, approximately 16:17 UTC:

- Website build `.next-release-bridge-d721bcd` is live at
  `https://www.wowforeverdiscord.online`, including `/admin/discord` and all three
  `/bot/` policies. The previous website build and a source snapshot are retained.
- Migrations `003`-`005` applied; a rerun reports the schema current. Backups before
  and after deployment restored successfully into isolated Linux scratch databases,
  including the bridge audit functions after migration.
- `wow-forever-bridge` runs under PM2 as `wowbridge`, using the checksum-verified
  Node 24.21.0 runtime at `/opt/wow-forever-node24`. The website remains on its
  existing Node 20 interpreter. No Docker or additional public listener was added.
- Worker release: `/home/wow-forever-bridge/releases/d721bcd`, selected by `current`.
  Its production-only dependency install passed with zero reported vulnerabilities.
  Both private environment files are mode 0600 and owned by their respective users.
- The actual worker database login can access the bridge runtime and restricted
  audit function, but cannot access staff accounts, private reports/evidence,
  general audit rows, admin receipts or KFC users.
- Discord accepted the signed HTTPS interactions endpoint. Message Content intent
  is enabled and the Gateway is ready. Only `/bridge` was registered in each fixed
  guild; unrelated commands were not replaced. HTTP enrollment controls are enabled,
  but joining is unavailable until an approved pair is activated.
- A new WoW Forever channel was created under General chats:
  `1554889798743887984` (`forever-shared-chat`). Its topic links the policy and says
  the pilot is not active. No notice or conversational message was posted.
- KFC and Helper, along with every unrelated PM2 application, retained their
  original PIDs and restart counts. Approximately 22 GB disk space remains.

Repeated release checks passed: 98 unit/integration tests, lint, strict typecheck,
worker build, Linux website build, and the three focused bridge browser tests.
The previous full 30-test browser run is also recorded below. Live verification
passed all 34 sitemap pages and existing desktop/mobile security/rendering checks.
The bot policies additionally passed at 320/390/768/1440px with no overflow,
accessibility violations or browser errors. Anonymous admin access and unsigned
Discord requests are denied. Screenshots are in ignored `artifacts/bridge-live/`.

## Activation Still Pending

- KFC has no dedicated shared channel, and the bot lacks Manage Channels there.
  The owner must create a public `forever-shared-chat` text channel, or temporarily
  grant the bot Manage Channels to create it. The channel topic must contain the
  policy URL; the bot needs View Channel, Send Messages and Read Message History.
- Obtain the owner's notice-publishing choice, exact notice links, permission-scope
  review, moderator coverage and the disclosed membership/retention approvals.
  No existing conversation is selected automatically.
- Create the pair in `/admin/discord`, complete actual opted-in Discord lifecycle
  and rendering checks, and record truthful launch approvals before publication.
  No human consent, successful live relay test or owner attestation was fabricated.
- Encrypted off-host recovery for worker secrets and independent failure alerting
  remain unconfigured. The private health CLI works; it is not an external monitor.

`/bridge status` currently explains that shared channels are not configured. The
presence of commands and an online bot does not mean member messages are relayed.

## Implemented

- Dedicated Gateway/REST worker using pinned `@discordjs/ws` and `@discordjs/rest`,
  PostgreSQL and a separate PM2 process. Supported runtime: Node 24.21.x or later
  Node 24, without changing the website's interpreter. No Docker or public port.
- Additive migrations `003`-`005`: pair, consent, message IDs, projection IDs,
  typed outbox, encrypted interaction continuation, heartbeat and admin receipts.
  No raw Gateway payloads or message bodies are persisted.
- `/bridge join`, actor-bound five-minute confirmation, deferred membership
  verification, `/bridge status`, `/bridge leave`, and author-scoped removal.
  Existing HTTP signature checks remain mandatory. Bot credentials are not
  required in the website process; it shares only the interaction encryption key.
- Explicit two-way attribution, source links, loop prevention, mapped native
  replies, current-source reads, bounded rendering and edit coalescing. Attachments,
  bots/webhooks, forwarded posts, polls, mentions and link-like text are excluded.
- Both-server membership/speaking checks, timeout checks, independent staff blocks,
  manual review by default, quotas, expiry, source/bulk deletion and destination
  suppression. Removing a parent retracts its managed reply descendants; Discord
  cannot reliably clear native reply references with an edit.
- An uncertain POST is never blindly retried. Own-bot nonce echoes or a verified
  exact output link can recover its ID. Expired create leases follow the same rule.
  Known-ID writes reconcile against current state. In-flight revocations queue
  compensating removal, even when an acknowledgement arrives late.
- Owner/admin and assigned-moderator controls at `/admin/discord`, with five views,
  status polling, paginated delivery metadata, optimistic versions, same-origin
  mutation checks, rate limits, idempotency receipts and audit records. Editors
  cannot access the workspace. Moderator approval is for both endpoint audiences;
  no automatic inference from a Discord role is made.
- `/bot/shared-channels`, `/bot/privacy`, `/bot/terms`, a scoped command registrar,
  restricted database grants, PM2 configuration and a no-public-port health command.
  Backups retain the reviewed audit-function DDL because table-only dumps omit it.

## Deliberate Pilot Restrictions

One pair only. Endpoint IDs are immutable: retire an incorrect draft, then create
another. Each channel must be a public, non-NSFW text channel named
`forever-shared-chat` or `forever-shared-chat-<suffix>`, not an existing general,
support or reporting channel. A bridge policy URL is required in its topic, and
each side needs its own approved notice link. Validation reads only those exact
notice IDs, never channel history.

Every process restart invalidates participation, cancels publication and begins
cleanup of known copies. This is intentionally conservative during the pilot,
including recovery of an old backup; there is no automatic resumed publication.
Normal Gateway interruptions pause publication and require revalidation/new opt-ins.
Restored unknown orphan IDs still require a manual incident response.

In review mode, changing a reviewed post retracts it; it is not automatically
republished. A new post requires fresh review. Review expires after two minutes,
so moderators must actually be present. Automatic mode can be selected only while
stopped, invalidates approvals and participation, and must be revalidated.

No website transcript preview was added. Moderators inspect originals through
exact Discord links using their own approved Discord access. No personal-account
automation, impersonated webhook authors, historic backfill or fabricated activity.

Copy lifetime is 30 days. Confirmed-removal mappings last seven days. Unresolved
IDs remain actionable. Withdrawn consent stays while mappings remain and at least
37 days after withdrawal; restrictions stay until staff lift them. Completed jobs,
interaction receipts and admin request receipts last up to seven days, subject to
maintenance being operational. Bridge audits last 90 days, separate from player
moderation cases. Approve these disclosed pilot defaults before launch.

## Local Verification

Final local checks: **98 unit/integration tests** (33 bridge tests), **30
Playwright tests**, strict typecheck, lint, website production build and worker
build passed. The isolated worker-package install/build/disabled-start check
passed, as did a disabled-start smoke test under Node 24.21.0. The worker's
production dependency audit reported zero vulnerabilities. Migration application
and rerun succeeded. These local results do not establish live Discord lifecycle
behavior; the separately verified Linux restore result is recorded above.

The isolated PostgreSQL on `127.0.0.1:55432` was used for migration application,
reruns, actual queue/consent transactions, restricted-role checks and browser
fixtures. Test Discord transport is simulated; no production chats are fixtures.

Focused tests cover both directions and reply mapping, duplicate events,
source/output deletions, opt-out during POST, uncertain sends and late echoes,
stale queues, 429/403, permission changes, membership rejection, reviewed edits,
restart cleanup, encrypted/actor-bound confirmations, scoped author removal,
restricted staff roles, idempotency, lease expiry, edit acknowledgement loss,
candidate-link verification, expiry and retirement.

Playwright covers the five admin views at 320/390/768/1440px, empty/offline and
partial-cleanup states, draft creation, pause confirmation, keyboard tab movement,
CSRF/editor denial and policy pages. Screenshots are in ignored `artifacts/`.
Real Discord desktop/mobile reply-preview behavior, privileged-intent availability,
timing under live rate limits and a staffed 24-48-hour pilot remain unverified.

## Production Preparation

Do not run the old eight-command `bot:register` script for this release.

1. Recheck production disk/RAM and backup restoration. The previous 91% disk-use
   observation is historical, not an approval to add another service. Configure
   encrypted off-host recovery and an independent failure alert before activation.
2. Publish the website/admin/policy changes with `BRIDGE_INTERACTIONS_ENABLED=false`.
   Back up first, run only the additive migrations, and keep KFC/Helper untouched.
   Verify private API denial and public bot policy URLs over HTTPS.
   Install both lockfiles before the website build: the root TypeScript check also
   includes worker integration tests. Use the supported Node 24 interpreter for
   `npm ci --prefix workers/discord-bridge`; retain the website's own interpreter.
3. Create restricted OS account `wowbridge`, an immutable worker release directory
   under `/home/wow-forever-bridge`, and `/etc/wow-forever-bridge/worker.env` readable
   only by that account. Do not copy the website or KFC environment into it.
4. Install the supported Node 24 runtime at `/opt/wow-forever-node24/bin/node`.
   Use the worker's own lockfile (`npm ci --prefix workers/discord-bridge`) and
   `npm run bridge:build`. Its shared source has no Next.js/runtime aliases. Deploy
   `dist`, the worker `package.json` and lockfile; install production dependencies
   inside that worker release. Its compiler resolves its own pinned dependencies.
5. Have the database administrator create a new `forever_bridge_worker` LOGIN
   with `NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE`, set its password privately,
   grant CONNECT to the existing database and apply `deploy/bridge-grants.sql`.
   Verify reads of `ForeverUser`, `ForeverReport`, `ForeverEvidence`, `ForeverAuditLog`
   and KFC tables are denied. Do not use a table wildcard or `forever_web` login.
6. Configure `BRIDGE_DATABASE_URL`, `BRIDGE_BOT_TOKEN`, `BRIDGE_INTERACTION_KEY`,
   `BRIDGE_FINGERPRINT_KEY`, `BRIDGE_BUILD` and `BRIDGE_ENABLED=false` in the private
   worker environment. Both keys are independent random 32-byte hex values. Only
   `BRIDGE_INTERACTION_KEY` is also installed in the website's private environment.
   Never put the bot token in command arguments or the browser.
7. In the Developer Portal, confirm the exact existing app ID
   `1554796912673169428`, the Message Content privileged intent and this HTTPS
   interaction endpoint: `https://www.wowforeverdiscord.online/api/discord/interactions`.
   Set `DISCORD_APPLICATION_ID` and `DISCORD_PUBLIC_KEY` for signature verification.
   Leave unrelated legacy commands, member lists, presence and privileged bot
   administration disabled. The HTTP endpoint and Gateway have separate duties.
8. Restrict the bot to the approved channels. It needs View Channel, Send Messages
   and Read Message History there, not Administrator or Manage Webhooks. The worker
   cannot undo broad role permissions inherited from earlier installation; an
   owner must review both servers' effective permission matrices first.
9. Create the two new channels, publish the reviewed notices below, assign real
   moderators and approve the both-server participation rule. No old history is
   selected. Test bot-sent messages against local moderation rules; Discord AutoMod
   does not screen server-installed app posts for you.
10. With the private worker environment loaded, run the compiled `register.js`
    without flags to review a diff. Then pass its exact `--apply=<digest>` after
    approval. It creates/patches **only `/bridge`** by name in the two fixed guilds,
    never bulk-replaces unrelated commands. Do not publish credentials in logs.
11. Explicitly enable and start only `wow-forever-bridge` using the root PM2 daemon
    and `deploy/bridge.ecosystem.config.cjs`. It runs as `wowbridge`, one fork, with
    an explicit interpreter. Verify other applications' PIDs/restart counts remain
    unchanged. The worker starts cleanup-only, never active by itself.
12. Enable HTTP bridge interactions, create the draft in `/admin/discord`, record
    both approvals and exact notice links, and request validation. Enable runtime
    publication separately, complete isolated-channel lifecycle tests and then
    activate the pair with the four governance attestations. Activation blocks on
    unresolved previous cleanup. Begin with 5-10 explicit opt-ins and manual review.

## Notice For Each New Channel

An owner must review and personally publish this, substituting the exact channel
names if a suffix is chosen:

> This is a two-way shared conversation between KFC Global Pugs and WoW Forever
> Discord. WoWForeverBot copies only eligible new text from people who explicitly
> opt in. Copies show your Discord username and original community. Join and be
> able to speak in both servers, then use /bridge join in each server you want to
> share from. Use /bridge leave to stop and request cleanup, /bridge remove for a
> particular copy, or /bridge status to check. Bot copies expire after 30 days;
> outages can delay cleanup. Human originals are not deleted. Policies and private
> support: https://www.wowforeverdiscord.online/bot/shared-channels

Also place `https://www.wowforeverdiscord.online/bot/shared-channels` in each
channel topic. The validator requires the notice to include that URL, `two-way`
and `/bridge join`. It does not publish or edit a notice on the owner's behalf.

## Monitoring, Recovery And Rollback

- Run compiled `health.js` with the same private environment under the worker
  identity. It returns nonzero for stale heartbeat, uncertain/failed delivery,
  reconciliation older than an hour, or an operational error. It prints only
  safe status/counts, never messages or credentials. Connect this to the chosen
  external monitor; no notification provider is silently enabled by this code.
- Pause stops publication but continues removal. Hard stop blocks all outgoing
  Discord writes, including cleanup and command continuations. Neither can recall
  a request already accepted by Discord. Retirement completes only after known
  copies are removed or confirmed suppressed.
- Inspect uncertain records in Delivery. Supply only an exact bot output link;
  the worker checks channel, bot author and opaque relay reference. Never retry a
  create whose output is unknown. Missing mappings from after a backup require a
  restricted manual incident, not a channel-history scan.
- Table-only backups include all new `Forever*` tables. The backup additionally
  stores `bridge-boundary.sql`; restore that reviewed function DDL after the dump,
  restore function ownership/grants to the intended website owner, then reapply
  the worker's narrow grants. Production `backup:verify` tests the function DDL
  in its scratch database; this passed during the production rollout above.
- Worker secrets are deliberately **not** added to the website's private archive.
  Re-provision them from the approved secret manager after recovery. Keeping the
  interaction key unavailable simply prevents new enrollment; never recover a
  bot token from chat history. Encrypted off-host secret recovery is a launch gate.
- Roll back by stopping publication and preserving cleanup capability. Keep the
  new compatible tables, IDs and withdrawal evidence. Do not roll back the shared
  PostgreSQL database to undo a code deployment. A restarted old backup invalidates
  participation and begins cleanup; it cannot identify unknown post-backup copies.

The site and automated tests are not evidence that real Discord rendering or the
live pilot passed. Sign off those remaining gates with the two server owners.
