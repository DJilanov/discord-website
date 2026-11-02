import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calendarSummary,
  kfcCalendarEvents,
} from "../lib/kfc-raiding/calendar";
import type { RaidSession } from "../lib/kfc-raiding/contracts";

const session: RaidSession = {
  key: "managed:cmvvvosad00035o4s2cyoici8",
  game: "forever",
  title: "Hyjal morning",
  activity: "Hyjal",
  eventType: "raid",
  startsAt: "2026-12-14T10:30:00.000Z",
  endsAt: "2026-12-14T12:30:00.000Z",
  status: "open",
  signupUrl:
    "https://www.wowforeverdiscord.online/raids/cmvvvosad00035o4s2cyoici8",
  sourceGuildId: "1411533815356194968",
  sourceChannelId: "1557974287602819164",
  sourceMessageId: "1557974287602819165",
  host: "Organizer",
  capacity: 20,
  confirmed: 5,
  registered: 2,
  source: "managed",
};

test("calendar projection preserves canonical identity, links, exact UTC and real signup counts", (): void => {
  const summary = calendarSummary(session);
  assert.ok(summary);
  assert.equal(summary.id, "fr-cmvvvosad00035o4s2cyoici8");
  assert.equal(summary.startsAt, session.startsAt);
  assert.equal(summary.capacity, 20);
  assert.equal(summary.signupCount, 7);
  assert.equal(summary.selectedCount, 5);
  assert.equal(summary.signupUrl, session.signupUrl);
  assert.equal(
    summary.discordUrl,
    "https://discord.com/channels/1411533815356194968/1557974287602819164/1557974287602819165",
  );
  for (const privateField of [
    "audience",
    "signups",
    "discordId",
    "reason",
    "preparation",
    "roster",
  ])
    assert.ok(!(privateField in summary));
});

test("cancelled, completed and external sessions cannot reappear as managed calendar entries", (): void => {
  assert.equal(calendarSummary({ ...session, status: "cancelled" }), null);
  assert.equal(calendarSummary({ ...session, status: "finished" }), null);
  assert.equal(calendarSummary({ ...session, source: "raid-helper" }), null);
  assert.equal(calendarSummary({ ...session, key: "external:123" }), null);
  assert.equal(
    calendarSummary({ ...session, status: "locked" })?.status,
    "locked",
  );
  assert.equal(calendarSummary({ ...session, game: "tbc" })?.game, "tbc");
});

test("missing calendar publication configuration returns an empty feed without querying private events", async (): Promise<void> => {
  const database = {
    foreverRaidEvent: {
      findMany: async (): Promise<never> => {
        throw Error("Unexpected database read");
      },
    },
  };
  assert.deepEqual(
    await kfcCalendarEvents(
      database as unknown as Parameters<typeof kfcCalendarEvents>[0],
      new Date(),
      null,
    ),
    [],
  );
});
