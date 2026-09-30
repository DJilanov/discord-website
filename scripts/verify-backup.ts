import { readdir, readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import path from "node:path";
import assert from "node:assert/strict";

async function main(): Promise<void> {
  if (process.platform !== "linux" || process.getuid?.() !== 0)
    throw new Error("Run on the production host as root.");
  const root = "/var/backups/wow-forever-discord";
  const latest = (await readdir(root))
    .filter((name) => /^\d{4}-\d{2}-\d{2}T/.test(name))
    .sort()
    .at(-1);
  if (!latest) throw new Error("No backup found.");
  const name = `forever_restore_check_${randomBytes(6).toString("hex")}`;
  execFileSync("runuser", ["-u", "postgres", "--", "createdb", name], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    execFileSync(
      "runuser",
      [
        "-u",
        "postgres",
        "--",
        "pg_restore",
        "--exit-on-error",
        "--no-owner",
        "--no-acl",
        "-d",
        name,
      ],
      {
        input: await readFile(path.join(root, latest, "database.dump")),
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    const count = execFileSync(
      "runuser",
      [
        "-u",
        "postgres",
        "--",
        "psql",
        "-X",
        "-tA",
        "-d",
        name,
        "-c",
        'SELECT count(*) FROM "ForeverGuide" WHERE published = true',
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    assert.ok(Number(count.trim()) >= 4);
    const files = await readdir(path.join(root, latest));
    if (files.includes("bridge-boundary.sql")) {
      execFileSync(
        "runuser",
        [
          "-u",
          "postgres",
          "--",
          "psql",
          "-X",
          "-v",
          "ON_ERROR_STOP=1",
          "-d",
          name,
        ],
        {
          input: await readFile(path.join(root, latest, "bridge-boundary.sql")),
          stdio: ["pipe", "pipe", "pipe"],
        },
      );
      const bridge = execFileSync(
        "runuser",
        [
          "-u",
          "postgres",
          "--",
          "psql",
          "-X",
          "-tA",
          "-d",
          name,
          "-c",
          'SELECT count(*) FROM "ForeverBridgeRuntime" WHERE "id"=\'singleton\'',
        ],
        { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
      );
      assert.equal(Number(bridge.trim()), 1);
    }
    execFileSync(
      "tar",
      ["-tzf", path.join(root, latest, "private-files.tar.gz")],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    console.log(
      "Backup restored successfully into an isolated scratch database; private archive integrity checked. Scratch database removed.",
    );
  } finally {
    execFileSync("runuser", ["-u", "postgres", "--", "dropdb", name], {
      stdio: ["ignore", "pipe", "pipe"],
    });
  }
}
main().catch(() => {
  console.error(
    "Backup restore verification failed. Inspect the restricted server backup and PostgreSQL logs.",
  );
  process.exitCode = 1;
});
