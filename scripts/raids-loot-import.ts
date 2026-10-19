import "./env";
import { readFile, stat } from "node:fs/promises";
import { stageCatalog } from "../lib/raids/catalog-store";
import { normalizeCatalog } from "../lib/raids/catalog";
import { db } from "../lib/db";

async function main(): Promise<void> {
  const [file, option, actorId] = process.argv.slice(2);
  if (
    !file ||
    file.startsWith("-") ||
    (option && option !== "--stage") ||
    (option === "--stage" && !actorId)
  )
    throw new Error(
      "Usage: npm run raids:loot:import -- authorized-bundle.json [--stage staff-id]",
    );
  const metadata = await stat(file);
  if (!metadata.isFile() || metadata.size > 5 * 1024 * 1024)
    throw new Error("Expected a JSON file smaller than 5 MiB.");
  const raw: unknown = JSON.parse(await readFile(file, "utf8"));
  const { bundle, checksum, warnings } = normalizeCatalog(raw);
  if (option === "--stage") {
    const staff = await db.foreverUser.findUnique({ where: { id: actorId } });
    if (!staff?.active || !["owner", "admin"].includes(staff.role))
      throw new Error("Staging requires an active owner/admin staff ID.");
    console.log(
      JSON.stringify({
        stagedId: await stageCatalog(raw, staff.id),
        checksum,
        items: bundle.items.length,
        warnings,
      }),
    );
  } else
    console.log(
      JSON.stringify({
        dryRun: true,
        checksum,
        items: bundle.items.length,
        warnings,
      }),
    );
}
main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Import failed.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
