import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseRaidHelperExport,
  raidHelperSuggestion,
  signupImportRequestSchema,
  SIGNUP_IMPORT_MAX_BYTES,
} from "../lib/raids/signup-import";
import { raidHelperFixture } from "./fixtures/raid-helper";

test("Raid-Helper import recognizes the legacy tank/spec/role aliases without guessing character names", () => {
  assert.deepEqual(raidHelperSuggestion(raidHelperFixture.signUps[0]), {
    name: "Organizer",
    className: "Warrior",
    specialization: "Protection",
    role: "tank",
    attendance: "joining",
  });
  assert.equal(
    raidHelperSuggestion(raidHelperFixture.signUps[1]).specialization,
    "Restoration",
  );
  assert.equal(raidHelperSuggestion(raidHelperFixture.signUps[3]).name, "");
  const tank = raidHelperFixture.signUps[0];
  assert.equal(
    raidHelperSuggestion({ ...tank, specName: "Protection1" }).className,
    "Paladin",
  );
  assert.deepEqual(
    raidHelperSuggestion({ ...tank, specName: "Guardian" }).specialization,
    "Feral",
  );
  assert.equal(
    raidHelperSuggestion({ ...tank, specName: "Unknown" }).className,
    null,
  );
  assert.equal(
    raidHelperSuggestion({ ...tank, className: "Priest", specName: "Smite" })
      .specialization,
    null,
  );
});
test("Raid-Helper import preserves bench, tentative, absence and late intent", () => {
  const row = raidHelperFixture.signUps[0];
  for (const [className, attendance] of [
    ["Bench", "bench"],
    ["Tentative", "tentative"],
    ["Absence", "absent"],
    ["Late", "joining"],
  ])
    assert.equal(
      raidHelperSuggestion({ ...row, className }).attendance,
      attendance,
    );
});
test("Raid-Helper parsing is bounded, rejects invalid/duplicate identities and discards unrelated settings", () => {
  const source = parseRaidHelperExport(
    JSON.stringify({
      ...raidHelperFixture,
      advancedSettings: { private: "not imported" },
    }),
  );
  assert.deepEqual(source, raidHelperFixture);
  assert.equal(parseRaidHelperExport("not json"), null);
  assert.equal(
    parseRaidHelperExport(
      JSON.stringify({
        ...raidHelperFixture,
        signUps: [raidHelperFixture.signUps[0], raidHelperFixture.signUps[0]],
      }),
    ),
    null,
  );
  assert.equal(
    parseRaidHelperExport(
      JSON.stringify({
        ...raidHelperFixture,
        signUps: [{ ...raidHelperFixture.signUps[0], userId: "invalid" }],
      }),
    ),
    null,
  );
  assert.equal(
    parseRaidHelperExport(" ".repeat(SIGNUP_IMPORT_MAX_BYTES + 1)),
    null,
  );
  assert.equal(
    signupImportRequestSchema.safeParse({
      source: "{}",
      version: 1,
      requestKey: "not uuid",
      confirm: false,
      selections: [],
    }).success,
    false,
  );
});
