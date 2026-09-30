import type { Staff } from "@/lib/auth";
import {
  applicationId,
  parseMessageLink,
  type Bridge,
  type Consent,
  type Control,
  type Mode,
  type Projection,
  type Root,
  type Runtime,
} from "./contracts";
import {
  audit,
  BridgeError,
  BridgeStore,
  enqueue,
  one,
  removeRoots,
  rows,
} from "./store";

export interface DeliveryRow extends Root {
  outputId: string | null;
  outputGuild: string;
  outputChannel: string;
  deliveryState: Projection["state"];
  checkedAt: Date | null;
  error: string | null;
}
export interface AdminSnapshot {
  observedAt: number;
  applicationId: string;
  runtime: Runtime;
  bridges: Bridge[];
  selectedBridgeId: string | null;
  consents: Consent[];
  moderators: { id: string; name: string }[];
  delivery: DeliveryRow[];
  deliveryOffset: number;
  deliveryCount: number;
  cleanupCount: number;
  totals: { state: string; count: number }[];
  canManage: boolean;
  setupEnabled: boolean;
}
type IsoDates<T> = {
  [K in keyof T]: T[K] extends Date
    ? string
    : T[K] extends Date | null
      ? string | null
      : T[K];
};
export interface SerializedSnapshot extends Omit<
  AdminSnapshot,
  "runtime" | "bridges" | "consents" | "delivery"
> {
  runtime: IsoDates<Runtime>;
  bridges: IsoDates<Bridge>[];
  consents: IsoDates<Consent>[];
  delivery: IsoDates<DeliveryRow>[];
}
export function serializeSnapshot(snapshot: AdminSnapshot): SerializedSnapshot {
  return {
    ...snapshot,
    runtime: {
      ...snapshot.runtime,
      heartbeatAt: snapshot.runtime.heartbeatAt?.toISOString() || null,
      gapAt: snapshot.runtime.gapAt?.toISOString() || null,
    },
    bridges: snapshot.bridges.map((b) => ({
      ...b,
      activatedAt: b.activatedAt?.toISOString() || null,
      validatedAt: b.validatedAt?.toISOString() || null,
      createdAt: b.createdAt.toISOString(),
    })),
    consents: snapshot.consents.map((c) => ({
      ...c,
      optedAt: c.optedAt.toISOString(),
      withdrawnAt: c.withdrawnAt?.toISOString() || null,
    })),
    delivery: snapshot.delivery.map((r) => ({
      ...r,
      sourceAt: r.sourceAt.toISOString(),
      editedAt: r.editedAt?.toISOString() || null,
      createdAt: r.createdAt.toISOString(),
      expiresAt: r.expiresAt.toISOString(),
      checkedAt: r.checkedAt?.toISOString() || null,
    })),
  };
}
export function canManage(staff: Staff): boolean {
  return staff.role === "owner" || staff.role === "admin";
}
export function authorizeBridge(staff: Staff, bridge: Bridge): void {
  if (
    !canManage(staff) &&
    !(staff.role === "moderator" && bridge.moderatorIds.includes(staff.id))
  )
    throw new BridgeError(403, "bridge_access_denied");
}
export async function snapshot(
  store: BridgeStore,
  staff: Staff,
  offset = 0,
  selectedId?: string,
): Promise<AdminSnapshot> {
  if (staff.role === "editor")
    throw new BridgeError(403, "bridge_access_denied");
  const bridges = await rows<Bridge>(
    store.pool,
    'SELECT * FROM "ForeverDiscordBridge" WHERE ($1 OR $2=ANY("moderatorIds")) ORDER BY CASE WHEN "state"=\'retired\' THEN 1 ELSE 0 END,"createdAt" DESC LIMIT 20',
    [canManage(staff), staff.id],
  );
  if (selectedId && !bridges.some((pair) => pair.id === selectedId))
    throw new BridgeError(404, "bridge_not_found");
  const selectedBridgeId =
    selectedId ||
    bridges.find((pair) => pair.state !== "retired")?.id ||
    bridges[0]?.id ||
    null;
  const ids = selectedBridgeId ? [selectedBridgeId] : [];
  const counts = await one<{ total: number; cleanup: number }>(
    store.pool,
    `SELECT COUNT(*)::int AS total,
    COUNT(*) FILTER (WHERE m."state"='removed' AND p."state" NOT IN ('removed','suppressed'))::int AS cleanup
    FROM "ForeverBridgeMessage" m JOIN "ForeverBridgeProjection" p ON p."rootId"=m."id" WHERE m."bridgeId"=ANY($1::text[])`,
    [ids],
  );
  return {
    observedAt: Date.now(),
    applicationId,
    runtime: await store.runtime(),
    bridges,
    selectedBridgeId,
    deliveryOffset: offset,
    deliveryCount: counts?.total || 0,
    cleanupCount: counts?.cleanup || 0,
    moderators: canManage(staff)
      ? await rows<{ id: string; name: string }>(
          store.pool,
          'SELECT "id","name" FROM "ForeverUser" WHERE "active"=TRUE AND "role"=\'moderator\' ORDER BY "name" LIMIT 100',
        )
      : [],
    canManage: canManage(staff),
    setupEnabled: process.env.BRIDGE_INTERACTIONS_ENABLED === "true",
    consents: await rows<Consent>(
      store.pool,
      'SELECT * FROM "ForeverBridgeConsent" WHERE "bridgeId"=ANY($1::text[]) ORDER BY "optedAt" DESC LIMIT 100',
      [ids],
    ),
    delivery: await rows<DeliveryRow>(
      store.pool,
      `SELECT m.*,p."messageId" AS "outputId",p."guildId" AS "outputGuild",p."channelId" AS "outputChannel",p."state" AS "deliveryState",p."checkedAt",
      (SELECT j."error" FROM "ForeverDiscordOutbox" j WHERE j."rootId"=m."id" AND j."error" IS NOT NULL ORDER BY j."createdAt" DESC LIMIT 1) AS error
      FROM "ForeverBridgeMessage" m JOIN "ForeverBridgeProjection" p ON p."rootId"=m."id" WHERE m."bridgeId"=ANY($1::text[])
      ORDER BY CASE WHEN p."state"='uncertain' THEN 0 WHEN m."state"='held' THEN 1 WHEN m."state"='removed' AND p."state" NOT IN ('removed','suppressed') THEN 2 ELSE 3 END,m."createdAt" DESC,m."id" LIMIT 100 OFFSET $2`,
      [ids, offset],
    ),
    totals: await rows<{ state: string; count: number }>(
      store.pool,
      'SELECT "state",COUNT(*)::int AS count FROM "ForeverDiscordOutbox" WHERE "bridgeId"=ANY($1::text[]) GROUP BY "state"',
      [ids],
    ),
  };
}
export async function control(
  store: BridgeStore,
  input: Control,
  staff: Staff,
): Promise<void> {
  await store.transaction(async (sql) => {
    const bridge = await store.bridge(input.id, sql, true);
    authorizeBridge(staff, bridge);
    if (bridge.version !== input.version)
      throw new BridgeError(409, "configuration_changed_refresh_first");
    if (
      !["pause", "review", "suppress", "block", "unblock"].includes(
        input.action,
      ) &&
      !canManage(staff)
    )
      throw new BridgeError(403, "owner_or_admin_required");
    if (bridge.state === "retired")
      throw new BridgeError(409, "bridge_retired");
    const root = input.rootId
      ? await one<Root>(
          sql,
          'SELECT * FROM "ForeverBridgeMessage" WHERE "id"=$1 AND "bridgeId"=$2',
          [input.rootId, bridge.id],
        )
      : null;
    switch (input.action) {
      case "approve": {
        if (["active", "retiring"].includes(bridge.state))
          throw new BridgeError(409, "pause_before_configuration");
        const link = parseMessageLink(input.link || "");
        const sideA = input.side === "a";
        if (
          !input.side ||
          !link ||
          link.guildId !== (sideA ? bridge.guildA : bridge.guildB) ||
          link.channelId !== (sideA ? bridge.channelA : bridge.channelB)
        )
          throw new BridgeError(400, "notice_must_belong_to_endpoint");
        if (sideA)
          await sql.query(
            'UPDATE "ForeverDiscordBridge" SET "approvalA"=$2,"noticeA"=$3,"validatedAt"=NULL,"state"=\'draft\' WHERE "id"=$1',
            [bridge.id, `staff:${staff.id}`, input.link],
          );
        else
          await sql.query(
            'UPDATE "ForeverDiscordBridge" SET "approvalB"=$2,"noticeB"=$3,"validatedAt"=NULL,"state"=\'draft\' WHERE "id"=$1',
            [bridge.id, `staff:${staff.id}`, input.link],
          );
        break;
      }
      case "validate": {
        if (
          ["active", "retiring"].includes(bridge.state) ||
          !bridge.approvalA ||
          !bridge.approvalB ||
          !bridge.noticeA ||
          !bridge.noticeB
        )
          throw new BridgeError(409, "both_notices_and_approvals_required");
        await sql.query(
          'UPDATE "ForeverDiscordBridge" SET "state"=\'validating\',"validatedAt"=NULL,"reason"=NULL WHERE "id"=$1',
          [bridge.id],
        );
        await enqueue(sql, bridge.id, null, "validate", bridge.version + 1);
        break;
      }
      case "activate": {
        const runtime = await store.runtime(sql);
        const cleanup = await one(
          sql,
          `SELECT p."id" FROM "ForeverBridgeProjection" p JOIN "ForeverBridgeMessage" m ON m."id"=p."rootId"
          WHERE m."bridgeId"=$1 AND m."state"='removed' AND p."state" NOT IN ('removed','suppressed') LIMIT 1`,
          [bridge.id],
        );
        if (cleanup)
          throw new BridgeError(
            409,
            "complete_previous_cleanup_before_activation",
          );
        if (
          process.env.BRIDGE_INTERACTIONS_ENABLED !== "true" ||
          !input.approvals ||
          bridge.state !== "ready" ||
          !bridge.validatedAt ||
          Date.now() - bridge.validatedAt.getTime() > 300000 ||
          !bridge.fingerprint ||
          !bridge.approvalA ||
          !bridge.approvalB ||
          runtime.mode !== "running" ||
          runtime.gateway !== "ready" ||
          !runtime.heartbeatAt ||
          Date.now() - runtime.heartbeatAt.getTime() > 60000
        )
          throw new BridgeError(409, "activation_gates_incomplete");
        await sql.query(
          'UPDATE "ForeverDiscordBridge" SET "state"=\'active\',"activatedAt"=NOW(),"generation"="generation"+1,"reason"=NULL WHERE "id"=$1',
          [bridge.id],
        );
        break;
      }
      case "pause":
      case "retire": {
        await sql.query(
          'UPDATE "ForeverDiscordBridge" SET "state"=$2,"generation"="generation"+1,"reason"=\'staff_request\',"validatedAt"=NULL WHERE "id"=$1',
          [bridge.id, input.action === "retire" ? "retiring" : "paused"],
        );
        await sql.query(
          'UPDATE "ForeverDiscordOutbox" SET "state"=\'cancelled\',"finishedAt"=NOW() WHERE "bridgeId"=$1 AND "operation"=\'deliver\' AND "state"=\'pending\'',
          [bridge.id],
        );
        if (input.action === "retire") {
          const roots = await rows<Root>(
            sql,
            'SELECT * FROM "ForeverBridgeMessage" WHERE "bridgeId"=$1 AND "state"<>\'removed\'',
            [bridge.id],
          );
          await removeRoots(
            sql,
            bridge.id,
            roots.map((r) => r.id),
            "retired",
          );
          await sql.query(
            'UPDATE "ForeverBridgeConsent" SET "withdrawnAt"=NOW() WHERE "bridgeId"=$1',
            [bridge.id],
          );
        }
        break;
      }
      case "review":
        if (
          !root ||
          root.state !== "held" ||
          bridge.state !== "active" ||
          root.generation !== bridge.generation ||
          Date.now() - root.createdAt.getTime() > 120000
        )
          throw new BridgeError(409, "review_no_longer_eligible");
        await sql.query(
          'UPDATE "ForeverBridgeMessage" SET "state"=\'live\',"approvedRevision"="revision" WHERE "id"=$1',
          [root.id],
        );
        await enqueue(sql, bridge.id, root.id, "deliver", root.revision);
        break;
      case "suppress":
        if (!root) throw new BridgeError(404, "message_not_found");
        await removeRoots(sql, bridge.id, [root.id], "staff_suppressed");
        // Retry only known-ID cleanup; never retry an uncertain create.
        await sql.query(
          'UPDATE "ForeverDiscordOutbox" SET "state"=\'pending\',"attempts"=0,"dueAt"=NOW() WHERE "rootId"=$1 AND "operation"=\'remove\' AND "state" IN (\'failed\',\'uncertain\')',
          [root.id],
        );
        break;
      case "block":
        if (!input.actorId) throw new BridgeError(400, "participant_required");
        await store.withdraw(sql, bridge, input.actorId, true);
        break;
      case "unblock":
        if (!input.actorId) throw new BridgeError(400, "participant_required");
        await sql.query(
          'UPDATE "ForeverBridgeConsent" SET "blocked"=FALSE,"withdrawnAt"=NOW() WHERE "bridgeId"=$1 AND "actorId"=$2',
          [bridge.id, input.actorId],
        );
        break;
      case "configure":
        if (["active", "retiring"].includes(bridge.state))
          throw new BridgeError(409, "pause_before_configuration");
        if (input.moderatorIds?.length) {
          const staffRows = await rows<{ id: string }>(
            sql,
            'SELECT "id" FROM "ForeverUser" WHERE "id"=ANY($1::text[]) AND "active"=TRUE AND "role"=\'moderator\'',
            [input.moderatorIds],
          );
          if (staffRows.length !== new Set(input.moderatorIds).size)
            throw new BridgeError(400, "active_moderator_accounts_required");
        }
        await sql.query(
          'UPDATE "ForeverDiscordBridge" SET "reviewRequired"=$2,"moderatorIds"=$3,"blockedTerms"=$4,"validatedAt"=NULL,"approvalA"=NULL,"approvalB"=NULL,"generation"="generation"+1,"state"=\'draft\' WHERE "id"=$1',
          [
            bridge.id,
            input.reviewRequired ?? bridge.reviewRequired,
            input.moderatorIds ?? bridge.moderatorIds,
            input.blockedTerms ?? bridge.blockedTerms,
          ],
        );
        break;
      case "resolve": {
        if (!root) throw new BridgeError(404, "message_not_found");
        const projection = await one<Projection>(
          sql,
          'SELECT * FROM "ForeverBridgeProjection" WHERE "rootId"=$1',
          [root.id],
        );
        const link = parseMessageLink(input.link || "");
        if (
          !projection ||
          projection.state !== "uncertain" ||
          !link ||
          projection.channelId !== link.channelId ||
          projection.guildId !== link.guildId
        )
          throw new BridgeError(400, "uncertain_output_link_required");
        await sql.query(
          'UPDATE "ForeverBridgeProjection" SET "candidateId"=$2 WHERE "id"=$1',
          [projection.id, link.messageId],
        );
        await enqueue(sql, bridge.id, root.id, "resolve", bridge.version + 1);
        break;
      }
    }
    await sql.query(
      'UPDATE "ForeverDiscordBridge" SET "version"="version"+1 WHERE "id"=$1',
      [bridge.id],
    );
    await audit(sql, `staff:${staff.id}`, bridge.id, input.action, {
      reason: input.reason,
      version: input.version,
      rootId: input.rootId,
      actorId: input.actorId,
      approvals: input.approvals,
    });
  });
}
export async function setMode(
  store: BridgeStore,
  mode: Mode,
  version: number,
  reason: string,
  staff: Staff,
): Promise<void> {
  if (!canManage(staff)) throw new BridgeError(403, "owner_or_admin_required");
  await store.transaction(async (sql) => {
    // Acquire locks in the same order as message/consent transactions.
    const bridges = await rows<Bridge>(
      sql,
      'SELECT * FROM "ForeverDiscordBridge" WHERE "state"<>\'retired\' ORDER BY "id" FOR UPDATE',
    );
    const runtime = await one<Runtime>(
      sql,
      'SELECT * FROM "ForeverBridgeRuntime" WHERE "id"=\'singleton\' FOR UPDATE',
    );
    if (!runtime || runtime.version !== version)
      throw new BridgeError(409, "runtime_changed_refresh_first");
    if (
      mode === "running" &&
      (!runtime.heartbeatAt ||
        Date.now() - runtime.heartbeatAt.getTime() > 60000 ||
        runtime.gateway !== "ready")
    )
      throw new BridgeError(409, "healthy_worker_required");
    await sql.query(
      'UPDATE "ForeverBridgeRuntime" SET "mode"=$1,"version"="version"+1 WHERE "id"=\'singleton\'',
      [mode],
    );
    if (mode !== "running")
      for (const bridge of bridges) {
        if (bridge.state === "active")
          await sql.query(
            'UPDATE "ForeverDiscordBridge" SET "state"=\'paused\',"generation"="generation"+1,"version"="version"+1,"validatedAt"=NULL,"reason"=\'global_pause\' WHERE "id"=$1',
            [bridge.id],
          );
        await sql.query(
          'UPDATE "ForeverDiscordOutbox" SET "state"=\'cancelled\',"finishedAt"=NOW() WHERE "bridgeId"=$1 AND "operation"=\'deliver\' AND "state"=\'pending\'',
          [bridge.id],
        );
      }
    await audit(sql, `staff:${staff.id}`, "runtime", "mode_changed", {
      mode,
      reason,
      version,
    });
  });
}

export async function idempotentAdmin(
  store: BridgeStore,
  actorId: string,
  requestId: string,
  fingerprint: string,
  work: () => Promise<void>,
): Promise<void> {
  // An interrupted mutation is not replayed: operators refresh its optimistic version before another request.
  const lock = await store.pool.connect();
  try {
    const acquired = await one<{ acquired: boolean }>(
      lock,
      "SELECT pg_try_advisory_lock(hashtextextended($1,193003004)) AS acquired",
      [`${actorId}:${requestId}`],
    );
    if (!acquired?.acquired) throw new BridgeError(409, "request_in_progress");
    try {
      const existing = await one<{
        actorId: string;
        fingerprint: string;
        state: string;
      }>(lock, 'SELECT * FROM "ForeverBridgeAdminRequest" WHERE "id"=$1', [
        requestId,
      ]);
      if (existing) {
        if (
          existing.actorId !== actorId ||
          existing.fingerprint !== fingerprint
        )
          throw new BridgeError(409, "idempotency_key_reused");
        if (existing.state === "done") return;
        throw new BridgeError(
          409,
          "previous_request_incomplete_refresh_configuration",
        );
      }
      await lock.query(
        'DELETE FROM "ForeverBridgeAdminRequest" WHERE "createdAt"<NOW()-INTERVAL \'7 days\'',
      );
      await lock.query(
        'INSERT INTO "ForeverBridgeAdminRequest" ("id","actorId","fingerprint","state") VALUES ($1,$2,$3,\'pending\')',
        [requestId, actorId, fingerprint],
      );
      try {
        await work();
        await lock.query(
          'UPDATE "ForeverBridgeAdminRequest" SET "state"=\'done\' WHERE "id"=$1',
          [requestId],
        );
      } catch (error) {
        await lock.query(
          'UPDATE "ForeverBridgeAdminRequest" SET "state"=\'failed\' WHERE "id"=$1',
          [requestId],
        );
        throw error;
      }
    } finally {
      await lock.query(
        "SELECT pg_advisory_unlock(hashtextextended($1,193003004))",
        [`${actorId}:${requestId}`],
      );
    }
  } finally {
    lock.release();
  }
}
