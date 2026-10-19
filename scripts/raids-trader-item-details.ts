import { readFile, readdir, mkdir, writeFile, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import sharp from "sharp";
import ts from "typescript";
import { z } from "zod";
import { catalogBundleSchema } from "../lib/raids/catalog";
import {
  itemDetailsSchema,
  itemDetailsBundleSchema,
  type ItemDetails,
} from "../lib/raids/item-detail-contracts";

const traderRecordSchema = z
  .object({
    itemId: z.number().int().positive(),
    name: z.string(),
    quality: z.number().int(),
    iconFileDataId: z.number().int().positive(),
    classId: z.number().int(),
    subclassId: z.number().int(),
    binding: z.number().int(),
    teaches: z.array(z.object({ recipeSpellId: z.number().int() })),
    build: z.object({
      number: z.number().int().positive(),
      version: z.string(),
    }),
    effects: z.array(z.unknown()),
    itemSet: z
      .object({ effects: z.array(z.unknown()) })
      .passthrough()
      .nullable(),
  })
  .passthrough();

async function main(): Promise<void> {
  const traderRoot = resolve(process.argv[2] || "../wow-trader");
  const mediaRoot = process.argv[3];
  if (!mediaRoot || !mediaRoot.startsWith("/"))
    throw new Error(
      "Specify the owned WoW Trader checkout and absolute TBC icon directory.",
    );
  const data = (await import(
    pathToFileURL(resolve(traderRoot, "apps/web/src/lib/data.ts")).href
  )) as {
    getItemDetail: (id: number, product: string) => Promise<unknown>;
  };
  // Next preserves JSX for its bundler; the standalone exporter needs automatic JSX.
  const tooltipSource = resolve(
    traderRoot,
    "apps/web/src/components/item-tooltip.tsx",
  );
  const temporaryView = resolve(
    traderRoot,
    `apps/web/src/components/.raid-tooltip-export-${process.pid}.mjs`,
  );
  await writeFile(
    temporaryView,
    ts.transpileModule(await readFile(tooltipSource, "utf8"), {
      compilerOptions: {
        jsx: ts.JsxEmit.ReactJSX,
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
  );
  const view = (await import(pathToFileURL(temporaryView).href).finally(() =>
    unlink(temporaryView),
  )) as {
    ItemTooltipContent: ComponentType<{
      item: unknown;
      viewerClassId: null;
      viewerLevel: null;
      linkSetMembers: false;
      usePageHeading: false;
    }>;
  };
  const formatter = (await import(
    pathToFileURL(resolve(traderRoot, "apps/web/src/lib/item-tooltip.ts")).href
  )) as {
    formatItemEffect: (effect: unknown) => { exact: boolean };
  };
  const wanted = new Map<number, string>();
  const root = resolve("content/raid-catalogs/tbc");
  for (const file of (await readdir(root)).filter((name) =>
    name.endsWith(".json"),
  )) {
    const bundle = catalogBundleSchema.parse(
      JSON.parse(await readFile(resolve(root, file), "utf8")),
    );
    if (bundle.game !== "tbc")
      throw new Error("Only TBC client data may enrich TBC catalogs.");
    for (const item of bundle.items) wanted.set(item.itemId, item.name);
  }
  const items: Record<string, ItemDetails> = {};
  const icons = resolve("public/images/raids/items/tbc");
  await mkdir(icons, { recursive: true });
  const mismatches: number[] = [];
  for (const [id, name] of wanted) {
    const record = traderRecordSchema.parse(
      await data.getItemDetail(id, "wow_anniversary"),
    );
    if (
      record.itemId !== id ||
      record.build.number !== 69795 ||
      record.build.version !== "2.5.6.69795"
    )
      throw new Error(`Unreviewed client build or identity for ${id}.`);
    if (record.name !== name) {
      mismatches.push(id);
      continue;
    }
    const html = renderToStaticMarkup(
      createElement(view.ItemTooltipContent, {
        item: record,
        viewerClassId: null,
        viewerLevel: null,
        linkSetMembers: false,
        usePageHeading: false,
      }),
    );
    const document = load(html);
    const lines: ItemDetails["lines"] = [];
    document(".wow-tooltip p, .wow-tooltip-set-members li")
      .not(".wow-tooltip-name")
      .each((_index, node) => {
        const element = document(node);
        const split = element.hasClass("wow-tooltip-split");
        const left = (
          split ? element.children().first().text() : element.text()
        )
          .replace(/\s+/g, " ")
          .trim();
        const right = split
          ? element.children().last().text().replace(/\s+/g, " ").trim()
          : "";
        const tone = element.hasClass("wow-tooltip-effect")
          ? "effect"
          : element.hasClass("wow-tooltip-socket") ||
              element.hasClass("wow-tooltip-socket-bonus")
            ? "socket"
            : element.hasClass("wow-tooltip-muted") || node.name === "li"
              ? "muted"
              : "normal";
        if (left || right) lines.push({ left, right, tone });
      });
    const icon = `client_${record.iconFileDataId}`;
    const bytes = await readFile(
      resolve(mediaRoot, `${record.iconFileDataId}.png`),
    );
    await sharp(bytes)
      .resize(56, 56)
      .jpeg({ quality: 90 })
      .toFile(resolve(icons, `${icon}.jpg`));
    items[String(id)] = itemDetailsSchema.parse({
      itemId: id,
      name,
      quality: record.quality,
      icon,
      classId: record.classId,
      subclassId: record.subclassId,
      binding:
        record.binding === 2
          ? "equip"
          : record.binding === 1
            ? "pickup"
            : record.binding === 3
              ? "use"
              : "none",
      professionBook: record.teaches.length > 0,
      lines,
      source: {
        provider: "WoW Trader",
        buildNumber: record.build.number,
        unresolvedEffects: [
          ...record.effects,
          ...(record.itemSet?.effects ?? []),
        ].filter((effect) => !formatter.formatItemEffect(effect).exact).length,
      },
    });
    if (Object.keys(items).length % 50 === 0)
      console.log(
        `Validated owned-client items: ${Object.keys(items).length}/${wanted.size}`,
      );
  }
  if (mismatches.length)
    throw new Error(
      `Review client/catalog name differences for item IDs: ${mismatches.join(", ")}`,
    );
  await mkdir(resolve("content/raid-items"), { recursive: true });
  await writeFile(
    resolve("content/raid-items/tbc.json"),
    JSON.stringify(
      itemDetailsBundleSchema.parse({
        schema: "raid-item-details.v1",
        game: "tbc",
        capturedAt: new Date().toISOString(),
        provider: "WoW Trader",
        items,
      }),
    ) + "\n",
  );
  console.log(
    `Imported ${wanted.size} reviewed TBC client records and local icons. Immutable loot catalogs unchanged.`,
  );
}
void main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : "Owned-client import failed.",
    );
    process.exit(1);
  });
