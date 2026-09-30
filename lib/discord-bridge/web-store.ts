import { Pool } from "pg";
import { BridgeStore } from "./store";

const globalBridge = globalThis as unknown as { bridgePool?: Pool };
const pool =
  globalBridge.bridgePool ||
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 4,
    connectionTimeoutMillis: 750,
    statement_timeout: 900,
    query_timeout: 1200,
    application_name: "forever_bridge_web",
  });
if (process.env.NODE_ENV !== "production") globalBridge.bridgePool = pool;
export const webBridgeStore = new BridgeStore(pool);
