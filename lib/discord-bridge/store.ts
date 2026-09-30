import { randomBytes, randomUUID } from "node:crypto";
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import {
  guilds,
  maxBridgePairs,
  opposite,
  policyVersion,
  type Bridge,
  type Consent,
  type Job,
  type Projection,
  type Root,
  type Runtime,
  type SourceMessage,
} from "./contracts.ts";
import { eligibility } from "./policy.ts";

export class BridgeError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code);
  }
}
export type Sql = Pick<PoolClient, "query">;
export async function rows<T extends QueryResultRow>(
  sql: Sql,
  query: string,
  values: unknown[] = [],
): Promise<T[]> {
  return (await sql.query<T>(query, values)).rows;
}
export async function one<T extends QueryResultRow>(
  sql: Sql,
  query: string,
  values: unknown[] = [],
): Promise<T | null> {
  return (await rows<T>(sql, query, values))[0] || null;
}
export async function audit(
  sql: Sql,
  actor: string,
  bridgeId: string,
  action: string,
  details: Record<string, unknown> = {},
): Promise<void> {
  await sql.query("SELECT forever_bridge_audit($1,$2,$3,$4::jsonb)", [
    actor,
    bridgeId,
    action,
    JSON.stringify(details),
  ]);
}
export async function enqueue(
  sql: Sql,
  bridgeId: string,
  rootId: string | null,
  operation: Job["operation"],
  revision: number,
): Promise<void> {
  await sql.query(
    'INSERT INTO "ForeverDiscordOutbox" ("id","bridgeId","rootId","operation","revision","dedupeKey") VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT ("dedupeKey") DO NOTHING',
    [
      randomUUID(),
      bridgeId,
      rootId,
      operation,
      revision,
      `${bridgeId}:${rootId || "validation"}:${operation}:${revision}`,
    ],
  );
}

// All root lifecycle changes take the bridge lock first, including withdrawal and late-send compensation.
export async function removeRoots(
  sql: Sql,
  bridgeId: string,
  ids: string[],
  reason: string,
): Promise<void> {
  if (!ids.length) return;
  const affected = await rows<Root>(
    sql,
    `WITH RECURSIVE affected AS (
    SELECT "id" FROM "ForeverBridgeMessage" WHERE "bridgeId"=$1 AND "id"=ANY($2::text[])
    UNION SELECT child."id" FROM "ForeverBridgeMessage" child JOIN affected parent ON child."parentId"=parent."id" WHERE child."bridgeId"=$1
  ) UPDATE "ForeverBridgeMessage" SET "state"='removed', "reason"=$3, "revision"="revision"+1
    WHERE "id" IN (SELECT "id" FROM affected) AND "state"<>'removed' RETURNING *`,
    [bridgeId, ids, reason],
  );
  for (const root of affected) {
    await sql.query(
      'UPDATE "ForeverDiscordOutbox" SET "state"=\'cancelled\',"finishedAt"=NOW() WHERE "rootId"=$1 AND "operation"=\'deliver\' AND "state"=\'pending\'',
      [root.id],
    );
    await enqueue(sql, bridgeId, root.id, "remove", root.revision);
  }
}

export class BridgeStore {
  constructor(public readonly pool: Pool) {}
  async transaction<T>(work: (sql: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await work(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  async bridge(
    id: string,
    sql: Sql = this.pool,
    lock = false,
  ): Promise<Bridge> {
    const bridge = await one<Bridge>(
      sql,
      `SELECT * FROM "ForeverDiscordBridge" WHERE "id"=$1${lock ? " FOR UPDATE" : ""}`,
      [id],
    );
    if (!bridge) throw new BridgeError(404, "bridge_not_found");
    return bridge;
  }
  async runtime(sql: Sql = this.pool): Promise<Runtime> {
    const value = await one<Runtime>(
      sql,
      'SELECT * FROM "ForeverBridgeRuntime" WHERE "id"=\'singleton\'',
    );
    if (!value) throw new BridgeError(503, "bridge_schema_unavailable");
    return value;
  }
  async consent(
    bridge: string,
    guild: string,
    actor: string,
    sql: Sql = this.pool,
  ): Promise<Consent | null> {
    return one<Consent>(
      sql,
      'SELECT * FROM "ForeverBridgeConsent" WHERE "bridgeId"=$1 AND "guildId"=$2 AND "actorId"=$3',
      [bridge, guild, actor],
    );
  }
  async pairForChannel(
    guild: string,
    channel: string,
    sql: Sql = this.pool,
  ): Promise<Bridge | null> {
    if (guild !== guilds.kfc && guild !== guilds.forever) return null;
    return one<Bridge>(
      sql,
      'SELECT * FROM "ForeverDiscordBridge" WHERE "state"<>\'retired\' AND (("guildA"=$1 AND "channelA"=$2) OR ("guildB"=$1 AND "channelB"=$2))',
      [guild, channel],
    );
  }
  async bundle(
    rootId: string,
    sql: Sql = this.pool,
  ): Promise<{
    root: Root;
    projection: Projection;
    bridge: Bridge;
    consent: Consent | null;
  } | null> {
    const root = await one<Root>(
      sql,
      'SELECT * FROM "ForeverBridgeMessage" WHERE "id"=$1',
      [rootId],
    );
    if (!root) return null;
    const projection = await one<Projection>(
      sql,
      'SELECT * FROM "ForeverBridgeProjection" WHERE "rootId"=$1',
      [rootId],
    );
    if (!projection) throw new BridgeError(500, "projection_missing");
    return {
      root,
      projection,
      bridge: await this.bridge(root.bridgeId, sql),
      consent: await this.consent(
        root.bridgeId,
        root.guildId,
        root.authorId,
        sql,
      ),
    };
  }
  async createDraft(
    name: string,
    channelA: string,
    channelB: string,
    actor: string,
  ): Promise<Bridge> {
    return this.transaction(async (sql) => {
      await sql.query("SELECT pg_advisory_xact_lock(193003001)");
      const existing = await rows<Bridge>(
        sql,
        'SELECT * FROM "ForeverDiscordBridge" WHERE "state"<>\'retired\'',
      );
      if (
        existing.some(
          (pair) => pair.channelA === channelA || pair.channelB === channelB,
        )
      )
        throw new BridgeError(409, "channel_already_paired");
      const slot = Array.from(
        { length: maxBridgePairs },
        (_, index) => index + 1,
      ).find((candidate) => !existing.some((pair) => pair.slot === candidate));
      if (!slot) throw new BridgeError(409, "three_pair_limit_reached");
      const bridge = await one<Bridge>(
        sql,
        'INSERT INTO "ForeverDiscordBridge" ("id","name","guildA","channelA","guildB","channelB","slot") VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
        [
          randomUUID(),
          name,
          guilds.kfc,
          channelA,
          guilds.forever,
          channelB,
          slot,
        ],
      );
      if (!bridge) throw new BridgeError(500, "draft_failed");
      await audit(sql, actor, bridge.id, "draft_created");
      return bridge;
    });
  }
  async observe(
    message: SourceMessage,
    bridgeId: string,
    edited = false,
  ): Promise<string | null> {
    return this.transaction(async (sql) => {
      const bridge = await this.bridge(bridgeId, sql, true);
      const existing = await one<Root>(
        sql,
        'SELECT * FROM "ForeverBridgeMessage" WHERE "bridgeId"=$1 AND "channelId"=$2 AND "messageId"=$3',
        [bridgeId, message.channel_id, message.id],
      );
      if (
        existing?.state === "removed" ||
        (existing && !edited) ||
        (!existing && edited)
      )
        return null;
      const consent = await this.consent(
        bridgeId,
        message.guild_id || "",
        message.author.id,
        sql,
      );
      const denial = eligibility(bridge, consent, message);
      if (denial) {
        if (existing) await removeRoots(sql, bridgeId, [existing.id], denial);
        return null;
      }
      const runtime = await this.runtime(sql);
      if (runtime.mode !== "running" || runtime.gateway !== "ready")
        return null;
      if (existing) {
        const editedAt = message.edited_timestamp
          ? new Date(message.edited_timestamp)
          : null;
        if (
          !editedAt ||
          editedAt.getTime() <=
            (existing.editedAt?.getTime() || existing.sourceAt.getTime())
        )
          return existing.id;
        const edits = await one<{ count: number }>(
          sql,
          'SELECT COUNT(*)::int AS count FROM "ForeverDiscordOutbox" WHERE "rootId"=$1 AND "operation"=\'deliver\' AND "createdAt">NOW()-INTERVAL \'1 minute\'',
          [existing.id],
        );
        if ((edits?.count || 0) >= 20) {
          await removeRoots(sql, bridgeId, [existing.id], "edit_rate_limit");
          return null;
        }
        // A reviewed revision never authorizes a later edit. Retract until the next review.
        if (bridge.reviewRequired) {
          await removeRoots(
            sql,
            bridgeId,
            [existing.id],
            "edited_after_review",
          );
          return null;
        }
        await sql.query(
          'UPDATE "ForeverDiscordOutbox" SET "state"=\'cancelled\',"finishedAt"=NOW() WHERE "rootId"=$1 AND "operation"=\'deliver\' AND "state"=\'pending\'',
          [existing.id],
        );
        const updated = await one<Root>(
          sql,
          'UPDATE "ForeverBridgeMessage" SET "revision"="revision"+1,"editedAt"=$2 WHERE "id"=$1 RETURNING *',
          [existing.id, editedAt],
        );
        await enqueue(sql, bridgeId, existing.id, "deliver", updated!.revision);
        return existing.id;
      }
      if (Date.now() - Date.parse(message.timestamp) > 120000) return null;
      // Serialize the worker-wide capacity check across independent channel pairs.
      await sql.query("SELECT pg_advisory_xact_lock(193003005)");
      const counts = await one<{
        pending: number;
        active: number;
        minute: number;
        burst: number;
      }>(
        sql,
        `SELECT
        (SELECT COUNT(*)::int FROM "ForeverDiscordOutbox" WHERE "operation"='deliver' AND "state" IN ('pending','leased')) AS pending,
        COUNT(*) FILTER (WHERE "state"<>'removed')::int AS active,
        COUNT(*) FILTER (WHERE "authorId"=$1 AND "createdAt">NOW()-INTERVAL '1 minute')::int AS minute,
        COUNT(*) FILTER (WHERE "authorId"=$1 AND "createdAt">NOW()-INTERVAL '10 seconds')::int AS burst
        FROM "ForeverBridgeMessage"`,
        [message.author.id],
      );
      if (
        counts &&
        (counts.pending >= 100 ||
          counts.active >= 1000 ||
          counts.minute >= 20 ||
          counts.burst >= 5)
      )
        return null;
      const destination = opposite(bridge, message.channel_id)!;
      let parent: Root | null = null;
      const parentMessage = message.message_reference?.message_id;
      if (
        parentMessage &&
        (!message.message_reference?.channel_id ||
          message.message_reference.channel_id === message.channel_id)
      ) {
        parent = await one<Root>(
          sql,
          `SELECT m.* FROM "ForeverBridgeMessage" m LEFT JOIN "ForeverBridgeProjection" p ON p."rootId"=m."id"
          WHERE m."bridgeId"=$1 AND m."state"='live' AND ((m."channelId"=$2 AND m."messageId"=$3) OR (p."channelId"=$2 AND p."messageId"=$3 AND p."state"='live')) LIMIT 1`,
          [bridgeId, message.channel_id, parentMessage],
        );
      }
      const rootId = randomUUID();
      await sql.query(
        'INSERT INTO "ForeverBridgeMessage" ("id","bridgeId","guildId","channelId","messageId","authorId","generation","state","parentId","sourceAt","editedAt","expiresAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW()+INTERVAL \'30 days\')',
        [
          rootId,
          bridgeId,
          message.guild_id,
          message.channel_id,
          message.id,
          message.author.id,
          bridge.generation,
          bridge.reviewRequired ? "held" : "live",
          parent?.id || null,
          message.timestamp,
          message.edited_timestamp || null,
        ],
      );
      await sql.query(
        'INSERT INTO "ForeverBridgeProjection" ("id","rootId","guildId","channelId","nonce") VALUES ($1,$2,$3,$4,$5)',
        [
          randomUUID(),
          rootId,
          destination.guildId,
          destination.channelId,
          randomBytes(12).toString("hex"),
        ],
      );
      if (!bridge.reviewRequired)
        await enqueue(sql, bridgeId, rootId, "deliver", 1);
      return rootId;
    });
  }
  async remove(rootId: string, reason: string): Promise<void> {
    const bundle = await this.bundle(rootId);
    if (!bundle) return;
    await this.transaction(async (sql) => {
      await this.bridge(bundle.bridge.id, sql, true);
      await removeRoots(sql, bundle.bridge.id, [rootId], reason);
    });
  }
  async deleted(
    guildId: string,
    channelId: string,
    ids: string[],
  ): Promise<void> {
    const bridge = await this.pairForChannel(guildId, channelId);
    if (!bridge || !ids.length) return;
    await this.transaction(async (sql) => {
      await this.bridge(bridge.id, sql, true);
      const sources = await rows<Root>(
        sql,
        'SELECT * FROM "ForeverBridgeMessage" WHERE "bridgeId"=$1 AND "guildId"=$2 AND "channelId"=$3 AND "messageId"=ANY($4::text[])',
        [bridge.id, guildId, channelId, ids],
      );
      const copies = await rows<Projection>(
        sql,
        'UPDATE "ForeverBridgeProjection" p SET "state"=\'suppressed\',"removedAt"=NOW(),"checkedAt"=NOW() FROM "ForeverBridgeMessage" m WHERE m."id"=p."rootId" AND m."bridgeId"=$1 AND p."guildId"=$2 AND p."channelId"=$3 AND p."messageId"=ANY($4::text[]) RETURNING p.*',
        [bridge.id, guildId, channelId, ids],
      );
      await removeRoots(
        sql,
        bridge.id,
        [...sources.map((v) => v.id), ...copies.map((v) => v.rootId)],
        "discord_deleted",
      );
    });
  }
  async withdraw(
    sql: Sql,
    bridge: Bridge,
    actorId: string,
    block = false,
  ): Promise<void> {
    await sql.query(
      'UPDATE "ForeverDiscordInteraction" SET "state"=\'failed\',"tokenCipher"=NULL,"error"=\'withdrawn\' WHERE "bridgeId"=$1 AND "actorId"=$2 AND "state" IN (\'challenge\',\'pending\',\'processing\')',
      [bridge.id, actorId],
    );
    await sql.query(
      'UPDATE "ForeverBridgeConsent" SET "withdrawnAt"=NOW(),"blocked"=("blocked" OR $3) WHERE "bridgeId"=$1 AND "actorId"=$2',
      [bridge.id, actorId, block],
    );
    if (block)
      for (const guildId of [bridge.guildA, bridge.guildB]) {
        await sql.query(
          'INSERT INTO "ForeverBridgeConsent" ("bridgeId","guildId","actorId","generation","policyVersion","withdrawnAt","blocked") VALUES ($1,$2,$3,$4,$5,NOW(),TRUE) ON CONFLICT ("bridgeId","guildId","actorId") DO UPDATE SET "blocked"=TRUE,"withdrawnAt"=NOW()',
          [bridge.id, guildId, actorId, bridge.generation, policyVersion],
        );
      }
    const roots = await rows<Root>(
      sql,
      'SELECT * FROM "ForeverBridgeMessage" WHERE "bridgeId"=$1 AND "authorId"=$2 AND "state"<>\'removed\'',
      [bridge.id, actorId],
    );
    await removeRoots(
      sql,
      bridge.id,
      roots.map((r) => r.id),
      block ? "staff_block" : "withdrawn",
    );
  }
  async pause(bridgeId: string, reason: string): Promise<void> {
    await this.transaction(async (sql) => {
      const bridge = await this.bridge(bridgeId, sql, true);
      if (!["active", "ready", "validating"].includes(bridge.state)) return;
      await sql.query(
        'UPDATE "ForeverDiscordBridge" SET "state"=\'paused\',"reason"=$2,"version"="version"+1,"generation"="generation"+1,"validatedAt"=NULL WHERE "id"=$1',
        [bridgeId, reason],
      );
      await sql.query(
        'UPDATE "ForeverDiscordOutbox" SET "state"=\'cancelled\',"finishedAt"=NOW() WHERE "bridgeId"=$1 AND "operation"=\'deliver\' AND "state"=\'pending\'',
        [bridgeId],
      );
      await audit(sql, "system:bridge", bridgeId, "paused", { reason });
    });
  }
  async pauseChannel(guildId: string, channelId: string): Promise<void> {
    const pair = await this.pairForChannel(guildId, channelId);
    if (pair)
      await this.pause(pair.id, "permission_change_revalidation_required");
  }
  async claim(): Promise<Job | null> {
    return this.transaction(async (sql) => {
      const runtime = await this.runtime(sql);
      if (runtime.mode === "hard_stop") return null;
      return one<Job>(
        sql,
        `WITH next AS (SELECT j."id" FROM "ForeverDiscordOutbox" j JOIN "ForeverDiscordBridge" b ON b."id"=j."bridgeId"
        WHERE j."state"='pending' AND j."dueAt"<=NOW()
        AND (j."operation"<>'deliver' OR ($1='running' AND b."state"='active'))
        AND NOT EXISTS (SELECT 1 FROM "ForeverDiscordOutbox" other WHERE other."rootId"=j."rootId" AND other."state"='leased')
        ORDER BY CASE WHEN j."operation"='remove' THEN 0 WHEN j."operation"='validate' THEN 1 ELSE 2 END,j."createdAt"
        FOR UPDATE OF j SKIP LOCKED LIMIT 1)
        UPDATE "ForeverDiscordOutbox" SET "state"='leased',"leaseToken"=$2,"leaseUntil"=NOW()+INTERVAL '45 seconds',"attempts"="attempts"+1
        WHERE "id"=(SELECT "id" FROM next) RETURNING *`,
        [runtime.mode, randomUUID()],
      );
    });
  }
  async finish(
    job: Job,
    state: Job["state"] = "done",
    error: string | null = null,
    delaySeconds = 0,
  ): Promise<void> {
    await this.pool.query(
      'UPDATE "ForeverDiscordOutbox" SET "state"=$3,"error"=$4,"leaseUntil"=NULL,"leaseToken"=NULL,"dueAt"=NOW()+($5*INTERVAL \'1 second\'),"finishedAt"=CASE WHEN $3 IN (\'done\',\'cancelled\') THEN NOW() ELSE NULL END WHERE "id"=$1 AND "leaseToken"=$2',
      [
        job.id,
        job.leaseToken,
        state,
        error,
        Math.max(0, Math.min(3600, delaySeconds)),
      ],
    );
  }
  async beginSend(job: Job, fingerprint: string): Promise<boolean> {
    return this.transaction(async (sql) => {
      const bridge = await this.bridge(job.bridgeId, sql, true);
      const bundle = job.rootId ? await this.bundle(job.rootId, sql) : null;
      const runtime = await this.runtime(sql);
      if (
        !bundle ||
        bridge.state !== "active" ||
        runtime.mode !== "running" ||
        runtime.gateway !== "ready" ||
        bundle.root.state !== "live" ||
        bundle.root.generation !== bridge.generation ||
        bundle.root.revision !== job.revision ||
        !bundle.consent ||
        bundle.consent.withdrawnAt ||
        bundle.consent.blocked ||
        bundle.consent.generation !== bridge.generation ||
        ["removed", "suppressed", "uncertain", "sending"].includes(
          bundle.projection.state,
        )
      )
        return false;
      const leased = await sql.query(
        'UPDATE "ForeverDiscordOutbox" SET "startedAt"=NOW() WHERE "id"=$1 AND "state"=\'leased\' AND "leaseToken"=$2 AND "leaseUntil">NOW()',
        [job.id, job.leaseToken],
      );
      if (!leased.rowCount) return false;
      await sql.query(
        'UPDATE "ForeverBridgeProjection" SET "state"=\'sending\',"fingerprint"=$2 WHERE "rootId"=$1',
        [job.rootId, fingerprint],
      );
      return true;
    });
  }
  async recordOutput(
    rootId: string,
    messageId: string,
    revision: number,
    fingerprint: string | null,
  ): Promise<void> {
    const initial = await this.bundle(rootId);
    if (!initial) return;
    await this.transaction(async (sql) => {
      const bridge = await this.bridge(initial.bridge.id, sql, true);
      const current = (await this.bundle(rootId, sql))!;
      if (
        current.projection.messageId &&
        current.projection.messageId !== messageId
      )
        throw new BridgeError(409, "conflicting_output");
      const wasRemoved = ["suppressed", "removed"].includes(
        current.projection.state,
      );
      await sql.query(
        'UPDATE "ForeverBridgeProjection" SET "messageId"=$2,"state"=$3,"appliedRevision"=GREATEST("appliedRevision",$4),"fingerprint"=COALESCE($5,"fingerprint"),"checkedAt"=NOW() WHERE "rootId"=$1',
        [rootId, messageId, "live", revision, fingerprint],
      );
      await sql.query(
        'UPDATE "ForeverDiscordOutbox" SET "state"=CASE WHEN "operation"=\'remove\' THEN \'pending\' ELSE \'done\' END,"dueAt"=NOW(),"finishedAt"=CASE WHEN "operation"=\'remove\' THEN NULL ELSE NOW() END WHERE "rootId"=$1 AND "state"=\'uncertain\'',
        [rootId],
      );
      const runtime = await this.runtime(sql);
      if (
        wasRemoved ||
        current.root.state !== "live" ||
        current.root.generation !== bridge.generation ||
        bridge.state !== "active" ||
        runtime.mode !== "running" ||
        !current.consent ||
        current.consent.withdrawnAt ||
        current.consent.blocked
      ) {
        await removeRoots(sql, bridge.id, [rootId], "late_send_revoked");
        // A previous removal may have completed before this late acknowledgement supplied the output ID.
        await enqueue(
          sql,
          bridge.id,
          rootId,
          "remove",
          current.root.revision + 1000000,
        );
      }
    });
  }
  async echo(
    guildId: string,
    channelId: string,
    messageId: string,
    nonce: string,
  ): Promise<void> {
    const projection = await one<Projection>(
      this.pool,
      'SELECT * FROM "ForeverBridgeProjection" WHERE "guildId"=$1 AND "channelId"=$2 AND "nonce"=$3 AND "state" IN (\'sending\',\'uncertain\')',
      [guildId, channelId, nonce],
    );
    if (projection)
      await this.recordOutput(projection.rootId, messageId, 0, null);
  }
  async recover(): Promise<void> {
    await this.transaction(async (sql) => {
      const bridges = await rows<Bridge>(
        sql,
        'SELECT * FROM "ForeverDiscordBridge" WHERE "state"<>\'retired\' ORDER BY "id" FOR UPDATE',
      );
      await sql.query(
        'UPDATE "ForeverBridgeRuntime" SET "mode"=\'cleanup_only\',"version"="version"+1,"gateway"=\'recovering\',"gapAt"=NOW(),"error"=NULL,"heartbeatAt"=NULL,"leaderId"=NULL WHERE "id"=\'singleton\'',
      );
      for (const bridge of bridges) {
        await sql.query(
          'UPDATE "ForeverDiscordBridge" SET "state"=CASE WHEN "state"=\'retiring\' THEN "state" ELSE \'paused\' END,"generation"="generation"+1,"version"="version"+1,"validatedAt"=NULL,"reason"=\'restart_revalidation_required\' WHERE "id"=$1',
          [bridge.id],
        );
        await sql.query(
          'UPDATE "ForeverBridgeConsent" SET "withdrawnAt"=NOW() WHERE "bridgeId"=$1',
          [bridge.id],
        );
        const roots = await rows<Root>(
          sql,
          'SELECT * FROM "ForeverBridgeMessage" WHERE "bridgeId"=$1 AND "state"<>\'removed\'',
          [bridge.id],
        );
        await removeRoots(
          sql,
          bridge.id,
          roots.map((r) => r.id),
          "restart_cleanup",
        );
      }
      await sql.query(
        `UPDATE "ForeverBridgeProjection" SET "state"=CASE WHEN "messageId" IS NULL THEN 'uncertain' ELSE 'live' END WHERE "state"='sending'`,
      );
      await sql.query(
        `UPDATE "ForeverDiscordOutbox" SET "state"=CASE WHEN "operation"='deliver' THEN 'cancelled' ELSE 'pending' END,"leaseToken"=NULL,"leaseUntil"=NULL WHERE "state"='leased'`,
      );
      await sql.query(
        `UPDATE "ForeverDiscordInteraction" SET "state"='pending' WHERE "state"='processing' AND "expiresAt">NOW()`,
      );
    });
  }
}
