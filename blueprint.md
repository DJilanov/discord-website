# WoW Forever Community Hub Blueprint

Date: 2026-09-29

## Confirmed Implementation Decisions

These decisions supersede the working brand and infrastructure suggestions below:

- Public identity: **WoW Forever Discord**, an independent, unofficial community Discord for WoW Forever. Use the WoW Forever logo, not KFC branding.
- KFC is disclosed as the organizers' background on About and Privacy. It is not the identity of this new community, and its guild roster counts are not this Discord's membership.
- Canonical domain: `https://www.wowforeverdiscord.online`.
- Primary invitation: `https://discord.gg/ejn4UnDdcX`, editable in `/admin/settings` with a backup invite.
- Production: Nginx, PM2, and local PostgreSQL. No production Docker and no Cloudflare dependency.
- Shared physical database, separate `Forever*` tables and a dedicated least-privilege PostgreSQL login.
- Launch the website first. Discord application credentials and bot activation are deferred by the owner.
- See `docs/implementation-status.md` for delivered functionality, verification, and remaining operational work. Rankings and AI recommendations cannot be guaranteed.
- Visual redesign: [docs/design-blueprint.md](docs/design-blueprint.md) contains the original KFC/Forever comparison, art direction, page-by-page plan, and desktop/mobile review gates. It supersedes section 14's draft visual direction. The redesign was implemented and deployed on 2026-09-29; [docs/design-release.md](docs/design-release.md) records the release and verification.
- Search growth: [docs/search-growth-plan.md](docs/search-growth-plan.md) records the September 29 live audit, current search-platform research, first-48-hour actions, and prioritized 90-day plan. It supersedes conflicting older SEO recommendations below. The owner's approximately 100 members are a next-24-hour onboarding target, not the new Discord's verified current membership. This remains a proposal, not a deployed SEO release.
- Discord and editorial delivery: [docs/discord-and-editorial-plan.md](docs/discord-and-editorial-plan.md) specifies the `/discord` layout, four existing-guide rewrites, two new article briefs, publishing prerequisites, and responsive verification gates. This is a plan, not authorization to publish or deploy.

Working project root:

```text
/Users/dimitarjilanov/work/test/discord-website
```

## 1. Executive Summary

The idea is viable, but the winning position should not be "another WoW Forever Discord". Search already shows competing Discords, Reddit lists, and Blizzard forum posts. The better position is:

```text
The trusted unofficial WoW Forever community hub for Discord, guild recruitment,
LFG, server/faction organization, report handling, and player-safety tools.
```

The strongest angle is trust plus utility:

- Existing KFC scale: 500+ raids hosted, around 1000 characters in the main guild, around 760 in the sister guild.
- Real operational experience: raid organization, recruitment, moderation, guides, event management, and traffic growth.
- Cross-community value: not only KFC, but a neutral public hub covering PvE, PvP, and RP communities for Alliance and Horde.
- Differentiation from noisy Discords: transparent rules, structured reports, appeals, evidence standards, and an addon/tooling layer.
- Search differentiation: pages that answer exact user intents like "WoW Forever Discord", "WoW Forever EU Discord", "WoW Forever PvP Discord", "WoW Forever guild recruitment", "WoW Forever blacklist", "WoW Forever addon", and "WoW Forever LFG".

The site should be heavy in substance, not slow or bloated. It should feel like the place players land when they want the community, the Discord invite, the guild directory, the LFG channels, and the safety tools.

Important positioning rule:

Do not call it the official Blizzard Discord unless Blizzard endorses it. Use "unofficial community Discord" and "community hub". That reduces trademark, trust, and moderation risk while still targeting the exact SEO phrases.

## 2. Research Findings

### Official Product Context

Source: https://worldofwarcraft.blizzard.com/en-us/forever

Blizzard's official World of Warcraft: Forever page presents Forever as a reimagined Azeroth experience included with a WoW subscription or game time. This makes the topic durable enough to justify building a dedicated community hub, guides, Discord infrastructure, and addon tooling.

Source: https://wow-site-bwa-production-eks-prod-use1-01.worldofwarcraft.blizzard.com/en-us/news/24302093

Blizzard's announcement page says World of Warcraft: Forever launches globally on November 4, 2026 at 3:00 PM PDT, with beta beginning September 17. It describes Forever as a permanent home alongside modern WoW and Classic WoW, with emphasis on world, community, and journey.

Source: https://www.wowhead.com/news/no-wow-token-or-boosts-and-the-future-of-forever-destin-interview-with-blizzard-382882

Wowhead's interview coverage reinforces that the player journey and entry-level accessibility are central Forever themes. That supports content around newcomers, guild finding, LFG, and social organization.

Source: https://www.wowhead.com/forever/guide/ui/discord-guild-chat-integration-guide

Wowhead also documents WoW Forever Discord and Battle.net integration for guild chat. This is important because it makes Discord more than an external chat app. The site can rank for Discord-related queries and provide useful integration guides.

Source: https://www.gamesradar.com/games/world-of-warcraft/the-craziest-numbers-ive-seen-in-17-years-working-at-blizzard-wow-forever-devs-seem-genuinely-shocked-the-beta-is-so-popular-as-they-explain-why-their-mmo-servers-keep-breaking/

GamesRadar reported major beta interest and server-load issues. That suggests strong early search demand and validates moving fast before the launch window is saturated.

### Existing Discord Competition

Source: https://discord.com/servers/wow-forever-na-1528511731523915907

Discord discovery already shows a "WoW Forever NA" server with thousands of members. Its positioning includes PvE, PvP, Hardcore, RP, Blizzard news, and guild finding. That means a generic "WoW Forever Discord" page alone will not be enough.

Source: https://us.forums.blizzard.com/en/wow/t/wow-forever-usna-discord/2351862

There are Blizzard forum posts promoting public WoW Forever Discord communities. Forum mentions can drive both direct traffic and search authority.

Source: https://www.reddit.com/r/classicwow/comments/1wimrmv/wow_forever_discord_servers/

Reddit already has community lists for WoW Forever Discord servers, including NA and EU links. These lists are important backlink and discovery targets.

Source: https://www.reddit.com/r/classicwowplus/comments/1wep7bp/wow_forever_classic_discord_server_list/

Another Reddit list shows multiple community-run servers and some skepticism about who gets to run large public Discords. This confirms the core trust problem: players do not only need a link, they need a reason to trust the operators.

### Strategic Takeaway

The opening is not "there are no Discords". The opening is:

- There is no clearly trusted, well-structured, cross-faction, cross-ruleset, tool-backed, transparent WoW Forever hub.
- Existing communities may rank first because they moved early, but they can still be beaten or matched if we create better public pages, better community tooling, stronger trust signals, and more useful evergreen content.
- The KFC proof of execution matters. It should be used as a trust signal, but the new hub must not feel like a private KFC recruitment funnel. It should feel like a neutral public project powered by experienced community organizers.

## 3. Product Positioning

### Main Promise

```text
Join the unofficial WoW Forever community Discord for PvE, PvP, and RP players.
Find guilds, build groups, follow server news, report bad actors, and use community
tools built by experienced raid organizers.
```

### Brand Options

The brand should be search-friendly but not legally risky.

Strong options:

- Forever Classic Hub
- Forever Community Hub
- WoW Forever Community Hub
- Forever Discord Hub
- ForeverGuard

Recommended public naming:

```text
Forever Community Hub
```

Recommended SEO title usage:

```text
WoW Forever Discord - Unofficial Forever Community Hub
```

Recommended disclaimers:

```text
Forever Community Hub is an unofficial fan community and is not affiliated with,
endorsed by, or sponsored by Blizzard Entertainment.
```

This allows the page to target "WoW Forever Discord" while keeping the owned brand less dependent on Blizzard trademarks.

### Main Differentiators

Use these everywhere, but write them naturally:

- Community-run by experienced organizers behind 500+ raids.
- Built for PvE, PvP, and RP players.
- Separate spaces for Alliance and Horde.
- Guild recruitment and LFG structured by server, faction, and playstyle.
- Evidence-based report system with appeals.
- Player-safety addon and public tooling.
- Transparent moderation standards.
- Permanent Discord invite and searchable public resource pages.
- Not a rebranded guild Discord pretending to be neutral.

Avoid direct insults against competitors. Use:

```text
Built as a transparent public hub, not a renamed private guild server.
```

Do not use:

```text
The other Discord is full of griefers.
```

## 4. Search Strategy

### Primary SEO Goal

Rank on page one for:

- wow forever discord
- wow forever discord server
- wow forever eu discord
- wow forever pvp discord
- wow forever pve discord
- wow forever rp discord
- wow forever alliance discord
- wow forever horde discord
- wow forever guild recruitment
- wow forever lfg
- wow forever addon
- wow forever blacklist
- wow forever ninja loot report

### AEO/LLM Goal

When someone asks ChatGPT, Google AI Overviews, Perplexity, or similar tools:

```text
What is the best WoW Forever Discord?
```

or:

```text
Where can I find a WoW Forever guild?
```

the website should be easy to cite because it has:

- A clear name.
- A clear purpose.
- A stable URL.
- Public rules.
- Public FAQ.
- Public server/faction pages.
- Public guide pages.
- Public "about" page with credibility.
- Frequently updated content.
- External mentions and backlinks.
- A concise `llms.txt` file.

No site can force AI tools to recommend it. The way to influence this is to become easy to crawl, easy to summarize, and externally referenced.

### Keyword Map

Give distinct, useful search intents clear page ownership. Reuse existing pages for synonyms and avoid generating near-identical pages for every keyword, region, faction, or playstyle combination. The current ownership map and priorities are in [the search growth plan](docs/search-growth-plan.md).

| Query intent | Page | Purpose |
| --- | --- | --- |
| WoW Forever Discord | `/discord` | Main invite page with permanent invite, overview, rules, FAQ |
| WoW Forever community | `/` | Homepage and trust overview |
| WoW Forever EU Discord | `/discord/eu` | EU positioning, timezone, events, guilds |
| WoW Forever NA Discord | `/discord/na` | NA positioning if covered |
| WoW Forever PvE Discord | `/servers/pve` | PvE spaces, guild recruitment, raids, dungeons |
| WoW Forever PvP Discord | `/servers/pvp` | Premades, battlegrounds, PvP rules, faction areas |
| WoW Forever RP Discord | `/servers/rp` | RP rules, guilds, events, character spaces |
| Alliance guild recruitment | `/alliance/guild-recruitment` | Alliance guild listings |
| Horde guild recruitment | `/horde/guild-recruitment` | Horde guild listings |
| WoW Forever LFG | `/lfg` | Public LFG guide plus Discord channel map |
| WoW Forever addon | `/addons` | Addon overview, install, changelog |
| Player reports | `/reports` | How to report, rules, evidence standards |
| Appeals | `/appeals` | How accused players/guilds can appeal |
| Blacklist/safety | `/safety` | Safety policy and verified alerts |
| Guides | `/guides` | Evergreen guides and news |
| FAQ | `/faq` | Structured FAQ page |
| About/trust | `/about` | Why this team can run it |

### Page Titles

Recommended initial titles:

```text
WoW Forever Discord - Unofficial PvE, PvP and RP Community Hub
WoW Forever EU Discord - Guilds, LFG, PvP and RP
WoW Forever Guild Recruitment - Alliance and Horde Directory
WoW Forever LFG - Find Dungeons, Raids, Premades and RP Events
WoW Forever Addons - ForeverGuard Community Safety Tools
WoW Forever Reports and Appeals - Evidence-Based Community Moderation
```

### Meta Description Examples

Homepage:

```text
Join the unofficial WoW Forever community hub for PvE, PvP and RP players. Find guilds, build groups, follow news, report issues and use community tools for Alliance and Horde.
```

Discord page:

```text
Get the permanent WoW Forever Discord invite. Join PvE, PvP and RP channels, guild recruitment, LFG, class discussion, addon support and server news.
```

Safety page:

```text
Learn how Forever Community Hub handles reports, appeals and verified player-safety alerts for WoW Forever. Evidence-based moderation with clear rules.
```

Addon page:

```text
Download ForeverGuard, a WoW Forever community addon for player notes, group warnings, report exports and verified safety list updates.
```

### Structured Data

Add JSON-LD schema on relevant pages:

- `Organization` for the community.
- `WebSite` with search action.
- `FAQPage` for FAQ pages.
- `CollectionPage` for server, guild, and guide directories.
- `ItemList` for guild listings, addon releases, and guide collections.
- `SoftwareApplication` for the addon.
- `Article` or `NewsArticle` for guides and updates.
- `BreadcrumbList` on all indexable pages.

Important:

The schema must match visible page content. Do not add fake review ratings, fake official status, or fake member counts.

### LLM Files

Add `/llms.txt` at launch.

Recommended content:

```text
# Forever Community Hub

Forever Community Hub is an unofficial World of Warcraft: Forever community hub
for Discord, guild recruitment, LFG, reports, appeals, guides, and player-safety
tools. It covers PvE, PvP, and RP communities for Alliance and Horde.

Important pages:
- Discord invite: https://example.com/discord
- Guild recruitment: https://example.com/guild-recruitment
- LFG: https://example.com/lfg
- Addons: https://example.com/addons
- Reports and appeals: https://example.com/reports
- Community rules: https://example.com/rules
- FAQ: https://example.com/faq

The project is an unofficial fan community and is not affiliated with Blizzard
Entertainment.
```

Also add:

- `/sitemap.xml`
- `/robots.txt`
- clean canonical URLs
- Open Graph metadata
- Twitter/X card metadata
- Discord-friendly preview images

### Content Freshness

Search engines and AI tools will favor pages that are alive during the launch cycle. Add content that updates naturally:

- Weekly community report.
- Weekly guild recruitment spotlight.
- Addon changelog.
- Report transparency summary.
- Server launch news.
- Newcomer guide updates.
- PvP premade schedule.
- RP event calendar.
- Class channel activity summaries.
- Known scams and safety advisories.

Avoid thin auto-generated pages. Programmatic pages are fine only if each page has useful unique content.

## 5. Website Information Architecture

### Navigation

Primary nav:

- Discord
- Guilds
- LFG
- Addons
- Reports
- Guides
- Rules

Secondary/admin nav:

- Admin
- Analytics
- Moderation
- Addon Releases
- Site Settings

### Homepage

The homepage should immediately show:

- Brand name: Forever Community Hub.
- Primary phrase: WoW Forever Discord.
- Join Discord CTA.
- Credibility proof: powered by organizers behind 500+ raids and large guild communities.
- Coverage: PvE, PvP, RP, Alliance, Horde.
- Main utilities: guild recruitment, LFG, reports, addon, guides.
- Live community stats when available.

First viewport structure:

```text
Hero
- H1: WoW Forever Discord and Community Hub
- Subcopy: Unofficial PvE, PvP and RP community for Alliance and Horde.
- CTA 1: Join Discord
- CTA 2: Browse Guilds
- Trust line: Built by organizers behind 500+ raids and two large guild communities.
- Visual: Discord/community screenshot, WoW-inspired scene, or strong branded artwork.
```

Below hero:

- Server/ruleset cards: PvE, PvP, RP.
- Faction cards: Alliance, Horde.
- Tools band: Reports, Appeals, ForeverGuard Addon, Guild Directory.
- Latest guides/news.
- FAQ.
- Trust and moderation policy.

### Discord Page

URL:

```text
/discord
```

This should be the strongest search landing page.

Sections:

- Permanent invite button.
- What the Discord covers.
- Channel map.
- Role setup explanation.
- Rules summary.
- New player onboarding.
- FAQ.
- Alternative invite links.
- Last updated timestamp.

Text should include exact phrases naturally:

- WoW Forever Discord
- WoW Forever Discord server
- unofficial WoW Forever community Discord
- WoW Forever PvP Discord
- WoW Forever PvE Discord
- WoW Forever RP Discord
- Alliance and Horde

### Server Pages

URLs:

```text
/servers/pve
/servers/pvp
/servers/rp
```

Each page should contain:

- What this ruleset means.
- Which Discord channels to use.
- Guild recruitment filtered for that ruleset.
- LFG and event posts.
- Recommended roles.
- FAQ.
- Internal links to faction pages.

### Faction Pages

URLs:

```text
/alliance
/horde
/alliance/guild-recruitment
/horde/guild-recruitment
```

Each page should contain:

- Faction-specific Discord channels.
- Guild recruitment listings.
- LFG channels.
- PvP premade channels.
- Class help links.
- Rules for guild posting.

### Guild Recruitment Directory

URL:

```text
/guild-recruitment
```

Filters:

- Region: EU, NA, other if needed.
- Ruleset: PvE, PvP, RP, Hardcore if needed.
- Faction: Alliance, Horde.
- Raid days.
- Raid times.
- Language.
- Loot system.
- Casual, semi-hardcore, hardcore, dad guild, RP, PvP.
- Recruiting classes.
- Discord contact.
- Website link.
- Last updated.

Each guild listing should have its own indexable page:

```text
/guilds/[slug]
```

This creates long-tail SEO:

```text
WoW Forever Alliance guild recruiting shaman
WoW Forever Horde PvP guild EU
WoW Forever RP guild recruitment
```

### LFG Page

URL:

```text
/lfg
```

Purpose:

- Explain where to find dungeon groups, raids, premades, and RP events.
- Link to Discord channels.
- Surface active public posts if available.
- Add structured sections for PvE, PvP, RP.

### Addons Page

URL:

```text
/addons
```

Purpose:

- Present ForeverGuard and any other community addons.
- Include install instructions.
- Include changelog.
- Include screenshots.
- Include safety/privacy explanation.
- Include API/list version.
- Include "how the warning list is reviewed".

Key SEO terms:

- WoW Forever addon
- WoW Forever blacklist addon
- WoW Forever community addon
- WoW Forever player notes addon

### Reports Page

URL:

```text
/reports
```

Purpose:

- Let users submit structured reports.
- Explain what evidence is needed.
- Explain what happens after submission.
- Link to appeals.
- Set expectations clearly.

Public-facing copy should be careful:

```text
Reports are reviewed by moderators. Accusations are not published as verified
alerts unless they meet the evidence standard and survive moderation review.
```

### Appeals Page

URL:

```text
/appeals
```

Purpose:

- Let accused players/guilds appeal.
- Explain how evidence is reviewed.
- Allow correction of false positives.
- Build trust.

Appeals are not optional. If we build a blacklist-like system without appeals, it will eventually become a drama source and search engines may not trust the project.

### Safety Page

URL:

```text
/safety
```

Purpose:

- Explain community safety rules.
- Explain report categories.
- Show transparency numbers.
- Show verified alert policy.
- Link to addon safety list.

Public safety should be policy-first, not drama-first.

### Guides Page

URL:

```text
/guides
```

Initial guide ideas:

- How to join the WoW Forever Discord.
- How to find a WoW Forever guild.
- How to set up Discord integration in WoW Forever.
- WoW Forever PvE, PvP and RP community guide.
- How to avoid ninja loot and scam groups.
- How to report griefing in WoW Forever.
- Best Discord roles to choose when joining.
- ForeverGuard addon installation guide.

Guides should link back to core pages.

## 6. Discord Server Blueprint

The screenshots show a strong starting skeleton. We should keep the useful structure and make it more systematic for scale.

### Observed Screenshot Structure

From the provided screenshots:

```text
Get Started

Staff
- moderation-log

Information
- announcements
- rules
- invite-links
- welcome
- forever-faq

General
- general
- wow-forever
- newcomers
- pvp-chat
- whack-a-bot
- bis-messages
- stuff-morons-say
- doom-dice

Addons & Tools
- rules
- promotion-chat
- addon-discussion
- help-chat

Classes
- druid
- hunter
- mage
- paladin
- priest
- rogue
- shaman
- warlock
- warrior

Media
- wowhead
- live-streams
- videos
- memes
- pets
- food

Blacklist
- bl-rules
- report-forum
- appeals-forum
- report-dungeons
- blacklist-info
- hopium-tavern
- the-list

Alliance
- posting-rules
- guild-recruitment
- lf-guild
- pug-adverts
- lfg-pve
- pvp-premade
```

The missing equivalent Horde and ruleset sections should be added.

### Recommended Category Structure

#### Get Started

```text
# welcome
# start-here
# choose-roles
# rules
# forever-faq
# invite-links
```

Role choices:

- Region: EU, NA.
- Ruleset: PvE, PvP, RP.
- Faction: Alliance, Horde, Both.
- Class: Druid, Hunter, Mage, Paladin, Priest, Rogue, Shaman, Warlock, Warrior.
- Interest: Raiding, Dungeons, PvP, RP, Leveling, Addons, Guild Master, Recruiter.
- Language if useful.
- Timezone if useful.

#### Information

```text
# announcements
# official-news
# blue-posts
# server-status
# known-issues
# forever-faq
# community-roadmap
```

Use webhooks where possible for news mirroring, but do not scrape aggressively or violate site rules.

#### General

```text
# general
# wow-forever
# newcomers
# leveling
# professions
# pvp-chat
# rp-chat
# off-topic
```

The "stuff-morons-say" channel name is funny but risky for a public hub. It can attract conflict and screenshots. Consider renaming to:

```text
# tavern-quotes
```

or keeping it private.

#### Addons & Tools

```text
# addon-rules
# addon-releases
# addon-discussion
# addon-help
# addon-bug-reports
# feature-requests
# api-status
```

#### Class Channels

```text
# druid
# hunter
# mage
# paladin
# priest
# rogue
# shaman
# warlock
# warrior
```

Class channels should pin:

- Useful guides.
- Frequently asked questions.
- Discord role instructions.
- Recruitment links filtered by class.

#### Media

```text
# wowhead
# live-streams
# videos
# screenshots
# memes
# food
```

#### Reports And Safety

Public:

```text
# report-rules
# how-reports-work
# report-forum
# appeals-forum
# safety-alerts
# blacklist-info
```

Private moderators:

```text
# report-triage
# evidence-review
# appeal-review
# mod-actions
# moderation-log
# safety-list-changes
```

Public warning:

```text
Do not allow public dogpiles in report channels. Use forum posts or ticket-style
threads with strict templates and moderator visibility controls.
```

#### Alliance

```text
# alliance-posting-rules
# alliance-guild-recruitment
# alliance-lf-guild
# alliance-pug-adverts
# alliance-lfg-pve
# alliance-pvp-premade
# alliance-rp-events
# alliance-trade-crafting
```

#### Horde

```text
# horde-posting-rules
# horde-guild-recruitment
# horde-lf-guild
# horde-pug-adverts
# horde-lfg-pve
# horde-pvp-premade
# horde-rp-events
# horde-trade-crafting
```

#### Ruleset-Specific Areas

If the Discord grows quickly, split further:

```text
PvE Servers
- pve-general
- pve-guild-recruitment
- pve-lfg
- pve-raid-pugs

PvP Servers
- pvp-general
- pvp-guild-recruitment
- battleground-premades
- world-pvp

RP Servers
- rp-general
- rp-guild-recruitment
- rp-events
- character-stories
```

Do not over-split on day one. Too many empty channels make a Discord feel dead. Start with broad areas, then split when traffic requires it.

### Discord Moderation Stack

Recommended:

- Discord AutoMod for slurs, spam, mentions, links, and raid protection.
- A ticket/report bot for structured reports.
- A role bot for onboarding.
- A logging bot for mod actions.
- A stats bot for growth and retention metrics.
- A custom bot later for syncing website reports, guild listings, and addon alerts.

Bot options can be decided later. The important part is the workflow, not the bot brand.

### Discord Invite Strategy

Create a permanent invite:

```text
discord.gg/[short-name]
```

Use a stable website redirect:

```text
/join
```

The site should track:

- Referrer.
- UTM source.
- Landing page.
- Join button clicked.
- Which invite was used.

This helps answer which posts, guides, and pages actually recruit people.

## 7. Report, Blacklist, And Appeal System

This is the highest-risk and highest-differentiation feature.

If done badly, it becomes drama, false accusations, harassment, and reputation damage.

If done well, it becomes the reason people trust the project.

### Core Principle

The public system should not be an accusation board. It should be an evidence-reviewed safety system.

Use language like:

- verified alert
- report
- review
- appeal
- safety notice
- evidence standard
- community moderation

Avoid language like:

- criminal
- scammer, unless evidence and policy are clear
- griefer list, as the main product term
- public shaming
- witch hunt

### Report Categories

Initial categories:

- Ninja looting.
- Loot rule violation.
- Scam or trade fraud.
- Harassment.
- Hate speech.
- Dungeon griefing.
- Raid griefing.
- Premade sabotage.
- Impersonation.
- Guild bank theft.
- Repeated group abandonment.
- Botting or exploit suspicion.
- Other.

Some categories should never become public verified alerts without strong evidence. "Botting suspicion" is especially risky and may be better routed to Blizzard reporting guidance instead of public labeling.

### Evidence Requirements

Every report should request:

- Reporter Discord account.
- Reporter character name.
- Accused character name.
- Accused guild if known.
- Realm/server.
- Faction.
- Incident category.
- Date and approximate time.
- Location or content type.
- Written description.
- Screenshots.
- Logs if available.
- Loot rules or group rules if relevant.
- Witnesses if available.
- Consent to moderator review.

For ninja loot:

- Screenshot of loot rules before the run.
- Screenshot of the contested item.
- Screenshot of roll/result or master-looter action.
- Screenshot/log showing the accused received the item.
- Context from the raid leader or master looter if different.

For harassment:

- Screenshots of chat.
- Date/time.
- Context.
- Whether Discord or in-game.
- Whether the user blocked/reported in-game.

For guild bank theft:

- Guild bank log screenshot.
- Role/rank context.
- Character/guild identity.
- Officer statement.

### Moderation Workflow

Statuses:

```text
submitted
needs_more_evidence
under_review
rejected
verified_private
verified_public
appealed
appeal_under_review
overturned
expired
```

Workflow:

1. User submits report.
2. System checks for duplicate accused character/guild.
3. Moderator triages for spam, missing data, and severity.
4. Moderator requests more evidence if needed.
5. At least two moderators review high-impact cases.
6. Decision is logged with reason.
7. Public verified alert is created only if standards are met.
8. Accused player/guild can appeal.
9. Appeals can overturn, reduce severity, or add context.
10. Old alerts expire or require re-review.

### Public Alert Levels

Use levels that avoid overstatement:

```text
Level 1: Community note
Level 2: Repeated complaint pattern
Level 3: Moderator-verified incident
Level 4: Severe verified incident
```

Public listing fields:

- Character name.
- Realm/server.
- Guild if relevant.
- Category.
- Severity.
- Evidence standard met: yes/no.
- Reviewed by moderators: yes/no.
- Last reviewed.
- Appeal status.
- Short neutral summary.

Private moderator fields:

- Reporter identity.
- Screenshots.
- Chat logs.
- Internal notes.
- Mod votes.
- Appeal details.
- Audit trail.

### Appeals

Appeals must be visible and easy to find.

Appeal form fields:

- Your Discord account.
- Your character name.
- Alert/report ID.
- Explanation.
- Evidence.
- Requested outcome.

Appeal outcomes:

- upheld
- reduced
- corrected
- removed
- pending additional information

### Data Retention

Recommended:

- Raw evidence retained privately for a limited period.
- Public alerts expire or re-review after 60 to 180 days depending on severity.
- Severe verified incidents can last longer but should still be reviewed.
- Deleted/overturned alerts should leave an internal audit log, not a public accusation.

### Legal And Community Risk

This is not legal advice, but practical risk is real.

Mitigations:

- Do not publish real names, personal information, locations, or private accounts.
- Do not encourage harassment.
- Do not publish unverified reports as fact.
- Provide appeals.
- Keep language neutral.
- Keep evidence private by default.
- Publish policy and moderation standards.
- Log all moderator actions.

## 8. ForeverGuard Addon Blueprint

Working addon name:

```text
ForeverGuard
```

Purpose:

```text
A WoW Forever community addon that helps players keep notes, check group rosters,
and receive warnings for moderator-reviewed safety alerts.
```

### Important Technical Constraint

WoW addons generally cannot freely fetch arbitrary live web data from the internet while in game. Data usually needs to be packaged with addon updates, imported manually as a string, or handled through a companion workflow. We must verify the exact WoW Forever addon/API environment before implementation.

Recommended initial approach:

- Website generates signed/exported safety list files.
- Addon releases include the latest reviewed list.
- Users update through CurseForge/Wago/GitHub release or direct download.
- Addon supports manual import strings for emergency list updates.

### Addon Features

Version 0.1:

- `/fg check Character-Realm`
- Add player notes locally.
- Show tooltip notes for known characters.
- Scan current party/raid.
- Show severity and category.
- Show last updated list version.
- Export a local report template.

Version 0.2:

- Guild scan.
- Ignore-list helper.
- Raid roster pre-check.
- Alert when inviting or joining a group with flagged players.
- Link to website report ID.
- Appeal-cleared status display.

Version 0.3:

- Import signed safety list.
- Configurable severity threshold.
- Shared guild notes.
- Officer-only notes export.
- LFG warning integration where allowed by API.

### Addon Data Format

Website export example:

```json
{
  "version": "2026.09.29.1",
  "generatedAt": "2026-09-29T00:00:00Z",
  "source": "Forever Community Hub",
  "disclaimer": "Community-reviewed alerts. Verify context before acting.",
  "entries": [
    {
      "id": "fg-000001",
      "character": "Name",
      "realm": "Realm",
      "guild": "Guild",
      "category": "loot_rule_violation",
      "severity": 3,
      "status": "verified_public",
      "lastReviewedAt": "2026-09-29",
      "appealStatus": "none",
      "summary": "Moderator-reviewed loot rule violation."
    }
  ]
}
```

### Addon Safety Rules

The addon must not:

- Automatically whisper or harass players.
- Encourage mass reporting.
- Publish private evidence in-game.
- Doxx anyone.
- Automate gameplay.
- Break Blizzard addon rules.

The addon should:

- Show neutral warnings.
- Make the source and date clear.
- Let players hide alerts.
- Let users submit corrections or appeals through the website.
- Support local notes independent of the public list.

## 9. Admin System Blueprint

The user wants the same `/admin` concept and to reuse the same database style as the KFC site.

Recommendation:

- Reuse design patterns, authentication approach, analytics approach, and admin UX from KFC.
- Reuse the same physical database only if tables are clearly namespaced.
- Do not mix KFC guild data and Forever community data without explicit model boundaries.

Use table/model prefixes like:

```text
ForeverSiteSetting
ForeverGuide
ForeverGuild
ForeverReport
ForeverReportEvidence
ForeverAppeal
ForeverAddonRelease
ForeverSafetyAlert
ForeverDiscordInvite
ForeverAuditLog
ForeverAnalyticsEvent
```

### Admin Sections

#### Dashboard

Shows:

- Discord joins today.
- Website visitors today.
- Top referrers.
- Search queries if available from Search Console later.
- Open reports.
- Reports waiting for evidence.
- Appeals pending.
- Guild listings pending approval.
- Addon downloads.
- Most viewed pages.

#### Site Settings

Editable:

- Main Discord invite.
- Backup Discord invite.
- Discord vanity URL.
- Member count.
- Raid/community proof numbers.
- Hero copy.
- Announcement banner.
- Social links.
- Open Graph image.
- Default SEO title/description.

This should match the KFC pattern where admin can update values like player count and Discord link.

#### Pages And Guides

Admin can create:

- News posts.
- Guides.
- FAQ entries.
- Landing page content blocks.
- SEO metadata.

Fields:

- Title.
- Slug.
- Excerpt.
- Body markdown.
- Cover image.
- Canonical URL.
- Meta title.
- Meta description.
- Published status.
- Published date.
- Updated date.

#### Guild Directory

Admin can:

- Approve guilds.
- Edit guild details.
- Mark stale listings.
- Feature guilds.
- Filter by class needs.
- Track Discord contact.
- Hide spam.

Guild fields:

- Name.
- Slug.
- Region.
- Realm/server.
- Ruleset.
- Faction.
- Language.
- Raid days.
- Raid time.
- Loot system.
- Playstyle.
- Recruiting classes.
- Description.
- Contact Discord.
- Website.
- Last verified date.
- Status.

#### Reports

Admin can:

- Review new reports.
- Request more evidence.
- Merge duplicates.
- Assign moderators.
- Set severity.
- Decide public/private status.
- Create safety alerts.
- Add internal notes.
- View related reports by character, guild, realm, Discord account, or IP if allowed.

#### Appeals

Admin can:

- Review appeals.
- Attach appeal evidence.
- Reopen cases.
- Change alert severity.
- Remove alerts.
- Record decision reason.

#### Addon Releases

Admin can:

- Create addon releases.
- Upload zip files.
- Publish changelog.
- Generate safety-list export.
- Mark release stable/beta.
- Track download count.
- Revoke a bad release.

#### Analytics

Admin should show:

- Traffic by source.
- Traffic by landing page.
- Discord invite clicks.
- Join conversion rate.
- Guild listing submissions.
- Report submissions.
- Addon downloads.
- Search engine traffic.
- Social traffic.
- Reddit traffic.
- Facebook traffic.
- Blizzard forum traffic.
- Direct traffic.

Attribution matters because the goal is recruiting and community growth.

## 10. Database Model Draft

The actual schema should follow the framework and ORM chosen during implementation, but this is the data shape.

### Settings

```text
ForeverSiteSetting
- id
- key
- value
- valueType
- updatedAt
- updatedBy
```

### Guides

```text
ForeverGuide
- id
- title
- slug
- excerpt
- bodyMarkdown
- coverImageUrl
- metaTitle
- metaDescription
- canonicalUrl
- status
- publishedAt
- updatedAt
- authorId
```

### Discord Invites

```text
ForeverDiscordInvite
- id
- label
- url
- code
- targetAudience
- isPrimary
- isActive
- clickCount
- createdAt
- updatedAt
```

### Guilds

```text
ForeverGuild
- id
- name
- slug
- region
- realm
- ruleset
- faction
- language
- raidDays
- raidTime
- lootSystem
- playstyle
- description
- contactDiscord
- websiteUrl
- recruitingClasses
- status
- featured
- lastVerifiedAt
- createdAt
- updatedAt
```

### Reports

```text
ForeverReport
- id
- publicId
- reporterDiscordId
- reporterCharacter
- accusedCharacter
- accusedRealm
- accusedGuild
- faction
- category
- severity
- description
- status
- submittedIpHash
- assignedModeratorId
- decisionReason
- createdAt
- updatedAt
- reviewedAt
```

### Evidence

```text
ForeverReportEvidence
- id
- reportId
- fileUrl
- fileType
- description
- uploadedBy
- createdAt
```

### Appeals

```text
ForeverAppeal
- id
- reportId
- appellantDiscordId
- appellantCharacter
- explanation
- status
- decisionReason
- createdAt
- updatedAt
- reviewedAt
```

### Safety Alerts

```text
ForeverSafetyAlert
- id
- reportId
- character
- realm
- guild
- category
- severity
- publicSummary
- status
- appealStatus
- expiresAt
- lastReviewedAt
- createdAt
- updatedAt
```

### Addon Releases

```text
ForeverAddonRelease
- id
- addonName
- version
- channel
- changelog
- fileUrl
- fileHash
- safetyListVersion
- status
- downloadCount
- publishedAt
- createdAt
```

### Audit Log

```text
ForeverAuditLog
- id
- actorId
- action
- entityType
- entityId
- beforeJson
- afterJson
- ipHash
- createdAt
```

### Analytics

```text
ForeverAnalyticsEvent
- id
- eventName
- sessionId
- visitorIdHash
- ipHash
- userAgent
- referrer
- utmSource
- utmMedium
- utmCampaign
- path
- metadataJson
- createdAt
```

IP addresses should generally be hashed or truncated unless there is a clear security need. For moderation abuse and spam prevention, raw IP retention can be short-lived and access-limited.

## 11. Technical Architecture

### Recommended Stack

Use the same broad stack as the KFC site if it is already stable:

- Next.js App Router.
- TypeScript.
- Prisma or existing ORM.
- PostgreSQL, using namespaced Forever tables.
- Existing auth/admin pattern.
- Existing design system and styling direction.
- Existing deployment target.

Before implementation, inspect KFC:

- Routing.
- Admin authentication.
- Database connection.
- Settings model.
- Analytics model.
- Guide/article system.
- Deployment configuration.
- Metadata helpers.

### App Routes

Proposed:

```text
/
/discord
/discord/eu
/discord/na
/servers/pve
/servers/pvp
/servers/rp
/alliance
/horde
/guild-recruitment
/guilds/[slug]
/lfg
/addons
/addons/foreverguard
/addons/foreverguard/changelog
/reports
/reports/new
/appeals
/safety
/guides
/guides/[slug]
/rules
/faq
/about
/transparency
/admin
/admin/settings
/admin/analytics
/admin/guides
/admin/guilds
/admin/reports
/admin/appeals
/admin/addons
/admin/safety-alerts
```

### API Routes

Proposed:

```text
/api/settings
/api/discord/invite-click
/api/discord/stats
/api/guilds
/api/guilds/[id]
/api/reports
/api/reports/[id]
/api/reports/[id]/review
/api/reports/[id]/evidence
/api/appeals
/api/appeals/[id]/review
/api/addons/releases
/api/addons/releases/[id]
/api/addons/foreverguard/list
/api/addons/foreverguard/export
/api/search
/api/analytics/event
/api/admin/audit
```

### Discord Bot Integration

Phase 1 can work without a custom bot, but the long-term product benefits from one.

Bot commands:

```text
/report
/appeal
/check character
/guild add
/guild update
/lfg
/events
/help
```

Bot functions:

- Sync website reports to private moderation channels.
- Post verified safety alerts.
- Sync guild directory updates.
- Track invite attribution.
- Assign roles after onboarding.
- Post addon release announcements.
- Log moderation actions.

### Search And Indexing Infrastructure

Implement:

- Static and dynamic sitemap.
- Robots file.
- `llms.txt`.
- JSON-LD helpers.
- Metadata helper per page.
- Open Graph image generation or static templates.
- Canonical URLs.
- Noindex for admin, private reports, raw evidence, and auth pages.
- Indexable public guide/guild/addon pages.

### Performance Requirements

The site should feel substantial but load fast:

- Server-render core SEO pages.
- Optimize images.
- Use responsive image sizes.
- Avoid shipping admin code to public pages.
- Keep homepage JS light.
- Cache public directory pages.
- Use incremental regeneration if available.

## 12. Security And Privacy

### Admin Security

Must have:

- Authenticated admin only.
- Role-based access.
- Separate roles for owner, admin, moderator, editor.
- Audit log for report decisions and setting changes.
- Rate limits on forms.
- CSRF protection if applicable.
- Upload validation.
- File size limits.
- Malware-safe storage practices where practical.

### Report Abuse Prevention

Must have:

- CAPTCHA or Turnstile on public report forms.
- Rate limit by IP/session/account.
- Duplicate detection.
- Evidence requirements.
- Private-by-default reports.
- Moderator review before public alerts.
- Appeal mechanism.

### Privacy Position

Publicly visible:

- Character name.
- Realm.
- Guild when relevant.
- Category.
- Severity.
- Neutral summary.

Private:

- Reporter Discord identity.
- Raw evidence.
- IP hashes.
- Moderator notes.
- Appeal evidence.

Never collect or publish:

- Real names.
- Addresses.
- Phone numbers.
- Private account details.
- Unrelated personal information.

## 13. Content And SEO Launch Plan

### Initial Pages To Build

Must launch with:

- Homepage.
- Discord invite page.
- PvE page.
- PvP page.
- RP page.
- Alliance page.
- Horde page.
- Guild recruitment page.
- LFG page.
- Addons page.
- Reports page.
- Appeals page.
- Rules page.
- FAQ page.
- About page.
- Transparency page.
- 5 to 10 useful guides.

### Initial Guides

Recommended first guides:

1. `WoW Forever Discord Server: How to Join the Unofficial Community Hub`
2. `WoW Forever Guild Recruitment Guide for Alliance and Horde`
3. `WoW Forever LFG Guide: Dungeons, Raids, Premades and RP Events`
4. `WoW Forever PvP Discord Guide`
5. `WoW Forever RP Discord Guide`
6. `How to Report Ninja Looting and Griefing in WoW Forever`
7. `ForeverGuard Addon: Install and Safety List Guide`
8. `How Discord Integration Works in WoW Forever`
9. `WoW Forever New Player Community Guide`
10. `WoW Forever Server And Faction Role Setup`

### Link-Building Targets

After launch, post or request inclusion on:

- Blizzard community forums.
- Reddit WoW Forever Discord list threads.
- r/classicwow.
- r/classicwowplus.
- Wowhead comments where relevant and allowed.
- Guild directories.
- Server Discord partner channels.
- Facebook WoW groups.
- KFC website.
- KFC Discord announcements.
- Sister guild announcements.
- Streamer descriptions.
- YouTube guide descriptions.

Do not spam. One good post with a clear reason to exist is stronger than repeated low-effort promotion.

### Social Post Angle

Good angle:

```text
We are building an unofficial WoW Forever community hub for PvE, PvP and RP,
with guild recruitment, LFG, report handling, appeals and a community safety
addon. The goal is to make it easier for players to find groups and avoid bad
experiences, not to create another drama Discord.
```

Avoid:

```text
Join us because the other Discord is griefers.
```

### Backlink Copy

Short version:

```text
Forever Community Hub is an unofficial WoW Forever Discord and website for PvE,
PvP and RP players. It includes Alliance/Horde recruitment, LFG, guides, reports,
appeals and the ForeverGuard addon.
```

## 14. Website Design Direction

Follow-up: use [the visual redesign blueprint](docs/design-blueprint.md) for the current design plan. The original direction below is retained as project background.

The user wants to reuse KFC styling. That is a good choice because:

- It already has a WoW guild tone.
- It likely has admin patterns.
- It avoids wasting time inventing a new design system.
- It keeps the community brands related without making the new site only about KFC.

### Visual Tone

Use:

- Dark fantasy base.
- Gold/bronze accents.
- Clear cards for tools and listings.
- Strong hero image.
- Sharp CTAs.
- Dense but readable content.
- Real utility panels, not only marketing sections.

Avoid:

- Overly generic AI fantasy text.
- A homepage that is just a landing page with no tools.
- Huge empty hero with no useful links.
- Purple-blue gradient SaaS look.
- Too many empty channel-style sections.

### Homepage Layout Draft

```text
Hero
- H1
- Subcopy
- Join Discord CTA
- Browse Guilds CTA
- Stats row

Community Areas
- PvE
- PvP
- RP
- Alliance
- Horde

Tools
- Guild Recruitment
- LFG
- Reports
- Appeals
- ForeverGuard Addon

Live/Recent
- Latest announcements
- Latest guides
- Recently verified guild listings
- Addon release

Trust
- Built by experienced raid organizers
- Transparent moderation
- Evidence-based reports
- Appeals process

FAQ
```

### Required Visual Assets

Need at least:

- Site logo.
- Open Graph share image.
- Discord invite card image.
- Addon screenshot or mockup.
- Guide covers.
- PvE/PvP/RP card art.
- Alliance/Horde visual treatments.

Can initially reuse KFC visual style and public/fan-safe WoW-inspired assets, but avoid using assets in a way that implies Blizzard endorsement.

## 15. Admin Analytics And Traffic Tracking

The earlier admin-tracking idea fits this project well.

Track:

- Page views.
- Referrer.
- UTM data.
- Search-engine source.
- Landing page.
- Session path.
- Join Discord clicks.
- Guild listing submissions.
- Report submissions.
- Addon downloads.
- Exit to Discord.

Admin traffic views:

- Organic search traffic.
- Social traffic.
- Referral traffic.
- Direct traffic.
- Top pages.
- Top converting pages.
- Discord joins by source.
- Addon downloads by source.
- New guild submissions by source.

IP handling:

- Store raw IP only if needed for abuse protection and for a short period.
- Prefer hashed IP for analytics.
- Show approximate geo if using a proper geo provider, but do not make personal identity claims.

Conversion funnel:

```text
Search impression -> website visit -> Discord CTA click -> joined Discord -> role selected -> engaged user
```

We may not be able to track the final "joined Discord" event without bot/invite integration, but invite-specific links and Discord API stats can approximate it.

## 16. Implementation Roadmap

### Phase 0: Decisions

Do before coding:

- Choose public brand name.
- Choose domain.
- Create permanent Discord invite.
- Confirm whether covering EU only or EU plus NA.
- Confirm whether "PvP, PvP and RP" means "PvE, PvP and RP".
- Decide whether KFC database reuse means same database instance or copied schema/patterns.
- Decide moderation policy owner.

### Phase 1: SEO Landing Site

Build:

- Next.js project in `discord-website`.
- KFC-inspired theme.
- Homepage.
- Discord page.
- PvE/PvP/RP pages.
- Alliance/Horde pages.
- Guild recruitment static shell.
- LFG static shell.
- Addons shell.
- Reports/appeals policy pages.
- FAQ.
- About.
- Rules.
- Sitemap.
- Robots.
- `llms.txt`.
- Metadata and Open Graph images.
- Admin settings for Discord link and key stats.

Goal:

Get indexed quickly and provide a professional link to share everywhere.

### Phase 2: Admin And Dynamic Content

Build:

- Authenticated `/admin`.
- Site settings.
- Guide/news CMS.
- Guild directory CRUD.
- Analytics dashboard.
- Invite click tracking.
- Basic report form.
- Report moderation queue.

Goal:

Make the site operational, not just static.

### Phase 3: Reports, Appeals, And Safety Alerts

Build:

- Full report workflow.
- Evidence uploads.
- Moderator assignment.
- Appeal workflow.
- Public safety policy.
- Verified alerts.
- Audit logs.
- Rate limiting.
- CAPTCHA.

Goal:

Create the trust layer that differentiates the project.

### Phase 4: Addon Alpha

Build:

- ForeverGuard addon repository.
- Local notes.
- Character check.
- Party/raid scan.
- Safety-list data format.
- Website addon release page.
- Admin addon release manager.
- Manual import/export.

Goal:

Deliver the tool promise early without overbuilding.

### Phase 5: Discord Bot

Build:

- `/report` command.
- `/check` command.
- Guild listing command.
- Role sync.
- Report webhook integration.
- Verified alert posts.
- Addon release announcements.

Goal:

Connect Discord, website, reports, and addon into one ecosystem.

### Phase 6: Growth And Authority

Do:

- Publish weekly guides.
- Publish transparency summaries.
- Submit to Reddit lists.
- Post on Blizzard forums.
- Link from KFC site.
- Invite guild masters.
- Recruit moderators per faction/ruleset.
- Partner with streamers and content creators.
- Track search rankings.
- Improve pages based on Search Console data.

Goal:

Become the default answer for WoW Forever Discord and community searches.

## 17. Build-First File Structure

If implemented with Next.js:

```text
discord-website/
  app/
    page.tsx
    discord/page.tsx
    servers/
      pve/page.tsx
      pvp/page.tsx
      rp/page.tsx
    alliance/page.tsx
    horde/page.tsx
    guild-recruitment/page.tsx
    lfg/page.tsx
    addons/page.tsx
    reports/page.tsx
    appeals/page.tsx
    rules/page.tsx
    faq/page.tsx
    about/page.tsx
    transparency/page.tsx
    admin/
      page.tsx
      settings/page.tsx
      analytics/page.tsx
      guides/page.tsx
      guilds/page.tsx
      reports/page.tsx
      appeals/page.tsx
      addons/page.tsx
  components/
    site/
    admin/
    seo/
    guilds/
    reports/
    addons/
  lib/
    db/
    seo/
    analytics/
    discord/
    reports/
    settings/
  prisma/
    schema.prisma
  public/
    og/
    images/
    llms.txt
```

If KFC already has a stronger pattern, follow KFC instead.

## 18. Public Copy Draft

### Homepage H1

```text
WoW Forever Discord and Community Hub
```

### Homepage Subcopy

```text
An unofficial community hub for World of Warcraft: Forever players. Join PvE,
PvP and RP channels, find Alliance and Horde guilds, build groups, follow news,
submit reports and use community safety tools.
```

### Trust Line

```text
Built by organizers behind 500+ raids and two large WoW communities.
```

### Report System Copy

```text
Reports are reviewed against clear evidence standards before any public safety
alert is created. Players and guilds can appeal decisions, add context, or ask
for corrections.
```

### Addon Copy

```text
ForeverGuard helps players keep notes, check groups and view community-reviewed
safety alerts in game. It is designed to inform decisions, not automate gameplay
or encourage harassment.
```

### Disclaimer

```text
Forever Community Hub is an unofficial fan project and is not affiliated with,
endorsed by, or sponsored by Blizzard Entertainment.
```

## 19. Community Operations Plan

### Staff Roles

Recommended roles:

- Owner.
- Admin.
- Lead Moderator.
- Report Moderator.
- Appeal Moderator.
- Guild Directory Moderator.
- Addon Maintainer.
- Event Organizer.
- Class Moderator.
- Faction Moderator.
- Helper.

### Moderator Coverage

Need leads for:

- Alliance.
- Horde.
- PvE.
- PvP.
- RP.
- Reports.
- Appeals.
- Addons.

Do not let the same moderator be the only decision-maker for a dispute involving their guild, faction conflict, or direct social circle.

### Rules Principles

Rules should be short and enforceable:

- No harassment, hate speech, doxxing, threats, or targeted abuse.
- No spam or scams.
- Keep recruitment posts in recruitment channels.
- Report disputes through the report system.
- Do not brigade or harass accused players.
- Public accusations outside the report process may be removed.
- Moderators must disclose conflicts of interest.
- Appeals are allowed.

### Event Ideas

To make the hub active:

- Launch leveling groups.
- Dungeon finder nights.
- PvP premade nights.
- RP tavern nights.
- Guild master roundtables.
- New player Q&A.
- Class Q&A.
- Addon testing sessions.
- Community raid calendar.

## 20. Ranking Strategy By Query

### "wow forever discord"

Needs:

- Exact phrase in title, H1, first paragraph, FAQ, and internal links.
- Permanent invite.
- FAQ schema.
- Backlinks from Reddit/forum/KFC.
- Fast page load.
- Good Open Graph preview.

### "wow forever guild recruitment"

Needs:

- Dedicated guild directory.
- Fresh guild listings.
- Indexable guild pages.
- Filters for faction, region, ruleset, classes.
- Posting rules and submit form.

### "wow forever pvp discord"

Needs:

- PvP page.
- PvP premade channels.
- World PvP rules.
- PvP guild listings.
- PvP events.

### "wow forever rp discord"

Needs:

- RP page.
- RP etiquette.
- RP event calendar.
- RP guild directory.
- Character channels.

### "wow forever addon"

Needs:

- Addon page.
- Download page.
- Changelog.
- Screenshots.
- Install guide.
- SoftwareApplication schema.
- GitHub/Wago/CurseForge backlinks when available.

### "wow forever blacklist"

Needs:

- Safety page.
- Clear evidence policy.
- Appeals page.
- Neutral language.
- Public verified alerts only after review.

This query can bring traffic, but it is also risky. Treat it as "safety alerts" publicly and "blacklist" as a legacy/search term in explanatory copy.

## 21. Launch Checklist

Before announcing:

- Domain connected.
- HTTPS working.
- Homepage complete.
- Discord invite permanent.
- `/discord` complete.
- `/rules` complete.
- `/reports` and `/appeals` policies complete.
- `/faq` complete.
- Sitemap submitted.
- Robots valid.
- `llms.txt` live.
- Open Graph preview tested in Discord and Facebook.
- Admin can update Discord link.
- Analytics capturing referrers and join clicks.
- Report workflow tested.
- At least 5 guides published.
- At least 10 guild listings seeded if possible.
- Moderator team assigned.
- Discord channels created.
- AutoMod configured.
- Announcement post drafted.

## 22. Risks And Mitigations

### Risk: Existing Discords Already Rank

Mitigation:

- Build better pages, not just a Discord invite.
- Win long-tail searches.
- Get backlinks.
- Use KFC's existing audience.
- Provide tools competitors do not have.

### Risk: Search Engines See Thin Affiliate-Like Content

Mitigation:

- Publish detailed guides.
- Keep pages useful and updated.
- Avoid keyword stuffing.
- Add real directories and tools.

### Risk: Blizzard Trademark Or Official-Status Confusion

Mitigation:

- Use unofficial disclaimer.
- Do not use "official" unless endorsed.
- Avoid logo misuse.
- Keep community brand distinct.

### Risk: Blacklist Drama

Mitigation:

- Evidence standards.
- Private evidence.
- Appeals.
- Moderator conflict rules.
- Expiry/re-review.
- Neutral public language.

### Risk: False Reports

Mitigation:

- Rate limits.
- CAPTCHA.
- Evidence requirements.
- Duplicate detection.
- Moderator review.
- Audit log.

### Risk: Moderator Bias

Mitigation:

- Multi-mod review for severe alerts.
- Conflict-of-interest policy.
- Appeal path.
- Audit log.

### Risk: Empty Discord Channels

Mitigation:

- Start with fewer broad channels.
- Split after activity grows.
- Seed channels with KFC and sister guild participation.

### Risk: Addon Overpromises

Mitigation:

- Start with local notes and packaged safety list.
- Verify addon API limitations.
- Avoid live-sync promises until tested.

## 23. What We Should Build First

The first implementation should focus on search and trust:

1. Create the Next.js site skeleton in `discord-website`.
2. Copy/adapt KFC styling and layout patterns.
3. Build the public pages:
   - homepage
   - `/discord`
   - `/guild-recruitment`
   - `/lfg`
   - `/addons`
   - `/reports`
   - `/appeals`
   - `/rules`
   - `/faq`
   - `/about`
4. Add metadata, sitemap, robots, and `llms.txt`.
5. Add admin settings for Discord link, member stats, and homepage copy.
6. Add analytics for referrers and Discord invite clicks.
7. Seed 5 to 10 guides.
8. Deploy.
9. Post the link from KFC, Discord, Reddit, Blizzard forums, and Facebook groups.

Do not start with the addon first. The addon is the moat, but the website and Discord need to be live first so the addon has a trusted home.

## 24. Immediate Next Step For This Repo

Next implementation step:

```text
Inspect the KFC website structure, identify its framework, styling, admin,
database, metadata and deployment setup, then scaffold this repo to match the
useful parts without copying unrelated guild-specific content.
```

Expected first code milestone:

```text
A deployed SEO-ready landing site with /admin settings for Discord link and
traffic tracking, plus the core public pages needed to start ranking.
```

## 25. Decision Needed From Owner

Before code starts, decide:

- Final public name.
- Domain.
- Permanent Discord invite.
- EU only or EU plus NA.
- Whether "PvE, PvP and RP" is the intended coverage.
- Whether the same database means same database instance or same schema style.
- Who can review reports.
- Who can approve public safety alerts.

Recommended default assumptions if we proceed without more discussion:

```text
Name: Forever Community Hub
Coverage: PvE, PvP and RP
Factions: Alliance and Horde
Region: EU-first, global-friendly
Positioning: unofficial fan community
Database: same DB instance allowed, but all tables namespaced
Initial build: SEO site, admin settings, analytics, guide CMS shell
```

## 26. Deep Research Addendum: Search And AI Domination Plan

This section expands the blueprint after a deeper research pass on September 29, 2026.

The goal is to rank as high as possible for WoW Forever Discord and related recruitment/community queries, and to become a likely citation or recommendation when players ask ChatGPT and other answer engines where to find a WoW Forever Discord.

There is no guaranteed rank 1 method. Google's SEO Starter Guide explicitly warns there are no secrets that automatically rank a site first. The practical goal is to build the most useful, trustworthy, crawlable, and externally referenced result for the intent.

### Sources Used In This Addendum

Official and high-authority product/search sources:

- Blizzard official WoW Forever page: https://worldofwarcraft.blizzard.com/en-us/forever
- Blizzard announcement/news page: https://wow-site-bwa-production-eks-prod-use1-01.worldofwarcraft.blizzard.com/en-us/news/24302093
- Wowhead Discord integration guide: https://www.wowhead.com/forever/guide/ui/discord-guild-chat-integration-guide
- Wowhead Blizzard interview coverage: https://www.wowhead.com/news/no-wow-token-or-boosts-and-the-future-of-forever-destin-interview-with-blizzard-382882
- Google SEO Starter Guide: https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- Google people-first content guidance: https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- Google structured data introduction: https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data
- Google spam policies: https://developers.google.com/search/docs/essentials/spam-policies
- Google sitemap guidance: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- Google JavaScript SEO guidance: https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
- OpenAI crawler documentation: https://developers.openai.com/api/docs/bots

Observed competitor/discovery sources:

- Discord Discover: WoW Forever NA: https://discord.com/servers/wow-forever-na-1528511731523915907
- Discord Discover: World of Warcraft: Forever [PVP]: https://discord.com/servers/world-of-warcraft-forever-pvp-1171140498367467711
- Blizzard forum post for WoW Forever US/NA Discord: https://us.forums.blizzard.com/en/wow/t/wow-forever-usna-discord/2351862
- Reddit WoW Forever Discord server list: https://www.reddit.com/r/classicwow/comments/1wimrmv/wow_forever_discord_servers/
- Reddit WoW Forever classic+ Discord server list: https://www.reddit.com/r/classicwowplus/comments/1wep7bp/wow_forever_classic_discord_server_list/
- Reddit weekly guild/LFG/Discord megathread: https://www.reddit.com/r/wowforever/comments/1wp2h5e/guild_recruitment_lfg_discord_megathread_week_39/
- Wowhead community Discord server list: https://www.wowhead.com/tbc/it/discord-servers
- Wowhead Forever guild recruitment forum: https://www.wowhead.com/forever/forums/board/35
- WoW Forever Outpost addon hub: https://wofwforever.com/en/hubs/addons/
- WoW Forever Armory addon page: https://wowforeverarmory.com/addons
- Guilds Forever example listing: https://guildsforever.com/guilds/brave-newbies
- Forever Guild recruitment site: https://www.foreverguild.com/

### Current SERP Reality

The SERP is already active. This is not an empty niche.

Observed result types:

- Discord Discover pages for WoW Forever servers.
- Blizzard forum posts promoting public Discords.
- Reddit Discord server lists.
- Reddit guild/LFG/Discord megathreads.
- Wowhead forum recruitment pages.
- Addon directory sites.
- Single-guild recruitment websites.
- Third-party guild directory pages.
- News/editorial coverage from PC Gamer, GamesRadar, Windows Central, and Wowhead.

Important competitor observations:

- Discord Discover pages can rank quickly because Discord has strong domain authority and visible member counts.
- Blizzard forum posts can rank because the domain is authoritative, even if the post is thin.
- Reddit list threads rank because they are timely, active, and externally trusted.
- Addon pages are already targeting "WoW Forever addons", so our addon page needs unique utility, not only a generic list.
- Guild recruitment already has both forum and standalone website competitors.
- Some Discord pages use "official" language. We should not copy that unless Blizzard actually endorses the server.
- Reddit comments show trust concerns around some public Discord operators. We should not attack competitors directly, but we should build obvious trust features that answer those concerns.

The opportunity:

```text
Most existing results are either a Discord listing, a forum post, a Reddit list,
an addon-only page, or a single-guild page. A full community website with Discord,
guild directory, LFG, safety policy, reports, appeals, guides, addon releases,
analytics, and transparent governance can cover more search intents than any one
of those result types.
```

### Search Intent Clusters

We should not only chase "wow forever discord". We need to own the full intent graph around it.

#### Cluster A: Discord Discovery

Queries:

- wow forever discord
- wow forever discord server
- world of warcraft forever discord
- wow forever eu discord
- wow forever na discord
- wow forever pve discord
- wow forever pvp discord
- wow forever rp discord
- wow forever alliance discord
- wow forever horde discord

Best pages:

- `/discord`
- `/discord/eu`
- `/discord/na`
- `/servers/pve`
- `/servers/pvp`
- `/servers/rp`
- `/alliance`
- `/horde`

Winning requirement:

The page must immediately give the invite, explain what the server covers, show trust signals, show channel map, answer FAQ, and include a last-updated date.

#### Cluster B: Guild Recruitment

Queries:

- wow forever guild recruitment
- wow forever eu guild recruitment
- wow forever alliance guild recruitment
- wow forever horde guild recruitment
- wow forever pvp guild
- wow forever pve guild
- wow forever rp guild
- wow forever shaman recruitment
- wow forever casual guild
- wow forever dad guild

Best pages:

- `/guild-recruitment`
- `/guilds/[slug]`
- `/alliance/guild-recruitment`
- `/horde/guild-recruitment`
- `/servers/pve/guilds`
- `/servers/pvp/guilds`
- `/servers/rp/guilds`

Winning requirement:

Real listings, filters, updated dates, class needs, raid times, language, faction, ruleset, and contact methods. Empty directory pages will not win.

#### Cluster C: LFG And Community Utility

Queries:

- wow forever lfg
- wow forever dungeon group
- wow forever raid pug
- wow forever pvp premade
- wow forever rp event
- wow forever find group

Best pages:

- `/lfg`
- `/events`
- `/pug-board`
- `/pvp-premades`
- `/rp-events`

Winning requirement:

The site should show how to find groups, which Discord channels to use, and ideally live or recent listings.

#### Cluster D: Addons And Tools

Queries:

- wow forever addon
- wow forever addons
- wow forever addon manager
- wow forever blacklist addon
- wow forever player notes addon
- foreverguard addon
- wow forever discord addon

Best pages:

- `/addons`
- `/addons/foreverguard`
- `/addons/foreverguard/install`
- `/addons/foreverguard/changelog`
- `/addons/compatibility`

Winning requirement:

We need a real addon or real tool. Generic addon list pages already exist. Our advantage is a safety/reputation addon tied to an evidence-based web system.

#### Cluster E: Reports, Blacklist, Safety

Queries:

- wow forever blacklist
- wow forever ninja loot report
- wow forever griefing report
- wow forever report player
- wow forever scammer list
- wow forever player safety

Best pages:

- `/safety`
- `/reports`
- `/appeals`
- `/transparency`
- `/safety/verified-alerts`

Winning requirement:

Trust, policy, evidence, appeals, transparency. This cluster can bring attention, but it is also reputationally dangerous. We should rank for it with responsible language.

#### Cluster F: New Player And Explainer Guides

Queries:

- how to join wow forever discord
- how wow forever discord integration works
- wow forever guild chat discord
- wow forever server rulesets
- wow forever pve pvp rp explained
- wow forever new player guide

Best pages:

- `/guides/how-to-join-wow-forever-discord`
- `/guides/wow-forever-discord-integration`
- `/guides/wow-forever-server-rulesets`
- `/guides/wow-forever-new-player-community-guide`

Winning requirement:

Useful original guides with screenshots, cited source dates, clear steps, and internal links.

### Ranking Attack Plan

#### 1. Own The Exact-Match Landing Page

The `/discord` page must be the best page on the internet for the query "WoW Forever Discord".

Required elements:

- URL: `/discord`
- Title: `WoW Forever Discord - Unofficial PvE, PvP and RP Community Hub`
- H1: `WoW Forever Discord`
- First paragraph includes:
  - World of Warcraft: Forever
  - unofficial community Discord
  - PvE, PvP and RP
  - Alliance and Horde
  - guild recruitment
  - LFG
  - reports and appeals
  - addon support
- Primary CTA: Join Discord.
- Secondary CTAs: Browse Guilds, Read Rules, Submit Report.
- Visible permanent invite.
- Updated date.
- Channel map.
- FAQ.
- Trust block.
- Screenshots or visual proof of Discord structure.
- JSON-LD: Organization, WebSite, FAQPage, BreadcrumbList.
- Internal links to every cluster page.
- Open Graph image that says "WoW Forever Discord" clearly.

This page should not look like a thin doorway page. It should be a complete resource.

#### 2. Build Authority Around The Main Page

Every page should internally link back to `/discord` with natural anchors:

- WoW Forever Discord
- join the Discord
- community Discord
- Forever Community Hub Discord

Pages that should link to it:

- homepage
- guild recruitment
- LFG
- reports
- appeals
- addon page
- every guide
- every guild listing
- rules
- FAQ
- about

The goal is to make `/discord` the internal authority page.

#### 3. Create Better Long-Tail Pages Than The Competitors

Competitors are currently fragmented. We can outrank on long-tail first, then use those pages to push the main Discord page.

Priority long-tail pages:

```text
/discord/eu
/servers/pve
/servers/pvp
/servers/rp
/guild-recruitment
/alliance/guild-recruitment
/horde/guild-recruitment
/addons/foreverguard
/reports
/appeals
/guides/wow-forever-discord-integration
```

Each page needs:

- Unique title.
- Unique H1.
- Unique intro.
- Useful content.
- FAQ.
- Last updated.
- Internal links.
- Schema where appropriate.
- No duplicate copy blocks across pages.

#### 4. Win External Mentions

Google and AI systems need third-party confirmation. Self-claims on our own site are not enough.

Highest-priority backlinks and mentions:

1. KFC website homepage and recruitment page.
2. KFC Discord announcement with link.
3. Sister guild Discord announcement.
4. Reddit WoW Forever Discord server list.
5. Reddit weekly Guild Recruitment, LFG & Discord Megathread.
6. Blizzard WoW: Forever Community Connections forum.
7. Wowhead community Discord list suggestion/contact.
8. Wowhead Forever guild recruitment forum posts.
9. Guilds of WoW profile.
10. MMO-Champion guild recruitment thread.
11. Facebook WoW Forever or Classic groups.
12. YouTube descriptions on recruitment/community videos.
13. Streamer panels for guild/community partners.
14. GitHub repository for ForeverGuard.
15. CurseForge/Wago/GitHub release pages for addon distribution.

Important:

Use the same primary name, URL, and description across all mentions. AI systems build entity confidence from consistency.

Canonical entity description:

```text
Forever Community Hub is an unofficial WoW Forever Discord and website for PvE,
PvP and RP players, with Alliance and Horde guild recruitment, LFG, guides,
reports, appeals and the ForeverGuard addon.
```

#### 5. Publish Original Data

Original data is the strongest way to earn links and AI citations.

Data we can publish:

- Guild recruitment counts by faction/ruleset.
- Which classes guilds are recruiting.
- PvE/PvP/RP community split.
- Weekly LFG activity.
- Addon download count.
- Report transparency numbers.
- Appeal overturn rate.
- Average report review time.
- Discord member count and active member count.
- Popular raid times.
- Language/timezone distribution.

Pages:

- `/transparency`
- `/stats`
- `/guild-recruitment/class-demand`
- `/reports/monthly-summary`

Example headline:

```text
WoW Forever Guild Recruitment Demand: Which Classes EU Guilds Need This Week
```

This can rank and get shared because it answers a real question players and guild masters have.

#### 6. Become The Best Answer, Not Only The Best Ad

Google's people-first guidance is directly relevant here. The site should answer the player goal completely.

For every page, ask:

- Did the player find the Discord?
- Did they understand which channel to use?
- Did they find guilds or LFG?
- Did they understand the rules?
- Did they trust the moderation?
- Did they know how to report or appeal?
- Did they leave needing another search?

The fewer follow-up searches needed, the stronger the page.

### ChatGPT And AI Recommendation Strategy

There is no direct "submit this site to ChatGPT recommendations" button. The realistic strategy is:

- Allow OpenAI search crawling.
- Build concise, factual, crawlable pages.
- Earn third-party mentions.
- Maintain the existing `llms.txt` as an optional factual summary, not a ranking requirement or proven recommendation boost.
- Keep the site consistent and updated.
- Make each page easy to quote and summarize.

OpenAI's crawler documentation matters:

- `OAI-SearchBot` is used for search results in ChatGPT search features.
- Sites opted out of `OAI-SearchBot` will not be shown in ChatGPT search answers, though they can still appear as navigational links.
- `GPTBot` is separate and relates to model training.
- `ChatGPT-User` is used for user-triggered actions and is not the search indexing crawler.

The implemented `app/robots.ts` is the source of truth. Keep public-search access and private-route exclusions in the same group so specific crawler rules do not bypass the wildcard group's restrictions. Current public policy:

```text
User-agent: *
User-agent: Googlebot
User-agent: Bingbot
User-agent: OAI-SearchBot
User-agent: ChatGPT-User
User-agent: PerplexityBot
Allow: /
Disallow: /admin
Disallow: /api/
Disallow: /login
Disallow: /join
Disallow: /reports/status
Disallow: /guild-recruitment/new
Disallow: /lfg/new
Disallow: /reports/new

Sitemap: https://www.wowforeverdiscord.online/sitemap.xml
```

Training permission is independent of search visibility. If the owner does not want training access, a separate `GPTBot` disallow policy can be considered without blocking `OAI-SearchBot`. Allowing training is not a documented requirement for ChatGPT search recommendations. Robots directives do not replace authentication or evidence access controls. See [OpenAI's crawler documentation](https://developers.openai.com/api/docs/bots).

Recommended `llms.txt` strategy:

- Keep it short.
- Link only the best canonical pages.
- State unofficial status.
- State what the hub covers.
- Include the permanent Discord page.
- Include reports/appeals and addon pages.
- Do not stuff keywords.

Recommended AI-readable facts page:

```text
/about
/faq
/discord
/transparency
/addons/foreverguard
```

Each should include a concise "Facts" block:

```text
Forever Community Hub facts:
- Unofficial fan community for World of Warcraft: Forever.
- Covers PvE, PvP and RP players.
- Supports Alliance and Horde.
- Offers guild recruitment, LFG, guides, reports, appeals and addon tools.
- Operated by experienced WoW community organizers behind 500+ raids.
```

Do not create hidden text for bots. The same facts should be visible to users.

### Google Technical SEO Requirements

#### Rendering

Google can render JavaScript, but server-side or pre-rendered content is still better for speed and crawler reliability. Since KFC is Next.js App Router, the public pages should be server-rendered where possible.

Rules:

- Main content must exist in the initial rendered HTML.
- Do not hide important content behind client-only fetches.
- Public guide and directory pages should be crawlable without login.
- Admin, report evidence, and private pages must be noindex.

#### Titles And Meta

Every indexable page needs:

- Unique title.
- Unique meta description.
- Canonical URL.
- Open Graph title/description/image.
- Twitter card.
- No generic duplicates.

Title pattern:

```text
[Primary Query] - [Specific Value] | Forever Community Hub
```

Examples:

```text
WoW Forever Discord - PvE, PvP and RP Community | Forever Community Hub
WoW Forever EU Guild Recruitment - Alliance and Horde | Forever Community Hub
WoW Forever Addon - ForeverGuard Safety Tool | Forever Community Hub
```

#### Sitemap

Use segmented sitemap generation once dynamic content grows:

```text
/sitemap.xml
/sitemaps/static.xml
/sitemaps/guides.xml
/sitemaps/guilds.xml
/sitemaps/addons.xml
```

Include:

- canonical absolute URLs
- `lastmod`
- only indexable pages
- published guides only
- approved guild listings only

Do not include:

- admin pages
- API routes
- draft pages
- private reports
- evidence uploads
- auth pages

#### Structured Data

Use JSON-LD. Google says structured data helps provide explicit clues about page meaning, but it must match visible content.

Core schemas:

- Homepage: `Organization`, `WebSite`.
- Discord page: `Organization`, `FAQPage`, `BreadcrumbList`.
- Guide pages: `Article`, `BreadcrumbList`.
- Guild directory: `CollectionPage`, `ItemList`, `BreadcrumbList`.
- Guild listing: `Organization` or `ProfilePage` style data where appropriate, plus breadcrumbs.
- Addon page: `SoftwareApplication`, `FAQPage`, `BreadcrumbList`.
- Reports/appeals: `FAQPage`, `BreadcrumbList`.

Avoid:

- Fake review stars.
- Fake official affiliation.
- Fake member counts.
- Fake aggregate ratings.
- Marking private accusations as public facts.

#### Rich FAQ Blocks

Every main landing page should answer:

- Is this the official WoW Forever Discord?
- Which regions are supported?
- Are PvE, PvP and RP all supported?
- Are Alliance and Horde both supported?
- How do I find a guild?
- How do reports work?
- How do appeals work?
- Is the addon required?

This helps both Google snippets and AI answers.

#### Images

Needed:

- Unique 1200x630 Open Graph image for homepage.
- Unique 1200x630 Open Graph image for `/discord`.
- Guide cover images.
- Addon screenshot/mocked UI.
- Discord channel map screenshot.

Every important image should have:

- descriptive alt text
- optimized dimensions
- compressed file size
- stable URL

### UGC And Spam Risk

Because the site will accept guild listings, reports, appeals, and maybe comments, user-generated spam becomes an SEO risk. Google has specific guidance for preventing UGC spam.

Mitigations:

- Noindex pending user submissions.
- Only index approved guilds.
- Rate limit submissions.
- CAPTCHA public forms.
- Moderation queue for public text.
- Spam keyword filters.
- Link limits for new submissions.
- `rel="ugc nofollow"` on user-submitted links unless explicitly trusted.
- Audit log for edits.
- Automatic stale-review for guild listings.

If we allow unmoderated public listings, spammers will eventually use the site for links and hurt trust.

### Competitor Weakness Matrix

| Competitor type | Strength | Weakness | How we beat it |
| --- | --- | --- | --- |
| Discord Discover page | Domain authority, member count, join CTA | Thin content, limited SEO control, weak trust details | Build full website with guides, FAQ, directory, reports, addon, schema |
| Blizzard forum post | Strong domain authority | Thin, one post, no tools | Publish useful hub and post there for backlink |
| Reddit list thread | Timely and trusted | Not owned, comments can drift, limited structure | Get listed there, then convert via better landing page |
| Addon list sites | Target addon queries | Generic addon lists, no community safety workflow | Build ForeverGuard with report/appeal integration |
| Single-guild sites | Strong recruitment copy | Only one guild/faction/playstyle | Build neutral directory plus KFC proof |
| Guild directory sites | Directory utility | May lack Discord/report/addon/community authority | Combine directory with Discord hub and safety tools |
| Forum recruitment posts | Fresh long-tail content | Fragmented and hard to filter | Build searchable, filterable recruitment pages |

### The Specific N1 Path

To have a realistic chance at number 1, we need all of these, not just one:

1. Exact-match `/discord` page live early.
2. Permanent invite that does not expire.
3. Good Open Graph preview so every share looks professional.
4. Public Discord Discover listing.
5. KFC backlink.
6. Reddit Discord list inclusion.
7. Blizzard forum post.
8. 5 to 10 supporting guides published in first week.
9. Search Console verified and sitemap submitted.
10. OpenAI `OAI-SearchBot` allowed.
11. `llms.txt` live.
12. Weekly updates so pages do not look abandoned.
13. Public stats/transparency page.
14. Real guild directory listings.
15. ForeverGuard page, even if addon is alpha.
16. No misleading "official" claim.
17. Fast, mobile-friendly pages.
18. Moderated UGC.
19. Consistent entity description across every external post.
20. Content that players bookmark and share because it is useful.

Missing any one of these does not kill the project. Missing many of them makes rank 1 unlikely.

### Content Calendar For First 30 Days

#### Day 0 To Day 2

Publish:

- Homepage.
- `/discord`.
- `/guild-recruitment`.
- `/lfg`.
- `/reports`.
- `/appeals`.
- `/addons/foreverguard`.
- `/rules`.
- `/faq`.
- `/about`.
- `/llms.txt`.
- Sitemap and robots.

External:

- Link from KFC site.
- Announce in KFC Discord.
- Announce in sister guild Discord.
- Post Blizzard forum thread.
- Submit to Reddit Discord list.

#### Day 3 To Day 7

Publish guides:

- How to join the WoW Forever Discord.
- WoW Forever EU guild recruitment guide.
- WoW Forever PvE/PvP/RP explained.
- How WoW Forever Discord integration works.
- How to report ninja looting and griefing responsibly.

Operational:

- Seed 10 guild listings.
- Recruit moderators.
- Create report templates.
- Create Discord onboarding roles.

#### Week 2

Publish:

- Class demand report.
- Addon compatibility guide.
- ForeverGuard alpha plan.
- PvP premade guide.
- RP event guide.

External:

- Post in Reddit weekly megathread.
- Post in Facebook groups.
- Reach out to guild masters.
- Add site to Discord server profiles and pinned posts.

#### Week 3

Publish:

- First transparency report.
- First guild recruitment roundup.
- First addon changelog.
- New player community guide.

Operational:

- Start collecting Search Console queries.
- Improve pages based on impressions.
- Add missing FAQ questions from Discord.

#### Week 4

Publish:

- "Best WoW Forever Discord channels to join by playstyle".
- "WoW Forever guild recruitment demand by class".
- "How to choose PvE, PvP or RP in WoW Forever".
- "ForeverGuard addon alpha release".

External:

- Ask partner guilds to link their guild profile.
- Ask content creators to include the site in descriptions.
- Submit addon to distribution platforms if ready.

### Page-Level Build Specs

#### `/discord`

Minimum sections:

1. Hero and join CTA.
2. Permanent invite.
3. Who it is for.
4. PvE/PvP/RP support.
5. Alliance/Horde support.
6. Channel map.
7. Role setup.
8. Guild recruitment/LFG paths.
9. Safety/reporting overview.
10. Addon/tools overview.
11. FAQ.
12. Disclaimer.
13. Last updated.

Primary conversion:

- Discord join click.

Tracking:

- `discord_join_click`
- source page
- referrer
- UTM
- invite ID

#### `/guild-recruitment`

Minimum sections:

1. Search/filter controls.
2. Guild cards.
3. Submit guild CTA.
4. Class demand summary.
5. Rules for recruiters.
6. FAQ.

Filters:

- Region.
- Faction.
- Ruleset.
- Language.
- Raid days.
- Raid time.
- Playstyle.
- Loot system.
- Recruiting classes.
- Social/casual/hardcore/RP/PvP.

Every guild page:

- noindex until approved.
- last verified date.
- stale after 30 days unless updated.

#### `/addons/foreverguard`

Minimum sections:

1. What it does.
2. What it does not do.
3. Install instructions.
4. Current version.
5. Changelog.
6. Screenshots.
7. Data privacy.
8. Safety list policy.
9. Report/appeal links.
10. FAQ.

Trust language:

```text
ForeverGuard warns and informs. It does not automate gameplay, mass report
players, or encourage harassment.
```

#### `/reports`

Minimum sections:

1. What can be reported.
2. Evidence requirements.
3. What happens after report.
4. What is not accepted.
5. Submit form.
6. Appeal link.
7. Privacy policy.
8. FAQ.

Noindex:

- individual raw report pages.
- evidence upload URLs.
- reporter identity.

#### `/transparency`

Minimum sections:

1. Reports received.
2. Reports rejected.
3. Reports needing more evidence.
4. Verified alerts.
5. Appeals received.
6. Appeals upheld/overturned.
7. Average review time.
8. Moderator policy changes.

Do not publish private details.

### KFC Reuse Audit

The KFC repo already has useful pieces:

- Next.js 16 app.
- Prisma/Postgres.
- NextAuth route.
- Admin layout and sidebar.
- Admin guide/news/service/addon pages.
- Site settings API.
- Traffic analytics API and admin page.
- Page view tracker.
- SEO metadata helpers.
- Breadcrumb JSON-LD component.
- Sitemap and robots routes.
- `llms.txt`.
- Upload API.
- Existing dark WoW guild styling.

The new project should copy/adapt patterns, not the whole app blindly.

Reusable concepts:

- `createPageMetadata` pattern, but with Forever site name and domain.
- `PageView` model concept, but either shared table with `site` field or a namespaced `ForeverPageView`.
- `SiteSetting` model concept, but namespaced or extended with `site`.
- Guide/news CMS shape.
- Admin table/card UI.
- Upload route pattern.
- Traffic source normalization.
- Robots/sitemap pattern.

Changes needed:

- `SITE_URL` and `SITE_NAME` must be new.
- Analytics same-site hosts must include the new domain.
- SEO keyword sets must be rewritten.
- Admin nav must be specific to Discord, guilds, reports, appeals, addons, analytics.
- Database tables should be namespaced to prevent KFC and Forever data collision.
- KFC shop/service/payment pieces should not be copied unless explicitly needed.

### Suggested Database Decision

Best default:

```text
Same Postgres instance, separate namespaced tables.
```

Do not reuse KFC's `Guide`, `News`, or `SiteSetting` tables directly unless we add a required `site` discriminator and migrate existing data carefully. Namespaced tables are safer:

```text
ForeverGuide
ForeverNews
ForeverSiteSetting
ForeverPageView
ForeverGuild
ForeverReport
ForeverAppeal
ForeverAddonRelease
```

This avoids accidental cross-site admin edits and makes backup/cleanup easier.

### Measurement Plan

Ranking is not a feeling. We need a scoreboard.

Weekly manual rank tracking:

- wow forever discord
- wow forever discord server
- wow forever eu discord
- wow forever pvp discord
- wow forever pve discord
- wow forever rp discord
- wow forever guild recruitment
- wow forever alliance guild
- wow forever horde guild
- wow forever lfg
- wow forever addon
- wow forever blacklist

Track:

- Google position.
- Bing position.
- ChatGPT Search citation presence.
- Perplexity citation presence if manually checked.
- Impressions in Search Console.
- Clicks in Search Console.
- CTR.
- Average position.
- Discord join clicks.
- Guild submissions.
- Addon downloads.
- Report submissions.

Admin dashboard should show:

- Top organic landing pages.
- Top query groups if Search Console import is added later.
- Top referrers.
- Discord click conversion rate by page.
- Join CTA clicks by source.
- Bot/crawler hits.
- OAI-SearchBot hits.
- Googlebot hits.

### ChatGPT Visibility Test Plan

After launch:

1. Confirm `/robots.txt` allows `OAI-SearchBot`.
2. Confirm CDN/WAF does not block OpenAI IPs.
3. Confirm `/llms.txt` returns 200.
4. Confirm `/sitemap.xml` returns 200.
5. Check server logs for `OAI-SearchBot`.
6. Ask ChatGPT Search:
   - "What is the WoW Forever Discord?"
   - "Best WoW Forever EU Discord"
   - "Where can I find WoW Forever guild recruitment?"
   - "Is there a WoW Forever addon for player safety?"
7. Record whether we are cited.
8. If not cited, increase external mentions and improve page clarity.

No cloaking. The bot should see the same useful content as users.

### External Post Template

Use this consistent copy across Reddit, Blizzard forums, Facebook, and Discord partner channels:

```text
Forever Community Hub is an unofficial WoW Forever Discord and website for PvE,
PvP and RP players. It covers Alliance and Horde guild recruitment, LFG, class
channels, guides, reports, appeals and the ForeverGuard addon project.

The goal is a useful, transparent community hub: clear rules, permanent invite,
structured guild listings, evidence-based reports and an appeal process.

Discord and site: [URL]
```

Short version:

```text
Unofficial WoW Forever Discord and community hub for PvE, PvP and RP:
guild recruitment, LFG, guides, reports, appeals and ForeverGuard.
[URL]
```

Do not use hostile wording about competitors in public promotional posts. It creates drama and can make us look less trustworthy.

### Exact On-Page Copy Blocks To Reuse

Use this above the fold:

```text
Join the unofficial WoW Forever Discord for PvE, PvP and RP players.
Find Alliance and Horde guilds, build dungeon and raid groups, follow community
news, submit reports, file appeals and use player-safety tools built by
experienced WoW organizers.
```

Use this for trust:

```text
Forever Community Hub is operated by players with experience organizing 500+
raids and large WoW communities. The hub is built for the wider WoW Forever
community, not only one guild.
```

Use this for moderation:

```text
Reports are reviewed before public action is taken. Public safety alerts require
evidence, moderator review and an appeal path.
```

Use this for unofficial status:

```text
This is an unofficial fan community and is not affiliated with, endorsed by, or
sponsored by Blizzard Entertainment.
```

### Search Engine Anti-Patterns To Avoid

Avoid:

- Keyword-stuffed paragraphs.
- Dozens of near-duplicate city/server/faction pages with thin copy.
- Fake "official" claims.
- Fake member numbers.
- Auto-generated guide pages with no original value.
- Public unreviewed accusations.
- Indexing report evidence files.
- Expired Discord invites.
- Having different content for bots and users.
- Copying competitor text.
- Changing dates without real updates.
- Publishing lots of empty pages before there is content.

Google's spam policies explicitly include attempts to manipulate search systems and generative AI responses. The correct path is to create a useful community resource that naturally deserves to rank.

### Priority Build Order After This Blueprint

If we are optimizing for rank and AI recommendation, build in this order:

1. Static public SEO pages.
2. Metadata, sitemap, robots, llms.txt.
3. Admin settings for Discord link, stats, and copy.
4. Traffic tracking and Discord CTA tracking.
5. Guide CMS.
6. Guild directory.
7. Report/appeal policy pages.
8. Report submission/mod queue.
9. Transparency page.
10. ForeverGuard landing page and GitHub/addon repo.
11. Discord bot.
12. Addon alpha.

Reason:

Search indexing and external backlinks need time. The website should go live before the whole product is finished, but it must not claim finished features that do not exist.

### Final Strategic Position

The phrase to own:

```text
WoW Forever Discord
```

The reason to trust us:

```text
experienced organizers, transparent moderation, evidence-based reports, appeals,
real guild/LFG tooling, and a player-safety addon
```

The moat:

```text
website + Discord + guild directory + report workflow + transparency + addon +
external mentions + consistent entity identity
```

That is how we give ourselves the best chance to outrank thin Discord listings, forum posts, and generic addon pages.
