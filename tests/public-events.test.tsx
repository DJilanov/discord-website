import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import { PublicEventSummary } from "../components/public-event";
import { publicEventCalendar } from "../lib/raids/calendar";
import type { PublicEvent } from "../lib/raids/public-events";

const now = new Date("2026-10-22T12:00:00Z");
const event: PublicEvent = {
  id: "cmuz20aal0000fu4s0vf3f2wx",
  title: "Northshire leveling group",
  eventType: "questing",
  activity: "Questing",
  raidName: "Northshire",
  region: "EU",
  faction: "Alliance",
  ruleset: "PvP",
  description: "Meet at Northshire. Confirm your level before joining.",
  startsAt: new Date("2026-11-05T07:30:00Z"),
  endsAt: new Date("2026-11-05T21:30:00Z"),
  signupClosesAt: new Date("2026-11-05T07:00:00Z"),
  capacity: 5,
  admission: "open",
  status: "open",
  accepted: 2,
  discordUrl:
    "https://discord.com/channels/1556000000000000001/1556000000000000002/1556000000000000003",
};

test("public summaries render useful plans without member or character data", () => {
  const $ = load(
    renderToStaticMarkup(<PublicEventSummary event={event} now={now} />),
  );
  assert.equal($("h1").text(), event.title);
  assert.equal($("time").attr("datetime"), event.startsAt.toISOString());
  assert.match($("main, .public-event").text(), /2 accepted · 5 planned/);
  assert.equal($('a[href$="/calendar"]').length, 1);
  assert.equal(
    $('a[href="/raids/cmuz20aal0000fu4s0vf3f2wx"]').text(),
    "Sign up with Discord",
  );
  assert.ok($("img").attr("src")?.includes("questing"));
  assert.equal($("form, input").length, 0);
  assert.equal($("script[type='application/ld+json']").length, 1);
});

test("ended and closed previews do not present an active signup", () => {
  const ended = load(
    renderToStaticMarkup(
      <PublicEventSummary
        event={event}
        now={new Date("2026-11-06T00:00:00Z")}
      />,
    ),
  );
  assert.match(ended.text(), /This session has ended/);
  assert.equal(ended('a[href$="/calendar"]').length, 0);
  assert.equal(ended('a[href^="/raids/"]').length, 0);
  const closed = load(
    renderToStaticMarkup(
      <PublicEventSummary event={{ ...event, status: "locked" }} now={now} />,
    ),
  );
  assert.match(closed.text(), /Signup is closed/);
  assert.equal(closed('a[href^="/raids/"]').text(), "Open event");
});

test("calendar snapshots escape injection, preserve UTC and fold UTF-8 safely", () => {
  const value = {
    ...event,
    title: "Πρόγραμμα; test, \\".repeat(12),
    description: "Line one\r\nATTENDEE:private@example.test\nEND:VEVENT",
  };
  const calendar = publicEventCalendar(value, now);
  const unfolded = calendar.replace(/\r\n /g, "");
  assert.ok(calendar.endsWith("\r\n"));
  assert.match(calendar, /DTSTART:20261105T073000Z\r\n/);
  assert.match(calendar, /DTEND:20261105T213000Z\r\n/);
  assert.match(calendar, /DTSTAMP:20261022T120000Z\r\n/);
  assert.equal(
    calendar.split("\r\n").filter((line) => line === "END:VEVENT").length,
    1,
  );
  assert.equal(
    calendar.split("\r\n").some((line) => line.startsWith("ATTENDEE:")),
    false,
  );
  assert.ok(unfolded.includes("Πρόγραμμα\\; test\\, \\\\"));
  assert.ok(
    unfolded.includes("Line one\\nATTENDEE:private@example.test\\nEND:VEVENT"),
  );
  for (const line of calendar.split("\r\n"))
    assert.ok(Buffer.byteLength(line) <= 75);
  assert.equal(calendar.includes("\uFFFD"), false);
  assert.equal(
    calendar.includes("BEGIN:VALARM"),
    false,
    "Calendar reminders remain the player's choice",
  );
});
