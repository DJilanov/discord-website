import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import { traderLinks } from "../content/community-tools";
import AddonsPage from "../app/(site)/addons/page";

test("community tools link directly to canonical tools, not the legacy hostname", () => {
  for (const href of Object.values(traderLinks)) {
    const url = new URL(href);
    assert.equal(url.origin, "https://kfcguild.online");
    assert.ok(url.pathname.startsWith("/tools/forever/"));
    assert.equal(url.search, "");
  }
  assert.ok(traderLinks.simulator.endsWith("/forever/simulator"));
  assert.ok(traderLinks.quests.endsWith("/forever/encyclopedia/quests"));
});

test("the tool directory describes current browser scope without promising addon validation", () => {
  const $ = load(renderToStaticMarkup(createElement(AddonsPage)));
  const text = $("main").length ? $("main").text() : $("body").text();
  assert.doesNotMatch(text, /Later zones,\s*Horde routes.*not available/);
  assert.match(text, /through level 60/);
  assert.match(text, /not a completed in-game playthrough/);
  assert.equal(
    $("a[href]")
      .toArray()
      .some((element) => $(element).attr("href") === traderLinks.simulator),
    true,
  );
  assert.match(text, /healing-only engines are not available/);
  assert.match(text, /unsigned maintainer alpha/);
  assert.doesNotMatch(text, /CHECKED IN THE GAME/);
});
