export interface SimulationClassProfile {
  key: string;
  name: string;
  color: string;
  introduction: string;
  decisions: string[];
  mistakes: string[];
  roleBoundary: string;
}

export const simulationClassProfiles: SimulationClassProfile[] = [
  {
    key: "warrior",
    name: "Warrior",
    color: "#d3b18b",
    introduction:
      "Arms, dual-wield Fury and two-handed Fury are different complete setups, not weapon swaps inside one universal rotation. Our recorded priorities connect stance changes, rage thresholds, Overpower opportunities and execute decisions to the equipment actually tested.",
    decisions: [
      "Read the actual rage thresholds before adding a filler. Arms and Fury do not reserve the same resources, and a high-rage queued attack rule is not permission to spend that rage at every opportunity.",
      "The two-handed Fury list includes weapon-timing conditions. Its Slam window depends on time until the next main-hand attack and the cooldowns of higher priorities; it is not an instruction to insert Slam after every swing.",
      "Recklessness is explicitly disabled in the recorded standard priorities. Do not compare a short run with a long-cooldown burst against these five-minute references and attribute the entire difference to gear.",
    ],
    mistakes: [
      "Changing weapon style without changing talents and priority conditions.",
      "Treating an execute rule as a normal-phase rage dump.",
      "Importing the separate provisional-proc variants as standard enchants.",
    ],
    roleBoundary:
      "These are damage studies. They do not rank Protection, survival, threat or dungeon tanking.",
  },
  {
    key: "paladin",
    name: "Paladin",
    color: "#f29bc2",
    introduction:
      "Retribution and Shockadin use different talent allocations and mana decisions. These are damage-focused Paladin studies: a build containing Holy talents is not automatically a tested healing recommendation.",
    decisions: [
      "Read the recorded seal, Judgement and mana rules together. Substituting a familiar rotation from TBC changes the experiment even when the spell names look similar.",
      "Shockadin's casting decisions depend on its actual Holy allocation and the enabled cooldowns. Preserve the source's thresholds and trained spell ranks instead of describing every Holy investment as the same build.",
      "Compare a complete weapon, off-hand and enchant package. The reference's current compiled stats matter more than whether an item's name sounds like a melee or caster item.",
    ],
    mistakes: [
      "Using a Holy damage result as a healing tier.",
      "Changing seals or mana consumables without updating the comparison.",
      "Assuming a recorded PvP reward is immediately obtainable at launch.",
    ],
    roleBoundary:
      "Protection and healing need separate objectives. The existing Protection dungeon playbook remains a different resource.",
  },
  {
    key: "hunter",
    name: "Hunter",
    color: "#b7db89",
    introduction:
      "Beast Mastery, Marksmanship and Survival are all represented. Read the position and pet settings before comparing them: the recorded Survival setup is melee, while the other two recorded scenarios use ranged positioning.",
    decisions: [
      "Keep pet choice and enabled pet attacks attached to the build. Player damage alone is not the complete Hunter result when the selected configuration includes an active pet.",
      "The recorded range is part of the setup. A stationary melee reference does not prove the same uptime on an encounter that repeatedly forces players away from the target.",
      "Match the ranged weapon and melee equipment as one loadout. Do not replace a stat stick or weapon and assume that the original measured result still applies.",
    ],
    mistakes: [
      "Comparing Survival's melee reference as though it were a ranged-only rotation.",
      "Dropping pet or positioning assumptions from the explanation.",
      "Treating one target's damage as an AoE or leveling ranking.",
    ],
    roleBoundary:
      "These level-60 target studies do not rank level-30 dungeon performance, pet tanking or PvP.",
  },
  {
    key: "rogue",
    name: "Rogue",
    color: "#f4df83",
    introduction:
      "Combat, Mutilate and Subtlety each have their own recorded priorities. Combo-point thresholds, Slice and Dice refreshes, energy recovery and stealth opportunities are preserved instead of replaced with a generic Classic rotation.",
    decisions: [
      "Read the initial Slice and Dice rule separately from the refresh rule. Starting it with a small number of points and refreshing at a later threshold solve different problems.",
      "Vanish has several simultaneous conditions in the saved lists. It is a modeled damage opportunity, not permission to ignore encounter safety, threat or the availability of a useful stealth action.",
      "Keep the recorded poisons and weapon pair. Mutilate, Backstab and other positional attacks are not interchangeable fillers, and the modeled position behind the target is an important constraint.",
    ],
    mistakes: [
      "Turning an AND condition into a choice between two conditions.",
      "Adding Rupture to a priority that did not test it.",
      "Losing Slice and Dice while chasing a larger finisher.",
    ],
    roleBoundary:
      "No crowd-control, PvP or real-fight stealth-safety ranking is inferred from the damage benchmark.",
  },
  {
    key: "priest",
    name: "Priest",
    color: "#e4e7ec",
    introduction:
      "Shadow and Smite are separate damage profiles with their own talents, upkeep and mana rules. Smite is included as a real tested damage configuration, not as evidence that Holy healing has been benchmarked.",
    decisions: [
      "Use the personal effect and target-upkeep conditions actually saved for the selected profile. A spell that belongs in Shadow's priority is not automatically a useful addition to the Smite setup.",
      "Mana recovery and cast availability matter over the full five-minute reference. Removing a recovery action can improve a short opening sample while reducing sustained output later.",
      "Keep the exact weapon's current compiled spell-power contribution and the measured support package. A historical item label or an unrelated character's stat weight is not a substitute for a controlled comparison.",
    ],
    mistakes: [
      "Calling Smite a healing simulation.",
      "Comparing short burst to the five-minute reference without stating duration.",
      "Copying a previous expansion's debuff assumptions.",
    ],
    roleBoundary:
      "Discipline and Holy healing, emergency utility and raid healing throughput are outside these DPS results.",
  },
  {
    key: "shaman",
    name: "Shaman",
    color: "#82b9f4",
    introduction:
      "Elemental, Stormcaller and Enhancement are recorded as complete loadouts. The caster-named references include melee weaving, so positioning and between-cast attacks are part of the tested setup rather than a cosmetic detail.",
    decisions: [
      "Read the five-yard position and actual melee-weaving conditions before expecting the reference result at maximum spell range. Removing melee uptime changes what was measured.",
      "Treat the totem and raid-support policy as part of the comparison. The common benchmark supplies a defined support package; it does not measure the value of recruiting this class into a raid missing those buffs.",
      "Keep the chosen weapon, imbue, spell ranks and mana recovery together. A caster or melee label alone does not establish which full loadout performs better in this model.",
    ],
    mistakes: [
      "Advertising a melee-weave number as stationary ranged-only output.",
      "Adding an untested imbue or changing totems silently.",
      "Calling a damage result a Restoration recommendation.",
    ],
    roleBoundary:
      "Restoration healing and any tanking arrangement need separate studies; neither is ranked here.",
  },
  {
    key: "mage",
    name: "Mage",
    color: "#8ed9ee",
    introduction:
      "Arcane, Fire and Frost use distinct talent and proc priorities. These level-60 single-target studies complement the beginner dungeon guide; they do not replace its control, movement and party-preparation advice.",
    decisions: [
      "Read the actual proc and aura conditions before spending the next cast. A source-bound priority is more useful than a rigid sequence that assumes the same procs on every pull.",
      "Keep mana recovery and cooldown timing in the full reference. A short target may end before a planned recovery, while a five-minute comparison exposes the cost of unsustainable spending.",
      "Compare staff and one-hand/off-hand equipment as complete packages. The benchmark retains the selected talents, equipment and consumes rather than isolating a universal value for one stat.",
    ],
    mistakes: [
      "Using a single-target position to claim the best dungeon AoE spec.",
      "Importing proc behavior from a different WoW version.",
      "Assuming a close numerical ordering will survive movement and target changes.",
    ],
    roleBoundary:
      "Dungeon control, level-30 balance, AoE farming and PvP need their own scenarios.",
  },
  {
    key: "warlock",
    name: "Warlock",
    color: "#c6acf2",
    introduction:
      "Affliction, Demonology, Destruction and DS/Ruin are distinct saved configurations. Active demons, sacrifice choices, weapon stones and mana recovery belong to the actual build; they cannot be inferred safely from a specialization name.",
    decisions: [
      "Check whether the saved setup keeps an active demon or uses sacrifice. Do not compare a pet-inclusive result against player-only damage, or describe an active-pet configuration as a pure-sacrifice build.",
      "Keep the exact damage-over-time and filler conditions. A spell's presence in the spellbook does not mean that adding it improves the tested priority, especially on targets that die before its setup pays back.",
      "Retain the saved stone, caster weapon and mana actions. The newer damage studies are versioned separately, so an older result does not become current merely because its public title remains the same.",
    ],
    mistakes: [
      "Relabelling every Demonology investment as the same pet strategy.",
      "Dropping Life Tap or other recovery assumptions from a sustained comparison.",
      "Advertising the result as proof of the best AoE or PvP build.",
    ],
    roleBoundary:
      "Pet survivability, target switching, multi-target encounters and PvP remain separate questions.",
  },
  {
    key: "druid",
    name: "Druid",
    color: "#f5b16f",
    introduction:
      "Balance and Feral Cat have separate damage references. Bear tanking remains a different guide and objective: cat damage is not a measure of bear survival, and a caster result does not rank Restoration healing.",
    decisions: [
      "Feral's saved priority depends on energy, combo points and the position behind the target. Preserve those conditions rather than assuming the same sequence works while moving or attacking from the front.",
      "Balance's mana and effect-upkeep rules belong to its complete five-minute caster setup. A short burst sample and a sustained reference can favor different decisions.",
      "Keep Feral's stat-stick mechanics separate from a caster weapon comparison. The engine's actual item contribution, talents and encounter define the measured trade-off, not an armor-type shortcut.",
    ],
    mistakes: [
      "Using Feral Cat DPS to choose the safest bear tank.",
      "Treating mana or energy thresholds as optional without rerunning.",
      "Calling the selected pre-raid gear a guaranteed launch farming route.",
    ],
    roleBoundary:
      "Bear mitigation, threat and Restoration throughput are not validated by these damage simulations.",
  },
];
