import { Pool } from "pg";
import { BridgeStore, one } from "../../../lib/discord-bridge/store.js";

async function main(): Promise<void> {
  if (process.env.BRIDGE_ENABLED !== "true") {
    console.log(JSON.stringify({ status: "disabled" }));
    return;
  }
  if (!process.env.BRIDGE_DATABASE_URL)
    throw new Error("database_unconfigured");
  const pool = new Pool({
    connectionString: process.env.BRIDGE_DATABASE_URL,
    max: 1,
    connectionTimeoutMillis: 2000,
    statement_timeout: 2000,
  });
  try {
    const runtime = await new BridgeStore(pool).runtime();
    const counts = await one<{
      uncertain: number;
      failed: number;
      stale: number;
      cleanup: number;
    }>(
      pool,
      `SELECT
      (SELECT COUNT(*)::int FROM "ForeverBridgeProjection" WHERE "state"='uncertain') AS uncertain,
      (SELECT COUNT(*)::int FROM "ForeverDiscordOutbox" WHERE "state"='failed') AS failed,
      (SELECT COUNT(*)::int FROM "ForeverBridgeProjection" WHERE "state"='live' AND ("checkedAt" IS NULL OR "checkedAt"<NOW()-INTERVAL '1 hour')) AS stale,
      (SELECT COUNT(*)::int FROM "ForeverBridgeMessage" m JOIN "ForeverBridgeProjection" p ON p."rootId"=m."id" WHERE m."state"='removed' AND p."state" NOT IN ('removed','suppressed')) AS cleanup`,
    );
    const healthy =
      !!runtime.heartbeatAt &&
      Date.now() - runtime.heartbeatAt.getTime() < 60000 &&
      runtime.gateway === "ready" &&
      !counts?.uncertain &&
      !counts?.failed &&
      !counts?.stale &&
      !runtime.error;
    console.log(
      JSON.stringify({
        status: healthy ? "healthy" : "attention",
        mode: runtime.mode,
        gateway: runtime.gateway,
        heartbeatAt: runtime.heartbeatAt,
        ...counts,
      }),
    );
    if (!healthy) process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
main().catch(() => {
  console.error("Bridge health unavailable.");
  process.exitCode = 2;
});
