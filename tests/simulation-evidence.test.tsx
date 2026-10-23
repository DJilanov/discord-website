import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { renderToStaticMarkup } from "react-dom/server";
import { simulationEvidence } from "../lib/simulation-evidence";
import {
  simulationEvidenceSchema,
  rankSimulationBuilds,
} from "../lib/simulation-evidence-schema";
import {
  SimulationGuide,
  SimulationTierList,
} from "../components/simulation-guide";
import { Markdown } from "../components/markdown";
import { simulationClassProfiles } from "../content/simulation-class-profiles";

test("all nine classes have 25 standard measured builds, complete gear and release-bound evidence", async () => {
  assert.equal(simulationEvidence.builds.length, 25);
  for (const profile of simulationClassProfiles) {
    const builds = simulationEvidence.builds.filter(
      (build) => build.classKey === profile.key,
    );
    assert(builds.length > 0);
    const html = renderToStaticMarkup(
      <SimulationGuide classKey={profile.key} />,
    );
    assert(html.includes(profile.name));
    for (const build of builds) {
      assert(html.includes(build.name));
      assert.equal(build.gear.length, 17);
      assert.equal(
        build.selectedTalents.reduce((sum, talent) => sum + talent.rank, 0),
        51,
      );
      assert(build.priorities.length >= 3);
      const saved = JSON.parse(
        await readFile(
          `public/data/simulation-guides/${build.id}.json`,
          "utf8",
        ),
      );
      assert.equal(saved.wasmSha256, build.wasmSha256);
      assert.equal(
        createHash("sha256")
          .update(JSON.stringify(saved.settings.player.rotation))
          .digest("hex"),
        build.rotationSha256,
      );
    }
  }
  assert.equal(
    simulationEvidenceSchema.safeParse({
      ...simulationEvidence,
      builds: simulationEvidence.builds.slice(1),
    }).success,
    false,
  );
});
test("ranking uses only the common benchmark and does not mutate source order", () => {
  const before = JSON.stringify(simulationEvidence.builds),
    ranked = rankSimulationBuilds(simulationEvidence.builds);
  assert.equal(JSON.stringify(simulationEvidence.builds), before);
  assert.equal(ranked.length, 25);
  assert.equal(ranked[0].share, 100);
  assert.equal(ranked[0].tier, "S");
  for (const [index, build] of ranked.entries()) {
    assert.equal(build.rank, index + 1);
    assert.equal(build.monteCarlo95, (1.96 * build.stdev) / Math.sqrt(5000));
    if (index) assert(ranked[index - 1].dps >= build.dps);
  }
  const deliberatelyUnmatched = simulationEvidence.builds.map(
    (build, index) => ({ ...build, referenceDps: index === 0 ? 999999 : 1 }),
  );
  assert.equal(rankSimulationBuilds(deliberatelyUnmatched)[0].id, ranked[0].id);
  assert.deepEqual(rankSimulationBuilds([]), []);
});
test("all source icons are local original bounded bitmaps matching the manifest", async () => {
  for (const asset of simulationEvidence.assets) {
    const bytes = await readFile(
      `public/images/simulation-icons/${asset.key}.jpg`,
    );
    assert(bytes.length > 20 && bytes.length < 100000);
    assert.equal(bytes[0], 0xff);
    assert.equal(bytes[1], 0xd8);
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      asset.sha256,
    );
  }
});
test("known editorial fences render server-readable rankings; untrusted and unknown fences stay code", () => {
  const code = "```simulation-tier\nstandard\n```";
  assert(
    renderToStaticMarkup(<Markdown editorial>{code}</Markdown>).includes(
      "Measured DPS rankings",
    ),
  );
  assert(
    !renderToStaticMarkup(<Markdown>{code}</Markdown>).includes(
      "Measured DPS rankings",
    ),
  );
  assert(
    !renderToStaticMarkup(
      <Markdown editorial>{"```simulation-guide\nconstructor\n```"}</Markdown>,
    ).includes("build notebook"),
  );
  const html = renderToStaticMarkup(<SimulationTierList />);
  assert.equal((html.match(/<tr>/g) ?? []).length, 26);
  assert(html.includes("Monte Carlo"));
});
