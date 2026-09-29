# Discord and Editorial Release

September 29, 2026. Implements the engineering scope of [the editorial plan](discord-and-editorial-plan.md) and [search growth plan](search-growth-plan.md).

## Implemented

- Reworked `/discord` with an early contextual invitation, truthful approximate counts, actual owner-supplied channel imagery and channel map, regional/playstyle routes, onboarding, approved future groups/guilds, standards, FAQs and a stable sharing link.
- One invitation resolver shared by the page and redirect. Missing/expired primary invitations can use a backup; timeouts, rate limits and malformed data are not presented as proof of expiry. Admin rejects a detected primary/backup server mismatch.
- Four rewritten evergreen guides on the existing slugs plus two new group/recruitment guides. Each has practical examples, deliberate internal reading paths, a relevant next step, consistent authorship/dates and its own social cover. No fictional community events, memberships or testimonials.
- Guide library starting paths and separate News section when real stories exist. Approved screenshots render only in editorial Markdown, with dimensions and descriptions. The admin has the complete cover catalog, an image insertion control and preview. Arbitrary remote/private image paths remain blocked.
- Regional and playstyle pages use approved, relevant records. Already-started groups are excluded from upcoming views. Static pages no longer advertise artificial shared modification dates.
- AI source alias correction, source and entry-page session conversion tables, unchanged DNT/GPC/retention protections. Repeat invitation clicks do not inflate the session conversion numerator.
- Owner/admin-only search workflow and optional verification meta values, plus configurable approved onboarding and organizer copy. Empty fields do not invent staff facts.
- Public Discord reporting is explicitly separated from private website evidence, review and appeal processes, following the owner's permission clarification.

## Publication Safety

`content:publish-editorial` validates all six guides, creates missing articles, and updates only exact recognized versions of untouched starter text/title/excerpt. Customized or unpublished records are preserved, including covers, nondefault author values, metadata and original publication dates. An optimistic `updatedAt` condition protects intervening changes. The old default team byline is updated to the site's current name. A repeated local run made zero changes.

There are no schema migrations or new production dependencies. Production stays on PM2 and local PostgreSQL. No KFC source, process or data changes are part of this release. Initial version control includes the existing project because neither the local repository nor its configured remote had any commits.

## External Work

Google ownership is owner-confirmed. Sitemap submission, URL inspection outcomes and Bing verification are not yet confirmed. Organizer handles, real events, consenting listings, directory requests and weekly measurements require owner/community action. See [the operating handoff](search-operations.md). No automatic account verification, claimed search position, fabricated review or guaranteed AI recommendation is part of the implementation.

## Verification and Deployment

Local verification:

- 23 unit/integration tests passed, including invite failure states, source aliases, exact starter-content guards, approved images and session-level SQL aggregation.
- All 19 Playwright tests passed in a complete final run, including real isolated submission/review flows, draft publication controls, article-specific metadata, mobile admin tables and private-route permissions.
- Typecheck and ESLint passed. A local production build passed; final Linux output is built separately before activation.
- Lua core/syntax checks passed. In-game addon compatibility remains unverified and the bot is not activated.
- WebKit passed 10 page/viewport checks with decoded images. Chromium checks cover 320/390/768/1440px editorial pages, existing home viewport coverage through 1920px, native no-JavaScript navigation, enlarged article text, and axe accessibility scans.
- Production dependency audit reported zero vulnerabilities. Staged-source pattern checks found no credential markers or private environment/storage/build artifacts.
- Production backup and source-only rollback snapshot completed before deployment. A backup also succeeded under the actual cron system account, with private backup ownership checked.

Browser screenshots and test traces stay in ignored local artifacts, not public source control. Automated accessibility and browser checks do not replace physical-device or screen-reader testing. Production activation and final public smoke results are recorded after deployment.
