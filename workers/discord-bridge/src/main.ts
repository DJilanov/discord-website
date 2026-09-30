import { randomUUID } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { Pool } from "pg";
import { WebSocketManager, WebSocketShardEvents } from "@discordjs/ws";
import { GatewayIntentBits } from "discord-api-types/v10";
import { z } from "zod";
import {
  applicationId,
  guilds,
  sourceSchema,
  type Bridge,
  type Root,
} from "../../../lib/discord-bridge/contracts.js";
import { BridgeStore, one, rows } from "../../../lib/discord-bridge/store.js";
import { BridgeEngine } from "./engine.js";
import { DiscordTransport } from "./transport.js";

async function main(): Promise<void> {
  if (process.env.BRIDGE_ENABLED !== "true") {
    console.log("Bridge disabled. No Discord connection was opened.");
    return;
  }
  const [major, minor] = process.versions.node.split(".").map(Number);
  if (major !== 24 || minor < 21) throw new Error("supported_node_24_required");
  const env = z
    .object({
      BRIDGE_DATABASE_URL: z.string().min(20),
      BRIDGE_BOT_TOKEN: z.string().min(20),
      BRIDGE_INTERACTION_KEY: z.string().regex(/^[a-f0-9]{64}$/i),
      BRIDGE_FINGERPRINT_KEY: z.string().regex(/^[a-f0-9]{64}$/i),
      BRIDGE_BUILD: z.string().regex(/^[a-zA-Z0-9._-]{1,80}$/),
    })
    .parse(process.env);
  const database = new URL(env.BRIDGE_DATABASE_URL);
  if (
    !["postgres:", "postgresql:"].includes(database.protocol) ||
    !["127.0.0.1", "localhost", "[::1]"].includes(database.hostname) ||
    decodeURIComponent(database.username) !== "forever_bridge_worker"
  )
    throw new Error("restricted_local_database_required");
  const pool = new Pool({
    connectionString: env.BRIDGE_DATABASE_URL,
    max: 5,
    connectionTimeoutMillis: 3000,
    statement_timeout: 5000,
    application_name: "forever_bridge_worker",
  });
  const store = new BridgeStore(pool);
  const leader = await pool.connect();
  try {
    const role = await one<{
      rolsuper: boolean;
      rolinherit: boolean;
      rolcreaterole: boolean;
      rolcreatedb: boolean;
    }>(
      leader,
      "SELECT rolsuper,rolinherit,rolcreaterole,rolcreatedb FROM pg_roles WHERE rolname=current_user",
    );
    const scope = await one<{ widened: boolean }>(
      leader,
      `SELECT EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname=ANY($1::text[]) AND has_table_privilege(c.oid,'SELECT,INSERT,UPDATE,DELETE')
    ) AS widened`,
      [
        [
          "ForeverUser",
          "ForeverReport",
          "ForeverEvidence",
          "ForeverAuditLog",
          "User",
        ],
      ],
    );
    if (
      !role ||
      role.rolsuper ||
      role.rolinherit ||
      role.rolcreaterole ||
      role.rolcreatedb ||
      scope?.widened
    )
      throw new Error("worker_database_scope_too_broad");
  } catch (error) {
    leader.release(true);
    await pool.end();
    throw error;
  }
  const lock = await one<{ acquired: boolean }>(
    leader,
    "SELECT pg_try_advisory_lock(193003003) AS acquired",
  );
  if (!lock?.acquired) {
    leader.release();
    await pool.end();
    throw new Error("worker_already_running");
  }
  let alive = true,
    inFlight = 0,
    initialized = false;
  const transport = new DiscordTransport(
    env.BRIDGE_BOT_TOKEN,
    async () => alive && (await store.runtime()).mode !== "hard_stop",
  );
  const engine = new BridgeEngine(
    store,
    transport,
    env.BRIDGE_FINGERPRINT_KEY,
    env.BRIDGE_INTERACTION_KEY,
  );
  const gateway = new WebSocketManager({
    token: env.BRIDGE_BOT_TOKEN,
    rest: transport.rest,
    intents:
      GatewayIntentBits.Guilds |
      GatewayIntentBits.GuildMessages |
      GatewayIntentBits.MessageContent,
    shardCount: 1,
    shardIds: [0],
  });
  const stop = (): void => {
    alive = false;
  };
  leader.on("error", stop);
  pool.on("error", stop);
  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);
  const pauseAll = async (reason: string, gatewayGap = true): Promise<void> => {
    const bridges = await rows<Bridge>(
      pool,
      "SELECT * FROM \"ForeverDiscordBridge\" WHERE \"state\" IN ('active','pilot')",
    );
    for (const bridge of bridges) await store.pause(bridge.id, reason);
    if (!gatewayGap) return;
    await pool.query(
      'UPDATE "ForeverBridgeRuntime" SET "gateway"=\'recovering\',"gapAt"=NOW(),"error"=$1 WHERE "id"=\'singleton\'',
      [reason],
    );
  };
  gateway.on(WebSocketShardEvents.Dispatch, ({ data }) => {
    // Do not cache messages, guild member rosters, or payloads from other installed servers.
    const payload: unknown = data.d;
    if (
      !alive ||
      !payload ||
      typeof payload !== "object" ||
      !("guild_id" in payload) ||
      typeof payload.guild_id !== "string"
    )
      return;
    const eventGuild = payload.guild_id;
    if (eventGuild !== guilds.kfc && eventGuild !== guilds.forever) return;
    if (inFlight >= 20) {
      void pauseAll("gateway_overload").catch(stop);
      return;
    }
    inFlight++;
    void (async (): Promise<void> => {
      if (data.t === "MESSAGE_CREATE") {
        const bridge = await store.pairForChannel(
          data.d.guild_id!,
          data.d.channel_id,
        );
        if (!bridge) return;
        if (data.d.author.id === applicationId && data.d.nonce) {
          await store.echo(
            data.d.guild_id!,
            data.d.channel_id,
            data.d.id,
            String(data.d.nonce),
          );
          return;
        }
        if (data.d.author.bot || data.d.webhook_id) return;
        const parsed = sourceSchema.safeParse(data.d);
        if (parsed.success) await store.observe(parsed.data, bridge.id);
      } else if (data.t === "MESSAGE_UPDATE") {
        const bridge = await store.pairForChannel(
          data.d.guild_id!,
          data.d.channel_id,
        );
        if (!bridge) return;
        const root = await one<Root>(
          pool,
          'SELECT * FROM "ForeverBridgeMessage" WHERE "bridgeId"=$1 AND "channelId"=$2 AND "messageId"=$3 AND "state"<>\'removed\'',
          [bridge.id, data.d.channel_id, data.d.id],
        );
        if (!root) return;
        const message = await transport.source(
          root.guildId,
          root.channelId,
          root.messageId,
        );
        if (message) await store.observe(message, bridge.id, true);
        else await store.remove(root.id, "source_deleted");
      } else if (
        data.t === "MESSAGE_DELETE" ||
        data.t === "MESSAGE_DELETE_BULK"
      ) {
        await store.deleted(
          data.d.guild_id!,
          data.d.channel_id,
          data.t === "MESSAGE_DELETE" ? [data.d.id] : data.d.ids,
        );
      } else if (data.t === "CHANNEL_UPDATE" || data.t === "CHANNEL_DELETE") {
        transport.invalidate();
        await store.pauseChannel(eventGuild, data.d.id);
      } else if (
        data.t === "GUILD_ROLE_UPDATE" ||
        data.t === "GUILD_ROLE_DELETE"
      ) {
        transport.invalidate();
        await pauseAll("permission_change_revalidation_required", false);
      }
    })()
      .catch(() => {
        void pauseAll("gateway_processing_failed").catch(stop);
      })
      .finally(() => {
        inFlight--;
      });
  });
  gateway.on(WebSocketShardEvents.Closed, () => {
    void pauseAll("gateway_disconnected").catch(stop);
  });
  gateway.on(WebSocketShardEvents.Error, () => {
    void pauseAll("gateway_error").catch(stop);
  });
  gateway.on(WebSocketShardEvents.Ready, () => {
    void (async (): Promise<void> => {
      if (initialized) await pauseAll("gateway_new_session");
      initialized = true;
      await pool.query(
        'UPDATE "ForeverBridgeRuntime" SET "gateway"=\'ready\' WHERE "id"=\'singleton\'',
      );
    })().catch(stop);
  });
  gateway.on(WebSocketShardEvents.Resumed, () => {
    void pool
      .query(
        'UPDATE "ForeverBridgeRuntime" SET "gateway"=\'ready\' WHERE "id"=\'singleton\'',
      )
      .catch(stop);
  });
  try {
    await store.recover();
    await transport.identity();
    await gateway.connect();
    const leaderId = randomUUID();
    let heartbeat = 0,
      maintenance = 0,
      reconciliation = 0;
    while (alive) {
      if (Date.now() - heartbeat > 15000) {
        await leader.query("SELECT 1");
        await pool.query(
          'UPDATE "ForeverBridgeRuntime" SET "heartbeatAt"=NOW(),"leaderId"=$1,"build"=$2 WHERE "id"=\'singleton\'',
          [leaderId, env.BRIDGE_BUILD],
        );
        heartbeat = Date.now();
      }
      if (Date.now() - maintenance > 30000) {
        await engine.maintenance();
        maintenance = Date.now();
      }
      await engine.consentTick();
      const busy = await engine.tick();
      if (Date.now() - reconciliation > 2000) {
        await engine.reconcile();
        reconciliation = Date.now();
      }
      if (!busy) await sleep(250);
    }
  } finally {
    alive = false;
    await gateway.destroy();
    while (inFlight > 0) await sleep(100);
    try {
      await pool.query(
        'UPDATE "ForeverBridgeRuntime" SET "gateway"=\'offline\' WHERE "id"=\'singleton\'',
      );
    } finally {
      leader.release(true);
      await pool.end();
    }
  }
}
main().catch(() => {
  console.error(
    "Bridge stopped. Check the private operational status; credentials and Discord payloads are not logged.",
  );
  process.exitCode = 1;
});
