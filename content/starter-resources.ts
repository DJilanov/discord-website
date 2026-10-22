import type { EditorialGuide } from "./guides";
import { toolsBase } from "./community-tools";

const dungeonSource =
  "https://news.blizzard.com/en-us/article/24301455/explore-the-new-dungeons-of-world-of-warcraft-forever";
const tuningSource =
  "https://eu.forums.blizzard.com/en/wow/t/wow-forever-beta-development-notes-%E2%80%93-updated-15-october/631316/6";

// These originals need a class/dungeon reviewer before public publication.
export const starterResources: EditorialGuide[] = [
  {
    release: "draft",
    slug: "wow-forever-feral-tank-starter-kit",
    title: "WoW Forever Feral Tank Starter Kit",
    excerpt:
      "Prepare a bear tank for a first group: role, build evidence, rage checks, pull communication and a reproducible review worksheet.",
    category: "Getting started",
    coverImage: "/images/forever-world.webp",
    content: `A useful first bear-tank session starts with a group that understands your level, tools and experience. This starter kit prepares that conversation. It is not a best-in-slot list, a complete rotation or a claim that a particular build has cleared live Forever content.

**Source check: October 22, 2026. Gameplay review pending.** Read Blizzard's [Druid deep dive](https://news.blizzard.com/en-us/article/24301515/world-of-warcraft-forever-class-deep-dives-hunter-and-druid) together with the [October 15 tuning notes](${tuningSource}). Later tuning takes precedence over older previews. The beta's announced final full test day was October 21; arrange a future test only when official access is available.

## Describe the tank you are bringing

Tell the organizer your region, faction, character ruleset, level and intended role. Say whether this is your first time tanking the dungeon. Feral damage and bear tanking share a class, but that does not make every talent choice, piece of equipment or player expectation interchangeable.

Ask what the group is trying to do: finish the dungeon, complete a quest bundle or learn a route. A timed repeat run and a first visit need different expectations. Agree on a finish time and who makes the call to stop. An honest beginner-friendly listing is more useful than an impressive label that hides the actual plan.

## Build from the right version

Open the [Forever Druid calculator](${toolsBase}/forever/encyclopedia/talents/druid). Set your actual level before allocating points, read the evidence labels and save a named local build. Copy its share link into your private group planning conversation. A recorded tooltip is evidence about that source, not proof of an optimal allocation.

Blizzard describes Blood Frenzy as combining earlier crit-related talents and Natural Reaction as a bear dodge/rage talent. Check their current ranks rather than pasting a TBC or Wrath tree. The October notes also corrected Bear-form Faerie Fire threat and several talent-application bugs. These changes are why the client build belongs in a useful test report.

Do not use the simulator's provisional tank output as a survival guarantee. If comparing a different talent choice, keep the gear, encounter assumptions, buffs and version constant, and state what the model does not establish. Unknown mitigation behavior needs an observation, not an invented equivalence.

## Make the first pull readable

Before moving, agree on one kill marker, who calls extra enemies and how the healer signals a pause. Ask each player which relevant control or interruption they actually have at their level. Do not assume a class name guarantees every tool described in a level-60 guide.

Start with a pull the group can describe and recover from. If threat feels poor, record the actual sequence and whether attacks landed before changing several things at once. If damage feels dangerous, distinguish an extra pack, missing preparation and an encounter mechanic from a general conclusion that the class cannot tank.

Rage shortage and incoming damage are different problems. Note whether the problem happens before the first attack, while changing targets or after repeated special abilities. Avoid turning a resource observation into a recommendation to take unnecessary damage. Bring the issue to the class discussion with your level and build link.

## Check equipment and loot expectations

Inspect your actual items in the [Forever database](${toolsBase}/forever/encyclopedia). Read source and build labels; an external reference is not an exact-client observation. This kit does not assign universal stat weights or recommend a cloth item merely because a generic score is high.

Agree on tank, damage and off-spec loot before entry. If the host reserves anything, ask for the item names, not just a count. A first-session gear discussion should end with a clear plan, not a promise that a particular item will drop.

## Leave one finding worth reusing

After the session, record the date, client build, level, dungeon, build link and one specific observation. Explain what happened, what you expected and what remains untested. Keep player names and screenshots private unless everyone involved approved publication.

Use the [guide-review assignment](/contribute#class-review) to propose a correction. A reviewer should check one statement against its source or reproduce one sequence; reading the page alone does not establish a complete gameplay review. When a real host and time are confirmed, use [looking for group](/lfg). Joining the organizers' guild is not required.`,
  },
  {
    release: "draft",
    slug: "wow-forever-protection-paladin-starter-kit",
    title: "WoW Forever Protection Paladin Starter Kit",
    excerpt:
      "Prepare your first Protection Paladin group with version-aware seals, mana checks, control assignments and explicit loot expectations.",
    category: "Getting started",
    coverImage: "/images/forever-adventure.webp",
    content: `Protection Paladin preparation is more than picking a tank icon. Your group needs to know which tools your character has learned, how you will recover between pulls and who handles jobs outside your toolkit. Use this kit for a first session or a focused class review, not as a claimed endgame ranking.

**Source check: October 22, 2026. Gameplay review pending.** Start with Blizzard's [Paladin deep dive](https://news.blizzard.com/en-us/article/24302099/world-of-warcraft-forever-class-deep-dives-paladin) and the [October 15 tuning notes](${tuningSource}). The article contains prospective changes as well as current descriptions; compare dates and your actual client. Do not assume a paragraph marked for a future build has already shipped.

## Tell the group what is available now

State your level, region, faction and character ruleset. Tell the host whether you are learning the route, the role or both. Check your spellbook and talents rather than promising every cooldown from a finished level-60 build.

Write down the tools you expect to use for initial threat, controlling a loose target and a dangerous damage window. Assign a group member to interruption where needed: Blizzard's class description explicitly preserves limitations in that part of the Paladin toolkit. A party succeeds by covering gaps, not by quietly assuming the tank does every job.

Keep the first session achievable. One quest-completion run with a stated finish is easier to maintain than an open-ended promise to farm until everyone is satisfied. Agree on a replacement or cancellation process before someone needs to leave.

## Review seals and threat in Forever

Open the [Forever Paladin calculator](${toolsBase}/forever/encyclopedia/talents/paladin), select your actual level and inspect the current Protection choices. Save a named build locally and share its link with the person reviewing it. Check the snapshot and evidence labels; a valid allocation is not an endorsement of its performance.

The official deep dive introduces Seal of Fury and ties several tanking choices to the Seal/Judgement system. Later notes adjust Righteous Fury and several mana or damage interactions. Do not copy an old TBC threat calculation and treat the result as a tested Forever value.

For a focused comparison, change one thing at a time. Record the seal, relevant active effects, target count and whether a hit or taunt failed. Separate an unavailable ability, a missed action and a tooltip discrepancy. Each leads to a different correction.

## Make mana pauses part of the plan

Tell the group how you will signal a pause. Before pulling, check the healer as well as yourself; your available mana does not establish theirs. Ask damage players to wait for the agreed start rather than compensating for a difficult opener with a larger pull.

A mana issue needs context: level, enemies, abilities used and the time between pulls. Repeatedly describing the class as having infinite mana is not a substitute for a test. This kit does not prescribe taking extra damage or removing useful defenses to produce a resource number.

Check how your current defensive abilities interact before relying on consecutive uses. Read the present tooltip and any shared restrictions. If an interaction has not been reproduced in the current build, mark it untested and choose a conservative pull.

## Know what the tools can establish

Use the [Forever database](${toolsBase}/forever/encyclopedia) to inspect the specific items and sources you are discussing. Keep a tank set, a damage preference and a healing off-spec request distinct. Neither armor type nor a broad score alone establishes an upgrade for your actual character.

If using the [simulator](${toolsBase}/forever/simulator), read the supported-mode labels first. Tank assumptions remain provisional and healing-only engines are not available. A damage result cannot by itself certify survival, healer demand or the chance of completing a dungeon.

Before entry, read the event's named hard reserves and agreed main/off-spec rules. Do not accept an unexplained reserve count as a complete loot policy. If the group uses soft reserves, make choices through the event's own reserve page rather than leaving conflicting lists in chat.

## Return a useful class review

Record one pull or interaction: date, client build, level, build link, relevant equipment and exact actions. Include the expected and actual result without publishing other players' private information. Ask a reviewer to check the specific conclusion, not to approve an entire class after a single run.

The [class-review assignment](/contribute#class-review) provides the reporting process. Publish a real group through [LFG](/lfg) only when its host and time are confirmed. This community is open to different guilds; using the tools is not a recruitment commitment.`,
  },
  {
    release: "draft",
    slug: "wow-forever-mage-dungeon-starter-kit",
    title: "WoW Forever Mage Dungeon Starter Kit",
    excerpt:
      "Prepare a Mage for a first Forever dungeon: current talents, control assignments, mana breaks and a useful build-comparison report.",
    category: "Getting started",
    coverImage: "/images/forever-world.webp",
    content: `A Mage can help a new dungeon party by making its plan easier to execute, not just by chasing a larger damage number. Start with the tools your character has today, an agreed target and a clear control assignment. This preparation kit does not prescribe a universal leveling tree or claim a complete live-game test.

**Source check: October 22, 2026. Gameplay review pending.** Read Blizzard's [Mage and Shaman deep dive](https://news.blizzard.com/en-us/article/24302097/world-of-warcraft-forever-class-deep-dives-mage-and-shaman) and the [October 15 tuning notes](${tuningSource}). They document changing Arcane, Fire and Frost mechanics. A familiar Classic spell name is not enough to assume its old behavior remains unchanged.

## Choose a role for this session

Tell the organizer your region, faction, character ruleset, level and preferred playstyle. If you are learning the dungeon, say so before the first pull. Ask whether the group wants a first clear, quest completion or a repeat route, and agree on a finish time.

Ask which target should be controlled, who interrupts and when area damage is welcome. A target marked for control should not also be the target everyone attacks. Confirm the tools each player has learned rather than assigning an ability from memory to a low-level character.

Arrange a simple warning for low mana and an accidental extra pack. These messages should be understandable in text; nobody should need to infer them from an unexplained meter. Decide who calls the next pull so a helpful ranged attack does not become an unplanned second pack.

## Build from current evidence

Open the [Forever Mage calculator](${toolsBase}/forever/encyclopedia/talents/mage), set your real level and inspect the talents you intend to use. Check the source/build labels and compare changed talents rather than importing a TBC tree. Save a named build locally, then copy the share link for a reviewer.

The October notes revise several Mage interactions, including Arcane Blast, Fire talents and Frost control/damage behavior. Use the latest relevant note when it disagrees with an older preview. A calculator records a source snapshot; it does not demonstrate the damage of a complete combat sequence.

If someone recommends a different tree, ask what problem it solves at your level. A choice intended for a raid, open-world survival or a coordinated area-damage group may not answer a first-dungeon question. Keep the discussion tied to the actual session instead of turning one result into a class-wide ranking.

## Compare a build without changing the experiment

When using the [Forever simulator](${toolsBase}/forever/simulator), record the supported engine, snapshot, equipment, buffs, encounter settings and duration. Change one talent allocation or item set at a time. Keep assumptions constant so the comparison has an interpretable cause.

Treat an unsupported spell interaction or missing evidence as a limitation. Do not replace an unavailable Forever item with a similarly named TBC item without saying so. A simulated increase is a model result, not proof that your group will finish faster or that control and movement have no cost.

For a gameplay observation, record the actual sequence rather than only the final meter. Note whether the target died early, control broke or mana forced a pause. Those differences can explain why two players using the same broad specialization report different experiences.

## Set up a comfortable first run

Check the abilities on your action bars and the ranks available at the trainer. Bring what your agreed group expects and ask about food/water arrangements without assuming every low-level Mage can provide every rank. Confirm how the party will communicate an emergency or a break.

Before attacking, identify the tank's intended target and the controlled target. If a pull goes wrong, stop and describe what changed before repeating it. Learning a route works better when the group can make one correction at a time.

Read loot rules before the first drop. State whether an item is for this character's current role or an off-spec plan. Use the [database](${toolsBase}/forever/encyclopedia) to inspect the actual record and its evidence rather than treating an item icon or armor category as a complete recommendation.

## Make one correction reusable

Return the date, client build, level, build link and a specific observation through the [class-review assignment](/contribute#class-review). Separate the source you read from what you tested yourself. Obtain permission before sharing participant names or screenshots.

For the next real session, browse [LFG](/lfg) or organize one with a confirmed host and time. Public tools remain available without joining a guild, and class discussion should help people find a compatible group rather than pressure them into one roster.`,
  },
  {
    release: "draft",
    slug: "wow-forever-hall-of-thanes-group-preparation",
    title: "Hall of Thanes: WoW Forever Group Preparation",
    excerpt:
      "Prepare a first Hall of Thanes party: official location, level range, travel plan, quest checks and a clear host checklist.",
    category: "Getting started",
    coverImage: "/images/forever-world.webp",
    content: `Hall of Thanes is a useful early destination to plan with friends, but a dungeon name alone is not a complete invitation. Agree on who is coming, how everyone reaches the entrance and whether the goal is exploration or a prepared quest run. This resource covers that preparation, not unverified boss tactics or a promised completion time.

**Source check: October 22, 2026. Gameplay review pending.** Blizzard's [new-dungeon overview](${dungeonSource}) lists Hall of Thanes for levels 13–18 beneath Ironforge in Dun Morogh. It describes easier access for Alliance and a journey through enemy territory for Horde. The published range is a guide, not a claim about your character's exact entry eligibility or recommended minimum for every encounter.

## Choose an achievable first visit

Confirm region, character ruleset and faction before discussing roles. Ask each participant for their current level and which role they are prepared to play. An Alliance route link does not establish that a Horde character has the same travel or quest preparation.

Write a meeting time and place separately from the first-pull target. Include a named time zone and a finish time. If a player is still travelling, decide how long the others wait rather than letting the event silently become an indefinite session.

A five-player planning template is available through native event creation. Its suggested role allocation is editable host planning, not a new rule imposed on the game. Mark the run as a first visit if the group intends to learn together.

## Check the journey, not just the entrance label

The capital-city location matters to travel planning. Do not describe the dungeon as faction-exclusive just because one faction reaches it more conveniently. Conversely, do not advertise a safe shortcut through enemy territory unless someone has checked it in the relevant ruleset and build.

Ask a participant who knows the journey to describe the meeting point in ordinary terms. Keep the organizer's public contact in the event and use one discussion for delays. A screenshot can help, but remove names and private chat before making it public.

Plan recovery before entering: how the group handles a disconnect, who announces a stop and which contact remains available if someone loses the game connection. These are useful preparation choices without inventing a graveyard route or encounter mechanic.

## Verify the quest bundle individually

Use the [Forever quest directory](${toolsBase}/forever/encyclopedia/quests) to search the quests each player actually has. Read minimum level, faction and prerequisite information where evidence is available. A client ID, an external reference and an observed quest log are different kinds of evidence.

For an Alliance route, the [Human leveling planner](${toolsBase}/forever/leveling/routes/alliance-human) offers an optional Hall of Thanes branch in its supported itinerary. Select your actual character profile and inspect the branch before committing. It is a planning option with source assumptions, not a guarantee that every prerequisite is complete or that the whole route has been playtested.

Do not discard outdoor quests because another player's branch appears shorter. Check your own completion state and what the continuation still needs. A missing prerequisite is more useful to discover before the meeting than at the dungeon entrance.

## Make roles and loot readable

Agree on a pull caller, the first kill marker, available control and the healer's pause signal. Ask which abilities players have at their current levels. Read any hard reserves by item name and agree on main/off-spec loot before the first drop.

This resource deliberately contains no drop-rate table, boss spell schedule or claimed best item. Use the current item record and its source labels when discussing loot. Do not turn artwork or an old Classic tooltip into a current Forever encounter instruction.

## Publish one maintained session

When a real host and time are confirmed, start from the planner's group action or [create an event](/raids/new). Review all prefilled values before submitting. Native events have their own signup and approval flow; a basic LFG listing is a different kind of post.

After a run, return one dated observation through [dungeon review](/contribute#dungeon-review): build, faction, level, route, a specific correction and what remains untested. Obtain permission for public screenshots or player credit. A useful first resource grows from reproducible checks, not a claim that an untested strategy is complete.`,
  },
  {
    release: "draft",
    slug: "wow-forever-ruins-of-lordaeron-group-preparation",
    title: "Ruins of Lordaeron: WoW Forever Group Preparation",
    excerpt:
      "Plan a first Ruins of Lordaeron session with official access context, compatible characters, quest checks and clear timing.",
    category: "Getting started",
    coverImage: "/images/forever-hero.webp",
    content: `A Ruins of Lordaeron group needs a travel and quest plan as well as five interested players. Use this checklist to turn an informal conversation into a session people can actually attend. It does not claim a tested boss route, a complete loot table or the fastest way to level.

**Source check: October 22, 2026. Gameplay review pending.** Blizzard's [dungeon overview](${dungeonSource}) places the dungeon in the ruined city above the Undercity in Tirisfal Glades and lists levels 15–20. Horde access is described as convenient; Alliance groups must travel into opposing territory. These facts do not establish a safe route or exact entry eligibility for a particular character.

## Agree on compatible characters first

Ask every participant to confirm region, faction and character ruleset. Do not infer those choices from a Discord channel or an interest in PvP. A social community can include players who cannot enter the same ordinary group.

Record current levels and intended roles. A friend planning to heal later may not yet have the gear or abilities they expect from an endgame guide. Ask what they can bring to this session, and keep the first visit's pace realistic.

Choose a clear objective: explore, complete the quests already prepared or revisit a particular section. Avoid advertising a full clear when the host intends to stop after one task. Set a finish time that gives people a way to leave without an argument.

## Separate travel from dungeon time

For Horde players, an accessible city-side meeting point can simplify preparation. For Alliance, discuss the journey explicitly and leave time for delays. The dungeon's existence on a shared list is not evidence of a neutral or risk-free entrance route.

Publish a named time zone and distinguish meeting from first pull. A player arriving at the continent when everyone else expects to enter is a planning mismatch, not necessarily bad attendance. Use one contact point to report delays and announce a firm postponement if the agreed window is missed.

Do not require account screenshots, a real name or private work schedules to solve this. A public character contact and a realistic arrival estimate are enough for an ordinary group. Keep sensitive moderation issues out of the event thread.

## Read the actual quests before leaving

Open the [Forever quest directory](${toolsBase}/forever/encyclopedia/quests) and search by quest name or ID. Check the selected faction and known requirements; remove a level filter if the reference has no verified level. Unknown does not mean unrestricted.

Open individual records to inspect objectives and source provenance. Have players compare those records with their own quest logs. Do not assume one person's available quests prove that every party member has the same prerequisites, reward choices or completion state.

The [Horde leveling planner](${toolsBase}/forever/leveling) can help place a dungeon trip beside the surrounding outdoor route. Choose the matching character profile and inspect the itinerary. An estimated experience gain is not a promised level after one clear, especially when quests were already rewarded.

## Keep the first pulls understandable

Agree on one pull caller and the group's control assignments. Discuss how the healer asks for a pause and what happens if someone loses the group. Read the event's loot policy before entry, including the names of hard-reserved items if the host uses them.

Do not infer boss mechanics from this page's artwork or from an older game version. This is a preparation resource. A future tactics section requires observations tied to the current build, with a reviewer who can reproduce the relevant encounter sequence.

If something unexpected happens, stop and describe the situation rather than immediately changing route, talents and target order together. One specific observation is easier to review than a general claim that the dungeon is too easy or impossible.

## Maintain the plan after posting

Use [native event creation](/raids/new) for character signups and later roster selection, or [LFG](/lfg) for a basic group listing. Review the actual workflow before telling participants where to sign. Replies in an unrelated Discord conversation are not automatically part of a managed event roster.

Update the maintained event if the time or scope changes and check that Discord delivery is current. Calendar downloads are snapshots, not live subscriptions. After the session, return a dated route or quest correction through [dungeon review](/contribute#dungeon-review). Names, screenshots and public credit require the participants' permission.`,
  },
  {
    release: "draft",
    slug: "wow-forever-excavation-site-group-preparation",
    title: "Excavation Site: WoW Forever Group Preparation",
    excerpt:
      "Prepare an Excavation Site group in the Wetlands: route handoff, current quest evidence, roles, return plans and first-session review.",
    category: "Getting started",
    coverImage: "/images/forever-world.webp",
    content: `Excavation Site is a different commitment from an early capital-adjacent dungeon. A party may be arriving from several questing routes, and its members can have different objectives even when their levels look similar. Use this preparation sheet to make those differences visible before the meeting.

**Source check: October 22, 2026. Gameplay review pending.** Blizzard's [new-dungeon overview](${dungeonSource}) lists Excavation Site for levels 24–29 in the Wetlands, above Whelgar's Excavation, and describes its location near Thelgen Rock and Dun Algaz. This is location and planning context, not an independently measured travel route or a guaranteed entry requirement.

## Choose the handoff from outdoor questing

Ask where each player will be when the session starts and which quests they intend to complete. Agree whether the posted start means beginning travel, meeting nearby or entering the dungeon. Give the group a named time zone, a realistic finish and a way to announce delays.

Use the [Forever leveling planner](${toolsBase}/forever/leveling) to inspect your own route before changing it for the party. Keep a record of the chapter you intend to return to. Do not skip an outdoor chain solely because a dungeon estimate appears to cover the same amount of experience.

Confirm region, character ruleset and faction independently from activity preferences. A group discussing the same dungeon in Discord may still have incompatible characters. Check levels and learned abilities rather than treating the published range as proof that every player is ready for the same plan.

## Prepare quests without inventing certainty

Search the [quest directory](${toolsBase}/forever/encyclopedia/quests) for the quests players actually plan to bring. Read individual requirements, objectives and evidence labels. An incomplete or conflicting reference should not be treated as a complete quest walkthrough.

Have everyone compare the intended bundle with their own quest log before travelling. Note which prerequisite is missing and who needs help. Do not advertise a precise experience total until you have checked the actual quests, player levels and which rewards were already claimed.

If a quest is absent from the directory, that is not proof it does not exist in game. The public index intentionally excludes incomplete or unusable reference records. Report the exact name, build and observed state through the review process instead of adding a guessed objective to a public post.

## State the scope and exit plan

Decide whether this is a first exploration, a quest-focused run or a repeat visit. Explain any optional objectives before players commit their evening. Agree what happens when the finish time arrives while content remains unfinished.

Choose a contact point outside the game so a disconnected player can report a problem. The host should know when to wait and when to postpone. None of those decisions needs a member's real name, credentials or private account screenshot.

Discuss the return to outdoor questing as well as entry. Players may want to finish different hand-ins afterward; say which are included in the advertised session. Do not quietly extend a short dungeon invitation into several hours of escorting the whole party around the world.

## Make the party easier to lead

Assign a pull caller, a first target and relevant control jobs based on the abilities people actually have. Agree on mana pauses and an emergency signal. Keep loot expectations explicit, including named hard reserves and the handling of off-spec items.

This resource does not contain verified boss timings, safe-pull boundaries or recommended stat thresholds. A first group should observe and discuss an unfamiliar situation, not rely on a confident instruction copied from another game version. Review a specific encounter observation before turning it into permanent tactics advice.

For items, inspect the [Forever database](${toolsBase}/forever/encyclopedia) and read source/build labels. Missing stats or a historical external record are reasons to investigate, not permission to invent an upgrade recommendation.

## Close the loop after the session

Create a real session through [native events](/raids/new) when the host and time are confirmed. Review all defaults, especially ruleset, faction, duration and admission. Participants should use the stated signup destination rather than maintaining a second roster in chat.

Afterward, send one reproducible finding to [dungeon review](/contribute#dungeon-review): date, client build, levels, the section checked and a precise correction. Explain whether it was observed in game or read from a source. Obtain permission before publishing names or screenshots. The next version should be more useful because the evidence improved, not merely because the page became longer.`,
  },
];
