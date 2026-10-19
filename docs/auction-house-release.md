# Trading Boards And Auction House Research

## Scope

Owner-approved replacement of Alliance and Horde trade text channels with native
forums, preserving their original chats as read-only archives. Auction House is
a bot/moderator-started forum with member replies, one pinned educational guide,
and no manufactured listings or discussions. Attribution is Open source contributors.

`npm run bot:trading` previews using GET requests. `--apply` journals live writes
under private `.data/discord-trading`, verifies settings and permissions, inventories
active/public/private archived threads, and preserves unrelated channels, guild
settings, role definitions, onboarding questions and intentional BOT/BAN choices.
An uncertain POST blocks retries until its private journal/state is reconciled.
No channels, messages or threads are deleted, and history is never imported as offers.
`--apply --refresh-guides` upgrades only the exact, reviewed first-release bot
copy; content hashes and bot ownership protect moderator edits. Character
ruleset is required; a traditional realm is not assumed for Forever listings.

The pinned updated policy excludes paid boost advertising, RMT, raid-loot sales,
account/character/name sales, escrow and community commissions. Historical human
rules remain untouched; the new pinned policy explicitly supersedes conflicting text.
Native tags require one selection, not a selection in every dimension. Staff review
listing completeness. Closing, cancellation and renewal are manual tag edits in
this release; inactivity archiving does not mean a sale occurred.

## Private-First Market Worker

`/admin/auction` is restricted to owner/admin/moderator. Only owner/admin can save
configuration; settings are validated, version-checked, same-origin protected,
rate-limited and audited. Moderators can inspect private previews and job health.
Editors and anonymous visitors cannot read it. Responses are private/no-store/noindex.

Defaults: private preview, no assumed markets, 15-minute checks, at most one report
per market per rolling 24 hours, at most five observations, 12 recent 30-minute
history buckets over at least 24 hours, quality score 7500/10000, five listings,
at least three available units, and source data no older than one hour.
Thresholds are conservative policy settings, not calibrated profit probabilities.

Only accepted, exact product/build/region/realm/Auction House data from WoW Trader
is consumed. Its existing robust-market-signal-v1 calculations are reused. The API
adds source scan identity and seven-day, quality-accepted base-item history coverage;
variant equipment is not merged into base-item prices. A separate market-read key
can call market-intelligence but cannot upload or inspect upload receipts.

Unconfirmed region, wrong scope, future timestamps, collecting/normal/thin signals,
insufficient recent history, low quality and inadequate supply withhold publication.
The generic web data-status route must not be used for Forever freshness because
it defaults to the TBC product. A worker consumes uploaded scans; it cannot perform
in-game scans or purchases. Crafting calculations remain in the existing workspace;
the digest does not invent recipe margins, demand, deposits or completed-sale data.

Preview mode stores reports only in private admin storage. Live mode requires an
explicit reviewed-pilot acknowledgement, an enabled confirmed market, and the exact
Forever auction-house forum. Stale public reports are edited to reference-only;
this safety maintenance continues when new publication is paused. No mass mentions.

Job uniqueness includes exact scope, scan ID, settings version and mode. A PostgreSQL
advisory lock prevents concurrent workers. The database records pending delivery
before Discord POST. Configuration is locked/rechecked at publication. Unknown
Discord delivery blocks that market instead of reposting, including after crashes.
Daily limits apply across settings edits and restarts. Preview/skipped rows expire
after 30 days; published/uncertain records remain for reconciliation.

## Runtime And Deployment

Apply additive checksum-protected migrations 010 and 011, generate Prisma, and build
the website in a new output directory. Do not run prisma db push or reset against
the shared database. All source changes must preserve unrelated local/production work.

Use the independent OS account `foreverauction` and database login `forever_auction`.
Grant only schema usage, SELECT on ForeverAuctionConfig, and SELECT/INSERT/UPDATE/DELETE
on ForeverAuctionRun/ForeverAuctionHealth, using deploy/auction-grants.sql. The worker
must not read staff, reports, evidence, KFC tables or modify general site settings.

Create `.env.auction` owned by foreverauction with mode 0600 from the committed
`.env.auction.example`. Use a freshly generated MARKET_READ_API_KEYS credential in
Trader's private ingest environment, not a collector upload key. Keep the Discord
bot token in the worker environment only, never in browser/admin settings.
Code uses existing tsx and pg dependencies; no Docker or additional production library.

Run one `auction:once` check as the worker account, inspect `/admin/auction`, then
start only the named `wow-forever-auction` PM2 app using deploy/auction.ecosystem.config.cjs.
Do not reload other PM2 apps or the Discord bridge. The source read-key change needs
only the Trader ingestion API restarted; Trader's web process and media stay untouched.
Keep the previous ingestion build for rollback and preserve its existing private keys.
The ingestion-only runtime is declared in deploy/auction-ingest.ecosystem.config.cjs.
When changing an existing PM2 app's executable/cwd, remove and register only that
named process: startOrReload retains its old path. Do not change Trader's global
current symlink or restart its web application. The previous ingestion runtime
remains /home/wow-trader-system/current/scripts/run-production.sh with the same
private environment, namespace and resource limits.

For uncertain delivery, pause that market and inspect the recorded destination,
timestamp and content in Discord. Do not clear pending/uncertain state or change
the job key to force a retry. Record a moderator-verified existing thread/message ID
as published, or a confirmed non-delivery as skipped, before permitting another post.
Deleted/edited public reports are not silently recreated.

## Acceptance

Before enabling public reports, review several genuinely new scans privately and
exercise stale data, unconfirmed regions, insufficient history, scope/build changes,
thin supply, malformed responses, daily limits and uncertain delivery recovery.
Freshness is necessary but does not establish profitable demand. More markets and
opt-in watchlists are a later expansion, not enabled by this release.

## Live Release: October 1, 2026

Guild: 1554316932948172940. Verified native forums:

- Alliance trade: 1555206895285968916
- Horde trade: 1555209425474822236
- Auction House: 1555209434458890321

Original chats 1554329346565734500 and 1554329363250421771 are read-only
alliance-trade-archive and horde-trade-archive. No messages or threads were deleted
or copied. Each forum has one pinned guide; trading rules have one pinned current
policy. The optional post-join interest question assigns no new roles and retains
the existing onboarding questions and intentional BOT/BAN options.

Website build .next-release-auction-20261001-r2 is live with /admin/auction.
Migrations 010/011 and the restricted worker login were verified. PM2
wow-forever-auction runs as foreverauction with local PostgreSQL and a 15-minute
interval, in private preview mode. Both private environments are mode 0600.
Trader's ingestion-only release is kfc-helper-ingest-auction-20261001-r1;
Trader web and the Discord bridge were not restarted.

The first production verification consumed 2,433 items from beta build 70124,
Alliance, ClassicBetaPvP, with region UNKNOWN and source time 2026-10-01T06:36:17Z.
At verification the upload was over seven hours old. Its sole preview withheld
recommendations; no public reports were posted. A second check created no duplicate
preview. The separate credential fetched intelligence but received 401 for receipts.
Use scripts/verify-auction-production.ts as the worker account for the private
release check; it must not be used as a live-mode acceptance test.

Verification: 172 community unit/integration tests; 11 ingestion API tests on
Linux; seven contract tests; community/ingestion/Trader web typechecks;
community lint and production builds; Playwright desktop/mobile permission,
configuration-conflict, layout and accessibility checks. Public homepages/workspace
returned 200; anonymous admin API returned 401 with private/no-store/noindex.
Configuration publication locking uses a transaction-scoped shared advisory lock
with an exclusive counterpart in the admin save transaction. A restricted-role
production probe verified the read-only worker can acquire it. PostgreSQL row
locks were removed because FOR SHARE requires UPDATE privileges, which this
worker intentionally does not receive.
Public posting remains deliberately disabled until the Acceptance section is met.

## Automatic Alliance Tips Follow-Up

The owner requested automatic public tips when new data arrives, with silence
when scans are stale, and confirmed that current collection covers Alliance only.
The production activation enables live publication for the exact beta source
wow_classic_beta / build 70124 / UNKNOWN / ClassicBetaPvP / alliance. The worker
checks every 60 seconds; a genuinely new eligible scan triggers a report on the
next check, subject to the existing one-report-per-market/24-hour cap. No heartbeat,
stale-data announcement or empty market report is posted to Discord.

Market configuration now distinguishes regional coverage from explicit
uploaded-beta-market coverage. Older configurations default to regional, preserving
their previous safety behavior. Uploaded beta coverage keeps the source's UNKNOWN
region unchanged and makes its limitation visible in every tip. It is not a claim
of EU/NA, worldwide, all-ruleset or Horde coverage, and it never combines their
history. Blizzard confirms a realmless ruleset structure, but the cited announcement
does not establish a worldwide shared auction economy:
[Blizzard ruleset announcement](https://news.blizzard.com/en-us/article/24302070/choose-your-ruleset-in-world-of-warcraft-forever).

Freshness, exact source scope, quality, sufficient supply and time-spread history
remain mandatory. Public tips expire to reference-only when their scan ages out.
The same scan cannot publish again even after settings/version changes. Oversized
digests retain fewer eligible items instead of dropping every tip. Uncertain Discord
delivery still blocks new publication until reconciled; no blind retries.

scripts/activate-auction-production.ts is a narrow, root-only, audited activation
operator for the reviewed Alliance source. Its default is read-only; --apply saves
the version-checked configuration and atomically updates the private worker cadence.
Restart only wow-forever-auction afterward. Verify with
scripts/verify-auction-production.ts --mode live. New client builds or source
identifiers need a separately reviewed configuration change, not implicit relabelling.

Horde is not enabled or inferred from Alliance prices. When accepted Horde scans
exist, add their exact market in /admin/auction, select the appropriate explicit
coverage, review its private output and then enable publication. Existing code
already keeps faction histories and publication budgets separate.

An isolated worker integration test exercises stale silence, new-upload posting,
duplicate detection across configuration edits, thin-supply rejection, rolling
limits, stale-tip edits and uncertain-delivery holds against real local PostgreSQL
and a loopback-only mock Discord API. Its preload refuses real bot credentials,
external network access and non-test/nonlocal databases.

Activated and verified October 1, 2026 at 14:42 UTC: configuration version 2,
live mode, uploaded-beta-market coverage, Alliance only, 60-second checks.
Website build .next-release-auction-auto-20261001-r2 is active. The existing
06:36:17 UTC scan remained ineligible and created one skipped record, no public
tip. Repeated production checks kept that count unchanged and confirmed fresh
worker health. No existing daily limit or data-quality threshold was lowered.
Verification passed: 176 community tests, including the complete worker flow;
typecheck/lint; production build; and desktop/mobile Playwright accessibility,
coverage controls and access-control checks. The first genuinely fresh public
tip is pending a qualifying player upload, not fabricated test data.

## Four-Hour Cadence And Repeat Protection

The owner requested a tip every four hours without repetitive advice. The approved
Alliance configuration uses minimumIntervalHours=4 and dailyLimit=6. These are
rolling limits per exact market, measured from confirmed publication time, not
from a scan's arrival or a scheduled wall-clock slot. The worker still checks every
60 seconds; it posts only when fresh, qualifying data and a useful new observation
are available. Four hours is a minimum gap, not a promise to post stale filler.

Published observations are persisted as structured item ID, signal and copper
price data in additive migration 012_auction_publication_history. For 24 hours,
the same item and signal are withheld unless the asking price has moved at least
10% from every covered occurrence of that signal. A new signal can qualify, but
cycling back to a recently covered signal cannot bypass repeat protection.
Uncovered items rank ahead of repeat items with material changes. Duplicate item
IDs within one upload are collapsed. An empty selection produces no public post.

Skipped, never-delivered jobs may be reconsidered on later checks, so an upload
that stays fresh across the four-hour boundary is not lost. Published, pending and
uncertain jobs cannot take this retry path. Older/equal source timestamps cannot
replace newer reported scans. Delivery uncertainty still requires reconciliation.

Post copy now uses short market-specific headings, Discord-relative scan times,
actual prices, stock and listings, and practical cautions matched to each signal.
It does not invent sales, demand, profits or beta coverage. No language-model key,
new dependency or paid service is needed. Any later language-model integration
must keep eligibility, prices, scope and publication controls deterministic and
retain a local template fallback; keys belong in a private server environment.

Apply the reviewed cadence with the narrow production operator:
`tsx scripts/activate-auction-production.ts --four-hour-tips` is read-only;
adding `--apply` writes the version-checked, audited configuration. It preserves
all history, supply, quality and freshness thresholds and the Alliance-only scope.
Older saved settings missing minimumIntervalHours default to 24 hours, preserving
their prior one-daily-tip behavior until explicitly changed in /admin/auction.

Deployed October 1, 2026: .next-release-auction-cadence-20261001-r1, configuration
version 3, live Alliance-only coverage, minimumIntervalHours=4 and dailyLimit=6.
Migration 012 was applied with the PostgreSQL schema owner; the restricted web
and worker roles were not granted new DDL or private-data permissions. Only the
website and auction worker were restarted; the bridge and both Trader services
remain unchanged. PM2 state was saved, and the private worker environment retained
its dedicated account ownership and 0600 permissions.

The production verifier confirmed a healthy worker, 60-second checks, the exact
Alliance dataset, and read-key isolation. The 06:36:17 UTC scan was still stale;
there were no public tips, pending deliveries or uncertain deliveries. Public
homepage/health returned 200; anonymous auction admin API returned 401 with
private/no-store/noindex. The next public report awaits genuinely eligible data.

Verification: all 122 tests outside the shared-channel suite passed, including 16
auction tests and the actual worker/loopback Discord integration; typecheck, lint,
local and production builds, formatting and desktop/mobile Playwright checks passed.
The full 180-test run was not green: 175 passed and five shared-channel tests
failed. Its retry stalled in that separate suite and was stopped; only the two
local fixtures created by the stopped retry were cleaned up. No bridge source or
production bridge process was changed to conceal or work around those failures.

## Upload Diagnosis And Faction Website Support

Verified October 1, 2026: the addon scan completed at 14:58:13 UTC, arrived at
15:42:18 UTC and was processed successfully with 2,443 items. There were five
accepted Alliance scans for build 70124 and no accepted Forever Horde scans.
The source model was still collecting; public tips require 12 recent half-hour
buckets, 24 hours of exact-market history and the existing signal/quality/supply
checks. At the 16:51 UTC production verification this scan also exceeded the
one-hour freshness window. No source upload, job or Discord delivery was forced.

Private diagnostics now explain the observation and time-spread bucket counts
when the entire source model is collecting. These messages do not create public
reports or lower eligibility thresholds. A recently received older scan is not
fresh data. Run a new full in-game AH scan, then `/reload` or log out while the
Companion runs; repeating an existing saved upload cannot extend its history.

Helper web release kfc-helper-faction-markets-20261001-r19 adds explicit Alliance
and Horde views, separate queries/cache selection, faction-preserving search and
links, and an honest empty Horde state. That view watches for its first accepted
scan. It also distinguishes scan age from upload age. Existing Collector and
ingestion contracts already support both factions; no schema changes were needed.
The Discord worker remains Alliance-only until a separate Horde market is reviewed
and enabled after actual Horde uploads, as described above.

Only the Helper web app and auction worker were restarted; the independent
ingestion, community web app and Discord bridge were left running. The worker
retained live mode, 60-second checks, a four-hour minimum gap, six daily reports
and read-key isolation. Verification passed: 17 auction unit/integration tests,
community typecheck and focused lint; 99 Trader web tests, typecheck/lint and
local/Linux builds; staged and live desktop/mobile browser checks with real
assets. No end-to-end real Horde upload was possible without an actual Horde scan.

## Six-Observation Pilot And First Public Report

The owner explicitly approved a six-observation pilot and a quality threshold of
5,000/10,000 after reviewing that six observations alone would still fail the
previous 7,500 quality threshold. Saved configuration version 5 uses
minimumObservations=6 and minimumQuality=5000. The 24-hour history requirement,
60-minute freshness window, listing/supply checks, exact Alliance scope, rolling
four-hour minimum gap, six-post daily cap, repeat suppression and uncertain-delivery
protection are unchanged. Defaults for new configurations remain conservative.

Both production edits were schema-validated, version-checked, protected by the
existing configuration advisory lock and attributed to the active owner in the
audit log. No pending or uncertain delivery was cleared. Only the auction worker
was restarted to check the approved configuration immediately; no application
build, ingestion restart or database migration was required.

The fresh Alliance scan at 2026-10-01T17:02:53Z contained 2,436 items and reached
six observations for its best-covered items. The first real report was published
at 17:14:08 UTC and confirmed by reading its thread and starter message from
Discord, checking guild, forum, bot identity and exact stored content:
[First beta market report](https://discord.com/channels/1554316932948172940/1555266579049091244/1555266579049091244).
No synthetic scan, forced eligibility or duplicate post was used. The next report
still requires fresh eligible data and at least four hours since this publication.

Verification: 18 auction unit/integration tests passed, including a new pilot
regression that retains quality, freshness, history, observation and supply gates;
focused test lint and production Discord read-back passed.

## DeepSeek Copywriting Layer

Auction eligibility, ranking, selected item IDs, exact prices, stock, timestamps,
scope, repeat suppression and publication cadence remain deterministic. The worker
optionally uses DeepSeek V4 Pro to write a short neutral introduction and varied
practical item notes. A compact shared renderer also improves local fallback copy,
removing the raw product/UNKNOWN header and repeated warnings while retaining
the actual source identifier, faction, build, coverage limitation and price evidence.
Early beta samples are explicitly provisional.

Only selected public item IDs, catalog names and signal labels go to DeepSeek.
No Discord messages, member identifiers, reports, character data, database credentials
or source read keys are sent. The API key is used only as an HTTPS authorization
header to the fixed official api.deepseek.com endpoint; redirects are rejected.
The provider has no tools or access to the game, database or Discord.

Structured JSON must contain exactly the selected item IDs in order. Generated prose
is length-limited and screened for numbers, currencies, links, mentions, formatting,
control characters, contradictory price directions and unsupported claims. Prices,
counts, percentages, timestamps, scope notices and links are rendered from verified
facts, never copied from the model. These checks constrain the model but are not a
proof of all natural-language semantics; review the private preview when activating
the provider or changing its prompt. Invalid or oversized output keeps local copy,
without dropping evidence or changing the selected items.

Paid requests run only after freshness, data quality, cooldown, duplicate and
uncertain-delivery checks pass. The request uses JSON mode, disabled thinking,
at most 1,000 output tokens, a ten-second timeout and a 32 KiB response cap. No
automatic provider retries are made. Missing keys, invalid settings, quota/auth
errors, outages and malformed responses fall back to local copy. Freshness and
configuration are rechecked before Discord delivery. The private run reason records
the copy provider or fallback reason without logging provider bodies or credentials.
Existing historical messages are not automatically rewritten or reposted.

### Key Setup

The key belongs only in `/home/wow-forever-discord/.env.auction` on the production
server, owned by foreverauction with mode 0600. Do not add it to the website's
`.env.local`, any NEXT_PUBLIC variable, PM2 environment declaration, source file,
commit or chat. Edit the existing environment; do not replace its other values.

```dotenv
DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=deepseek-v4-pro
```

Fill the API key value in the private editor. The model ID and request parameters
follow [DeepSeek's official chat API](https://api-docs.deepseek.com/api/create-chat-completion/).
`deepseek-flash` is also supported; the default remains `deepseek-v4-pro`.

```sh
cd /home/wow-forever-discord
sudoedit .env.auction
chown foreverauction:foreverauction .env.auction
chmod 0600 .env.auction
runuser -u foreverauction -- node_modules/.bin/tsx scripts/preview-auction-copy.ts --check-key
runuser -u foreverauction -- node_modules/.bin/tsx scripts/preview-auction-copy.ts
pm2 restart wow-forever-auction
pm2 save
```

The key check uses the provider's read-only models endpoint, prints only model
availability and sanitized status, and does not generate copy. The second command
previews the current accepted source, may incur a copy-generation charge when
eligible, and never posts or writes database state. It does not evaluate publication
cadence or repeat suppression; the actual worker still does. A stale scan cannot
be used to enable fresh public recommendations. To disable DeepSeek, blank/remove
its API key and restart only the auction worker.

Verification covers successful structured copy, evidence preservation, secret
suppression, invalid item IDs, malformed/truncated/oversized responses, unsupported
claims, missing keys, auth/quota/timeouts and model availability. The real local
PostgreSQL/loopback integration exercises model copy, no paid calls for held posts,
local fallback on provider failure, freshness expiry during generation, report
expiry and uncertain delivery. All 26 focused tests, typecheck, focused lint and
formatting passed. No new dependency, database migration or website build is needed.
The initial deployment used improved local copy without paid API requests, pending
the owner's key. Subsequent live activation is recorded below.

Deployed October 1, 2026 after all 25 pure auction/copy tests passed in the Linux
staging directory. Only `wow-forever-auction` was restarted; website, ingestion and
bridge process IDs remained unchanged. The private environment retained mode 0600
and foreverauction ownership. Read-only production checks confirmed live health,
source credential isolation and configuration version 5: six observations, quality
5,000, 24-hour history, 60-minute freshness, four-hour spacing and six daily posts.
The key check returned `not_configured`, as expected before owner setup. The latest
scan at 17:02:53 UTC was stale at deployment; the private preview withheld tips,
and no new public report or paid provider request was triggered.

### Live Provider Activation And Owner-Requested Rewrite

The owner subsequently supplied the key in the ignored local `.env.auction`.
A stray trailing non-ASCII character was removed only after the corrected token
passed DeepSeek's read-only authentication/model check. Both local and production
environment files have mode 0600; only the two DeepSeek settings were transferred
over SSH, preserving existing worker credentials. The key was not placed in PM2's
environment declaration, logged, committed or sent to Discord.

Real inference revealed that the original prompt could produce prose rejected by
the existing validator. The prompt now explicitly lists its restricted vocabulary,
avoids restating price direction and targets a 90-character introduction with
100-character item notes. The validator, deterministic evidence, fallback and
publication gates were not relaxed. Rejected drafts were not published.

At the owner's explicit request, the first beta report was edited in place at
18:35:06 UTC on October 1, 2026 using accepted DeepSeek copy. The exact original
source scan was still available; all five saved item IDs, signals, prices, baseline
percentages, quantities and listing counts were verified against both that source
and the original Discord content before generation. No newer source or artificial
freshness timestamp was substituted. The original scan time, publication time,
thread/message IDs, observations and stale status are unchanged. The expired-data
warning remains first, and the rewritten message is 1,733 characters.

Only the auction worker was stopped briefly to coordinate its advisory lock, then
restarted to load the private key and revised prompt. Discord identity/content
read-back and database verification confirmed the same message was updated, with
no duplicate or new recommendation. The prior content and a verification receipt
are private files under `/var/lib/wow-forever-auction/rewrites/`, not credentials or
raw rejected provider responses. Automatic historical rewriting remains disabled.

Verification: 25 focused auction/copy tests, typecheck, focused lint and formatting
passed, alongside real provider authentication, structured copy validation and
Discord/database read-back. A future scheduled DeepSeek report still requires a
fresh eligible upload, repeat checks and the original four-hour publication gap.
