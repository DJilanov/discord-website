import "./env";
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { Pool } from "pg";
import { z } from "zod";
import { BridgeError, BridgeStore, one } from "../lib/discord-bridge/store";
import {
  createHistory,
  controlHistory,
  historyStatus,
} from "../lib/discord-bridge/history-admin";
import {
  historyCreateSchema,
  historyControlSchema,
} from "../lib/discord-bridge/history";
import type { Staff } from "../lib/auth";

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      action: { type: "string" },
      owner: { type: "string" },
      input: { type: "string" },
      bridge: { type: "string" },
    },
    strict: true,
  });
  const action = z.enum(["preview", "control", "status"]).parse(values.action);
  const email = z.email().parse(values.owner);
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 2,
    statement_timeout: 10000,
  });
  try {
    const staff = await one<Staff>(
      pool,
      "SELECT id,email,name,role FROM \"ForeverUser\" WHERE email=$1 AND active AND role IN ('owner','admin')",
      [email],
    );
    if (!staff) throw new BridgeError(403, "active_owner_or_admin_required");
    const store = new BridgeStore(pool);
    if (action === "status") {
      console.log(
        JSON.stringify(
          await historyStatus(store, z.uuid().parse(values.bridge), staff),
          null,
          2,
        ),
      );
      return;
    }
    const raw: unknown = JSON.parse(
      await readFile(z.string().min(1).parse(values.input), "utf8"),
    );
    if (action === "preview")
      console.log(
        JSON.stringify({
          batchId: await createHistory(
            store,
            historyCreateSchema.parse(raw),
            staff,
          ),
          published: 0,
        }),
      );
    else {
      await controlHistory(store, historyControlSchema.parse(raw), staff);
      console.log(JSON.stringify({ ok: true }));
    }
  } finally {
    await pool.end();
  }
}
main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      error:
        error instanceof BridgeError ? error.code : "history_command_failed",
      detail:
        "Check arguments, current batch version and private operational status. No credentials or message contents logged.",
    }),
  );
  process.exitCode = 1;
});
