# Content, Tools and Tester Program

Decision date: September 30, 2026. Research and implementation plan only.
No article publication, bot activation, crawler-policy change, server deployment
or addon release is performed by this document.

Implementation follow-up: the [first tools/content batch](community-tools-release.md)
is now implemented locally. It also records the owner's upload-dependent freshness
clarification and a bounded collector-coverage follow-up. Production release and
bot activation remain separate.

## 1. Decisions From the Owner

- Feature the existing WoW Trader and guild-maintained addons instead of
  commissioning another utility merely to have something to promote.
- The owner confirms WoW Trader has been tested on Forever. The other guild
  addons have not, because their raid scenarios are unavailable; expand and
  validate them when those scenarios become available. Do not invent release dates.
- A substantial tester group has already been invited. Recruitment is not the
  immediate task: prepare useful assignments and support before they arrive.
- Keep WoW Forever Discord an independent, unofficial community open to both
  factions and different guilds. KFC is credited as an organizer/tool maintainer,
  not imposed as the new community's identity or a membership requirement.
- Reuse the existing personal-server deployment: Nginx, PM2 and local PostgreSQL.
  No Docker migration, new hosting platform or mandatory Cloudflare service.

This updates the addon and tester priorities in the
[community operations plan](community-excellence-plan.md). The proposed
ForeverCheck utility is deferred: first establish a real gap that the existing
Collector, Companion and tester reports cannot cover.

## 2. Recommendation

Build a community whose public promise is practical:

> Useful Forever tools, guides with evidence, and people to play with.

The repeatable workflow is:

1. A player finds a specific answer, tool or compatible group.
2. They use it without an unnecessary login or Discord-join wall.
3. Discord provides help, an activity, or a way to contribute a correction.
4. A maintainer turns an approved finding into a better tool or public answer.
5. Subscribers hear about a meaningful improvement and have a reason to return.

More guides are worthwhile when they serve distinct needs and have an owner.
The advantage is the combination of original tools, real observations and
responsive organizers, not article volume or automated chat activity.
Success means solved problems and returning participants. Search visibility
helps acquisition; neither content volume nor a bot guarantees first place.

## 3. What We Actually Have

### Evidence and Current Limits

| Asset                   | Evidence inspected                                                                                                      | Planning conclusion                                                                                        |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Community website       | Public `/addons` returns HTTP 200; source currently centers that page on ForeverGuard                                   | Expand this existing route into the tool hub rather than making a competing directory                      |
| Guides                  | Six published-guide source entries; two additional beta/launch drafts and three existing-guide improvements             | Correct and release the prepared work before commissioning duplicate starter guides                        |
| Discord                 | Prior live cleanup verified 28 topic edits and six forum tag sets; ten topic edits remain permission-blocked            | Useful destinations already exist; article planning does not depend on finishing those ten edits           |
| Bot                     | `lib/discord-bot.ts`, registration code and the integration blueprint                                                   | Local channel cleanup is not a running guide/search/publishing bot; production activation remains separate |
| WoW Trader              | `../wow-trader/README.md`, current deployment runbook, Collector source contract, Companion plan and public HTTP checks | Existing economy product is the first featured tool; no new trading engine is needed                       |
| Forever reference tools | Trader's reviewed snapshot-based calculators, spellbooks and encyclopedia routes                                        | Link relevant existing tools, preserving provenance and preview labels                                     |
| Collector               | Source declares native Forever AH scanning and TBC Auctionator integration; owner confirms Forever testing              | Record the exact tested build/features before making precise compatibility claims                          |
| Companion               | Runbook records 0.3.3 desktop artifacts; source and release plan retain maintainer-alpha warnings                       | Working addon behavior is different from readiness for unrestricted desktop distribution                   |
| Other guild addons      | Owner confirms maintenance but no Forever raid testing; a local BossTimer TOC is an older-client test build             | Inventory real names/owners, but do not label these as working Forever raid addons                         |
| ForeverGuard            | Source and draft packaging exist; current legacy character/realm model remains a compatibility gate                     | Keep optional and unpublished until identity, client and moderation gates pass                             |
| Tester cohort           | Owner says invited and awaiting arrival                                                                                 | Treat invitation count separately from active testers, results or staff capacity                           |

No game session, clean-machine installation, live server capacity inspection,
private competitor content or Search Console export was inspected in this task.
The initial browser research tool could not fetch our domains; direct ordinary
HTTPS GETs subsequently returned 200 for the tool pages and both robots files.
HTTP 200 alone does not establish frontend correctness, indexability or freshness.

Some older Trader README/context passages still describe a TBC-only migration
stage. Its September 30 deployment runbook records published Forever catalog
and market work. Use the most specific evidence with its date, and reconcile
documentation during the next Trader release instead of assuming every older
summary is current.

### The Competitive Gap

[ForeverAtlas's addon page](https://foreveratlas.com/addons) already offers a
catalog, setup sharing, source-check dates and an explicit distinction between
author-declared support and its own testing. This is evidence of an existing
feature set, not proof of competitor traffic or addon correctness.

Our opportunity is therefore more specific than another addon list:

- Maintainers available to explain their own tools.
- Exact-version, reproducible community tests and visible fixes.
- Original market observations with clear coverage and freshness.
- Guides paired with activities and useful support, including non-KFC hosts.

No search-volume estimates were obtained. Query suggestions below are hypotheses
to test against the owner's Search Console data, not measured traffic forecasts.

## 4. Offer Existing Tools in Three Lanes

### Lane A: Public Tools and Education

Feature WoW Trader as a maintained economy tool, with a community introduction
and links to its existing Forever web application. Show a real screenshot,
the task it solves, market/build coverage and its limitations before the CTA.
Browsing market information must not require installing software or joining KFC.

Good use cases include understanding a displayed asking price, comparing a
craft's inputs and output, and investigating whether a market observation is
fresh enough to use. Do not promise guaranteed gold, confirmed sales volume,
universal coverage or real-time prices from occasional scans.

The community page explains the workflow and support route. The Helper remains
the authoritative location for calculations, source data and downloads. Do not
copy a second price engine or stale data tables into community articles.

### Lane B: Controlled Collector/Companion Pilot

The owner's Forever test result is accepted. It does not remove the separately
documented desktop distribution gates:

- Per-installation pairing, scoped credentials and individual revocation before
  a broad collector rollout; never hand the tester cohort a shared production key.
- Signed/notarized macOS and signed Windows distribution per the existing release
  plan; native runtime and clean-machine validation for each supported platform.
- Transparent disclosure of what the collector reads and uploads, including
  character identity in protected raw uploads; public results remain de-identified.
- Explicit confirmation before installing files or enabling background uploads.
- Storage, retention, ingestion-rate and backup gates before materially increasing
  the number or frequency of uploads.

Until those gates pass, keep public copy honest: the web tool is available;
collector participation is a supported, approved-test workflow, not a frictionless
public install. Do not ask ordinary users to disable operating-system protection.
Testers can evaluate the web UI and documentation without any installation token.

### Lane C: Raid Addons Awaiting Testable Content

Create an internal inventory now: real project name, maintainer, source/release
location, current supported game, purpose, dependencies, license and support owner.
For each product, define the encounter or API scenario needed to validate it.

The public hub may contain a compact roadmap with a clear **Awaiting Forever
raid testing** state. Do not fill search results with thin coming-soon addon pages
or expose old-client packages under a Forever Download button. Existing supported
Classic/TBC versions retain their accurate labels and original destinations.

When raids become available: developer verification, small host-led trial,
documented failures, clean install/update/uninstall, then a reviewed release.
Compatibility is version- and feature-specific; a newer game build triggers
review rather than silently inheriting a permanent green badge.

Maintainer ownership is owner-confirmed, but third-party dependencies and
redistribution terms still need a release inventory. Trader's root package is
currently `UNLICENSED`; do not advertise the whole product as open source by
default. In-game addon distribution must follow
[Blizzard's policy](https://us.forums.blizzard.com/en/wow/t/ui-add-on-development-policy/24534),
including free distribution, visible code and restrictions on advertising.
The desktop app's distribution/security review is a separate matter.

## 5. Website Structure and Branding

Reuse current routes and design components. Proposed additions are not live.

| Surface                   | Job                                                                        | Publication boundary                                                                          |
| ------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `/addons`                 | Browse maintained tools by purpose, supported client and release status    | Existing route becomes a useful directory; do not imply every listed project is Forever-ready |
| `/addons/wow-trader`      | Explain the actual workflow, limitations, maintainer, screenshots and help | Distinct editorial introduction; links to Helper's canonical application/download pages       |
| `/addons/compatibility`   | Feature-level test evidence and known limitations                          | Publish when actual reviewed records exist; distinguish author claims from community tests    |
| `/guides`                 | Search and browse practical answers, with related tools                    | Preserve existing guide URLs; accessible filters, no endless indexed filter combinations      |
| Existing `/guides/[slug]` | One complete answer per intent                                             | Visible reviewer, sources, tested build where relevant, corrections and related resources     |
| Existing `/lfg`           | Real upcoming sessions and hosts                                           | Reuse current directory; correct ruleset/time/end-state contracts before promising more       |
| `/contribute`             | Clear tasks for the already-invited cohort                                 | Scope, evidence template, privacy notice, status and credit preference                        |
| `/updates`                | Maintained overview of meaningful changes                                  | Add only once there is real editorial output; no empty daily archive                          |

Keep Forever branding and the independent-community disclosure on the community
site. Explain that WoW Trader currently opens on KFC Helper so the destination
does not feel like an undisclosed redirect. Credit maintainers without asking
visitors to join their guild.

Do not rehost the whole Helper under a second domain now. If a future brand move
is approved, handle canonical URLs, redirects, existing links and analytics as
one migration, not two simultaneously indexable copies of the same application.

Tool pages need compact comparison rows, genuine screenshots, exact status and
one clear next action. Avoid oversized decorative heroes, invented screenshots
or a wall of identical cards. Test search, filters, wide tables, status badges,
downloads and copy controls at 320/390/768/1440 widths and with a keyboard.

## 6. Editorial Plan: What to Publish

Start with a four-week planning window, not a required article quota. Budget for
one or two substantial additions or revisions per week plus one short reviewed
digest if there is meaningful news. Reduce output when review capacity is missing.

### First Ten Content Briefs

| Order | Canonical destination / working title                                 | Intent and original value                                               | Evidence gate and Discord use                                                                             |
| ----- | --------------------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1     | Revise `wow-forever-beta-starter-checklist`                           | Access/setup and first useful session; build on the prepared draft      | Current official instructions; genuine setup screenshots before claiming a walkthrough; welcome reference |
| 2     | New guide: Playing Forever With Friends: Rulesets, Factions and Names | Prevent incompatible character plans and confusing identity assumptions | Official ruleset/name sources plus a clearly scoped member checklist; discuss actual group plans          |
| 3     | `/addons/wow-trader`                                                  | What our existing tool does, who it helps, what it does not prove       | Maintainer review, observed coverage, real UI; one owner-posted introduction and support thread           |
| 4     | New guide: Reading WoW Forever Auction Prices Without Being Misled    | Asking versus sold prices, depth, old scans and build-specific coverage | One timestamped, de-identified worked example from accepted Trader data; profession discussion            |
| 5     | `/addons/compatibility`                                               | Exact addon version/build, tested features, problems and fixes          | Real approved observations; no fabricated initial rows; route addon-help answers here                     |
| 6     | New guide: Back Up, Update and Troubleshoot Forever Addons            | Reversible installation and settings recovery                           | Clean test setup on documented OS/client; do not delete SavedVariables as a blanket fix                   |
| 7     | Revise `wow-forever-launch-group-checklist`                           | A friends/guild plan with ruleset, faction, availability and a fallback | Correct the existing realm wording; expand the existing template rather than cloning it                   |
| 8     | Revise `find-or-organize-wow-forever-group`                           | A host-tested relaxed-session playbook                                  | One real pilot, consented screenshots, clear end time and expectations; reusable organizer post           |
| 9     | New guide: Crafting Cost Versus Selling the Materials                 | Explain a practical decision through our own calculations               | Enough exact-market input depth; list fees, assumptions and unknowns; no guaranteed-profit headline       |
| 10    | One tester-led problem guide or current dungeon walkthrough           | Answer the most consequential unresolved question from the cohort       | Reproduced result or actual run, not a guessed boss strategy; linked from relevant discussion             |

Working queries include `wow forever addons`, `wow forever auction house`,
`wow forever crafting calculator`, `wow forever play with friends`, and specific
setup problems. They are planning labels, not claims of search demand or ranking.

Blizzard's current ruleset and character-name documentation is the baseline,
not Classic realm assumptions. Some existing forms still require `realm`,
`ForeverGroup` lacks a ruleset field, and safety/addon identity uses legacy keys.
Treat this as a coordinated product correction, not an editorial find/replace.
Do not blindly reinterpret an AH market key as a character realm or ruleset.
[Rulesets](https://news.blizzard.com/en-us/article/24302070/choose-your-ruleset-in-world-of-warcraft-forever),
[character names](https://news.blizzard.com/en-us/article/24304161/create-a-name-of-your-own-in-wow-forever).

### After the First Useful Collection

Let observed questions choose the next work: tested leveling routes, profession
explanations, verified dungeon mechanics, PvP preparation, RP session guides,
and class-specific help when a qualified reviewer is available. Do not publish
nine generic class pages just to occupy keywords. Use existing Helper calculators
in genuinely worked builds instead of duplicating their databases.

Raid guides and guild raid-addon articles start when the relevant encounters
can be observed. Prepare capture/review templates now, not invented strategies.
Label material as tested, source-backed, provisional or historical as appropriate.

An economy briefing is optional and evidence-gated. If scans are stale or sparse,
publish a methodology/support update instead of claiming a market trend. Keep
price-query permutations and every scan timestamp out of the indexed article set.

## 7. Editorial and Evidence Workflow

Use explicit states: idea, evidence needed, draft, review, approved, published,
needs recheck, superseded/withdrawn. A draft is never discoverable through public
bot search, sitemap or an unauthenticated preview link.

Every brief records one reader problem, existing URL overlap, reviewer, sources,
required test, intended action and next review trigger. Separate confidence of
the underlying game fact from the quality of the writing.

Every practical publication includes:

- A concise answer and scope before the detailed steps.
- Game/build, OS or addon version when relevant; do not assign a client build
  to a source-only announcement that was not tested.
- First-hand evidence or precise primary-source references; limitations remain visible.
- Author and reviewer, with public display permission, and a correction route.
- Related tool, next useful guide and one relevant Discord discussion/help action.
- A factual changelog; publication date stays stable and review dates change only
  after a review, not a scheduled freshness rewrite.

AI may help organize notes and draft prose. It does not invent test outcomes,
attendance, citations, prices, screenshots or expert bylines. A named human
approves technical claims. Private messages, report evidence and unconsented
Discord conversations do not become article material or model input.

Run a weekly gap review: repeated questions, unanswered tasks, broken links,
outdated builds and overlapping articles. Improve the best existing answer
before adding a competing URL. Merge redundant material with a redirect when
appropriate; preserve useful historical test evidence with an explicit status.

## 8. Activate the Invited Testers

Do not start another broad invitation campaign while the existing group waits.
Prepare a pinned orientation and a small queue of actionable assignments.
Until the publishing bot is live, the owner posts these from WoWForever.

Each assignment specifies a concrete task, prerequisites, expected duration,
supported version, safe steps, expected result, evidence needed, privacy warning,
reviewer and status. A useful first task should usually take 15-30 minutes.

| Track                | First assignment                                                        | Useful output                                                             |
| -------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Website usability    | Find a relevant Trader market and explain its age/coverage without help | Confusing steps, mobile screenshot and reproducible issue                 |
| Guide review         | Follow one setup guide from a clean starting point                      | Missing prerequisite, wrong step, source correction                       |
| Compatibility        | Test one specified addon feature on a recorded build                    | Feature-level result, exact versions and redacted evidence                |
| Controlled Collector | Approved participant completes the documented scan/save/upload cycle    | Valid receipt, scope/quality result; no token or full raw file in Discord |
| Organizer            | Run one manageable planning/help session with a backup                  | Actual attendance aggregate, questions and one process improvement        |

State flow: available -> claimed -> submitted -> needs information or reproduced
-> reviewed -> published/fixed -> recheck due. A tester can return a task without
penalty. Invitations, claimed tasks and completed tests are separate counts.

One report template should capture: task ID, product, game build, addon version,
OS when relevant, steps, expected/actual behavior, sanitized evidence and consent
for public credit. Personal paths, account names, raw SavedVariables and ingestion
credentials must not be posted publicly. Provide a private intake for diagnostics
before requesting sensitive files; this is not the player-misconduct report flow.

Appoint one triage owner and a backup. As an initial operating target, acknowledge
submissions within 48 hours during stated coverage and send a weekly status
summary. Publish the actual coverage window rather than promising 24/7 support.
Cap active tasks to what reviewers can handle; do not collect a backlog nobody reads.

Reward useful reproductions, corrections and patient support, with optional credit.
Do not reward scan volume, message counts or duplicate bug reports. Membership in
a large tester cohort is not proof of expertise, publication approval or staff access.

## 9. Discord Programming and Distribution

Use existing addon discussion/helpdesk, class, faction and general areas. Do not
repurpose the addon helpdesk as a player-report channel or create a dozen empty
news/guide categories. Add a dedicated resource forum only after activity and
permissions justify it; preserve all intentional onboarding/staff decisions.

Pilot rhythm, conditional on a confirmed host and editor:

- Start of week: one concise post with real upcoming activities, open test tasks
  and the most useful changed resources.
- Midweek: a setup/Trader clinic or a short question session with a maintainer.
- Weekend: one available-content group or a planning/social session, labeled accurately.
- End of cycle: one short account of what was fixed or learned, crediting people
  only with permission and linking the maintained answers.

No automatic daily posting obligation. Begin with at most one general digest per
week, no `@everyone`, and topic-specific opt-ins for later release alerts. Correct
the existing bot message on ordinary edits rather than creating another announcement.

Example editorial package: a tested addon fix becomes a troubleshooting section,
a compatibility-record update, a short approved Discord summary and a clinic
demonstration. These are different useful formats, not duplicated full articles.

Recruitment remains open to outside guilds on equal terms. Invite maintainers and
creators to an actual test/help session, offering attribution and actionable bug
reports rather than asking for promotional links alone. Seek permission before
posting in third-party communities. No unsolicited DMs, automated cross-server
promotion, purchased endorsements or mass reciprocal-link exchanges.

## 10. WoWForeverBot Product Roadmap

Retain the existing [B0-B4 integration design](web-discord-integration-blueprint.md).
The first useful bot is a reliable interface to approved resources, not an AI
persona that reads every conversation. The local audit token is not silently
copied into production interaction settings.

| Phase                 | Member/admin action                                                                      | Boundary                                                                                                 |
| --------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| B0 foundation         | `/help`, signed guild-scoped interactions, health and destination checks                 | Publish bot policies; durable receipts; acknowledge/defer before Discord's deadline                      |
| B1 resource lookup    | `/guide <query>`, `/addon <name>`, `/trader`                                             | Search approved current content; return status, concise answer and canonical link; unknown means unknown |
| B1 publication        | Editor selects Share on an approved guide/tool revision                                  | Preview exact destination/content; one versioned projection, no default mentions, edit/withdraw support  |
| B1 tester routing     | `/test` links to open tasks; `/feedback` opens the correct private-safe submission route | No collection of private chat; task creation/publication remains reviewed                                |
| B2 contributions      | Optional linked member identity, task claims, correction ownership and preferences       | Separate from staff identity; anonymous reading remains available                                        |
| B3/B4                 | Existing roster integration, opt-in digest and relevant release updates                  | One roster authority, unsubscribe, quiet hours and rate controls                                         |
| Later, evidence-gated | `/price` or `/craft` backed by a bounded Trader read API                                 | Require explicit market/item disambiguation, provenance, freshness and typed unavailable states          |

Do not turn on every command in the current registration script. Keep legacy
`/check` and role mutations out of the first resource release until their
independent identity, moderation and hierarchy requirements are satisfied.

### Search and Answers

Start with PostgreSQL title/category/full-text lookup over approved resources.
Rank explicit title/alias matches and current applicable versions. Show a few
useful results and a correction/help route when no answer is available.

For price/craft answers, the service must return product, build, market scope,
observation time, units/currency, quality and missing-data status alongside values.
Never fill an unobserved market with another region's price or present asking
prices as completed sales. Phase one simply links to Trader; a new read adapter
can be designed with its maintainer once an actual query need is established.

Only consider generated answers after retrieval proves insufficient. Then use
approved public documents only, citations, version/date context, an abstention
path and a small evaluation set of real questions. Test stale/contradictory facts,
prompt injection in submissions, private-data exclusion and correction handling.
Do not allocate a GPU or introduce a vector database merely to launch `/guide`.

### Delivery and Failure Handling

Discord requires an initial interaction response within three seconds; defer
longer work and persist a deduplication receipt before side effects. Follow its
rate-limit responses with bounded retry behavior.
[Interaction documentation](https://docs.discord.com/developers/interactions/receiving-and-responding),
[rate limits](https://docs.discord.com/developers/topics/rate-limits).

Use the planned PostgreSQL outbox and projection records: publication approval
and job creation are transactional, jobs have leases, expired leases recover,
versions are ordered, and ambiguous sends are reconciled rather than blindly
repeated. A stale queued revision must not overwrite a newer published one.
Withdrawn material disappears from bot lookup immediately; failed Discord edits
remain visible to staff until corrected. The website must still work during a
Discord outage, and a Trader outage must not disable guide search.

## 11. Server and Service Boundaries

The server makes reliable background work possible. It does not itself create
SEO authority or justify constant data harvesting.

Proposed topology, reusing existing services:

```text
Nginx / HTTPS
  community Next.js app ---- Forever PostgreSQL tables
             |                       |
             | signed interactions   | approved outbox jobs
             v                       v
         Discord API <-------- PM2 community worker
                                     |
                           bounded read-only adapter
                                     v
                           existing WoW Trader API

Approved Collector users -> existing Trader ingestion service -> Trader database
```

- Keep community and Trader database ownership, credentials and migrations
  separate. No community-worker access to raw uploads, ingestion keys or private
  moderation tables merely to look up a tool or price.
- Use a named PM2 worker with a dedicated OS account/environment and graceful
  shutdown. Start with one worker and bounded concurrency; measure memory and
  CPU before choosing limits. Do not claim the current machine supports an
  arbitrary member count without a load and storage test.
- Use HTTP interactions first. Gateway membership events or message-content
  access are not needed for initial resource commands or approved publication.
- Schedule approved-source checks and link checks with conditional requests,
  host allowlists, time/size limits, private-network and redirect protection.
  A member-submitted URL must not become an unrestricted server-side fetch.
- Poll sources conservatively; queue proposed editorial changes instead of
  automatically rewriting guides from a changed page or publishing scraped text.
- Cache approved lookup results with version invalidation. Never cache private
  evidence or user-specific interactions in shared public caches.
- Monitor job age, retries, revoked permissions, DB latency, disk/WAL growth,
  addon download failures, backup age and last successful content review.
- Keep encrypted off-host backups and rehearse restores. The current single
  host remains a common failure point even with separate PM2 processes.
- A global outbound pause and per-destination pause must be available in admin.
  Uninstalling/revoking the bot must stop deliveries without losing website data.

### Trader Storage Gate

The existing Trader runbook measured about 16 MiB per full scan including its
then-observed raw/normalized representation, before further overhead. Its example
at 48 scans/day is about 0.75 GiB/day. These are dated planning measurements, not
today's disk survey or a promise of constant scan size.

Use `observed bytes per accepted scan * accepted scans per day * retention days`
plus measured indexes, WAL, backups and headroom. Deduplicate overlapping
contributions, cap accepted cadence per market, summarize older observations
and test coordinated retention before a large collector cohort goes live.
The invited tester group can test guides and the website while this gate is
resolved; not every tester needs to upload Auction House scans.

## 12. Data and Admin Changes

These are proposed additive changes, not migrations performed by this plan.

| Existing area               | Proposed extension                                                                                   | Important constraint                                                                         |
| --------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `ForeverGuide`              | Review status/owner, reviewed date/build, review-due trigger, correction history and source evidence | Preserve current public IDs/slugs, first publication date and custom editor content          |
| ForeverGuard-only `/addons` | `ForeverTool` catalog with kind, maintainer, official URL, support URL and support state             | Do not equate desktop software, external web tools and Lua addons                            |
| `ForeverAddonRelease`       | Associate releases with a tool; scope version uniqueness to tool/version                             | Backfill existing rows to ForeverGuard; preserve existing download IDs/URLs and draft status |
| Compatibility               | Version/build/feature observations plus independent reviewer and public summary                      | Author-declared and tester-reported states do not become reviewed automatically              |
| Tester tasks                | Assigned task, scope, result, private evidence reference, consent and review trail                   | Testers gain no staff/admin role; never reuse misconduct cases for bug reports               |
| Discord                     | Destinations, receipts, versioned projections and leased outbox from existing blueprint              | Public and private queues have explicit serializers and access boundaries                    |
| Tool integrations           | Approved endpoint, timeout, schema version and circuit state                                         | No arbitrary URL execution or privileged cross-database queries                              |

The current `ForeverAddonRelease.version` is globally unique. Adding a second
addon without a scoped migration would cause unrelated `1.0.0` releases to
collide. Do not paper over this with product names embedded in version strings.
Desktop distributions should remain in Trader's existing signed-release workflow,
not pass through the community's Lua ZIP upload handler.

Admin should expose a compact editorial queue, compatibility review queue,
tester task board and Discord delivery log. Show unpublished/blocked/stale states,
exact destination previews, last reviewer, failed reasons and rollback/withdrawal
actions. Reuse the current auth, CSRF, rate-limit and audit helpers.

Editors approve articles, maintainers attest tool changes, reviewers approve
test observations, and admins control destinations. Approving a guide does not
grant software-release authority. Credentials never appear in CMS fields or
browser responses. Do not auto-publish member submissions or raw diagnostics.

## 13. Search and AI Discovery

### Confirmed Crawl-Policy Mismatch

Direct HTTPS checks on September 30 returned:

- Community `robots.txt`: public access includes Googlebot, Bingbot and
  OAI-SearchBot, with private/submission routes excluded.
- Helper `robots.txt`: explicitly disallows OAI-SearchBot, ChatGPT-User and
  PerplexityBot along with training and other crawlers.
- Helper's checked-in `infra/nginx/helper.kfcguild.online.conf` explicitly rejects
  user agents matching `bot|crawler|spider|slurp` except Googlebot, consistent with
  its deployment runbook. This would reject Bingbot and OAI-SearchBot even after
  a robots-only change. Live Nginx configuration was not inspected in this task.

Thus simply advertising Trader from the community does not make its own pages
eligible for all desired search discovery. Plan a separate reviewed search-only
policy change in the Trader repository and deployed Nginx config. Keep existing
training blocks, authentication, private-path exclusions and resource controls.
The earlier KFC policy work does not automatically cover this separate subdomain.

OpenAI distinguishes OAI-SearchBot search access from GPTBot training access;
ChatGPT-User is a user-triggered fetch agent, not the search eligibility control.
Allowing search can retain the training block. This enables consideration, not
guaranteed citation or ranking.
[Official crawler documentation](https://developers.openai.com/api/docs/bots).

Before release, test actual robots output, headers, HTTP/HTTPS redirects, sitemap
URLs and public fetches through Nginx. A forged bot user-agent is not proof of
a verified crawler visit; inspect verified-bot logs and real webmaster-tool
results where available. Preserve private 401/403 behavior and bounded server load.

### Content and Indexing Decisions

- One canonical URL per useful answer. Keep full readable answers on the web;
  Discord offers discussion, help and contribution rather than unlocking text.
- Add clear author/reviewer context, test methodology, sources and material
  corrections. Use appropriate Article/Breadcrumb or software metadata only
  where it accurately reflects visible content; no invented ratings or reviews.
- Connect `/discord`, `/addons`, guides and relevant Helper destinations with
  descriptive links. The community introduction and underlying tool solve
  different tasks; don't canonicalize unique community prose away to Helper.
- Index only substantive public records. Keep search/filter permutations,
  unpublished tasks, diagnostics, account routes and preview URLs out of indexes.
  Access control protects private content; robots exclusions do not.
- Keep the real brand consistent. Do not generate many near-identical regional
  Discord landing pages without distinct staffed activity and useful content.
- Recheck mobile performance and actual screenshots. Tool tables need accessible
  HTML summaries; do not make an image or canvas the only answer.
- Google ownership is already owner-confirmed. Inspect real indexing and query
  performance instead of asking for verification again; confirm Bing separately.

Google emphasizes original, helpful work rather than scaled low-value pages.
Its AI search guidance does not require special AI files or additional schema.
No `llms.txt`, keyword density, publication count or structured-data badge
guarantees first place.
[People-first guidance](https://developers.google.com/search/docs/fundamentals/creating-helpful-content),
[AI search guidance](https://developers.google.com/search/docs/appearance/ai-features),
[spam policies](https://developers.google.com/search/docs/essentials/spam-policies).

## 14. Measure Whether It Is Working

Establish the first cohort's baseline before claiming an improvement. Review
weekly for operations and over longer comparable windows for search; a new
article's first few days are not a reliable ranking verdict.

| Question                            | Measure                                                                                  | Interpretation limit                                                  |
| ----------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Are useful pages being discovered?  | Search Console query/page impressions, clicks and indexing status                        | No invented volume; average position is not a universal personal rank |
| Do readers take a useful next step? | Guide-to-tool and guide-to-Discord sessions, with existing privacy controls              | A click is neither a confirmed join nor a successful installation     |
| Does the cohort produce evidence?   | Invited, activated, claimed, submitted, reviewed and published counts separately         | Report small samples; invite totals are not completed tests           |
| Is support useful?                  | Time to first human response, reproduced/fixed cases and unresolved age                  | No unstaffed 24/7 response promise                                    |
| Do people return?                   | Opt-in task/event participation repeated within a defined 14-day window                  | Wait for a complete observation window; no private chat surveillance  |
| Are tools trustworthy?              | Current tested records, recheck backlog, broken releases and supported-platform failures | Do not count a download as a working install                          |
| Is the bot reliable?                | Acknowledgement latency, queue age, duplicate projections and stale answers              | Process uptime alone is insufficient                                  |
| Is growth sustainable?              | Reviewer/host hours, accepted scan volume, disk growth and cost per useful action        | More joins can reduce service quality when staffing is unchanged      |

First-cohort process targets, not forecasts: every published technical resource
has a reviewer; every successful task gets feedback; no untested raid addon is
listed as supported; no duplicate bot announcement during retry tests; no public
token or raw diagnostic exposure. Log genuine helpfulness feedback, not star
ratings invented for search snippets.

Keep existing DNT/GPC and private-route protections. Do not join IP/session data
to Discord identities. Optional member linking and new tester records need their
own disclosure, access/deletion rules and agreed retention before collection.

## 15. Delivery Order and Owners

Effort is relative, not a calendar promise: S is contained editorial/config work;
M spans several existing modules; L needs new contracts or a cross-platform pilot.

| Priority                          | Deliverable                                        | Owner role                     | Size     | Exit gate                                                                               |
| --------------------------------- | -------------------------------------------------- | ------------------------------ | -------- | --------------------------------------------------------------------------------------- |
| P0                                | Real addon/tool inventory and current status       | Maintainer + owner             | S        | WoW Trader featured; raid projects accurately deferred; no invented addon names         |
| P0                                | Tester orientation, first tasks and triage rota    | Tester coordinator             | S        | Existing invitees can complete a useful task without privileged access                  |
| P0                                | Ruleset/name compatibility correction              | Engineer + editor              | M        | Drafts, relevant forms and matching logic agree; legacy data migration reviewed         |
| P0                                | Helper search-only crawler review                  | Operator                       | S/M      | Desired public crawlers allowed through robots and Nginx without opening private routes |
| P1                                | `/addons` hub and WoW Trader introduction          | Engineer + maintainer          | M        | Correct release states, real screenshots, canonical links and mobile QA                 |
| P1                                | First approved content batch                       | Editor + subject reviewers     | M        | Existing drafts corrected; at least one original worked example; no duplicates          |
| P1                                | B0/B1 bot lookup and explicit publication          | Engineer + admin               | L        | Test-guild checks, receipts/outbox, policy publication and safe failure handling        |
| P1                                | Structured compatibility/task records              | Engineer + test lead           | M        | Private evidence boundary, review, correction and build recheck work                    |
| P1 before broad Collector rollout | Pairing, platform distribution and retention gates | Trader maintainer + operator   | L        | Individual revocation, native tests and bounded storage growth                          |
| P2                                | Two reliable weekly activities and reviewed digest | Hosts + editor                 | Ongoing  | Named backup, actual outcomes and manageable workload                                   |
| P2                                | Bounded Trader lookup adapter and opt-in updates   | Both maintainers               | M        | Exact-market answers, missing-data states and outage isolation                          |
| Content-release dependent         | Raid-addon ports and raid guides                   | Addon maintainers + raid hosts | Variable | Relevant content exists and real tests pass; no speculative date commitment             |

### First Implementation Batch

1. Complete the tool inventory from actual repositories/releases and publishable
   maintainer facts. Accept the owner's existing tester recruitment as complete.
2. Correct the content/model assumptions identified above; do not publish unsafe
   drafts just to fill the site before testers arrive.
3. Extend `/addons`, prepare the WoW Trader introduction, and release the first
   corrected starter resources through the existing preview/dry-run publisher.
4. Prepare the tester welcome, five bounded assignments and a correction template
   for the owner to post. Start with manual review so work need not wait for OAuth.
5. Separately review Helper crawler changes and the B0/B1 bot release. Deploy only
   after the relevant approval and verification gates, not as a documentation side effect.

### The Next Two to Four Weeks

Publish from actual tester findings, keep a weekly review/support rhythm, and
activate approved bot lookups/publication. Complete Collector distribution and
storage work before expanding uploads. Measure which pages, tools and sessions
bring people back; scale those, not every proposed feature simultaneously.

### After Raids Are Testable

Open narrowly specified raid-addon tasks with hosts, document encounter/build
coverage, publish the validated releases and pair them with first-hand guides.
Keep old-game packages separate. An invitation to beta-test is not a production
compatibility claim or permission to distribute everyone else's code.

## 16. Acceptance and Recovery

- Content: factual review, primary sources, no fictional testing, correct game
  labels, source attribution, custom CMS edits preserved, drafts private.
- UI: desktop/mobile and keyboard tests for directory filtering, status clarity,
  link/copy/download errors and overflow; screenshots contain real supported state.
- Releases: checksum/provenance verification, dependency inventory, safe archive
  paths, version-scoped uniqueness, existing download URLs and user settings preserved.
- Trader integration: exact-build/market isolation, stale/no-data behavior,
  timeout/revoked-access handling, no raw character identity in public responses.
- Bot: invalid signature, wrong guild, unauthorized commands, duplicate delivery,
  crash after send, deleted destination, permissions revoked and outdated content.
- Privacy: ordinary member cannot view private diagnostics or admin queues;
  public test credit is optional; raw reports never enter public lookup or AI input.
- Operations: interrupted jobs resume safely, outbound pause works, retention
  preserves required aggregates, restore rehearsal succeeds, sibling sites stay up.
- Search: live headers/canonicals/sitemaps match intended public URLs, private
  routes stay protected, allowed crawlers are not blocked by another network layer.

Roll out to staff/test destinations before public posting. Keep one switch to
pause outbound publication, retain the previous app release, and use additive
database changes so rollback remains practical. Withdraw a bad release or
incorrect guide from search/lookup and update its existing Discord projection;
do not erase private audit history or publish another unreviewed announcement.

## 17. Remaining Inputs and Boundaries

Needed before the affected release, not before completing this plan:

- Exact names/release locations and maintainers of the remaining guild addons.
- WoW Trader's approved build/platform test matrix and which Collector users may
  join the controlled pilot; no credentials in chat.
- A reviewer and backup for the first tester queue, plus actual host availability.
- Approved public authorship/credit preferences and real screenshots.
- Destination IDs and narrow permissions for the new bot workflows. Existing
  Manage Channels permission does not itself activate interactions or posting.

No additional tester recruitment, speculative addon, AI chat persona, private
Discord scraping, automatic public accusations, fake activity, bulk SEO articles
or broad server rearchitecture is required to start.

## 18. Research and Verification Record

Read-only review covered the community routes/models/bot, existing operations
and integration plans, and Trader's README, current deployment runbook,
Collector contract, desktop release plan and tool routes. Public checks confirmed
ordinary HTTPS responses and the crawler-policy mismatch. The owner's updates
about maintained addons, Forever testing and invited testers are recorded as
owner-confirmed, not independently performed tests.

This is not a full security, platform-runtime, capacity or SEO account audit.
No product test suite was rerun merely to certify a planning document. The four
changed Markdown documents parsed successfully, all 27 local links resolved,
and the diff/whitespace checks passed. These are the verification for this change; implementation
phases retain their own code, browser, native-client and production release gates.

Primary external references used in addition to the inline links:

- [Google people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content).
- [Google AI search eligibility](https://developers.google.com/search/docs/appearance/ai-features).
- [OpenAI crawler controls](https://developers.openai.com/api/docs/bots).
- [Discord interactions](https://docs.discord.com/developers/interactions/receiving-and-responding).
- [Discord rate limits](https://docs.discord.com/developers/topics/rate-limits).
- [Blizzard addon policy](https://us.forums.blizzard.com/en/wow/t/ui-add-on-development-policy/24534).
- [ForeverAtlas addon directory](https://foreveratlas.com/addons), used only to
  inspect its own offered workflow, not to assert addon compatibility.
