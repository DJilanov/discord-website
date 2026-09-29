# Implementation Status

## Visual Redesign Released

The September 29 redesign is live: official Forever desktop/portrait artwork, a prominent standalone community identity, responsive navigation, editorial guides with native contents links, real approved guild/group previews, coherent interior pages, and a matching social image. Existing invitations, administration, privacy, and moderation boundaries are preserved. See [the design release report](design-release.md) for browser coverage, performance measurements, deployment, and rollback details.

Redesign verification passed 16 unit/integration tests, 14 Playwright tests, lint, strict typecheck, and the final Linux production build. The nine-size homepage matrix and Chromium/WebKit page checks supplement the original launch verification below. Physical-device and field Core Web Vitals verification remain outside this release's evidence.

## Delivered Website

- Separate WoW Forever identity and official game logo with visible unofficial-community disclosure. Organizer history is limited to About and Privacy.
- Public homepage, Discord invitation and live counts, EU/NA and faction/playstyle pages, searchable guild directory and guild profiles, group listings, four original guides, FAQ, policies, transparency, addon information, and staff sign-in.
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

- **Discord bot:** implementation and registration script are present, but the owner chose website-first launch. No application credentials or webhook are configured and no Discord server channels or roles have been changed.
- **ForeverGuard publication:** real source and draft ZIP exist. In-game beta client compatibility is not verified, so the release stays unpublished pending playtesting.
- **Public safety alerts:** launch database contains no fabricated reports, evidence, accusations, or player entries. Owners must staff the process with independent reviewers before publishing anything.
- **Rankings:** first place in Google or AI recommendations cannot be guaranteed. Search Console verification, sitemap submission, editorial updates, real community participation, genuine links, and query monitoring require ongoing owner work.
- **Off-host disaster recovery and monitoring:** local backup automation is included. An encrypted off-host destination and external alerting service still need configuration.

## Growth Work After Launch

1. Verify the domain in Google Search Console and Bing Webmaster Tools, submit the sitemap, and inspect the homepage, Discord page, and best guide. Do not submit private report pages.
2. Match Discord's public name, description, icon, and pinned website link to this site. Invite other guild leaders, not only existing KFC members.
3. Publish one genuinely useful, beta-verified guide at a time, with an author, evidence, and update date. Do not manufacture realm or class guides from unverified assumptions.
4. Seek permission for useful community introductions on Blizzard forums, relevant Reddit threads, and Discord directories. Avoid purchased links, repetitive promotional posts, and false endorsement claims.
5. Review organic impressions, query positions, landing-page sessions, and Discord clicks weekly. Compare Search Console clicks with first-party traffic; clicks and sessions are not exact equivalents.
6. Activate the bot after a least-privilege Discord application is configured; independently test its role hierarchy and moderation webhook. Playtest the addon on the real beta before publishing a clearly labeled alpha.

## Primary References

- [Blizzard's WoW Forever page](https://worldofwarcraft.blizzard.com/en-us/forever) and [announcement](https://worldofwarcraft.blizzard.com/en-gb/news/24302093) for product facts, not community endorsement.
- [Google's people-first content guidance](https://developers.google.com/search/docs/fundamentals/creating-helpful-content): original usefulness and clear expertise matter more than keyword repetition.
- [Google's AI search guidance](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide): sound technical SEO and distinctive helpful content remain the foundation; there is no special guaranteed AI-ranking file.
- [Discord interactions](https://docs.discord.com/developers/interactions/receiving-and-responding): verify signatures over the raw body, acknowledge promptly, and minimize permissions.

The broader research and phased roadmap remain in `blueprint.md`. The launch is the website and its operational workflows, not a claim that future Discord operations, editorial growth, or game-client testing have already happened.
