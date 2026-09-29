import "./env";
import { readFile, mkdir, writeFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { zipSync, strToU8 } from "fflate";
import { db } from "../lib/db";
import { getSafetyExport, toLua } from "../lib/safety-export";
import { storeBytes } from "../lib/storage";
import { validateAddonArchive } from "../lib/releases";

async function main(): Promise<void> {
  const version = "0.1.0-alpha.1",
    files: Record<string, Uint8Array> = {};
  for (const file of await readdir("addon/ForeverGuard"))
    files[`ForeverGuard/${file}`] = new Uint8Array(
      await readFile(`addon/ForeverGuard/${file}`),
    );
  files["ForeverGuard/Data.lua"] = strToU8(toLua(await getSafetyExport()));
  const bytes = Buffer.from(zipSync(files, { level: 6 }));
  validateAddonArchive(bytes);
  await mkdir("dist", { recursive: true });
  await writeFile(`dist/ForeverGuard-${version}.zip`, bytes);
  const existing = await db.foreverAddonRelease.findUnique({
    where: { version },
  });
  if (!existing) {
    const storageKey = await storeBytes(bytes, "zip", "application/zip");
    await db.foreverAddonRelease.create({
      data: {
        version,
        channel: "alpha",
        status: "draft",
        storageKey,
        size: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        changelog:
          "## First community alpha\n\nLocal player notes, exact character/realm/region checks, party and raid scans, tooltip context, a private report template, severity controls, and expiring reviewed data.\n\nTargets the installed Forever 1.60.1 beta client (interface 16001). Core behavior is tested outside the game. In-game UI and beta API compatibility need playtesting. No live web access, automated reports, or gameplay automation.",
      },
    });
  }
  console.log(
    `Packaged ForeverGuard ${version}. ${existing ? "Existing release preserved." : "Created a draft release for review."}`,
  );
}
main()
  .catch((error: Error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
