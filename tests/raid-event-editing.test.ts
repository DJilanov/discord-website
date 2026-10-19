import { test } from "node:test";
import assert from "node:assert/strict";
import {
  eventActionSchema,
  eventSettingsSchema,
  policyAcknowledgementSchema,
} from "../lib/raids/contracts";
import { eventPolicyChecksum } from "../lib/raids/event-policy";
import { jsonChecksum } from "../lib/raids/json";
import { localRaidStart } from "../lib/raids/time";

const settings = {
  game: "tbc",
  realm: "Spineshatter",
  eventType: "raid",
  title: "Editable raid",
  raidName: "Black Temple",
  region: "EU",
  faction: "Alliance",
  ruleset: "PvP",
  localStart: "2035-11-05T19:00",
  durationMinutes: 180,
  signupMinutesBefore: 15,
  reserveMinutesBefore: 15,
  capacity: 25,
  roleCaps: { tank: 3, healer: 6, damage: 16 },
  admission: "open",
  description: "Updated event",
  catalogId: null,
  reserveLimit: 0,
  reserveLimits: null,
  allowDuplicates: false,
  hardReserves: [],
};

test("Preview edit contracts allow event settings but never creator, audience or channel injection", () => {
  const result = eventActionSchema.parse({
    action: "edit",
    version: 3,
    settings,
  });
  assert.equal(result.action, "edit");
  if (result.action === "edit")
    assert.equal(result.settings.realm, "spineshatter");
  for (const field of [
    "requestKey",
    "discordChannelId",
    "confirmDiscordPublication",
    "organizerId",
    "audience",
    "policyRevision",
  ])
    assert.equal(
      eventSettingsSchema.safeParse({ ...settings, [field]: "injected" })
        .success,
      false,
    );
  assert.equal(
    eventSettingsSchema.safeParse({ ...settings, realm: "" }).success,
    false,
  );
  assert.equal(
    eventSettingsSchema.safeParse({ ...settings, game: "forever" }).success,
    false,
  );
});

test("Party layout actions require bounded, explicit roster positions", () => {
  const result = eventActionSchema.parse({
    action: "set_roster_layout",
    version: 4,
    assignments: [
      { signupId: "signup-1", partyIndex: 0, slotIndex: 0 },
      { signupId: "signup-2", partyIndex: 1, slotIndex: 4 },
    ],
  });
  assert.equal(result.action, "set_roster_layout");
  assert.equal(result.assignments.length, 2);
  assert.equal(
    eventActionSchema.safeParse({
      action: "set_roster_layout",
      version: 4,
      assignments: [{ signupId: "signup-1", partyIndex: 0, slotIndex: 5 }],
    }).success,
    false,
  );
});

test("Policy revisions invalidate confirmations without invalidating untouched legacy events", () => {
  const legacy = {
    requestHash: "original request",
    policyRevision: 0,
    catalog: { checksum: "original loot" },
  };
  assert.equal(
    eventPolicyChecksum(legacy),
    jsonChecksum({
      requestHash: legacy.requestHash,
      catalogChecksum: "original loot",
    }),
  );
  assert.notEqual(
    eventPolicyChecksum(legacy),
    eventPolicyChecksum({ ...legacy, policyRevision: 1 }),
  );
  assert.notEqual(
    eventPolicyChecksum({ ...legacy, policyRevision: 1 }),
    eventPolicyChecksum({ ...legacy, policyRevision: 2 }),
  );
  assert.equal(
    policyAcknowledgementSchema.safeParse({ acknowledge: true }).success,
    false,
  );
  assert.equal(
    policyAcknowledgementSchema.safeParse({
      acknowledge: false,
      policyChecksum: "a".repeat(64),
    }).success,
    false,
  );
});

test("Editing local time round-trips regional clocks without browser timezone conversion", () => {
  assert.equal(
    localRaidStart("2026-11-05T18:00:00.000Z", "EU"),
    "2026-11-05T19:00",
  );
  assert.equal(
    localRaidStart("2026-07-05T17:00:00.000Z", "EU"),
    "2026-07-05T19:00",
  );
  assert.equal(
    localRaidStart("2026-11-05T18:00:00.000Z", "NA"),
    "2026-11-05T13:00",
  );
  assert.equal(
    localRaidStart("2026-07-05T17:00:00.000Z", "NA"),
    "2026-07-05T13:00",
  );
});
