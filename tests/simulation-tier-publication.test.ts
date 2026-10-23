import assert from "node:assert/strict";
import { test } from "node:test";
import { dpsTierSlug, simulationGuides } from "../content/simulation-guides";
import { editorialFingerprint } from "../lib/editorial-publication";
import {
  tierGuideRefreshAction,
  tierGuideRefreshMetadata,
} from "../lib/simulation-tier-publication";

test("the refresh updates default SEO copy and preserves custom metadata", () => {
  const previous = {
    title: "Old title",
    excerpt: "Old excerpt",
    metaTitle: null,
    metaDescription: null,
  };
  const source = { title: "New title", excerpt: "New excerpt" };
  assert.deepEqual(tierGuideRefreshMetadata(previous, source), {
    metaTitle: source.title,
    metaDescription: source.excerpt,
  });
  assert.deepEqual(
    tierGuideRefreshMetadata(
      {
        ...previous,
        metaTitle: previous.title,
        metaDescription: previous.excerpt,
      },
      source,
    ),
    {
      metaTitle: source.title,
      metaDescription: source.excerpt,
    },
  );
  assert.deepEqual(
    tierGuideRefreshMetadata(
      {
        ...previous,
        metaTitle: "Custom title",
        metaDescription: "Custom description",
      },
      source,
    ),
    {
      metaTitle: "Custom title",
      metaDescription: "Custom description",
    },
  );
});

test("the tier-only refresh is idempotent and refuses hidden, unrelated or human-edited articles", () => {
  const source = simulationGuides.find((guide) => guide.slug === dpsTierSlug);
  assert(source);
  const previous = {
    ...source,
    content: "Previously published comparison.",
    published: true,
  };
  const fingerprint = editorialFingerprint(previous);
  assert.equal(tierGuideRefreshAction(previous, source, fingerprint), "update");
  assert.equal(
    tierGuideRefreshAction({ ...source, published: true }, source, fingerprint),
    "preserve",
  );
  assert.throws(() =>
    tierGuideRefreshAction(
      { ...previous, published: false },
      source,
      fingerprint,
    ),
  );
  assert.throws(() =>
    tierGuideRefreshAction(
      { ...previous, content: "Human correction" },
      source,
      fingerprint,
    ),
  );
  assert.throws(() =>
    tierGuideRefreshAction(
      { ...previous, slug: "another-guide" },
      source,
      fingerprint,
    ),
  );
  assert.throws(() => tierGuideRefreshAction(null, source, fingerprint));
});
