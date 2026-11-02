import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import { EventRoster } from "../components/raids/event-roster";
import { summarizeEventRoster } from "../lib/raids/event-preview";
import type { EventView } from "../lib/raids/contracts";

test("Open raid signups are visible before empty party slots without being auto-confirmed", (): void => {
  const event: EventView = {
    id: "cmv1111111111111111111111",
    game: "forever",
    realm: "",
    eventType: "raid",
    title: "Visibility test",
    raidName: "Hyjal Summit",
    region: "EU",
    faction: "Alliance",
    ruleset: "PvP",
    description: "Test",
    leaderName: "DJ",
    assistantName: "Vargos",
    startsAt: "2035-12-14T10:00:00Z",
    endsAt: "2035-12-14T12:00:00Z",
    signupClosesAt: "2035-12-14T09:45:00Z",
    reservesCloseAt: "2035-12-14T09:45:00Z",
    timeLabel: "Test time",
    signupCloseLabel: "Test deadline",
    reservesCloseLabel: "Test deadline",
    capacity: 20,
    roleCaps: { tank: 2, healer: 4, damage: 14 },
    admission: "open",
    status: "open",
    version: 1,
    reserveLimit: 0,
    allowDuplicates: false,
    hardReserves: [],
    catalog: null,
    isOrganizer: true,
    locked: false,
    discordAvailable: false,
    discord: null,
    signups: [
      {
        id: "signup-one",
        character: {
          game: "forever",
          realm: "",
          name: "Test Druid",
          className: "Druid",
          specialization: "Feral",
          region: "EU",
          faction: "Alliance",
          ruleset: "PvP",
        },
        role: "tank",
        status: "registered",
        isMine: true,
        reserves: [],
      },
    ],
  };
  const roster = summarizeEventRoster(
    event.signups,
    event.capacity,
    event.roleCaps,
    true,
  );
  const markup = renderToStaticMarkup(
    <EventRoster
      event={event}
      roster={roster}
      open
      busy={false}
      onAdmit={(): void => {}}
      onSaveLayout={async (): Promise<boolean> => true}
    />,
  );
  const $ = load(markup);
  assert.equal($('section[aria-label="Open signups"]').length, 1);
  assert.match($('section[aria-label="Open signups"]').text(), /Test Druid/);
  assert(
    markup.indexOf('aria-label="Open signups"') <
      markup.indexOf('class="raid-party-grid"'),
  );
  assert.equal(roster.confirmed.length, 0);
  assert.equal(event.signups[0].status, "registered");
});
