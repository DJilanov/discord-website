import assert from "node:assert/strict";
import { test } from "node:test";
import originals from "./fixtures/starter-guides-pre-interactive.json";
import {
  canPublishStarterGuide,
  canRefreshDraftGuide,
  editorialFingerprint,
  editorialPublicationData,
} from "../lib/editorial-publication";
import { preInteractiveStarterFingerprints } from "../content/starter-resource-history";
import { starterResources } from "../content/starter-resources";

test("only the three exact never-published source drafts are eligible for the interactive refresh", () => {
  assert.equal(originals.length, 3);
  for (const original of originals) {
    const source = starterResources.find(
      (guide) => guide.slug === original.slug,
    )!;
    assert.equal(
      editorialFingerprint(original),
      preInteractiveStarterFingerprints[original.slug],
    );
    assert.equal(canRefreshDraftGuide(original, source), true);
    const changed = editorialPublicationData(source);
    assert.equal(changed.published, false);
    assert.notEqual(
      editorialFingerprint(changed),
      editorialFingerprint(original),
    );
    assert.equal(
      canRefreshDraftGuide({ ...changed, publishedAt: null }, source),
      false,
    );
  }
});

test("the owner's explicit starter-publication flag is limited to six exact, never-published resources", () => {
  for (const source of starterResources) {
    const data = editorialPublicationData(source);
    assert.equal(data.published, false);
    assert.equal(
      editorialPublicationData(source, { publishStarters: true }).published,
      true,
    );
    assert.equal(
      canPublishStarterGuide({ ...data, publishedAt: null }, source),
      true,
    );
    assert.equal(
      canPublishStarterGuide(
        {
          ...data,
          publishedAt: null,
          content: data.content + "\nEditor correction.",
        },
        source,
      ),
      false,
    );
    assert.equal(
      canPublishStarterGuide({ ...data, publishedAt: new Date() }, source),
      false,
    );
    assert.equal(
      canPublishStarterGuide(
        { ...data, publishedAt: null, published: true },
        source,
      ),
      false,
    );
  }
  const unrelated = { ...starterResources[0], slug: "unapproved-new-draft" };
  assert.equal(
    editorialPublicationData(unrelated, { publishStarters: true }).published,
    false,
  );
  for (const original of originals)
    assert.equal(
      canPublishStarterGuide(
        original,
        starterResources.find((source) => source.slug === original.slug)!,
      ),
      true,
    );
});

test("editor changes, previously published guides, different slugs and publication requests are preserved", () => {
  for (const original of originals) {
    const source = starterResources.find(
      (guide) => guide.slug === original.slug,
    )!;
    for (const changed of [
      { ...original, title: original.title + " edited" },
      { ...original, excerpt: original.excerpt + " edited" },
      { ...original, content: original.content + "\nReviewer addition." },
      { ...original, slug: "different-guide" },
      { ...original, published: true },
      { ...original, publishedAt: new Date("2026-10-20") },
    ])
      assert.equal(canRefreshDraftGuide(changed, source), false);
    assert.equal(
      canRefreshDraftGuide(original, { ...source, release: undefined }),
      false,
    );
    assert.equal(
      canRefreshDraftGuide(original, { ...source, slug: "different-guide" }),
      false,
    );
  }
});
