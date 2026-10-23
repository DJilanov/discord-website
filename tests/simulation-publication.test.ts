import assert from "node:assert/strict";
import { test } from "node:test";
import {
  simulationGuides,
  simulationGuideSlugs,
} from "../content/simulation-guides";
import { simulationPublicationAction } from "../lib/simulation-publication";
import {
  editorialPublicationData,
  editorialFingerprint,
} from "../lib/editorial-publication";

test("nine distinct class guides and one tier list validate as private sources until explicitly published", () => {
  assert.equal(simulationGuideSlugs.length, 9);
  assert.equal(simulationGuides.length, 10);
  assert.equal(new Set(simulationGuides.map((guide) => guide.slug)).size, 10);
  for (const guide of simulationGuides) {
    const data = editorialPublicationData(guide);
    assert.equal(data.published, false);
    assert.equal(editorialFingerprint(data), editorialFingerprint(guide));
    assert.equal(simulationPublicationAction(null, guide), "create");
    assert(
      guide.content.includes("level-60") || guide.content.includes("level 60"),
    );
  }
});
test("publication preserves custom metadata, refuses editor changes and never republishes an intentionally removed guide", () => {
  const source = simulationGuides[0],
    draft = { ...source, published: false, publishedAt: null };
  assert.equal(simulationPublicationAction(draft, source), "publish");
  assert.equal(
    simulationPublicationAction(
      { ...draft, published: true, publishedAt: new Date() },
      source,
    ),
    "preserve",
  );
  for (const change of [
    { title: "Edited title" },
    { excerpt: "Edited excerpt" },
    { content: source.content + "\nEditor's correction" },
    { publishedAt: new Date() },
  ])
    assert.throws(() =>
      simulationPublicationAction({ ...draft, ...change }, source),
    );
});
