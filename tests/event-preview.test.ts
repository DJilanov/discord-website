import { test } from "node:test";
import assert from "node:assert/strict";
import type { SignupRole, SignupView } from "../lib/raids/contracts";
import {
  eventDurationLabel,
  summarizeEventRoster,
} from "../lib/raids/event-preview";

function signup(
  id: string,
  status: string,
  role: SignupRole = "damage",
): SignupView {
  return {
    id,
    status,
    role,
    isMine: false,
    reserves: [],
    character: {
      game: "forever",
      realm: "",
      name: "Preview Hero",
      className: "Warrior",
      specialization: "Fury",
      region: "EU",
      faction: "Alliance",
      ruleset: "PvP",
    },
  };
}
const partyCaps = { tank: 1, healer: 1, damage: 3 };

test("Registered, pending and benched signups do not consume confirmed places", () => {
  const summary = summarizeEventRoster(
    [
      signup("confirmed", "accepted", "tank"),
      signup("registered", "registered"),
      signup("pending", "pending"),
      signup("bench", "bench"),
      signup("withdrawn", "withdrawn"),
    ],
    5,
    partyCaps,
    true,
  );
  assert.equal(summary.confirmed.length, 1);
  assert.equal(summary.registered.length, 1);
  assert.equal(summary.pending.length, 1);
  assert.equal(summary.bench.length, 1);
  assert.equal(summary.available, 4);
  assert.equal(summary.fixedSmallGroup, true);
  assert.deepEqual(
    summary.groups.map((group) => group.openPlaces),
    [0, 1, 3],
  );
});
test("Five-person parties expose exactly five confirmed or open slots", () => {
  const empty = summarizeEventRoster([], 5, partyCaps, true);
  assert.equal(
    empty.groups.reduce((total, group) => total + group.openPlaces, 0),
    5,
  );
  const full = summarizeEventRoster(
    [
      signup("tank", "accepted", "tank"),
      signup("healer", "accepted", "healer"),
      ...[1, 2, 3].map((id) => signup(`damage-${id}`, "accepted")),
    ],
    5,
    partyCaps,
    true,
  );
  assert.equal(full.available, 0);
  assert.ok(full.groups.every((group) => group.openPlaces === 0));
});
test("Role ceilings do not become invented fixed positions for larger or flexible groups", () => {
  assert.equal(
    summarizeEventRoster([], 5, { tank: 2, healer: 2, damage: 5 }, true)
      .fixedSmallGroup,
    false,
  );
  const raid = summarizeEventRoster(
    [signup("tank", "accepted", "tank")],
    25,
    { tank: 3, healer: 6, damage: 16 },
    true,
  );
  assert.equal(raid.fixedSmallGroup, false);
  assert.equal(raid.available, 24);
  assert.equal(raid.groups[0].signups[0].id, "tank");
});
test("Social events use participants rather than combat-role slots", () => {
  const summary = summarizeEventRoster(
    [signup("attendee", "accepted", "participant")],
    20,
    { tank: 0, healer: 0, damage: 0 },
    false,
  );
  assert.equal(summary.fixedSmallGroup, false);
  assert.equal(summary.groups.length, 1);
  assert.equal(summary.groups[0].role, "participant");
  assert.equal(summary.groups[0].openPlaces, 19);
});
test("Availability stays nonnegative even if stored counts exceed a limit", () => {
  const summary = summarizeEventRoster(
    [signup("one", "accepted"), signup("two", "accepted")],
    1,
    { tank: 0, healer: 0, damage: 1 },
    true,
  );
  assert.equal(summary.available, 0);
  assert.ok(summary.groups.every((group) => group.openPlaces === 0));
});
test("Event durations are compact and use elapsed time rather than timezone labels", () => {
  assert.equal(
    eventDurationLabel("2026-11-05T07:30:00Z", "2026-11-05T10:00:00Z"),
    "2h 30m",
  );
  assert.equal(
    eventDurationLabel("2026-11-05T07:30:00Z", "2026-11-05T08:00:00Z"),
    "30m",
  );
  assert.equal(
    eventDurationLabel("2026-11-05T07:30:00Z", "2026-11-05T10:30:00Z"),
    "3h",
  );
  for (const end of ["invalid", "2026-11-05T07:30:00Z", "2026-11-05T06:30:00Z"])
    assert.equal(
      eventDurationLabel("2026-11-05T07:30:00Z", end),
      "Duration unavailable",
    );
});
