import { test } from "node:test";
import assert from "node:assert/strict";
import { load } from "cheerio";
import { guideFeed } from "../lib/guide-feed";
import { publicAnalyticsPath } from "../lib/analytics";

test("guide subscriptions use actual revisions, escape content and exclude drafts", () => {
  const guide = {
    slug: "first-group",
    title: "A <group> & friends",
    excerpt: "Plan </description><script>unsafe</script>",
    publishedAt: new Date("2026-10-20T00:00:00Z"),
    updatedAt: new Date("2026-10-21T12:00:00Z"),
    published: true,
  };
  const now = new Date("2026-10-22T00:00:00Z");
  const feed = guideFeed(
    [
      guide,
      { ...guide, slug: "draft", published: false },
      { ...guide, slug: "future", updatedAt: new Date("2099-01-01") },
      { ...guide, slug: "invalid-path/../../.env" },
    ],
    now,
  );
  const $ = load(feed, { xmlMode: true });
  assert.equal($("item").length, 1);
  assert.equal($("item title").text(), guide.title);
  assert.equal($("item description").text(), guide.excerpt);
  assert.equal($("script").length, 0);
  assert.equal($("pubDate").text(), guide.updatedAt.toUTCString());
  assert.equal(feed, guideFeed([guide], new Date("2026-10-23T00:00:00Z")));
});

test("public analytics cannot record member workspaces, callback data or account paths", () => {
  for (const path of [
    "/raids",
    "/raids/private-event?draft=private",
    "/account/characters",
    "/api/community/auth/callback/discord?code=private",
    "/reports/status/private",
  ])
    assert.equal(publicAnalyticsPath(path), null);
  assert.equal(publicAnalyticsPath("/lfg?draft=private"), "/lfg");
  assert.equal(
    publicAnalyticsPath("/events/cmuz20aal0000fu4s0vf3f2wx"),
    "/events/cmuz20aal0000fu4s0vf3f2wx",
  );
});
