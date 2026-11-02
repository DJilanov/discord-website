import { test } from "node:test";
import assert from "node:assert/strict";
import {
  eventActionSchema,
  eventSettingsSchema,
  eventSchema,
  policyAcknowledgementSchema,
} from "../lib/raids/contracts";
import { eventPolicyChecksum } from "../lib/raids/event-policy";
import { jsonChecksum } from "../lib/raids/json";
import { localRaidStart } from "../lib/raids/time";
import { classes, specializationsByClass } from "../lib/raids/specializations";
import { eventCreationHash } from "../lib/raids/event-request";
import { createHash } from "node:crypto";

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

test("Leadership accepts bounded single-line names and preserves omitted edit fields", (): void => {
  const parsed = eventSettingsSchema.parse({
    ...settings,
    leaderName: " Psyrogue ",
    assistantName: " DJ ",
  });
  assert.equal(parsed.leaderName, "Psyrogue");
  assert.equal(parsed.assistantName, "DJ");
  assert.equal(eventSettingsSchema.parse(settings).assistantName, undefined);
  assert.equal(
    eventSettingsSchema.parse({ ...settings, assistantName: "" }).assistantName,
    "",
  );
  for (const name of ["a".repeat(81), "DJ\nadmin", "DJ\u0000", "DJ\tadmin"])
    for (const field of ["leaderName", "assistantName"])
      assert.equal(
        eventSettingsSchema.safeParse({ ...settings, [field]: name }).success,
        false,
      );
});

test("Empty leadership defaults retain legacy retry hashes; supplied names are part of creation identity", (): void => {
  const input = eventSchema.parse({
    ...settings,
    game: "forever",
    realm: "",
    requestKey: "00000000-0000-4000-8000-000000000001",
  });
  const {
    eventType,
    game,
    realm,
    discordChannelId,
    confirmDiscordPublication,
    leaderName,
    assistantName,
    ...legacy
  } = input;
  assert.equal(eventType, "raid");
  assert.equal(game, "forever");
  assert.equal(realm, "");
  assert.equal(discordChannelId, null);
  assert.equal(confirmDiscordPublication, false);
  assert.equal(leaderName, "");
  assert.equal(assistantName, "");
  assert.equal(
    eventCreationHash(input),
    createHash("sha256").update(JSON.stringify(legacy)).digest("hex"),
  );
  assert.notEqual(
    eventCreationHash({ ...input, assistantName: "DJ" }),
    eventCreationHash(input),
  );
});

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

test("Organizer character edits accept only matching class/spec pairs and explicit reserve consent", () => {
  const input = {
    action: "edit_signup_character",
    version: 3,
    signupId: "signup-1",
    character: { className: "Druid", specialization: "Feral" },
  };
  for (const className of classes)
    for (const specialization of specializationsByClass[className]) {
      const parsed = eventActionSchema.parse({
        ...input,
        character: { className, specialization },
      });
      assert.equal(parsed.action, "edit_signup_character");
      assert.equal(parsed.character.clearReserves, false);
    }
  assert.equal(
    eventActionSchema.safeParse({
      ...input,
      character: { className: "Paladin", specialization: "Feral" },
    }).success,
    false,
  );
  for (const specialization of [null, "", "unknown"])
    assert.equal(
      eventActionSchema.safeParse({
        ...input,
        character: { ...input.character, specialization },
      }).success,
      false,
    );
  for (const version of [0, -1, 1.5, "3"])
    assert.equal(
      eventActionSchema.safeParse({ ...input, version }).success,
      false,
    );
  for (const field of [
    "role",
    "status",
    "memberId",
    "characterId",
    "partyIndex",
    "name",
  ])
    assert.equal(
      eventActionSchema.safeParse({
        ...input,
        character: { ...input.character, [field]: "injected" },
      }).success,
      false,
    );
  assert.equal(
    eventActionSchema.safeParse({ ...input, organizerId: "injected" }).success,
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
