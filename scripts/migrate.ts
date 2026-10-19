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
    for (const id of [
      "001_initial",
      "002_grouping_rulesets",
      "003_discord_bridge",
      "004_bridge_audit_boundary",
      "005_bridge_admin_receipts",
      "006_bridge_channel_pairs",
      "007_bridge_test_pilot",
      "008_bridge_history",
      "009_bridge_history_rollback",
      "010_auction_research",
      "011_auction_health",
      "012_auction_publication_history",
      "013_discord_listings",
      "014_forever_raids",
      "015_forever_raid_requests",
      "016_forever_raid_interactions",
      "017_forever_raid_acknowledgement",
      "018_forever_catalog_contract",
      "019_forever_character_specialization",
      "020_forever_event_types",
      "021_forever_questing_event",
      "022_forever_raid_discord",
      "023_raid_game_editions",
      "024_raid_feedback_channels",
      "025_raid_native_interactions",
      "026_raid_role_reserves",
      "027_tbc_catalog_provenance",
      "028_raid_open_signup",
      "029_raid_event_editing",
      "030_raid_audience_revocation",
      "031_raid_repost",
      "032_raid_party_rosters",
      "033_listing_publish_then_review",
      "034_research_feedback",
      "035_raid_attendance",
      "036_raid_signup_import",
      "037_raid_discord_mirrors",
    ]) {
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
