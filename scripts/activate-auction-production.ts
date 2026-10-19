import { lstat, readFile, open, rename, chown, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { parseArgs } from "node:util";
import { parse } from "dotenv";
import { Client } from "pg";
import {
  auctionConfigurationLock,
  auctionSettingsSchema,
} from "../lib/auction/contracts";
import {
  buildAuctionDigest,
  matchesAuctionMarket,
} from "../lib/auction/engine";
import { readAuctionPack } from "../lib/auction/source";
import { discordChannelRequest } from "../lib/discord-channel-request";
import { experienceChannelSchema } from "../lib/discord-channel-experience";
import {
  experienceApplicationId,
  experienceGuildId,
} from "../content/discord-channel-experience";

async function privateEnvironment(
  path: string,
): Promise<Record<string, string>> {
  const info = await lstat(path);
  if (
    !info.isFile() ||
    info.isSymbolicLink() ||
    (info.mode & 0o077) !== 0 ||
    info.size > 65536
  )
    throw new Error("Unsafe private environment.");
  return parse(await readFile(path, "utf8"));
}
async function main(): Promise<void> {
  const args = parseArgs({
    options: {
      apply: { type: "boolean" },
      "four-hour-tips": { type: "boolean" },
    },
    strict: true,
  });
  if (
    process.platform !== "linux" ||
    process.getuid?.() !== 0 ||
    process.cwd() !== "/home/wow-forever-discord"
  )
    throw new Error("Exact production host directory and root required.");
  const web = await privateEnvironment(".env.local");
  const worker = await privateEnvironment(".env.auction");
  const client = new Client({ connectionString: web.DATABASE_URL });
  await client.connect();
  try {
    const row = (
      await client.query<{ version: number; settings: unknown }>(
        'SELECT "version","settings" FROM "ForeverAuctionConfig" WHERE "id"=$1',
        ["auction"],
      )
    ).rows[0];
    if (!row) throw new Error("Missing configuration.");
    const before = auctionSettingsSchema.parse(row.settings);
    if (before.markets.length !== 1)
      throw new Error("Preserve unrelated market configuration.");
    const market = before.markets[0];
    if (
      market.clientBuild !== 70124 ||
      market.region !== "UNKNOWN" ||
      market.realmId !== "ClassicBetaPvP" ||
      market.auctionHouseType !== "alliance" ||
      !market.enabled
    )
      throw new Error("The approved Alliance beta source changed.");
    if (before.channelId !== "1555209434458890321")
      throw new Error("Unexpected destination.");
    const settings = auctionSettingsSchema.parse({
      ...before,
      mode: "live",
      reviewedPilot: true,
      ...(args.values["four-hour-tips"]
        ? { minimumIntervalHours: 4, dailyLimit: 6 }
        : {}),
      markets: [{ ...market, coverage: "uploaded-beta-market" }],
    });
    const pack = await readAuctionPack(
      worker.AUCTION_SOURCE_URL,
      worker.AUCTION_READ_KEY,
      market,
    );
    if (!matchesAuctionMarket(market, pack))
      throw new Error("Source scope mismatch.");
    const forum = experienceChannelSchema.parse(
      await discordChannelRequest(
        {
          token: worker.AUCTION_BOT_TOKEN,
          applicationId: experienceApplicationId,
          guildId: experienceGuildId,
        },
        `/channels/${settings.channelId}`,
        "GET",
        undefined,
        {
          reason:
            "Verify owner-approved automatic Alliance beta tips destination",
        },
      ),
    );
    if (
      forum.guild_id !== experienceGuildId ||
      forum.type !== 15 ||
      forum.name !== "auction-house" ||
      !forum.available_tags?.some(
        (tag) => tag.name === "Market report" && tag.id,
      )
    )
      throw new Error("Destination does not verify.");
    const digest = buildAuctionDigest(settings.markets[0], pack, settings);
    if (!args.values.apply) {
      console.log(
        JSON.stringify({
          mode: settings.mode,
          coverage: settings.markets[0].coverage,
          intervalSeconds: 60,
          minimumIntervalHours: settings.minimumIntervalHours,
          dailyLimit: settings.dailyLimit,
          currentScanEligible: digest.eligible,
          reason: digest.reason,
        }),
      );
      return;
    }
    const info = await lstat(".env.auction");
    const temp = `.env.auction-${randomUUID()}.tmp`;
    try {
      const file = await open(temp, "wx", 0o600);
      try {
        await file.writeFile(
          Object.entries({ ...worker, AUCTION_INTERVAL_SECONDS: "60" })
            .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
            .join("\n") + "\n",
        );
        await file.sync();
      } finally {
        await file.close();
      }
      await chown(temp, info.uid, info.gid);
      await rename(temp, ".env.auction");
    } finally {
      await unlink(temp).catch((error: unknown): void => {
        if (!(
          error instanceof Error &&
          "code" in error &&
          error.code === "ENOENT"
        ))
          throw error;
      });
    }
    await client.query("BEGIN");
    try {
      await client.query("SELECT pg_advisory_xact_lock($1)", [
        auctionConfigurationLock,
      ]);
      const owner = (
        await client.query<{ id: string }>(
          'SELECT "id" FROM "ForeverUser" WHERE "role"=$1 AND "active"=true ORDER BY "createdAt" LIMIT 1',
          ["owner"],
        )
      ).rows[0];
      if (!owner) throw new Error("An active owner is required for the audit.");
      const updated = await client.query(
        'UPDATE "ForeverAuctionConfig" SET "settings"=$1,"version"="version"+1,"updatedAt"=NOW() WHERE "id"=$2 AND "version"=$3 RETURNING "version"',
        [JSON.stringify(settings), "auction", row.version],
      );
      if (updated.rowCount !== 1)
        throw new Error("Concurrent configuration edit; preserve it.");
      await client.query(
        'INSERT INTO "ForeverAuditLog"("id","actorId","action","entityType","entityId","details") VALUES ($1,$2,$3,$4,$5,$6)',
        [
          randomUUID(),
          owner.id,
          args.values["four-hour-tips"]
            ? "auction.cadence"
            : "auction.activate",
          "auction",
          "auction",
          JSON.stringify({
            version: row.version + 1,
            settings,
            intervalSeconds: 60,
            ownerRequest: args.values["four-hour-tips"]
              ? "At least four hours between Alliance tips, up to six per rolling day; no stale or repetitive tips."
              : "Automatic tips on fresh eligible Alliance uploads; no stale posts or assumed Horde/global coverage.",
          }),
        ],
      );
      await client.query("COMMIT");
    } catch (error: unknown) {
      await client.query("ROLLBACK");
      throw error;
    }
    console.log(
      JSON.stringify({
        activated: true,
        mode: "live",
        intervalSeconds: 60,
        minimumIntervalHours: settings.minimumIntervalHours,
        dailyLimit: settings.dailyLimit,
        coverage: settings.markets[0].coverage,
        currentScanEligible: digest.eligible,
        reason: digest.reason,
      }),
    );
  } finally {
    await client.end();
  }
}
void main().catch((): void => {
  console.error(
    "Auction activation stopped; secrets and raw upstream errors suppressed. Preserve current settings and review before retrying.",
  );
  process.exitCode = 1;
});
