import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { test } from "node:test";
import { z } from "zod";
import { simulationGuides } from "../content/simulation-guides";
import { editorialFingerprint } from "../lib/editorial-publication";
import {
  planSimulationDiscovery,
  previousDiscoveryFingerprints,
  type DiscoveryGuide,
} from "../lib/simulation-discovery-publication";

const fixture = z
  .object({
    sourceCommit: z.literal("c8ad9cab901f6a761ad7917b675f56410d2c0684"),
    guides: z
      .array(
        z.object({
          slug: z.string(),
          title: z.string(),
          excerpt: z.string(),
          content: z.string(),
        }),
      )
      .length(10),
  })
  .parse(
    JSON.parse(
      gunzipSync(
        readFileSync("tests/fixtures/simulation-discovery-c8ad9ca.json.gz"),
      ).toString("utf8"),
    ),
  );

function previous(): DiscoveryGuide[] {
  return fixture.guides.map((guide) => ({
    ...guide,
    id: guide.slug,
    metaTitle: guide.title,
    metaDescription: guide.excerpt,
    published: true,
    updatedAt: new Date("2026-10-23T00:00:00Z"),
  }));
}

test("all ten recognized published sources match the immutable pre-change fixture", () => {
  assert.deepEqual(
    Object.keys(previousDiscoveryFingerprints).sort(),
    fixture.guides.map((guide) => guide.slug).sort(),
  );
  for (const guide of fixture.guides)
    assert.equal(
      editorialFingerprint(guide),
      previousDiscoveryFingerprints[guide.slug],
    );
  const rows = previous();
  const before = JSON.stringify(rows);
  assert.equal(
    planSimulationDiscovery(rows).filter((plan) => plan.action === "update")
      .length,
    10,
  );
  assert.equal(JSON.stringify(rows), before);
});

test("repeated and partially completed refreshes are idempotent", () => {
  const rows = previous().map((guide) => ({
    ...guide,
    ...simulationGuides.find((source) => source.slug === guide.slug),
  }));
  assert(
    planSimulationDiscovery(rows).every((plan) => plan.action === "preserve"),
  );
  rows[0] = previous()[0];
  assert.equal(
    planSimulationDiscovery(rows).filter((plan) => plan.action === "update")
      .length,
    1,
  );
});

test("missing, hidden, duplicate, unrelated and edited guides reject the entire refresh", () => {
  assert.throws(() => planSimulationDiscovery(previous().slice(1)));
  for (const patch of [
    { published: false },
    { content: "Editor's correction" },
    { slug: "another-article" },
    { title: "Editor's title" },
  ]) {
    const rows = previous();
    rows[0] = { ...rows[0], ...patch };
    assert.throws(() => planSimulationDiscovery(rows));
  }
  const duplicate = previous();
  duplicate[0] = duplicate[1];
  assert.throws(() => planSimulationDiscovery(duplicate));
});
