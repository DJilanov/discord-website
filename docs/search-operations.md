# Search and Community Operations

Updated September 29, 2026. This operating checklist complements the implemented website work, not a promise of first place.

## Search Account Handoff

The owner confirmed that `wowforeverdiscord.online` is verified in Google Search Console. The earlier link to `www.jilanov.com` referred to another property; never submit this site's sitemap against that property. Verification method and inspection results have not been accessed by the website.

1. Select the property covering `https://www.wowforeverdiscord.online/` in Search Console. A Domain property covers subdomains; URL-prefix properties must cover the canonical www HTTPS URL.
2. Submit `https://www.wowforeverdiscord.online/sitemap.xml`. Record the submission date, fetch status and discovered URLs. Discovery is not indexing.
3. Inspect `/`, `/discord`, `/discord/eu`, `/discord/na`, and `/guides/join-wow-forever-discord`. Check live fetch, indexing reason and Google-selected canonical. Request indexing for these genuinely changed pages once; do not repeatedly submit every day.
4. Verify or import the same site in Bing Webmaster Tools and submit the sitemap there. Bing verification is not yet confirmed.
5. Use `/admin/settings` only if a public verification meta value is needed. DNS verification continues to work without Cloudflare. Keep account passwords and API secrets out of the CMS.

[Google ownership instructions](https://support.google.com/webmasters/answer/9008080), [Google sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), and [Bing verification help](https://www.bing.com/webmasters/help/add-and-verify-site-12184f8b).

Implementation-time correction to earlier research: the current [Google AI features documentation](https://developers.google.com/search/docs/appearance/ai-features) describes AI feature traffic within Search Console's Web performance reporting. Do not assume a separate generative-AI impressions report or an inclusion switch exists in this account. Record only reports actually available, with their documented scope. No special AI schema or text file is required for Google AI features.

## Community Launch Work

- Welcome the intended members; publish only actual Discord API counts, never the planned cohort as a current total.
- Put consenting organizer handles and their responsibilities in `/admin/settings`. Region assignments are owner-confirmed, but public handles and service hours were not supplied. Do not promise 24/7 coverage.
- Ask three to five real guilds for permission to submit complete listings. Review them with the same standards as the organizing guild.
- Arrange two real sessions with hosts, dates, time zones and a practical purpose. Game groups use the group form. A Discord-only welcome belongs in an announcement or a genuine News article, not a falsely labelled raid.
- Members can read other members' Discord report and appeal posts. Pin the privacy distinction and redirect sensitive evidence to website forms. Public allegations are not reviewed website findings.
- Publish a recap only after something happened, with consenting participants and actual outcomes. The `News` category is separated from evergreen guides automatically.

## Permission-Based Outreach

Review each destination's current rules before requesting a listing. Do not create extra accounts, mass-post, buy links, or describe a self-submission as an independent recommendation. No requests have been submitted or approved by this release.

Suggested short request to a relevant Discord directory or community-list maintainer:

> I help organize WoW Forever Discord, an independent community welcoming Alliance and Horde players interested in PvE, PvP and RP. We have EU and NA organizers and separate faction recruitment and LFG spaces. Our permanent invitation page is https://www.wowforeverdiscord.online/discord. The team also organizes KFC, but joining this server does not require joining that guild. Would this community fit your listing criteria? Happy to provide the details you require.

First destinations: the relevant r/classicwow community list, Wowhead's Discord directory, and a permissioned announcement in our own existing community. Do not claim directory acceptance, verified membership counts or Blizzard affiliation. Prefer the stable invitation page over screenshots of an invite.

Owned-community campaign link:

`https://www.wowforeverdiscord.online/discord?utm_source=kfc_discord&utm_medium=community&utm_campaign=forever_launch`

Log each request's date, destination, permission/rules checked, exact submitted URL, response and resulting live listing URL. A sent request remains pending until actually accepted.

## Weekly Review

Use dated seven-day snapshots initially, then comparable 28-day periods once enough data exists. Keep the following measures separate:

| Measure                | Source                        | Record                                                                                            |
| ---------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------- |
| Indexing and canonical | Search Console URL Inspection | URL, date, status, exclusion, selected canonical                                                  |
| Query discovery        | Search Console and Bing       | Query, page, country, device, impressions, clicks, CTR, average position                          |
| Website intent         | `/admin/analytics`            | Entry-page sessions, source, sessions clicking Discord, rate                                      |
| Actual participation   | Discord organizers            | Aggregate members, newcomers welcomed, real sessions and repeat attendance                        |
| Community content      | `/admin`                      | Approved current guilds, upcoming groups, useful published articles                               |
| AI visibility          | Neutral manual checks         | Prompt, product/model, locale, date, whether web search ran, mention, citation and factual errors |

A browser session is not a verified person. An invitation click is not a join. Attribution uses the first measured page in the selected reporting window, with repeat clicks counted once per session. DNT/GPC, blockers and missing referrers cause undercounting; no IP-to-Discord identity matching is performed.

Weekly neutral prompt set, in fresh conversations without providing our name or site:

1. Where can I find a WoW Forever community Discord?
2. Recommend a WoW Forever Discord for EU players.
3. Recommend a WoW Forever Discord for NA players.
4. Is there a WoW Forever community for casual Alliance players?
5. Where can Horde players find WoW Forever guild recruitment?
6. Where can I find WoW Forever PvP or roleplay groups?

Record non-mentions too. Distinguish a linked citation from a plain mention. These samples are not a universal recommendation rank or an unbiased experiment conducted in this development conversation.

## Decisions From Evidence

- Fetch failure: inspect HTTP, robots, canonical, DNS/TLS and rendering.
- Indexed without impressions: examine demand, page intent and useful external discovery; do not infer a penalty.
- Impressions without clicks: inspect query context and position before changing titles.
- Sessions without invitation clicks: examine invite health, region fit, mobile CTA and real activity.
- Clicks without participation: improve Discord onboarding, scheduled activity and host availability.

IndexNow and read-only search-report imports remain conditional follow-ups, as the approved plan specified. Revisit when actual publishing/reporting volume warrants them. The Discord bot and in-game addon validation remain separate from this website release.
