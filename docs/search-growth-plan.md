# WoW Forever Discord: Search and Community Growth Plan

Research date: 2026-09-29. Status: researched proposal, not an implemented SEO release.

This plan updates the search strategy in [the blueprint](../blueprint.md) using the deployed website, repository, current discovery results, and platform documentation. It supersedes conflicting older SEO recommendations, not the product or moderation requirements.

Detailed delivery specification: [Discord page and editorial content plan](discord-and-editorial-plan.md) covers the section layout, six article briefs, media/admin prerequisites, and acceptance checks. Its follow-up code review identified invite-fallback, editorial-image, and guide-cover validation prerequisites that must be addressed before the content batch.

Owner follow-up: Discord channel names and EU/NA organizer assignments are finalized. References below to confirming those details mean documenting the existing setup and obtaining publishable names/screenshots, not reopening the server structure. Specific coverage hours and public attribution still need to be recorded accurately.

## 1. Decision and Goal

The goal is more people joining, finding a group, and staying. Becoming the first organic Google result for `wow forever discord` is a useful ambition, but not something engineering can guarantee. ChatGPT has no single stable, universal first-result position: the useful outcome is an accurate, cited recommendation in relevant web-grounded answers.

**Recommendation: keep the current design and infrastructure. Spend the next work cycle on verified search visibility, real public community activity, a stronger `/discord` page, and legitimate discovery partnerships.** More generic pages or another visual rebuild are lower priorities.

The owner plans to bring approximately 100 people into the new Discord within the next 24 hours. This is an onboarding target, not current verified membership. Keep the existing invite and API-backed approximate counts. Do not substitute KFC roster sizes, invited people, or future members for the new server's membership.

Positioning:

> WoW Forever Discord is an independent, unofficial community welcoming Alliance and Horde players interested in PvE, PvP, and roleplay. Find a guild, arrange a group, and meet people you enjoy playing with.

Differentiate with accessible organizers, clear expectations, real groups, and fair moderation. KFC experience supports the organizers' credibility on About; this must not become a KFC-only recruitment funnel. Do not claim official status, largest size, best moderation, or round-the-clock coverage without evidence.

### Success hierarchy

1. People successfully join and participate in a useful conversation or hosted activity.
2. Newcomers return, guild leaders receive relevant enquiries, and groups actually happen.
3. Qualified organic and AI referrals produce Discord invitation clicks.
4. Search impressions, relevant rankings, and accurate AI citations grow.

Use operational targets to manage the work. Do not turn those targets into predicted search rankings, guaranteed traffic, or invented search-volume estimates.

## 2. What the Audit Established

Read-only live inspection covered nine public pages with JavaScript disabled, their metadata and structured data, the sitemap, robots directives, the invitation redirect, Discord's public invite response, and crawler user-agent probes. Repository review covered rendering, analytics, content ownership, and admin capabilities.

| Area                 | Observed on September 29                                                                                                                | Meaning and action                                                                                             |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Public rendering     | All nine sampled pages returned HTTP 200 with useful server-rendered content, self-referencing canonicals, and `index, follow`          | The sampled pages are technically accessible; this does not prove indexing                                     |
| Sitemap              | 26 public URLs                                                                                                                          | Enough initial coverage; prioritize quality and discovery over additional routes                               |
| Home identity        | Title is `WoW Forever Discord & Community Hub`; visible H1 text is `Community Discord`, with `WoW Forever` in the logo image's alt text | Identity is present. Make the literal brand readable in visible text without undoing the design                |
| Main invitation page | `/discord` already has the H1 `WoW Forever Discord` and a relevant title                                                                | Keep this as the primary invitation-intent page; strengthen its evidence and utility                           |
| Invite               | `/join` returned 302 to `https://discord.gg/ejn4UnDdcX`; Discord identified the expected server                                         | No evidence that the invite points at the wrong server                                                         |
| Membership           | Discord's public API returned approximately 6 members and 5 online during the audit                                                     | A point-in-time launch snapshot. The owner's 100-person target is for the following 24 hours                   |
| Public activity      | Zero published guild listings and zero upcoming group listings in the inspected directory views                                         | The biggest immediately visible credibility gap                                                                |
| Guides               | Four published community guides                                                                                                         | Improve their first-hand detail before starting a large publishing program                                     |
| Regional pages       | EU and NA pages exist but mainly contain general advice                                                                                 | Add real regional contacts, schedules, and approved listings; distinguish welcome from staffed coverage        |
| Search accounts      | Owner has not verified Search Console or Bing Webmaster Tools                                                                           | Actual index status and query performance remain unknown                                                       |
| Crawler probes       | Googlebot, OAI-SearchBot, and ChatGPT-User user-agent requests returned 200 and the same homepage byte count                            | Rules do not appear to block these user-agent strings from our host; actual crawler-network access is unproven |
| Performance          | Prior design-release mobile lab checks recorded median LCP 2.208 seconds and CLS 0                                                      | A useful lab baseline, not field Core Web Vitals or proof of performance for all visitors                      |

The website has the infrastructure of a community destination, but little published evidence of activity yet. That is a launch-stage observation, not an accusation that the community cannot deliver.

### Limits of the evidence

- Direct Google browsing encountered a CAPTCHA. It was not bypassed. No exact Google position, first-page inventory, or regional ranking order was verified.
- Exact-domain and `site:` discovery queries returned no results in the available search tool. This does not establish that Google has not indexed the site. Google documents that [`site:` results are not exhaustive](https://developers.google.com/search/docs/monitor-debug/search-operators/all-search-site).
- The research web fetcher could not retrieve the homepage or `/discord`, while browser and direct HTTP checks succeeded. Investigate with Search Console live inspection and verified crawler logs; do not label this a confirmed OpenAI block or weaken security based on it.
- Discovery results below identify real competing resources and outreach opportunities, not their exact Google rank or the reasons an algorithm selected them.
- No ChatGPT recommendation benchmark, confirmed search volume, confirmed join attribution, or Search Console index inspection was possible in this pass.

## 3. The Competitive Gap

| Discovered resource                                                                                                                                  | Verified observation                                                                                                          | Our response                                                                                                               |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| [WoW Forever NA on Discord](https://discord.com/servers/wow-forever-na-1528511731523915907)                                                          | Its opened public profile displayed 10,046 members and 3,127 online during this research; counts change                       | Do not compete on an unsupported size claim. Make smaller-community access, useful organization, and regional fit tangible |
| [r/classicwow Discord list](https://www.reddit.com/r/classicwow/comments/1wimrmv/wow_forever_discord_servers/)                                       | A curated region-oriented discovery list; the post requests submissions through modmail with subject `Forever Discord Server` | Prepare one accurate submission after onboarding and staff coverage are ready; acceptance is the moderators' decision      |
| [r/wowforever weekly recruitment megathread](https://www.reddit.com/r/wowforever/comments/1wp2h5e/guild_recruitment_lfg_discord_megathread_week_39/) | Recruitment belongs under the relevant regional comments in the inspected thread                                              | Read the current week's rules before posting; do not create unsolicited top-level advertisements                           |
| [Wowhead Discord directory](https://www.wowhead.com/discord-servers)                                                                                 | Includes a WoW Forever server section and invites directory suggestions                                                       | Request a listing through its current contact route; do not imply endorsement or invent a contact address                  |
| [GuildsForever EU directory](https://guildsforever.com/guilds/eu)                                                                                    | Its opened page displayed 44 EU guilds and useful recruitment filters                                                         | Populate our existing directory with consenting guilds before building more filtering or directory pages                   |

These resources show that players already have choices. We cannot substantiate the original hypothesis that nobody else provides a credible community. Our opportunity is to demonstrate a specific, useful community, not to make unverified claims about competitors.

Independent references can help people discover and assess us. Treat this as a practical distribution and credibility strategy, not a published formula for ChatGPT rankings or a promise that a backlink will move Google positions.

## 4. First 48 Hours

### A. Verify search ownership

Owner action, assisted by the engineer if needed:

1. Add the **Domain property** `wowforeverdiscord.online` in Google Search Console. The property name has no protocol or `www`.
2. Add Google's supplied DNS TXT record at the current authoritative DNS provider. Preserve all existing records and keep the verification record after verification. No Cloudflare migration is required.
3. Submit `https://www.wowforeverdiscord.online/sitemap.xml`.
4. Inspect the homepage, `/discord`, `/discord/eu`, and the onboarding guide. Record live-fetch success, indexing state, last crawl, Google-selected canonical, and any indexing exclusion reason. Request indexing for these few important pages after their content is ready.
5. Review security issues, manual actions, sitemap processing, and crawl failures. Resolve an actual failure before changing titles or adding more pages.
6. In Settings, check Search generative AI inclusion. Inclusion is the documented default; lack of Search Console verification does not itself mean exclusion. Check inherited settings as well.
7. Verify the site in Bing Webmaster Tools using its available ownership method and submit the same sitemap.
8. Retain owner access and use least-privilege access for collaborators. Never commit account credentials or verification screenshots containing account information.

Sources: [Google ownership verification](https://support.google.com/webmasters/answer/9008080), [recrawl requests and their limits](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl), and [Search generative AI control](https://support.google.com/webmasters/answer/16908024). Crawling and indexing can take time, and a request does not guarantee inclusion or ranking. Repeated requests are not an acceleration mechanism.

**Acceptance:** ownership verified, sitemap accepted for processing, and inspection results recorded. "Indexed" is a separate observed state, not an engineering acceptance promise.

### B. Turn the onboarding target into a real welcome

Community owner and moderators:

- Invite the planned members voluntarily through the existing communities. Recheck actual server membership after the migration; do not publish 100 until it is supported.
- Confirm the actual public channel names, region/faction roles, language, and who welcomes newcomers. Do not publish a channel map invented from the website's categories.
- Arrange two genuine hosted sessions with dates, time zones, and consenting hosts. These can be welcome voice sessions, guild introductions, or beta activities when available; do not advertise unavailable live-game content.
- Invite three to five real guild leaders to submit their own listings. Publish approved listings with the same standards for KFC and unrelated guilds. Do not copy other directories without permission.
- Identify actual EU/NA and PvE/PvP/RP organizer coverage. Where a host is still needed, say so instead of promising staffed service.
- Assign one person to welcome new arrivals and one backup for the first day. Do not promise 24/7 moderation merely because both regions are welcome.
- Verify the primary and backup invitation in Discord and on the site. Keep `/discord` as the shareable permanent address.

The 100-person target is valuable because those people can make the community useful. Membership size by itself is not a demonstrated Google ranking factor.

### C. Show proof on the existing website

After those facts exist, publish approved listings, real group posts, the real onboarding screenshots, and named or pseudonymous consenting organizers. Keep evidence proportionate: public handles and roles are sufficient; legal names and private chat logs are not required.

The existing admin and public submission flows should handle the first content batch. Do not block this work on Discord bot setup, a custom CRM, or a new analytics integration.

## 5. Search Intent and Page Ownership

Keep `/discord` as the primary page for joining this Discord and the main destination in outreach. The homepage remains the brand/community overview. Both are useful, separately indexable pages with self-canonicals. Google may still choose the homepage for some queries; use observed data rather than forcing one page's canonical onto another.

| Query cluster                                                              | Preferred existing destination                | Distinct reason to visit                                                                                 |
| -------------------------------------------------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `wow forever discord`, `world of warcraft forever discord`, working invite | `/discord`                                    | Current invitation, factual server overview, actual channel preview, what happens after joining          |
| `wow forever community`, brand navigation                                  | `/`                                           | Community identity, current activity, routes into guilds, groups, and Discord                            |
| `wow forever eu discord`, European community                               | `/discord/eu`                                 | Real EU hosts, languages, time-zone-labelled sessions, and relevant approved guilds                      |
| `wow forever na discord`, US community                                     | `/discord/na`                                 | Real NA coverage and scheduling; clearly distinguish planned coverage from active hosts                  |
| PvE, PvP, or RP community Discord                                          | `/servers/pve`, `/servers/pvp`, `/servers/rp` | Relevant activities, organizers, and expectations, not duplicated keyword paragraphs                     |
| Alliance or Horde community                                                | `/alliance`, `/horde`                         | Useful faction routing and relevant listings; no claim that social categories confirm realm availability |
| `wow forever guild recruitment`, finding a guild                           | `/guild-recruitment`                          | Current, approved listings with region, language, schedule, and playstyle                                |
| `wow forever lfg`, group finder                                            | `/lfg`                                        | Actual upcoming groups with hosts and unambiguous times                                                  |
| How to join and get started                                                | `/guides/join-wow-forever-discord`            | Walkthrough of the actual server after accepting an invitation                                           |
| How to choose a guild                                                      | `/guides/find-your-wow-forever-guild`         | Organizer-informed checklist with specific examples and links to listings                                |

This is a proposed ownership map, not a claim of measured query demand. Use Search Console to refine it. If both the homepage and `/discord` receive relevant impressions, that alone does not prove harmful cannibalization. Investigate only when search intent, snippets, or conversion become confused.

Do not create every region x faction x playstyle x realm combination. Do not automatically noindex a short page based on word count. Assess whether it gives a visitor distinct, current help; enrich or consolidate genuinely redundant pages with a considered redirect plan.

### `/discord` content specification

Keep the working invitation and attractive first viewport. Add a compact, readable body beneath it:

1. **Plain-language identity:** independent WoW Forever community, who is welcome, and a clear non-affiliation statement.
2. **Current invitation:** real approximate counts, primary action, unavailable/error state, and a verification timestamp only if a successful check actually occurred. Never refresh a displayed timestamp on a failed request.
3. **Actual server preview:** two or three consented screenshots showing relevant channel structure, with readable alternatives and no private messages, emails, or account identifiers.
4. **What is happening:** upcoming hosted sessions and recently approved guilds from existing published records. Handle the empty state honestly.
5. **Who can help:** consenting moderator/organizer handles, actual coverage, contact route, and conduct expectations. Do not imply that the API's online count measures available moderators.
6. **Practical questions:** free participation, no required KFC membership, supported languages, region roles, optional addons, and how to get help.
7. **Next step:** invitation action and a link to the actual onboarding guide.

A reasonable title to test after obtaining a baseline is `WoW Forever Discord | Join the Community`. The current title is already relevant; changing it is not the first dependency or a guaranteed improvement. A factual description can be: `Join an independent WoW Forever Discord for Alliance and Horde. Meet players, find guilds and groups, and explore PvE, PvP, and roleplay.`

Use normal prose and informative headings. There is no minimum word count or requirement to repeat the exact query throughout the page. Google's [current AI-search guidance](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) emphasizes original utility and warns against manufacturing pages for every query variation.

## 6. Content That We Can Actually Own

Start with existing pages. Publish up to two substantial updates or original pieces per week only while the team can verify and maintain them.

| Priority | Asset                                                                                           | Evidence needed                                                                                                    | Publication route                                                                    |
| -------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| 1        | Updated onboarding guide, titled `How to Join WoW Forever Discord and Find Your Group`          | Actual role/channel walkthrough, verified mobile and desktop screenshots, common first-day questions               | Update the current guide; retain its slug                                            |
| 1        | Updated guild-selection guide, titled `How to Find a WoW Forever Guild That Fits Your Schedule` | Sample questions about attendance, loot, time zones, and expectations; real consenting guild examples              | Update the current guide and link to approved listings                               |
| 1        | Improved loot-rules checklist                                                                   | An anonymized worked example and an organizer review; distinguish prior TBC experience from Forever-specific rules | Update the current safety guide; no public player accusations                        |
| 2        | First community-session recap                                                                   | A real completed event, consenting hosts, accurate aggregate participation, useful conclusions                     | Publish through the existing guide CMS before considering a new news system          |
| 2        | Guild leader interviews                                                                         | Three consenting leaders, exact schedules, differing playstyles, and clearly disclosed affiliations                | One substantive comparison of needs and expectations, not fake testimonials          |
| 2        | EU/NA play-hours planning resource                                                              | Confirmed host schedules with time zones and daylight-saving considerations                                        | Improve regional pages and the existing playstyle guide first                        |
| Later    | Recruitment trends from our listings                                                            | Enough current, approved listings to report meaningfully, dated sample size, reproducible aggregation              | Clearly label as this directory's sample, not the entire game population             |
| Later    | Addon demonstrations and tested release notes                                                   | Actual game-version testing, privacy description, limitations, reproducible release                                | Publish when verified; do not sell unfinished protection as a ranking differentiator |

Each piece needs an identifiable responsible author or team, an accurate update date, source links for game-specific claims, relevant images, and a useful route back to Discord or a directory. Reviewer attribution must reflect actual review. Disclose organizational relationships when featuring guilds.

Do not scrape private Discord messages to create search content. Collect public questions and publish consented or anonymized answers. Do not mass-produce generic class guides that cannot compete on accuracy or first-hand experience.

## 7. Distribution and Legitimate Recommendations

### Order of operations

1. Announce the separate community to KFC and the sister community, clearly explaining that members can keep their guilds. Invite participation rather than transferring people without consent.
2. Publish one useful, contextual announcement on the KFC website linking to `/discord`. Disclose the shared organizers; this is not an independent endorsement. Avoid keyword-stuffed sitewide links.
3. After onboarding and moderation coverage are real, request review by the r/classicwow list maintainers using their specified modmail route.
4. Request consideration for Wowhead's directory through its current contact process.
5. Post an honest introduction in the permitted regional reply of the current r/wowforever megathread. Recheck its rules each time; the researched week-39 thread is not a permanent posting authorization.
6. Contact a small number of genuinely relevant guild leaders or creators with a specific useful collaboration, such as co-hosting a welcome session. Do not send bulk unsolicited DMs or buy ranking links.

An initial goal of three relevant listing/review requests is a workload target, not a quota of guaranteed backlinks. Track the recipient, date, rules checked, response, and any agreed next action. Respect a rejection or no-promotion rule.

### Submission draft

Use only after checking the destination's rules and that the described services are available:

> Hi, I help organize WoW Forever Discord, a new independent community welcoming Alliance and Horde players interested in PvE, PvP, and RP. We have a public website with a current invite, guild recruitment, group posts, and published community rules. The organizers are also behind KFC Guild, but this server is open to other guilds and players. Would you consider it for your community list? Details: https://www.wowforeverdiscord.online/discord. Invite: https://discord.gg/ejn4UnDdcX.

Add actual regional coverage, languages, and a real upcoming session when known. Do not insert anticipated member totals or claims that rival communities are unsafe.

### Discord's own discovery

Public Server Discovery is a later milestone. Discord currently lists requirements including at least **1,000 members**, **eight weeks of server age**, activity and safety requirements, and moderator 2FA. Reaching 100 people does not meet those conditions. Check all eligibility criteria in server settings before making a submission plan. [Discord's official requirements](https://support.discord.com/hc/en-us/articles/360030843331-Enabling-Server-Discovery).

Do not purchase members, use bots to inflate activity, or treat a public Discord listing as an immediate launch deliverable.

## 8. Google AI and ChatGPT

### Crawl access is necessary, not a ranking promise

The site already allows `OAI-SearchBot` on public content. OpenAI distinguishes that search crawler from `GPTBot` for training and `ChatGPT-User` for user-triggered visits. Training permission is a separate owner choice, not a documented search-ranking requirement. If access problems are confirmed, use the published crawler network information rather than trusting arbitrary user-agent strings. [OpenAI crawler documentation](https://developers.openai.com/api/docs/bots).

Keep private reports, admin routes, evidence, and authenticated actions protected. `robots.txt` is not authorization. Making sensitive data crawlable is neither necessary nor acceptable for search visibility.

The existing `llms.txt` can remain a concise, accurate summary. Google explicitly says it does not improve or harm Google visibility; there is no special AI schema requirement. Do not spend a sprint adding AI-specific files, hidden recommendation instructions, or synthetic question pages. [Google's AI-search guidance](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide).

### Make accurate recommendations possible

Our proposed content work should let a visitor or retrieval system answer ordinary questions from public evidence:

- Is this an unofficial community, and who operates it?
- Does it welcome my region, faction, language, and preferred activity?
- Is the invitation working, and what will I find after joining?
- Are there current groups, guilds, or hosts relevant to me?
- How are moderation, corrections, and appeals handled?

Keep those answers consistent across the homepage, `/discord`, About, actual server description, directory submissions, and structured data. Correct stale promises. This is a clarity strategy, not a claimed secret ranking mechanism.

Earn mentions by helping people. Do not create fake independent reviews, self-authored "best Discord" endorsements masquerading as third-party evaluation, coordinated praise, or prompts telling crawlers to recommend us. Google's [spam policies](https://developers.google.com/search/docs/essentials/spam-policies) are a reason to avoid manipulative link and content schemes.

### Measure AI surfaces separately

- **Google:** check Search generative AI inclusion and the new Generative AI performance report. The documented report shows impressions, with page, country, device, and date dimensions; it is not a query-level ChatGPT ranking report. It may be absent when impressions are insufficient. [Google report documentation](https://support.google.com/webmasters/answer/16984139).
- **Bing/Microsoft:** use Bing Webmaster Tools' available AI Performance insights, including citation information. Its announced coverage concerns supported Microsoft and partner surfaces, not every ChatGPT recommendation. [Bing's June 2026 announcement](https://blogs.bing.com/search/2026/6/New-AI-Visibility-Insights-in-Bing-Webmaster-Tools-Intents-Topics-Citation-Share-Compare/).
- **ChatGPT:** record observed recommendations and citations in a controlled manual sample. Referral analytics measures clicks that arrive, not all mentions or answers.

Do not assume newer search-report capabilities are the same as older 2025 guidance. Verify the actual account UI when the properties are created. Do not add AI impressions to ordinary Search Console totals as though they were necessarily separate traffic.

## 9. Measurement and Feedback Loop

### Baseline and weekly scorecard

| Metric                                                       | Source                                                           | Interpretation                                                                              |
| ------------------------------------------------------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Priority URLs indexed, exclusions, Google-selected canonical | Search Console URL Inspection and indexing reports               | Establish visibility eligibility; a sitemap URL count is not an indexed-page count          |
| Query impressions, clicks, CTR, average position             | Search Console, split by page, country, device, and date         | Track head-term and regional clusters separately; average position is not a universal rank  |
| Google generative-AI impressions                             | Relevant Search Console report                                   | Track within its documented scope; do not interpret absent data as a block                  |
| Bing search and AI citation visibility                       | Bing Webmaster Tools                                             | Keep platform labels and reporting limits                                                   |
| Landing sessions and sessions with a Discord click           | Existing first-party analytics, with the small improvement below | Estimate site conversion by source; client blocking and privacy choices cause undercounting |
| Actual membership and newcomer participation                 | Discord administration and voluntary feedback                    | Separate aggregate growth from attributable joins; leaving members affect net growth        |
| Published guilds, hosted sessions, repeat participants       | Moderated listings and organizers' aggregate records             | Measure whether the community delivers on its promise                                       |
| Accurate, cited AI recommendations                           | Manual prompt log                                                | Directional sample, not a population estimate or stable rank                                |

Create a first snapshot after account verification, then review weekly. Compare 28-day windows once enough data exists. Avoid significance claims or title A/B-test conclusions from a handful of visits. Preserve a dated change log so a spike can be compared with actual announcements or content changes.

Group search queries by joining Discord, EU/NA, playstyle, guild recruitment, LFG, and onboarding. Include `World of Warcraft` wording where it appears. Discover further language from real queries rather than commissioning hundreds of speculative pages.

### Existing analytics: one concrete correction and one useful extension

The current source classifier recognizes a `chatgpt.com` referrer and the short UTM value `chatgpt`. A read-only reproduction showed that an empty referrer with `utm_source=chatgpt.com` is classified as `Referral`, not `AI referral`. This is a specific alias-handling gap, not evidence that every ChatGPT visit is currently lost.

Proposed focused fix: normalize known source aliases before classification, validate lengths at the existing boundary, and add regression tests for missing referrers, known aliases, and unrelated lookalike domains. Do not attribute arbitrary strings containing `chatgpt` to a trusted source.

Then extend the existing admin traffic report with source-level **unique sessions**, landing pages, and **sessions with a Discord click**. Source page-view totals must not be labelled visitor conversion. Preserve existing admin authorization, DNT/GPC behavior, retention, and IP protections.

For our own announcements, use honest campaign labels such as:

```text
https://www.wowforeverdiscord.online/discord?utm_source=kfc_discord&utm_medium=community&utm_campaign=forever_launch
```

Keep canonical metadata on the clean `/discord` URL. Do not append campaign labels to other people's recommendations or pretend referral parameters prove a confirmed join.

The bot is deferred, so start with aggregate membership snapshots and an optional "How did you find us?" question. **A `/join` click is not a confirmed join.** Do not correlate IPs with Discord identities or promise person-level retention attribution without a separate justified design.

Search Console and Bing exports can be reviewed manually first. A later read-only admin import is preferable to an immediate OAuth integration if weekly reporting becomes burdensome. Keep search metrics separate from website analytics rather than combining incompatible denominators.

### Small, repeatable AI benchmark

Run six neutral prompts weekly in fresh conversations without prior discussion of our site. Use web search when available, record whether it actually searched, and repeat uncertain observations up to three times:

1. `Where can I find a WoW Forever community Discord?`
2. `Recommend a WoW Forever Discord for EU players.`
3. `Recommend a WoW Forever Discord for NA players.`
4. `Is there a WoW Forever community for casual Alliance players?`
5. `Where can Horde players find WoW Forever guild recruitment?`
6. `Where can I find WoW Forever PvP or roleplay groups?`

Record date, product/model as displayed, country/language, search mode, prompt, whether we were mentioned, cited URL, invite correctness, and material factual errors. Distinguish a brand mention from a linked recommendation. Do not tell the model our brand in the evaluation prompt or ask repeatedly until it praises us.

Answers without retrieval are not an index-status test. We cannot schedule changes to a model's training data, and this conversation is not an unbiased benchmark.

### Diagnose before doing more work

| Observation                                        | Next investigation                                                                                                       |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Live inspection fails                              | HTTP response, rendered content, robots, canonical, DNS/TLS, verified crawler requests; resolve the actual error         |
| Fetch succeeds but important pages are not indexed | Reported exclusion reason, duplication, internal discovery, public usefulness, and meaningful external references        |
| Indexed but no relevant impressions                | Intent fit, region/language, actual demand, and whether enough time/data exists; do not infer a penalty                  |
| Impressions but few clicks                         | Position and query context first, then title/snippet fit; one change at a time                                           |
| Visitors arrive but do not click Discord           | Actual invite health, regional fit, evidence of activity, mobile CTA, and expectations                                   |
| Clicks rise but community participation does not   | Discord onboarding, coverage, hosted activities, and voluntary newcomer feedback                                         |
| AI cites a stale or wrong claim                    | Correct our public facts and owned listings; request a specific correction from a third-party publisher when appropriate |

## 10. Prioritized Delivery Backlog

Effort estimates are planning estimates for focused work, not promises about third-party review or indexing speed. All rows below are proposed unless explicitly identified as already available.

| ID  | Priority / owner        | Work and rough effort                                                                                | Acceptance                                                                                                           |
| --- | ----------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| S01 | P0 / owner              | Search Console and Bing ownership, 1-2 hours plus DNS processing                                     | Verified properties, sitemap submissions, recorded URL inspections                                                   |
| C01 | P0 / owner + moderators | First-day onboarding and host coverage, ongoing                                                      | Actual count checked; real welcome coverage and two scheduled sessions; no invented coverage                         |
| C02 | P0 / community editor   | Seed useful public activity, 1-2 days of coordination                                                | Three to five consenting approved guild listings and real group/session posts, using existing flows                  |
| S02 | P1 / engineer + editor  | Improve `/discord` and literal brand clarity, roughly 1-2 engineering days after assets/facts arrive | Working invite states, truthful facts, actual screenshots, relevant records, mobile/desktop and accessibility checks |
| C03 | P1 / editor + organizer | Improve the existing onboarding and guild guides, 1-2 editorial days                                 | Verified walkthroughs, screenshots, accurate metadata/attribution, unchanged working slugs                           |
| A01 | P1 / owner              | Three relevant listing/review requests, 2-4 hours                                                    | Rules checked, accurate submissions logged; no promise of acceptance                                                 |
| M01 | P1 / engineer           | Fix AI source aliases and add source-session conversion, approximately 1 day                         | Focused regression tests; dashboard labels distinguish views, sessions, clicks, and joins                            |
| S03 | P1 / engineer           | Date/brand/author consistency, half to one day                                                       | About naming consistent; no artificial freshness; visible author agrees with article data                            |
| M02 | P1 / owner              | Weekly scorecard and neutral AI sample, about 1 hour/week                                            | Dated observations with source, scope, and limitations; decisions logged                                             |
| C04 | P2 / editor + engineer  | Region/playstyle pages backed by current approved records, 1-2 days after data exists                | Distinct relevant content; no duplicated keyword-route matrix or fabricated availability                             |
| S04 | P2 / engineer           | Evaluate IndexNow when publication cadence justifies it, roughly half to one day                     | Changed public canonical URLs only; bounded async retries and failure visibility; no private evidence URLs           |
| M03 | P2 / engineer           | Optional read-only reporting import, only after manual workflow is proven                            | Authenticated, validated import with dates/deduplication; no credential leakage or misleading totals                 |

Use [IndexNow's documented protocol](https://www.indexnow.org/documentation) only as an optional change-notification mechanism for participating services. It is not submission to Google's rankings or a direct ChatGPT recommendation endpoint. Defer it while the higher-impact launch tasks remain incomplete.

### Implementation boundaries

| Existing location                                                 | Proposed responsibility                                                                                     |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `app/(site)/page.tsx`, `app/(site)/discord/page.tsx`              | Visible identity, real public activity, practical invitation content; retain the redesigned visual language |
| `content/pages.ts`, `app/(site)/[...slug]/page.tsx`               | Regional facts, About identity, honest static-page update dates                                             |
| Guide admin and `app/(site)/guides/[slug]/page.tsx`               | Persisted guide content/metadata and consistent visible author attribution                                  |
| `lib/seo.ts`, `app/sitemap.ts`, `app/robots.ts`                   | Preserve canonicals and private-route exclusions; use meaningful modification dates                         |
| `lib/analytics.ts`, `lib/traffic-report.ts`, admin analytics view | Small attribution correction and properly defined conversion summaries                                      |
| `lib/discord.ts`, `app/join/route.ts`                             | Reuse current public invite lookup and redirect behavior; bot remains optional                              |

Editing seed content alone does not overwrite already-published database guides. Use existing admin editing, or a narrowly scoped, reviewed migration that preserves custom edits. Do not replay a destructive seed to change production copy.

The static sitemap currently uses September 29 as a shared modification date. That is not inherently a problem for a new release, but future content updates need genuine dates or no optional `lastmod`, not a daily rewritten timestamp. [Google sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).

Keep existing Organization, WebSite, Article, and breadcrumb data aligned with visible content. Do not add fake reviews, ratings, an unimplemented SearchAction, or an official Blizzard affiliation. Visible FAQs can help visitors, but Google stopped FAQ rich results in May 2026; do not budget work for gaining FAQ snippets. Existing FAQ markup is not itself a reason for an urgent rewrite. [Google Search documentation updates](https://developers.google.com/search/updates).

No new production dependency, database service, Cloudflare account, Docker deployment, analytics SaaS, or bot credentials are required for the first work cycle. Preserve PM2, local PostgreSQL, the existing admin, and the separate project's data boundaries.

## 11. 30 / 60 / 90-Day Operating Plan

### Days 1-2: become measurable and welcoming

Verify search properties, record index state, onboard willing members, confirm coverage, and publish initial real listings and sessions. Capture the first clean baseline. Reconcile the planned 100-person onboarding with actual membership without changing the invite unnecessarily.

### Days 3-7: make the invitation worth recommending

Deliver the focused `/discord` improvements, update the two priority guides, publish actual onboarding imagery, and make the first relevant listing requests. Host the promised sessions. Fix confirmed analytics alias errors. Record external mentions accurately, including shared ownership.

### Weeks 2-4: build evidence and a useful directory

Maintain a small publishing cadence, follow up on genuine conversations, and improve regional pages from real activity. An initial operating target of five to ten consenting guild listings and two hosted sessions per week is reasonable only if organizers can sustain it; it is not an SEO threshold. Publish a real recap rather than promising perpetual future events.

At day 30, report indexing, query clusters with impressions, referral sources, invitation clicks, actual membership, and whether newcomers participated. If there is little data, say that. Do not use an arbitrary SEO score as a substitute.

### Days 31-60: concentrate on demonstrated demand

Use actual query and participation data to choose the strongest region/playstyle. Keep the wider welcome, but do not spend equally on inactive sections simply to preserve symmetry. Interview useful guild leaders, remove stale schedules, and answer recurring public questions with first-hand material.

Evaluate IndexNow or reporting imports only if there is enough publication/reporting work to justify them. Consider more sophisticated event tooling only when the existing group posts are demonstrably inadequate.

### Days 61-90: assess competitive progress and retention

Review non-brand and head-term visibility, regional demand, accurate AI citations, recurring activities, and retained participation. Expand what attracts people who stay. Consolidate genuinely redundant material and correct stale claims. Consider Discord Discovery only when all eligibility requirements are actually met.

The day-90 deliverable is an evidence-based growth decision, not a promise of number one. A search position without a healthy community would fail the actual goal.

## 12. Verification and Release Gates

This research pass made documentation changes only. The live audit is not a substitute for testing future implementation.

For an approved engineering batch:

- Run focused tests for attribution, date handling, guide metadata, and invitation error states, then the relevant existing lint, typecheck, unit, and build checks.
- Verify key content, canonical URLs, robots behavior, structured data consistency, and invitation destinations without JavaScript.
- Review desktop and mobile screenshots at 1440px, 768px, and 390px widths, plus a narrow 320px layout check. Ensure new factual sections do not obscure the hero, move the invitation unexpectedly, or overflow.
- Verify keyboard navigation, accessible screenshot descriptions, empty and unavailable states, and no private details in public examples.
- Test actual sample links and publish only approved records. Confirm failed Discord lookups do not become fabricated live counts or new verification dates.
- Preserve private report/evidence authorization and existing noindex boundaries. Search work must not expose sensitive submissions.
- Deploy through the established PM2 release process only when requested, then repeat public smoke checks. DNS/account verification and third-party submissions require the owner's account actions; do not mark them complete merely because the plan exists.

## 13. What We Deliberately Will Not Do

- Guarantee a Google position or a universal ChatGPT recommendation.
- Buy members, reviews, backlinks, or manufactured "independent" mentions.
- Publish KFC's combined roster as the new Discord's membership.
- Create dozens of near-identical pages, hidden AI prompts, or an unsupported "official" label.
- Turn griefing allegations, player names, or private reports into search-acquisition content.
- Change domain/TLD or rebuild the design without evidence of a problem.
- Treat current absence from a discovery query as proof of a penalty or exclusion.
- Add bot setup, paid SEO tooling, or a complex admin integration as a prerequisite for welcoming people.

**First decision after this plan:** proceed with S01 and the community onboarding immediately; then approve the small S02/C03/M01 website batch once real channel details, host coverage, and screenshots exist. That addresses the observed gaps before investing in further infrastructure.
