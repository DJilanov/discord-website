import { config } from "dotenv";
import { Client } from "pg";
import { parseArgs } from "node:util";
import {
  auctionSettingsSchema,
  auctionConfigurationLock,
} from "../lib/auction/contracts";
import { readAuctionPack } from "../lib/auction/source";
import { buildAuctionDigest } from "../lib/auction/engine";

config({ path: process.env.AUCTION_ENV_FILE ?? ".env.auction", quiet: true });

async function main(): Promise<void> {
  const args = parseArgs({
    options: { mode: { type: "string", default: "preview" } },
    strict: true,
  });
  if (!["preview", "live"].includes(args.values.mode ?? ""))
    throw new Error("Invalid expected publication mode.");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock_shared($1)", [
      auctionConfigurationLock,
    ]);
    const rows = await client.query<{ settings: unknown }>(
      'SELECT "settings" FROM "ForeverAuctionConfig" WHERE "id"=$1',
      ["auction"],
    );
    const settings = auctionSettingsSchema.parse(rows.rows[0]?.settings);
    await client.query("COMMIT");
    if (settings.mode !== args.values.mode)
      throw new Error("Unexpected publication mode.");
    for (const market of settings.markets.filter((entry) => entry.enabled)) {
      const pack = await readAuctionPack(
        process.env.AUCTION_SOURCE_URL ?? "",
        process.env.AUCTION_READ_KEY ?? "",
        market,
      );
      console.log(
        JSON.stringify({
          product: pack.clientProduct,
          build: pack.clientBuild,
          region: pack.region,
          auctionHouse: pack.auctionHouseType,
          sourceAt: pack.sourceScanAt,
          items: pack.items.length,
          eligible: buildAuctionDigest(market, pack, settings).eligible,
          reason: buildAuctionDigest(market, pack, settings).reason,
          historyCoveragePresent: pack.items.every((item) =>
            Number.isInteger(item.recentObservationCount),
          ),
        }),
      );
    }
    const receipt = await fetch(
      new URL(
        "/v1/uploads/00000000-0000-4000-8000-000000000001",
        process.env.AUCTION_SOURCE_URL,
      ),
      {
        headers: { Authorization: `Bearer ${process.env.AUCTION_READ_KEY}` },
        redirect: "error",
        signal: AbortSignal.timeout(15000),
      },
    );
    await receipt.body?.cancel();
    if (receipt.status !== 401)
      throw new Error("Read credential isolation did not verify.");
    const runs = await client.query<{ status: string; count: string }>(
      'SELECT "status",COUNT(*)::text AS count FROM "ForeverAuctionRun" GROUP BY "status"',
    );
    if (
      settings.mode === "preview" &&
      runs.rows.some((row) =>
        ["published", "pending", "uncertain"].includes(row.status),
      )
    )
      throw new Error("Unexpected public delivery in the private pilot.");
    const health = await client.query<{ status: string; checkedAt: Date }>(
      'SELECT "status","checkedAt" FROM "ForeverAuctionHealth" WHERE "id"=$1',
      ["auction"],
    );
    console.log(
      JSON.stringify({
        credentialIsolation: "verified",
        mode: settings.mode,
        intervalSeconds: process.env.AUCTION_INTERVAL_SECONDS,
        minimumIntervalHours: settings.minimumIntervalHours,
        dailyLimit: settings.dailyLimit,
        runs: runs.rows,
        health: health.rows[0] ?? null,
      }),
    );
  } finally {
    await client.end();
  }
}
void main().catch((): void => {
  console.error(
    "Auction verification failed; credential values and raw responses suppressed.",
  );
  process.exitCode = 1;
});
