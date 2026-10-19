import { randomUUID } from "node:crypto";
import type { z } from "zod";
import type { Staff } from "../auth";
import type { HistoryBatch, Root } from "./contracts";
import { canManage, authorizeBridge } from "./admin";
import {
  historyCreateSchema,
  historyControlSchema,
  historyPublicationAllowed,
} from "./history";
import {
  audit,
  BridgeError,
  BridgeStore,
  one,
  rows,
  removeRoots,
} from "./store";

export async function createHistory(
  store: BridgeStore,
  input: z.infer<typeof historyCreateSchema>,
  staff: Staff,
): Promise<string> {
  if (!canManage(staff)) throw new BridgeError(403, "owner_or_admin_required");
  const value = historyCreateSchema.parse(input);
  return store.transaction(async (sql) => {
    const bridge = await store.bridge(value.bridgeId, sql, true);
    if (!historyPublicationAllowed(bridge))
      throw new BridgeError(409, "validate_endpoints_before_history_preview");
    if (
      await one(
        sql,
        "SELECT id FROM \"ForeverBridgeImport\" WHERE \"bridgeId\"=$1 AND state NOT IN ('completed','rolled_back')",
        [bridge.id],
      )
    )
      throw new BridgeError(409, "history_batch_already_open");
    const id = randomUUID();
    await sql.query(
      `INSERT INTO "ForeverBridgeImport" (id,"bridgeId",direction,"fromAt","untilAt","limit",reason,fingerprint,"doneA","doneB")
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        id,
        bridge.id,
        value.direction,
        value.fromAt,
        value.untilAt,
        value.limit,
        value.reason,
        bridge.fingerprint,
        value.direction === "b_to_a",
        value.direction === "a_to_b",
      ],
    );
    await audit(
      sql,
      `staff:${staff.id}`,
      bridge.id,
      "history_preview_requested",
      { batchId: id, ...value },
    );
    return id;
  });
}

export async function controlHistory(
  store: BridgeStore,
  raw: z.infer<typeof historyControlSchema>,
  staff: Staff,
): Promise<void> {
  if (!canManage(staff)) throw new BridgeError(403, "owner_or_admin_required");
  const input = historyControlSchema.parse(raw);
  const selected = await one<HistoryBatch>(
    store.pool,
    'SELECT * FROM "ForeverBridgeImport" WHERE id=$1',
    [input.id],
  );
  if (!selected) throw new BridgeError(404, "history_batch_not_found");
  await store.transaction(async (sql) => {
    const bridge = await store.bridge(selected.bridgeId, sql, true);
    const batch = (await one<HistoryBatch>(
      sql,
      'SELECT * FROM "ForeverBridgeImport" WHERE id=$1 FOR UPDATE',
      [input.id],
    ))!;
    if (batch.version !== input.version)
      throw new BridgeError(409, "history_changed_refresh_first");
    let state: HistoryBatch["state"];
    let phase = batch.phase;
    if (input.action === "rollback") {
      if (batch.state === "rolled_back") return;
      const roots = await rows<Root>(
        sql,
        'SELECT * FROM "ForeverBridgeMessage" WHERE "historyBatchId"=$1',
        [batch.id],
      );
      await removeRoots(
        sql,
        bridge.id,
        roots.map((root) => root.id),
        "history_rollback",
      );
      await sql.query(
        'UPDATE "ForeverBridgeImportConsent" SET "withdrawnAt"=NOW() WHERE "batchId"=$1',
        [batch.id],
      );
      state = "rolling_back";
    } else if (input.action === "pause") {
      if (!["scanning", "importing"].includes(batch.state))
        throw new BridgeError(409, "history_not_running");
      state = "paused";
    } else {
      const runtime = await store.runtime(sql);
      if (
        !historyPublicationAllowed(bridge) ||
        bridge.fingerprint !== batch.fingerprint ||
        runtime.mode !== "running" ||
        runtime.gateway !== "ready" ||
        !runtime.heartbeatAt ||
        Date.now() - runtime.heartbeatAt.getTime() > 60000
      )
        throw new BridgeError(409, "history_runtime_or_validation_unavailable");
      if (input.action === "start") {
        if (
          batch.state !== "preview" ||
          !input.reviewed ||
          !input.actorIds?.length
        )
          throw new BridgeError(
            409,
            "reviewed_preview_and_author_approvals_required",
          );
        if (
          !bridge.validatedAt ||
          Date.now() - bridge.validatedAt.getTime() > 300000
        )
          throw new BridgeError(409, "fresh_endpoint_validation_required");
        for (const actorId of input.actorIds) {
          if (
            await one(
              sql,
              'SELECT "actorId" FROM "ForeverBridgeConsent" WHERE "bridgeId"=$1 AND "actorId"=$2 AND (blocked OR "withdrawnAt">=$3) LIMIT 1',
              [bridge.id, actorId, batch.createdAt],
            )
          )
            throw new BridgeError(
              409,
              "author_blocked_or_withdrew_during_preview",
            );
          const authors = await rows<{ guildId: string }>(
            sql,
            'SELECT DISTINCT "guildId" FROM "ForeverBridgeImportItem" WHERE "batchId"=$1 AND "actorId"=$2 AND state=\'pending\'',
            [batch.id, actorId],
          );
          if (!authors.length)
            throw new BridgeError(400, "approved_author_not_in_preview");
          for (const { guildId } of authors)
            await sql.query(
              'INSERT INTO "ForeverBridgeImportConsent" ("batchId","guildId","actorId","policyVersion","attestedBy") VALUES ($1,$2,$3,$4,$5)',
              [
                batch.id,
                guildId,
                actorId,
                bridge.policyVersion,
                `staff:${staff.id}`,
              ],
            );
        }
        await sql.query(
          "UPDATE \"ForeverBridgeImportItem\" SET state='skipped',reason='author_not_approved' WHERE \"batchId\"=$1 AND state='pending' AND NOT (\"actorId\"=ANY($2::text[]))",
          [batch.id, input.actorIds],
        );
        state = "importing";
        phase = "import";
      } else {
        if (batch.state !== "paused")
          throw new BridgeError(409, "history_not_paused");
        state = batch.phase === "scan" ? "scanning" : "importing";
        await sql.query(
          `UPDATE "ForeverDiscordOutbox" j SET state='pending',"dueAt"=NOW(),"finishedAt"=NULL
          FROM "ForeverBridgeMessage" m JOIN "ForeverBridgeProjection" p ON p."rootId"=m.id
          WHERE j."rootId"=m.id AND m."historyBatchId"=$1 AND m.state='live' AND p.state='pending'
          AND j.operation='deliver' AND j.state='cancelled' AND j."startedAt" IS NULL`,
          [batch.id],
        );
      }
    }
    await sql.query(
      'UPDATE "ForeverBridgeImport" SET state=$2,phase=$3,reason=$4,version=version+1,"dueAt"=NOW() WHERE id=$1',
      [batch.id, state, phase, input.reason],
    );
    await audit(
      sql,
      `staff:${staff.id}`,
      bridge.id,
      `history_${input.action}`,
      {
        batchId: batch.id,
        reason: input.reason,
        reviewed: input.reviewed,
        actorIds: input.actorIds,
        approvalMethod:
          input.action === "start"
            ? "staff_attested_author_permission_for_fixed_historical_scope"
            : undefined,
      },
    );
  });
}

export async function historyStatus(
  store: BridgeStore,
  bridgeId: string,
  staff: Staff,
): Promise<object> {
  authorizeBridge(staff, await store.bridge(bridgeId));
  const batches = await rows<HistoryBatch>(
    store.pool,
    'SELECT * FROM "ForeverBridgeImport" WHERE "bridgeId"=$1 ORDER BY "createdAt" DESC LIMIT 20',
    [bridgeId],
  );
  const results = [];
  for (const batch of batches) {
    const counts = await rows<{
      state: string;
      reason: string | null;
      count: number;
    }>(
      store.pool,
      'SELECT state,reason,COUNT(*)::int AS count FROM "ForeverBridgeImportItem" WHERE "batchId"=$1 GROUP BY state,reason ORDER BY state,reason',
      [batch.id],
    );
    const authors = await rows<{ actorId: string; count: number }>(
      store.pool,
      'SELECT "actorId",COUNT(*)::int AS count FROM "ForeverBridgeImportItem" WHERE "batchId"=$1 AND state=\'pending\' GROUP BY "actorId" ORDER BY "actorId"',
      [batch.id],
    );
    const delivery = await rows<{ state: string; count: number }>(
      store.pool,
      'SELECT p.state,COUNT(*)::int AS count FROM "ForeverBridgeMessage" m JOIN "ForeverBridgeProjection" p ON p."rootId"=m.id WHERE m."historyBatchId"=$1 GROUP BY p.state',
      [batch.id],
    );
    results.push({ ...batch, counts, authors, delivery });
  }
  return { batches: results };
}
