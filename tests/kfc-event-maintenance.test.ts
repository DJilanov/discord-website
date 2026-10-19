import assert from "node:assert/strict";
import { test } from "node:test";
import {
  foreverGuildId,
  kfcGuildId,
  scheduledEventBindings,
} from "../content/kfc-community";
import {
  kfcCalendarContent,
  scheduledEventPatch,
  type ScheduledEvent,
  type CanonicalScheduledEvent,
} from "../lib/kfc-event-maintenance";
const now = new Date("2026-10-09T12:00:00Z");
const binding = scheduledEventBindings[0];
const kfcProjection = binding.projections[0];
const foreverProjection = binding.projections[1];
function canonical(): CanonicalScheduledEvent {
  return {
    id: binding.eventId,
    title: "Group leveling",
    startsAt: new Date("2026-11-05T07:30:00Z"),
    endsAt: new Date("2026-11-05T19:30:00Z"),
    status: "open",
    version: 10,
  };
}
function native(
  projection: (typeof binding.projections)[number] = kfcProjection,
): ScheduledEvent {
  return {
    id: projection.scheduledId,
    guild_id: projection.guildId,
    name: "Old title",
    scheduled_start_time: "2026-11-05T07:30:00+00:00",
    scheduled_end_time: "2026-11-05T08:30:00Z",
    entity_type: 3,
    status: 1,
    channel_id: null,
  };
}
test("Scheduled sync changes only the mismatched title/end and preserves equivalent start timestamps", (): void => {
  assert.deepEqual(
    scheduledEventPatch(canonical(), native(), kfcProjection, now),
    {
      name: "Group leveling",
      scheduled_end_time: "2026-11-05T19:30:00.000Z",
    },
  );
});
test("Repeated scheduled sync is a no-op", (): void => {
  const source = canonical(),
    before = native(),
    patch = scheduledEventPatch(source, before, kfcProjection, now)!;
  assert.equal(
    scheduledEventPatch(source, { ...before, ...patch }, kfcProjection, now),
    null,
  );
});
test("Both approved guild projections use the same canonical schedule", (): void => {
  const source = canonical();
  for (const projection of [kfcProjection, foreverProjection])
    assert.deepEqual(
      scheduledEventPatch(source, native(projection), projection, now),
      {
        name: "Group leveling",
        scheduled_end_time: "2026-11-05T19:30:00.000Z",
      },
    );
  assert.equal(foreverProjection.guildId, foreverGuildId);
  assert.equal(kfcProjection.guildId, kfcGuildId);
});
test("Cancellation does not recreate or reactivate completed/active/deleted events", (): void => {
  const source = { ...canonical(), status: "cancelled" };
  assert.deepEqual(scheduledEventPatch(source, native(), kfcProjection, now), {
    status: 4,
  });
  for (const status of [2, 3, 4])
    assert.equal(
      scheduledEventPatch(source, { ...native(), status }, kfcProjection, now),
      null,
    );
});
test("Scheduled sync refuses unapproved identities, voice conversion and invalid source times", (): void => {
  assert.throws(() =>
    scheduledEventPatch(
      { ...canonical(), id: "some-other-event" },
      native(),
      kfcProjection,
      now,
    ),
  );
  assert.throws(() =>
    scheduledEventPatch(
      canonical(),
      { ...native(), entity_type: 2 },
      kfcProjection,
      now,
    ),
  );
  assert.throws(() =>
    scheduledEventPatch(
      canonical(),
      { ...native(), channel_id: kfcGuildId },
      kfcProjection,
      now,
    ),
  );
  assert.throws(() =>
    scheduledEventPatch(
      { ...canonical(), endsAt: new Date("invalid") },
      native(),
      kfcProjection,
      now,
    ),
  );
  assert.throws(() =>
    scheduledEventPatch(
      canonical(),
      native(foreverProjection),
      kfcProjection,
      now,
    ),
  );
  assert.equal(
    scheduledEventPatch(
      canonical(),
      native(),
      kfcProjection,
      new Date("2026-11-06T00:00:00Z"),
    ),
    null,
  );
});
test("Calendar uses local-rendering timestamps, canonical links and no fixed timezone claims", (): void => {
  const event = canonical();
  const content = kfcCalendarContent(
    [
      {
        title: event.title,
        game: "forever",
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        url: `https://www.wowforeverdiscord.online/raids/${event.id}`,
      },
    ],
    now,
  );
  assert.match(content, /<t:\d+:F>/);
  assert.match(content, /<t:\d+:t>/);
  assert.ok(content.includes(`/raids/${event.id}`));
  assert.ok(content.includes("Signup is separate from Interested"));
  assert.ok(content.includes("WoW Forever - <t:"));
  assert.ok(!content.includes("UTC"));
});
test("Calendar omits past groups and duplicates without inventing activity", (): void => {
  const event = canonical(),
    entry = {
      title: event.title,
      game: "forever" as const,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      url: `https://www.wowforeverdiscord.online/raids/${event.id}`,
    };
  const content = kfcCalendarContent([entry, entry], now);
  assert.equal(content.split("**[Group leveling]").length - 1, 1);
  assert.match(
    kfcCalendarContent([entry], new Date("2026-11-06T00:00:00Z")),
    /No upcoming runs/,
  );
});
test("Calendar caps its message budget and refuses unapproved links", (): void => {
  const entries = Array.from({ length: 100 }, (_, i) => ({
    title: "A".repeat(100),
    game: "tbc" as const,
    startsAt: new Date(now.getTime() + 86400000),
    endsAt: null,
    url: `https://discord.com/events/${kfcGuildId}/${1556000000000000000n + BigInt(i)}`,
  }));
  assert.ok(kfcCalendarContent(entries, now).length <= 2000);
  assert.throws(() =>
    kfcCalendarContent(
      [{ ...entries[0], url: "https://evil.example/raid" }],
      now,
    ),
  );
  assert.throws(() =>
    kfcCalendarContent(
      [{ ...entries[0], url: "https://discord.com/events/123?token=secret" }],
      now,
    ),
  );
});
test("Shared calendar distinguishes both editions without guessing unknown event games", (): void => {
  const entries = (["tbc", "forever", null] as const).map((game, i) => ({
    game,
    title: "Host group",
    startsAt: canonical().startsAt,
    endsAt: canonical().endsAt,
    url: `https://discord.com/events/${kfcGuildId}/${1556000000000000000n + BigInt(i)}`,
  }));
  const content = kfcCalendarContent(entries, now);
  for (const label of ["TBC", "WoW Forever", "Check game edition"])
    assert.ok(content.includes(`${label} - <t:`));
});
