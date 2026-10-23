import { copyFile, cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { createRequire } from "node:module";
import { renderToStaticMarkup, renderToString } from "react-dom/server";
import { GuideLibrary } from "../components/guide-library";
import { starterResources } from "../content/starter-resources";
import { editorialGuides } from "../content/editorial";
import { simulationGuides, dpsTierSlug } from "../content/simulation-guides";
import type { TierScenario } from "../lib/simulation-tier-schema";
import { GuideReviewPage } from "./guide-review-page";

const require = createRequire(import.meta.url);
const { build } = require("esbuild") as typeof import("esbuild");

function document(title: string, body: string, script = true): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow">${renderToStaticMarkup(<title>{title}</title>)}<link rel="stylesheet" href="review.css"></head><body>${body}${script ? '<script src="review.js" defer></script>' : ""}</body></html>`;
}

function Library({
  simulation = false,
}: {
  simulation?: boolean;
}): React.JSX.Element {
  return (
    <GuideLibrary
      guides={simulation ? simulationGuides : starterResources}
      privateReview
      assetBase="assets"
    />
  );
}

async function main(): Promise<void> {
  const output = resolve(process.argv[2] ?? "artifacts/starter-review-rich");
  const simulation = process.argv.includes("--simulation"),
    guides = simulation ? simulationGuides : starterResources;
  await mkdir(join(output, "assets"), { recursive: true });
  await cp("public/images/guide-icons", join(output, "assets/guide-icons"), {
    recursive: true,
  });
  await cp(
    "public/images/simulation-icons",
    join(output, "assets/simulation-icons"),
    { recursive: true },
  );
  await cp("public/data/simulation-guides", join(output, "data"), {
    recursive: true,
  });
  for (const guide of editorialGuides) {
    if (
      !guide.coverImage.startsWith("/images/") ||
      guide.coverImage.includes("..")
    )
      throw new Error("Unsupported review cover.");
    const image = guide.coverImage.slice("/images/".length);
    await copyFile(join("public/images", image), join(output, "assets", image));
  }
  for (const name of [
    "forever-world.webp",
    "forever-hero.webp",
    "wow-forever-logo.png",
  ])
    await copyFile(join("public/images", name), join(output, "assets", name));
  for (const name of [
    "hall-of-thanes.webp",
    "ruins-of-lordaeron.webp",
    "excavation-site-wetlands.webp",
  ])
    await copyFile(
      join("public/images/raids/events", name),
      join(output, "assets", name),
    );
  await mkdir(join(output, "assets/raids/events"), { recursive: true });
  for (const name of [
    "hall-of-thanes.webp",
    "ruins-of-lordaeron.webp",
    "excavation-site-wetlands.webp",
  ])
    await copyFile(
      join("public/images/raids/events", name),
      join(output, "assets/raids/events", name),
    );
  const globals = (await readFile("app/globals.css", "utf8")).replaceAll(
    /^@import .*;\s*$/gm,
    "",
  );
  await writeFile(
    join(output, "review.css"),
    globals +
      "\n" +
      (await readFile("app/(site)/site.css", "utf8")) +
      "\n" +
      (await readFile("components/class-guide.css", "utf8")) +
      "\n" +
      (await readFile("components/guide-library.css", "utf8")) +
      "\n" +
      (await readFile("components/simulation-guide.css", "utf8")) +
      "\n" +
      (await readFile("scripts/guide-review.css", "utf8")),
  );
  await build({
    entryPoints: ["scripts/guide-review-browser.tsx"],
    outfile: join(output, "review.js"),
    bundle: true,
    minify: true,
    platform: "browser",
    format: "iife",
    jsx: "automatic",
    define: { "process.env": JSON.stringify({ NODE_ENV: "production" }) },
    logLevel: "warning",
  });
  await writeFile(
    join(output, "index.html"),
    document(
      "WoW Forever Guides | Private Review",
      `<div id="library-root"${simulation ? ' data-simulation="true"' : ""}>${renderToString(<Library simulation={simulation} />)}</div>`,
    ),
  );
  for (const guide of guides) {
    const scenarios: readonly TierScenario[] =
      guide.slug === dpsTierSlug ? ["raid", "solo"] : ["raid"];
    for (const scenario of scenarios)
      await writeFile(
        join(
          output,
          `${guide.slug}${guide.slug === dpsTierSlug && scenario === "solo" ? "-solo" : ""}.html`,
        ),
        document(
          guide.title,
          `<div id="guide-root" data-guide="${guide.slug}" data-scenario="${scenario}">${renderToString(<GuideReviewPage slug={guide.slug} scenario={scenario} />)}</div>`,
        ),
      );
  }
  await writeFile(
    join(output, "public-library.html"),
    document(
      "Guide Library Release Preview",
      `<div id="library-root" data-public="true">${renderToString(<GuideLibrary guides={[...editorialGuides, ...simulationGuides]} assetBase="assets" />)}</div>`,
    ),
  );
  console.log(
    JSON.stringify({
      output,
      guides: guides.length,
      publicationWrites: 0,
    }),
  );
}

main().catch((error: unknown): void => {
  console.error(
    error instanceof Error ? error.message : "Preview generation failed.",
  );
  process.exitCode = 1;
});
