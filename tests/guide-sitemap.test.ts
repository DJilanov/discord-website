import assert from "node:assert/strict";
import { test } from "node:test";
import { guideSitemapEntries, latestGuideRevision } from "../lib/guide-sitemap";
import { SITE_URL } from "../lib/config";

const now = new Date("2026-10-22T18:00:00Z");
const updatedAt = new Date("2026-10-22T16:00:00Z");

test("all published canonical guides are included, without the feed's fifty-entry cap", () => {
  const guides = Array.from({ length: 125 }, (_, index) => ({
    slug: `reviewed-guide-${index}`,
    published: true,
    updatedAt,
  }));
  const entries = guideSitemapEntries(guides, now);
  assert.equal(entries.length, 125);
  assert.equal(entries[124].url, `${SITE_URL}/guides/reviewed-guide-124`);
  assert(entries.every((entry) => entry.lastModified === updatedAt));
});

test("drafts, filtered addresses, private paths and invalid slugs cannot enter the guide sitemap", () => {
  const entries = guideSitemapEntries(
    [
      { slug: "reviewed-guide", published: true, updatedAt },
      ...["draft-guide", "unreviewed-class"].map((slug) => ({
        slug,
        published: false,
        updatedAt,
      })),
      ...[
        "../admin",
        "raids/private",
        "guide?preview=1",
        "__proto__",
        "https://other.test",
      ].map((slug) => ({ slug, published: true, updatedAt })),
    ],
    now,
  );
  assert.deepEqual(entries, [
    { url: `${SITE_URL}/guides/reviewed-guide`, lastModified: updatedAt },
  ]);
});

test("substantive published revisions update the guide directory date, never draft edits or crawl time", () => {
  const guides = [
    {
      slug: "older-guide",
      published: true,
      updatedAt: new Date("2026-10-20T00:00:00Z"),
    },
    { slug: "latest-guide", published: true, updatedAt },
    { slug: "private-draft", published: false, updatedAt: now },
  ];
  assert.equal(
    latestGuideRevision(guides, now)?.toISOString(),
    updatedAt.toISOString(),
  );
  assert.equal(latestGuideRevision([], now), undefined);
  for (const date of [new Date("invalid"), new Date("2026-11-01T00:00:00Z")]) {
    assert.deepEqual(
      guideSitemapEntries(
        [{ slug: "public-guide", published: true, updatedAt: date }],
        now,
      ),
      [{ url: `${SITE_URL}/guides/public-guide` }],
    );
  }
});
