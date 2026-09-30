# Implementation Status

## Community Tools Implemented Locally

September 30: the [first tools/content batch](community-tools-release.md) adds a
WoW Trader hub and introduction, five tester assignments and report downloads,
two original guides, corrected preparation articles, and explicit guild/group
character rulesets. Historical listing fields and editor revisions are preserved.
The owner clarified that market freshness depends on voluntary app uploads; the
new copy distinguishes scan age from history coverage. Migration and article
publication have been applied only to the isolated local database. Deployment,
Discord publishing, bot activation, Helper crawler changes and raid-addon tests
remain separate.

## Content and Tools Plan

September 30: the [content, tools and tester program](content-tools-and-community-plan.md) is prepared after reviewing the community and WoW Trader repositories, public endpoints and primary platform guidance. It accepts the owner's confirmation that WoW Trader is Forever-tested, other guild addons await raid testing, and testers are already invited. It prioritizes a tool hub, original reviewed guides, tester assignments and B0/B1 bot services; Companion distribution and ingestion retention remain separate gates. Live Helper robots output blocks OAI-SearchBot while the community permits it, so a separate search-only policy review is planned. No articles, crawler settings, bot services or production releases were changed by this planning work.

## Channel Cleanup Partially Applied

September 30: after the owner's credential/permission confirmation, the separate [channel cleanup command](discord-channel-cleanup.md) applied and verified 28 topic updates and all six recruitment/PUG forum tag sets. Ten topic updates remain blocked by channel-level Manage Channels denies. The batch was narrowed to accessible targets without disabling permission, identity, fixed-content or stale-state checks. A fresh audit confirmed that roles, onboarding, guild settings, protected channel fields and all 30 unselected channels/categories were unchanged. Names, ordering, permissions, posting limits, intentional BOT traps and member-readable report forums are preserved. All 14 focused cleanup tests passed before the live run. No messages were posted; the owner will publish them personally. Native Discord rendering remains an owner check. This is a local operator tool, not a website deployment.

## Community Operations Research

September 30: the [community excellence plan](community-excellence-plan.md) is prepared from the live configuration audit, public competitor pages and official platform documentation. It covers onboarding, forums, staffing, hosted activities, governance, reporting, bot/addon sequencing, growth and verification. It preserves the owner's intentional privileged staff role, BOT onboarding choices and member-readable report forums. Competitor conversations and the owner's personal Discord session were not accessed. No Discord configuration changes, outreach, commit or deployment are part of this planning work.

The follow-up covers public metadata for all four owner-selected comparison servers and a capacity model informed by the owner's reported 560 guild raids per year. It also identifies a release prerequisite: review realm-required forms, draft realm-selection guidance, group ruleset fields and legacy addon identity against Blizzard's current ruleset/full-name documentation. Those compatibility changes are planned, not implemented; prepared content must pass that review before publication.

## WoWForeverBot Read-Only Preparation

September 30: [WoWForeverBot setup and configuration audit](kfcbot-setup.md) are implemented locally with separate credentials, a View Channels install link, GET-only identity/configuration collection, permission/onboarding review and private local reports. The owner-created application is installed and authenticated; live read-only audits return 58 channels/categories and 21 roles. Configuration findings, plans and write journals remain in gitignored local storage. The owner confirmed token rotation before the separate cleanup batch above; bot-policy publication remains outstanding. The audit itself remains GET-only. No website deployment is part of the cleanup, and existing website slash commands remain separate and inactive.

## Growth and Bot Preparation

September 30: three guide improvements, two preparation articles, copyable/downloadable templates and an exact-version guarded publisher are prepared locally, not yet deployed. The [preparation handoff](growth-preparation.md) records publication and rollback steps. The expanded [website/Discord blueprint](web-discord-integration-blueprint.md) defines the next bot task, later member ownership/signups and privacy-preserving synchronization. Outreach drafts are prepared; external requests and account actions are not claimed as complete.

## Discord and Editorial Release

The expanded Discord page, six evergreen guides, approved screenshot editor, article-specific social metadata, regional activity, source/session conversion reporting and search-admin workflow are live. Public Discord forums are explicitly distinguished from the website's private case system. Google ownership is owner-confirmed; sitemap inspection and Bing ownership remain to be confirmed. See [the editorial release](editorial-release.md) for 24 unit/integration tests, 19 browser tests, final live verification and the cold-image memory correction, and [search operations](search-operations.md) for remaining account/community actions.

## Visual Redesign Released

The September 29 redesign is live: official Forever desktop/portrait artwork, a prominent standalone community identity, responsive navigation, editorial guides with native contents links, real approved guild/group previews, coherent interior pages, and a matching social image. Existing invitations, administration, privacy, and moderation boundaries are preserved. See [the design release report](design-release.md) for browser coverage, performance measurements, deployment, and rollback details.

Redesign verification passed 16 unit/integration tests, 14 Playwright tests, lint, strict typecheck, and the final Linux production build. The nine-size homepage matrix and Chromium/WebKit page checks supplement the original launch verification below. Physical-device and field Core Web Vitals verification remain outside this release's evidence.

## Delivered Website

- Separate WoW Forever identity and official game logo with visible unofficial-community disclosure. Organizer history is limited to About and Privacy.
- Public homepage, Discord invitation and live counts, EU/NA and faction/playstyle pages, searchable guild directory and guild profiles, group listings, six evergreen guides, FAQ, policies, transparency, addon information, and staff sign-in.
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

- **Discord interaction bot:** the website interaction credentials, command registration and moderation webhook remain inactive. WoWForeverBot has separate local operator credentials; its channel topic/tag cleanup above does not activate website interactions, message publishing or role assignment.
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
