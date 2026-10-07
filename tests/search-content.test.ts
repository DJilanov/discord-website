import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { editorialGuides } from "../content/editorial";
import { classDiscussions } from "../content/community-paths";
import { pages } from "../content/pages";

test("class discovery uses one hub and nine distinct Forever calculators", () => {
  assert.equal(classDiscussions.length, 9);
  assert.equal(new Set(classDiscussions.map((item) => item.channel)).size, 9);
  const guide = editorialGuides.find((item) => item.slug === "join-wow-forever-discord")!;
  for (const item of classDiscussions) {
    const url = new URL(item.calculator);
    assert.equal(url.hostname, "helper.kfcguild.online");
    assert.equal(url.pathname, `/forever/encyclopedia/talents/${item.channel}`);
    assert.ok(guide.content.includes(item.calculator));
  }
  for (const name of ["introductions", "useful-links", "scheduled-runs", "tool-support"])
    assert.ok(guide.content.includes(`**${name}**`));
  assert.ok(guide.content.includes("historical screenshots"));
  assert.ok(guide.content.includes("Other members can read" ) || guide.content.includes("other members can read"));
});

test("listing instructions match immediate publication without implying endorsement", () => {
  for (const slug of ["find-or-organize-wow-forever-group", "write-wow-forever-guild-recruitment-post", "wow-forever-playing-with-friends"]) {
    const guide = editorialGuides.find((item) => item.slug === slug)!;
    assert.match(guide.content, /(?:publish|appears) immediately/);
    assert.doesNotMatch(guide.content, /reviewed before (appearing|they become public)|moderated before publication|planned bot is not an active/);
  }
  assert.match(pages.rules.body, /explicit public-sharing consent/);
  assert.match(pages.privacy.body, /publication does not mean the listing has already been checked/);
  assert.doesNotMatch(pages.privacy.body, /Verified tag publishes/);
  const groups = editorialGuides.find((item) => item.slug === "find-or-organize-wow-forever-group")!;
  assert.match(groups.content, /Central Europe for EU/);
  assert.match(groups.content, /New York for NA/);
  assert.match(groups.content, /Scheduled events/);
  assert.match(groups.content, /future plan, not a completed session/);
});

test("join and group pages keep distinct canonicals and explain current channel routing", async () => {
  const discord = await readFile("app/(site)/discord/page.tsx", "utf8");
  const lfg = await readFile("app/(site)/lfg/page.tsx", "utf8");
  assert.ok(discord.includes('"WoW Forever Discord | Join the Community"'));
  assert.ok(discord.includes('"/discord",'));
  assert.ok(lfg.includes('"/lfg",'));
  assert.ok(lfg.includes("not Blizzard&apos;s in-game group finder"));
  assert.doesNotMatch(discord, /<strong>verification<|<strong>newcomers<|<code>help-support<|<code>pugs-adverts</);
});
