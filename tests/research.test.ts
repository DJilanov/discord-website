import assert from "node:assert/strict";
import { after, test } from "node:test";

import { db } from "../lib/db";
import { buildRecruitmentCensus } from "../lib/research";

after(async (): Promise<void> => {
  await db.$disconnect();
});

test("recruitment census aggregates demand and suppresses tiny cells", () => {
  const now = new Date("2026-10-04T12:00:00.000Z");
  const census = buildRecruitmentCensus(
    [
      guild(["Warrior", "Priest"], "EU", "Alliance", now),
      guild(["Warrior"], "EU", "Horde", now),
      guild(
        ["Warrior"],
        "EU",
        "Alliance",
        new Date("2026-01-01T00:00:00.000Z"),
      ),
    ],
    now,
  );

  assert.equal(census.totalListings, 3);
  assert.equal(census.recentlyVerifiedListings, 2);
  assert.equal(census.dataAsOf, now.toISOString());
  assert.deepEqual(census.classDemand, [
    { label: "Warrior", count: 3 },
    { label: "Priest", count: null },
  ]);
  assert.deepEqual(census.regions, [{ label: "EU", count: 3 }]);
  assert.match(census.limitation, /advertised/i);
});

function guild(
  recruitingClasses: readonly string[],
  region: string,
  faction: string,
  updatedAt: Date,
) {
  return {
    recruitingClasses,
    region,
    faction,
    gameRuleset: "Normal",
    raidDays: ["Tuesday"],
    lastVerifiedAt: null,
    updatedAt,
  };
}
