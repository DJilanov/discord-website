import { config } from "dotenv";
import { parseArgs } from "node:util";
import { Pool } from "pg";
import { z } from "zod";
import {
  discordId,
  listingForumIds,
  listingGuildId,
  type ListingJob,
} from "../lib/discord-listings/contracts";
import {
  listingRequest,
  listingReviewNotifier,
  type ListingRequest,
} from "../lib/discord-listings/transport";
import {
  deliverListing,
  listingForum,
  notifyListingReviewer,
  syncListing,
  validateListingThread,
} from "../lib/discord-listings/engine";
import { listingStore } from "../lib/discord-listings/store";

async function main(): Promise<void> {
  config({
    path: process.env.LISTINGS_ENV_FILE ?? ".env.listings",
    quiet: true,
  });
  const env = z
    .object({
      DATABASE_URL: z.string().min(1),
      LISTINGS_BOT_TOKEN: z.string().min(30),
      LISTINGS_REVIEWER_DISCORD_ID: discordId.optional(),
      LISTINGS_INTERVAL_SECONDS: z.coerce
        .number()
        .int()
        .min(15)
        .max(300)
        .default(30),
    })
    .parse(process.env);
  const args = parseArgs({
    options: {
      once: { type: "boolean" },
      setup: { type: "boolean" },
      reconcile: { type: "string" },
      thread: { type: "string" },
      retry: { type: "string" },
    },
  });
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: 1,
    connectionTimeoutMillis: 5000,
  });
  const client = await pool.connect();
  const request = listingRequest(env.LISTINGS_BOT_TOKEN);
  const store = listingStore(client);
  let stopped = false;
  process.once("SIGTERM", (): void => {
    stopped = true;
  });
  process.once("SIGINT", (): void => {
    stopped = true;
  });
  try {
    const lock = await client.query<{ acquired: boolean }>(
      "SELECT pg_try_advisory_lock(193002029) AS acquired",
    );
    if (!lock.rows[0].acquired)
      throw new Error("listing_worker_already_running");
    await request("/users/@me");
    const guild = z
      .object({ id: z.literal(listingGuildId), owner_id: discordId })
      .parse(await request(`/guilds/${listingGuildId}`));
    const reviewerId = env.LISTINGS_REVIEWER_DISCORD_ID ?? guild.owner_id;
    const notify = listingReviewNotifier(env.LISTINGS_BOT_TOKEN, reviewerId);
    if (args.values.setup) {
      for (const id of listingForumIds) {
        await listingForum(request, id);
      }
      console.log(
        `Eight faction forums and reviewer ${reviewerId} validated; no Discord settings changed.`,
      );
      return;
    }
    if (args.values.reconcile || args.values.retry) {
      const rows = await client.query<ListingJob>(
        'SELECT * FROM "ForeverListingDiscordJob" WHERE "id"=$1',
        [args.values.reconcile ?? args.values.retry],
      );
      const job = rows.rows[0];
      if (!job) throw new Error("listing_job_not_found");
      if (args.values.reconcile) {
        if (
          !args.values.thread ||
          !["uncertain", "posting", "posted"].includes(job.status) ||
          (job.status === "posted" && job.threadId !== args.values.thread)
        )
          throw new Error("listing_reconciliation_invalid");
        await validateListingThread(request, job, args.values.thread);
        await listingForum(request, job.forumId);
        await store.update(job, {
          status: "posted",
          threadId: args.values.thread,
          lastError: null,
        });
      } else {
        if (job.status !== "failed" || job.threadId)
          throw new Error("listing_retry_not_proven_safe");
        await store.update(job, { status: "queued", lastError: null });
      }
      console.log(
        "Listing delivery state reconciled. No duplicate post created.",
      );
      return;
    }
    await client.query(
      'UPDATE "ForeverListingDiscordJob" SET "status"=\'uncertain\',"lastError"=\'Worker stopped during delivery. Reconcile Discord post before retry.\',"updatedAt"=NOW() WHERE "status"=\'posting\'',
    );
    await client.query(
      `UPDATE "ForeverListingDiscordJob"
       SET "reviewNotificationStatus"='queued',
           "reviewNotificationError"='Worker stopped while notifying the reviewer; retrying with the same Discord nonce.',
           "reviewNotificationNextAttemptAt"=NOW(),
           "updatedAt"=NOW()
       WHERE "reviewNotificationStatus"='sending'`,
    );
    do {
      let failures = 0;
      const reads = new Map<string, unknown>();
      const cycleRequest: ListingRequest = async (
        route,
        method = "GET",
        body,
        attachment,
      ): Promise<unknown> => {
        if (method === "GET" && reads.has(route)) return reads.get(route);
        const result = await request(route, method, body, attachment);
        if (method === "GET") reads.set(route, result);
        return result;
      };
      const pending = await client.query<ListingJob>(
        'SELECT * FROM "ForeverListingDiscordJob" WHERE "status"=\'queued\' AND "nextAttemptAt"<=NOW() ORDER BY "createdAt" LIMIT 5',
      );
      for (const job of pending.rows) {
        try {
          await deliverListing(cycleRequest, store, job);
        } catch {
          failures++;
          await store.update(job, {
            lastError:
              "Discord delivery check failed; no post attempted. Check forum and bot permissions.",
          });
        }
      }
      const notifications = await client.query<ListingJob>(
        `SELECT * FROM "ForeverListingDiscordJob"
         WHERE "reviewNotificationStatus"='queued'
           AND "reviewNotificationNextAttemptAt"<=NOW()
         ORDER BY "createdAt"
         LIMIT 10`,
      );
      for (const job of notifications.rows) {
        try {
          await notifyListingReviewer(notify, store, job);
        } catch {
          failures++;
        }
      }
      const linked = await client.query<ListingJob>(
        'SELECT * FROM "ForeverListingDiscordJob" WHERE "status"=\'posted\' AND ("checkedAt" IS NULL OR "checkedAt"<NOW()-INTERVAL \'25 seconds\') ORDER BY "checkedAt" ASC NULLS FIRST LIMIT 25',
      );
      for (const job of linked.rows) {
        try {
          await syncListing(cycleRequest, store, job);
        } catch {
          failures++;
          await store.update(job, {
            lastError:
              "Discord verification temporarily unavailable; no new approval granted.",
          });
        }
      }
      const held = await client.query<{ count: string }>(
        "SELECT COUNT(*) AS count FROM \"ForeverListingDiscordJob\" WHERE \"status\" IN ('uncertain','failed')",
      );
      const missed = await client.query<{ count: string }>(
        `SELECT COUNT(*) AS count FROM "ForeverListingDiscordJob"
         WHERE "reviewNotificationStatus"='failed'`,
      );
      await client.query(
        'INSERT INTO "ForeverListingDiscordHealth" ("id","checkedAt","status") VALUES (\'listings\',NOW(),$1) ON CONFLICT ("id") DO UPDATE SET "checkedAt"=NOW(),"status"=EXCLUDED."status"',
        [
          `${failures} checks failed; ${held.rows[0].count} deliveries and ${missed.rows[0].count} review notifications need attention.`,
        ],
      );
      if (args.values.once || stopped) break;
      for (
        let elapsed = 0;
        elapsed < env.LISTINGS_INTERVAL_SECONDS && !stopped;
        elapsed++
      )
        await new Promise<void>((resolve) => setTimeout(resolve, 1000));
    } while (!stopped);
  } finally {
    client.release();
    await pool.end();
  }
}
void main().catch((): void => {
  console.error(
    "Discord listings worker stopped. Inspect its private configuration and listing delivery health; raw errors suppressed.",
  );
  process.exitCode = 1;
});
