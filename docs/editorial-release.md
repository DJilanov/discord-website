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

- 24 unit/integration tests passed, including invite failure states, source aliases, exact starter-content guards, approved images, session-level SQL aggregation and bounded production image-processing configuration.
- All 19 Playwright tests passed in a complete final run, including real isolated submission/review flows, draft publication controls, article-specific metadata, mobile admin tables and private-route permissions.
- Typecheck and ESLint passed. A local production build passed; final Linux output is built separately before activation.
- Lua core/syntax checks passed. In-game addon compatibility remains unverified and the bot is not activated.
- WebKit passed 10 page/viewport checks with decoded images. Chromium checks cover 320/390/768/1440px editorial pages, existing home viewport coverage through 1920px, native no-JavaScript navigation, enlarged article text, and axe accessibility scans.
- Production dependency audit reported zero vulnerabilities. Staged-source pattern checks found no credential markers or private environment/storage/build artifacts.
- Production backup and source-only rollback snapshot completed before deployment. A backup also succeeded under the actual cron system account, with private backup ownership checked.

Browser screenshots and test traces stay in ignored local artifacts, not public source control. Automated accessibility and browser checks do not replace physical-device or screen-reader testing.

## Production Result

- Published code commits: `eb6b1fd` (website/editorial implementation) and `5e29d83` (cold-image memory follow-up), both pushed to `main`. The existing GitHub SSH identity was used after the remote's HTTPS push had no configured credentials. No account tokens were copied into the repository.
- Active build: `/home/wow-forever-discord/.next-release-20260929-editorial-v2`. The final Linux build passed. Only the named `wow-forever-discord` PM2 app was activated, under `wowforever`, on port 19320. Dependency lockfile hashes matched, so existing Linux dependencies were retained.
- Publication created two guides and updated the four exact recognized starter versions. Its second production run changed zero records. There was no schema migration, destructive seed or replacement of production settings/private storage.
- `npm run verify:public` passed after final activation: 28 public sitemap pages, mobile/desktop rendering and accessibility, decoded artwork/screenshots, working invitation, HTTPS redirects, canonical/robots metadata, anonymous admin denial and private evidence denial. Verification requests now send DNT to avoid manufacturing growth metrics.
- A separate live pass verified all six guide titles, clean canonicals, article-specific Open Graph/Twitter covers, decoded images and the public-Discord/private-website reporting distinction.
- Production checks passed for database role isolation, active owner, published guides and absence of browser-test records. KFC returned HTTP 200 and retained its existing PM2 process; it was not restarted.

### Cold-image feedback loop

The first release's additional image pass coincided with a confirmed PM2 memory restart at 788,504,576 bytes, approximately 752 MiB. Image files were valid, but the interruption caused a decode failure. The follow-up bounds native processing as documented in [deployment.md](deployment.md), without raising the 650 MiB process limit or changing another app's environment.

The final release started with a fresh image cache. During the public-page verification, 40 RSS samples at two-second intervals observed a peak of 332 MiB and a final value of 273 MiB; the same process remained alive throughout. The six-guide image pass then succeeded as well. This is a bounded release check, not proof of performance under arbitrary load or a statistically controlled memory benchmark.

### Recovery

The pre-editorial build `.next-release-20260929-design-v2` is retained, together with a source-only snapshot at `/var/backups/wow-forever-discord/source-before-editorial-20260929T185148Z.tgz`. The intermediate editorial build is retained too. Prior hashed static assets were copied into the new release for browsers with older HTML. Project backups remain private and writable by the scheduled backup account.

Follow the deployment runbook to restore source and select a retained build, preserving current private files and later submissions. Do not restore or reset the shared KFC database. The new guide records use the unchanged schema. Google/Bing account actions and community operations remain the explicit external handoff above, not completed indexing or ranking claims.
