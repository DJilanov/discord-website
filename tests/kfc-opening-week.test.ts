import assert from "node:assert/strict";
import { test } from "node:test";
import {
  foreverOpeningRaids,
  foreverRaidLootPolicy,
  openingRaidDescription,
} from "../content/kfc-forever-opening-week";
import { raidPresets } from "../lib/raids/games";
import { guildRaidRulesUrl } from "../lib/raids/loot-policy";

const policyUrl =
  "https://discord.com/channels/1411533815356194968/1411570010534449173/1566000000000000999";

test("Opening week has exactly the owner's eight unique slots and correct 10/20/40 capacities", (): void => {
  assert.equal(foreverOpeningRaids.length, 8);
  assert.equal(new Set(foreverOpeningRaids.map((raid) => raid.key)).size, 8);
  assert.deepEqual(
    foreverOpeningRaids.map((raid) => [
      raid.localStart,
      raid.capacity,
      raid.leader,
    ]),
    [
      ["2026-12-10T20:00", 10, "DJ"],
      ["2026-12-11T11:00", 10, "DJ"],
      ["2026-12-11T20:00", 20, "DJ"],
      ["2026-12-12T20:00", 10, "Psy"],
      ["2026-12-13T20:00", 20, "Psy"],
      ["2026-12-14T11:00", 40, "DJ"],
      ["2026-12-14T11:30", 20, "DJ"],
      ["2026-12-14T20:00", 40, "Psy"],
    ],
  );
  for (const raid of foreverOpeningRaids)
    assert.equal(
      raidPresets.forever.find((preset) => preset.name === raid.raidName)!
        .capacity,
      raid.capacity,
    );
  assert.equal(
    foreverOpeningRaids.filter((raid) => raid.assistant === "Vargos").length,
    3,
  );
  assert.ok(
    foreverOpeningRaids.every(
      (raid) => raid.morning === (raid.assistant === "Vargos"),
    ),
  );
  for (const raid of foreverOpeningRaids.filter(
    (entry) => entry.leader === "Psy",
  ))
    assert.equal(raid.assistant, "DJ");
  for (const preset of raidPresets.forever)
    assert.equal(
      Object.values(preset.roleCaps).reduce((sum, count) => sum + count, 0),
      preset.capacity,
    );
});
test("Morning Hyjal starts at 11:30 CET after the 30-minute Onyxia slot", (): void => {
  for (const raid of foreverOpeningRaids)
    assert.equal(
      raid.durationMinutes,
      raid.raidName === "Onyxia's Lair" ? 30 : 120,
    );
  const onyxia = foreverOpeningRaids.find(
    (raid) => raid.key === "2026-12-14-onyxia-morning",
  )!;
  const hyjal = foreverOpeningRaids.find(
    (raid) => raid.key === "2026-12-14-hyjal-morning",
  )!;
  const end =
    Date.parse(`${onyxia.localStart}+01:00`) + onyxia.durationMinutes * 60000;
  assert.equal(Date.parse(`${hyjal.localStart}+01:00`), end);
  assert.match(onyxia.introduction, /Hyjal follows at 11:30 CET/);
  assert.doesNotMatch(onyxia.introduction, /at noon/);
});
test("Only semi-hardcore descriptions carry the arena joke, full pre-BiS and 95+ goal", (): void => {
  for (const raid of foreverOpeningRaids) {
    const description = openingRaidDescription(raid, policyUrl);
    assert.ok(description.length <= 3000);
    assert.equal(
      description.includes("DJ’s arena team"),
      raid.pace === "Semi-hardcore",
    );
    assert.equal(
      description.includes("full pre-BiS"),
      raid.pace === "Semi-hardcore",
    );
    assert.equal(description.includes("95+"), raid.pace === "Semi-hardcore");
    assert.equal(
      description.includes("reputation epics"),
      raid.pace === "Semi-hardcore",
    );
    assert.equal(
      description.includes("two simultaneous 10-player Barrow Deeps groups"),
      raid.pace === "Semi-hardcore",
    );
    assert.equal(
      description.includes("shared 40-player Onyxia run with the casual group"),
      raid.pace === "Semi-hardcore",
    );
    assert.ok(description.includes(policyUrl));
    assert.match(description, /raid leader selects the final roster/);
    assert.match(description, /KFC guild members have priority over PUGs/);
    assert.match(description, /regular raiders are encouraged to join KFC/);
    assert.doesNotMatch(description, /Guild nickname|Keep your current guild/);
  }
});
test("Each event links one shared rule post without duplicating the long guild resource explanation", (): void => {
  for (const raid of foreverOpeningRaids) {
    const description = openingRaidDescription(raid, policyUrl);
    assert.equal(description.split(policyUrl).length - 1, 1);
    assert.ok(!description.includes("network of active crafters"));
    assert.match(description, /after patch datamining and before the raid/);
  }
});
test("Canonical rules explain guild resource use, preserve MS > OS and defer unknown item declarations", (): void => {
  const text = JSON.stringify(foreverRaidLootPolicy);
  assert.match(text, /activity/);
  assert.match(text, /crafter online/);
  assert.match(text, /disenchanted/);
  assert.match(text, /resistance sets and tank preparation/);
  assert.match(text, /One item per run/);
  assert.match(text, /MS > OS/);
  assert.match(text, /will be published after patch datamining/);
  assert.match(text, /raid leader's approval in advance/);
  assert.ok(
    foreverRaidLootPolicy.fields.every((field) => field.value.length <= 1024),
  );
  assert.ok(text.length < 6000);
});
test("Rule links are limited to the public KFC raid policy channel", (): void => {
  assert.equal(
    guildRaidRulesUrl(`Rules: [Read them](${policyUrl})`),
    policyUrl,
  );
  assert.equal(
    guildRaidRulesUrl(policyUrl.replace("discord.com", "example.com")),
    null,
  );
  assert.equal(
    guildRaidRulesUrl(
      policyUrl.replace("1411570010534449173", "1411564696644882552"),
    ),
    null,
  );
});
