import { readFile, readdir, mkdir, writeFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";
import {
  itemDetailsBundleSchema,
  type ItemDetails,
} from "../lib/raids/item-detail-contracts";
import { catalogBundleSchema } from "../lib/raids/catalog";
import { readRaidItemXml } from "./raid-item-source";

async function main(): Promise<void> {
  const game = process.argv[2];
  if (game !== "tbc" && game !== "forever")
    throw new Error("Choose tbc or forever.");
  const root = resolve("content/raid-catalogs", game);
  const wanted = new Map<number, string>();
  for (const file of (await readdir(root)).filter((name) =>
    name.endsWith(".json"),
  )) {
    const bundle = catalogBundleSchema.parse(
      JSON.parse(await readFile(resolve(root, file), "utf8")),
    );
    if (bundle.game !== game) throw new Error("Catalog edition mismatch.");
    for (const item of bundle.items) wanted.set(item.itemId, item.name);
  }
  if (!wanted.size) throw new Error("No reviewed item sources.");
  const output = resolve("content/raid-items", `${game}.json`);
  const icons = resolve("public/images/raids/items", game);
  await mkdir(resolve("content/raid-items"), { recursive: true });
  await mkdir(icons, { recursive: true });
  let items: Record<string, ItemDetails> = {};
  try {
    items = itemDetailsBundleSchema.parse(
      JSON.parse(await readFile(output, "utf8")),
    ).items;
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT"))
      throw error;
  }
  async function source(url: string): Promise<Response> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(20000),
        redirect: "error",
      });
      if (response.status === 429 && attempt < 4) {
        const delay = Math.min(
          120000,
          Math.max(
            1000,
            Number(response.headers.get("retry-after") || 5) * 1000,
          ),
        );
        await response.body?.cancel();
        await new Promise<void>((done) => setTimeout(done, delay));
        continue;
      }
      if (!response.ok)
        throw new Error(
          `Item source HTTP ${response.status}; stopped without bypassing access restrictions.`,
        );
      return response;
    }
    throw new Error("Item source rate limit.");
  }
  const save = async (): Promise<void> => {
    await writeFile(
      output,
      JSON.stringify(
        itemDetailsBundleSchema.parse({
          schema: "raid-item-details.v1",
          game,
          capturedAt: new Date().toISOString(),
          provider: "Wowhead",
          items,
        }),
      ) + "\n",
    );
  };
  let count = 0;
  for (const [id, name] of wanted) {
    if (!items[String(id)] || process.argv.includes("--refresh")) {
      const response = await source(
        `https://www.wowhead.com/${game}/item=${id}&xml`,
      );
      const xml = await response.text();
      const detail = readRaidItemXml(xml, id, game);
      if (detail.name !== name)
        throw new Error(`Catalog name mismatch for ${id}.`);
      items[String(id)] = detail;
    }
    const target = resolve(icons, `${items[String(id)].icon}.jpg`);
    try {
      await stat(target);
    } catch (error) {
      if (!(
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ))
        throw error;
      const response = await source(
        `https://wow.zamimg.com/images/wow/icons/large/${items[String(id)].icon}.jpg`,
      );
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.length > 100000) throw new Error("Item icon too large.");
      await sharp(bytes).resize(56, 56).jpeg({ quality: 90 }).toFile(target);
    }
    if (++count % 25 === 0) {
      await save();
      console.log(`Validated item details and icons: ${count}/${wanted.size}`);
    }
    await new Promise<void>((done) => setTimeout(done, 100));
  }
  await save();
  console.log(
    `Imported ${wanted.size} edition-specific item records with local icons.`,
  );
}
void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Item import failed.");
  process.exitCode = 1;
});
