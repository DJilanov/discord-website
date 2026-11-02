import { test } from "node:test";
import assert from "node:assert/strict";
import type { RaidRole, SignupView } from "../lib/raids/contracts";
import { analyzeRosterComposition } from "../lib/raids/composition";
import type { ClassName, Specialization } from "../lib/raids/specializations";
import { buildRosterParties } from "../lib/raids/roster-layout";

function signup(
  id: string,
  className: ClassName,
  specialization: Specialization,
  role: RaidRole = "damage",
  status = "accepted",
  partyIndex: number | null = null,
): SignupView {
  return {
    id,
    status,
    role,
    partyIndex,
    slotIndex: partyIndex === null ? null : 0,
    isMine: false,
    reserves: [],
    character: {
      game: "forever",
      realm: "",
      name: id,
      className,
      specialization,
      region: "EU",
      faction: "Alliance",
      ruleset: "PvP",
    },
  };
}

test("Forever analysis counts the assumed shared crit category without a conflict penalty", () => {
  const signups = [
    signup("balance", "Druid", "Balance"),
    signup("feral", "Druid", "Feral"),
    signup("shaman", "Shaman", "Enhancement"),
  ];
  const analysis = analyzeRosterComposition(
    "forever",
    buildRosterParties(signups, 5),
    { tank: 1, healer: 1, damage: 3 },
    signups,
  );
  const effects = analysis.parties[0].effects;
  assert.equal(
    effects.find((effect) => effect.rule.id === "forever-moonkin-aura")
      ?.conflict,
    false,
  );
  assert.equal(
    effects.find((effect) => effect.rule.id === "forever-leader-of-the-pack")
      ?.conflict,
    false,
  );
  assert.equal(
    effects.find((effect) => effect.rule.id === "forever-windfury")?.rule.state,
    "conditional",
  );
});

test("the deterministic optimizer spreads duplicated party support when it improves coverage", () => {
  const signups = [
    signup("shaman-1", "Shaman", "Enhancement", "damage", "accepted", 0),
    {
      ...signup("shaman-2", "Shaman", "Enhancement"),
      partyIndex: 0,
      slotIndex: 1,
    },
    { ...signup("rogue-1", "Rogue", "Combat"), partyIndex: 0, slotIndex: 2 },
    { ...signup("rogue-2", "Rogue", "Combat"), partyIndex: 0, slotIndex: 3 },
    { ...signup("warrior", "Warrior", "Fury"), partyIndex: 0, slotIndex: 4 },
    signup("mage-1", "Mage", "Fire", "damage", "accepted", 1),
    { ...signup("mage-2", "Mage", "Arcane"), partyIndex: 1, slotIndex: 1 },
    {
      ...signup("warlock", "Warlock", "Destruction"),
      partyIndex: 1,
      slotIndex: 2,
    },
    { ...signup("priest", "Priest", "Shadow"), partyIndex: 1, slotIndex: 3 },
    {
      ...signup("paladin", "Paladin", "Holy", "healer"),
      partyIndex: 1,
      slotIndex: 4,
    },
  ];
  const analysis = analyzeRosterComposition(
    "tbc",
    buildRosterParties(signups, 10),
    { tank: 0, healer: 1, damage: 9 },
    signups,
  );
  assert.equal(analysis.arrangementImproves, true);
  assert.equal(
    analysis.optimizedParties.every(
      (party) =>
        party.signups.filter((entry) => entry.character.className === "Shaman")
          .length === 1,
    ),
    true,
  );
});

test("recruitment fills role deficits before optional aura gains and ranks real signups separately", () => {
  const accepted = [
    signup("tank", "Warrior", "Protection", "tank"),
    signup("damage", "Rogue", "Combat"),
  ];
  const waiting = signup("waiting-healer", "Priest", "Holy", "healer", "bench");
  const analysis = analyzeRosterComposition(
    "tbc",
    buildRosterParties(accepted, 5),
    { tank: 1, healer: 1, damage: 3 },
    [...accepted, waiting],
  );
  assert.ok(analysis.recruitment.length > 0);
  assert.ok(analysis.recruitment.some((entry) => entry.role === "healer"));
  assert.ok(analysis.recruitment.some((entry) => entry.role === "damage"));
  assert.equal(analysis.availableCandidates[0]?.signupId, "waiting-healer");
  assert.equal(analysis.availableCandidates[0]?.partyIndex, 0);
});

test("Forever raid-wide providers reach other parties while mana effects stay in their party", () => {
  const signups = [
    signup("feral", "Druid", "Feral", "tank", "accepted", 0),
    {
      ...signup("shaman", "Shaman", "Restoration", "healer"),
      partyIndex: 0,
      slotIndex: 1,
    },
    { ...signup("warrior", "Warrior", "Fury"), partyIndex: 0, slotIndex: 2 },
    signup("mage", "Mage", "Fire", "damage", "accepted", 1),
  ];
  const result = analyzeRosterComposition(
    "forever",
    buildRosterParties(signups, 10),
    { tank: 1, healer: 1, damage: 8 },
    signups,
  );
  const second = result.parties[1]!.effects;
  assert(
    second.some(
      (effect) =>
        effect.rule.id === "forever-leader-of-the-pack" &&
        effect.rule.scope === "raid",
    ),
  );
  assert(second.some((effect) => effect.rule.id === "forever-windfury"));
  assert(second.some((effect) => effect.rule.id === "battle-shout"));
  assert(!second.some((effect) => effect.rule.id === "forever-mana-spring"));
  assert(!second.some((effect) => effect.rule.id === "forever-mana-tide"));
});

test("duplicated raid-wide crit does not reduce coverage score or demand party redistribution", () => {
  const onlyFeral = [signup("feral", "Druid", "Feral")];
  const one = analyzeRosterComposition(
    "forever",
    buildRosterParties(onlyFeral, 5),
    { tank: 0, healer: 0, damage: 5 },
    onlyFeral,
  );
  const both = [...onlyFeral, signup("balance", "Druid", "Balance")];
  const two = analyzeRosterComposition(
    "forever",
    buildRosterParties(both, 5),
    { tank: 0, healer: 0, damage: 5 },
    both,
  );
  assert.equal(two.parties[0]!.score, one.parties[0]!.score * 2);
  const moved = [
    signup("feral", "Druid", "Feral", "damage", "accepted", 0),
    signup("balance", "Druid", "Balance", "damage", "accepted", 1),
  ];
  const result = analyzeRosterComposition(
    "forever",
    buildRosterParties(moved, 10),
    { tank: 0, healer: 0, damage: 10 },
    moved,
  );
  assert.equal(result.arrangementImproves, false);
});

test("Trueshot counts Hunters rather than granting melee attack power, and the missing Warrior is a recruitment priority", () => {
  const signups = [
    signup("hunter", "Hunter", "Marksmanship"),
    signup("rogue", "Rogue", "Combat"),
  ];
  const result = analyzeRosterComposition(
    "forever",
    buildRosterParties(signups, 10),
    { tank: 0, healer: 0, damage: 10 },
    signups,
  );
  assert.equal(
    result.parties[0]!.effects.find(
      (effect) => effect.rule.id === "forever-trueshot-aura",
    )?.beneficiaryCount,
    1,
  );
  assert.equal(result.recruitment[0]?.className, "Warrior");
  assert(
    result.recruitment[0]?.reasons.some((reason) => reason.includes("Sunder")),
  );
});
