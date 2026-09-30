# WoW Forever Discord: Community Excellence Plan

Research and decision date: September 30, 2026.
Status: researched proposal, not an executed Discord change or public announcement.

This is the operating plan for the community, complementing the
[website/Discord engineering blueprint](web-discord-integration-blueprint.md)
and [pre-migration growth plan](pre-migration-growth-plan.md). It supersedes
older suggestions that more channels, a blacklist, a large membership number,
or more articles alone will establish a leading community.

## 1. Recommendation

Build the easiest place for a WoW Forever player to find compatible people,
join a well-run session, and want to return. Start by delivering that reliably
for a few groups, then expand the hours, regions and activities covered.

Proposed positioning:

> WoW Forever Discord is an independent community for finding guilds, groups
> and people who fit your way of playing. Alliance and Horde, PvE, PvP and RP.
> Clear expectations, friendly hosts, and room for real life.

This is a service promise to earn, not evidence that every region already has
active hosts. Public pages must distinguish supported interests from staffed
sessions. The identity remains WoW Forever Discord, not KFC. KFC experience is
an attributed organizer credential, not a requirement to participate.

Three priorities should dominate the first month:

1. A newcomer finds a relevant next action without understanding 58 channels.
2. A host runs a dependable session with clear expectations and a follow-up.
3. Members can trust that moderation applies equally to staff, KFC and other guilds.

The best growth loop is: useful public resource -> suitable group -> good
shared experience -> return visit or personal recommendation -> another host.
The website and bot make this easier; they cannot manufacture the experience.

## 2. Evidence and Limits

### What Was Actually Inspected

The owner-authorized GET-only audit at 10:26:05 UTC returned 58 channels and
categories, 21 roles, onboarding, guild settings and the bot's own membership.
The returned inventory contains 35 text channels, six announcement channels,
eight forums and nine categories. Seven authenticated GET requests succeeded.

The private snapshot and ID-specific review remain in gitignored storage under
`.data/kfcbot-audits/`. They are configuration evidence, not a complete server
backup. No messages, forum threads, member roster, DMs, attachments, attendance,
moderator actions, AutoMod rules or third-party bot dashboards were collected.
No voice channel was returned; hidden or omitted resources cannot be ruled out.
An empty topic does not prove that a channel lacks pinned guidance.

The automated result of zero high findings and 34 review items is not a
security certification. Manual review is necessary. Actual member activity,
response times, retention and the planned migration are not verified metrics.

Competitor research below uses public pages, accessed September 30. Public
descriptions are self-presentation, not independent validation of community
quality. Displayed membership is a changing snapshot, not weekly active users.
Search results do not establish a stable rank or search volume.

### External App Access

The owner offered read-only comparison of servers they already belong to.
No personal Discord session was accessed during this research. Available
integration discovery did not establish a connected Discord reader. An optional
Opera Browser Connector was suggested but its connection is not confirmed.

Additional evidence should be a bounded, user-led visual walkthrough or
redacted screenshots of named servers' rules, onboarding, channel layout,
event pages and public templates. Do not collect DMs, member lists, private
cases or bulk chat logs. Do not post, join, react, RSVP or change account state
during a comparison. Do not build a personal-account scraper or extract a user
token. Discord prohibits self-bot account automation; bot access to another
server requires that server's authorized installation, not merely our owner's
membership. [Discord self-bot policy](https://support.discord.com/hc/en-us/articles/115002192352-Automated-User-Accounts-Self-Bots),
[developer policy](https://support-dev.discord.com/hc/en-us/articles/8563934450327-Discord-Developer-Policy).

### Owner Decisions That Remain Fixed

- Preserve the intentionally privileged staff role named Rogue, including name,
  permissions, position and assignments. Bind automation to IDs, never role names.
- Preserve both BOT onboarding choices, their IDs, descriptions, BAN-role
  mappings and associated automation. No real-member trap tests.
- Keep the report and appeal forums member-readable. Improve warnings and
  evidence handling without silently changing this policy.
- Maintain standalone Forever branding, cross-guild neutrality, PM2 and local
  PostgreSQL. No Docker or Cloudflare dependency is introduced.
- Do not publish raw accusations to the website or addon automatically.

## 3. Competitive Landscape

The market is not empty. A generic all-in-one Discord duplicates existing
offers. These are observed alternatives and operating benchmarks, not a
ranking of their internal communities.

| Alternative | Public evidence | Implication for us |
| --- | --- | --- |
| [WoW Forever EU PvP](https://discord.com/servers/wow-forever-eu-pvp-1082345255367614495) | Roughly 15,000 displayed members; recruitment, faction areas, PvE/PvP organization, trade and social content. The public page lists a 2023 server creation date. | We cannot distinguish ourselves by adding these same channel names. Compete on response, dependable hosts and usable listings. Creation date is not proof of Forever-specific operating history. |
| [WoW Forever NA](https://discord.com/servers/wow-forever-na-1528511731523915907) | Roughly 10,000 displayed members; broad PvE/PvP/Hardcore/RP scope, guild finding and news. | Broad coverage already exists. Publish actual NA organizer availability before claiming equivalent service. Its moderation quality was not audited. |
| [Regional and ruleset communities](https://www.reddit.com/r/classicwow/comments/1wimrmv/wow_forever_discord_servers/) | A curated list includes EU/NA PvE and RP options, EU PvP/Hardcore and OCE. EU [PvE](https://discord.com/invite/ASmxbfPmXQ) and [RP](https://discord.com/invite/xVznWqMFuA) invite pages confirm those names, not their internal activity. | A specialist community may serve its niche better. Become a useful connecting hub and partner; do not insist that people abandon other servers. |
| [Guilds Forever](https://guildsforever.com/) | A purpose-built directory exposes region, ruleset, faction, language, schedule, recruitment needs and freshness information. Matching/saving are advertised; authenticated workflows were not tested. | A wall of recruitment text is insufficient. Schedule fit, complete information and a contact who responds are the product. Start with curation before building a matching engine. |
| [wow-forever.top](https://wow-forever.top/) | Public navigation covers classes, guides, beta updates, databases and tools. Accuracy and depth across that catalogue were not independently audited. | Do not attempt to win by copying a game encyclopedia. Publish first-hand community operations resources and maintain them. |
| [No Pressure EU](https://www.no-pressure.eu/) | Explicit low-pressure positioning, member-organized raids using Raid-Helper, a grouping bot and social events. This is an adjacent WoW community, not a Forever-specific competitor. | Borrow the operating idea: welcoming expectations plus an easy route into an actual activity. Do not assume Retail activities or mechanics apply to Forever. |
| [WoW Made Easy](https://www.wowmadeeasy.com/) | Publicly distinguishes learner and veteran raids and advertises recurring group activity. Its volume claims are self-reported and not a target for our launch. | Separate learning, relaxed and progression expectations at the event level. One generic promise of being "chill" does not resolve mismatched goals. |
| [TIDE's Forever recruitment](https://eu.forums.blizzard.com/en/wow/t/eu-normal-alliance-tide-%C2%B7-wow-forever-%C2%B7-community-raiding/629122) | A concrete EU Alliance social/relaxed-raiding offer drawing on an existing Retail community. Its stated existing size is not verified Forever participation. | Guilds have a specific social identity. Welcome them as partners and let members find a fit; the hub need not replace their guild Discords. |

### What We Can Realistically Own

Proposed differentiators, to validate through use:

- A real person helps a newcomer find the right group during advertised coverage.
- Sessions state start/end time, pace, experience requirements, loot rules and
  voice expectations before anyone commits.
- Guild listings are maintained, not repeatedly bumped and abandoned.
- Independent guilds can recruit and host on equal terms.
- Moderation distinguishes an allegation, a finding and a successful appeal.
- Useful answers, templates and approved events remain readable on the web.

Do not claim that competitors lack these qualities. Our opportunity is to
demonstrate them consistently and make the evidence easy to find.

### The Four Owner-Selected Servers

The owner subsequently selected these exact invites. Four unauthenticated
GET requests to Discord's public invite endpoint succeeded at approximately
10:48 UTC on September 30. Only server metadata was inspected; no server was
joined, no user account was accessed, and no members or messages were collected.

| Invite | Resolved community | Approximate members / online | Comparison question |
| --- | --- | --- | --- |
| [foreverclassic](https://discord.gg/foreverclassic) | WoW Forever EU PvP | 15,340 / 5,465 | How does an existing large Forever hub route newcomers and keep recruitment useful? The public invite references moderation-log; the actual first screen after onboarding remains unobserved. |
| [spineshatter](https://discord.gg/spineshatter) | Spineshatter EU PvP | 55,137 / 14,754 | How does a mature realm community handle volume, stale listings and faction navigation? Its public description covers Anniversary Classic, not exclusively Forever. |
| [acVNA3yZp](https://discord.gg/acVNA3yZp) | Tatta United Fresh | 676 / 129 | How does a smaller Alliance guild create familiarity and repeat attendance? Invite metadata identifies a welcome destination; the actual welcome process is unobserved. |
| [ZUE282uev](https://discord.gg/ZUE282uev) | Toxic PUGS | 3,864 / 859 | How does a raid-focused community organize recurring slots, replacements and loot expectations? The invite references thurs-1600, suggesting a scheduled-slot destination, not proof of its workflow. |

Metadata sources: [Forever invite API](https://discord.com/api/v10/invites/foreverclassic?with_counts=true&with_expiration=true),
[Spineshatter invite API](https://discord.com/api/v10/invites/spineshatter?with_counts=true&with_expiration=true),
[Tatta invite API](https://discord.com/api/v10/invites/acVNA3yZp?with_counts=true&with_expiration=true),
[Toxic PUGS invite API](https://discord.com/api/v10/invites/ZUE282uev?with_counts=true&with_expiration=true).
Counts are approximate and not comparable to unique active players or attendance.
The latter two invites returned October 30 expiry dates; recheck before a later
walkthrough. Public Discovery pages may show different cached counts.

The [Spineshatter public profile](https://discord.com/servers/spineshatter-eu-pvp-1306327491769798708)
advertises recruitment, PvE/PvP organization, trading and social areas. Together
with the Forever profile, it confirms these are established table-stakes
features. It does not prove common ownership or identical internal moderation.
The words in any server name are not evidence of member conduct.

Strategic synthesis: learn the large hub's discoverability, the guild's social
continuity and the PUG organizer's repeatable session workflow. That is more
useful than copying the biggest server's entire channel tree.

### Follow-Up Comparison Protocol

Use the four selected communities above for the next bounded walkthrough,
supplemented by the public operational benchmarks. For each, record observed,
not observed, or not applicable for: newcomer next action, mobile navigation,
region routing, listing freshness, event signup clarity, accessible help,
report privacy warning, external ban appeal, notification controls and host
guidance. Capture configuration or approved screens only.

Use one comparable walkthrough per server, not invented numeric quality scores.
Do not ask fake questions to measure response, bait moderators or infer safety
from a few anecdotes. Activity conclusions require permissioned sampling over
time. Copy principles, not another community's branding, guides or member data.

## 4. Live Audit: Keep, Fix, Validate

| Area | Observed state | Proposed action |
| --- | --- | --- |
| Core setup | Community, onboarding and membership screening enabled; mentions-only notifications; media filter for all members | Keep. These are useful foundations. |
| Read-only information | Rules, announcements, relevant links and FAQ are read-only for the evaluated ordinary-member permissions | Keep permissions; inspect existing content before replacing or duplicating it. |
| Forum navigation | All eight forums have zero available tags; PUG topics ask for nonexistent tags | Add small coherent tag sets; remove promises of unverified cleanup automation. |
| Copy correctness | Horde PvP topic uses an Alliance label; PvE examples mix versions; guild-search topics contain generic Mythic+ references | Correct templates without inventing Forever mechanics or silently rewriting trading policy. |
| Personalization | Two required multi-select questions: faction and class; no returned region/playstyle roles | Add optional region/playstyle routing; preserve current question and trap identities. |
| Default navigation | Thirteen default entries include many categories, blacklist and activity-checker; one referenced ID was not returned | Review actual newcomer view; verify the unresolved ID, do not assume deletion. |
| Moderator capability | Moderator role itself has no permissions and sits below class roles | Review actual duties and additional staff roles, then least-privilege permissions/hierarchy. Not proof all moderators are powerless. |
| Authentication | Guild moderation 2FA requirement is off | Owner enables it after staff readiness. Individual staff 2FA status is unknown. |
| Bots | MEE6, Dyno and Streamcord managed roles include Administrator | Inventory actual jobs and dependencies, then reduce unnecessary privilege one bot at a time. Do not remove blindly. |
| Public reports | Forums request evidence and are member-readable; private website links exist later in guidance | Move privacy warning/private evidence route first; prohibit harassment and unredacted personal information. |
| Voice and RP operations | No voice channels or dedicated RP routing in returned setup | Check for omitted resources; add only with an identified host and demonstrated need. |

The chat-exposed test bot token must be rotated before expanded permissions or
public bot rollout. The local audit client is GET-only, but the installed bot
inherits sending permissions from ordinary channels; its token is not inherently
read-only. No credential belongs in a plan, screenshot, commit or log.

## 5. Member Journeys

| Member | First useful outcome | Design response |
| --- | --- | --- |
| New/returning player | Knows where to ask, what version is being discussed and one suitable activity | Short Server Guide, human welcome, learner-labelled session |
| Time-constrained player | Finds a session compatible with their evening and expected finish | Named timezone, duration, attendance expectations, relaxed/progression labels |
| Experienced player | Finds people with matching preparation and goals without demeaning learners | Clear progression requirements and a separate learner option |
| PvP player | Finds an appropriately organized activity with an identifiable captain | Region/ruleset, objective, roster expectations and conduct rules |
| RP player | Finds a host who understands RP conventions | Opt-in RP interest, event premise, out-of-character boundaries, respectful moderation |
| Recruiter | Maintains one useful listing and receives relevant enquiries | Structured template, confirmed owner, freshness, edit/close workflow |
| Independent organizer | Runs an event without joining KFC or becoming an administrator | Host onboarding, bounded permissions, promotion rules and a backup contact |
| Reporter/accused player | Can submit context privately and understand the process | Separate public discussion, private evidence and independent decision/appeal paths |

### Current Game Model: An Important Product Correction

Blizzard's current ruleset article describes replacing traditional realm
selection with Normal, PvP and Roleplaying rulesets; Hardcore follows after
launch. It states that ordinary grouping requires the same ruleset and faction,
with a separate battleground caveat. Use region, ruleset, faction, language and
schedule as the core matching dimensions. A PvP activity interest is not the
same field as the character's ruleset. Keep both-faction community access, but
do not promise cross-faction or cross-ruleset dungeon/raid groups.
[Official ruleset model](https://news.blizzard.com/en-us/article/24302070/choose-your-ruleset-in-world-of-warcraft-forever).

This affects the existing website, not just Discord wording. Inspection found
required `realm` in `lib/validation.ts`, no dedicated ruleset field on
`ForeverGroup` in `prisma/schema.prisma`, and realm-selection instructions in
the prepared `content/growth.ts` and `content/templates.ts`. Before releasing
those drafts or expanding matchmaking, review the public forms, schema, filters,
commands and editorial copy against the official model. Do not ask members to
invent a launch realm. Preserve historical/Classic data explicitly rather than
mass-relabel existing records as Forever rulesets.

Blizzard also documents full two-part character names unique within a region.
The current addon uses a region/character/realm key and a legacy Name-Realm
parser in `addon/ForeverGuard/Core.lua`; the client wrapper relies on
`UnitFullName`/`GetRealmName`. This is a compatibility and identity risk requiring
actual client verification, not proof of the new API return shape. Review the
report/feed identity model before any public safety release. Never merge
people by first name or guess missing identity fields.
[Official character names](https://news.blizzard.com/en-us/article/24304161/create-a-name-of-your-own-in-wow-forever).

## 6. Navigation and Onboarding

### Change the First View, Not the Whole Server

Retain current faction areas and channel IDs. Existing bookmarks and published
screenshots make a destructive rebuild needlessly disruptive. Map old to new
locations before any separately approved rename or move.

| Surface | Launch treatment |
| --- | --- |
| Start/information | Welcome, rules, relevant links, FAQ and announcements with a consistent Forever identity |
| Everyday community | Newcomers and general discussion; a clearly labelled route to help and weekly activities |
| Alliance/Horde | Existing recruitment, looking-for-guild, PUG and LFG destinations with corrected templates/tags |
| Interests | Classes, PvP, RP, addons, media and trading selected through Channels & Roles |
| Safety | Public reports remain accessible with a prominent privacy boundary; private evidence stays on the website |
| Staff | Existing private areas remain private; operational logs and evidence are not discovery content |

Use Server Guide resources for durable read-only information after inspecting
the existing messages. Add three practical tasks: choose relevant channels,
find/post a suitable group or guild request, and locate the rules/help route.
An introduction can be encouraged, never mandatory personal disclosure.
Discord supports resource pages and three to five newcomer tasks.
[Server Guide documentation](https://support.discord.com/hc/en-us/articles/13497665141655-Server-Guide-FAQ).

Do not prescribe an invalid four-channel onboarding setup. Discord's published
FAQ requires at least seven default channels, including five that allow
everyone to view and send. The snapshot reports advanced onboarding mode;
validate the actual mode's current UI/API constraints before editing. A
candidate seven-channel baseline, if appropriate to the live UI, is newcomers,
general, PvP discussion, addon discussion, the existing media/social channel,
announcements and relevant links. Confirm effective permissions and usefulness;
do not open staff, report evidence or read-only rules channels merely to satisfy
a count. Preserve rules screening and make help obvious in Server Guide.
[Onboarding requirements and preview](https://support.discord.com/hc/en-us/articles/11074987197975-Community-Onboarding-FAQ).

Blacklist and activity-checker need not dominate the default newcomer view.
First inspect activity-checker's actual purpose and dependencies; moving it
out of defaults is not authorization to disable anti-abuse automation.

### Personalization

- Keep faction and class questions, including both intentional BOT choices,
  unchanged in the first release. Both-faction and multiple-class selection stay valid.
- Add optional region interests: EU, NA, other/undecided. These express interest,
  not location tracking or a promise of staffed coverage.
- Add optional activity interests: PvE, PvP, RP, social, addons. Use low-privilege
  roles only when needed for notifications; channel subscriptions suffice otherwise.
- Keep optional notification roles unmentionable by ordinary members. Controlled
  host/bot announcements target only relevant opt-in groups.
- Store availability on an optional group/listing, not a compulsory personal profile.
- Do not make regional/faction preferences permission barriers that isolate
  friends or hide the other side's public recruitment.

### New Surfaces: Deliberately Few

First inspect existing pinned content. Then at most one general help/feedback
forum and one read-only weekly schedule surface, if existing channels cannot
serve those purposes. The existing addon helpdesk remains addon-specific.
Pilot RP as an opt-in hosted thread/activity before a large empty RP category.
Add a small number of voice rooms only after confirming absence and a host's
need; provide text participation and no default recording.

There is no launch case for dozens of realm, language, class-spec or voice
channels. Split a destination when recurring activity and a maintainer justify
it, not to make the server appear large.

## 7. Forums That Produce Useful Matches

Start with the existing six faction guild/PUG forums. Use list view for scanning
where appropriate, concise guidelines and a single pinned blank template.
Forum tags are filters, not a substitute for complete scheduling fields.
[Discord forum guidance](https://support.discord.com/hc/en-us/articles/6208479917079-Forum-Channels-FAQ).

| Forum type | Suggested initial tags | Required template fields |
| --- | --- | --- |
| Guild recruitment | EU, NA, Other, PvE, PvP, RP, Social, Recruiting, Paused | Region; faction; character ruleset; language; schedule/timezone; pace; current needs; loot expectations; contact; last confirmed date |
| Looking for guild | EU, NA, Other, PvE, PvP, RP, Social, Looking, Found | Region; faction; character ruleset; availability/timezone; desired pace; class/role where decided; contact; no sensitive personal information |
| PUG/session | EU, NA, Other, PvE, PvP, RP, Learning, Relaxed, Progression, Open, Full, Cancelled | Game/version; region; character ruleset/faction; activity; exact date/start/end; timezone; host; required roles; expectations; signup destination |

Avoid tags for every date, hour, realm, class and specialization. Discord's
channel API limits available tags to 20 and applied thread tags to five. The
suggested sets fit those constraints. Do not claim Discord enforces one tag
from each category; templates and later validated bot forms handle required
fields. Preserve existing tag IDs during future changes.
[Channel and tag API](https://docs.discord.com/developers/resources/channel).

Proposed maintenance policy, requiring a moderator owner:

- One current recruitment listing per guild and one active player-search post
  per relevant scope. Ask authors to edit or close rather than flood duplicates.
- At 14 days, request reconfirmation; at 30 days without response, label a
  recruitment listing stale and remove it from active promotion. These are
  pilot policy choices, not existing automation or compulsory deletion dates.
- Ended sessions leave the upcoming queue. Preserve useful history; remove
  private contact details when no longer needed under the adopted retention policy.
- Manual updates first. A bot only promises reminders/expiry after that workflow
  is implemented, monitored and tested.
- Public listings follow the same approval and freshness rules for KFC and others.

Draft group template:

```text
Game/version:
Region / character ruleset / faction / language:
Activity and goal:
Date / start / expected finish / named timezone:
Learning, relaxed or progression expectations:
Roles needed and preparation:
Loot rules, where applicable:
Voice required, optional or text-friendly:
Host / signup link / cancellation contact:
```

## 8. Programming and Host Operations

Start with two well-supported activities per week, not a claim of 20 Forever
raids. This is a proposed workload, contingent on actual volunteers.
It is a minimum pilot for the new community's workflows, not a limit on the
guild's existing schedule. Add further sessions immediately when their hosts,
backups and participant demand are confirmed.

Before sufficient beta access: an organizer-led launch-planning session, a
guild meet-and-greet, a class discussion with sourced notes, or a moderated
RP planning session can be useful. Clearly label these as planning/social
events. Do not imply attendees can enter the beta through our Discord.
Blizzard's own instructions govern access and installation.
[Official beta information](https://news.blizzard.com/en-us/article/24304160/the-world-of-warcraft-forever-beta-now-live).

Once hosts have access and verified the content, add a beginner-friendly group
and a separately labelled focused session. Rotate PvP/RP pilots according to
actual demand and available expertise. Never schedule a session merely to fill
an empty calendar slot.

### Weekly Rhythm

| Moment | Operator action |
| --- | --- |
| Start of week | Publish the actual next seven days, hosts, vacancies and cancellation paths; no placeholder events |
| Before each session | Confirm the host and backup, roster authority, expectations, actual activity availability and end time |
| Session start | Welcome first-timers, explain pace/loot/voice rules and check that nobody is stranded in the wrong region |
| Session end | Thank participants, collect one optional feedback response, record whether the activity actually happened |
| Weekly review | Check unanswered requests, repeat attendance, host workload, stale listings and one improvement to test |

Every event needs an owner, backup/cancellation rule, capacity, late-arrival
policy, accessibility/voice expectation and conflict escalation contact.
Use UTC storage plus an IANA timezone and member-local display; check daylight
saving rather than hardcoding a permanent EU/US time difference.

### Choose One Roster Authority

Raid-Helper is already installed. First inspect its configuration and organizer
workflow. Use it for the pilot if suitable; Discord Scheduled Events can provide
discovery, but an "Interested" click is not an accepted roster place.

Do not run competing signup lists in Raid-Helper, Discord, a spreadsheet and
the website. Until the custom signup phase is ready, the website links to the
chosen authoritative roster. A later migration needs participant notice,
state reconciliation and a rollback plan.

### Host Development

Recruit hosts from multiple guilds, not just established officers. A prospective
host observes one session, co-hosts one, then runs one with a backup. This is a
proposed training path, not a credential already earned by anyone. Provide a
short checklist, ready-to-use templates and a moderator contact.

Recognize useful contributions with opt-in thanks or a bounded host/helper role.
Avoid message-count XP, public absence penalties and leaderboards that reward
spam. A quiet reliable host is more valuable than thousands of low-value messages.

## 9. Staffing and Governance

Actual weekly availability is still to be confirmed. Roles below are duties,
not promises that named staff or 24-hour coverage already exist.

The owner's updated operational claim is **560 guild raids per year**, around
10.8 per week averaged over 52 weeks. Treat this as owner-reported prior guild
experience, not independently audited attendance, spare organizer capacity or
the new Forever server's delivered events. It supports creating a host training
program and repeatable runbooks. Obtain named weekly commitments before using
it to promise a Forever schedule.

The owner's **10 million Forever players** expectation is a market-sizing
assumption. This research did not establish an official forecast of that size.
The official announcement describes the product, not that audience commitment.
Do not publish the estimate as a Blizzard figure or treat all global players
as English-speaking EU/NA Discord prospects.
[Official announcement](https://news.blizzard.com/en-us/article/24302093/carve-a-new-path-with-world-of-warcraft-forever).

| Responsibility | Minimum launch arrangement | Boundary |
| --- | --- | --- |
| Community owner | One accountable owner and a documented backup procedure | Infrastructure and policy accountability; no special moderation exemption |
| Welcome/operations | One lead in the first staffed time window plus cover | Reply to newcomers and route unanswered requests |
| Event hosts | Two reliable hosts who can cover each other | Run a manageable pilot schedule; hosting does not grant Administrator |
| Safety review | Two independent eligible reviewers for publication, plus an uninvolved appeal reviewer | If independence is unavailable, hold publication; do not waive the rule |
| Editor | One responsible reviewer for public information | Distinguishes source facts, beta observations and opinion |
| Bot maintainer | One maintainer and an owner able to revoke/disable access | Rotation, monitoring, backups and recovery |

One volunteer may wear several hats, but cannot satisfy independent review of
their own case or appeal. Add an NA host/lead before advertising staffed NA
events, and an RP steward before promising managed RP programming. Accepting
NA/RP members is not the same as delivering that operational coverage.

Adopt a short public charter:

- Membership is independent of any guild; participation elsewhere is welcome.
- No priority recruitment placement or favorable decisions for founders,
  donors, friends or partner guilds.
- Staff recuse themselves from cases involving their own guild or dispute.
- Publish policy changes with a date and explanation; keep case evidence private.
- Members can criticize decisions respectfully and request independent review.
- Payments or boosts never buy moderation authority, list removal or a safety badge.

At larger scale, invite representatives from independent guilds and PvE/PvP/RP
groups into an advisory meeting. This is not a public vote on guilt or a reason
to give every guild leader staff access.

### Scale Through Organizers, Not One Guild's Calendar

Build a central discovery and standards hub with distributed independent hosts.
The existing guild team can seed the operating model; it should not be expected
to personally host every session or moderate every conversation at scale.

| Planning scale, not forecast | Operating model | Gate before expansion |
| --- | --- | --- |
| First few hundred members | One accountable operations lead, small pilot roster and manual curation | Newcomer routes work and scheduled activities actually happen |
| Around 1,000 members | Multiple independent hosts, regional coverage rota, maintained listings and separate editorial/moderation duties | Backups exist; requests and cases do not accumulate without ownership |
| Around 10,000 members | Regional operations leads, specialist PvP/RP stewards, documented host onboarding and audited bot queues | Workload-based staffing, incident drills and reliable self-service workflows |
| Tens of thousands and beyond | Sustainable funded or volunteer staffing model, multi-person infrastructure access, service monitoring and formal governance | Demonstrated capacity; staged announcements when queues or coverage are overloaded |

Membership bands are planning checkpoints, not automatic headcount ratios.
Trigger action from active sessions, peak concurrent requests and staff workload.
Measure moderation intake and handling time before estimating shifts; add
handover, appeal and incident reserve. A large inactive roster and a highly
active launch cohort need different coverage.

Illustrative capacity arithmetic, **not an activity forecast or Forever raid
size claim**: if 10% of members want one 20-seat hosted session each week,
1,000 members need five sessions, 10,000 need 50 and 50,000 need 250. Smaller
groups need more hosts; repeat attendance needs more seats. Region, ruleset,
faction, timing and role mix further constrain usable capacity. An anchor
guild's approximately 11 weekly raids cannot alone serve every scenario.

Use `requested participant places / usable places per session` to plan host
capacity, and compare it with named host commitments and observed completion.
Do not derive required moderators from the speculative total game audience.
At scale, the hub succeeds by enabling other organizers to run good activities
under shared standards, while members retain their existing guild relationships.

## 10. Moderation and Reporting

### Three Distinct Processes

| Process | Purpose | Required treatment |
| --- | --- | --- |
| Discord conduct enforcement | Spam, harassment, threats or rule violations within this community | Reasoned staff action, private audit, proportional response and a server-ban appeal route |
| Public player reports/appeals | Member-visible incident discussion, as intentionally configured | Immediate readability warning, redaction, no dogpiling; submission is not a verdict |
| Website evidence and reviewed alerts | Private intake, evidence review, publication decision and appeal | Existing authenticated staff process, independent reviewers and explicit publication gate |

Do not automatically convert a forum post, upvote count, staff suspicion or
Discord ban into a player-safety alert. Dislike of a guild is not evidence
against each member. Legitimate in-game PvP is not automatically griefing;
moderators need a written incident taxonomy and context, not faction preference.

### Public Forum Guidance

Put this boundary first in report-here, with an equivalent appeal-specific version:

> Other server members can read this forum. Do not post personal information,
> private conversations or unredacted evidence here. Submit private evidence at
> https://www.wowforeverdiscord.online/reports/new. Describe events factually;
> a report is not a confirmed finding. Do not harass, contact or coordinate
> action against the people involved. Website cases are reviewed separately.

For website cases, retain the existing private appeal route and case reference.
Forum statuses should describe handling, not presumed guilt: New, Moderator
Review and Closed are possible staff-controlled labels. Do not introduce a
member-assigned "Scammer" tag or promote accusation threads as growth content.

### Discord Ban Appeals Are a Real Gap

The current website `/appeals` form requires an existing `FG-` player-report
reference and looks that case up. It is not a general Discord-ban appeal form.
A banned Discord member also cannot rely on an in-server forum.

Add a distinct private server-access appeal workflow, with no FG reference
requirement and no server-membership dependency. It needs an authenticated
ownership check where appropriate, clear receipt/status handling, anti-spam,
staff access control and a reviewer independent of the original action.
Do not silently repurpose the player-alert appeal endpoint or expose whether
arbitrary users are banned. Until implemented, publish a real owner-approved
external support route; no fabricated mailbox or URL.

Preserve the intentional BOT trap. Separately document who investigates an
accidental selection and how the affected user reaches support. The audit
did not verify the external banning automation; do not advertise its success
rate or treat its output as infallible.

### Operational Safety

- Owner confirms staff 2FA readiness and enables the guild requirement.
- Review Moderator role duties and hierarchy without altering the intentional
  privileged Rogue role. Routine moderators should not need Administrator.
- Inspect existing AutoMod/third-party rules before adding overlapping rules.
  Test legitimate guild links, game terminology and relevant languages.
- Use spam/mention protections with private alerts and a false-positive review
  path. Do not automatically ban based on a single ambiguous keyword.
- Write a raid-response runbook: responsible staff, temporary restrictions,
  pause-invites decision, incident recording, recovery and member communication.
- Keep security logs private and bounded. Do not collect deleted messages,
  attachments or unrelated personal information just because a bot can.
- Review trading and boosting policy separately. Correcting a copied topic is
  not permission to change commercial rules. Prohibit RMT/account sales as a
  community policy proposal and check current Blizzard rules before publication.

Discord documents native spam/mention controls and their limitations. Its
raid-response guide supports temporary containment rather than permanent
friction for every newcomer.
[AutoMod](https://support.discord.com/hc/en-us/articles/4421269296535-AutoMod-FAQ),
[raid response](https://support.discord.com/hc/en-us/articles/10989121220631-How-to-Protect-Your-Server-from-Raids-101).

## 11. Bot Portfolio and Build Order

Do not add another general-purpose bot before identifying which installed bot
owns welcome messages, trap automation, moderation, events, music and feeds.
MEE6, Dyno, Raid-Helper, Streamcord and other installed apps need a dependency
inventory, not an assumption that their apparent overlap means they are unused.

| Capability | Preferred initial owner | Custom work trigger |
| --- | --- | --- |
| Channel/role onboarding | Discord native configuration | Only add commands for real self-service gaps |
| Spam protections | Reviewed native/one existing moderation workflow | Measured gap that cannot be addressed by configuration |
| Pilot event rosters | Existing Raid-Helper workflow, if suitable | Need for a unified authenticated website/Discord roster |
| Public news | One reviewed news source/digest workflow | Editorial approval and source-specific delivery controls |
| Approved website records | WoWForeverBot | Unique value: reliable canonical links, updates and withdrawal |
| Evidence/case review | Existing website staff system | Private references/notifications, never public evidence copying |

The local audit bot is configured; the separate production interaction
credentials, destinations and rollout remain inactive. The existing command
files are not proof of an operational service.

Follow the existing B0-B4 engineering sequence:

1. **B0: safe foundation.** Rotate credentials, publish accurate bot policies,
   test signatures/authorization and promptly acknowledge interactions. Add
   durable receipts, idempotency, bounded retries and private operational logs.
2. **B1: approved publication.** Explicit admin action projects an approved
   guide/guild/session into an allowlisted channel; edits and withdrawals update
   the same record. No automatic mass pings or raw submission publication.
3. **B2: member ownership.** Optional Discord OAuth for maintaining a listing;
   separate member and staff authorization. No automatic staff account or forced join.
4. **B3: shared signup workflow.** Capacity-safe accepted/waitlisted/cancelled
   states and one roster authority, with a deliberate migration from existing tools.
5. **B4: opt-in reminders and measured expansion.** Digest/notification preferences,
   cancellation recovery and optional Gateway events only where needed.

Use PostgreSQL outbox jobs and a PM2 worker, not a new infrastructure platform.
Test duplicate interactions, crashes after sending, rate limits, revoked
permissions, deleted destination channels, stale edits and Discord outages.
An ambiguous delivery timeout must not trigger blind duplicate posting.
Detailed schemas, permissions and release gates remain in the
[integration blueprint](web-discord-integration-blueprint.md).

Avoid building AI moderation verdicts, automatic public reputation scores,
cross-server member surveillance, unsolicited welcome DMs or a bespoke music
bot. The first custom feature should connect an already useful workflow.

## 12. Addons: Useful, Optional and Accountable

ForeverGuard source and a draft release already exist, but beta compatibility
has not been verified. Keep it unpublished until in-game testing and moderation
operations are ready. A safety addon must not be the requirement for joining
or the main reason people hear about the community.

Release gates:

- Verify supported client builds and actual permitted APIs; show tested version
  and known limitations. Do not promise direct live HTTP or unsupported gameplay actions.
- Reviewed records only, with provenance, scope, expiry, correction and appeal
  handling. No raw Discord allegations, inherited rival-server lists or guild-wide guilt.
- Verify the current full-name/regional identity model and rename behavior in
  the actual client. Keep legacy realm-based identities separate. Ambiguous
  identities do not receive a confident warning.
- Show stale/offline state, record age and limitations. Provide revocation and
  an emergency publication-disable procedure; stale data is not current evidence.
- Optional local warnings, not automatic kicks, chat-shaming or report brigading.
- No sensitive evidence, Discord account graph, user token or tracking payload
  in the distributed addon/feed.
- Test feed size, serialization, update interruption, revoked entries, expiry
  and performance in the actual game. Website unit tests cannot prove client compatibility.

Blizzard's published addon policy requires free distribution and visible code,
restricts advertising and in-game donation requests, and forbids harmful impact.
Treat compliance and current-client testing as release prerequisites, not a
guarantee that any particular addon design will be accepted.
[Blizzard addon policy](https://us.forums.blizzard.com/en/wow/t/ui-add-on-development-policy/24534).

A simpler utility may be more valuable first: a maintained addon compatibility
checklist with verified versions and maintainer links. Do not create a full
addon manager or republish other authors' packages without a genuine need and permission.

## 13. Website, Search and Recommendations

The website should make the service inspectable before someone joins:

- `/discord`: accurate scope, actual channel screenshots, expectations, public
  forum warning, working invite, help and next real activities.
- Existing guild directory: complete approved records, schedule and freshness;
  no empty shell profiles presented as active guilds.
- Existing group directory: actual upcoming sessions and clear cancellation/
  availability state; do not invent a new duplicate events index unnecessarily.
- Guides: solve repeated member problems using original templates, verified
  screenshots, named reviewers and maintained sources.
- About/rules/safety: clear ownership, realistic staffing, independence and
  practical appeal routes, not vague claims of being the safest community.

### Editorial Order

| Priority | Work | Publication gate |
| --- | --- | --- |
| First | Correct ruleset/realm assumptions, then review/release the prepared guide improvements and beta/launch checklists | Official-model review plus existing release checks; distinguish local drafts from production |
| Next | A real first-session walkthrough or organizer checklist | A host has used it; screenshot/context is permissioned and version-specific |
| Next | A maintained addon setup/compatibility resource | Tested versions and an accountable reviewer; no fabricated compatibility |
| Then | A short useful answer from an actual recurring member question | Author permission and editorial rewrite; no private conversation export |
| After activity exists | Consented event recaps and guild/host introductions | Actual event/outcome, accurate attribution, no invented attendance or endorsement |
| Demand-led | PvP/RP specialist resources | A qualified maintainer and evidence of the reader's actual need |

Prefer updating one strong canonical answer over publishing ten variations of
"WoW Forever Discord EU/PvP/best/community." Publish full useful text on the
web, not a teaser requiring a Discord join. No report pages as SEO bait.
Google recommends original people-first usefulness, not a target article count.
[Google content guidance](https://developers.google.com/search/docs/fundamentals/creating-helpful-content).

### Discovery Work That Does Not Depend on More Articles

1. Use the correct verified Search Console property, check sitemap processing
   and inspect the key canonical URLs. Ownership is already owner-confirmed.
2. Confirm Bing setup separately; do not mark it complete without evidence.
3. Request consideration in the curated community list using its stated modmail
   process; the existing outreach kit supplies a draft. Respect moderator decisions.
4. Invite independent guild leaders to review the templates and publish their
   own accurate listing. No required backlink or exclusivity.
5. Offer a concrete hosted activity or useful resource to a relevant creator;
   no unsolicited mass DMs, competitor-member harvesting or paid ranking links.
6. Keep the disclosed KFC announcement, but do not call it independent endorsement.
7. Maintain a stable name, invitation and public description across owned surfaces.

Google says ordinary search eligibility and SEO practices also apply to its AI
features; there is no extra AI schema requirement and no guaranteed inclusion.
OpenAI identifies OAI-SearchBot as its search crawler, separately configurable
from GPTBot training access. Verify public access while keeping private routes
protected. Neither source promises recommendation placement based on Discord
size. ChatGPT visibility is an observation to monitor, not a ranking contract.
[Google AI features](https://developers.google.com/search/docs/appearance/ai-features),
[OpenAI crawler documentation](https://developers.openai.com/api/docs/bots).

The query "wow forever discord" is also a generic category description used by
multiple communities, not an exclusive brand query. A matching name/domain alone
does not entitle the site to first place. Do not rename again simply to chase it.

## 14. Discord Discovery and Sustainable Growth

Plan for native Discovery, but do not make launch depend on it. Discord's
published requirements include at least 1,000 members, eight weeks of server
age, activity/safety requirements and moderation 2FA. Recheck actual eligibility
in the server UI when approaching that milestone. Membership is only one gate.
Do not buy members, automate activity or treat older unrelated members as
evidence of current Forever participation.
[Discovery requirements](https://support.discord.com/hc/en-us/articles/360030843331-Enabling-Server-Discovery).

Use voluntary migration from existing communities. Announce why joining is
useful, the next actual activity and that people can remain in their current
guild/server. Have hosts ready when the invitation is posted. A staged influx
can be easier to welcome than a large unstaffed announcement.

Partnership offer: free accurate listing, equal event-promotion rules, useful
templates, shared learning sessions and an organizer contact. In return ask
for a maintained listing and respectful participation, not a forced backlink
or member transfer. Maintain a small outreach ledger with contacted/replied/
accepted states. No fabricated partners or logos.

Avoid monetization pressure at launch. If funding becomes necessary, publish
actual costs and separate funding from moderation, recruitment ordering and
basic access. More server boosts do not solve host shortages or weak onboarding.

## 15. Measurement Without Surveillance

Primary outcome: completed community sessions with people choosing to return.
Track attendance-based return separately from chat activity or total membership.
In the first week, establish an honest manual baseline rather than claiming
the current read-only bot measures any of this.

| Measure | Definition | Initial collection |
| --- | --- | --- |
| Weekly delivered sessions | Planned sessions actually held, with host and aggregate attendee count | Host confirmation; record cancellations separately |
| First useful action | A newcomer makes a relevant request, joins a session or completes a guild contact | Opt-in pilot observation; not a universal activation percentage |
| Help responsiveness | Time from a sampled genuine request to a useful human answer, within stated coverage | Manual small sample; unanswered requests remain in the denominator |
| Roster reliability | Attended places / accepted places for completed sessions | Chosen roster tool plus host confirmation; Interested clicks are excluded |
| Return participation | Participants returning to another session within 14 days / participants with a complete 14-day observation window | Consented minimal event records; report sample size, not message scraping |
| Listing freshness | Active promoted listings reconfirmed within the agreed window / all active promoted listings | Manual review, later canonical-record timestamps |
| Host sustainability | Delivered/cancelled sessions, backup coverage and voluntary workload feedback | Weekly operations review |
| Discovery quality | Search impressions/clicks and landing-page invite clicks, by known source | Search Console and existing privacy-aware website analytics |
| Safety process | Acknowledged cases, overdue reviews and appeal corrections | Private case system; public summaries suppress identifying small samples |

Invite clicks are not confirmed joins. An HTTP interaction bot does not supply
a historical member-join stream. Invite-use deltas are not reliable individual
attribution. Do not match website IP addresses to Discord identities or infer
members' location from IP. Keep attribution unknown where evidence is missing.

Discord documents aggregate Server Insights for larger Community servers;
availability should be checked in the UI rather than assumed at launch.
Use those privacy-preserving aggregates when eligible, not a replacement
member-surveillance database.
[Server Insights](https://support.discord.com/hc/en-us/articles/360032807371-Server-Insights-FAQ).

Pilot collection proposal: only consented participant/event identifiers needed
for the 14-day return check, delete pilot row-level observations after 30 days,
keep non-identifying aggregates, and restrict access to the operations lead.
This requires an adopted notice and deletion procedure before collection;
existing security/case retention remains governed separately. Do not add
Discord data to website analytics silently.

### Initial Targets, Not Claimed Benchmarks

- Five volunteer newcomer tests across mobile/desktop; every tester can find
  the right destination and help route without staff navigation assistance.
- Two pilot activities per week with named hosts/backups; track why any cancel.
- All promoted listings meet the template and freshness policy.
- Every moderation publication meets independent review requirements.
- After two weeks, set response/retention targets from actual sample sizes and
  staff capacity. Do not invent industry-standard conversion percentages.

## 16. Prioritized Delivery Backlog

Effort below is relative: S = a focused configuration/content task, M = several
connected workflows or review sessions, L = a separately tested product release.
These are not fixed delivery estimates; volunteer capacity is unconfirmed.

| Order | Deliverable | Owner | Effort | Acceptance/dependency |
| --- | --- | --- | --- | --- |
| P0 | Rotate exposed credential; document app jobs and preserved configuration | Owner + maintainer | S | No exposed token in use before write permissions; no trap/staff-role changes |
| P0 | Correct copied topics and add coherent tags to six guild/PUG forums | Maintainer + moderator | S | ID-bound preview approved; templates match actual tags; no lost posts |
| P0 | Public report/appeal warnings and explicit private evidence route | Safety lead | S | Ordinary member sees warning first; forum remains public; website stays private |
| P0 | Ruleset/full-name model review across forms, drafts and addon identity | Maintainer + editor | M | No forced invented realm; explicit ruleset matching; addon stays unpublished pending client evidence |
| P0 | Staff duty/hierarchy review and moderation 2FA readiness | Owner | M | Routine actions tested without unnecessary Administrator; privileged Rogue preserved |
| P0 | Name welcome/host coverage and schedule first real activities | Operations lead | M | Hosts and backups confirm; unstaffed region promises removed |
| P0 | Publish a real external server-access support route | Owner | S | Banned member can reach it without an FG case or server membership |
| P1 | Server Guide and optional region/playstyle navigation | Maintainer + operations | M | Native requirements and five newcomer tests pass; both BOT choices unchanged |
| P1 | Charter, host playbook and listing freshness routine | Operations + safety | M | Independent guild can recruit/host under the same process |
| P1 | Review and release prepared website content | Editor + maintainer | M | Existing publishing/build/responsive checks pass; no fake activity |
| P1 | Bot B0/B1 foundation and approved projections | Maintainer | L | Existing engineering acceptance suite; one canonical record, safe retry/withdrawal |
| P1 | Dedicated Discord-ban appeal workflow | Maintainer + safety | M | Private, abuse-resistant and independently reviewed; FG appeal path unchanged |
| P1 | Permissioned directory/partner outreach | Community lead | S | Current destination rules checked; truthful scope; accepted vs pending recorded |
| P2 | Optional member ownership and shared signups, B2/B3 | Maintainer + hosts | L | Explicit need proven; no double booking or split roster authority |
| P2 | Hosted RP/PvP and regional expansion | Named stewards | M | Demand plus host/moderation coverage; no empty-channel rollout |
| P2 | Addon compatibility pilot and reviewed release | Addon maintainer + safety | L | Actual client tests, revocation/expiry and independent case process pass |
| P2 | Native Discovery readiness and monthly operating review | Owner + operations | M | Real eligibility met; privacy-aware evidence of useful activity |

P0 configuration work does not require waiting for the full bot. P1/P2 software
work does not excuse delaying real hosted sessions. Do not give a 100-member
launch all the operational complexity of a 10,000-member community at once.

## 17. Rollout, Testing and Rollback

### First 48 Hours After Approval

1. Confirm credentials, responsible staff, backup and scope. No surprise changes
   to the preserved staff role, traps or public reporting policy.
2. Re-fetch affected configuration and produce a narrow before/after manifest
   for topic/tag edits. Abort if current state differs from the approved baseline.
3. Apply one small batch with least privilege and audit reasons; verify results
   before the next. No mass notifications, deletion or historical thread migration.
4. Correct support/privacy copy and publish confirmed first activities.
5. Start the welcome/host pilot and record baseline observations.

### Following Two Weeks

Run newcomer tests, refine Server Guide, hold the promised activities, maintain
listings and invite a few independent organizers. Prepare B0/B1 separately and
ship only after its tests. Publish one useful, reviewed resource based on an
actual question or session, not a daily article quota.

### Following 30-90 Days

Expand by proven demand and named responsibility: additional time windows,
RP/PvP hosts, member-owned listings and eventually unified signups. Review
Discovery eligibility, staff load, correction handling and the addon pilot.
Pause a feature or reduce the schedule when moderation/host coverage cannot
support it. The phase gate is service quality, not elapsed days alone.

### Acceptance Matrix

- Ordinary newcomer, returning member, both-faction player, multi-class player,
  no preference, EU/NA/other interests and read-only information access.
- Mobile Discord on a real phone plus desktop; channel discovery, forum tags,
  long titles, external links and timezone display. Website Playwright does
  not verify the native Discord app.
- Role allowlist rejects privileged/managed roles; ordinary Rogue selection
  still maps to the class role; intentional staff role untouched.
- Both BOT options and BAN mappings match the snapshot exactly; verify config
  preservation without triggering a live ban.
- Public reports show privacy warnings; private evidence and staff notices are
  inaccessible to ordinary members. No evidence leaks into embeds/logs.
- A user outside the guild can reach server-access support; player-case appeals
  continue to require the appropriate existing case.
- Event cancellation, full roster, waitlist, host absence and bot outage have a
  clear human fallback. Two signup tools never disagree about accepted places.
- Re-run the configuration audit; obtain owner confirmation of member-facing
  previews; remove temporary management permissions after the batch.

The audit snapshot is not a restorable backup. Before writing, capture exact
editable fields and permission overwrites for every affected resource. Roll
back only the batch's fields after checking for concurrent legitimate changes;
do not replace whole guild configuration. Preserve existing IDs and messages.
Test destructive or banning behavior only in a separately authorized test guild.

## 18. What Not to Build or Claim

- No claim of being official, largest, safest, number one or universally active
  without applicable evidence. Do not import KFC character counts as member counts.
- No generic encyclopedia race or near-duplicate SEO pages for every keyword.
- No channel/category explosion or perpetual recruitment pinging.
- No fake activity, bought joins, engagement bots, review buying or forced referrals.
- No public allegation rankings, collective guild punishment or paid list removal.
- No full chat archive, AI-generated verdicts or member-to-IP identity database.
- No replacement of working third-party tools without a specific unmet need.
- No claim that the perfect community is complete after a configuration pass.

## 19. Decisions Still Needed

These do not block the topic/tag/privacy planning work:

1. Named volunteers, EU/NA coverage windows and realistic weekly commitments.
2. Bounded visual access to the four now-selected servers; their public invite
   metadata is checked, but onboarding, templates and event flows remain unobserved.
3. First actual hosted activities and whether suitable hosts have beta access.
4. Owner-approved external server-access support contact until the dedicated
   Discord-ban appeal workflow is implemented.
5. Existing bot dashboard responsibilities, especially trap and event automation,
   before changing any permissions or workflow ownership.

The next implementation should be a reviewed configuration-and-operations
batch, not a full server rebuild. Success means members receive a useful,
consistent experience and organizers can sustain it.
