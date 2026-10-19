# WoW Forever Discord Channel Experience Plan

Prepared October 1, 2026 for the community owner and implementation team.
Status: researched implementation plan. The research made no live changes.

Implementation follow-up: the [non-LFG channel release](discord-channel-experience-release.md)
is now live. It implements newcomer routing, tool/support forums, topics,
safety presentation and archives/operations. The release records the missing
leveling archive and the remaining native Guide UI, staffing and website-copy
work. The subsequent [group-finding release](discord-group-channel-release.md)
implements four faction LFG conversions, guild/run/leveling forum settings,
posting templates, current rules guides and faction routing/order. Structured
bot forms, signup controls, reminders and website projection remain separate.
The [trading and Auction House release](auction-house-release.md) subsequently
converts both faction trade chats to native listing forums, preserves read-only
archives and introduces private-first market research controls.

The community should make it easy to find compatible players, understand when
they will play, and join the right conversation. The first release should give
both factions proper PvE and PvP group forums, make the existing recruitment
forums consistent, and give newcomers a clear route through the server.

This document turns the [community plan](community-excellence-plan.md) into
specific channel decisions. It covers every channel and category returned by
the current audit, posting templates, navigation, moderation responsibilities,
future bot features, and an order for implementation.

## Evidence and current gaps

The authenticated configuration audit captured October 1 at 05:14:48 UTC
returned 62 channels/categories and 21 roles: 38 text channels, six announcement
channels, nine forums and nine categories. Follow-up reads inspected all nine
forums, the application's global/server commands, and scheduled-event metadata.
The private source snapshot is in gitignored audit storage. No chat history,
member roster, private evidence or competitor-server messages were collected.

| Observed configuration | Effect on the experience | Recommendation |
| --- | --- | --- |
| Both factions have text-only `lfg-pve` and `lfg-pvp` | Separate requests compete in one chat; replies and changes are hard to follow | Replace each with a native forum, preserving the previous channel |
| Six guild/PUG forums have tags but layout `0`, no preferred sorting and no required-tag flag | The basic post format works, but presentation and filtering are inconsistent | Explicit list layout, defined sorting, concise guidelines and required tags |
| The same six forums have zero post slowmode; topics describe six-hour bump rules | Those rules are not represented by channel slowmode; third-party enforcement was not inspected | Distinguish post creation, replies and bump policy; verify existing bot enforcement |
| The new `group-leveling` forum has list layout, required tags and a 60-second post cooldown | This is the strongest current starting point for structured groups | Keep it; make its purpose a recurring leveling group clear |
| Two text channels are named `newcomers` | A newcomer has to guess which one is for introductions or questions | Rename the original to `introductions`, the newer one to `new-player-help` |
| `group-leveling-archive` is still writable by an ordinary member | People can continue using the old destination | Preserve it and plan a read-only archive after the required permission edit |
| The unused `forever-shared-chat` still describes an inactive pilot | An obsolete workflow remains visible in Community | Move it to Archives and remove outdated pilot copy |
| Thirteen onboarding defaults include six categories, `activity-checker`, and one unresolved ID | Configuration does not express a focused first action | Replace defaults with a small validated set of actual channels |
| The unresolved default returned 404 / Unknown Channel on a targeted read | It cannot currently be resolved by the installed bot | Review it in the owner UI and replace its reference without deleting anything |
| Several read-only information channels still have empty topics | Navigation lacks a short explanation; existing messages may still contain useful guidance | Inspect existing content, then add concise descriptions and Server Guide resources |
| `wowhead` describes its feed as official WoW updates | Members may mistake a third-party source for Blizzard | Label it as a third-party feed; official announcements must link their source |
| Addon advertising and addon support are both continuous chats | A project or unresolved issue becomes difficult to find later | Plan tool directory/support forums covering addons, web tools and desktop tools |
| Only `/bridge` is registered for WoWForeverBot in this server; global commands are empty | Group forms, signup controls and reminders are not current functionality | Deliver native forums first; implement group tools as a separate bot release |
| The scheduled-event endpoint returned zero events | No schedule was available through that endpoint at inspection time | Publish real hosted sessions when confirmed; keep event discovery tied to one roster |

An ordinary-member permission probe can view, create posts, read history and
reply in all current forums and the four LFG text channels. It cannot establish
the state of a particular timed-out member, combined roles or client rendering.
The audit does not establish activity levels or prove that pinned guidance is
absent. No voice channel appeared in the returned inventory.

## Member journeys and channel routing

Organize the server around what a member wants to accomplish. The distinction
between a pickup group and an organized run should depend on the signup process,
not an arbitrary number of hours until its start.

| Member goal | Destination | Information needed before replying |
| --- | --- | --- |
| Ask a beginner question | `new-player-help` | Topic, game/client version when relevant, what they have tried |
| Meet people or discuss the game | `introductions`, `general`, `pvp-chat` or a class chat | No recruitment template |
| Find players for one dungeon or questing session | Faction `lfg-pve` forum | Activity, ruleset, level, exact start, roles/spots, pace and contact |
| Find a battleground premade or world PvP group | Faction `lfg-pvp` forum | Objective, ruleset, level, start, duration, spots, voice and host |
| Build a group that levels together over multiple sessions | Shared `group-leveling` forum | Region/faction/ruleset, starting level, recurring availability, pace and roles |
| Join a hosted run with an organized signup roster | Faction `scheduled-runs`, replacing the `pugs-adverts` name | Date, start/end, host, requirements, loot policy and one signup destination |
| Find a lasting guild | Faction `lf-guild` or `guild-recruitment` | Schedule, playstyle, language, needs, contact and freshness |
| Find a tool, solve a problem or submit a test result | `tool-directory` or `tool-support` forum | Maintainer/source, versions, compatibility or reproducible issue |
| Buy, sell or offer crafting | Existing faction trade channels | Item/service, region, ruleset, price/terms, availability and contact |
| Report a player incident or appeal | Existing report/appeal routes | Public redacted context or the website's private evidence route |

Dungeon requests belong in PvE. A PvP post asks for the battleground or world
PvP objective instead. Both use the same timing and group-status pattern.
The community welcomes both factions, while individual game groups must follow
Blizzard's faction and ruleset restrictions. Store character ruleset separately
from activity: a character on the PvP ruleset may want a dungeon group.
[Blizzard ruleset and grouping model](https://news.blizzard.com/en-us/article/24302070/choose-your-ruleset-in-world-of-warcraft-forever).

## Forum design and posting experience

Use list view for groups, guilds, addons and support cases. Each post should
represent one group, search, project or issue, with its replies in that post.
Keep ordinary conversation in text channels. Put templates in forum guidelines
and the website's existing templates page, so members can start a useful post
without navigating a wall of bot announcements.
[Discord forum guidelines and layouts](https://support.discord.com/hc/en-us/articles/6208479917079-Forum-Channels-FAQ).

### Group timing

Every single-session listing needs an activity, exact date/start, timezone,
expected duration, current open spots and a host. "In one hour" is useful at
creation but becomes ambiguous later. Native posts should include an absolute
time with a named timezone. The later group form should offer Now, In 30 minutes,
In one hour, In two hours, and a custom date/time, converting that choice to an
absolute instant before publication.

The future bot can show the same instant as a member-local date/time and a
relative countdown. Discord supports `<t:UNIX_SECONDS:f>` and
`<t:UNIX_SECONDS:R>` in message bodies. Keep a readable title with the activity
and open roles; do not depend on timestamp markup rendering inside thread titles.
[Discord timestamp formatting](https://docs.discord.com/developers/reference#message-formatting).

Post status should be Open, Full, In progress, Completed or Cancelled. The host
updates it manually in the native-forum release. A start time passing does not
prove the group started; the later bot must ask the host to confirm its state.
Full can return to Open if a place becomes available. A cancelled group should
remain visibly cancelled rather than silently disappear from participants.

### PvE template

Illustrative title: `EU | Dungeon group | Need healer | 20:00 Europe/Sofia`.

The essential facts are the activity, region/ruleset, start and expected duration,
open spots, and host. Level is required when it affects eligibility; preparation,
loot and voice details are conditional. Game/build is needed when beta or another
version could cause confusion. A simple casual request should not require a long
application. The template below covers the possible fields; omit irrelevant ones.

```text
Activity / dungeon / quest objective:
Region / character ruleset / game or beta build:
Current level and required level range:
Start date, time and named timezone:
Expected duration:
Current group / open roles:
Pace: learning, relaxed or fast:
Loot expectations, if applicable:
Voice: optional, required or text-only:
Host / Discord contact:
Status:
```

These are template fields, not a claim that any named dungeon, raid or loot
system is available in the current client. Hosts must choose content they can
actually access. The faction is already identified by the channel.

### PvP template

Illustrative title: `EU | Battleground premade | 3 spots | 20:00 Europe/Sofia`.

```text
Activity: battleground or world PvP:
Battleground / objective / meeting place:
Region / character ruleset / game or beta build:
Level range:
Start date, time and named timezone:
Expected duration:
Current group / open classes or roles:
Goal and experience expectations:
Voice: optional, required or text-only:
Host / Discord contact:
Status:
```

For PvP, separate a relaxed group from a coordinated group through expectations
and tags. Do not require a rating, rank or activity mode unless it exists in the
current game and matters to that group. Preserve existing trade policy; boosts
or commercial promotion do not become LFG content through this redesign.

### Shared forum settings

The following are proposed settings, not current configuration. Reply slowmode
stays zero initially; post-creation limits prevent accidental duplicate listings
without making coordination difficult.

| Forum | Layout and sorting | Post cooldown | Inactivity archive | Required tag |
| --- | --- | --- | --- | --- |
| Faction PvE/PvP LFG | List; creation date so bumps do not dominate | 60 seconds | 24 hours | Yes |
| Group leveling | Keep current list/activity sorting | Keep 60 seconds | Keep seven days | Keep yes |
| Guild recruitment | List; creation date | 60 seconds | Seven days | Yes |
| Looking for guild | List; creation date | 60 seconds | Seven days | Yes |
| Scheduled runs | List; creation date | 60 seconds | Seven days | Yes |
| Tool directory | List; creation date | 60 seconds | Seven days | Yes; a member-selectable type/purpose tag |
| Tool support | List; activity | 30 seconds | Seven days | Yes; a member-selectable issue-kind tag |
| Public reports and appeals | List; creation date | 60 seconds | Seven days | No member-required decision tag |

Inactivity archiving is not an expiry timer, cancellation or deletion. A reply
changes inactivity, and an unlocked archived post can be reopened. Neither
native sorting option orders posts by a start time written in their body. A
chronological upcoming-session list therefore belongs in the later website/bot
workflow. Existing six-hour bump rules remain a separate moderation policy;
the 60-second creation limit does not replace them.
[Forum inactivity behavior](https://support.discord.com/hc/en-us/articles/6208479917079-Forum-Channels-FAQ),
[channel settings](https://docs.discord.com/developers/resources/channel).

### Tag sets

Use consistent region, ruleset and status vocabulary. Each faction channel
already supplies faction, so its posts do not need Alliance/Horde tags. The
shared leveling forum does need those tags. Do not add a tag for every dungeon,
date, class or timezone; those belong in the post.

| Forum | Proposed tags |
| --- | --- |
| PvE LFG | EU, NA, Other; Normal, PvP ruleset, Roleplaying; Dungeon, Questing; Open, Full, In progress, Completed, Cancelled; Learning, Relaxed, Fast |
| PvP LFG | EU, NA, Other; Normal, PvP ruleset, Roleplaying; Battleground, World PvP; Open, Full, In progress, Completed, Cancelled; Casual, Coordinated |
| Guild recruitment | Preserve the nine existing tags and their IDs initially |
| Looking for guild | Preserve the nine existing tags and their IDs initially |
| Scheduled runs | Preserve the twelve existing tags and their IDs initially |
| Group leveling | Preserve the fourteen existing tags and their IDs |
| Tool directory | Web tool, In-game addon, Desktop app; UI, Combat, Raid tools, Trading, Reference; Stable, Beta, Paused; Test recorded, Awaiting testing, Needs recheck |
| Tool support | Installation, Error, Compatibility, Configuration, Data freshness, Website, Test report, Suggestion; Open, Waiting on author, Reproduced, Fix released, Retest needed, Solved |
| Public reports | Proposed staff-only process tags: Received, Under review, Awaiting info, Review complete; enable after assigning reviewers |
| Public appeals | Proposed staff-only process tags: Received, Under review, Awaiting info, Review complete; enable after assigning appeal reviewers |

The initial PvE set has 16 tags; PvP has 15. Add Raid replacement only when raids
are available and this request type is useful, bringing PvE to 17. An LFG author
can select region, ruleset,
activity, status and optional pace within the five-applied-tag limit. Native
Discord can require a tag, but cannot enforce one from every category or all
template fields. Manual moderation is the first release's enforcement; validated
bot inputs are later work. Available tag sets must remain within 20.
[Tag limits and required-tag flag](https://docs.discord.com/developers/resources/channel).

The directory and support sets each have 14 tags. Directory test-evidence tags,
all support status tags and all safety process tags should be moderated tags;
member-selectable type/purpose/issue tags stay ordinary tags. Discord restricts
moderated tags to users with Manage Threads. Confirm staff capabilities before
enabling that workflow; the bot currently lacks this permission. A directory
post can use type, purpose, release state and evidence state within four tags.
Do not make a staff-only tag the only way a member can create a post. Tag labels
summarize a reviewed record; they do not replace its build, date and limitations.
[Moderated forum tags](https://docs.discord.com/developers/resources/channel#forum-tag-object).

## Channel decisions for the full inventory

The IDs below are configuration targets for implementation. Labels omit existing
decorative emoji where that improves readability. Every returned channel is
accounted for; private operational channels are described by function. Changes
to format mean creating a replacement forum and preserving the original channel.

### Categories

| Current category ID | Current label | Proposed treatment |
| --- | --- | --- |
| `1554318324257521735` | Informations | Rename Start Here; first in navigation; keep useful read-only resources |
| `1554318429115392080` | General chats | Rename Community; second; move obsolete pilot/archive channels out |
| `1554318980897046669` | Alliance | Keep faction scope; third; order LFG before lasting guild recruitment |
| `1554318998466863224` | Horde | Keep the same structure as Alliance; fourth |
| `1554318818237485157` | Addons & Tools | Keep; fifth; expose through activity interests |
| `1554318866291757077` | Class Channels | Rename Classes; sixth; expose chosen classes through onboarding |
| `1554319035112497244` | Trading | Keep; seventh; make region/ruleset and current availability explicit |
| `1554318911082856538` | Media | Rename Social & Media; eighth; voluntary subscriptions |
| `1554318933941690529` | Blacklist | Propose Safety & Appeals; ninth; keep member-readable reports |

Add an Archives category near the bottom for preserved replaced channels.
Use a staff-only Operations category for existing private operational channels
once their access and bot dependencies are verified. Copy child permission
overwrites and avoid automatically syncing them to a different parent.

### Start Here and Community

| Current channel ID | Current label | Proposed destination or name | Format and purpose |
| --- | --- | --- | --- |
| `1554319918714060840` | announcements | Start Here / announcements | Keep announcement channel; confirmed community news and hosted sessions |
| `1554319934077669428` | rules | Start Here / rules | Keep read-only; expose as Server Guide resource after content review |
| `1554316934252593245` | newcomers | Start Here / introductions | Keep text and system-channel binding; optional greetings and introductions |
| `1554321078988574791` | relevant-links | Start Here / useful-links | Keep read-only; concise destination directory and Guide resource |
| `1554321234332885032` | wow-forever-faq | Start Here / faq | Keep read-only; sourced answers and Guide resource |
| `1554337768006488174` | server-updates | Operations / bot-updates | Preserve private access and integrations; distinguish from public game news |
| `1554613971636584468` | activity-checker | Operations after dependency review | Remove from newcomer defaults; preserve anti-abuse behavior and original access until reviewed |
| `1554955387105710221` | Private safety review | Operations / safety-review | Preserve private access; use neutral staff-facing name after owner review |
| `1554322593589235732` | general | Community / general | Keep text; everyday conversation and questions |
| `1554322842114461787` | pvp-chat | Community / pvp-chat | Keep text for tactics; send group searches to faction PvP forums |
| `1554322870753034321` | hardcore | Community / hardcore | Keep opt-in text; label current planning/client scope accurately |
| `1554349669008678994` | troll-chat | Community / off-topic | Keep text; use a welcoming name and a short, clear conduct rule |
| `1555036794016243773` | newcomers | Community / new-player-help | Keep text; make it the default beginner-help destination |
| `1554889798743887984` | forever-shared-chat | Archives / forever-shared-chat | Preserve content; remove obsolete pilot topic; exclude from defaults |
| `1554898196721967137` | group-leveling-archive | Archives / group-leveling-archive | Keep permanently as requested; make read-only when permissions allow |
| `1554946655244263628` | group-leveling | Community / group-leveling | Keep the current native forum; recurring partner/group searches |

Keep the original system channel ID when renaming `introductions`; a rename
must not silently change welcome automation. The two beginner surfaces have
different purposes, so their existing content does not need merging or copying.

### Everyday community experience

Keep `general`, `new-player-help`, `pvp-chat`, `hardcore` and `off-topic` as
conversations. Requiring a forum post for a greeting or quick question adds
unnecessary work. Begin with the following purposes and short proposed topics:

| Channel | Proposed topic | Operating rule |
| --- | --- | --- |
| introductions | Say hello and share what you enjoy playing. Region, faction and usual play times are optional. | Do not require a real name, age, location or guild membership; reply personally during staffed hours |
| new-player-help | Ask setup, ruleset or getting-started questions. Tell us your game version when it affects the answer. | Ask for missing context in a reply; move a lengthy problem into a thread or tool-support with the member's agreement |
| general | Everyday Forever conversation. Use faction group forums for recruitment and tool-support for technical problems. | Brief questions are welcome; redirect with a direct link, without deleting useful context |
| pvp-chat | Discuss PvP tactics, builds and experiences. Find teammates in your faction's lfg-pvp forum. | Separate observed mechanics from predictions; keep actual group signups in their own posts |
| hardcore | Discuss Hardcore plans and experiences; identify the client and whether the content is currently available. | Keep optional; do not present planned Forever features as released or mix incompatible game versions |
| off-topic | Off-topic conversation, with the same respect and safety rules as the rest of the server. | No exemption from conduct rules; do not use a channel name that invites harassment |

These are navigation topics, not new permanent bot announcements. Review the
existing pins before replacing anything. A help steward should acknowledge a
question, provide a useful answer or link, and ask whether it solved the problem.
An answer that proves useful repeatedly becomes a candidate FAQ/guide correction.
Credit the contributor only with permission; no public copy of a member's chat
or screenshot is automatic. Avoid scheduled generic questions, automated welcome
walls and XP rewards for message volume. A real staffed help session is a better
pilot once a host and time are confirmed; do not promise both EU and NA coverage
without people to provide it.

### Alliance and Horde

Use identical ordering in both faction categories: posting rules, PvE LFG,
PvP LFG, scheduled runs, looking for guild, guild recruitment. One faction must
not receive a better workflow than the other.

| Current channel ID | Faction and label | Proposed treatment |
| --- | --- | --- |
| `1554325566856106036` | Alliance / post-rules | Keep read-only; concise routing and posting rules |
| `1554327593560318052` | Alliance / lfg-pve | Create list forum; archive this text channel without copying its messages |
| `1554327610589450250` | Alliance / lfg-pvp | Create list forum; archive this text channel without copying its messages |
| `1554327396990320741` | Alliance / pugs-adverts | Keep forum ID; propose rename scheduled-runs; clear one-run/one-roster template |
| `1554327239733157958` | Alliance / lf-guild | Keep forum ID and tags; standardize presentation and freshness |
| `1554327206396690432` | Alliance / guild-recruitment | Keep forum ID and tags; one maintained listing per guild |
| `1554327700909592628` | Horde / post-rules | Keep read-only; same routing and rules as Alliance |
| `1554327821604888596` | Horde / lfg-pve | Create list forum; archive this text channel without copying its messages |
| `1554327854471184455` | Horde / lfg-pvp | Create list forum; archive this text channel without copying its messages |
| `1554327956329865256` | Horde / pugs-adverts | Keep forum ID; propose rename scheduled-runs; same roster policy |
| `1554327900998869092` | Horde / lf-guild | Keep forum ID and tags; standardize presentation and freshness |
| `1554327927750000661` | Horde / guild-recruitment | Keep forum ID and tags; same listing rules as Alliance |

A scheduled run needs a dated title, start/end, region/ruleset, host, vacancies,
requirements, loot expectations where applicable, and one signup link. Make a
new dated post for the next run; do not reuse an old roster conversation by
only changing its date. A recurring group's identity belongs in its guild or
series information. The one-run rule is a proposed clarification of the current
ambiguous PUG copy.

Raid-Helper is installed, but its live workflow was not inspected. Confirm it
as the roster authority for hosted runs if it meets the organizers' needs.
Discord Scheduled Events may advertise the session, while their Interested
button indicates interest and notifications rather than an assigned place.
[Discord Scheduled Events](https://support.discord.com/hc/en-us/articles/4409494125719-Scheduled-Events).

### Addons and classes

| Current channel ID | Current label | Proposed treatment |
| --- | --- | --- |
| `1554323326598647940` | Addons / rules | Keep read-only; rename tool-rules and clarify distribution/compatibility requirements |
| `1554323354574389431` | advertise-your-addon | Create tool-directory forum; preserve original text channel as archive |
| `1554323429182673047` | addon-discussion | Keep text for comparisons, UI ideas and casual discussion |
| `1554323491241594930` | helpdesk-support | Create tool-support forum; preserve original text channel as archive |
| `1554323564205973644` | druid | Keep class text chat; optional class subscription |
| `1554323577002524772` | paladin | Keep class text chat; optional class subscription |
| `1554323589921243207` | rogue | Keep class text chat; optional class subscription |
| `1554323600058621962` | mage | Keep class text chat; optional class subscription |
| `1554323608287846470` | warlock | Keep class text chat; optional class subscription |
| `1554323618983448667` | shaman | Keep class text chat; optional class subscription |
| `1554323634368020611` | warrior | Keep class text chat; optional class subscription |
| `1554323646653137016` | hunter | Keep class text chat; optional class subscription |
| `1554323760780152902` | priest | Keep class text chat; optional class subscription |

#### A directory members can trust

Use `tool-directory` rather than an addon-only name because WoW Trader includes
a web workspace, an in-game Collector and a separate desktop Companion. Each
independently distributed product gets one maintained entry, with cross-links
where appropriate. Different installers, support requirements and readiness
states must remain visible. `addon-discussion` stays the informal addon chat;
general tool problems belong in support, not in the directory's announcement feed.

Each directory entry needs purpose, maintainer/contact, authoritative source or
download, product version, supported client/build or browser/OS, distribution
state, checked date, tested features and known limitations. Use the existing
`/addons` pages rather than duplicating downloads. A third-party project can be
listed fairly when its source and distribution rights are clear; do not require
KFC affiliation or imply a listing is a security certification.

The owner reports WoW Trader tested on Forever; exact-version claims still need
the maintainer's evidence. Other guild raid addons remain awaiting Forever
testing. Test recorded means a scoped observation exists, not universal support
or approval of every file. Stable describes the maintainer's release state, not
Forever compatibility. Record a build change as Needs recheck when appropriate.
The web workspace can be available while desktop distribution remains an
approved pilot. Never offer an old-client package as a Forever download.

Start with actual maintained products and their real status; do not seed fake
reviews, installations or endorsements. One pinned directory index can explain
how to choose a tool and where to get support. Archived entries remain
searchable, so the index and website links must also reach older posts.

#### Support and the invited tester cohort

Use one `tool-support` forum for installation help, addon issues, web-tool
problems, data-freshness questions and test reports. This avoids a second empty
tester category. A short issue needs a descriptive title and product/version,
client/build or browser/OS, problem, expected/actual result, steps already tried
and relevant reproduction steps. Ask for extra diagnostics only when needed.
Screenshots and error text are optional and must be redacted. Never request
tokens, pairing codes or credentials, even in a private support conversation.
Sensitive diagnostics need a designated private route and data-handling policy;
until those exist, request only redacted, non-sensitive reproduction details.

The initial moderator-maintainer workflow is manual:

1. Triage the post and apply an appropriate status; request only missing context.
2. Record Reproduced only after reproducing the issue; otherwise document the
   observation and limitations without claiming confirmation.
3. Link a released fix and version, then request a retest when necessary.
4. Mark Solved after the reporter confirms success or a maintainer records a
   scoped verification. Silence is not a successful fix; label inactivity instead.

Open is unresolved, Waiting on author identifies missing information, and
Fix released does not imply the reporter has verified it. Keep an unresolved
post linked to its actual product owner; do not advertise response guarantees
before staffed hours are known. Solutions remain searchable and should include
the version to which they apply.

Link the existing five `/contribute` assignments from the support guidelines.
Test report posts name the assignment and version, show the observation, and
record retest results in the same conversation. A steward manually coordinates
claimed assignments and maintains a short coverage summary; the website is not
currently a live claim queue. Browser tests must not require installing the
Collector or receiving production credentials. Consolidate duplicate issues by
linking the original, preserving the reporter's evidence and contribution.

#### Class channels worth returning to

Keep all nine class chats, with one maintained resource index per class when a
qualified contributor and useful material exist. Link authoritative guides,
verified builds, relevant tools and a few useful discussion threads. Every
build-sensitive recommendation needs scope and a review date; old Classic/TBC
advice must not silently become Forever advice. The index can link a curated
resource thread, but long-term resources should also live on the website so
thread inactivity does not make them disappear from discovery.

For complex questions, offer a small optional prompt: goal, level/spec, ruleset,
game build and what the player is struggling with. Never turn casual class chat
into an application form. Run an occasional build/UI clinic only with an actual
host. Good recurring answers can become reviewed guides with contributor
permission, giving players durable help and a meaningful reason to return.
Do not split nine classes into dozens of empty specialization channels.

### Trading and social channels

| Current channel ID | Current label | Proposed treatment |
| --- | --- | --- |
| `1554329325514395788` | trade-rules | Keep read-only; add purpose and region/ruleset requirements |
| `1554329346565734500` | alliance-trade | Keep text initially; structured short listings; trial a forum only if listings are being lost |
| `1554329363250421771` | horde-trade | Same policy and workflow as Alliance |
| `1554324262972563596` | wowhead | Keep the current feed integration and read-only access; label third-party coverage accurately |
| `1554324295143133184` | streamers | Keep text; clarify that one promo/day is policy, while current six-hour slowmode is a separate setting |
| `1554324336574337024` | videos | Keep text; useful clips and guides with short context |
| `1554324352537731142` | memes | Keep text; voluntary social subscription |
| `1554328068523434064` | real-life | Keep text; voluntary sharing without pressure for personal details |

Trade fields should be WTB/WTS/WTT or crafting, item/service, region/ruleset,
price or terms, availability and contact. Point to WoW Trader where useful and
show data freshness; do not imply live coverage when no upload has arrived.
Existing trading and boost policy remains the source of allowed advertisements.
Forum conversion for trade is a later experiment, because rapid text trading
may already suit its members; current activity was not measured.

Use readable short titles such as `WTS | EU | Normal | Item | Price`, with an
availability update when sold or withdrawn. Listings describe asking prices,
not verified sales. WoW Trader links must identify the relevant market and scan
freshness; a recent tool release is not a recent market scan. A later approved
collector rota can improve coverage, but it must not broadcast every upload.
If recurring crafters cannot be found in chat, trial a single crafting-services
directory with faction/region/ruleset, services, terms, contact and last
confirmation. This is conditional on actual requests and a maintainer, not a
new default channel or a reason to relax existing boost policy.

Keep existing bot feed destinations by ID. A renamed channel must not break
Streamcord or news routing. Replace the long decorative social topics with
one or two sentences describing the channel and its relevant posting limit.

#### News, creators and social participation

The `wowhead` feed remains a read-only third-party news destination. Explain
whether an item is source reporting, commentary or an official announcement
linked through that source. Keep the integration's destination ID and inspect
its configuration before changing its name or behavior. Members can discuss a
relevant item in a native thread or `general`; do not produce a second automated
summary for every incoming link. `announcements` is for actual community changes,
confirmed events and substantive releases. One human-reviewed roundup is useful
when there is something to report, without a compulsory weekly filler post.

The owner-approved streaming pilot now adds `live-now` and `Community Streams`,
with optional post-join routing. See [the streaming release](discord-streaming-release.md)
for live IDs, verified permissions and the still-pending Streamcord activation.
The existing `streamers` channel and integration configuration were preserved.

The `streamers` channel currently has six-hour slowmode, while its topic says
one promotion per day. Discord slowmode tops out at six hours and does not
apply to bots or accounts with Bypass Slowmode; it cannot enforce a 24-hour
promotion limit. Keep one promotional post per creator per rolling 24 hours as
an explicit proposed policy, with manual review first. Decide separately how
Streamcord's automated alerts are deduplicated and limited after inspecting its
configuration. Do not convert its destination into a forum until integration
support is verified. Later bot enforcement would need its own creator identity,
quota and audit handling, rather than an invalid 86400-second setting.
[Slowmode limits](https://docs.discord.com/developers/resources/channel).

Ask creators to include what they are playing, language and the session's focus;
do not require advertising slogans or imply featured status can be bought.
Occasional host-approved spotlights can feature real teaching, beginner sessions
or community events. A creator-profile directory is justified only when the
current stream is genuinely hard to browse and someone will maintain it.

Keep `videos`, `memes` and `real-life` voluntary text channels initially. Videos
need a sentence explaining the clip or guide, with client/build for technical
advice. A memorable play can be social content without pretending to be a guide.
If video volume makes discovery difficult, test gallery-style forum browsing
with existing contributors; preserve the old channel instead of migrating their
media automatically. `real-life` needs a clear no-pressure privacy rule: no
demand for personal details or reposting another member's image without consent.
Social channels use the same conduct rules as the rest of the community.

### Safety and appeals

| Current channel ID | Current label | Proposed treatment |
| --- | --- | --- |
| `1554324532171505744` | blacklist-rules | Keep read-only; propose safety-rules name and clear review/private evidence route |
| `1554324869452144681` | report-here | Keep member-readable forum; list layout and public/private evidence boundary |
| `1554324724765433968` | appeal-here | Keep member-readable forum; clear original-case reference and appropriate appeal route |
| `1554325308318941316` | blacklisted-users | Keep read-only; propose reviewed-alerts name; publish reviewed outcomes with status, not raw accusations |

Members' ability to read reports remains the owner's explicit choice. A reported
incident, a moderator finding and an appealed finding must have distinct labels.
The website's FG-reference appeal form is for website player cases; do not send
a Discord-banned member there as though it were a working server-ban appeal.
Server Guide should identify an actual staff contact route for Discord access
issues once the team has designated one.

Use public process labels and a short staff acknowledgement so reporters know
what happens next. Received or Under review is not a finding against a player.
Request private evidence through the approved website route, never in a
member-readable thread; do not promise a private submission remains private if
someone later pastes it into the public forum. Do not enable staff-only tags
until the designated reviewers' effective permissions have been checked.

`reviewed-alerts` should contain the case reference, reviewed scope, outcome,
decision date, relevant appeal status and a link to the current reviewed record.
Publish only necessary information, with no public pile-ons, doxxing or
speculative guilt labels. A correction, reversal or successful appeal must
update the existing alert visibly. Public reports must never automatically
become warnings or addon blocks. An appeal needs a reviewer who can reconsider
the original decision and an actual contact path, not a promise of 24/7 review.
Scope response expectations to the staffing rota, and keep sensitive review work
in the existing private operational surface.

## Newcomer navigation

The owner's October 1 settings screenshots and a fresh configuration audit are
covered in the [onboarding and Server Guide plan](discord-onboarding-plan.md).
That follow-up proposes exact welcome/task copy, an undecided entry route,
optional class-to-channel mapping and faction-specific discovery choices. It
refines the question timing proposed below; those onboarding changes are not
yet implemented.

Start Here should answer where to ask, find a group, find a guild and get help.
Use three Server Guide tasks: choose faction/interests, find or post a group,
and find the community rules/help route. Use the existing rules, FAQ and links
as resource pages after reviewing their content. Resources can reduce visible
channel clutter without deleting the underlying information.
[Server Guide resources and tasks](https://support.discord.com/hc/en-us/articles/13497665141655-Server-Guide-FAQ).

A candidate seven-channel default set is `introductions`, `general`,
`new-player-help`, `group-leveling`, `addon-discussion`, `announcements` and
`pvp-chat`. These include five ordinary text destinations with member view/send
permissions, without depending on how the UI counts forum creation. Keep rules,
FAQ and useful links in Server Guide resources rather than counting a resource
page as a visible default channel. Validate the current advanced-mode onboarding
preview and effective permissions before saving.
Discord's published onboarding requirement is at least seven defaults, five
allowing everyone to view and send; do not weaken private/read-only channels to
meet the count.
[Onboarding requirements](https://support.discord.com/hc/en-us/articles/11074987197975-Community-Onboarding-FAQ).

Keep the existing faction and class questions, both intentional BOT choices,
their role mappings, and the intentional Administrator staff role named Rogue.
Add optional activity interests: dungeon/questing groups, PvP, guilds, tools/addons,
RP, social. Route the selected faction to its new forums. Region is an optional
interest for discovery and notifications, while each group post records the
region actually being used. Choosing channels must not fabricate participation
or authorize cross-server sharing.

Use channel subscriptions before adding many new roles. If notification roles
are needed, keep them opt-in and restrict who can mention them. Only relevant
confirmed sessions receive a reminder; a reminder goes to followers or signed-up
participants, not every member. Preserve mentions-only default notifications.

RP deserves a visible optional route. Start with a hosted RP planning thread
linked from the roleplaying interest rather than an empty category. Add a
dedicated RP forum after a steward and recurring activity exist. Voice rooms
should likewise follow verified organizer demand and offer a text participation
option; their absence in this audit alone is insufficient reason for a large tree.

## Non-LFG priorities and expansion gates

The improvements above give existing channels clearer responsibilities. They
do not require a large new channel tree or a daily bot-posting schedule.

| Priority | Concrete next change | Evidence of success |
| --- | --- | --- |
| First | Distinguish introductions/help; simplify topics and Server Guide routes | New testers find the help route and receive a useful response |
| First | Launch tool-directory/tool-support with real entries, case templates and tester assignment links | A member finds the authoritative download and can locate a solved issue later |
| First | Correct news labels, streamer policy and safety process copy | Source, posting limits and allegation/review boundaries are understandable |
| Next | Establish maintained class indexes and one confirmed help or tool-testing session | Useful answers are reused and participants confirm problems solved |
| Conditional | Crafting directory, creator profiles, video forum, dedicated RP forum or additional voice rooms | Observed demand, a named steward and a pilot demonstrate an improvement |

Route website/tool suggestions into `tool-support` with Website or Suggestion
tags; game discussion stays in `general`. Do not add separate feedback, bug,
beta, suggestion and tester channels for the same small support team. A steward
records accepted work and tells the reporter when it is released; a reaction or
poll is not a delivery promise. Larger editorial contributions can continue
through `/contribute` and the existing review process.

Move obsolete pilot/archive channels out of everyday navigation and remove
outdated pilot descriptions. Preserve the leveling archive and all original
messages/hidden threads. Moving a public operations channel to an Operations
category does not itself authorize hiding it: inspect activity-checker and
other bot dependencies before changing access. Keep private channels private
without syncing overwrites indiscriminately.

Measure a two-week pilot through manually recorded, minimal case/activity
summaries: useful help responses, solved issues, verified test results, resource
reuse, returning voluntary participants and steward workload. Do not mine the
whole chat history or publish member-level engagement scores. Record unknown
outcomes as unknown. Review unanswered posts during staffed hours and keep each
directory's named owner responsible for stale entries. Helpful, reviewed public
guides can support website discovery; adding Discord channels alone is not an
SEO improvement or a search-ranking guarantee.

## Bot and website work after the native forums

The current bot exposes only bridge participation commands in this server.
The existing website handler for `/lfg` returns links, and its registration
script is not a structured group workflow. The features below are proposed
implementation work, with the [integration blueprint](web-discord-integration-blueprint.md)
as the architectural base.

| Capability | Expected member experience | Delivery condition |
| --- | --- | --- |
| Group form | Choose activity, region/ruleset, start, duration, needs and pace; see a preview | Validate required fields and game scope; route to the selected faction/forum |
| Human forum posts | Members create and edit their own native posts | Keep this as the default workflow; templates and tags work without bot publication |
| Optional bot-created listing | A host explicitly submits a form and sees an attributed structured bot post | Clearly show who owns it; never pretend the bot is the user or rewrite human history |
| Group maintenance | Host can change spots, time or status on a managed listing | Author/staff authorization, version checks, idempotent interactions and no duplicate posts |
| Upcoming groups | Website lists real upcoming groups by start time with region/faction/activity filters | Store structured times; only list owner-approved records, not scraped Discord chats |
| Notifications | Followers receive relevant reminders or a cancellation update | Opt-in recipients, deduplication, quiet limits and monitoring |
| Session expiry | Past groups leave the upcoming queue; host can confirm completion | Do not infer attendance from time, messages, interest clicks or a roster |
| Hosted-run signup | One accepted/waitlisted roster and a clear host contact | Confirm Raid-Helper initially or implement the custom roster phase; no competing lists |
| Directory freshness | Recruiters and maintainers can reconfirm their own entries | Track last confirmation and send a bounded private reminder |
| Resource lookup | A member asks for a guide or tool and receives the reviewed answer with its scope and support route | Search approved published records only; show source/review dates and avoid unsolicited answers to all chat |
| Support and retesting | The case owner receives a fix or retest request attached to the original issue | Authorized status changes, explicit subscriptions, private diagnostic boundaries and retry-safe updates |
| Market coverage notice | Approved collector stewards hear when an agreed market becomes stale and when coverage recovers | Verify the Trader freshness contract; opt-in private notices, deduplication and quiet limits; no public per-scan spam |

For the first bot group release, use optional creation and owner controls before
automated matching, attendance scores or chat scanning. A form choice such as
"in one hour" becomes an absolute time at confirmation, with timezone handling
and an edit preview. Never send automatic follow-up spam into unrelated chats.

The current command-registration script uses a bulk replacement PUT. Reusing it
as-is could remove `/bridge`. Implement registration that reconciles the desired
commands while preserving existing approved commands. Add the new commands to
the actual interaction router; registering a name alone does not make it work.
The retired leveling text bridge cannot relay forum posts. Forum improvements
must not restart the rejected history import or change cross-server consent.

## Implementation order and migration

| Batch | Concrete work | Result to verify |
| --- | --- | --- |
| 1 | Create four LFG forums; add templates/settings/tags; preserve old text channels; standardize six guild/PUG forums | Both factions can post and reply; groups are readable; old content remains accessible |
| 2 | Clarify newcomers names; reorder categories; repair onboarding routing; improve short topics and Guide resources; move archives/operations | A new member can find help, groups and guilds through their selected interests |
| 3 | Create tool directory/support forums; route existing tester assignments; verify feed wording, social limits and staffed safety labels | Projects, test results and unresolved issues are findable; integrations and private evidence boundaries keep working |
| 4 | Implement the optional group bot and website projection; run actual host/tester sessions | Dates, edits, cancellation, reminders and restart/retry behavior are correct |

Batch 1 is the next implementation release. The current request authorizes this
analysis and plan; no batch has been applied during this research. The existing
group-leveling archive decision remains binding throughout the migration.

Discord does not support an in-place text-to-forum conversion through its API.
For each conversion, create the replacement, verify its configuration and access,
then rename/move the old channel to Archives and update navigation references.
Keep existing member messages in their original channel. Existing forums keep
their IDs and tag IDs. Read back every changed field before the next batch.
[Channel modification limits](https://docs.discord.com/developers/resources/channel#modify-channel).

The installed bot can manage the four LFG channels and current forums. It lacks
Manage Permissions and Manage Threads there; several read-only information
channels still deny its effective Manage Channels permission. This is a known
implementation dependency for read-only archives, moves that change visibility,
thread lifecycle and the remaining topic changes. Keep the plan scoped to those
operations and use a specific temporary grant or an owner-executed permission
edit; neither Administrator nor blanket access is needed for forum creation.
[Discord permissions](https://docs.discord.com/developers/topics/permissions).

Before a batch, capture the current selected-channel configuration and compare
it again immediately before each edit. Keep a journal of created IDs and verified
updates. On an ambiguous creation result, look for the created forum before
retrying. Preserve every archive and hidden thread. Inspect third-party bot
dependencies and existing pins before changing resource surfaces. Moving a
channel must not implicitly sync it to a new category's permissions.

Rollback restores known names, topics, positions, navigation and reviewed
permission changes. If people have posted in a new forum, retain it and their
posts; do not delete it merely to recreate the previous channel count. Restore
access to the former destination and explain the current route through its topic.

## Experience verification and ongoing ownership

These are release acceptance tasks, not claims of tests already completed.
Use Discord's onboarding preview and approved real testers for the native client
checks. Configuration reads cannot prove desktop/mobile layout or user success.

| Journey or edge case | Acceptance condition |
| --- | --- |
| New EU Alliance player on mobile | Finds the correct PvE forum and creates a useful post with no routing help |
| NA Horde PvP player | Finds the Horde forum, understands local start time and joins the correct post |
| Someone starting in one hour | Absolute time is recorded; later readers do not see an ambiguous countdown |
| Different ruleset or activity | Character ruleset and desired activity remain separate; matching avoids incompatible groups |
| Group fills, loses a player or cancels | Host can update status/spots; cancellation is clear to existing participants |
| Player only seeking a guild | Guild search does not require sorting through dungeon or PvP requests |
| Tool/addon issue is answered | One issue has one conversation; solution and applicable version stay findable |
| Invited tester uses support | Finds an existing assignment, records a reproducible observation and retests in the same post without exposing credentials |
| Tool has mixed readiness | Available web features do not imply unrestricted desktop distribution or compatibility of untested raid addons |
| Streamer or automated feed posts | Promotion policy is distinct from slowmode; existing bot routing works and alerts do not flood the channel |
| Report is appealed or corrected | Public process state is not guilt; reviewed alerts are visibly corrected without publishing private evidence |
| Member with multiple faction/class interests | Selections work without role-name collisions or accidental access changes |
| Existing member using a bookmark | Old ID remains available and points to the new route where applicable |
| Private operational or archive content | Original access is preserved; an archive name is not mistaken for enforced read-only access |
| Moderator manages a forum | Actual staff permissions permit the adopted workflow without broad member privileges |
| Website/bot update or outage | Managed copies do not duplicate; stale data is labelled; native human posts remain usable |
| Native desktop and mobile | Guidelines, tags, title lengths, posting and replies are checked on both clients |

Assign an actual forum maintainer per faction for unanswered requests and stale
listings, a tool/support steward coordinating product maintainers, a safety
review contact and a newcomer-help contact for the staffed hours. Class indexes
need willing qualified reviewers, not nine mandatory titles to fill. Do not
advertise round-the-clock coverage without a rota.
Start with a short weekly review of unanswered group requests, unclear start
times, old Open posts, cancelled sessions, unanswered help and organizer workload.

Proposed maintenance for guild listings is a reconfirmation after 14 days and
removal from active promotion after 30 days without confirmation. An unanswered
listing is stale, not proof the guild stopped recruiting or a player found one;
record that distinction in its maintenance status. For one-session LFG, review
past Open posts daily during staffed hours and ask the host to close or update
them. Use private prompts when implemented and limit each prompt to one per
review period. The Moderator role currently grants no base permissions; confirm
the assigned maintainers' actual combined roles and forum capabilities before
depending on them to manage posts. These are proposed operating duties, not
current automation or a claim that all staff lack permissions.

Proposed targets for the pilot are a clear route to an action within two minutes
and a complete manual LFG post within two minutes. These are design targets,
not current measured performance. Measure successful groups from host/member
confirmation and repeat participation from opt-in records. Do not use raw message
volume, copied history or the server's member count as proof of a good experience.

## Research verification

The existing `npm run bot:audit` succeeded. All nine forum configuration reads,
global and guild command reads, scheduled-event metadata, targeted unresolved-ID
read, and ordinary-member/bot permission evaluations completed. The unresolved
default produced the documented 404 result. The audit's zero high-priority
heuristic findings are not a quality score; the concrete UX gaps above remain.

Only repository documentation was written. No Discord messages, channels,
permissions, onboarding, commands, events, production services, commits or pushes
were changed. Native client walkthroughs and activity metrics remain unverified
until the implementation pilot.

Document checks confirmed coverage of all 62 returned IDs, no unknown channel
IDs, working local document links, balanced template fences, and proposed LFG
tag sets within Discord's count/name limits. The October 1 non-LFG expansion
also checks directory/support tag limits, synchronized channel names, and
the distinction between native settings and proposed staff/bot workflows.
`git diff --check` passed. No
application tests were needed because application code was unchanged.
