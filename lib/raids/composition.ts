import type { RaidGame } from "./games";
import type { RaidRole, SignupView } from "./contracts";
import type { ClassName, Specialization } from "./specializations";
import { suggestedRole, specializationsByClass } from "./specializations";
import type { RosterParty } from "./roster-layout";
import { sameRosterLayout } from "./roster-layout";

export type EffectState = "available" | "conditional" | "provisional";
type Audience = "all" | "melee" | "physical" | "caster" | "mana" | "tank";

export interface CompositionEffectRule {
  id: string;
  name: string;
  icon: string;
  description: string;
  className: ClassName;
  specializations?: readonly Specialization[];
  audience: Audience;
  priority: number;
  state: EffectState;
  requirement: string;
  stackingGroup?: string;
}

export interface PartyEffectCoverage {
  rule: CompositionEffectRule;
  providers: SignupView[];
  beneficiaryCount: number;
  duplicate: boolean;
  conflict: boolean;
}

export interface PartyCompositionReport {
  partyIndex: number;
  effects: PartyEffectCoverage[];
  score: number;
}

export interface CompositionCandidate {
  className: ClassName;
  specialization: Specialization;
  role: RaidRole;
}

export interface RosterSuggestion extends CompositionCandidate {
  partyIndex: number;
  score: number;
  reasons: string[];
  signupId?: string;
  characterName?: string;
}

export interface RosterCompositionAnalysis {
  parties: PartyCompositionReport[];
  optimizedParties: RosterParty[];
  arrangementImproves: boolean;
  availableCandidates: RosterSuggestion[];
  recruitment: RosterSuggestion[];
}

export const compositionRevisions: Record<RaidGame, string> = {
  forever: "forever-preview-2026.09.15",
  tbc: "tbc-anniversary-2026.10.1",
};

const icon = (name: string): string => `/images/raids/icons/${name}.jpg`;

const sharedRules: CompositionEffectRule[] = [
  {
    id: "battle-shout",
    name: "Battle Shout",
    icon: icon("ability_warrior_innerrage"),
    description: "Melee attack-power support for nearby party members.",
    className: "Warrior",
    audience: "melee",
    priority: 2,
    state: "available",
    requirement: "A Warrior maintaining Battle Shout",
  },
  {
    id: "paladin-aura",
    name: "Paladin aura",
    icon: icon("spell_holy_devotionaura"),
    description:
      "A party aura choice such as Devotion or Concentration Aura. Only the planned aura should be counted as active.",
    className: "Paladin",
    audience: "all",
    priority: 2,
    state: "available",
    requirement: "A Paladin assigned an appropriate aura",
  },
];

const foreverRules: CompositionEffectRule[] = [
  ...sharedRules,
  {
    id: "forever-trueshot-aura",
    name: "Trueshot Aura",
    icon: icon("ability_marksmanship"),
    description: "Increases the ranged attack power of party members.",
    className: "Hunter",
    specializations: ["Marksmanship"],
    audience: "physical",
    priority: 3,
    state: "conditional",
    requirement: "Marksmanship build with Trueshot Aura",
  },
  {
    id: "forever-vampiric-embrace",
    name: "Vampiric Embrace",
    icon: icon("spell_shadow_shadowwordpain"),
    description: "Converts the Shadow Priest's damage into party healing.",
    className: "Priest",
    specializations: ["Shadow"],
    audience: "all",
    priority: 2,
    state: "conditional",
    requirement: "Shadow build with Vampiric Embrace",
  },
  {
    id: "forever-mana-spring",
    name: "Mana Spring Totem",
    icon: icon("spell_nature_magicimmunity"),
    description: "Restores mana to group members within range.",
    className: "Shaman",
    audience: "mana",
    priority: 3,
    state: "available",
    requirement: "A Shaman using the Mana Spring water-totem slot",
  },
  {
    id: "forever-mana-tide",
    name: "Mana Tide Totem",
    icon: icon("spell_nature_healingtouch"),
    description: "A Restoration talent that restores mana to the group.",
    className: "Shaman",
    specializations: ["Restoration"],
    audience: "mana",
    priority: 4,
    state: "conditional",
    requirement: "Restoration build with Mana Tide Totem",
  },
  {
    id: "forever-moonkin-aura",
    name: "Moonkin Aura",
    icon: icon("spell_nature_starfall"),
    description:
      "Provides party critical chance and is exclusive with Leader of the Pack in the preview rules.",
    className: "Druid",
    specializations: ["Balance"],
    audience: "all",
    priority: 4,
    state: "conditional",
    requirement: "Balance build using Moonkin Form",
    stackingGroup: "forever-druid-party-crit",
  },
  {
    id: "forever-leader-of-the-pack",
    name: "Leader of the Pack",
    icon: icon("ability_racial_bearform"),
    description:
      "Provides party critical chance and is exclusive with Moonkin Aura in the preview rules.",
    className: "Druid",
    specializations: ["Feral"],
    audience: "all",
    priority: 4,
    state: "conditional",
    requirement: "Feral build with Leader of the Pack while shapeshifted",
    stackingGroup: "forever-druid-party-crit",
  },
  {
    id: "forever-windfury",
    name: "Windfury Totem",
    icon: icon("spell_nature_lightningshield"),
    description:
      "Potential melee weapon support. The current Forever record is a Classic fallback and still needs live-build confirmation.",
    className: "Shaman",
    audience: "melee",
    priority: 4,
    state: "provisional",
    requirement: "A Shaman using Windfury Totem, if unchanged in Forever",
  },
];

const tbcRules: CompositionEffectRule[] = [
  ...sharedRules,
  {
    id: "tbc-bloodlust",
    name: "Bloodlust / Heroism",
    icon: icon("spell_nature_lightningshield"),
    description: "A major party haste cooldown supplied by a Shaman.",
    className: "Shaman",
    audience: "all",
    priority: 5,
    state: "available",
    requirement: "A Shaman in the party",
  },
  {
    id: "tbc-windfury",
    name: "Windfury Totem",
    icon: icon("spell_nature_lightningshield"),
    description: "High-value melee weapon support for the party.",
    className: "Shaman",
    audience: "melee",
    priority: 5,
    state: "available",
    requirement: "A Shaman using the Windfury air-totem slot",
  },
  {
    id: "tbc-mana-spring",
    name: "Mana Spring Totem",
    icon: icon("spell_nature_magicimmunity"),
    description: "Sustained mana support for party members.",
    className: "Shaman",
    audience: "mana",
    priority: 3,
    state: "available",
    requirement: "A Shaman using the Mana Spring water-totem slot",
  },
  {
    id: "tbc-totem-of-wrath",
    name: "Totem of Wrath",
    icon: icon("spell_nature_lightning"),
    description: "Elemental party support for spell hit and critical chance.",
    className: "Shaman",
    specializations: ["Elemental"],
    audience: "caster",
    priority: 4,
    state: "conditional",
    requirement: "Elemental build with Totem of Wrath",
  },
  {
    id: "tbc-moonkin-aura",
    name: "Moonkin Aura",
    icon: icon("spell_nature_starfall"),
    description: "Spell critical-strike support for party members.",
    className: "Druid",
    specializations: ["Balance"],
    audience: "caster",
    priority: 4,
    state: "conditional",
    requirement: "Balance build using Moonkin Form",
  },
  {
    id: "tbc-leader-of-the-pack",
    name: "Leader of the Pack",
    icon: icon("ability_racial_bearform"),
    description: "Melee and ranged critical-strike support for the party.",
    className: "Druid",
    specializations: ["Feral"],
    audience: "physical",
    priority: 4,
    state: "conditional",
    requirement: "Feral build with Leader of the Pack while shapeshifted",
  },
  {
    id: "tbc-trueshot-aura",
    name: "Trueshot Aura",
    icon: icon("ability_marksmanship"),
    description: "Attack-power support for physical party members.",
    className: "Hunter",
    specializations: ["Marksmanship"],
    audience: "physical",
    priority: 3,
    state: "conditional",
    requirement: "Marksmanship build with Trueshot Aura",
  },
  {
    id: "tbc-ferocious-inspiration",
    name: "Ferocious Inspiration",
    icon: icon("ability_hunter_beasttaming"),
    description: "Party damage support dependent on the Hunter's pet uptime.",
    className: "Hunter",
    specializations: ["Beast Mastery"],
    audience: "all",
    priority: 4,
    state: "conditional",
    requirement:
      "Beast Mastery build with Ferocious Inspiration and an active pet",
  },
  {
    id: "tbc-vampiric-touch",
    name: "Vampiric Touch",
    icon: icon("spell_shadow_shadowwordpain"),
    description: "Returns mana to the Shadow Priest's party through damage.",
    className: "Priest",
    specializations: ["Shadow"],
    audience: "mana",
    priority: 5,
    state: "conditional",
    requirement: "Shadow build with Vampiric Touch",
  },
  {
    id: "tbc-blood-pact",
    name: "Blood Pact",
    icon: icon("spell_shadow_metamorphosis"),
    description: "Party stamina support while the Warlock's Imp is active.",
    className: "Warlock",
    audience: "all",
    priority: 2,
    state: "conditional",
    requirement: "A Warlock using an Imp",
  },
];

export function compositionEffects(
  game: RaidGame,
): readonly CompositionEffectRule[] {
  return game === "tbc" ? tbcRules : foreverRules;
}

function isMelee(signup: Pick<SignupView, "role" | "character">): boolean {
  if (signup.role === "tank") return true;
  if (signup.role !== "damage") return false;
  const { className, specialization } = signup.character;
  return (
    className === "Warrior" ||
    className === "Rogue" ||
    (className === "Druid" && specialization === "Feral") ||
    (className === "Shaman" && specialization === "Enhancement") ||
    (className === "Paladin" && specialization === "Retribution")
  );
}

function isPhysical(signup: Pick<SignupView, "role" | "character">): boolean {
  return isMelee(signup) || signup.character.className === "Hunter";
}

function isCaster(signup: Pick<SignupView, "role" | "character">): boolean {
  return (
    signup.role === "healer" ||
    (!isPhysical(signup) && signup.role === "damage")
  );
}

function usesMana(signup: Pick<SignupView, "character">): boolean {
  return !["Warrior", "Rogue"].includes(signup.character.className);
}

function benefits(
  audience: Audience,
  signup: Pick<SignupView, "role" | "character">,
): boolean {
  if (audience === "all") return true;
  if (audience === "melee") return isMelee(signup);
  if (audience === "physical") return isPhysical(signup);
  if (audience === "caster") return isCaster(signup);
  if (audience === "mana") return usesMana(signup);
  return signup.role === "tank";
}

function provides(
  rule: CompositionEffectRule,
  signup: Pick<SignupView, "character">,
): boolean {
  return (
    signup.character.className === rule.className &&
    (!rule.specializations ||
      (signup.character.specialization !== null &&
        rule.specializations.includes(signup.character.specialization)))
  );
}

function reportForParty(
  game: RaidGame,
  party: RosterParty,
): PartyCompositionReport {
  const found = compositionEffects(game)
    .map((rule): PartyEffectCoverage | null => {
      const providers = party.signups.filter((signup) =>
        provides(rule, signup),
      );
      if (!providers.length) return null;
      return {
        rule,
        providers,
        beneficiaryCount: party.signups.filter((signup) =>
          benefits(rule.audience, signup),
        ).length,
        duplicate: providers.length > 1,
        conflict: false,
      };
    })
    .filter((effect): effect is PartyEffectCoverage => effect !== null);
  const stacking = new Map<string, number>();
  for (const effect of found) {
    if (!effect.rule.stackingGroup) continue;
    stacking.set(
      effect.rule.stackingGroup,
      (stacking.get(effect.rule.stackingGroup) ?? 0) + 1,
    );
  }
  for (const effect of found)
    effect.conflict = Boolean(
      effect.rule.stackingGroup &&
      (stacking.get(effect.rule.stackingGroup) ?? 0) > 1,
    );
  const score = found.reduce((total, effect) => {
    const confidence =
      effect.rule.state === "provisional"
        ? 0.35
        : effect.rule.state === "conditional"
          ? 0.75
          : 1;
    const value = effect.rule.priority * effect.beneficiaryCount * confidence;
    const duplicatePenalty = effect.duplicate ? effect.rule.priority * 2 : 0;
    const conflictPenalty = effect.conflict ? value * 0.75 : 0;
    return total + value - duplicatePenalty - conflictPenalty;
  }, 0);
  return { partyIndex: party.index, effects: found, score };
}

function layoutScore(game: RaidGame, parties: readonly RosterParty[]): number {
  return parties.reduce(
    (total, party) => total + reportForParty(game, party).score,
    0,
  );
}

export function optimizeRosterParties(
  game: RaidGame,
  source: readonly RosterParty[],
): RosterParty[] {
  let parties = source.map((party) => ({
    ...party,
    signups: [...party.signups],
  }));
  for (let pass = 0; pass < 20; pass += 1) {
    const baseline = layoutScore(game, parties);
    let bestScore = baseline;
    let best: RosterParty[] | null = null;
    for (let left = 0; left < parties.length; left += 1) {
      for (let right = left + 1; right < parties.length; right += 1) {
        for (let a = 0; a < parties[left].signups.length; a += 1) {
          for (let b = 0; b < parties[right].signups.length; b += 1) {
            const candidate = parties.map((party) => ({
              ...party,
              signups: [...party.signups],
            }));
            [candidate[left].signups[a], candidate[right].signups[b]] = [
              candidate[right].signups[b],
              candidate[left].signups[a],
            ];
            const score = layoutScore(game, candidate);
            if (score > bestScore + 0.01) {
              bestScore = score;
              best = candidate;
            }
          }
        }
      }
    }
    if (!best) break;
    parties = best;
  }
  return parties;
}

function candidateProfiles(): CompositionCandidate[] {
  const result: CompositionCandidate[] = [];
  for (const [className, specializations] of Object.entries(
    specializationsByClass,
  ) as [ClassName, readonly Specialization[]][]) {
    for (const specialization of specializations)
      result.push({
        className,
        specialization,
        role: suggestedRole(specialization),
      });
  }
  result.push({ className: "Druid", specialization: "Feral", role: "tank" });
  return result;
}

function fictionalSignup(
  game: RaidGame,
  candidate: CompositionCandidate,
): SignupView {
  return {
    id: `candidate:${candidate.className}:${candidate.specialization}:${candidate.role}`,
    character: {
      game,
      realm: game === "tbc" ? "candidate" : "",
      name: "Candidate",
      className: candidate.className,
      specialization: candidate.specialization,
      region: "EU",
      faction: "Alliance",
      ruleset: "PvE",
    },
    role: candidate.role,
    status: "accepted",
    partyIndex: null,
    slotIndex: null,
    isMine: false,
    reserves: [],
  };
}

function scoreCandidate(
  game: RaidGame,
  parties: readonly RosterParty[],
  candidate: CompositionCandidate,
  roleDeficits: ReadonlyMap<RaidRole, number>,
): RosterSuggestion | null {
  const missingRoleSeats = roleDeficits.get(candidate.role) ?? 0;
  if (roleDeficits.size && missingRoleSeats === 0) return null;
  const open = parties.filter((party) => party.signups.length < party.capacity);
  if (!open.length) return null;
  const signup = fictionalSignup(game, candidate);
  let best: RosterSuggestion | null = null;
  for (const party of open) {
    const before = reportForParty(game, party);
    const afterParty = { ...party, signups: [...party.signups, signup] };
    const after = reportForParty(game, afterParty);
    const previousIds = new Set(before.effects.map((effect) => effect.rule.id));
    const gained = after.effects
      .filter((effect) => !previousIds.has(effect.rule.id))
      .sort((left, right) => right.rule.priority - left.rule.priority);
    const rolePriority =
      candidate.role === "tank" ? 30 : candidate.role === "healer" ? 20 : 0;
    const roleValue = missingRoleSeats
      ? 100 + missingRoleSeats * 10 + rolePriority
      : 0;
    const score = roleValue + (after.score - before.score);
    const reasons = [
      ...(roleValue
        ? [
            `Fills one of ${missingRoleSeats} missing ${candidate.role} ${missingRoleSeats === 1 ? "place" : "places"}`,
          ]
        : []),
      ...gained
        .slice(0, 2)
        .map((effect) => `${effect.rule.name}: ${effect.rule.requirement}`),
    ];
    if (!reasons.length)
      reasons.push(`Best remaining fit for Group ${party.index + 1}`);
    const suggestion = {
      ...candidate,
      partyIndex: party.index,
      score,
      reasons,
    };
    if (!best || suggestion.score > best.score) best = suggestion;
  }
  return best;
}

function roleDeficits(
  signups: readonly SignupView[],
  roleCaps: Record<RaidRole, number>,
): Map<RaidRole, number> {
  const result = new Map<RaidRole, number>();
  for (const role of ["tank", "healer", "damage"] as const) {
    const missing =
      roleCaps[role] - signups.filter((signup) => signup.role === role).length;
    if (missing > 0) result.set(role, missing);
  }
  return result;
}

function recruitmentSuggestions(
  game: RaidGame,
  parties: readonly RosterParty[],
  roleCaps: Record<RaidRole, number>,
): RosterSuggestion[] {
  const deficits = roleDeficits(
    parties.flatMap((party) => party.signups),
    roleCaps,
  );
  const suggestions = candidateProfiles()
    .map((candidate) => scoreCandidate(game, parties, candidate, deficits))
    .filter((candidate): candidate is RosterSuggestion => candidate !== null)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.className.localeCompare(right.className) ||
        left.specialization.localeCompare(right.specialization),
    );
  const seen = new Set<string>();
  const unique = suggestions.filter((suggestion) => {
    const key = `${suggestion.className}:${suggestion.specialization}:${suggestion.role}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const primary = [...deficits.keys()]
    .map((role) => unique.find((suggestion) => suggestion.role === role))
    .filter(
      (suggestion): suggestion is RosterSuggestion => suggestion !== undefined,
    )
    .sort((left, right) => right.score - left.score);
  const primaryKeys = new Set(
    primary.map(
      (suggestion) =>
        `${suggestion.className}:${suggestion.specialization}:${suggestion.role}`,
    ),
  );
  return [
    ...primary,
    ...unique.filter(
      (suggestion) =>
        !primaryKeys.has(
          `${suggestion.className}:${suggestion.specialization}:${suggestion.role}`,
        ),
    ),
  ].slice(0, 3);
}

function availableCandidateSuggestions(
  game: RaidGame,
  parties: readonly RosterParty[],
  roleCaps: Record<RaidRole, number>,
  signups: readonly SignupView[],
): RosterSuggestion[] {
  const deficits = roleDeficits(
    parties.flatMap((party) => party.signups),
    roleCaps,
  );
  return signups
    .filter((signup) =>
      ["registered", "pending", "bench"].includes(signup.status),
    )
    .map((signup): RosterSuggestion | null => {
      const specialization = signup.character.specialization;
      if (!specialization || signup.role === "participant") return null;
      const result = scoreCandidate(
        game,
        parties,
        {
          className: signup.character.className,
          specialization,
          role: signup.role,
        },
        deficits,
      );
      return result
        ? {
            ...result,
            signupId: signup.id,
            characterName: signup.character.name,
          }
        : null;
    })
    .filter((candidate): candidate is RosterSuggestion => candidate !== null)
    .sort((left, right) => right.score - left.score)
    .slice(0, 3);
}

export function analyzeRosterComposition(
  game: RaidGame,
  parties: readonly RosterParty[],
  roleCaps: Record<RaidRole, number>,
  allSignups: readonly SignupView[],
): RosterCompositionAnalysis {
  const optimizedParties = optimizeRosterParties(game, parties);
  return {
    parties: parties.map((party) => reportForParty(game, party)),
    optimizedParties,
    arrangementImproves: !sameRosterLayout(parties, optimizedParties),
    availableCandidates: availableCandidateSuggestions(
      game,
      parties,
      roleCaps,
      allSignups,
    ),
    recruitment: recruitmentSuggestions(game, parties, roleCaps),
  };
}
