import assert from "node:assert/strict";
import { test } from "node:test";
import { mapRecordedTalents } from "../lib/simulation-talents";

test("an empty first tree and explicit model/client tree-name aliases preserve all 51 ranks", () => {
  const talents = Array.from({ length: 11 }, (_, index) => ({
    name: `Talent ${index}`,
    maxPoints: 5,
    location: { rowIdx: Math.floor(index / 4), colIdx: index % 4 },
  }));
  const trees = [
    { name: "One", talents: [] },
    { name: "Shadow Magic", talents },
    { name: "Three", talents: [] },
  ];
  const client = [
    { name: "One", talents: [] },
    {
      name: "Shadow",
      talents: talents.map((talent) => ({
        name: talent.name,
        max: 5,
        icon: "icon",
        desc: ["rank1", "rank2", "rank3", "rank4", "rank5"],
        confirmed: [1, 2, 3, 4, 5],
      })),
    },
    { name: "Three", talents: [] },
  ];
  const selected = mapRecordedTalents("-55555555551", trees, client);
  assert.equal(
    selected.reduce((sum, talent) => sum + talent.rank, 0),
    51,
  );
  assert.equal(selected[0].description, "rank5");
  assert.equal(selected.at(-1)?.description, "rank1");
});

test("talent mapping rejects stale tree shapes, unavailable ranks and incomplete allocations", () => {
  const trees = [
    {
      name: "One",
      talents: [
        {
          name: "A",
          maxPoints: 5,
          icon: "a",
          location: { rowIdx: 0, colIdx: 0 },
        },
      ],
    },
    { name: "Two", talents: [] },
    { name: "Three", talents: [] },
  ];
  const client = [
    {
      name: "One",
      talents: [
        { name: "A", max: 5, icon: "a", desc: ["one"], confirmed: [1] },
      ],
    },
    { name: "Two", talents: [] },
    { name: "Three", talents: [] },
  ];
  for (const allocation of ["1", "51", "6", "abc", "1-1"])
    assert.throws(() => mapRecordedTalents(allocation, trees, client));
});
