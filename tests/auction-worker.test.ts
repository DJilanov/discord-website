import "../scripts/env";
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { Client } from "pg";
import {
  auctionSettingsSchema,
  defaultAuctionSettings,
  type AuctionPack,
} from "../lib/auction/contracts";
import {
  experienceApplicationId,
  experienceGuildId,
} from "../content/discord-channel-experience";

test(
  "live worker enforces four-hour spacing, suppresses repeated advice, retries held fresh scans, expires tips and holds uncertain delivery",
  { timeout: 120000 },
  async (): Promise<void> => {
    const database = new URL(process.env.DATABASE_URL ?? "");
    assert.ok(
      ["localhost", "127.0.0.1"].includes(database.hostname) &&
        database.port === "55432",
      "Isolated local database required",
    );
    const db = new Client({ connectionString: database.toString() });
    await db.connect();
    const forumId = "1555209434458890321";
    const market = {
      clientProduct: "wow_classic_beta" as const,
      clientBuild: 70124,
      region: "UNKNOWN" as const,
      realmId: "WorkerTestMarket",
      auctionHouseType: "alliance" as const,
      enabled: true,
      coverage: "uploaded-beta-market" as const,
    };
    const settings = auctionSettingsSchema.parse({
      ...defaultAuctionSettings,
      mode: "live",
      reviewedPilot: true,
      channelId: forumId,
      minimumIntervalHours: 4,
      dailyLimit: 6,
      markets: [market],
    });
    const fresh = (): AuctionPack => ({
      schemaVersion: "market-intelligence.v1",
      modelVersion: "robust-market-signal-v1",
      ...market,
      sourceScanId: randomUUID(),
      sourceScanAt: new Date(Date.now() - 60000).toISOString(),
      generatedAt: new Date().toISOString(),
      items: [
        {
          itemId: 123,
          name: "Worker test material",
          signal: "bargain",
          observationCount: 24,
          minimumObservationCount: 6,
          recentObservationCount: 24,
          historyStartedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
          currentPriceCopper: "10000",
          normalPriceCopper: "15000",
          differenceBasisPoints: -3333,
          currentQuantity: 50,
          currentListingCount: 10,
          confidenceBasisPoints: 9000,
        },
      ],
    });
    let pack = fresh(),
      posts = 0,
      copyRequests = 0,
      copyUnavailable = false,
      expireAfterCopy = false,
      uncertain = false,
      initialized = false;
    const published = new Map<
      string,
      {
        id: string;
        author: { id: string };
        channel_id: string;
        content: string;
      }
    >();
    const server = createServer(
      (request: IncomingMessage, response: ServerResponse): void => {
        void (async (): Promise<void> => {
          const route = new URL(request.url ?? "/", "http://127.0.0.1")
            .pathname;
          let body = "";
          for await (const chunk of request) body += String(chunk);
          const send = (data: unknown, status = 200): void => {
            response.writeHead(status, { "Content-Type": "application/json" });
            response.end(JSON.stringify(data));
          };
          if (route === "/v1/market-intelligence") {
            send(pack);
            return;
          }
          if (route === "/mock-deepseek") {
            copyRequests++;
            if (copyUnavailable) {
              send({ error: "mock_copy_unavailable" }, 503);
              return;
            }
            const input = JSON.parse(body) as {
              messages: { content: string }[];
              model: string;
            };
            assert.equal(input.model, "deepseek-v4-pro");
            const context = JSON.parse(input.messages[1].content) as {
              items: { itemId: number }[];
            };
            send({
              choices: [
                {
                  finish_reason: "stop",
                  message: {
                    role: "assistant",
                    content: JSON.stringify({
                      intro:
                        "A quick check before your next Auction House visit.",
                      notes: context.items.map((item) => ({
                        itemId: item.itemId,
                        text: "Compare nearby listings before buying what you need.",
                      })),
                    }),
                  },
                },
              ],
            });
            return;
          }
          if (route === `/mock-discord/channels/${forumId}`) {
            send({
              id: forumId,
              guild_id: experienceGuildId,
              type: 15,
              name: "auction-house",
              position: 0,
              parent_id: "1554319035112497244",
              permission_overwrites: [],
              available_tags: [
                {
                  id: "1555209000000000010",
                  name: "Market report",
                  moderated: false,
                },
              ],
            });
            return;
          }
          if (
            route === `/mock-discord/channels/${forumId}/threads` &&
            request.method === "POST"
          ) {
            posts++;
            if (uncertain) {
              send({ error: "test_unconfirmed_delivery" }, 503);
              return;
            }
            const input = JSON.parse(body) as {
              message: {
                content: string;
                allowed_mentions: { parse: string[] };
              };
            };
            assert.deepEqual(input.message.allowed_mentions.parse, []);
            const id = String(1555209000000000100n + BigInt(posts));
            const message = {
              id,
              channel_id: id,
              author: { id: experienceApplicationId },
              content: input.message.content,
            };
            published.set(id, message);
            send({
              id,
              guild_id: experienceGuildId,
              parent_id: forumId,
              message,
            });
            return;
          }
          const match =
            /^\/mock-discord\/channels\/(\d+)(?:\/messages\/\d+)?$/.exec(route);
          const message = match ? published.get(match[1]) : undefined;
          if (message) {
            if (route.includes("/messages/")) {
              if (request.method === "PATCH")
                message.content = (
                  JSON.parse(body) as { content: string }
                ).content;
              send(message);
            } else
              send({
                id: message.id,
                guild_id: experienceGuildId,
                parent_id: forumId,
              });
            return;
          }
          send({ error: "unexpected_test_route" }, 404);
        })().catch((): void => {
          response.writeHead(500);
          response.end();
        });
      },
    );
    const run = async (): Promise<void> => {
      const address = server.address();
      assert.ok(address && typeof address !== "string");
      const child = spawn(
        process.execPath,
        [
          "--import",
          "tsx",
          "--import",
          "./tests/fixtures/auction-worker-transport.mjs",
          "scripts/auction-worker.ts",
          "--once",
        ],
        {
          cwd: process.cwd(),
          env: {
            ...process.env,
            NODE_ENV: "test",
            DATABASE_URL: database.toString(),
            AUCTION_ENV_FILE: "/nonexistent-auction-test-environment",
            AUCTION_SOURCE_URL: `http://127.0.0.1:${address.port}`,
            AUCTION_READ_KEY: "auction-read-test-key-not-real-12345",
            AUCTION_BOT_TOKEN: "auction-worker-test-token-not-real",
            DEEPSEEK_API_KEY: "deepseek-worker-test-key-not-real-123",
            DEEPSEEK_MODEL: "deepseek-v4-pro",
            AUCTION_TEST_EXPIRE_AFTER_COPY: expireAfterCopy ? "1" : "0",
          },
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      let output = "";
      child.stdout.on("data", (chunk: Buffer): void => {
        output += chunk.toString();
      });
      child.stderr.on("data", (chunk: Buffer): void => {
        output += chunk.toString();
      });
      const [code] = await once(child, "exit");
      assert.equal(code, 0, output);
      const health = (
        await db.query<{ status: string }>(
          'SELECT "status" FROM "ForeverAuctionHealth" WHERE "id"=$1',
          ["auction"],
        )
      ).rows[0];
      assert.equal(
        health?.status,
        "live checks completed",
        JSON.stringify({
          runs: (
            await db.query('SELECT "status","reason" FROM "ForeverAuctionRun"')
          ).rows,
          posts,
          output,
        }),
      );
    };
    try {
      const exists = await db.query(
        'SELECT 1 FROM "ForeverAuctionConfig" UNION ALL SELECT 1 FROM "ForeverAuctionRun" UNION ALL SELECT 1 FROM "ForeverAuctionHealth" LIMIT 1',
      );
      assert.equal(
        exists.rowCount,
        0,
        "Preserve existing Auction House state; use a fresh test database",
      );
      await db.query(
        'INSERT INTO "ForeverAuctionConfig"("id","settings","updatedAt") VALUES ($1,$2,NOW())',
        ["auction", JSON.stringify(settings)],
      );
      initialized = true;
      server.listen(0, "127.0.0.1");
      await once(server, "listening");
      pack.sourceScanAt = new Date(Date.now() - 4 * 3600000).toISOString();
      await run();
      assert.equal(posts, 0);
      assert.equal(copyRequests, 0);
      pack = fresh();
      await run();
      assert.equal(posts, 1);
      assert.equal(copyRequests, 1);
      assert.match(
        [...published.values()][0].content,
        /Compare nearby listings before buying/,
      );
      await run();
      assert.equal(posts, 1);
      assert.equal(copyRequests, 1);
      await db.query('UPDATE "ForeverAuctionConfig" SET "version"="version"+1');
      await run();
      assert.equal(posts, 1);
      pack = fresh();
      pack.items[0].currentListingCount = 1;
      await run();
      assert.equal(posts, 1);
      pack = fresh();
      await run();
      assert.equal(posts, 1);
      assert.equal(
        (
          await db.query<{ reason: string }>(
            'SELECT "reason" FROM "ForeverAuctionRun" WHERE "sourceScanId"=$1',
            [pack.sourceScanId],
          )
        ).rows[0].reason.startsWith("Nothing meaningfully new"),
        true,
      );
      pack = fresh();
      pack.items[0].itemId = 456;
      await run();
      assert.equal(posts, 1);
      const heldScan = pack.sourceScanId;
      const held = (
        await db.query<{ id: string; reason: string }>(
          'SELECT "id","reason" FROM "ForeverAuctionRun" WHERE "sourceScanId"=$1',
          [heldScan],
        )
      ).rows[0];
      assert.match(held.reason, /4-hour publication cooldown/);
      assert.equal(copyRequests, 1);
      await db.query(
        'UPDATE "ForeverAuctionRun" SET "publishedAt"=NOW()-INTERVAL \'4 hours 1 second\' WHERE "status"=$1',
        ["published"],
      );
      await run();
      assert.equal(posts, 2);
      const retried = await db.query<{
        id: string;
        status: string;
        observations: unknown;
      }>(
        'SELECT "id","status","observations" FROM "ForeverAuctionRun" WHERE "sourceScanId"=$1',
        [heldScan],
      );
      assert.equal(retried.rowCount, 1);
      assert.equal(retried.rows[0].id, held.id);
      assert.equal(retried.rows[0].status, "published");
      assert.deepEqual(retried.rows[0].observations, [
        { itemId: 456, signal: "bargain", currentPriceCopper: "10000" },
      ]);
      pack = fresh();
      pack.items[0].itemId = 789;
      settings.dailyLimit = 2;
      await db.query(
        'UPDATE "ForeverAuctionConfig" SET "settings"=$1,"version"="version"+1',
        [JSON.stringify(settings)],
      );
      await db.query(
        'UPDATE "ForeverAuctionRun" SET "publishedAt"=NOW()-INTERVAL \'4 hours 1 second\' WHERE "status"=$1',
        ["published"],
      );
      await run();
      assert.equal(posts, 2);
      assert.match(
        (
          await db.query<{ reason: string }>(
            'SELECT "reason" FROM "ForeverAuctionRun" WHERE "sourceScanId"=$1',
            [pack.sourceScanId],
          )
        ).rows[0].reason,
        /daily publication limit/,
      );
      settings.dailyLimit = 6;
      await db.query(
        'UPDATE "ForeverAuctionConfig" SET "settings"=$1,"version"="version"+1',
        [JSON.stringify(settings)],
      );
      await run();
      assert.equal(posts, 3);
      pack = fresh();
      pack.items[0].itemId = 789;
      pack.items[0].currentPriceCopper = "11000";
      await run();
      assert.equal(posts, 3);
      await db.query(
        'UPDATE "ForeverAuctionRun" SET "publishedAt"=NOW()-INTERVAL \'4 hours 1 second\' WHERE "status"=$1',
        ["published"],
      );
      await run();
      assert.equal(posts, 4);
      assert.match(
        [...published.values()][3].content,
        /Price changed by at least 10%/,
      );
      await run();
      assert.equal(posts, 4);
      await db.query(
        'UPDATE "ForeverAuctionRun" SET "sourceAt"=NOW()-INTERVAL \'4 hours\' WHERE "status"=$1',
        ["published"],
      );
      pack.sourceScanAt = new Date(Date.now() - 4 * 3600000).toISOString();
      await run();
      assert.equal(posts, 4);
      assert.ok(
        [...published.values()].every((message) =>
          message.content.startsWith("**EXPIRED:"),
        ),
      );
      await db.query(
        'UPDATE "ForeverAuctionRun" SET "publishedAt"=NOW()-INTERVAL \'25 hours\' WHERE "status"=$1',
        ["stale"],
      );
      expireAfterCopy = true;
      pack = fresh();
      const expiringScan = pack.sourceScanId;
      await run();
      assert.equal(posts, 4);
      assert.match(
        (
          await db.query<{ reason: string }>(
            'SELECT "reason" FROM "ForeverAuctionRun" WHERE "sourceScanId"=$1',
            [expiringScan],
          )
        ).rows[0].reason,
        /data freshness changed/,
      );
      expireAfterCopy = false;
      copyUnavailable = true;
      pack = fresh();
      await run();
      assert.equal(posts, 5);
      assert.match([...published.values()][4].content, /not a guaranteed flip/);
      assert.match(
        (
          await db.query<{ reason: string }>(
            'SELECT "reason" FROM "ForeverAuctionRun" WHERE "sourceScanId"=$1',
            [pack.sourceScanId],
          )
        ).rows[0].reason,
        /local \(provider_unavailable\)/,
      );
      copyUnavailable = false;
      await db.query(
        'UPDATE "ForeverAuctionRun" SET "publishedAt"=NOW()-INTERVAL \'25 hours\' WHERE "status"=$1',
        ["published"],
      );
      uncertain = true;
      pack = fresh();
      await run();
      assert.equal(posts, 6);
      assert.equal(
        (
          await db.query(
            'SELECT 1 FROM "ForeverAuctionRun" WHERE "status"=$1',
            ["uncertain"],
          )
        ).rowCount,
        1,
      );
      pack = fresh();
      await run();
      assert.equal(posts, 6);
    } finally {
      if (server.listening)
        await new Promise<void>((resolve, reject): void => {
          server.close((error): void => (error ? reject(error) : resolve()));
        });
      if (initialized) {
        await db.query('DELETE FROM "ForeverAuctionRun"');
        await db.query('DELETE FROM "ForeverAuctionHealth" WHERE "id"=$1', [
          "auction",
        ]);
        await db.query('DELETE FROM "ForeverAuctionConfig" WHERE "id"=$1', [
          "auction",
        ]);
      }
      await db.end();
    }
  },
);
