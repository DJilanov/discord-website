# Forever Raid Manager: Private Pilot

## Current Hosted Release

As of 3 October 2026, the allowlisted private pilot is hosted at
https://www.wowforeverdiscord.online/raids using PM2 and the existing isolated
PostgreSQL role. Native Discord signup, class/spec roster views and member
controls are live. The owner confirmed hosted login and native controls work.
Only the real questing event and its related participant data were migrated;
synthetic browser/test fixtures remain local. Staff login remains separate,
and channel selection is checked server-side for Discord administrators only.

The detailed release and operational boundaries are in
[Native raid release](raid-native-release.md). The historical ledger below
describes the original local implementation, not the present deployment state.

The October 3 edition expansion is documented in [Forever and TBC event
pilot](raid-manager-tbc-pilot.md). TBC is available in the same private planner
with separate realms, source catalogs and exports. Older Forever-only statements
below describe the initial scope; the linked document defines current boundaries
and channel configuration.

Implementation date: 2 October 2026. Local implementation only; not deployed or
activated in the public Discord. This is the first working slice of the
[blueprint](forever-raid-manager-implementation-plan.md), not completion of M0-M5.

Next presentation/interaction work is specified in the
[Discord design and adoption plan](forever-raid-discord-experience-plan.md).
Its future milestones remain planned; implemented native features are recorded
in the release ledger linked above.

## Implemented

- Separate Discord member OAuth, identify-only scope, cookie namespace and secret.
  Staff credentials and `/admin` authorization remain separate. Membership can be
  revoked with the pilot allowlist, active flag or member session version.
- Live membership in KFC Guild or WoW Forever Discord is required at sign-in and
  each session validation. Non-members see both join choices; the WoW Forever
  invite remains admin-configured and the KFC invite is an environment setting.
  Discord errors deny access without pretending that someone left.
  Returning members can retry; leaving does not destroy their characters/rosters.
- Member auth responses are no-store/noindex/no-referrer. Development callback
  request logging is suppressed; provider errors log their error category,
  allowlisted error codes/OAuth errors and HTTP status, never messages, response
  bodies, login codes, tokens or profile payloads.
  The Discord provider pins its OAuth issuer to `https://discord.com`, matching
  the `iss` parameter in Discord's authorization callback. A foreign issuer is
  rejected before token exchange; CSRF, state and PKCE checks remain required.
- Private allowlisted event audiences captured at creation. Newly allowlisted
  users do not gain access to an existing event automatically.
- `/account/characters`, `/raids`, `/raids/new`, `/raids/[id]` and private APIs.
  Character profiles are self-declared, not verified ownership of game accounts.
- New character and Create event forms default to PvP, including character-form
  reset after a successful submission. PvE and RP remain selectable; existing
  characters/events and explicit API validation are unchanged.
- Event types: Raid, Dungeon, Battleground, World PVP, Questing, Social event and Other.
- Questing uses class/spec and combat-role signups, an editable five-player
  preset and a quest/zone field, without raid loot or reserve controls.
  Type-specific activity labels, editable capacity/role presets and event-list
  filtering share one validated definition. Dungeon defaults to five participants
  with one tank, one healer and three damage roles; these are organizer presets,
  not independently asserted game restrictions.
- Social/Other use the `participant` signup role and total capacity only, with no
  mandatory event spec, combat-role quotas or loot controls. A registered character
  matching region/faction/ruleset is still required. Combat activities continue to
  require a class-matching specialization and tank/healer/damage role.
  Reviewed catalogs/SR/HR remain raid-only; dungeon loot import is future work.
- Forever first/last names, apostrophes, hyphens and Unicode letters are accepted;
  existing single-name profiles remain readable. Names are NFC-normalized and
  extra spaces collapsed. Client/server validation shares one contract, with
  readable, focused field errors instead of exposing a regular expression.
  This follows Blizzard's [two-name structure](https://news.blizzard.com/en-us/article/24304161/create-a-name-of-your-own-in-wow-forever);
  it does not independently verify a game's naming-policy decision or ownership.
- Forever-only source-bundle validation, dry-run/staging CLI and owner/admin
  catalog review at `/admin/raids`. Catalog facts are immutable; events pin the
  selected version. Identical reimports return the same catalog.
- Event capacity, role caps, automatic/approval admission, bench, withdrawal and
  manual promotion. No automatic FIFO bench promotion is claimed.
- New profiles require a specialization valid for their Forever class. Existing
  profiles have no guessed specialization and can save a default on My characters.
  Each event has a separate explicit specialization choice, with an editable role
  suggested from the spec (hybrid builds are not forced into one role). Signup
  snapshots, roster labels, audit entries and locked JSON retain that event's spec;
  later profile changes cannot rewrite them. Changing an unlocked signup's
  character or spec clears its reserves and reapplies organizer approval. Legacy
  accepted signups must choose a spec before a new roster can be locked; existing
  immutable exports remain untouched.
- Illustrated native-radio class and spec selectors, expandable saved-character
  editing and matching character/role choices on signup. Spec portraits carry a
  smaller class badge in profiles and rosters. Local bitmap assets preserve the
  image security policy; unavailable spec artwork falls back to the class icon.
  Keyboard focus, selected checkmarks, reduced motion and mobile spec rows are
  supported without changing database or API contracts.
- Central European, New York and Sydney local scheduling, actual DST handling,
  explicit rejection of ambiguous/nonexistent times and no thirty-day limit.
- Visible native soft reserves, class eligibility, quotas, optional duplicates,
  hard reserves, independent deadlines and explicit policy acknowledgement.
- PostgreSQL event-row locks serialize roster/reserve mutations. Closing times
  are enforced against database time even with no scheduled worker running.
- Atomic locked snapshots with stable SHA-256 checksums and organizer-only
  native JSON downloads. Accepted players only; pending/bench players do not
  export. Locked data and audit entries are database-protected against changes.
  New snapshots retain event type and activity name. Existing v1 locked JSON and
  checksums remain unchanged; newly locked snapshots use `forever-event-roster.v2`
  or `forever-raid-loot.v2`, with the pinned composition rule revision and each
  accepted player's party and slot. The legacy `raidName` storage/API field holds
  the activity/destination name for non-raids to avoid a broad rename of
  already-used contracts.
- `/raid create`, `/raid status`, `/raid join`, `/raid leave`, `/raid reserves`
  handlers and manifest, sharing the website service. Responses are ephemeral.
  Join requires `accept_rules: true` and a registered matching character. Combat
  events require specialization/role; Social/Other can omit both and join as a
  participant. Optional Discord options never bypass combat validation.
  Re-register the pilot commands after deployment.
  Roster mutations and response receipts share one transaction. Replays return
  the stored response. No interaction tokens are persisted.
- Registration preserves the bridge command and refuses to bulk overwrite an
  unknown remote command. `bot:register -- --dry-run` performs no Discord calls.
- Private pages/APIs have no-store/noindex protections. The pilot layout does
  not include the public analytics tracker or event-specific SEO metadata.

Open event definitions and catalog selection are creator-editable on the preview.
Changes preserve participation and append before/after values and timestamps to
the bottom change history. Conflicting scope, capacity, HR and SR changes fail
atomically. Edited rules need renewed acknowledgement before locking and website
approval is cleared. Locked/cancelled events remain immutable. Signup character/spec
changes still clear reserves; concurrent policy/roster changes require refresh.
See [the member beta release](raid-native-release.md) for current access and setup.

## Configuration

The example is [`.env.raids.example`](../.env.raids.example). Set real values only
in the project's existing `.env.local` (the website's protected environment file
on production). Do not send the secret in chat or commit it.

```dotenv
FOREVER_RAIDS_ENABLED=false
FOREVER_RAIDS_PILOT_DISCORD_IDS=
COMMUNITY_DISCORD_CLIENT_ID=
COMMUNITY_DISCORD_CLIENT_SECRET=
COMMUNITY_AUTH_SECRET=
DISCORD_GUILD_ID=1554316932948172940
FOREVER_RAIDS_MEMBER_GUILD_IDS=1554316932948172940,1411533815356194968
DISCORD_BOT_TOKEN=
KFC_DISCORD_INVITE_URL=https://discord.gg/WGv4APs9DY
AUTH_TRUST_HOST=true
FOREVER_RAIDS_DISCORD_ENABLED=false
FOREVER_RAIDS_DISCORD_CHANNEL_ID=
FOREVER_RAIDS_PUBLIC_ORIGIN=http://127.0.0.1:19300
```

The client ID/secret come from the application's OAuth2 settings. The bot token
and application's public key are not substitutes. The member secret must be at
least 32 characters and different from `AUTH_SECRET`.

Register this redirect in the Discord Developer Portal:

```text
https://www.wowforeverdiscord.online/api/community/auth/callback/discord
```

For local testing, register the corresponding localhost redirect with the exact
local port. Production uses secure HttpOnly cookies; never activate it on HTTP.
Keep production disabled until the real OAuth exchange and approved pilot users
have been tested locally. The local test itself requires the flag enabled and a
nonempty allowlist. Server membership never grants staff/admin authorization.

### Real Discord Sign-In Setup

1. Open the application's
   [OAuth2 settings](https://discord.com/developers/applications/1554796912673169428/oauth2).
   Register the production callback above, plus both local callbacks below if
   testers may use either hostname. Discord requires the exact hostname/port.

   ```text
   http://localhost:19300/api/community/auth/callback/discord
   http://127.0.0.1:19300/api/community/auth/callback/discord
   ```

2. In `.env.local`, set `COMMUNITY_DISCORD_CLIENT_ID=1554796912673169428`
   and the OAuth2 **client secret**, not the bot token. Set
   `DISCORD_GUILD_ID=1554316932948172940` and the existing application's bot token
   as `DISCORD_BOT_TOKEN`. The website needs that token for read-only membership
   checks in both configured servers; the bot must be installed in both servers.
   Set `FOREVER_RAIDS_MEMBER_GUILD_IDS=1554316932948172940,1411533815356194968`
   and keep `KFC_DISCORD_INVITE_URL` on KFC's current permanent invitation.
   Worker-only environment files are not loaded by the website.
   Keep these values out of chat, logs and version control.
   Existing `KFCBOT_APPLICATION_ID`, `KFCBOT_GUILD_ID` and `KFCBOT_TOKEN` settings
   in the website environment are reused as fallbacks, so an existing local bot
   configuration does not need its token copied into a second variable. OAuth
   client and session secrets never fall back to bot/staff credentials.
3. Generate a separate member session secret with `openssl rand -hex 32` and
   put it in `COMMUNITY_AUTH_SECRET`. Do not reuse `AUTH_SECRET`.
4. Set `AUTH_TRUST_HOST=true`, `FOREVER_RAIDS_ENABLED=true` and a comma-separated
   `FOREVER_RAIDS_PILOT_DISCORD_IDS` containing only approved testers' real Discord
   IDs. This is still a private pilot, not general availability for every member.
   Keep the reverse proxy's trusted host headers restricted to the real website.
5. Run `npm run raids:auth:check`. It prints missing setting names, tester count
   and public callback URLs, never credentials or tester IDs. Exit code 1 means
   configuration/activation is incomplete; it is not a Discord API connectivity
   test. An `AUTH_URL`/`NEXTAUTH_URL` pointing at production overrides local
   callback origins and must not be used while testing localhost.
6. Restart `npm run dev` after changing the environment. Open `/raids` and
   complete Discord's normal authorization screen personally. The application
   asks only for `identify`; it does not request passwords, email, DMs, all-server
   lists, or permission to join servers automatically. OAuth access/refresh
   tokens are not stored in the database or member session.

Acceptance: sign in as an approved server member, create a character/event,
then repeat with an account outside the server. The outsider must see the join
dialog and no member account/session may be created. Test leave/rejoin with a
disposable member, active/session-version revocation, logout and staff isolation.
The live membership check uses `GET /guilds/{guildId}/members/{discordId}` with
the bot token. Only Discord's Unknown Member response (`10007`) means non-member;
unknown guilds, missing bot access, rate limits and network errors are unavailable
checks and fail closed. There is no stale allow-on-error membership cache.

Apply migrations `014` through `022` using the existing migration runner, then
apply `deploy/raids-grants.sql` with the database owner. No privileges are added
to the auction, listing or bridge workers. Website changes need only the existing
PM2 website process. The local Discord projection prototype has a separate
worker; a production PM2/grants package remains a launch gate.

Command registration is a separate explicit action after reviewing the dry run.
It has not been run against the live application. Low-volume direct ephemeral
commands still need real Discord acknowledgement-latency testing before launch.
The public deferred delivery/reconciliation worker remains a later milestone.

Migration `020` adds `eventType` with `raid` as the default for existing rows,
checks all six values, blocks non-raid catalogs/reserves and permits participant
signups. Social/Other role caps must remain zero in both API policy and SQL.
Apply it before serving the new generated Prisma client. Omitted types in older
requests retain raid behavior and their existing request fingerprints, so retries
do not create another event or invalidate an already-issued submission key.

Migration `021` extends the event-type constraint to accept `questing` without
changing existing events or the applied `020` migration. Apply it before creating
Questing events; the non-raid loot restrictions remain unchanged.

Migration `022` adds the durable Discord projection and delivery lease. Event
revisions enqueue updates; material definition changes revoke publication
approval, but roster changes retain it. Existing applied migrations are unchanged.

## Local Discord Projection And Approval

Implemented on 3 October 2026, as a private-channel prototype:

- Compact bot-authored embed with localized Discord timestamps, activity,
  class/spec roster, role counts, bench, pending admissions and actual loot state.
- Website link buttons for signup/management and, when enabled, soft reserves.
  These are not native Discord character/spec picker buttons or a calendar.
- A durable queue is inserted with configured new events. The organizer can
  queue an older event using its Post to Discord action. Discord failures never
  roll back an already-created event or signup.
- One post per event; later roster/state changes edit it. A lost creation
  response is reconciled against bot-authored posts, never blindly reposted.
  If no unique match is in the latest 100 messages, staff review is required.
- Periodic checks detect removed posts. They are hidden from discovery and are
  not automatically recreated. Notifications and mentions are not enabled.
- The worker permits only the configured bot, guild and private text channel,
  checks the organizer is still a guild member, and refuses extra channel
  viewers outside the pilot allowlist. Public LFG forums remain untouched.
- `/approve post:<Discord message link>` and the message-context action
  **Apps > Approve event** require a human Discord Administrator at runtime.
  A delivered, current event post must match the exact configured destination.
  Approval is audited and replay-safe; a host is not privileged just by hosting.
- Approved event metadata/counts appear in a separate `/lfg` section (up to 50
  upcoming/in-progress events with existing filters). Character snapshots, user
  IDs and soft reserves remain private. Access to signup pages still requires
  server membership and the private pilot allowlist.
- Approval commands affect native event posts only; they do not replace the
  protected Verified-tag workflow for existing guild/group listing submissions.

Local configuration enables the private `raid-manager-test` text channel. The
browser-created event was sent there; browser links use `http://127.0.0.1:19300`
and only work on the machine running the app. No production command manifest or
interaction endpoint was changed. Native `/approve` cannot be used live until
the signed handler is deployed and its reviewed commands are registered.

Run the configured local worker:

```sh
npm run raids:discord:worker
```

For one delivery pass, use `npm run raids:discord:worker -- --once`. Keep the
worker separate from production auction, listing and shared-channel workers.
Do not point the live Discord application's interaction endpoint at localhost,
replace it with a tunnel, or bulk-register the prototype commands without a
separate deployment review. The public native-picker/forum/calendar release
needs its own acceptance tests and least-privilege worker account.

Protocol references: [Discord message API](https://docs.discord.com/developers/resources/message),
[Discord application commands](https://docs.discord.com/developers/interactions/application-commands).

Rollback is disabling `FOREVER_RAIDS_ENABLED` and restarting the website. Do not
drop tables, delete snapshots or modify already-applied SQL migrations.

## Source Bundle Import

Only authorized, structured fact bundles are supported now. The implemented
contract is `catalogBundleSchema` in `lib/raids/catalog.ts`, with format
`forever-wowhead-loot-candidates.v1`. It contains:

- Fixed `game: "forever"`, raid name and exact English Forever guide URL.
- Capture date, real source patch/client build or explicit `null`, actual raid
  availability, partial/complete coverage and source-authorization attestation.
- Unique integer item IDs matching each item's Forever Wowhead URL, item name,
  loot source, boss/trash/quest/token kind, class restrictions and evidence type.
- `source_reported` or `client_observed` evidence. The latter requires the real
  client build. Admin review never silently upgrades the evidence type.

```sh
npm run raids:loot:import -- /path/to/authorized-bundle.json
npm run raids:loot:import -- /path/to/authorized-bundle.json --stage STAFF_ID
```

Dry run validates facts and produces a checksum/warnings, without staging.
Staging requires an active owner/admin staff ID. Publish/reject through the admin
review screen; unknown/unreleased raid availability cannot be published. No real
Forever loot catalog is seeded. Synthetic datasets exist only in isolated tests.

**Not implemented:** live Wowhead crawling, HTML/JavaScript extraction, source
capture storage, completeness discovery or detailed version-diff review. These
remain in the [import plan](forever-wowhead-loot-import-plan.md). A real authorized
source fixture and verified page contract are required before implementing that
adapter. No guessed Wowhead selectors, fabricated drops or foreign-edition
fallbacks are shipped. An English `/forever/` URL alone is not release evidence.

## Verification

```sh
npm run db:generate
npm run db:migrate
npm run typecheck
npm run lint
npm test
npm run test:raids:db
npm run test:raids:e2e
npm run build
```

Database integration tests require localhost PostgreSQL on port `55432`, create a
temporary schema and discard that schema afterward. They exercise simultaneous
last-seat joins, concurrent reserves, independent deadlines, role/HR/class/quota
rules, duplicate policy, stale writes, stored interaction replays, unchanged
catalog reimports, audience revocation and immutable snapshots/audits.

The initial local slice passed 213 standard tests, seven PostgreSQL integration
checks, three raid browser flows, typecheck, lint and production build. The
existing website/auction regressions passed; all five bridge browser cases also
passed with their required test-only `BRIDGE_INTERACTIONS_ENABLED=true` setting.
That flag was not changed in any saved environment or on production. The new
database tests also force receipt insertion to fail and verify the signup and
audit writes roll back together. Migrations were rerun without changes.

Dedicated browser tests start their own server on `19306` with an ephemeral test
secret and synthetic allowlist. They test member/staff isolation, anonymous and
cross-origin rejection, the complete web flow and desktop/mobile accessibility.
They do not contact Discord. Added OAuth protocol tests run the actual Auth.js
Discord provider against a test-only HTTP transport: CSRF, PKCE/state, token and
profile exchange, replay/external-redirect rejection, membership denial/errors,
leave/rejoin, pilot/account revocation and logout. Browser tests also verify the
Discord redirect/callback URL and the accessible non-member dialog at desktop,
390px and 360px widths. Membership responses are injected only through a guarded
test-process preload; there is no website environment flag to bypass membership.
This does not replace the live credential/authorization test above. Their local
fixture teardown temporarily disables append-only triggers inside one database
transaction, removes only fixture-owned records, and restores the triggers.
Both setup and teardown refuse nonlocal databases. This is not a production
maintenance procedure.

Auth follow-up verification: 234 standard checks (including 21 OAuth/membership
checks), seven PostgreSQL checks and five browser flows passed. Typecheck/lint
and the production build were verified.

Subsequent local setup verified registered callbacks for localhost, 127.0.0.1
and the production HTTPS URL, the client credentials, bot identity and approved
member's guild membership. The tester completed normal Discord authorization
personally, reached Events and created an active local member record. Secrets
remain in the ignored environment file. Production credentials/activation were
not changed, and a real outsider/leave-rejoin acceptance test remains pending.

Character/screen follow-up: 236 standard checks, seven PostgreSQL checks and ten
browser cases passed, alongside lint and the production build. The browser sweep
discovers all configured public pages and local published guides/guild profiles,
visits every admin section and editor screens, and checks 1440/768/390/360px
layouts with accessibility scans and image loading. Raid cases exercise anonymous
access, non-members, OAuth routing, field errors, network/HTML-response retries,
duplicate characters, no matching character, future scheduling, regional times,
approval, withdrawal, cancellation, reserves, bench, locking/export, catalog
staging/review, moderator restrictions, session revocation and logout. The exact
reported full name is covered through signup and locked export; integration tests
also use normalized full names and a full-name native Discord signup.
The character test includes a maximum-length name to prevent mobile list overflow.
The fifteen existing website browser cases also passed: private report/evidence
access, responsive branding/assets, SEO/share metadata, guild and EU/NA group
submission, PvP routing, Discord Verified publication, staff restrictions and
guide editing. Bot tokens were blanked only in that test process; listing
delivery/verification used its local synthetic transport, not public Discord.

Specialization follow-up: 237 standard checks, eight PostgreSQL checks and ten
browser cases passed, with focused reruns for spec changes and character-update
authorization. Lint, TypeScript and the production build passed. Tests cover all
nine class/spec lists, nullable legacy profiles, cross-class rejection in both
the API and database, owner-only updates, per-event snapshots, reserve resets,
approval resets, native Discord signup/replay and locked-export stability.
Desktop/mobile screenshots were reviewed. Migration `019` was applied locally;
production deployment and live Discord command registration were not performed.

Artwork follow-up: 239 standard checks, eight PostgreSQL checks and eleven
browser cases passed, alongside lint, TypeScript and the production build.
Character and signup controls were checked at 1440/768/390/360/320px, with
desktop/mobile screenshot review and accessibility scans. Regression coverage
includes all nine class/spec mappings, native arrow-key selection, missing-image
fallback, required spec selection, save/cancel focus restoration, failed-save
retry, disabled controls during saving and reduced-motion hover behavior.
Artwork is documented in `public/images/raids/README.md`. This visual update
remains local-only; no production deployment or live Discord changes were made.

Event-type follow-up: migration `020` was applied locally. Thirteen focused
unit checks and the initial nine PostgreSQL checks passed, covering all six
types, participant capacity, combat-only spec requirements, API/SQL loot gates,
legacy retry fingerprints and immutable type-aware exports. TypeScript and lint
passed. Further synthetic Discord coverage and browser tests for all six forms,
signups and event-list filtering are implemented but require a rerun: the isolated
PostgreSQL/OrbStack service stopped responding. The full standard suite timed out
on a database-backed auction test, browser startup could not pass its health check,
and the production build compiled/typechecked but failed on database-dependent
prerendering. These are pending checks, not claimed successes. Production and live
Discord command registration remain unchanged.

3 October recovery: local PostgreSQL was restarted without replacing its volume;
migrations `021` and `022` were applied. The all-seven-type browser case passed,
including Questing creation, signup, filtering, accessibility and five viewport
widths. The event-filter label was corrected after its first browser regression.
The new Discord delivery-status case also passed with desktop/mobile screenshots.
Sixteen focused unit tests and ten PostgreSQL checks passed, including concurrent
delivery, lost-response reconciliation, approval permissions/replays, publication
filtering, approval invalidation and deleted-post recovery. Live delivery was
confirmed only in the private test channel; native commands remain undeployed.
The complete standard suite subsequently passed (244 tests), as did lint,
TypeScript and an isolated optimized Next.js production build. No production
release or live command registration was performed.

## Remaining Launch Gates

1. Configure production member OAuth after local acceptance, finish real
   outsider/leave-rejoin tests and verify pilot channel access and the approved
   private Discord pilot channels.
2. Extend the private text-channel projection to reviewed LFG forum destinations,
   native character/spec signup components, deferred interactions and the
   production worker/grants package. Do not advertise link buttons as native signup.
3. Deploy/register the admin approval handlers and test them with real authorized
   and unauthorized Discord accounts. Native calendar creation after review and
   removing/overriding approval remain separate work. Preserve listing verification.
4. Implement catalog diffs/retirement, supported authorized Wowhead extraction,
   and test a real available Forever loot dataset.
5. Add reasoned immutable event/policy revisions, hidden reserves if desired,
   co-organizers and acknowledged policy changes.
6. Validate the actual Forever loot-master addon handoff. Native JSON is not a
   claim of compatibility with Softres/Gargul/Raid-Helper import formats.
7. Add reminders, native Discord calendar, retention/erasure procedures,
   monitoring and scoped worker grants before a public rollout.

Current boundary: private organizer/member web pilot plus tested command handlers.
It is not yet a public Raid-Helper/Softres replacement, and M3-M5 remain planned.
