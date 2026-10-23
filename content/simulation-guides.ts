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
  title: "WoW Forever DPS Tier List: Solo and Raid Rankings",
  excerpt:
    "Compare 21 published WoW Forever builds in separate Solo and Raid DPS rankings, with exact simulator setups, buffs, debuffs and clear methodology.",
  category: "Community",
  coverImage: "/images/forever-hero.webp",
  content:
    `Compare **21 published level-60 builds** in two separate rankings. Choose **Raid DPS** for shared raid support or **Solo DPS** for your own support only. Open any result's exact setup to reproduce it in the simulator.

## DPS rankings and tested builds

\`\`\`simulation-tier
standard
\`\`\`

## Solo or Raid: what changes?

**Raid DPS** supplies the same full-v2 raid, party and individual buff package, plus a documented set of boss debuffs. Armor reductions, damage-school support, Hunter's Mark and Judgement of Wisdom are included. Their stacking, caps and behavior follow each pinned engine; incompatible effects are not assumed to stack. World buffs and externally supplied Power Infusion or Innervate are excluded.

**Solo DPS** removes outside buffs, boss debuffs and mana grants. Your character keeps its own pet, modeled abilities and configured baseline self-support. For example, a Warrior can retain Battle Shout; a solo Shaman receives one air totem, not Windfury plus Grace of Air. Talent, form and pet effects still follow that character's engine.

Both lists use the **same equipment, talents, race, professions, consumables, positioning and rotation** for each build. Configured support is assumed maintained. These are not separately optimized solo rotations, and a Solo score does not claim that you can survive or defeat a raid boss alone. Farming speed, travel, recovery time and survivability need different measurements.

## Why did the old list show about 600 while my Warrior simulated about 800?

The previous comparison supplied raid buffs but removed external boss debuffs. That was neither a self-supported Solo setup nor a fully supported Raid setup. Removing armor reductions can make a large difference to physical damage.

We replaced that hybrid ranking with separately measured Solo and Raid results. We did not rename its old scores or multiply them by an estimated buff bonus. The original build-validation score in a class guide is another recorded experiment and can retain different support. Use **Open exact Raid setup** or **Open exact Solo setup** for the inputs behind a ranking.

## How to reproduce a result

1. Save your current simulator character before loading another setup. The exact import also loads its sampling settings.
2. Choose Solo or Raid, then select a spec. Open its exact setup rather than a generic class default.
3. Keep the imported gear, talents, consumes, buffs, debuffs and encounter unchanged.
4. Confirm the imported **5,000 iterations** and fixed seed **58723001**, then run the simulation.
5. Compare the result under that same engine and support policy. Changing a setting creates a different experiment.

Each build fights one stationary **level-63 Dragonkin for 300 seconds**, with no duration variation, extra targets or health-based early ending. Characters are level 60 with selected pre-raid equipment. This is a controlled single-target damage test, not a log reconstruction or a leveling/dungeon ranking.

## Measured evidence and coverage

The two datasets contain **210,000 freshly measured fights**: 21 builds × 5,000 fights × two scenarios. Every result retains its date, input/output hashes, engine hash, database hash and exact import. The downloadable JSON belongs to the currently selected scenario.

This first split uses the 21 standard builds with published, replayable simulator setups, across eight classes. Four newer research builds—Retribution, Shockadin, DS/Ruin and Destruction—are omitted until matching numerical publication is verified. Provisional proc-enchant opt-in variants are not ordinary entries.

The class guides can discuss newer reviewed research. Their original study references are not silently substituted into this ranking. For the precise equipment, rotation and support behind a score, use that row's exact simulator setup.

## What the tier letters mean

Tiers are relative to the **leader of the selected scenario**: S ≥95%, A ≥85%, B ≥70%, C ≥55%, D below 55%. Solo and Raid have independent leaders and independent ordering. A tier is not a recruitment rule or a measurement of healing, utility or survivability.

The plus/minus number is an approximate 95% Monte Carlo sampling margin: 1.96 × sample standard deviation / √5,000. It measures random sampling noise inside the model, not uncertain mechanics or real-player performance. Close scores should be read as close scores, not proof of a practical advantage.

## Class guides

${simulationClassProfiles.map((profile) => `- [${profile.name} DPS guide: builds, gear and rotations](/guides/wow-forever-${profile.key}-dps-guide)`).join("\n")}

## Frequently asked questions

### Which is the best DPS class in WoW Forever?

The top row leads the selected Solo or Raid experiment. It is not proof of the strongest class at every level or in every encounter. Movement, cleave, utility, gear access and player execution can change what is best for your group.

### Why is my result different?

First compare the scenario and use its exact import. Then check engine version, equipment, talents, pet, consumes, buffs, debuffs, duration, target, iterations and seed. A generic default or original study reference is not necessarily the ranking's setup.

### Is the Solo list a farming or leveling guide?

No. It measures sustained single-target damage against the same boss without outside support. It does not measure kill-and-recover cycles, route speed, survival or the best solo talent build.

### Does this prove best-in-slot equipment?

No. These are selected complete reference builds, not an exhaustive search of every possible setup. A non-raid item may still require reputation, PvP ranks or an expensive craft.

## Sources and corrections

These are original experiment results from versioned beta models. The [simulator](https://kfcguild.online/tools/forever/simulator), [item and talent references](https://kfcguild.online/tools/forever/encyclopedia) and per-result hashes expose the underlying setup. Current client text alone does not confirm every server-side mechanic.

Bring an exact setup link and a reproducible difference to the [community Discord](/discord). You can also [find a group](/lfg); a lower tier does not mean your class has no place in one.

## Review history

- October 23, 2026: the original community edition included 25 hybrid-policy results and nine class guides.
- This revision separates Solo and Raid, measures both afresh, and restricts rankings to 21 publicly replayable builds. The earlier evidence remains historical; it is not relabeled as either new scenario.`.trim(),
});
