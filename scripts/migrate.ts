import "./env";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { Client } from "pg";

async function main(): Promise<void> {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(193002026)");
    await client.query(
      'CREATE TABLE IF NOT EXISTS "ForeverMigration" ("id" TEXT PRIMARY KEY, "checksum" TEXT NOT NULL, "appliedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW())',
    );
    const sql = await readFile("prisma/migrations/001_initial.sql", "utf8");
    const checksum = createHash("sha256").update(sql).digest("hex");
    const existing = await client.query<{ checksum: string }>(
      'SELECT "checksum" FROM "ForeverMigration" WHERE "id" = $1',
      ["001_initial"],
    );
    if (existing.rows[0] && existing.rows[0].checksum !== checksum)
      throw new Error(
        "Migration checksum mismatch. Add a new migration instead of changing applied SQL.",
      );
    if (!existing.rowCount) {
      await client.query(sql);
      await client.query(
        'INSERT INTO "ForeverMigration" ("id", "checksum") VALUES ($1, $2)',
        ["001_initial", checksum],
      );
    }
    await client.query("COMMIT");
    console.log(
      existing.rowCount
        ? "Forever schema is current."
        : "Created Forever tables; existing tables were not modified.",
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}
main().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});
