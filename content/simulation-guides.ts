import type { EditorialGuide } from "./guides";
import { simulationClassProfiles } from "./simulation-class-profiles";
import { tierScenarios } from "../lib/simulation-tier-evidence";

const furySolo = tierScenarios.solo.entries.find(
  (entry) => entry.id === "fury-horde",
);
const furyRaid = tierScenarios.raid.entries.find(
  (entry) => entry.id === "fury-horde",
);
if (!furySolo || !furyRaid)
  throw new Error("The recorded Fury comparison is unavailable");

export const dpsTierSlug = "wow-forever-dps-tier-list";
export const simulationGuideSlugs = simulationClassProfiles.map(
  (profile) => `wow-forever-${profile.key}-dps-guide`,
);
export const simulationGuides: EditorialGuide[] = simulationClassProfiles.map(
  (profile): EditorialGuide => ({
    release: "draft",
    slug: `wow-forever-${profile.key}-dps-guide`,
    title: `WoW Forever ${profile.name} DPS Guide: Builds, Gear and Rotations`,
    excerpt: `Explore our tested WoW Forever ${profile.name} damage builds: talents, exact rotations, gear, enchants and reproducible single-target simulation results.`,
    category: "Community",
    coverImage:
      profile.key === "paladin"
        ? "/images/forever-adventure.webp"
        : profile.key === "hunter" || profile.key === "druid"
          ? "/images/forever-mulgore.webp"
          : "/images/forever-world.webp",
    content: `${profile.introduction}

This guide uses our own saved, reviewed simulation builds. Original references retain each study's saved support. KFC's Solo and Raid rankings are separate comparisons against the same five-minute level-63 boss, with different support packages. These remain estimates from pinned beta models, not player logs or a promise of live performance.

## Tested builds, talents and equipment

\`\`\`simulation-guide
${profile.key}
\`\`\`

## Decisions that matter for ${profile.name}

${profile.decisions.map((text, index) => `### ${["Read the conditions, not just the buttons", "Keep the encounter attached to the result", "Compare complete setups"][index]}\n\n${text}`).join("\n\n")}

## How to use a recorded priority

Check the list from the top and use the first available action whose conditions hold, then start again at the top. Availability still includes the model's resource, weapon, position, cooldown and spell requirements. An AND group requires every condition; an OR group is a choice within that group. A disabled action is not part of the active priority.

The instructions reproduce the saved rotation. They are not a separately tested simplified rotation or a claim that a player can reproduce perfect automated timing. Movement, target death, mechanics and party responsibilities can require a different decision. Do not change several abilities and continue quoting the original result as though the experiment were unchanged.

## Avoid these comparison mistakes

${profile.mistakes.map((text) => `- ${text}`).join("\n")}

${profile.roleBoundary}

## Gear is a complete reference, not a universal shopping list

The equipment and enchants above are the actual tested set. They are not an independently ranked list of best items in every slot. Weapons, paired rings, trinkets and set bonuses interact, and the studies do not establish a precise loss for every possible replacement. Intentionally empty slots remain visible instead of being filled with invented recommendations.

Pinned engine stats are labelled as such; hit, crit and similar model inputs must not be silently converted into client ratings. Open the linked item reference to inspect current data and evidence labels. Some references permit high-rank PvP, reputation or expensive crafted rewards. A non-raid item is not necessarily an easy launch-day acquisition, and historical sources do not prove current Forever availability.

Keep the selected race, professions, consumes and support when reproducing the original result. The Solo and Raid benchmarks change support and encounter by an explicit policy, rather than relabelling the original 40,000-fight reference. Different class profiles retain their pinned engine/catalog versions; version identity and model limitations remain part of the comparison.

## What the DPS comparison means

Choose the comparison that matches your support:

- [WoW Forever Solo DPS rankings](https://kfcguild.online/tools/forever/tier-list/solo): your own maintained support, without outside buffs or mana grants.
- [WoW Forever Raid DPS rankings](https://kfcguild.online/tools/forever/tier-list): shared raid buffs and documented boss debuffs.

${profile.key === "paladin" ? "Paladin research builds are not included in the current 21-build rankings. This class guide preserves their separate study references; a ranked Paladin entry requires a matching published simulator setup." : "The rankings cover 21 published builds across eight classes. Newer research builds in this guide may not be ranked until their matching simulator setup is published."}

Our [Solo vs Raid DPS comparison guide](/guides/${dpsTierSlug}) explains which result to use and how to reproduce it. A small difference can be less important than movement, uptime, utility or a model limitation. Tiers describe the selected reference characters; they are not a rule for excluding players from groups.

This is a level-60 single-target reference. It is not a level-30 beta dungeon ranking, an AoE ranking, a healing table or a PvP prediction. The recorded client source is build 1.60.1.70425; later changes require revalidation rather than a cosmetic date update.

## Try your own controlled comparison

Save your current simulator character before loading a reference: loading can replace equipment, talents, race, professions, buffs, consumes and encounter settings. Change one decision at a time, retain the version, duration and support, and record both setups. A new result from a changed setup is a new experiment, not an update to this published reference.

The download contains the saved settings and release hashes. A public replay link is shown only when that exact release is available; a local reviewed build is not represented as already deployed. Never substitute another engine silently when reproducing a result.

## Share a useful correction

Use the [${profile.name} talent reference](https://kfcguild.online/tools/forever/encyclopedia/talents/${profile.key}) to check the named choices. Bring a build link, the exact condition or item, source version and reproducible before/after result to the [community Discord](/discord). Do not send account credentials or unrelated private messages.

Need a party rather than another spreadsheet? [Find a group](/lfg). You can use the guides and join the wider community without joining a particular guild.

## Review history

- October 23, 2026: first simulation-backed class edition, with exact-source rotation instructions and a matched-policy DPS benchmark. Gameplay/log validation remains separate.
`.trim(),
  }),
);

simulationGuides.push({
  release: "draft",
  slug: dpsTierSlug,
  title: "WoW Forever Solo vs Raid DPS: How to Compare Builds",
  excerpt:
    "Understand why WoW Forever DPS changes with raid support, choose the right comparison, and reproduce a build using KFC's measured Solo and Raid rankings.",
  category: "Community",
  coverImage: "/images/forever-hero.webp",
  content:
    `A character can produce very different DPS with its own support and with a raid behind it. Before comparing builds, choose the support you want to measure. This guide explains how to read the results; KFC hosts the complete measured rankings and their exact simulator setups.

## Open the measured Solo or Raid rankings

- **[WoW Forever Solo DPS rankings](https://kfcguild.online/tools/forever/tier-list/solo)** — compare sustained damage using your character's own maintained support.
- **[WoW Forever Raid DPS rankings](https://kfcguild.online/tools/forever/tier-list)** — compare sustained damage with shared raid buffs and documented boss debuffs.

Both comparisons use level-60 pre-raid characters against the same stationary level-63 boss for five minutes. They do not rank level-30 beta dungeons, leveling speed or PvP.

## Which comparison should I use?

| Your question | Start here | What to check next |
| --- | --- | --- |
| How does this build sustain damage without outside help? | Solo rankings | Own buffs, pet, mana use and the recorded rotation |
| How does it compare with full raid support? | Raid rankings | Which buffs and boss debuffs your group can actually maintain |
| Which setup should I use for farming? | Your own encounter test | Kill time, survival and recovery between mobs |
| Why is my simulator result different? | That ranking's exact setup | Equipment, support, target, fight duration, engine and sampling settings |

Solo and Raid use the **same equipment, talents, race, professions, consumables, positioning and rotation** for each published build. That makes the effect of support easier to compare. These are not separately optimized solo rotations.

A Solo score is sustained damage without outside help. It does not establish that the character can survive or defeat that boss alone. A five-minute result also cannot tell you how quickly a character kills a normal mob, loots it and recovers for the next pull.

## Why raid support can change the order

Support affects more than one stat. Shared buffs change a character's resources and damage, while boss debuffs change the target it attacks. Armor reductions can strongly affect physical attacks; school-specific debuffs and mana support can affect casting decisions and sustained output.

For example, the same recorded Fury build measures **${furySolo.dps.toFixed(2)} Solo DPS** and **${furyRaid.dps.toFixed(2)} Raid DPS** in the linked datasets. Its gear and rotation did not change between those two runs. The support did. This example comes from the versioned measurements; it is not an expected DPS guarantee for your character.

The previous comparison combined raid buffs with no external boss debuffs. That explains why its Warrior score differed from a fully supported simulator run. Its old scores were replaced with separate measurements, rather than renamed or multiplied by a buff estimate.

## Check the support your group actually has

The Raid comparison assumes the published package is maintained, including shared buffs and documented armor, school-damage and resource-support effects. Their stacking and caps follow the selected engine. World buffs and external Power Infusion or Innervate are excluded.

If your group lacks part of that package, open the exact Raid setup and remove the missing support. Keep everything else fixed and run it again. A smaller group's result is not necessarily halfway between the Solo and Raid scores, so avoid applying a flat percentage reduction.

The Solo comparison retains configured class-owned support, pets and modeled abilities. It removes outside buffs, boss debuffs and mana grants. A solo Shaman is assigned one air totem, rather than Windfury plus Grace of Air. Talent, form, pet and rotation behavior remain tied to the selected engine.

## Reproduce a score before changing a build

1. Save your current simulator character before importing another setup.
2. Open the Solo or Raid ranking above and choose a build's exact setup.
3. Keep its imported equipment, talents, consumes, buffs, debuffs and encounter unchanged.
4. Confirm the imported **5,000 iterations** and fixed seed **58723001**, then run it.
5. Change one setting at a time and save the result as a separate experiment.

An original study link in a class guide can contain different support from a ranking's exact import. A class name or identical weapon does not make two saved experiments equivalent.

## Read close results as close results

Each ranking assigns tiers relative to its own leader. The displayed sampling margin describes random variation inside that model; it does not measure uncertainty about unverified mechanics. Movement, uptime, utility and acquisition cost can matter more to your group than a small numerical lead.

The datasets cover **21 published builds across eight classes**, with **210,000 measured fights** in total. Retribution, Shockadin, DS/Ruin and Destruction research builds await matching numerical publication. The nine class guides below can discuss those separate studies without claiming they are already ranked.

Use the ranking pages for complete standings, exact imports, per-result evidence and downloadable datasets. This community guide concentrates on interpreting those comparisons and choosing a useful next test.

## Class guides

${simulationClassProfiles.map((profile) => `- [${profile.name} DPS guide: builds, gear and rotations](/guides/wow-forever-${profile.key}-dps-guide)`).join("\n")}

## Sources and corrections

These are original experiment results from versioned beta models. The [simulator](https://kfcguild.online/tools/forever/simulator), [item and talent references](https://kfcguild.online/tools/forever/encyclopedia) and per-result hashes expose the underlying setup. Current client text alone does not confirm every server-side mechanic.

Bring an exact setup link and a reproducible difference to the [community Discord](/discord). You can also [find a group](/lfg); a lower tier does not mean your class has no place in one.

## Review history

- October 23, 2026: the original community edition included 25 hybrid-policy results and nine class guides.
- The Solo/Raid revision measures both scenarios afresh and restricts rankings to 21 publicly replayable builds. The earlier evidence remains historical.
- The comparison-guide revision keeps the existing URL, explains how support changes a result, and links to KFC for the complete numerical standings.`.trim(),
});
