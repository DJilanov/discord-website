import { test } from "node:test";
import assert from "node:assert/strict";
import type { SignupView } from "../lib/raids/contracts";
import {
  buildRosterParties,
  raidPartyCount,
  rosterAssignments,
  sameRosterLayout,
} from "../lib/raids/roster-layout";

function signup(
  id: string,
  partyIndex: number | null = null,
  slotIndex: number | null = null,
): SignupView {
  return {
    id,
    status: "accepted",
    role: "damage",
    partyIndex,
    slotIndex,
    isMine: false,
    reserves: [],
    character: {
      game: "tbc",
      realm: "spineshatter",
      name: `Hero ${id}`,
      className: "Rogue",
      specialization: "Combat",
      region: "EU",
      faction: "Alliance",
      ruleset: "PvP",
    },
  };
}

test("raid rosters expose five-player parties and a partial final party", () => {
  assert.equal(raidPartyCount(25), 5);
  assert.equal(raidPartyCount(27), 6);
  const parties = buildRosterParties(
    Array.from({ length: 7 }, (_, index) => signup(String(index))),
    7,
  );
  assert.deepEqual(
    parties.map((party) => [party.capacity, party.signups.length]),
    [
      [5, 5],
      [2, 2],
    ],
  );
});

test("stored party positions are preserved and invalid or duplicate positions are normalized", () => {
  const parties = buildRosterParties(
    [
      signup("third", 1, 0),
      signup("first", 0, 0),
      signup("duplicate", 0, 0),
      signup("invalid", 9, 4),
    ],
    10,
  );
  assert.deepEqual(
    parties.map((party) => party.signups.map((entry) => entry.id)),
    [["first", "duplicate", "invalid"], ["third"]],
  );
  assert.deepEqual(rosterAssignments(parties), [
    { signupId: "first", partyIndex: 0, slotIndex: 0 },
    { signupId: "duplicate", partyIndex: 0, slotIndex: 1 },
    { signupId: "invalid", partyIndex: 0, slotIndex: 2 },
    { signupId: "third", partyIndex: 1, slotIndex: 0 },
  ]);
});

test("layout comparison is order-sensitive inside each party", () => {
  const source = buildRosterParties([signup("a"), signup("b")], 5);
  const same = buildRosterParties([signup("a"), signup("b")], 5);
  const reordered = buildRosterParties(
    [signup("a", 0, 1), signup("b", 0, 0)],
    5,
  );
  assert.equal(sameRosterLayout(source, same), true);
  assert.equal(sameRosterLayout(source, reordered), false);
});
