import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CANONICAL_TOOLS_URL, canonicalToolHref } from "../content/tool-links";
import { traderLinks } from "../content/community-tools";
import { classDiscussions } from "../content/community-paths";
import { contributorTasks } from "../content/contributor-tasks";
import { Markdown } from "../components/markdown";
import { HELPER_URL } from "../lib/config";

test("the research configuration initializes with the canonical public base", () => {
  assert.equal(
    HELPER_URL,
    canonicalToolHref(
      process.env.HELPER_PUBLIC_URL || CANONICAL_TOOLS_URL,
    ).replace(/\/$/, ""),
  );
});

test("all maintained public tool links use the canonical tools mount", () => {
  for (const href of [
    ...Object.values(traderLinks),
    ...classDiscussions.map((entry) => entry.calculator),
    contributorTasks.find((task) => task.id === "trader-web")!.target,
  ]) {
    assert(href.startsWith(CANONICAL_TOOLS_URL + "/forever/"));
    assert(!href.includes("/tools/tools/"));
  }
});

test("legacy links retain their exact route, query and fragment without doubling the mount", () => {
  assert.equal(
    canonicalToolHref("https://helper.kfcguild.online"),
    CANONICAL_TOOLS_URL,
  );
  assert.equal(
    canonicalToolHref(
      "https://helper.kfcguild.online/forever/trader?region=eu&faction=Horde#prices",
    ),
    CANONICAL_TOOLS_URL + "/forever/trader?region=eu&faction=Horde#prices",
  );
  assert.equal(
    canonicalToolHref("http://helper.kfcguild.online/tools/forever/leveling"),
    traderLinks.leveling,
  );
  assert.equal(canonicalToolHref(traderLinks.leveling), traderLinks.leveling);
});

test("relative links, other origins, credentials and non-default ports are not rewritten", () => {
  for (const href of [
    "/guides",
    "#chapter",
    "mailto:staff@example.test",
    "https://helper.kfcguild.online.example.test/forever",
    "https://example.test/?next=https://helper.kfcguild.online",
    "https://user@helper.kfcguild.online/forever",
    "https://helper.kfcguild.online:9000/forever",
  ]) {
    assert.equal(canonicalToolHref(href), href);
  }
});

test("stored Markdown links render canonically without altering the stored guide or weakening link safety", () => {
  const source =
    "[Calculator](https://helper.kfcguild.online/forever/encyclopedia/talents/warrior) and https://helper.kfcguild.online/forever/trader";
  const markup = renderToStaticMarkup(createElement(Markdown, null, source));
  assert(
    markup.includes(
      'href="https://kfcguild.online/tools/forever/encyclopedia/talents/warrior"',
    ),
  );
  assert(
    markup.includes('href="https://kfcguild.online/tools/forever/trader"'),
  );
  assert(markup.includes('rel="noopener noreferrer nofollow"'));
  assert(!markup.includes("helper.kfcguild.online"));
  assert(source.includes("helper.kfcguild.online"));
});
