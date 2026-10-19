import { config } from "dotenv";
import { Client } from "pg";
import { parseArgs } from "node:util";
import { auctionSettingsSchema } from "../lib/auction/contracts";
import { buildAuctionDigest } from "../lib/auction/engine";
import { readAuctionPack } from "../lib/auction/source";
import {
  auctionCopyConfiguration,
  checkAuctionCopyProvider,
  rewriteAuctionDigest,
} from "../lib/auction/copy";

config({ path: process.env.AUCTION_ENV_FILE ?? ".env.auction", quiet: true });

async function main(): Promise<void> {
  const args = parseArgs({
    options: { "check-key": { type: "boolean" } },
    strict: true,
  });
  const configuration = auctionCopyConfiguration(process.env);
  if (args.values["check-key"]) {
    const result = await checkAuctionCopyProvider(configuration);
    console.log(JSON.stringify(result));
    if (!result.ready) process.exitCode = 1;
    return;
  }
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    const row = await db.query<{ settings: unknown }>(
      'SELECT "settings" FROM "ForeverAuctionConfig" WHERE "id"=$1',
      ["auction"],
    );
    const settings = auctionSettingsSchema.parse(row.rows[0]?.settings);
    for (const market of settings.markets.filter(
      (entry): boolean => entry.enabled,
    )) {
      const pack = await readAuctionPack(
        process.env.AUCTION_SOURCE_URL ?? "",
        process.env.AUCTION_READ_KEY ?? "",
        market,
      );
      const digest = buildAuctionDigest(market, pack, settings);
      const result = await rewriteAuctionDigest(digest, configuration);
      console.log(
        JSON.stringify({
          previewOnly: true,
          publicationNotAttempted: true,
          cadenceNotEvaluated: true,
          eligible: digest.eligible,
          provider: result.provider,
          copyReason: result.reason,
          sourceAt: pack.sourceScanAt,
          title: result.digest.title,
          content: result.digest.content,
        }),
      );
    }
  } finally {
    await db.end();
  }
}
void main().catch((): void => {
  console.error(
    "Auction copy preview failed; secrets and raw provider errors suppressed. No Discord messages were sent.",
  );
  process.exitCode = 1;
});
