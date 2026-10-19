import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { parseArgs } from "node:util";
import path from "node:path";
import { z } from "zod";
import { normalizeCatalog } from "../lib/raids/catalog";
import { raidPresets } from "../lib/raids/games";
import type { CatalogItem } from "../lib/raids/contracts";
import {
  readLuaData,
  readTbcRaidRelations,
  readTbcItemMetadata,
  tbcMetadataSchema,
  tbcLootSource,
} from "./raid-loot-source";

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      archive: { type: "string" },
      output: { type: "string" },
      cache: { type: "string" },
    },
  });
  if (!values.archive || !values.output || !values.cache)
    throw new Error(
      "Usage: tsx scripts/raids-tbc-catalogs.ts --archive release.zip --output directory --cache metadata.json",
    );
  const archive = await readFile(values.archive);
  if (
    archive.length > 1048576 ||
    createHash("sha256").update(archive).digest("hex") !==
      tbcLootSource.archiveSha256
  )
    throw new Error("Archive does not match the reviewed 0.2.4 release.");
  function entry(name: string): string {
    return execFileSync(
      "unzip",
      ["-p", values.archive!, `AtlasLootRevival/${name}`],
      { encoding: "utf8", maxBuffer: 1048576 },
    );
  }
  const raids = readTbcRaidRelations(
    readLuaData(entry("Data/TBC/Instances.lua"), "generatedInstances"),
    readLuaData(entry("Data/TBC/Loot.lua"), "generatedLoot"),
  );
  if (raids.size !== 9 || raidPresets.tbc.some((raid) => !raids.has(raid.name)))
    throw new Error(
      `Expected the nine known TBC raids; source names: ${[...raids.keys()].join(", ")}`,
    );
  const cacheSchema = z.record(
    z.string().regex(/^[1-9]\d*$/),
    tbcMetadataSchema,
  );
  let cache: z.infer<typeof cacheSchema> = {};
  try {
    cache = cacheSchema.parse(JSON.parse(await readFile(values.cache, "utf8")));
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT"))
      throw error;
  }
  const ids = [
    ...new Set(
      [...raids.values()].flatMap((rows) => rows.map((row) => row.itemId)),
    ),
  ].sort((a, b) => a - b);
  let fetched = 0;
  for (const id of ids) {
    if (cache[String(id)]) continue;
    for (let attempt = 0; ; attempt += 1) {
      const response = await fetch(
        `https://nether.wowhead.com/tbc/tooltip/item/${id}?dataEnv=5&locale=0`,
        { signal: AbortSignal.timeout(15000), redirect: "error" },
      );
      if (response.status === 429 && attempt < 4) {
        const delay = Math.max(
          1000,
          Math.min(
            120000,
            Number(response.headers.get("retry-after") || 5) * 1000,
          ),
        );
        await response.body?.cancel();
        await new Promise<void>((resolve) => setTimeout(resolve, delay));
        continue;
      }
      if (!response.ok)
        throw new Error(
          `Item metadata HTTP ${response.status} for ${id}; import stopped.`,
        );
      cache[String(id)] = readTbcItemMetadata(await response.json());
      break;
    }
    await mkdir(path.dirname(values.cache), { recursive: true });
    await writeFile(values.cache, JSON.stringify(cache));
    if (++fetched % 25 === 0)
      console.log(
        `Validated ${Object.keys(cache).length}/${ids.length} TBC item records.`,
      );
    await new Promise<void>((resolve) => setTimeout(resolve, 350));
  }
  await mkdir(values.output, { recursive: true });
  await writeFile(
    path.join(values.output, "LICENSE-AtlasLoot-Revival.txt"),
    entry("LICENSE"),
  );
  await writeFile(
    path.join(values.output, "THIRD_PARTY_NOTICES.md"),
    entry("THIRD_PARTY_NOTICES.md"),
  );
  for (const raid of raidPresets.tbc) {
    const items = new Map<number, CatalogItem>();
    for (const row of raids.get(raid.name)!) {
      const meta = cache[String(row.itemId)];
      if (meta.quality < 3) continue;
      const existing = items.get(row.itemId);
      if (existing) {
        if (!existing.lootSource.split(" / ").includes(row.source))
          existing.lootSource += ` / ${row.source}`;
      } else
        items.set(row.itemId, {
          itemId: row.itemId,
          name: meta.name,
          sourceUrl: `https://www.wowhead.com/tbc/item=${row.itemId}`,
          lootSource: row.source,
          kind: row.kind,
          classes: meta.classes,
          evidence: "source_reported",
        });
    }
    const { bundle, checksum } = normalizeCatalog({
      schema: "tbc-atlasloot-loot-candidates.v1",
      game: "tbc",
      raidName: raid.name,
      raidSourceUrl: tbcLootSource.fileUrl,
      provenance: tbcLootSource,
      sourcePatch: "TBC Classic / AtlasLoot Revival 0.2.4",
      clientBuild: null,
      availability: "confirmed",
      coverage: "partial",
      authorizedSource: true,
      capturedAt: new Date().toISOString(),
      items: [...items.values()],
    });
    const filename =
      raid.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/-$/, "") + ".json";
    await writeFile(
      path.join(values.output, filename),
      JSON.stringify(bundle, null, 2) + "\n",
    );
    console.log(
      `${raid.name}: ${bundle.items.length} source-reported reservable items (${checksum.slice(0, 12)}).`,
    );
  }
}
main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "TBC import failed.");
  process.exitCode = 1;
});
