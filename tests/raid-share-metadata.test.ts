import assert from "node:assert/strict";
import { test } from "node:test";
import {
  raidShareMetadata,
  type RaidShareEvent,
} from "../lib/raids/share-metadata";
import { SITE_URL } from "../lib/config";

const event: RaidShareEvent = {
  id: "cmvy07lb500000m4sbok6tgqq",
  title: "5th November power leveling — Psyrogue group",
  game: "forever",
  eventType: "questing",
  raidName: "Northshire",
  region: "EU",
  faction: "Alliance",
  ruleset: "PvP",
  startsAt: new Date("2026-11-05T07:30:00Z"),
  capacity: 5,
};

test("signup sharing uses the public event and its correct regional time and artwork", () => {
  const metadata = raidShareMetadata(event, "signup");
  assert.deepEqual(metadata.title, { absolute: `${event.title} · Sign up` });
  assert.equal(metadata.openGraph?.title, `${event.title} · Sign up`);
  assert.equal(metadata.twitter?.title, `${event.title} · Sign up`);
  assert.match(metadata.description!, /5 Nov 2026, 08:30/);
  assert.match(metadata.description!, /Central Europe \(UTC\+1\)/);
  assert.match(metadata.description!, /5 players/);
  assert.equal(metadata.openGraph?.url, `${SITE_URL}/raids/${event.id}`);
  assert.match(JSON.stringify(metadata.openGraph?.images), /questing/);
  assert.deepEqual(metadata.robots, { index: false, follow: false });
});

test("soft reserve links have their own title, destination and loot action", () => {
  const metadata = raidShareMetadata(
    {
      ...event,
      title: "Friday Hyjal",
      eventType: "raid",
      raidName: "Hyjal Summit",
      capacity: 20,
    },
    "reserves",
  );
  assert.equal(metadata.openGraph?.title, "Friday Hyjal · Soft reserves");
  assert.equal(
    metadata.openGraph?.url,
    `${SITE_URL}/raids/${event.id}/reserves`,
  );
  assert.match(metadata.description!, /Browse loot, review the reserve limits/);
  assert.match(JSON.stringify(metadata.openGraph?.images), /hyjal-summit/);
});

test("TBC raid sharing uses TBC artwork and edition instead of Forever defaults", () => {
  const metadata = raidShareMetadata(
    {
      ...event,
      game: "tbc",
      eventType: "raid",
      raidName: "Karazhan",
      capacity: 10,
    },
    "signup",
  );
  assert.match(metadata.description!, /The Burning Crusade/);
  assert.match(
    JSON.stringify(metadata.openGraph?.images),
    /raids\/tbc\/.*karazhan/,
  );
});

test("private, unavailable and missing events reveal no event details in metadata", () => {
  for (const view of ["signup", "reserves"] as const) {
    const metadata = raidShareMetadata(null, view);
    assert.deepEqual(metadata.title, {
      absolute: view === "signup" ? "Event signup" : "Soft reserves",
    });
    assert.match(metadata.description!, /Sign in with Discord/);
    assert(!JSON.stringify(metadata).includes(event.title));
    assert(!JSON.stringify(metadata).includes(event.id));
    assert.deepEqual(metadata.robots, { index: false, follow: false });
  }
});
