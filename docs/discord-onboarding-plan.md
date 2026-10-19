# WoW Forever Discord Onboarding Plan

Prepared October 1, 2026. Status: proposal ready for review; no live onboarding
settings, messages or permissions were changed for this review.

The first useful action should be finding compatible players or getting help.
The community welcomes both factions, EU/NA players, all guilds and people who
prefer to browse quietly. Joining a guild, installing an addon, publishing an
introduction or signing into the website is not an entry requirement.

## Evidence and limits

The owner supplied three settings screenshots taken at 10:52:40, 10:52:52 and
10:53:01 local time. A fresh authenticated GET-only configuration audit at
07:55:39 UTC confirmed the same faction/class questions and seven defaults.

| Observed state                                                              | Consequence                                                            | Proposed change                                                                                                                 |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Faction and class are both required before entry                            | Undecided players must make a class choice before seeing the community | Keep one short required faction question, add an undecided answer, and move class selection to optional post-join customization |
| Class answers assign a role but no channel                                  | Selecting a class does not subscribe the member to its discussion      | Add the matching class channel to each existing answer                                                                          |
| Post-join questions are empty                                               | Tools, social areas and other interests have no customization route    | Add two optional discovery questions with explicit destinations                                                                 |
| Discord reports 37 public channels outside questions/defaults               | Useful areas are easy to miss                                          | Route useful active areas; leave archives outside newcomer customization                                                        |
| A single faction adds seven destinations, one already a default             | With seven defaults, a player starts with 13 unique subscriptions      | Start with that faction's two LFG forums; offer recruitment, runs and trade later                                               |
| The welcome repeats the community name and emphasizes combat                | It gives limited direction to a new or returning player                | Use a shorter welcome covering groups, help, playstyles and community identity                                                  |
| Tasks point to general chat, blacklist rules and announcements              | The first actions do not directly reach the new group/tool workflows   | Replace the three custom tasks with useful group, help and tool destinations                                                    |
| FAQ and useful-links still show Add in the visible resource recommendations | These visible candidates have not been added there                     | Review their content and add them as maintained resources                                                                       |
| Archive channels are also suggested as resources                            | Accepting every automatic suggestion would promote obsolete content    | Select resources manually; exclude archives and news feeds                                                                      |

The Wumpus phone shown on the right is Discord's example, not the actual WoW
Forever mobile preview. These screenshots establish the visible settings, not
the final member experience. They also do not show every section below the
resource recommendations, so this review does not claim that no resources
exist elsewhere.

## Entry and personalization

### One required question before joining

Proposed title: **Which faction will you play?**

Allow multiple answers. Keep the existing question and answer IDs. Retain the
owner's intentional BOT answer, its description and BAN-role assignment.

| Answer                          | Destination                                                                    | Role change                             |
| ------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------- |
| Alliance                        | Alliance lfg-pve `1555114488229797928`; Alliance lfg-pvp `1555115561028157460` | None                                    |
| Horde                           | Horde lfg-pve `1555115605986779228`; Horde lfg-pvp `1555115622935822336`       | None                                    |
| Still deciding / here to browse | general `1554322593589235732`; new-player-help `1555036794016243773`           | None                                    |
| Existing BOT answer             | Preserve its existing configuration                                            | Existing BAN role `1554617887912890378` |

Both faction answers can be selected. The undecided answer sends the member to
existing common destinations. It does not create a holding room or require a
moderator to unlock ordinary participation.

Keep the current seven defaults for the first release: announcements,
group-leveling, new-player-help, general, addon-discussion, pvp-chat and
introductions. This retains five ordinary writable text channels. The proposed
faction mapping gives nine unique subscriptions for one faction and eleven for
both, before optional customization. These are configuration counts, not a
guarantee about sidebar rendering or an activity measurement.

Keep advanced mode and verify publication requirements in the owner preview.
Discord's published baseline is seven default channels, five allowing everyone
to view and send. Read-only resources or private operational channels should
not be made writable to meet that requirement.
[Community Onboarding FAQ](https://support.discord.com/hc/en-us/articles/11074987197975-Community-Onboarding-FAQ).

### Optional class selection after joining

Proposed title: **Which classes do you play?** Allow multiple answers; required
off; ask before joining off. A member can return to Channels & Roles to change
these choices. Keep descriptions short or empty for familiar class names.

| Answer  | Existing class role   | Matching channel              |
| ------- | --------------------- | ----------------------------- |
| Warrior | `1554333000026685470` | warrior `1554323634368020611` |
| Rogue   | `1554332903603966043` | rogue `1554323589921243207`   |
| Hunter  | `1554333198098370580` | hunter `1554323646653137016`  |
| Paladin | `1554333263106019361` | paladin `1554323577002524772` |
| Mage    | `1554332998751494204` | mage `1554323600058621962`    |
| Shaman  | `1554333001666662410` | shaman `1554323618983448667`  |
| Warlock | `1554332997916950600` | warlock `1554323608287846470` |
| Priest  | `1554332990153293835` | priest `1554323760780152902`  |
| Druid   | `1554332997250056192` | druid `1554323564205973644`   |

Preserve the class question's existing BOT option and its assignment as well.
Moving this question after entry also moves that option after entry; this is a
proposed timing change, not a claim that its timing is unchanged. The required
faction question retains its existing BOT option before entry.

The staff Administrator role also named Rogue, `1554525480013660250`, must
never be used for the class answer. Match by verified ID rather than name.
Normal class selection must not grant moderation or administrative permissions.

### Optional discovery questions

Both questions are multi-select, not required, and not shown before joining.
Do not add notification roles in this release: selecting channels does not mean
the member wants alerts.

**What else would you like to see?**

| Answer                             | Exact channel assignments                                                                                     |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Alliance guilds and organized runs | lf-guild `1554327239733157958`; guild-recruitment `1554327206396690432`; scheduled-runs `1554327396990320741` |
| Horde guilds and organized runs    | lf-guild `1554327900998869092`; guild-recruitment `1554327927750000661`; scheduled-runs `1554327956329865256` |
| Addons and tools                   | tool-directory `1555101552463716373`; tool-support `1555101566728409108`; tool-rules `1554323326598647940`    |
| Alliance trading and crafting      | alliance-trade `1554329346565734500`; trade-rules `1554329325514395788`                                       |
| Horde trading and crafting         | horde-trade `1554329363250421771`; trade-rules `1554329325514395788`                                          |
| Hardcore discussions               | hardcore `1554322870753034321`                                                                                |

**News, social channels and community support**

| Answer              | Exact channel assignments                                                                                                                       |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Game news           | wowhead `1554324262972563596`                                                                                                                   |
| Videos and creators | videos `1554324336574337024`; streamers `1554324295143133184`                                                                                   |
| Social chat         | off-topic `1554349669008678994`; memes `1554324352537731142`; real-life `1554328068523434064`                                                   |
| Reports and appeals | safety-rules `1554324532171505744`; report-here `1554324869452144681`; appeal-here `1554324724765433968`; reviewed-alerts `1554325308318941316` |

These are explicit channel subscriptions. Native answers assign static channel
and role lists; the documented schema has no conditional faction-by-interest
routing. An Alliance player can intentionally select a Horde area too. Do not
promise automatic filtering based on an earlier answer.
[Guild onboarding schema](https://docs.discord.com/developers/resources/guild#guild-onboarding-object).

Faction post-rules remain accessible through Browse Channels and existing forum
guidance. Do not promote their old DM-only messages into resource pages before
the owner reconciles them with the current pinned reply-friendly guidance.
Archives and activity-checker stay outside the newcomer questions. The warning
count need not reach zero when excluded destinations are deliberate.

No extra region question is needed before entry. EU/NA tags and the region field
in group posts already carry useful region information. Region-specific alerts
can become an optional preference once actual organizers and an alert workflow
exist. RP players can use general and the existing Roleplaying group tags;
a separate RP area should follow an organizer and real demand.

Discord recommends short choices and moving nonessential customization out of
the entry flow. The class list remains recognizable rather than being split
into arbitrary groups just to reduce its answer count.
[Community Onboarding Examples](https://support.discord.com/hc/en-us/articles/10394859532823-Community-Onboarding-Examples).

## Server Guide

### Welcome sign

Proposed copy:

> Welcome to WoW Forever Discord! Find leveling partners, dungeon groups, PvP
> teammates, guilds and useful tools across Alliance and Horde, EU and NA.
> Whether you play PvE, PvP or RP, you're welcome here. Browse at your own pace,
> ask a question, or join a group. This is an independent, player-run community.

Use the WoW Forever community logo and identity. If a contributor attribution
is needed in resource content, use **Open source contributors**, following the
owner's preference. The welcome should not imply Blizzard affiliation or
advertise unverified member totals, staffing or activity.

### Three custom tasks

| Order | Label                          | Target                                | Useful result                                                     |
| ----- | ------------------------------ | ------------------------------------- | ----------------------------------------------------------------- |
| 1     | Find people to level with      | group-leveling `1554946655244263628`  | Inspect real recurring groups or create a clear request           |
| 2     | Find an answer or ask for help | new-player-help `1555036794016243773` | Reach a visible help destination                                  |
| 3     | Explore addons and tools       | tool-directory `1555101552463716373`  | Inspect maintained projects and their actual compatibility status |

Retain Discord's existing rules step. Tasks are suggestions, not new access
gates. Introductions stay optional; task completion must not require a public
post, addon installation or website registration. Individual tasks need not be
useful to every member: a returning player can go directly to their LFG forum.

Confirm in the owner UI that the task picker accepts the two forum targets and
that tapping them opens the expected forum. This has not been verified in a
client. If a forum target is unavailable, use addon-discussion for the tools
task with its existing directory/support navigation, and introductions for an
optional "Share what you're playing" task. Do not create a duplicate text
channel merely to satisfy the task picker.

### Maintained resources

| Resource title                       | Existing source                    | Review before conversion                                                        |
| ------------------------------------ | ---------------------------------- | ------------------------------------------------------------------------------- |
| Community rules                      | rules `1554319934077669428`        | Brief behavior rules consistent with current screening and forum policies       |
| Getting started and common questions | faq `1554321234332885032`          | Current channel names; where to find groups, choose class channels and get help |
| Guides, downloads and useful links   | useful-links `1554321078988574791` | Working links, source labels, tool versions and compatibility status            |

Put a short task-based index at the top of the FAQ: find a group, find a guild,
choose class/interests, get tool help, report an issue, and change channel
preferences. Use links to existing channels instead of copying entire forum
templates. State that report-here and appeal-here are member-readable; link the
website's private evidence route where applicable. A website player-case
appeal is not an established Discord account-ban appeal route.

Guide resources begin at the top and retain existing message content. Review
every selected channel for obsolete or contradictory messages before conversion.
Automatic recommendations are candidates, not a curated resource list. Keep
wowhead as a news feed and keep every archive out of the Guide.
[Server Guide FAQ](https://support.discord.com/hc/en-us/articles/13497665141655-Server-Guide-FAQ).

The Guide copy and resource selection need the native owner UI. No documented
public bot endpoint for editing these Guide fields was established in this
review. The bot's read-only audit cannot verify their rendered presentation.

## Human welcome and later bot work

Use a real host or helper to answer the first useful question when available.
Before a recruitment push, have a confirmed host publish an actual group with
date, region, faction, level, pace and open places. Empty forums should explain
how to make a request through their guidelines; they should not contain fake
participants or placeholder events. Do not promise staffed hours until the
team has agreed them.

The next bot feature should be a small private `/start` navigator: find a group,
find a guild, get help, find tools, or report an issue. Ask faction and region
only when necessary for that action, then return existing channel links. The
bot cannot currently infer a member's faction from the native question: faction
answers assign channels, not faction roles. Any stored preferences need an
explicit member action and a clear way to reset them.

Use Discord's native Channels & Roles and Browse Channels navigation in an
existing FAQ/index. The documented message links are `<id:customize>` and
`<id:browse>`. Check rendering in Discord before publication; do not assume
these tokens render identically on the website.
[Discord message formatting](https://docs.discord.com/developers/reference#message-formatting).

Bot reminders and event notifications should follow an explicit signup or
opt-in preference. Class roles and a server join are not blanket notification
consent. There is no need for a welcome DM, repeated bot greetings, an extra
verification maze or a public activity score.

## Implementation and verification

1. Prepare a scoped onboarding operator using existing configuration readers
   and fixed server/application identity checks. Preserve full current prompt
   fields, emoji, existing IDs and role assignments; do not reconstruct writes
   from the audit's intentionally reduced response schema. Validate referenced
   channels and ordinary class roles before the documented onboarding update.
2. Preview the precise question/default changes and apply only this proposal
   after the owner requests implementation. Reject stale source configuration;
   read back the result. The channel conversion and bridge operators are not
   appropriate entry points for this change.
3. In the native owner UI, apply the welcome, tasks and reviewed resources.
   Preview them before saving. Keep announcements, archives, rules screening,
   staff roles, moderation decisions and third-party bot settings out of this
   release's automated mutations.
4. Refresh the website's Discord/onboarding copy using its existing publication
   process after the live names and flow are confirmed. Reading revised local
   article text does not establish that published database-backed content changed.
5. Run the member journey checks below on desktop and mobile. Then prepare the
   optional `/start` bot navigator as a separate implementation.

| Journey                       | Acceptance check                                                                                     |
| ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| Alliance newcomer             | One required faction choice; nine planned initial subscriptions; correct Alliance LFG targets        |
| Horde newcomer                | Correct Horde LFG targets, with equivalent permissions and copy                                      |
| Both factions or undecided    | Both can be selected; undecided can enter and ask for help                                           |
| Class player or alt           | Optional class selection opens its channel; deselection/change works; no staff role granted          |
| Guild recruiter               | Optional faction-specific choice reaches both guild forums and scheduled runs                        |
| Tool user                     | Directory/support reachable; real readiness labels visible; installation optional                    |
| Quiet browser                 | Can browse without posting an introduction or completing every task                                  |
| Member with DMs disabled      | Core flow works inside the server                                                                    |
| Member seeking reporting help | Public visibility explained before evidence is posted; appropriate private route discoverable        |
| Existing or returning member  | Customize/Browse remain useful; preferences can be changed without a support ticket                  |
| Desktop and mobile            | Task targets, resource start position, long class list and back navigation work in the actual client |

Use six to eight consenting ordinary-member testers across these journeys.
The administrator's preview alone does not prove ordinary-member access. Do
not create automated personal Discord accounts or use the bot's Administrator
access as the member permission test.

Suggested pilot targets: a relevant destination within 60 seconds and a useful
group request or help question within two minutes. These are proposed targets,
not observed results. Ask testers which choice was unclear and where they got
stuck; quiet browsing is a valid outcome.

Measure aggregated join/return counts where available and voluntary pilot
feedback. Native question clicks and complete onboarding funnels are not
established bot-visible events in this implementation. Report missing data
honestly; do not substitute message volume or Discord-member IP tracking.

The current review is complete. Question edits, Guide changes, website copy,
bot navigation and actual member/device testing remain unimplemented.
