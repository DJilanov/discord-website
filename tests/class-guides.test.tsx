import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import { Markdown } from "../components/markdown";
import { GuideLibrary } from "../components/guide-library";
import { classGuides, getClassGuide } from "../content/class-guides";
import evidence from "../content/class-guide-evidence.json";
import { starterResources } from "../content/starter-resources";

test("every class explanation and combat action has complete, attributed snapshot evidence", () => {
  assert.equal(evidence.snapshot.build, "1.60.1.70425");
  assert.equal(evidence.license.id, "CC-BY-4.0");
  assert.equal(classGuides.length, 3);
  assert.equal(new Set(classGuides.map((guide) => guide.key)).size, 3);
  for (const guide of classGuides) {
    const source = evidence.classes.find((entry) => entry.key === guide.key)!;
    assert(source);
    assert(guide.talents.length >= 8);
    assert(guide.scenarios.length >= 3);
    for (const talent of guide.talents) {
      const record = source.talents.find((entry) => entry.name === talent.name);
      assert(record && record.ranks.length > 0);
      assert(record.ranks.every((rank) => rank.length > 10));
      assert(talent.purpose.length > 60 && talent.tradeoff.length > 60);
    }
    for (const scenario of guide.scenarios) {
      assert(scenario.steps.length >= 3);
      for (const step of scenario.steps) {
        const spell = source.spells.find((entry) => entry.name === step.spell);
        assert(spell);
        assert(spell.level >= 1 && spell.level <= 60);
        assert(
          spell.ranks.every(
            (rank) => rank.description && rank.level >= spell.level,
          ),
        );
      }
    }
  }
  assert.equal(getClassGuide("__proto__"), undefined);
  assert.equal(getClassGuide("feral-tank\n<script>"), undefined);
});

test("guide icons are real bounded bitmap assets matching the provenance manifest", async () => {
  assert(evidence.assets.length > 40);
  for (const asset of evidence.assets) {
    const bytes = await readFile(`public/images/guide-icons/${asset.key}.jpg`);
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      asset.sha256,
    );
    const image = await sharp(bytes).metadata();
    assert((image.width ?? 0) >= 32 && (image.width ?? 0) <= 128);
    assert((image.height ?? 0) >= 32 && (image.height ?? 0) <= 128);
  }
});

test("only known editorial code fences render the interactive guide, with useful server HTML", () => {
  for (const guide of classGuides) {
    const content = `\`\`\`class-guide\n${guide.key}\n\`\`\``;
    const html = renderToStaticMarkup(<Markdown editorial>{content}</Markdown>);
    assert(html.includes(guide.title));
    assert(html.includes("Talents, explained"));
    assert(html.includes("Combat priorities"));
    assert(html.includes("CC BY 4.0"));
    assert(html.includes("Why consider it"));
    assert(html.includes('aria-pressed="true"'));
    assert(!html.includes("language-class-guide"));
    const plain = renderToStaticMarkup(<Markdown>{content}</Markdown>);
    assert(plain.includes("language-class-guide"));
    assert(!plain.includes("Combat priorities"));
  }
  const invalid = renderToStaticMarkup(
    <Markdown editorial>{"```class-guide\n__proto__\n```"}</Markdown>,
  );
  assert(invalid.includes("language-class-guide"));
  assert(!invalid.includes("class-guide-header"));
  const injection = renderToStaticMarkup(
    <Markdown editorial>
      {"```class-guide\nferal-tank<script>alert(1)</script>\n```"}
    </Markdown>,
  );
  assert(!injection.includes("<script>"));
});

test("the library distinguishes canonical public routes from local review links", () => {
  const html = renderToStaticMarkup(<GuideLibrary guides={starterResources} />);
  for (const guide of starterResources)
    assert(html.includes(`href="/guides/${guide.slug}"`));
  assert(!html.includes("Private review"));
  assert(!html.includes("Not published"));
  const preview = renderToStaticMarkup(
    <GuideLibrary guides={starterResources} privateReview assetBase="assets" />,
  );
  for (const guide of starterResources)
    assert(preview.includes(`href="${guide.slug}.html"`));
  assert(preview.includes("Private review"));
  const community = renderToStaticMarkup(
    <GuideLibrary
      guides={[{ ...starterResources[0], slug: "ordinary-community-guide" }]}
    />,
  );
  assert(community.includes('href="#community-guides"'));
});

test("expanded resources stay private drafts and reference exactly one matching class block", () => {
  assert.equal(starterResources.length, 6);
  for (const guide of starterResources) {
    assert.equal(guide.release, "draft");
    assert(guide.content.includes("Gameplay review pending"));
    const blocks = [
      ...guide.content.matchAll(/```class-guide\n([^\n]+)\n```/g),
    ];
    if (guide.slug.includes("group-preparation"))
      assert.equal(blocks.length, 0);
    else {
      assert.equal(blocks.length, 1);
      assert(getClassGuide(blocks[0][1]));
      assert(guide.content.length > 6000);
    }
  }
});
