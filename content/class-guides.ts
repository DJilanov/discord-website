export interface TalentExplanation {
  name: string;
  purpose: string;
  tradeoff: string;
}

export interface CombatStep {
  spell: string;
  when: string;
  reason: string;
}

export interface CombatScenario {
  id: string;
  label: string;
  summary: string;
  steps: CombatStep[];
}

export interface ClassGuideContent {
  key: string;
  className: string;
  title: string;
  role: string;
  introduction: string;
  talents: TalentExplanation[];
  scenarios: CombatScenario[];
  mistakes: Array<{ problem: string; response: string }>;
  preparation: string[];
}

// Recommendations are editorial priorities for review, not a simulated rotation.
export const classGuides: ClassGuideContent[] = [
  {
    key: "feral-tank",
    className: "Druid",
    title: "Feral tank playbook",
    role: "Bear tank",
    introduction:
      "Build enough control to keep the party safe, then spend spare rage on threat. Your next decision depends on loose enemies, available rage and incoming damage, not a fixed button loop.",
    talents: [
      {
        name: "Ferocity",
        purpose:
          "Cheaper rage spenders leave more room to react. A bear that repeatedly runs dry should examine costs before adding another expensive attack to the opener.",
        tradeoff:
          "It reduces resource pressure; it does not create starting rage or guarantee that an attack lands.",
      },
      {
        name: "Heart of the Wild",
        purpose:
          "The Bear-form stamina component makes this an early survival consideration, rather than a talent to postpone because an older tree placed it much deeper.",
        tradeoff:
          "Extra health is a buffer, not healing or threat. Keep the healer's recovery window in the pull plan.",
      },
      {
        name: "Feral Swiftness",
        purpose:
          "Separate its movement benefit from its dodge benefit. For bear tanking, read the part that actually applies to the form you will use.",
        tradeoff:
          "A movement talent is not permission to outrun the healer. Dodge also makes incoming damage less predictable over a short window.",
      },
      {
        name: "Feral Instinct",
        purpose:
          "Consider it when Swipe contributes meaningfully to your small-pack threat. Check the current effect rather than assuming this is the old passive bear-threat talent.",
        tradeoff:
          "Stronger Swipe does not make it an unlimited-target attack or solve a single enemy running outside its reach.",
      },
      {
        name: "Thick Hide",
        purpose:
          "Inspect the relationship between your Defense bonuses and armor. It is a reason to evaluate the actual defensive item, not discard it because a Classic damage list ignores Defense.",
        tradeoff:
          "Compare the complete equipment change. An armor interaction alone is not a universal item score or a critical-hit immunity claim.",
      },
      {
        name: "Primal Bite",
        purpose:
          "This is the bear-specific active threat choice to plan around once you have invested in its prerequisites. Keep enough rage for it when it answers the current threat problem.",
        tradeoff:
          "It competes for rage with other actions. A low-level bear or a build without the talent must use a different sequence.",
      },
      {
        name: "Blood Frenzy",
        purpose:
          "Its critical-strike resource interaction belongs in the explanation of why the bear sometimes feels much smoother after a crit, not in a promise of constant rage.",
        tradeoff:
          "A chance-based return is not available on demand. Do not budget an emergency action around a proc that has not happened.",
      },
      {
        name: "Natural Reaction",
        purpose:
          "Dodge and its associated rage return connect survival and resource flow. Track both when comparing a deeper bear build.",
        tradeoff:
          "A defensive proc is variable. Test against comparable enemies and do not count the same avoided hit as both incoming damage and received rage.",
      },
    ],
    scenarios: [
      {
        id: "single",
        label: "One target",
        summary:
          "Establish the pull, keep the dangerous target facing away from the party and reassess after each action. Maintenance effects are conditional, not commands to recast them every time.",
        steps: [
          {
            spell: "Faerie Fire",
            when: "On the agreed pull or when the armor effect needs refreshing",
            reason:
              "Use its ranged contact deliberately. Do not accidentally bring an extra pack while the party is still preparing.",
          },
          {
            spell: "Primal Bite",
            when: "Learned, ready and you have rage for a high-threat strike",
            reason:
              "Use an actual bear threat tool before treating spare-rage spending as the whole rotation.",
          },
          {
            spell: "Lacerate",
            when: "Learned and this target will live long enough for the bleed",
            reason:
              "Build and maintain the effect on a durable enemy. Repeatedly starting it on nearly dead enemies wastes the part of the ability that needs time.",
          },
          {
            spell: "Maul",
            when: "You have rage left after the actions the pull requires",
            reason:
              "This modifies the next melee attack. Treat it as a resource commitment, not a free instant button, and stop queuing it if it starves your next response.",
          },
        ],
      },
      {
        id: "pack",
        label: "Several targets",
        summary:
          "Mark a first kill, gather enemies where the party expects them and watch individual targets. More damage on one enemy is not the same as control of the whole pack.",
        steps: [
          {
            spell: "Swipe",
            when: "The intended enemies are together and no nearby control will be broken",
            reason:
              "The recorded ability strikes three nearby enemies. Reposition and change targets instead of assuming every enemy in a large pull has been covered.",
          },
          {
            spell: "Primal Bite",
            when: "A dangerous or heavily focused target needs extra threat",
            reason:
              "Use focused threat on the enemy the party is actually attacking. A surviving loose enemy matters more than an attractive overall damage number.",
          },
          {
            spell: "Demoralizing Roar",
            when: "Its melee attack-power reduction is useful and needs applying",
            reason:
              "This is a defensive maintenance decision. Repeating it without a purpose consumes rage that might be needed elsewhere.",
          },
          {
            spell: "Growl",
            when: "An enemy leaves you for another party member",
            reason:
              "Recover a specific loose target, then follow with threat. Growl does nothing useful on a target already attacking you.",
          },
        ],
      },
      {
        id: "recovery",
        label: "Recovery",
        summary:
          "Call the problem early. Choose a response to the damage type and available resource; no cooldown repairs an uncontrolled additional pack by itself.",
        steps: [
          {
            spell: "Growl",
            when: "A recoverable loose enemy is attacking the healer or damage dealer",
            reason:
              "Bring the problem back into the planned tanking position. Ask the player to move toward the group rather than chasing farther away.",
          },
          {
            spell: "Barkskin",
            when: "Learned and a physical-damage window needs mitigation",
            reason:
              "The recorded tooltip specifies physical damage reduction. Do not describe it as a blanket answer to every magic mechanic.",
          },
          {
            spell: "Frenzied Regeneration",
            when: "Learned, health is threatened and rage is available",
            reason:
              "It converts rage into healing over time. Call it and avoid promising the full theoretical heal when the required rage is not there.",
          },
        ],
      },
    ],
    mistakes: [
      {
        problem: "Rage keeps reaching zero",
        response:
          "Stop automatic Maul spending, note misses and the point at which rage disappears, then compare the cost of the actions you actually used. Do not deliberately take avoidable damage to make a resource graph look better.",
      },
      {
        problem: "One enemy is always loose",
        response:
          "Check whether it was outside Swipe's coverage, attacked a different target or entered late. Record that enemy and your response instead of changing the entire build immediately.",
      },
      {
        problem: "A guide tells a level-18 bear to use Lacerate",
        response:
          "That is the wrong progression stage. The archived spellbook first lists Lacerate at 42. Use the level filter and your real spellbook, not a level-60 sequence pasted into an early dungeon.",
      },
    ],
    preparation: [
      "Bear Form and your current defensive equipment are ready.",
      "The healer's pause signal and first kill target are agreed.",
      "Rage-consuming emergency tools have a resource plan.",
      "Your build link identifies the snapshot and allocated talents.",
    ],
  },
  {
    key: "protection-paladin",
    className: "Paladin",
    title: "Protection Paladin playbook",
    role: "Shield tank",
    introduction:
      "Connect your active seal, threat buff, shield and mana plan. A reliable first pull comes from knowing which interaction each button supplies, not pressing every Holy spell on cooldown.",
    talents: [
      {
        name: "Toughness",
        purpose:
          "Consider the armor from the items you actually wear. It is a straightforward physical-survival choice when you expect to be taking melee hits.",
        tradeoff:
          "Armor does not replace a plan for magic damage, loose casters or a healer who is still drinking.",
      },
      {
        name: "Precision",
        purpose:
          "Reliability matters when an important attack or spell must connect. This deserves attention when reviewing a resisted or missed recovery attempt.",
        tradeoff:
          "Additional hit chance is not a guarantee. Keep a second response ready instead of treating a talent allocation as proof that a taunt cannot fail.",
      },
      {
        name: "Improved Seal of Fury",
        purpose:
          "The seal's shield-consumption interaction is part of your mana economy. Review how often it actually happens in the pulls you host.",
        tradeoff:
          "Do not assume full returns while not being attacked, or add several hypothetical mana sources without checking whether each triggered.",
      },
      {
        name: "Improved Righteous Fury",
        purpose:
          "Read this as a defensive interaction with an active buff, rather than importing an older extra-threat calculation.",
        tradeoff:
          "The benefit is conditional on Righteous Fury. A build link cannot show that the buff was actually active on a bad pull.",
      },
      {
        name: "Shield Specialization",
        purpose:
          "Blocks connect your shield setup with mana recovery. Watch real block opportunities before concluding that a low-mana pull proves the talent is broken.",
        tradeoff:
          "Use the current rank text and internal cooldown. An older preview's larger mana return should not be used in a current sustainability estimate.",
      },
      {
        name: "Sacred Duty",
        purpose:
          "The stamina and defensive-cooldown interaction supports planning a dangerous pull before it starts.",
        tradeoff:
          "A shorter cooldown is not an extra charge. Check current availability and Forbearance rather than promising consecutive incompatible defensives.",
      },
      {
        name: "Swift Judgement",
        purpose:
          "A Judgement reset gives you a deliberate recovery option after a failed or newly urgent taunt.",
        tradeoff:
          "Saving the reset for recovery may be more valuable than spending it immediately for damage. Know which seal your next Judgement will use.",
      },
      {
        name: "Templar's Bulwark",
        purpose:
          "Plan the absorption window around a real threat to survival and tell the healer what you are covering.",
        tradeoff:
          "Forbearance and the limited duration matter. It is not a permanent health increase, and the shield does not move a caster into your melee range.",
      },
      {
        name: "Holy Shield",
        purpose:
          "For a build that has it, block charges are part of the active shield plan while enemies are attacking you.",
        tradeoff:
          "Charges can be spent quickly by multiple attackers. An active-duration label is not a promise that every incoming swing will be covered.",
      },
    ],
    scenarios: [
      {
        id: "single",
        label: "One target",
        summary:
          "Prepare your buff and seal before contact. The sequence below is a decision checklist: a recovery Judgement and an ordinary damage opportunity are different jobs.",
        steps: [
          {
            spell: "Righteous Fury",
            when: "Before tanking, if the buff is missing",
            reason:
              "Confirm the tanking threat buff rather than trying to repair a missing-buff problem with more casts after the pull.",
          },
          {
            spell: "Seal of Fury",
            when: "Before contact or when you need to restore the intended tanking seal",
            reason:
              "Check the shield requirement and keep the seal visible. Changing seals changes the effect your Judgement will deliver.",
          },
          {
            spell: "Judgement",
            when: "Your active seal's effect is appropriate; urgently when its taunt is needed",
            reason:
              "The snapshot says Judgement does not consume the seal. Do not insert automatic re-sealing after every Judgement just because an old guide does.",
          },
          {
            spell: "Holy Strike",
            when: "The target is in reach, the spell is ready and mana permits",
            reason:
              "Use your direct attack on the intended kill target without spending the reserve you need for control or recovery.",
          },
          {
            spell: "Holy Shield",
            when: "Learned, facing incoming attacks and able to maintain its cost",
            reason:
              "Read its remaining duration and charges in the actual encounter. This is not a low-level baseline spell.",
          },
        ],
      },
      {
        id: "pack",
        label: "Several targets",
        summary:
          "Position the pull before spending heavily. The tank must still notice enemies outside the damage area and preserve any marked control target.",
        steps: [
          {
            spell: "Consecration",
            when: "Enemies will remain in the area and you have agreed to area damage",
            reason:
              "The first four entrants receive the stronger recorded effect. Do not import a TBC-style unlimited-pull assumption or repeatedly place it where enemies are not standing.",
          },
          {
            spell: "Holy Strike",
            when: "The priority target needs focused attention",
            reason:
              "Maintain the first kill target while checking the rest of the pack. Overall area damage does not prove that a late-arriving enemy is controlled.",
          },
          {
            spell: "Judgement",
            when: "A loose target needs the active Seal of Fury's taunt",
            reason:
              "Pick the actual loose enemy, then stabilize it. Confirm the seal before relying on this as a recovery button.",
          },
          {
            spell: "Holy Shield",
            when: "Learned and the block window is useful",
            reason:
              "Check charges under multiple attacks and watch mana. Do not replace a sensible pull size with an assumption of unlimited blocks.",
          },
        ],
      },
      {
        id: "recovery",
        label: "Recovery",
        summary:
          "Separate a failed taunt, low mana and an incoming damage spike. The right recovery depends on which problem is happening.",
        steps: [
          {
            spell: "Seal of Fury",
            when: "You need its Judgement effect but another seal is active",
            reason:
              "Restore the intended taunt interaction before spending the Judgement cooldown.",
          },
          {
            spell: "Swift Judgement",
            when: "Learned and a Judgement reset is required",
            reason:
              "Reset deliberately, then use Judgement on the urgent target. Do not assume the reset itself taunts anything.",
          },
          {
            spell: "Judgement",
            when: "The loose enemy is in range and the correct seal is active",
            reason:
              "Recover the enemy, call the change and continue with threat. A resisted action needs another plan, not silent repetition.",
          },
          {
            spell: "Templar's Bulwark",
            when: "Learned, survival is threatened and Forbearance permits it",
            reason:
              "Use the planned absorption window and communicate. If mana is the issue, reduce optional spending and arrange a pause rather than assuming a shield restores it.",
          },
        ],
      },
    ],
    mistakes: [
      {
        problem: "Every pull ends without mana",
        response:
          "Record Consecration placement, seal uptime, actual block/absorb returns and optional casts. Stop treating theoretical maximum returns as a sustainable budget.",
      },
      {
        problem: "Judgement did not recover the enemy",
        response:
          "Check the active seal, range, target and the combat result. A different seal effect, a failed hit and an unavailable cooldown are different causes.",
      },
      {
        problem: "The party expects you to interrupt every cast",
        response:
          "Assign a party interruption plan before entry. Do not promise a standard interrupt just because other versions gave Paladins more tools.",
      },
    ],
    preparation: [
      "Shield, active seal and Righteous Fury are checked at the appropriate level.",
      "The group knows who handles interrupts and loose casters.",
      "Optional damage spending leaves mana for the next required action.",
      "Defensive cooldowns and Forbearance are checked before a hard pull.",
    ],
  },
  {
    key: "mage-dungeon",
    className: "Mage",
    title: "Mage dungeon playbook",
    role: "Ranged damage & control",
    introduction:
      "Choose a school plan, but keep the party's control and threat plan above a damage script. Procs, movement, target life and mana determine what you cast next.",
    talents: [
      {
        name: "Improved Frostbolt",
        purpose:
          "A useful starting point for a Frost-centered cast pattern. Compare actual cast time and the rank you use rather than treating all Frostbolt ranks as identical.",
        tradeoff:
          "A quicker filler does not answer movement or control. Spell rank, target life and mana still matter.",
      },
      {
        name: "Elemental Precision",
        purpose:
          "Consider hit reliability for the schools named in the current tooltip when important casts fail.",
        tradeoff:
          "Do not apply this benefit to every school or promise that a crowd-control cast can never fail.",
      },
      {
        name: "Ice Shards",
        purpose:
          "It makes the explanation of Frost critical strikes more important. Read it alongside the actual spell schools of the build you are comparing.",
        tradeoff:
          "Crit damage is not crit chance. A higher theoretical critical hit does not establish higher sustained damage in your current gear.",
      },
      {
        name: "Shatter",
        purpose:
          "Understand when a target is treated as frozen before planning a critical-strike window.",
        tradeoff:
          "A boss you cannot freeze is not automatically a frozen target. Check which effect supplies the condition rather than assuming every slow qualifies.",
      },
      {
        name: "Fingers of Frost",
        purpose:
          "Use actual charges to recognize a frozen-target opportunity without assuming the enemy is physically immobilized.",
        tradeoff:
          "A proc is not permanent. Do not build every next cast around a charge that has not appeared or has already been consumed.",
      },
      {
        name: "Winter's Chill",
        purpose:
          "Read the current Cone of Cold interaction and decide whether moving into range is appropriate for this pull.",
        tradeoff:
          "It is not the older shared raid critical-strike debuff. Stacks do not justify breaking control or stepping into a dangerous melee position.",
      },
      {
        name: "Missile Barrage",
        purpose:
          "Recognize its proc and the resulting Arcane Missiles opportunity. It is available in a different place than older preview text suggests.",
        tradeoff:
          "A channel still needs a safe position and enough remaining target life. Do not assume an unused proc is worth ignoring a dangerous cast.",
      },
      {
        name: "Arcane Blast",
        purpose:
          "Use the recorded stacking spell-damage and cost interaction to plan an affordable window rather than copying an older Arcane Blast loop.",
        tradeoff:
          "More stacks also raise cost. The archived duration starts at initial application; do not assume every added cast creates a fresh full window.",
      },
      {
        name: "Arcane Wrath",
        purpose:
          "Consider how the maximum-mana interaction fits the equipment and cast window you actually have.",
        tradeoff:
          "It needs a sufficiently safe cast and a surviving target. A large single cast is not automatically a universal filler.",
      },
      {
        name: "Heating Up",
        purpose:
          "Observe real charges and the next Pyroblast cast time while playing a Fire-focused build.",
        tradeoff:
          "Do not replace Forever's charges with an assumed instant-Pyroblast mechanic from a different version.",
      },
      {
        name: "Fire Power",
        purpose:
          "Track your relevant Fire effects when evaluating the talent's conditional benefit.",
        tradeoff:
          "Do not count every mixed-school effect as a qualifying Fire effect, or spend more mana maintaining effects than the short-lived enemy warrants.",
      },
    ],
    scenarios: [
      {
        id: "frost",
        label: "Frost",
        summary:
          "A beginner-friendly single-target outline. Keep the tank's first target, interrupt assignment and controlled enemy visible; this is not a claim that Frost is always the strongest school.",
        steps: [
          {
            spell: "Polymorph",
            when: "A valid marked target is assigned to you for control",
            reason:
              "Control comes before the damage plan. Keep area damage away and refresh safely if the group's kill order requires it.",
          },
          {
            spell: "Counterspell",
            when: "Learned and a dangerous interruptible cast is assigned to you",
            reason:
              "Stopping the important spell can matter more than finishing a filler. Its cooldown is not a replacement for a party interrupt order.",
          },
          {
            spell: "Frostbolt",
            when: "You can stand still and no more urgent group job is pending",
            reason:
              "Use the intended spell rank on the kill target. Record movement and interruptions when comparing damage rather than treating all cast time as available.",
          },
          {
            spell: "Ice Lance",
            when: "Learned and a real frozen-target opportunity or movement decision makes it appropriate",
            reason:
              "Check an actual freeze or Fingers of Frost charge. Repeating an unempowered instant spell is not automatically equivalent to the cast you could have completed.",
          },
        ],
      },
      {
        id: "arcane",
        label: "Arcane",
        summary:
          "An affordable damage window is more useful than blindly forcing maximum stacks. Only include talented spells your real build has unlocked.",
        steps: [
          {
            spell: "Arcane Blast",
            when: "Learned, with mana and time to use the window",
            reason:
              "Build only the stacks the situation supports. Watch the increasing cost and the original window timer; a nearly dead target does not need a full setup.",
          },
          {
            spell: "Arcane Wrath",
            when: "Learned, ready and a safe long cast is available",
            reason:
              "Use the mana-scaling spell deliberately. Do not start a cast that the next movement requirement or target death is likely to cancel.",
          },
          {
            spell: "Arcane Missiles",
            when: "A useful proc is active or this channel fits your current plan",
            reason:
              "Check the actual proc and target life. A full channel, a clipped channel and an interrupted channel are different observations.",
          },
          {
            spell: "Counterspell",
            when: "A dangerous assigned cast requires it",
            reason:
              "Your interruption responsibility remains active during a damage window. A planned group kill is more valuable than a perfect-looking private sequence.",
          },
        ],
      },
      {
        id: "fire",
        label: "Fire",
        summary:
          "Use your actual Fire talents and target life to decide how much setup is worth maintaining. Do not advertise a fixed optimum without a current build and encounter comparison.",
        steps: [
          {
            spell: "Fireball",
            when: "A stationary filler fits the current build and target",
            reason:
              "Keep the tank's target and remaining health in view. A long cast into an enemy about to die is not the same as a completed damaging hit.",
          },
          {
            spell: "Scorch",
            when: "Its effect or shorter cast is useful for your actual allocation",
            reason:
              "Maintain a relevant effect deliberately. A talent that is not allocated cannot supply its debuff or improve a different Mage's personal effects by assumption.",
          },
          {
            spell: "Fire Blast",
            when: "An instant cast or its current talent interaction is worth the mana",
            reason:
              "Check range, cooldown and the current charge state. Do not turn every available instant into mandatory spending regardless of target life.",
          },
          {
            spell: "Pyroblast",
            when: "Learned and current Heating Up charges or preparation make the cast practical",
            reason:
              "Read the actual cast time before committing. This outline does not assume an instant proc from another expansion.",
          },
        ],
      },
      {
        id: "area",
        label: "Area & recovery",
        summary:
          "Area damage is a group decision, not the default answer to every pack. Preserve control and stay in a position from which the tank can recover a loose enemy.",
        steps: [
          {
            spell: "Blizzard",
            when: "The tank has established the intended pack and channeling is safe",
            reason:
              "Check both the area and any controlled enemy before committing. Stop or reposition when the pull changes instead of continuing a channel into the wrong situation.",
          },
          {
            spell: "Cone of Cold",
            when: "Learned and a safe close-range window is useful",
            reason:
              "Cone positioning matters. Any Winter's Chill interaction must be present in your real build, and a stronger hit does not justify entering a dangerous pack.",
          },
          {
            spell: "Frost Nova",
            when: "Nearby rootable enemies need an emergency space-making response",
            reason:
              "Tell the party and move toward a recoverable position. Damage can break the root; do not assume a rooted enemy is harmless to someone already standing beside it.",
          },
          {
            spell: "Ice Block",
            when: "Learned and its immunity is the right emergency response",
            reason:
              "Call it so the party can respond. You cannot keep casting while encased, and becoming immune does not mean the group has finished recovering the pull.",
          },
        ],
      },
    ],
    mistakes: [
      {
        problem: "Area damage repeatedly breaks the pull",
        response:
          "Check the marked control target, who started the pack and whether enemies were gathered. Fix timing and placement before concluding that the damage build is wrong.",
      },
      {
        problem: "A build comparison gives contradictory results",
        response:
          "Keep target level, gear, buffs, duration and movement assumptions fixed. Then change one allocation. Model results and a real session meter answer different questions.",
      },
      {
        problem: "The current tooltip disagrees with an old class preview",
        response:
          "Use the dated spellbook and later tuning context. Arcane Blast, Winter's Chill and several Fire interactions changed during beta; a familiar name does not preserve the original design.",
      },
    ],
    preparation: [
      "The first kill target and any Polymorph target are agreed.",
      "Interrupt responsibilities match learned abilities.",
      "Your current rank, build and mana plan are checked.",
      "Area damage and movement decisions preserve the tank's recovery position.",
    ],
  },
];

export function getClassGuide(key: string): ClassGuideContent | undefined {
  return classGuides.find((guide) => guide.key === key);
}
