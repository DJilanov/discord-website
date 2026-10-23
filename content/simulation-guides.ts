import type { EditorialGuide } from "./guides";
import { simulationClassProfiles } from "./simulation-class-profiles";

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

This guide uses our own saved, reviewed simulation builds. The original build references and the common DPS benchmark are different measurements: original references retain each study's saved support, while the ranking uses the same five-minute level-63 encounter and full-v2 support policy. Both remain estimates from pinned beta models, not player logs or a promise of live performance.

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

Keep the selected race, professions, consumes and support when reproducing the original result. The common benchmark changes support and encounter by an explicit policy, not by quietly relabelling the original 40,000-fight reference. Different class profiles retain their pinned engine/catalog versions; version identity and model limitations remain part of the comparison.

## What the DPS comparison means

Open the [WoW Forever DPS tier list](/guides/${dpsTierSlug}) for the common benchmark, tier thresholds, uncertainty and every class's measured setup. A small difference can be less important than movement, uptime, utility or a model limitation. Tiers describe the selected reference characters; they are not a rule for excluding players from groups.

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
  title: "WoW Forever DPS Tier List: Level 60 Pre-Raid Rankings",
  excerpt:
    "Compare 25 tested WoW Forever DPS builds under one level-60 benchmark: rankings, gear, rotations, uncertainty and transparent simulation methodology.",
  category: "Community",
  coverImage: "/images/forever-hero.webp",
  content:
    `Compare **25 tested level-60 DPS builds across all nine classes** in one five-minute, single-target benchmark. Each class guide includes the equipment, talents and recorded rotation behind its result.

## DPS rankings and tested builds

\`\`\`simulation-tier
standard
\`\`\`

## How we produced the ranking

Every row comes from a saved simulation response and an exact recorded setup. Scope: level 60, pre-raid reference equipment, one level-63 target, 300 seconds and 5,000 fights per build. These are beta-model estimates, not level-30 dungeon observations, player combat logs or a prediction that the same order will hold at launch.

The benchmark starts from the reviewed complete equipment, talents, race, professions, consumes and explicit rotation for each build. It replaces raid, party and individual support with the same full-v2 policy, uses the same single-target encounter, fixes duration at 300 seconds with no variation, and runs seed 58723001 for 5,000 iterations per build. External debuffs are disabled; effects applied by the character's own modeled actions remain.

The target is level 63 and Dragonkin. The reference contains fixed target stats and execute windows; it is not a combat-log reconstruction of a released raid boss. There is no movement or additional target. The policy preserves each character's saved equipment and consumes: it does not give every class identical gear, race, positioning or practical access to expensive rewards.

The refreshed set contains 125,000 benchmark iterations. Nineteen rows reuse prior receipts only after exact request bytes, publication, database, engine and response identities match. Six updated rows add 30,000 new fights. Reusing an identical authenticated measurement is not a claim that those fights were rerun on the article's publication date.

Every row retains its measurement date, request/response hashes, engine hash and catalog hash. Models are pinned per profile, not silently represented as one universal backend version. Current client descriptions do not by themselves prove every server-side rule in those models. Original build-validation DPS is shown in the class guides separately and is never sorted into this common-policy table.

## What S, A, B, C and D mean

These are disclosed editorial bands based on the strongest measured reference: S is at least 95% of its DPS; A is 85% to below 95%; B is 70% to below 85%; C is 55% to below 70%; D is below 55%. They are convenient groups, not a game mechanic, a statistical confidence classification or a recruitment rule.

The percentage is relative to this table's leader, not a universal class-power score. The same character can move between bands when another build improves, even if its own DPS does not change. We do not manufacture a placement for unmeasured builds or include the two separate provisional-enchant opt-in scenarios as ordinary equipment.

## Read close results as close results

The displayed plus/minus value is an approximate 95% Monte Carlo error of the mean, calculated as 1.96 times the sample standard deviation divided by the square root of 5,000. It describes sampling noise in this model. It does not cover uncertain mechanics, equipment access, human timing, target movement or future tuning. Shared random seeds also mean it is not an independent paired-significance test.

Do not interpret a tiny decimal difference as a practical advantage. A smaller confidence interval does not make an incorrect mechanic correct. We intentionally round the visible DPS while retaining the full measurements in the downloadable evidence.

## Why other tier lists can disagree

Level-30 dungeon lists answer a different question from this level-60 pre-raid reference. Fight length, target level, AoE, movement, pet uptime, melee weaving, cooldown rules, world-buff assumptions, debuff allocation and available gear can all change an ordering. Compare those settings before concluding that one table is wrong.

This table does not claim that a damage leader is the best class for every player or group. Control, support, healing, survivability, encounter jobs, enjoyment and reliable attendance all matter, but they are not measured by a single-target DPS total.

## Class guides and complete rotations

${simulationClassProfiles.map((profile) => `- [${profile.name} DPS guide: builds, gear and rotations](/guides/wow-forever-${profile.key}-dps-guide)`).join("\n")}

## Frequently asked questions

### Which is the best DPS class in WoW Forever?

The first row is the highest measured reference in this particular benchmark. It is not proof of the strongest class at every level, in every dungeon or on every future raid encounter. Open that row's class guide to inspect the actual gear, talents and constraints.

### Is this a level-30 beta DPS tier list?

No. These characters are level 60 and fight a level-63 target. We do not relabel their output as observed beta dungeon performance.

### Does this prove a best-in-slot set?

No. It compares selected reviewed complete loadouts. It does not establish an exhaustive global maximum, independent alternatives for every slot, guaranteed item availability or the cheapest farming route.

### Why is my result different?

Check the exact engine, equipment, talents, race, professions, pet, position, consumes, buffs, debuffs, duration and target. Loading a current default is not the same as loading a version-pinned measured setup. Report a reproducible discrepancy rather than comparing only the final number.

### When will the list change?

After a reviewed model, build or comparison-policy change has actual new evidence. A calendar date or new patch announcement alone does not refresh a measurement. Corrections and future revisions must retain the earlier evidence and explain what changed.

## Sources, corrections and community

These are our original experiment results. The [Forever client reference](https://kfcguild.online/tools/forever/encyclopedia), [talent calculators](https://kfcguild.online/tools/forever/encyclopedia/talents) and [simulator](https://kfcguild.online/tools/forever/simulator) expose the underlying tools and their own evidence labels. Talent-source attribution is retained beside the build data.

Discuss a specific result in the [WoW Forever community Discord](/discord), or [find a group](/lfg) to put a sensible build into practice. This is an independent fan resource, not an official Blizzard ranking. No position in Google is guaranteed by this article or its structured data.

## Review history

- October 23, 2026: first community edition with 25 common-policy results, all nine class guides and per-row evidence. Measurement dates remain separate from publication and source-review dates.
`.trim(),
});
