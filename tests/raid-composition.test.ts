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

test("Forever analysis labels talent conflicts and provisional effects honestly", () => {
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
    true,
  );
  assert.equal(
    effects.find((effect) => effect.rule.id === "forever-leader-of-the-pack")
      ?.conflict,
    true,
  );
  assert.equal(
    effects.find((effect) => effect.rule.id === "forever-windfury")?.rule.state,
    "provisional",
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
