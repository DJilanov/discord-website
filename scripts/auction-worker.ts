import { config } from "dotenv";
import { parseArgs } from "node:util";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { z } from "zod";
import {
  experienceApplicationId,
  experienceGuildId,
} from "../content/discord-channel-experience";
import { tradingNames } from "../content/discord-trading";
import { discordChannelRequest } from "../lib/discord-channel-request";
import { experienceChannelSchema } from "../lib/discord-channel-experience";
import {
  auctionSettingsSchema,
  auctionObservationsSchema,
  auctionConfigurationLock,
  type AuctionMarket,
  type AuctionSettings,
  type AuctionPublication,
} from "../lib/auction/contracts";
import {
  auctionJobKey,
  auctionMarketKey,
  auctionPublicationHold,
  buildAuctionDigest,
} from "../lib/auction/engine";
import { readAuctionPack } from "../lib/auction/source";
import {
  auctionCopyConfiguration,
  rewriteAuctionDigest,
} from "../lib/auction/copy";

interface Configuration {
  version: number;
  settings: AuctionSettings;
}
interface PublishedRun {
  id: string;
  channelId: string;
  threadId: string;
  messageId: string;
  content: string;
  sourceAt: Date;
}
const environmentSchema = z.object({
  DATABASE_URL: z.string().min(1),
  AUCTION_SOURCE_URL: z.url(),
  AUCTION_READ_KEY: z.string().min(32),
  AUCTION_BOT_TOKEN: z.string().min(30),
  AUCTION_INTERVAL_SECONDS: z.coerce
    .number()
    .int()
    .min(60)
    .max(3600)
    .default(900),
});
config({ path: process.env.AUCTION_ENV_FILE ?? ".env.auction", quiet: true });

async function main(): Promise<void> {
  const args = parseArgs({
    options: { once: { type: "boolean" } },
    strict: true,
  });
  const env = environmentSchema.parse(process.env);
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: 2,
    connectionTimeoutMillis: 5000,
  });
  const client = await pool.connect();
  let stopped = false;
  process.once("SIGTERM", (): void => {
    stopped = true;
  });
  process.once("SIGINT", (): void => {
    stopped = true;
  });
  const credentials = {
    applicationId: experienceApplicationId,
    guildId: experienceGuildId,
    token: env.AUCTION_BOT_TOKEN,
  };
  const copyConfiguration = auctionCopyConfiguration(process.env);
  const request = (
    route: string,
    method: "GET" | "POST" | "PATCH" = "GET",
    body?: unknown,
  ): Promise<unknown> =>
    discordChannelRequest(credentials, route, method, body, {
      reason: "Reviewed, scoped Auction House observations; no game automation",
    });
  const configuration = async (): Promise<Configuration | null> => {
    const result = await client.query<{ version: number; settings: unknown }>(
      'SELECT "version","settings" FROM "ForeverAuctionConfig" WHERE "id"=$1',
      ["auction"],
    );
    return result.rows[0]
      ? {
          version: result.rows[0].version,
          settings: auctionSettingsSchema.parse(result.rows[0].settings),
        }
      : null;
  };
  const health = async (status: string): Promise<void> => {
    await client.query(
      'INSERT INTO "ForeverAuctionHealth" ("id","checkedAt","status") VALUES ($1,NOW(),$2) ON CONFLICT ("id") DO UPDATE SET "checkedAt"=NOW(),"status"=EXCLUDED."status"',
      ["auction", status],
    );
  };
  const expire = async (settings: AuctionSettings): Promise<number> => {
    let failures = 0;
    const rows = await client.query<PublishedRun>(
      'SELECT "id","channelId","threadId","messageId","content","sourceAt" FROM "ForeverAuctionRun" WHERE "status"=$1 AND "sourceAt" < $2 LIMIT 20',
      ["published", new Date(Date.now() - settings.freshMinutes * 60000)],
    );
    for (const row of rows.rows) {
      try {
        const thread = z
          .object({
            guild_id: z.literal(experienceGuildId),
            parent_id: z.string(),
          })
          .parse(await request(`/channels/${row.threadId}`));
        const message = z
          .object({
            author: z.object({ id: z.string() }),
            content: z.string(),
            channel_id: z.string(),
          })
          .parse(
            await request(
              `/channels/${row.threadId}/messages/${row.messageId}`,
            ),
          );
        if (
          thread.guild_id !== experienceGuildId ||
          thread.parent_id !== row.channelId ||
          message.author.id !== experienceApplicationId ||
          message.channel_id !== row.threadId ||
          message.content !== row.content
        )
          throw new Error("expiry_identity_mismatch");
        const content = `**EXPIRED: source data is no longer fresh. Reference only; verify in game.**\n\n${row.content}`;
        if (content.length > 2000) throw new Error("expiry_message_too_long");
        await request(
          `/channels/${row.threadId}/messages/${row.messageId}`,
          "PATCH",
          { content, allowed_mentions: { parse: [] } },
        );
        await client.query(
          'UPDATE "ForeverAuctionRun" SET "status"=$2,"content"=$3,"updatedAt"=NOW() WHERE "id"=$1',
          [row.id, "stale", content],
        );
      } catch {
        failures++;
      }
    }
    return failures;
  };
  const checkMarket = async (
    config: Configuration,
    market: AuctionMarket,
  ): Promise<void> => {
    const pack = await readAuctionPack(
      env.AUCTION_SOURCE_URL,
      env.AUCTION_READ_KEY,
      market,
    );
    const marketKey = auctionMarketKey(market);
    const recent = await client.query<{
      sourceScanId: string;
      sourceAt: Date;
      publishedAt: Date;
      observations: unknown;
    }>(
      'SELECT "sourceScanId","sourceAt","publishedAt","observations" FROM "ForeverAuctionRun" WHERE "marketKey"=$1 AND "status" IN ($2,$3) AND "publishedAt">=NOW()-INTERVAL \'24 hours\' ORDER BY "publishedAt" DESC',
      [marketKey, "published", "stale"],
    );
    const publications: AuctionPublication[] = recent.rows.map((row) => ({
      ...row,
      observations: auctionObservationsSchema.parse(row.observations),
    }));
    const previous = publications.flatMap(
      (publication) => publication.observations,
    );
    const digest = buildAuctionDigest(
      market,
      pack,
      config.settings,
      new Date(),
      previous,
    );
    const key = auctionJobKey(
        market,
        pack,
        config.version,
        config.settings.mode,
      ),
      id = randomUUID();
    // Only undelivered jobs may be reconsidered when a cooldown expires.
    const inserted = await client.query<{ id: string }>(
      'INSERT INTO "ForeverAuctionRun" ("id","jobKey","marketKey","sourceScanId","sourceAt","mode","status","reason","title","content","observations") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT ("jobKey") DO UPDATE SET "reason"=EXCLUDED."reason","title"=EXCLUDED."title","content"=EXCLUDED."content","observations"=EXCLUDED."observations" WHERE "ForeverAuctionRun"."status"=\'skipped\' AND EXCLUDED."mode"=\'live\' RETURNING "id"',
      [
        id,
        key,
        marketKey,
        pack.sourceScanId,
        new Date(pack.sourceScanAt),
        config.settings.mode,
        config.settings.mode === "preview" ? "preview" : "skipped",
        digest.reason,
        digest.title,
        digest.content,
        JSON.stringify(digest.observations),
      ],
    );
    if (
      !inserted.rowCount ||
      config.settings.mode !== "live" ||
      !digest.eligible
    )
      return;
    const runId = inserted.rows[0].id;
    const alreadyPublished = await client.query(
      'SELECT "id" FROM "ForeverAuctionRun" WHERE "marketKey"=$1 AND "sourceScanId"=$2 AND "status" IN ($3,$4) LIMIT 1',
      [marketKey, pack.sourceScanId, "published", "stale"],
    );
    const hold = await client.query(
      'SELECT "id" FROM "ForeverAuctionRun" WHERE "marketKey"=$1 AND "status" IN ($2,$3) LIMIT 1',
      [marketKey, "pending", "uncertain"],
    );
    const cadenceHold = auctionPublicationHold(publications, config.settings);
    const outOfOrder = publications.some(
      (publication) =>
        publication.sourceAt.getTime() >= Date.parse(pack.sourceScanAt),
    );
    if (
      alreadyPublished.rowCount ||
      hold.rowCount ||
      cadenceHold ||
      outOfOrder
    ) {
      await client.query(
        'UPDATE "ForeverAuctionRun" SET "reason"=$2 WHERE "id"=$1',
        [
          runId,
          alreadyPublished.rowCount
            ? "This source scan already produced a public report. Waiting for a new upload."
            : hold.rowCount
              ? "Uncertain delivery blocks this market until reconciliation."
              : outOfOrder
                ? "An equal or newer source scan has already been reported. Waiting for a new upload."
                : cadenceHold,
        ],
      );
      return;
    }
    const forum = experienceChannelSchema.parse(
      await request(`/channels/${config.settings.channelId}`),
    );
    if (
      forum.guild_id !== experienceGuildId ||
      forum.type !== 15 ||
      forum.name !== tradingNames.auction
    )
      throw new Error("destination_scope_invalid");
    const tag = forum.available_tags?.find((t) => t.name === "Market report");
    if (!tag?.id) throw new Error("destination_tag_missing");
    // Paid copy generation runs only after scope, history, cadence and delivery holds pass.
    const copy = await rewriteAuctionDigest(digest, copyConfiguration);
    const publication = copy.digest;
    await client.query(
      'UPDATE "ForeverAuctionRun" SET "status"=$2,"channelId"=$3,"title"=$4,"content"=$5,"reason"=$6,"updatedAt"=NOW() WHERE "id"=$1',
      [
        runId,
        "pending",
        forum.id,
        publication.title,
        publication.content,
        `${publication.reason} Copy: ${copy.provider} (${copy.reason}).`,
      ],
    );
    let transaction = false;
    try {
      await client.query("BEGIN");
      transaction = true;
      // Row locks require UPDATE permission; coordinate with admin via advisory locks.
      await client.query("SELECT pg_advisory_xact_lock_shared($1)", [
        auctionConfigurationLock,
      ]);
      const locked = await client.query<{ version: number; settings: unknown }>(
        'SELECT "version","settings" FROM "ForeverAuctionConfig" WHERE "id"=$1',
        ["auction"],
      );
      const current = locked.rows[0];
      if (
        !current ||
        current.version !== config.version ||
        auctionSettingsSchema.parse(current.settings).mode !== "live" ||
        !buildAuctionDigest(market, pack, config.settings, new Date(), previous)
          .eligible
      ) {
        await client.query(
          'UPDATE "ForeverAuctionRun" SET "status"=$2,"reason"=$3 WHERE "id"=$1',
          [
            runId,
            "skipped",
            "Configuration or data freshness changed before publication.",
          ],
        );
        await client.query("COMMIT");
        transaction = false;
        return;
      }
      const result = z
        .object({
          id: z.string().regex(/^[1-9]\d{16,19}$/),
          guild_id: z.literal(experienceGuildId),
          parent_id: z.literal(forum.id),
          message: z.object({
            id: z.string().regex(/^[1-9]\d{16,19}$/),
            author: z.object({ id: z.literal(experienceApplicationId) }),
            content: z.literal(publication.content),
          }),
        })
        .parse(
          await request(`/channels/${forum.id}/threads`, "POST", {
            name: publication.title,
            applied_tags: [tag.id],
            auto_archive_duration: 10080,
            message: {
              content: publication.content,
              allowed_mentions: { parse: [] },
              flags: 4096,
            },
          }),
        );
      await client.query(
        'UPDATE "ForeverAuctionRun" SET "status"=$2,"threadId"=$3,"messageId"=$4,"publishedAt"=clock_timestamp(),"updatedAt"=NOW() WHERE "id"=$1',
        [runId, "published", result.id, result.message.id],
      );
      await client.query("COMMIT");
      transaction = false;
    } catch {
      if (transaction) await client.query("ROLLBACK");
      await client.query(
        'UPDATE "ForeverAuctionRun" SET "status"=$2,"reason"=$3,"updatedAt"=NOW() WHERE "id"=$1',
        [
          runId,
          "uncertain",
          "Discord delivery could not be confirmed. Inspect Discord before retrying; automatic republication is blocked.",
        ],
      );
    }
  };
  try {
    const lock = await client.query<{ acquired: boolean }>(
      "SELECT pg_try_advisory_lock(193002027) AS acquired",
    );
    if (!lock.rows[0].acquired) throw new Error("worker_already_running");
    do {
      try {
        const current = await configuration();
        if (!current) await health("Awaiting Auction House configuration.");
        else {
          const expiryFailures = await expire(current.settings);
          let failures = 0;
          if (current.settings.mode !== "paused")
            for (const market of current.settings.markets.filter(
              (m) => m.enabled,
            )) {
              try {
                await checkMarket(current, market);
              } catch {
                failures++;
              }
            }
          await health(
            expiryFailures
              ? `${expiryFailures} published report expiries need moderator review; ${failures} source checks failed. No replacement posted.`
              : failures
                ? `${failures} market source checks failed; no recommendations posted for them.`
                : current.settings.mode === "paused"
                  ? "Publication paused"
                  : current.settings.markets.some((m) => m.enabled)
                    ? `${current.settings.mode} checks completed`
                    : "Awaiting an enabled market.",
          );
        }
        await client.query(
          'DELETE FROM "ForeverAuctionRun" WHERE "status" IN ($1,$2) AND "createdAt"<NOW()-INTERVAL \'30 days\'',
          ["preview", "skipped"],
        );
      } catch {
        await health("Auction check failed; publication withheld.");
      }
      if (args.values.once || stopped) break;
      for (
        let elapsed = 0;
        elapsed < env.AUCTION_INTERVAL_SECONDS && !stopped;
        elapsed++
      )
        await new Promise<void>((resolve) => setTimeout(resolve, 1000));
    } while (!stopped);
  } finally {
    await client
      .query("SELECT pg_advisory_unlock(193002027)")
      .catch(() => undefined);
    client.release();
    await pool.end();
  }
  console.log(
    "Auction worker check completed; inspect /admin/auction for private previews and health.",
  );
}
void main().catch((): void => {
  console.error(
    "Auction worker stopped. Check its private environment and database migration; raw errors suppressed.",
  );
  process.exitCode = 1;
});
