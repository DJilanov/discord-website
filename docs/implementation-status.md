# Implementation Status

## Research and Data Feedback Loop

October 4: the public `/research` library now turns Helper evidence into seven stable,
server-rendered reports covering build changes, economy signals, profession coverage, aggregate
guild demand, discovery coverage, world data, and public datasets. It validates the versioned Helper
contract and displays explicit evidence gaps when the feed, history, or confirmation level is not
enough. Sitewide navigation, footer links, metadata, Article/Dataset structure, and sitemap entries
make the reports discoverable without duplicating Helper entity pages.

Anonymous report feedback enters a staff queue at `/admin/research`; no contact, Discord, or
character identity is collected. Staff status changes are audited. First-party analytics distinguish
research actions, dataset downloads, and feedback submissions while continuing to respect DNT/GPC.
Recruiting demand uses approved listings, shows freshness and sample size, and suppresses cells below
three. Migration `034_research_feedback` is applied in production and build directory
`.next-release-research-20261004-r2` is active. The pre-migration backup restored successfully in an
isolated scratch database. Live checks covered every report, sitemap/robots, Article/Dataset
metadata, and a real feedback submission; the exact verification row was removed afterward. See
[research-feedback-loop.md](research-feedback-loop.md).

## Dual-Community Raid Access Deployed

October 4: the production raid-manager access gate now accepts a current member of
either KFC Guild or WoW Forever Discord. Both guild lookups run through the same
read-only bot boundary; any confirmed membership grants access, every guild must
confirm absence before the UI calls someone a non-member, and a partial Discord
failure remains a fail-closed availability error. Existing disabled-account,
session-revocation and private-event audience checks are unchanged.

The denied state now explains that either community is sufficient and offers a
separate join action for each server. OAuth can safely return to a specific
`/raids/[id]/reserves` page instead of falling back to the event list. Release
`.next-release-party-roster-20261004-r6` is active; its production auth check
confirms both eligible server IDs and no new Discord installation was required.

## Forever Raid Manager Private Pilot

October 2 auth follow-up: Discord-only member sign-in now checks actual server
membership at login and each session validation, with a join-server dialog for
outsiders and fail-closed handling of Discord outages. Existing protected bot
configuration is reused. Local OAuth/client and separate session secrets are
configured. Read-only Discord checks confirmed the intended app, guild and
approved tester, and all three local/production callback URLs are registered.
The tester completed real Discord authorization and reached Events; the active
member record was verified locally. Production member OAuth remains disabled.
Staff password authorization remains separate. Nothing was deployed or activated.

October 2 character follow-up: Forever first/last names now work across member
forms, database snapshots and native command tests. Extra spaces and Unicode
are normalized, invalid names get accessible field feedback, and failed requests
can be retried without losing the form. The responsive sweep covers public pages,
published guides, every admin section and the raid workflows. Keyboard scrolling
was corrected for mobile tables/code blocks, and repeated breadcrumb URLs no
longer produce duplicate React keys. Existing production configuration is unchanged.

October 2: the [first working private slice](forever-raid-manager-private-pilot.md)
now implements isolated member OAuth, private event/character screens and APIs,
transactional roster/bench/SR rules, independent deadlines, policy acknowledgement,
immutable catalog review and locked native exports, plus ephemeral raid-command
handlers. Public activation is off. Production OAuth, compact Discord delivery,
Verified publication, supported Wowhead extraction and Forever addon handoff
remain launch gates. M0-M2 are partial; M3-M5 are not implemented.

October 2: the [native raid-manager blueprint](forever-raid-manager-implementation-plan.md)
defines a Forever-only event/roster/soft-reserve product inside WoWForeverBot and
the website. It covers isolated member identity, reviewed build-pinned items,
concurrent capacity/reserve handling, loot-policy locks and exports, dynamic
Discord verification, human Verified publication, calendar/reminder delivery,
mobile/admin UX, M0-M5 milestones and private-pilot/rollback gates. No other WoW
edition or item fallback is supported by the proposed implementation. This is
a blueprint with a local private pilot: no new commands, schema, catalog or
production service has been deployed or activated.

The [Wowhead raid-loot import plan](forever-wowhead-loot-import-plan.md) extends
the catalog work with scoped collection/offline parsing, source-access checks,
Forever-only validation, item/boss/trash/token mapping, staged diffs and immutable
reviewed publication. Wowhead's currently incomplete raid rewards, inherited
comments and source-reported versus client-observed evidence are explicit gates.
No crawling, item import, scheduler or catalog publication has been activated.

## Group-Finding Channel Release

The [October 1 native group release](discord-group-channel-release.md) is live:
four PvE/PvP forums, six standardized guild/run forums, improved recurring
leveling, matching faction ordering, direct onboarding routes and two pinned
current posting guides. Four original text chats are preserved read-only;
all old forum/tag IDs and onboarding role mappings/traps remain. Three product
entries now credit Open source contributors. All 60 focused tests and independent
live verification passed; final apply made zero changes. The inventory retains
all 65 previous entries plus four new forums. Structured signup/reminder bot,
native-client testing, staffing and website-copy refresh remain separate work.

## Non-LFG Channel Release

The [October 1 native Discord release](discord-channel-experience-release.md)
is live: newcomer names/defaults, tool directory/support forums, three real
product entries, class/social/trade guidance, safety process tags and preserved
read-only archives. Independent member/access checks and an idempotent rerun
passed. No messages/channels or original roles/questions were deleted or replaced.
The prior leveling archive was already missing before this release and returned
404; native Server Guide resource setup, staffing and website-copy refresh remain
explicit follow-ups. Faction LFG conversion is now covered by the later release
above; structured bot work remains separate.

## Channel Experience Plan

The [October 1 channel plan](discord-channel-ux-plan.md) covers all 62 channels
and categories returned by a fresh read-only audit. It defines four faction LFG
forums with clear session times and group status, consistent recruitment/PUG
settings, newcomer routing, preserved archives, addon forums and later bot work.
Forum settings, member permissions, command registration and event metadata were
inspected; no live configuration or production services changed during this work.
The planning audit is historical; the native non-LFG release above records the
subsequent implementation.

## Group Leveling Forum

WoW Forever [group-leveling is now a native forum](group-leveling-forum.md), with
separate group posts, region/faction/status tags and posting guidelines. Live
configuration and member create/reply permissions were verified. The old text
channel was retained as `group-leveling-archive` with unchanged permissions, and
its incompatible text relay was retired through audited controls. KFC channels
are unchanged. No posts were published; the new forum is not bridged to KFC.
The October 1 release found the earlier text archive already missing (HTTP 404);
it did not delete or recreate it. See the release's archive discrepancy.

## Historical Import Withdrawn

The owner rejected the historical bot-copy format and requested deletion. Both
[history batches](shared-channels-history.md) were rolled back using audited
controls, and the runtime is `cleanup_only` with publication disabled. The 95
managed copies reached removed/suppressed states. Read-only Discord checks
confirmed all 95 copies absent and all 95 originals present with original authors.
Historical grants are withdrawn and general live participation
remains off. The history-capable release `history-e4fe94f8` remains installed;
this follow-up changes operational state, not application code. Earlier test
and import-start snapshots are superseded.

## Test Account Corrected

The signed `/bridge join` request at 18:31 UTC came from `djilanov`, not the
server-owner account `Psyrogue` that the operator had incorrectly selected.
Targeted bot member lookups confirmed `djilanov` in both servers. The two pairs
were paused, revalidated and restarted through audited controls with only the
correct tester allowlisted, expiring at 19:34:23 UTC / 22:34:23 Sofia on September 30. No consent was fabricated, public disclosure restored or general sharing
enabled. This was a configuration correction; the deployed application is unchanged.

## Public Bridge Disclosure Removed

The owner requested removal of standalone notices and channel-topic disclosures.
The [removal follow-up](shared-channels-disclosure-removal.md) replaces those gates
with the existing private `/bridge join` confirmation. Staff approvals, consent,
attribution and permission checks remain. Working-tree release
`no-notices-ec0b4b88` is deployed, and all four bot announcements and exact topic
suffixes were removed without changing permissions or unrelated text. Both pairs
passed actual Discord validation with no disclosures and resumed owner-only tests
until 19:28:56 UTC / 22:28:56 Sofia on September 30; general sharing remains closed.
Verification passed 112 tests, five focused browser tests, lint, typecheck, Linux
builds, backup restoration and live mobile/desktop checks. KFC/Helper services were
untouched. Earlier notice requirements below are historical and superseded.

## Restricted Bridge Test

The [restricted test follow-up](shared-channels-test-pilot.md) adds a one-hour,
explicit-opt-in, allowlisted and manually reviewed stage before general activation.
The owner deleted the initial notices because inactive announcements looked like
spam; Discord validation correctly paused both pairs. Release `0cd1af4` is now
deployed to the website and worker with migration 007. Four concise replacement
notices and updated topics were verified at startup, without permission changes.
Both pairs entered the owner-only pilot at 18:03 UTC on September 30, expiring at
19:03 UTC / 22:03 Sofia time. The Gateway is ready, with no failed or uncertain
jobs; general publication remains closed. No human opt-ins, relayed conversations
or successful live lifecycle test have been fabricated.
Local checks passed 111 tests (46 bridge tests), all 32 browser tests, lint,
typecheck and builds. Linux builds, live public/mobile checks and post-migration
backup restoration passed. KFC/Helper processes were untouched. The owner account
was identified through the bot, not Chrome tokens. Earlier entries below are
historical snapshots superseded by this release.

## Existing-Channel Follow-Up

The owner replaced the dedicated-channel plan with two existing KFC discussions:
discussion pairs with WoW Forever general, and leveling with a new group-leveling
channel. Who-plays-what was explicitly withdrawn; guild-invite requests remain
unshared. Channel topics and the leveling destination are prepared without widening
existing permissions or posting messages. See the [pair mapping and owner notice](shared-channels-existing-chats.md).
Commit `fb1ff2b` is deployed to the website and worker. Both exact pairs are saved as
manual-review drafts, the worker is healthy in cleanup-only mode, and there are
zero participants or relayed messages. Verification passed 104 unit/integration
tests, 31 browser tests, lint, typecheck, local/Linux builds, backup restoration and
live desktop/mobile/public-route checks. Owner notices, governance approvals and
truthful live lifecycle sign-off remain pending, along with the earlier off-host
recovery and external-alerting gates. Publication remains off.

## Shared-Channel Infrastructure Deployed

September 30: the [implementation and rollout runbook](shared-channels-release.md)
adds the independent worker, bridge-only persistence, consent/withdrawal commands,
two-way delivery lifecycle, moderation and recovery, bot policies and the responsive
`/admin/discord` workspace. Commit `d721bcd` is deployed; the independent PM2 worker
is healthy in cleanup-only mode. The signed interaction endpoint and `/bridge`
commands in both servers are configured. The initial dedicated-channel choice was
replaced by the existing-channel follow-up above. No pair or member participation
is active. Notices, permission review, moderator coverage, live
opted-in lifecycle tests, off-host secret recovery and external alerting remain
activation gates. Automated checks, Linux build/backup restore and live responsive
site verification passed. No conversations have been relayed.

## Two-Way Shared Channels Plan

September 30: WoWForeverBot installation and configuration audits succeeded in
KFC Global Pugs and WoW Forever Discord. The owner selected two-way conversation,
superseding the earlier one-way idea. The [implementation plan](shared-channels-implementation-plan.md)
covers selected opt-in channels, mapped replies, edits/removals, durable delivery,
moderation, `/admin/discord`, a separate PM2 worker/runtime, bounded retention and
recovery. Exact server findings remain private. No messages were read or copied;
no bridge code, schema, commands, permission changes or deployment were activated
by the audit or planning work. Pilot endpoints and governance remain release gates.

## Community Tools Released

September 30: the [tools/content release](community-tools-release.md), commit
`3f0e061`, is live. It adds a
WoW Trader hub and introduction, five tester assignments and report downloads,
two original guides, corrected preparation articles, and explicit guild/group
character rulesets. Historical listing fields and editor revisions are preserved.
The owner clarified that market freshness depends on voluntary app uploads; the
new copy distinguishes scan age from history coverage. The additive migration
and guarded publication are complete in production: four guides created, five
refreshed, one unchanged, ten published in total. Local verification passed 65
unit/integration tests and 27 browser tests; the Linux build and live checks passed
for 34 sitemap routes, the new mobile/desktop screens and downloads. Existing
editor metadata and KFC/Helper processes were preserved. Discord publishing,
bot activation, Helper crawler changes and raid-addon tests remain separate.

## Content and Tools Plan

September 30: the [content, tools and tester program](content-tools-and-community-plan.md) is prepared after reviewing the community and WoW Trader repositories, public endpoints and primary platform guidance. It accepts the owner's confirmation that WoW Trader is Forever-tested, other guild addons await raid testing, and testers are already invited. It prioritizes a tool hub, original reviewed guides, tester assignments and B0/B1 bot services; Companion distribution and ingestion retention remain separate gates. Live Helper robots output blocks OAI-SearchBot while the community permits it, so a separate search-only policy review is planned. No articles, crawler settings, bot services or production releases were changed by this planning work.

## Raid Party Composition

October 4: the private raid manager now persists five-player party placement,
supports organizer drag/drop plus accessible group selectors, explains party-local
effect coverage, and ranks both available signups and recruitment targets. TBC and
Forever use separate pinned composition revisions; talent/setup-dependent and
provisional Forever effects are never labeled as confirmed. New v2 lock snapshots
include party positions while existing v1 snapshots remain immutable. See the
[party roster release](raid-party-roster-release.md) for the data contract,
deployment and verification boundary. The production event page gives its creator
a direct **Roster builder** action on desktop and mobile.

## Channel Cleanup Partially Applied

September 30: after the owner's credential/permission confirmation, the separate [channel cleanup command](discord-channel-cleanup.md) applied and verified 28 topic updates and all six recruitment/PUG forum tag sets. Ten topic updates remain blocked by channel-level Manage Channels denies. The batch was narrowed to accessible targets without disabling permission, identity, fixed-content or stale-state checks. A fresh audit confirmed that roles, onboarding, guild settings, protected channel fields and all 30 unselected channels/categories were unchanged. Names, ordering, permissions, posting limits, intentional BOT traps and member-readable report forums are preserved. All 14 focused cleanup tests passed before the live run. No messages were posted; the owner will publish them personally. Native Discord rendering remains an owner check. This is a local operator tool, not a website deployment.

## Community Operations Research

September 30: the [community excellence plan](community-excellence-plan.md) is prepared from the live configuration audit, public competitor pages and official platform documentation. It covers onboarding, forums, staffing, hosted activities, governance, reporting, bot/addon sequencing, growth and verification. It preserves the owner's intentional privileged staff role, BOT onboarding choices and member-readable report forums. Competitor conversations and the owner's personal Discord session were not accessed. No Discord configuration changes, outreach, commit or deployment are part of this planning work.

The follow-up covers public metadata for all four owner-selected comparison servers and a capacity model informed by the owner's reported 560 guild raids per year. Its realm/ruleset release prerequisite was addressed for guides, templates and guild/group forms by the community tools release above. Report/alert identity and legacy addon full-name matching remain separate compatibility gates; they are not claimed as completed.

## WoWForeverBot Read-Only Preparation

September 30: [WoWForeverBot setup and configuration audit](kfcbot-setup.md) are implemented locally with separate credentials, a View Channels install link, GET-only identity/configuration collection, permission/onboarding review and private local reports. The owner-created application is installed and authenticated; live read-only audits return 58 channels/categories and 21 roles. Configuration findings, plans and write journals remain in gitignored local storage. The owner confirmed token rotation before the separate cleanup batch above; bot-policy publication remains outstanding. The audit itself remains GET-only. No website deployment is part of the cleanup, and existing website slash commands remain separate and inactive.

## Growth and Bot Preparation

September 30: the guide improvements, two preparation articles, copyable/downloadable templates and exact-version guarded publisher shipped with the community tools release after ruleset corrections. The [preparation handoff](growth-preparation.md) retains the earlier checks and publication history. The expanded [website/Discord blueprint](web-discord-integration-blueprint.md) defines the next bot task, later member ownership/signups and privacy-preserving synchronization. Outreach drafts are prepared; external requests and account actions are not claimed as complete.

## Discord and Editorial Release

The expanded Discord page, six evergreen guides, approved screenshot editor, article-specific social metadata, regional activity, source/session conversion reporting and search-admin workflow are live. Public Discord forums are explicitly distinguished from the website's private case system. Google ownership is owner-confirmed; sitemap inspection and Bing ownership remain to be confirmed. See [the editorial release](editorial-release.md) for 24 unit/integration tests, 19 browser tests, final live verification and the cold-image memory correction, and [search operations](search-operations.md) for remaining account/community actions.

## Visual Redesign Released

The September 29 redesign is live: official Forever desktop/portrait artwork, a prominent standalone community identity, responsive navigation, editorial guides with native contents links, real approved guild/group previews, coherent interior pages, and a matching social image. Existing invitations, administration, privacy, and moderation boundaries are preserved. See [the design release report](design-release.md) for browser coverage, performance measurements, deployment, and rollback details.

Redesign verification passed 16 unit/integration tests, 14 Playwright tests, lint, strict typecheck, and the final Linux production build. The nine-size homepage matrix and Chromium/WebKit page checks supplement the original launch verification below. Physical-device and field Core Web Vitals verification remain outside this release's evidence.

## Delivered Website

- Separate WoW Forever identity and official game logo with visible unofficial-community disclosure. Organizer history is limited to About and Privacy.
- Public homepage, Discord invitation and live counts, EU/NA and faction/playstyle pages, searchable guild directory and guild profiles, ruleset-aware group listings, ten published guides, tools and tester resources, FAQ, policies, transparency, and staff sign-in.
- Server-rendered public content, canonical metadata, social share image, Article/Organization/WebSite/Breadcrumb structured data, sitemap, crawler policies, and a factual llms.txt.
- Independent admin with owner/admin/moderator/editor permissions, settings, invitations, guide preview/publishing, guild/group approval, reports/evidence, appeals, alerts, releases, analytics/CSV, staff access, and audits.
- Bounded, validated public forms; self-hosted anti-spam checks; private image evidence with metadata removal; receipt keys hashed at rest; two-reviewer publication; stale-write protection; independent appeal handling; expiry-aware public exports.
- PM2/Nginx/local PostgreSQL deployment configuration, dedicated OS/database users, retention jobs, private storage, health endpoint, and local backups.

## Verification

Automated unit/integration tests cover invite spoofing, source attribution, private analytics exclusions, CSV formula escaping, safe Lua serialization, archive traversal, Discord signature verification, moderation transitions, bounded request bodies, challenge replays, evidence submission, two-person publication, stale edits, appeal suspension, and independent appeal decisions.

Playwright covers five viewport widths (320, 390, 768, 1440, 1920), mobile navigation, hero image rendering, horizontal overflow, guild submission and approval, staff roles, private API denial, canonical metadata, the share image, Discord redirection, and WCAG A/AA axe scans on eleven public screens and mobile/desktop admin settings. Screenshots are in ignored `artifacts/`.

The build, strict typecheck, lint, dependency audit, and pure Lua checks are separate release gates. These checks reduce risk; they do not prove perfection or replace human moderation and in-game addon testing.

Launch verification on September 29, 2026: 13 unit/integration tests, 10 Playwright tests, Lua assertions, typecheck, lint, local and Linux production builds passed. Dependency audit reported zero vulnerabilities. Live browser checks passed for desktop/mobile assets, forms, metadata, HTTPS redirects, public sitemap routes and access denial. The local server backup was restored into an isolated scratch database successfully; the scratch database was removed. KFC remained online and its tables were not altered by the new site's migration.

## Deliberately Not Activated

- **Discord conversation relaying and other bot features:** the shared-channel worker, signed endpoint and scoped `/bridge` commands are deployed as described above, but no pair is active. Legacy role assignment, eight-command registration and moderation notifications remain separate and inactive. The earlier channel topic/tag cleanup did not activate them.
- **ForeverGuard publication:** real source and draft ZIP exist. In-game beta client compatibility is not verified, so the release stays unpublished pending playtesting.
- **Public safety alerts:** launch database contains no fabricated reports, evidence, accusations, or player entries. Owners must staff the process with independent reviewers before publishing anything.
- **Rankings:** first place in Google or AI recommendations cannot be guaranteed. Google ownership is owner-confirmed. Sitemap submission/inspection, Bing ownership, editorial maintenance, real community participation, genuine links, and query monitoring require ongoing owner work.
- **Off-host disaster recovery and monitoring:** local backup automation is included. An encrypted off-host destination and external alerting service still need configuration.

## Growth Work After Launch

1. Select the verified WoW Forever property in Google Search Console, verify/import it in Bing Webmaster Tools, submit the sitemap, and inspect the homepage, Discord page, and onboarding guide. Do not submit private report pages.
2. Match Discord's public name, description, icon, and pinned website link to this site. Invite other guild leaders, not only existing KFC members.
3. Publish one genuinely useful, beta-verified guide at a time, with an author, evidence, and update date. Do not manufacture realm or class guides from unverified assumptions.
4. Seek permission for useful community introductions on Blizzard forums, relevant Reddit threads, and Discord directories. Avoid purchased links, repetitive promotional posts, and false endorsement claims.
5. Review organic impressions, query positions, landing-page sessions, and Discord clicks weekly. Compare Search Console clicks with first-party traffic; clicks and sessions are not exact equivalents.
6. Activate the bot after a least-privilege Discord application is configured; independently test its role hierarchy and moderation webhook. Playtest the addon on the real beta before publishing a clearly labeled alpha.

## Primary References

- [Blizzard's WoW Forever page](https://worldofwarcraft.blizzard.com/en-us/forever) and [announcement](https://worldofwarcraft.blizzard.com/en-gb/news/24302093) for product facts, not community endorsement.
- [Google's people-first content guidance](https://developers.google.com/search/docs/fundamentals/creating-helpful-content): original usefulness and clear expertise matter more than keyword repetition.
- [Google's AI search guidance](https://developers.google.com/search/docs/appearance/ai-features): sound technical SEO and distinctive helpful content remain the foundation; there is no special guaranteed AI-ranking file.
- [Discord interactions](https://docs.discord.com/developers/interactions/receiving-and-responding): verify signatures over the raw body, acknowledge promptly, and minimize permissions.

The broader research and phased roadmap remain in `blueprint.md`. The launch is the website and its operational workflows, not a claim that future Discord operations, editorial growth, or game-client testing have already happened.
