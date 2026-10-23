import assert from "node:assert/strict";
import { test } from "node:test";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import {
  tierScenarios,
  buildsForTierScenario,
} from "../lib/simulation-tier-evidence";
import {
  tierScenariosSchema,
  parseTierScenario,
} from "../lib/simulation-tier-schema";
import { rankSimulationBuilds } from "../lib/simulation-evidence-schema";
import { SimulationTierList } from "../components/simulation-tier-list";
import { Markdown } from "../components/markdown";
import { simulationGuides, dpsTierSlug } from "../content/simulation-guides";

test("Solo and Raid use the same 21 published characters and independent measured rankings", () => {
  const solo = rankSimulationBuilds(buildsForTierScenario(tierScenarios.solo));
  const raid = rankSimulationBuilds(buildsForTierScenario(tierScenarios.raid));
  assert.equal(solo.length, 21);
  assert.equal(raid.length, 21);
  assert.deepEqual(
    solo.map((row) => row.id).sort(),
    raid.map((row) => row.id).sort(),
  );
  assert.equal(solo[0].id, "warlock-demonology-static");
  assert.equal(raid[0].id, "hunter-marksmanship-static");
  assert.equal(solo[0].share, 100);
  assert.equal(raid[0].share, 100);
  assert(solo.find((row) => row.id === "fury-horde")!.dps < 500);
  assert(raid.find((row) => row.id === "fury-horde")!.dps > 800);
  assert.equal(new Set(solo.map((row) => row.classKey)).size, 8);
  assert.equal(parseTierScenario("solo"), "solo");
  for (const invalid of [
    undefined,
    null,
    "__proto__",
    "constructor",
    ["solo"],
    {},
  ])
    assert.equal(parseTierScenario(invalid), "raid");
});

for (const scenario of ["solo", "raid"] as const) {
  test(`${scenario} is server-readable, correctly labeled and linked to the exact imported setup`, () => {
    const before = JSON.stringify(tierScenarios[scenario]);
    const html = load(
      renderToStaticMarkup(<SimulationTierList scenario={scenario} />),
    );
    const ranked = rankSimulationBuilds(
      buildsForTierScenario(tierScenarios[scenario]),
    );
    assert.equal(
      html("[data-tier-scenario]").attr("data-tier-scenario"),
      scenario,
    );
    assert.equal(html("[data-tier-build]").length, 21);
    assert.equal(html(".sim-scenario-nav [aria-current=page]").length, 1);
    assert.equal(
      html(".sim-scenario-nav [aria-current=page]").text(),
      scenario === "raid" ? "Raid DPS" : "Solo DPS",
    );
    assert.equal(html(".sim-tier-controls select option").length, 9);
    for (const row of ranked) {
      const tile = html(`[data-tier-build='${row.id}']`);
      assert.equal(
        tile.find(".sim-tile-dps strong").text(),
        row.dps.toFixed(1),
      );
      assert(tile.closest(".sim-tier-row").hasClass(`sim-band-${row.tier}`));
    }
    assert.equal(
      html(".sim-build-preview > a").attr("href"),
      ranked[0].benchmarkHref,
    );
    assert(
      html(
        `a[download][href='/data/simulation-guides/benchmark.${scenario}.json']`,
      ).length === 1,
    );
    assert.equal(JSON.stringify(tierScenarios[scenario]), before);
    const markdown = renderToStaticMarkup(
      <Markdown editorial tierScenario={scenario}>
        {"```simulation-tier\nstandard\n```"}
      </Markdown>,
    );
    assert(markdown.includes(`data-tier-scenario="${scenario}"`));
    assert(!markdown.includes("25 builds / 9 classes"));
  });
  test(`${scenario} download is the same authenticated dataset and does not enable raid-default migration`, async () => {
    const raw = JSON.parse(
      await readFile(
        `public/data/simulation-guides/benchmark.${scenario}.json`,
        "utf8",
      ),
    ) as unknown;
    assert.deepEqual(raw, tierScenarios[scenario]);
    assert.equal(
      createHash("sha256")
        .update(JSON.stringify(tierScenarios[scenario].policy))
        .digest("hex"),
      tierScenarios[scenario].policySha256,
    );
    for (const row of buildsForTierScenario(tierScenarios[scenario])) {
      const url = new URL(row.benchmarkHref);
      assert.equal(url.origin, "https://kfcguild.online");
      assert(
        url.pathname.startsWith("/tools/forever-sim/" + row.release + "/"),
      );
      assert.equal(url.search, "?i=gtrcmxeu");
      assert.equal(url.searchParams.has("raidDefaults"), false);
      assert(url.hash.length > 100);
    }
  });
}

test("mode or identity swaps, invalid talents and incomplete datasets fail closed", () => {
  const swapped = structuredClone(tierScenarios);
  swapped.solo.entries = structuredClone(tierScenarios.raid.entries);
  assert.equal(tierScenariosSchema.safeParse(swapped).success, false);
  const invalid = structuredClone(tierScenarios);
  invalid.solo.entries[0].talents = "1-1-1";
  assert.equal(tierScenariosSchema.safeParse(invalid).success, false);
  assert.equal(
    tierScenariosSchema.safeParse({
      ...tierScenarios,
      solo: {
        ...tierScenarios.solo,
        entries: tierScenarios.solo.entries.slice(1),
      },
    }).success,
    false,
  );
});

test("offline controls point to separately rendered scenarios, and the article discloses the measured scope", () => {
  const html = load(
    renderToStaticMarkup(
      <SimulationTierList
        scenario="solo"
        scenarioHrefs={{ raid: "raid.html", solo: "solo.html" }}
      />,
    ),
  );
  assert.equal(html(".sim-scenario-nav a").first().attr("href"), "raid.html");
  assert.equal(html(".sim-scenario-nav a").last().attr("href"), "solo.html");
  const article = simulationGuides.find((guide) => guide.slug === dpsTierSlug);
  assert(article);
  assert(article.title.includes("Solo vs Raid"));
  assert(article.content.includes("210,000"));
  assert(article.content.includes("eight classes"));
  assert(article.content.includes("not separately optimized solo rotations"));
});

test("the community explainer retains its URL and points to KFC without repeating the ranking board", () => {
  const article = simulationGuides.find((guide) => guide.slug === dpsTierSlug);
  assert(article);
  assert.equal(article.slug, "wow-forever-dps-tier-list");
  assert(!article.title.includes("Tier List"));
  const html = load(
    renderToStaticMarkup(<Markdown editorial>{article.content}</Markdown>),
  );
  assert.equal(html("[data-tier-build]").length, 0);
  assert.equal(html("[data-tier-scenario]").length, 0);
  for (const path of [
    "/tools/forever/tier-list",
    "/tools/forever/tier-list/solo",
  ])
    assert(html(`a[href='https://kfcguild.online${path}']`).length > 0);
  assert(
    article.content.includes(
      tierScenarios.solo.entries
        .find((row) => row.id === "fury-horde")!
        .dps.toFixed(2),
    ),
  );
  assert(
    article.content.includes(
      tierScenarios.raid.entries
        .find((row) => row.id === "fury-horde")!
        .dps.toFixed(2),
    ),
  );
});

test("all nine class guides link directly to both canonical rankings with the publication boundary intact", () => {
  const guides = simulationGuides.filter((guide) => guide.slug !== dpsTierSlug);
  assert.equal(guides.length, 9);
  for (const guide of guides) {
    const html = load(
      renderToStaticMarkup(<Markdown editorial>{guide.content}</Markdown>),
    );
    for (const path of [
      "/tools/forever/tier-list",
      "/tools/forever/tier-list/solo",
    ])
      assert.equal(
        html(`a[href='https://kfcguild.online${path}']`).length,
        1,
        guide.slug,
      );
    assert(html(`a[href='/guides/${dpsTierSlug}']`).length > 0);
    if (guide.slug.includes("paladin"))
      assert(
        guide.content.includes("Paladin research builds are not included"),
      );
  }
});
