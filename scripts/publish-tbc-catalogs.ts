import "./env";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "../lib/db";
import { normalizeCatalog, type CatalogBundle } from "../lib/raids/catalog";
import { stageCatalog, reviewCatalog } from "../lib/raids/catalog-store";
import { raidPresets } from "../lib/raids/games";

async function main(): Promise<void> {
  const [directory, action, actorId] = process.argv.slice(2);
  if (!directory || (action && (action !== "--publish" || !actorId)))
    throw new Error(
      "Usage: tsx scripts/publish-tbc-catalogs.ts catalog-directory [--publish active-staff-id]",
    );
  const filenames = (await readdir(directory)).filter((name) =>
    name.endsWith(".json"),
  );
  if (filenames.length !== 9)
    throw new Error("Expected the nine reviewed TBC source bundles.");
  const bundles: Array<{ bundle: CatalogBundle; checksum: string }> = [];
  for (const filename of filenames) {
    const source = await readFile(path.join(directory, filename), "utf8");
    if (Buffer.byteLength(source) > 1048576)
      throw new Error("Catalog is too large.");
    const { bundle, checksum } = normalizeCatalog(JSON.parse(source));
    if (
      bundle.game !== "tbc" ||
      bundle.schema !== "tbc-atlasloot-loot-candidates.v1" ||
      bundle.provenance?.archiveSha256 !==
        "dc7169b383572a9348727cb6818602247a3f08ad133a243778c4ccd5e43a8ea2"
    )
      throw new Error(
        "Expected the pinned licensed TBC source, not test or Forever data.",
      );
    bundles.push({ bundle, checksum });
  }
  if (
    new Set(bundles.map((record) => record.bundle.raidName)).size !== 9 ||
    raidPresets.tbc.some(
      (raid) => !bundles.some((record) => record.bundle.raidName === raid.name),
    )
  )
    throw new Error(
      "The source bundles do not cover the nine TBC raid choices.",
    );
  if (action) {
    const staff = await db.foreverUser.findUnique({ where: { id: actorId } });
    if (!staff?.active || !["owner", "admin"].includes(staff.role))
      throw new Error("Publication requires an active owner/admin staff ID.");
    for (const { bundle } of bundles) {
      const id = await stageCatalog(bundle, staff.id);
      const record = await db.foreverRaidCatalog.findUniqueOrThrow({
        where: { id },
      });
      if (record.status === "staged")
        await reviewCatalog(
          id,
          staff.id,
          "published",
          "Owner-authorized automated pilot import: pinned MIT AtlasLoot Revival 0.2.4 relations, validated TBC Wowhead names/class restrictions. Curated rare+ loot; partial coverage, no live client or current phase verification.",
        );
      else if (record.status !== "published")
        throw new Error(
          "A source bundle was previously rejected; publication stopped.",
        );
    }
  }
  console.log(
    `${action ? "Published" : "Validated (dry run)"} nine TBC catalogs: ${bundles.reduce((sum, record) => sum + record.bundle.items.length, 0)} raid-item entries. No existing event policies changed.`,
  );
}
main()
  .catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : "TBC publication failed.",
    );
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
