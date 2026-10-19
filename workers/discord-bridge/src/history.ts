import type {
  Bridge,
  HistoryBatch,
  HistoryItem,
} from "../../../lib/discord-bridge/contracts.js";
import { contentPolicy } from "../../../lib/discord-bridge/policy.js";
import {
  historyFingerprint,
  historyPublicationAllowed,
  historyWindow,
} from "../../../lib/discord-bridge/history.js";
import {
  audit,
  BridgeStore,
  one,
  rows,
} from "../../../lib/discord-bridge/store.js";
import { DiscordFailure, type BridgeTransport } from "./transport.js";

export class HistoryEngine {
  constructor(
    private readonly store: BridgeStore,
    private readonly transport: BridgeTransport,
    private readonly key: string,
  ) {}

  async tick(): Promise<boolean> {
    const runtime = await this.store.runtime();
    if (runtime.mode === "hard_stop" || runtime.gateway !== "ready")
      return false;
    const batch = await one<HistoryBatch>(
      this.store.pool,
      "SELECT * FROM \"ForeverBridgeImport\" WHERE state IN ('scanning','importing','rolling_back') AND \"dueAt\"<=NOW() ORDER BY \"dueAt\",id LIMIT 1",
    );
    if (!batch) return false;
    try {
      if (batch.state === "rolling_back") {
        const unresolved = await one(
          this.store.pool,
          'SELECT m.id FROM "ForeverBridgeMessage" m JOIN "ForeverBridgeProjection" p ON p."rootId"=m.id WHERE m."historyBatchId"=$1 AND p.state NOT IN (\'removed\',\'suppressed\') LIMIT 1',
          [batch.id],
        );
        await this.update(
          batch,
          unresolved ? "rolling_back" : "rolled_back",
          unresolved ? "cleanup_pending" : null,
        );
        return true;
      }
      const bridge = await this.store.bridge(batch.bridgeId);
      if (
        !historyPublicationAllowed(bridge) ||
        bridge.fingerprint !== batch.fingerprint
      ) {
        await this.update(batch, "paused", "endpoint_revalidation_required");
        return true;
      }
      if ((await this.transport.validate(bridge)) !== batch.fingerprint) {
        await this.store.pause(bridge.id, "history_audience_changed");
        return true;
      }
      if (batch.state === "scanning") await this.scan(batch, bridge);
      else if (runtime.mode === "running") await this.importNext(batch, bridge);
      else await this.update(batch, "paused", "publication_not_running");
    } catch (error) {
      const code =
        error instanceof DiscordFailure
          ? error.code
          : "history_processing_failed";
      if (code === "unauthorized")
        await this.store.pool.query(
          "UPDATE \"ForeverBridgeRuntime\" SET mode='hard_stop',error='unauthorized',version=version+1 WHERE id='singleton'",
        );
      if (["rate_limited", "unavailable"].includes(code))
        await this.store.pool.query(
          'UPDATE "ForeverBridgeImport" SET "dueAt"=NOW()+($3*INTERVAL \'1 second\'),reason=$4 WHERE id=$1 AND version=$2',
          [
            batch.id,
            batch.version,
            error instanceof DiscordFailure
              ? Math.max(5, error.retryAfter)
              : 30,
            code,
          ],
        );
      else await this.update(batch, "paused", code);
    }
    return true;
  }

  private async update(
    batch: HistoryBatch,
    state: HistoryBatch["state"],
    reason: string | null,
  ): Promise<void> {
    await this.store.transaction(async (sql) => {
      await this.store.bridge(batch.bridgeId, sql, true);
      const updated = await sql.query(
        'UPDATE "ForeverBridgeImport" SET state=$3,reason=$4,version=version+1,"dueAt"=NOW()+INTERVAL \'2 seconds\' WHERE id=$1 AND version=$2',
        [batch.id, batch.version, state, reason],
      );
      if (updated.rowCount && state !== batch.state)
        await audit(sql, "system:bridge", batch.bridgeId, "history_state", {
          batchId: batch.id,
          state,
          reason,
        });
    });
  }

  private async scan(batch: HistoryBatch, bridge: Bridge): Promise<void> {
    const total = await one<{ count: number }>(
      this.store.pool,
      'SELECT COUNT(*)::int AS count FROM "ForeverBridgeImportItem" WHERE "batchId"=$1',
      [batch.id],
    );
    const remaining = batch.limit - (total?.count || 0);
    if (remaining <= 0 || (batch.doneA && batch.doneB)) {
      await this.update(
        batch,
        "preview",
        remaining <= 0 ? "scan_limit_reached" : null,
      );
      return;
    }
    const sideA = !batch.doneA;
    const channelId = sideA ? bridge.channelA : bridge.channelB;
    const cursor =
      (sideA ? batch.cursorA : batch.cursorB) ||
      String(BigInt(batch.untilAt.getTime() - 1420070400000) << 22n);
    const limit = Math.min(100, remaining);
    const messages = await this.transport.history(
      bridge,
      channelId,
      cursor,
      limit,
    );
    const done =
      messages.length < limit ||
      messages.some(
        (message) => Date.parse(message.timestamp) < batch.fromAt.getTime(),
      );
    const before = messages.reduce(
      (oldest, message) =>
        BigInt(message.id) < BigInt(oldest) ? message.id : oldest,
      cursor,
    );
    await this.store.transaction(async (sql) => {
      await this.store.bridge(bridge.id, sql, true);
      const current = await one<HistoryBatch>(
        sql,
        'SELECT * FROM "ForeverBridgeImport" WHERE id=$1 FOR UPDATE',
        [batch.id],
      );
      if (
        !current ||
        current.version !== batch.version ||
        current.state !== "scanning"
      )
        return;
      for (const message of messages) {
        const date = Date.parse(message.timestamp);
        if (date < batch.fromAt.getTime() || date >= batch.untilAt.getTime())
          continue;
        const existing = await one(
          sql,
          'SELECT id FROM "ForeverBridgeMessage" WHERE "bridgeId"=$1 AND "channelId"=$2 AND "messageId"=$3',
          [bridge.id, channelId, message.id],
        );
        const reason = existing
          ? "already_tracked"
          : contentPolicy(message, bridge.blockedTerms);
        await sql.query(
          `INSERT INTO "ForeverBridgeImportItem" ("batchId","guildId","channelId","messageId","actorId","sourceAt",fingerprint,state,reason)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING`,
          [
            batch.id,
            message.guild_id,
            channelId,
            message.id,
            message.author.id,
            message.timestamp,
            historyFingerprint(message, this.key),
            reason ? "skipped" : "pending",
            reason,
          ],
        );
      }
      await sql.query(
        sideA
          ? 'UPDATE "ForeverBridgeImport" SET "cursorA"=$2,"doneA"=$3,version=version+1,"dueAt"=NOW()+INTERVAL \'2 seconds\' WHERE id=$1'
          : 'UPDATE "ForeverBridgeImport" SET "cursorB"=$2,"doneB"=$3,version=version+1,"dueAt"=NOW()+INTERVAL \'2 seconds\' WHERE id=$1',
        [batch.id, before, done],
      );
    });
  }

  private async importNext(batch: HistoryBatch, bridge: Bridge): Promise<void> {
    const unresolved = await rows<{ state: string; failed: boolean }>(
      this.store.pool,
      `SELECT p.state,EXISTS(SELECT 1 FROM "ForeverDiscordOutbox" j WHERE j."rootId"=m.id AND j.state='failed') AS failed
      FROM "ForeverBridgeMessage" m JOIN "ForeverBridgeProjection" p ON p."rootId"=m.id WHERE m."historyBatchId"=$1 AND p.state NOT IN ('live','removed','suppressed') LIMIT 1`,
      [batch.id],
    );
    if (unresolved.length) {
      await this.update(
        batch,
        unresolved[0].state === "uncertain" || unresolved[0].failed
          ? "paused"
          : "importing",
        "delivery_pending_review",
      );
      return;
    }
    const item = await one<HistoryItem>(
      this.store.pool,
      'SELECT * FROM "ForeverBridgeImportItem" WHERE "batchId"=$1 AND state=\'pending\' ORDER BY "sourceAt","messageId"::numeric LIMIT 1',
      [batch.id],
    );
    if (!item) {
      await this.update(batch, "completed", null);
      return;
    }
    const grant = await historyWindow(
      this.store.pool,
      batch.id,
      bridge.id,
      item.guildId,
      item.actorId,
    );
    let reason = !grant ? "author_approval_unavailable" : null;
    const duplicate = await one(
      this.store.pool,
      'SELECT id FROM "ForeverBridgeMessage" WHERE "bridgeId"=$1 AND "channelId"=$2 AND "messageId"=$3',
      [bridge.id, item.channelId, item.messageId],
    );
    if (duplicate) reason = "already_tracked";
    if (!reason && !(await this.transport.eligible(bridge, item.actorId)))
      reason = "participant_ineligible";
    const source = !reason
      ? await this.transport.source(
          item.guildId,
          item.channelId,
          item.messageId,
        )
      : null;
    if (!reason)
      reason = !source
        ? "source_deleted"
        : historyFingerprint(source, this.key) !== item.fingerprint
          ? "source_changed_since_preview"
          : contentPolicy(source, bridge.blockedTerms);
    if (reason) {
      await this.store.pool.query(
        'UPDATE "ForeverBridgeImportItem" SET state=\'skipped\',reason=$4 WHERE "batchId"=$1 AND "channelId"=$2 AND "messageId"=$3 AND state=\'pending\'',
        [batch.id, item.channelId, item.messageId, reason],
      );
    } else if (source) {
      const staged = await this.store.observe(source, bridge.id, false, {
        batchId: batch.id,
        fingerprint: historyFingerprint(source, this.key),
      });
      if (!staged) {
        const capacity = await one<{ count: number }>(
          this.store.pool,
          "SELECT COUNT(*)::int AS count FROM \"ForeverBridgeMessage\" WHERE state<>'removed'",
        );
        if ((capacity?.count || 0) >= 1000) {
          await this.update(
            batch,
            "paused",
            "retained_message_capacity_reached",
          );
          return;
        }
      }
    }
    await this.update(batch, "importing", null);
  }
}
