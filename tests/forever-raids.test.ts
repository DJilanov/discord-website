import "../scripts/env";
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeCatalog, isForeverWowheadUrl } from "../lib/raids/catalog";
import {
  characterSchema,
  eventSchema,
  storedCharacterSchema,
  signupSchema,
} from "../lib/raids/contracts";
import {
  classes,
  specializationsByClass,
  suggestedRole,
} from "../lib/raids/specializations";
import { raidCommand } from "../lib/raids/commands";
import {
  resolveStart,
  validateEvent,
  seatAvailable,
} from "../lib/raids/policy";
import { canonicalJson, jsonChecksum } from "../lib/raids/json";
import { raidCatalogFixture } from "./fixtures/raid-catalog";
import { raidsEnabled, pilotDiscordIds } from "../lib/raids/config";
import { eventTypes, eventTypeDefinitions } from "../lib/raids/event-types";

test("All seven event variants validate distinct roster presets and legacy requests default to raid", () => {
  const base = {
    requestKey: "00000000-0000-4000-8000-000000000010",
    title: "Synthetic event",
    raidName: "Synthetic activity",
    region: "EU",
    faction: "Alliance",
    ruleset: "PvP",
    localStart: "2035-11-05T19:00",
    durationMinutes: 180,
    signupMinutesBefore: 15,
    reserveMinutesBefore: 15,
    admission: "automatic",
    description: "",
    catalogId: null,
    reserveLimit: 0,
    allowDuplicates: false,
    hardReserves: [],
  };
  assert.deepEqual(
    eventTypes.map((type) => eventTypeDefinitions[type].label),
    [
      "Raid",
      "Dungeon",
      "Battleground",
      "World PVP",
      "Questing",
      "Social event",
      "Other",
    ],
  );
  for (const eventType of eventTypes) {
    const definition = eventTypeDefinitions[eventType];
    const input = eventSchema.parse({
      ...base,
      eventType,
      capacity: definition.capacity,
      roleCaps: definition.roleCaps,
    });
    assert.equal(input.eventType, eventType);
    assert.doesNotThrow(() =>
      validateEvent(input, new Date("2026-10-02T12:00Z")),
    );
    if (eventType !== "raid") {
      for (const change of [
        { catalogId: "catalog" },
        { reserveLimit: 1 },
        { hardReserves: [1] },
        { allowDuplicates: true },
      ])
        assert.throws(
          () =>
            validateEvent(
              { ...input, ...change },
              new Date("2026-10-02T12:00Z"),
            ),
          /only for raid events/,
        );
    }
    if (!definition.combatRoles)
      assert.throws(
        () =>
          validateEvent(
            { ...input, roleCaps: { tank: 1, healer: 0, damage: 0 } },
            new Date("2026-10-02T12:00Z"),
          ),
        /participant capacity/,
      );
  }
  assert.equal(
    eventSchema.parse({
      ...base,
      capacity: 20,
      roleCaps: eventTypeDefinitions.raid.roleCaps,
    }).eventType,
    "raid",
  );
  assert.equal(
    eventSchema.safeParse({
      ...base,
      eventType: "unsupported",
      capacity: 20,
      roleCaps: eventTypeDefinitions.raid.roleCaps,
    }).success,
    false,
  );
  assert.equal(eventTypeDefinitions.dungeon.capacity, 5);
  assert.deepEqual(eventTypeDefinitions.dungeon.roleCaps, {
    tank: 1,
    healer: 1,
    damage: 3,
  });
  assert.equal(eventTypeDefinitions.questing.capacity, 5);
  assert.equal(eventTypeDefinitions.questing.combatRoles, true);
  assert.equal(eventTypeDefinitions.questing.targetLabel, "Quest / zone");
  assert.deepEqual(eventTypeDefinitions.questing.roleCaps, {
    tank: 1,
    healer: 1,
    damage: 3,
  });
  assert.equal(
    seatAvailable(
      [{ id: "1", role: "participant", status: "accepted" }],
      "participant",
      1,
      eventTypeDefinitions.social.roleCaps,
    ),
    false,
  );
  assert.equal(
    seatAvailable([], "participant", 1, eventTypeDefinitions.social.roleCaps),
    true,
  );
});

test("Participant signup accepts a nullable spec while acknowledgement and character remain required", () => {
  assert.equal(
    signupSchema.safeParse({
      acknowledge: true,
      characterId: "character",
      specialization: null,
      role: "participant",
    }).success,
    true,
  );
  assert.equal(
    signupSchema.safeParse({
      acknowledge: false,
      characterId: "character",
      specialization: null,
      role: "participant",
    }).success,
    false,
  );
  assert.equal(
    signupSchema.safeParse({
      acknowledge: true,
      specialization: null,
      role: "participant",
    }).success,
    false,
  );
  const options =
    raidCommand.options.find((command) => command.name === "join")?.options ??
    [];
  let optionalSeen = false;
  for (const option of options) {
    if (!option.required) optionalSeen = true;
    else
      assert.equal(
        optionalSeen,
        false,
        "Discord required options must precede optional ones",
      );
  }
});

test("Forever characters accept full names and normalize spacing and Unicode", () => {
  const input = {
    name: "Dimitar Jilanovw",
    className: "Warrior",
    specialization: "Fury",
    region: "EU",
    faction: "Alliance",
    ruleset: "PvP",
  };
  assert.equal(characterSchema.parse(input).name, input.name);
  for (const [name, expected] of [
    ["  Dimitar   Jilanovw  ", "Dimitar Jilanovw"],
    ["Dimitar\u00a0Jilanovw", "Dimitar Jilanovw"],
    ["E\u0301owyn O'Neil", "\u00c9owyn O'Neil"],
    ["Anne-Marie O'Neil", "Anne-Marie O'Neil"],
    ["Legacyname", "Legacyname"],
    [
      "\u0414\u0438\u043c\u0438\u0442\u044a\u0440 \u0418\u0432\u0430\u043d\u043e\u0432",
      "\u0414\u0438\u043c\u0438\u0442\u044a\u0440 \u0418\u0432\u0430\u043d\u043e\u0432",
    ],
  ])
    assert.equal(characterSchema.parse({ ...input, name }).name, expected);
});
test("Invalid character names get readable feedback instead of a regex", () => {
  for (const name of [
    " ",
    "A",
    "Name123",
    "First Middle Last",
    "First\nLast",
    "First\tLast",
    "<script>alert</script>",
    "First\u0000Last",
    "A".repeat(41),
  ]) {
    const result = characterSchema.safeParse({
      name,
      className: "Warrior",
      specialization: "Fury",
      region: "EU",
      faction: "Alliance",
      ruleset: "PvP",
    });
    assert.equal(result.success, false);
    if (!result.success) {
      assert.ok(result.error.issues.every((issue) => issue.path[0] === "name"));
      assert.ok(
        result.error.issues.every(
          (issue) => !issue.message.includes("pattern"),
        ),
      );
    }
  }
});

test("Forever class/spec validation requires an explicit, matching specialization", () => {
  const base = {
    name: "Test Character",
    region: "EU",
    faction: "Alliance",
    ruleset: "PvP",
  };
  for (const className of classes) {
    for (const specialization of specializationsByClass[className])
      assert.equal(
        characterSchema.safeParse({ ...base, className, specialization })
          .success,
        true,
      );
    assert.equal(
      characterSchema.safeParse({ ...base, className }).success,
      false,
    );
    assert.equal(
      characterSchema.safeParse({ ...base, className, specialization: null })
        .success,
      false,
    );
    assert.equal(
      characterSchema.safeParse({
        ...base,
        className,
        specialization: "Unknown",
      }).success,
      false,
    );
    assert.equal(
      storedCharacterSchema.parse({ ...base, className }).specialization,
      null,
    );
  }
  for (const specialization of ["Holy", "Guardian", "Outlaw", ""])
    assert.equal(
      characterSchema.safeParse({
        ...base,
        className: "Warrior",
        specialization,
      }).success,
      false,
    );
  assert.equal(
    signupSchema.safeParse({
      acknowledge: true,
      characterId: "test",
      role: "damage",
    }).success,
    false,
  );
  assert.equal(suggestedRole("Protection"), "tank");
  assert.equal(suggestedRole("Restoration"), "healer");
  assert.equal(suggestedRole("Feral"), "damage");
  const option = raidCommand.options
    .find((command) => command.name === "join")
    ?.options?.find((field) => field.name === "specialization");
  assert.equal(option?.required, false);
  assert.ok(
    option &&
      "choices" in option &&
      option.choices &&
      option.choices.length <= 25,
  );
});

test("Forever importer rejects foreign namespaces, unsafe URLs and item-ID mismatches", () => {
  for (const url of [
    "https://www.wowhead.com/tbc/item=900001",
    "https://www.wowhead.com/classic/item=900001",
    "http://www.wowhead.com/forever/item=900001",
    "https://www.wowhead.com.evil.invalid/forever/item=900001",
    "https://user@www.wowhead.com/forever/item=900001",
    "https://www.wowhead.com/forever/item=900001?foo=bar",
    "https://www.wowhead.com/forever/%69tem=900001",
    "https://127.0.0.1/forever/item=900001",
  ])
    assert.equal(isForeverWowheadUrl(url, "item"), false);
  assert.throws(() => normalizeCatalog({ ...raidCatalogFixture, game: "tbc" }));
  assert.throws(() =>
    normalizeCatalog({ ...raidCatalogFixture, authorizedSource: false }),
  );
  assert.throws(() =>
    normalizeCatalog({
      ...raidCatalogFixture,
      items: [{ ...raidCatalogFixture.items[0], itemId: 5 }],
    }),
  );
  assert.throws(() =>
    normalizeCatalog({
      ...raidCatalogFixture,
      items: [raidCatalogFixture.items[0], raidCatalogFixture.items[0]],
    }),
  );
  assert.throws(() =>
    normalizeCatalog({
      ...raidCatalogFixture,
      items: [{ ...raidCatalogFixture.items[0], evidence: "client_observed" }],
    }),
  );
});
test("Catalog identity is stable across item/class order and capture timestamps", () => {
  const original = normalizeCatalog(raidCatalogFixture);
  const reordered = normalizeCatalog({
    ...raidCatalogFixture,
    capturedAt: "2026-02-01T12:00:00Z",
    items: [...raidCatalogFixture.items]
      .reverse()
      .map((item) => ({ ...item, classes: [...item.classes].reverse() })),
  });
  assert.equal(original.checksum, reordered.checksum);
  assert.match(original.warnings.join(" "), /Partial catalog/);
  assert.equal(original.bundle.clientBuild, null);
});
test("EU and NA times honor DST and reject nonexistent or ambiguous local times", () => {
  assert.equal(
    resolveStart("2026-11-05T07:30", "EU").toISOString(),
    "2026-11-05T06:30:00.000Z",
  );
  assert.equal(
    resolveStart("2026-07-05T07:30", "EU").toISOString(),
    "2026-07-05T05:30:00.000Z",
  );
  assert.equal(
    resolveStart("2026-11-05T07:30", "NA").toISOString(),
    "2026-11-05T12:30:00.000Z",
  );
  for (const [date, region] of [
    ["2026-03-29T02:30", "EU"],
    ["2026-10-25T02:30", "EU"],
    ["2026-03-08T02:30", "NA"],
    ["2026-11-01T01:30", "NA"],
    ["2026-02-30T12:00", "EU"],
  ])
    assert.throws(() => resolveStart(date, region));
});
test("Future phase planning has no thirty-day cap; invalid quotas and missing catalogs fail", () => {
  const input = eventSchema.parse({
    requestKey: "00000000-0000-4000-8000-000000000001",
    title: "Future phase",
    raidName: "Planning raid",
    region: "EU",
    faction: "Alliance",
    ruleset: "PvP",
    localStart: "2028-11-05T19:00",
    durationMinutes: 180,
    signupMinutesBefore: 15,
    reserveMinutesBefore: 60,
    capacity: 20,
    roleCaps: { tank: 2, healer: 4, damage: 14 },
    admission: "approval",
    description: "",
    catalogId: null,
    reserveLimit: 0,
    allowDuplicates: false,
    hardReserves: [],
  });
  assert.equal(
    validateEvent(input, new Date("2026-10-02T12:00Z")).startsAt.toISOString(),
    "2028-11-05T18:00:00.000Z",
  );
  assert.throws(() =>
    validateEvent({ ...input, reserveLimit: 2 }, new Date("2026-10-02T12:00Z")),
  );
  assert.throws(() =>
    validateEvent(
      { ...input, roleCaps: { tank: 1, healer: 1, damage: 1 } },
      new Date("2026-10-02T12:00Z"),
    ),
  );
  assert.equal(
    seatAvailable([{ id: "1", role: "tank", status: "accepted" }], "tank", 2, {
      tank: 1,
      healer: 1,
      damage: 1,
    }),
    false,
  );
});
test("Snapshot checksum survives PostgreSQL JSONB key reordering", () => {
  assert.equal(
    jsonChecksum({ policy: { z: 1, a: 2 }, roster: ["One"] }),
    jsonChecksum({ roster: ["One"], policy: { a: 2, z: 1 } }),
  );
  assert.equal(canonicalJson({ b: 2, a: 1 }), '{"a":1,"b":2}');
});
test("Pilot fails closed on disabled, empty, invalid and oversized allowlists", () => {
  const enabled = process.env.FOREVER_RAIDS_ENABLED,
    ids = process.env.FOREVER_RAIDS_PILOT_DISCORD_IDS;
  try {
    process.env.FOREVER_RAIDS_ENABLED = "true";
    for (const value of [
      "",
      "invalid",
      Array.from({ length: 101 }, () => "1556000000000000001").join(","),
    ]) {
      process.env.FOREVER_RAIDS_PILOT_DISCORD_IDS = value;
      assert.equal(raidsEnabled(), false);
    }
    process.env.FOREVER_RAIDS_PILOT_DISCORD_IDS =
      "1556000000000000001,1556000000000000001";
    assert.equal(raidsEnabled(), true);
    assert.equal(pilotDiscordIds().length, 1);
    process.env.FOREVER_RAIDS_ENABLED = "false";
    assert.equal(raidsEnabled(), false);
  } finally {
    if (enabled === undefined) delete process.env.FOREVER_RAIDS_ENABLED;
    else process.env.FOREVER_RAIDS_ENABLED = enabled;
    if (ids === undefined) delete process.env.FOREVER_RAIDS_PILOT_DISCORD_IDS;
    else process.env.FOREVER_RAIDS_PILOT_DISCORD_IDS = ids;
  }
});
