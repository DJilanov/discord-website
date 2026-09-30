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
    let applied = 0;
    for (const id of ["001_initial", "002_grouping_rulesets"]) {
      const sql = await readFile(`prisma/migrations/${id}.sql`, "utf8");
      const checksum = createHash("sha256").update(sql).digest("hex");
      const existing = await client.query<{ checksum: string }>(
        'SELECT "checksum" FROM "ForeverMigration" WHERE "id" = $1',
        [id],
      );
      if (existing.rows[0] && existing.rows[0].checksum !== checksum)
        throw new Error(
          "Migration checksum mismatch. Add a new migration instead of changing applied SQL.",
        );
      if (!existing.rowCount) {
        await client.query(sql);
        await client.query(
          'INSERT INTO "ForeverMigration" ("id", "checksum") VALUES ($1, $2)',
          [id, checksum],
        );
        applied += 1;
      }
    }
    await client.query("COMMIT");
    console.log(
      applied
        ? `Applied ${applied} Forever migrations.`
        : "Forever schema is current.",
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
