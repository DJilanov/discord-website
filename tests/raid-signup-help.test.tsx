import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import RaidSignupHelp from "../app/(raid-pilot)/raids/help/page";

test("Signup help works without a login form and explains both tools and actual confirmation", (): void => {
  const $ = load(renderToStaticMarkup(<RaidSignupHelp />));
  assert.equal($("h1").text(), "Your first raid signup");
  assert.equal($(".raid-help-steps > li").length, 3);
  assert.match($("article").text(), /Save character & continue/);
  assert.match($("article").text(), /Confirm signup/);
  assert.match($("article").text(), /Raid-Helper/);
  assert.match($("article").text(), /Interested follows the event/);
  assert.match($("article").text(), /leader will select the roster/);
  assert.equal($("form, input").length, 0);
  for (const label of ["Forever raids", "TBC raids", "Ask for help"])
    assert(
      $("a")
        .toArray()
        .some((anchor) => $(anchor).text() === label),
    );
});
