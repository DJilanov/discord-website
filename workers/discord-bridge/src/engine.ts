import { decryptToken } from "../../../lib/discord-bridge/crypto.js";
import {
  ephemeral,
  type EphemeralResponse,
} from "../../../lib/discord-bridge/commands.js";
import {
  eligibility,
  publicationAllowed,
  payloadFingerprint,
  renderMessage,
} from "../../../lib/discord-bridge/policy.js";
import {
  audit,
  BridgeStore,
  enqueue,
  one,
  rows,
} from "../../../lib/discord-bridge/store.js";
import type {
  Job,
  Bridge,
  Projection,
  Root,
} from "../../../lib/discord-bridge/contracts.js";
import { DiscordFailure, type BridgeTransport } from "./transport.js";

interface Continuation {
  id: string;
  bridgeId: string;
  guildId: string;
  actorId: string;
  generation: number;
  policyVersion: number;
  tokenCipher: string;
  expiresAt: Date;
  ack: EphemeralResponse;
}

export class BridgeEngine {
  constructor(
    readonly store: BridgeStore,
    readonly transport: BridgeTransport,
    private readonly fingerprintKey: string,
    private readonly interactionKey: string,
  ) {}

  async tick(): Promise<boolean> {
    const job = await this.store.claim();
    if (!job) return false;
    let externalCreate = false;
    try {
      if (job.operation === "validate") {
        const bridge = await this.store.bridge(job.bridgeId);
        if (bridge.state !== "validating" || bridge.version !== job.revision) {
          await this.store.finish(job, "cancelled");
          return true;
        }
        const fingerprint = await this.transport.validate(bridge);
        await this.store.transaction(async (sql) => {
          const current = await this.store.bridge(bridge.id, sql, true);
          if (
            current.version !== job.revision ||
            current.state !== "validating"
          )
            return;
          await sql.query(
            'UPDATE "ForeverDiscordBridge" SET "state"=\'ready\',"fingerprint"=$2,"validatedAt"=NOW(),"reason"=NULL,"version"="version"+1 WHERE "id"=$1',
            [bridge.id, fingerprint],
          );
          await audit(sql, "system:bridge", bridge.id, "validated");
          await sql.query(
            'UPDATE "ForeverDiscordOutbox" SET "state"=\'cancelled\',"finishedAt"=NOW() WHERE "bridgeId"=$1 AND "operation"=\'validate\' AND "state"=\'failed\' AND "revision"<$2',
            [bridge.id, job.revision],
          );
          await sql.query(
            'UPDATE "ForeverBridgeRuntime" SET "error"=NULL WHERE "id"=\'singleton\' AND "error"<>\'unauthorized\'',
          );
        });
      } else {
        const bundle = await this.store.bundle(job.rootId!);
        if (!bundle) {
          await this.store.finish(job, "cancelled");
          return true;
        }
        const { root, projection, bridge, consent } = bundle;
        if (job.operation === "resolve") {
          if (projection.state !== "uncertain" || !projection.candidateId) {
            await this.store.finish(job, "cancelled");
            return true;
          }
          const output = await this.transport.output({
            ...projection,
            messageId: projection.candidateId,
          });
          if (!output) {
            await this.store.finish(job, "failed", "candidate_not_found");
            return true;
          }
          await this.store.recordOutput(
            root.id,
            projection.candidateId,
            0,
            null,
          );
          await this.store.pool.query(
            'UPDATE "ForeverBridgeProjection" SET "candidateId"=NULL WHERE "id"=$1',
            [projection.id],
          );
        } else if (job.operation === "remove") {
          if (
            projection.state === "suppressed" ||
            (projection.state === "removed" && !projection.messageId)
          ) {
            await this.store.finish(job);
            return true;
          }
          if (
            !projection.messageId &&
            ["sending", "uncertain"].includes(projection.state)
          ) {
            await this.store.finish(job, "uncertain", "output_id_unknown");
            return true;
          }
          if (
            projection.messageId &&
            (await this.transport.output(projection))
          ) {
            if ((await this.store.runtime()).mode === "hard_stop") {
              await this.store.finish(job, "pending", "hard_stop", 5);
              return true;
            }
            await this.transport.remove(projection);
          }
          await this.store.pool.query(
            'UPDATE "ForeverBridgeProjection" SET "state"=\'removed\',"removedAt"=NOW(),"checkedAt"=NOW() WHERE "id"=$1',
            [projection.id],
          );
        } else {
          if (
            root.state !== "live" ||
            root.revision !== job.revision ||
            root.generation !== bridge.generation ||
            !publicationAllowed(bridge, root.authorId) ||
            ["suppressed", "removed", "uncertain", "sending"].includes(
              projection.state,
            )
          ) {
            await this.store.finish(job, "cancelled");
            return true;
          }
          if (
            !projection.messageId &&
            Date.now() - root.createdAt.getTime() > 120000
          ) {
            await this.store.remove(root.id, "stale_create");
            await this.store.finish(job, "cancelled");
            return true;
          }
          if (root.expiresAt.getTime() <= Date.now()) {
            await this.store.remove(root.id, "expired");
            await this.store.finish(job, "cancelled");
            return true;
          }
          const fingerprint = await this.transport.validate(bridge);
          if (fingerprint !== bridge.fingerprint) {
            await this.store.pause(bridge.id, "audience_changed");
            await this.store.finish(job, "cancelled");
            return true;
          }
          const source = await this.transport.source(
            root.guildId,
            root.channelId,
            root.messageId,
          );
          const denial = source
            ? eligibility(bridge, consent, source)
            : "source_deleted";
          if (
            denial ||
            !source ||
            source.author.id !== root.authorId ||
            !(await this.transport.eligible(bridge, root.authorId))
          ) {
            await this.store.remove(
              root.id,
              denial || "participant_ineligible",
            );
            await this.store.finish(job, "cancelled");
            return true;
          }
          // A held revision was reviewed at its source link; edits after that review invalidate it.
          if (
            bridge.reviewRequired &&
            source.edited_timestamp &&
            Date.parse(source.edited_timestamp) >
              (root.editedAt?.getTime() || root.sourceAt.getTime())
          ) {
            await this.store.remove(root.id, "edited_after_review");
            await this.store.finish(job, "cancelled");
            return true;
          }
          let replyId: string | undefined;
          if (root.parentId) {
            const parent = await this.store.bundle(root.parentId);
            if (
              !parent ||
              parent.root.state !== "live" ||
              parent.projection.state !== "live"
            ) {
              await this.store.remove(root.id, "parent_removed");
              await this.store.finish(job, "cancelled");
              return true;
            }
            replyId =
              parent.root.channelId === projection.channelId
                ? parent.root.messageId
                : parent.projection.messageId || undefined;
          }
          const body = renderMessage(source, bridge, projection.nonce, replyId);
          const hash = payloadFingerprint(body.content, this.fingerprintKey);
          if (projection.messageId) {
            const output = await this.transport.output(projection);
            if (!output) {
              await this.store.deleted(
                projection.guildId,
                projection.channelId,
                [projection.messageId],
              );
              await this.store.finish(job, "cancelled");
              return true;
            }
            if (
              payloadFingerprint(output.content, this.fingerprintKey) === hash
            ) {
              await this.store.recordOutput(
                root.id,
                projection.messageId,
                job.revision,
                hash,
              );
              await this.store.finish(job);
              return true;
            }
          }
          if (!(await this.store.beginSend(job, hash))) {
            await this.store.finish(job, "cancelled");
            return true;
          }
          let messageId = projection.messageId;
          if (!messageId) {
            externalCreate = true;
            messageId = await this.transport.create(projection, body);
          } else await this.transport.edit(projection, body);
          await this.store.recordOutput(root.id, messageId, job.revision, hash);
        }
      }
      await this.store.finish(job);
    } catch (error) {
      const code =
        error instanceof DiscordFailure
          ? error.code
          : "storage_or_runtime_failure";
      const definitelyRejected =
        error instanceof DiscordFailure &&
        [
          "rate_limited",
          "forbidden",
          "unauthorized",
          "invalid",
          "not_found",
        ].includes(error.code);
      if (job.rootId) {
        await this.store.pool.query(
          `UPDATE "ForeverBridgeProjection" SET "state"=CASE WHEN "messageId" IS NOT NULL THEN 'live' WHEN $2 THEN 'uncertain' ELSE 'pending' END
          WHERE "rootId"=$1 AND "state"='sending'`,
          [job.rootId, externalCreate && !definitelyRejected],
        );
      }
      if (
        code === "forbidden" ||
        code === "unauthorized" ||
        (job.operation === "validate" && code === "invalid")
      )
        await this.store.pause(job.bridgeId, code);
      if (code === "unauthorized")
        await this.store.pool.query(
          'UPDATE "ForeverBridgeRuntime" SET "mode"=\'hard_stop\',"version"="version"+1,"error"=\'unauthorized\' WHERE "id"=\'singleton\'',
        );
      const latest = job.rootId ? await this.store.bundle(job.rootId) : null;
      const uncertain =
        externalCreate && !definitelyRejected && !latest?.projection.messageId;
      const retryable =
        ["rate_limited", "unavailable", "not_found"].includes(code) &&
        job.attempts < 8;
      await this.store.finish(
        job,
        uncertain ? "uncertain" : retryable ? "pending" : "failed",
        code,
        error instanceof DiscordFailure && code === "rate_limited"
          ? error.retryAfter
          : Math.min(300, 2 ** job.attempts),
      );
    }
    return true;
  }

  async consentTick(): Promise<void> {
    if ((await this.store.runtime()).mode === "hard_stop") return;
    const receipt = await this.store.transaction(async (sql) =>
      one<Continuation>(
        sql,
        `WITH next AS (
      SELECT "id" FROM "ForeverDiscordInteraction" WHERE "state"='pending' AND "expiresAt">NOW() ORDER BY "createdAt" FOR UPDATE SKIP LOCKED LIMIT 1)
      UPDATE "ForeverDiscordInteraction" SET "state"='processing' WHERE "id"=(SELECT "id" FROM next) RETURNING *`,
      ),
    );
    if (!receipt) return;
    try {
      let content =
        receipt.ack.type === 4 ? receipt.ack.data.content : undefined;
      if (!content) {
        const bridge = await this.store.bridge(receipt.bridgeId);
        const eligible =
          publicationAllowed(bridge, receipt.actorId) &&
          bridge.generation === receipt.generation &&
          (await this.transport.eligible(bridge, receipt.actorId));
        content = await this.store.transaction(async (sql) => {
          const current = await this.store.bridge(bridge.id, sql, true);
          const activeReceipt = await one<{ state: string }>(
            sql,
            'SELECT "state" FROM "ForeverDiscordInteraction" WHERE "id"=$1',
            [receipt.id],
          );
          const runtime = await this.store.runtime(sql);
          const consent = await this.store.consent(
            bridge.id,
            receipt.guildId,
            receipt.actorId,
            sql,
          );
          if (
            !eligible ||
            runtime.mode !== "running" ||
            runtime.gateway !== "ready" ||
            activeReceipt?.state !== "processing" ||
            !publicationAllowed(current, receipt.actorId) ||
            current.generation !== receipt.generation ||
            current.policyVersion !== receipt.policyVersion ||
            consent?.blocked ||
            receipt.expiresAt.getTime() <= Date.now()
          ) {
            return "Participation was not enabled. Membership, speaking permissions, staff restrictions or bridge availability prevented enrollment. Try /bridge status or ask a moderator.";
          }
          await sql.query(
            `INSERT INTO "ForeverBridgeConsent" ("bridgeId","guildId","actorId","generation","policyVersion") VALUES ($1,$2,$3,$4,$5)
            ON CONFLICT ("bridgeId","guildId","actorId") DO UPDATE SET "generation"=$4,"policyVersion"=$5,"optedAt"=CASE WHEN "ForeverBridgeConsent"."withdrawnAt" IS NULL AND "ForeverBridgeConsent"."generation"=$4 THEN "ForeverBridgeConsent"."optedAt" ELSE NOW() END,"withdrawnAt"=NULL WHERE NOT "ForeverBridgeConsent"."blocked"`,
            [
              bridge.id,
              receipt.guildId,
              receipt.actorId,
              receipt.generation,
              receipt.policyVersion,
            ],
          );
          await audit(
            sql,
            `discord:${receipt.actorId}`,
            bridge.id,
            "consent_granted",
            {
              guildId: receipt.guildId,
              generation: receipt.generation,
              policyVersion: receipt.policyVersion,
            },
          );
          return "You are opted in from this channel for this pair only. Only new eligible text can be relayed. Use /bridge leave here to stop both directions of this pair and request removal. Other pairs require separate opt-ins. Join in the counterpart channel to share messages from there.";
        });
        await this.store.pool.query(
          'UPDATE "ForeverDiscordInteraction" SET "ack"=$2 WHERE "id"=$1 AND "state"=\'processing\'',
          [receipt.id, JSON.stringify(ephemeral(content))],
        );
      }
      const stillProcessing = await one<{ state: string }>(
        this.store.pool,
        'SELECT "state" FROM "ForeverDiscordInteraction" WHERE "id"=$1',
        [receipt.id],
      );
      if (stillProcessing?.state !== "processing") return;
      await this.transport.respond(
        decryptToken(receipt.tokenCipher, this.interactionKey, receipt.id),
        content,
      );
      await this.store.pool.query(
        'UPDATE "ForeverDiscordInteraction" SET "state"=\'done\',"tokenCipher"=NULL WHERE "id"=$1',
        [receipt.id],
      );
    } catch (error) {
      const code =
        error instanceof DiscordFailure ? error.code : "consent_failed";
      await this.store.pool.query(
        'UPDATE "ForeverDiscordInteraction" SET "state"=$2,"error"=$3,"tokenCipher"=CASE WHEN $2=\'failed\' THEN NULL ELSE "tokenCipher" END WHERE "id"=$1 AND "state"=\'processing\'',
        [
          receipt.id,
          ["rate_limited", "unavailable"].includes(code) ? "pending" : "failed",
          code,
        ],
      );
    }
  }

  async maintenance(): Promise<void> {
    const endedTests = await rows<Bridge>(
      this.store.pool,
      'SELECT * FROM "ForeverDiscordBridge" WHERE "state"=\'pilot\' AND "pilotUntil"<=NOW()',
    );
    for (const bridge of endedTests)
      await this.store.pause(bridge.id, "test_expired");
    await this.store.pool.query(
      'UPDATE "ForeverDiscordInteraction" SET "state"=\'failed\',"tokenCipher"=NULL,"error"=\'expired\' WHERE "expiresAt"<=NOW() AND "state" IN (\'pending\',\'processing\',\'challenge\')',
    );
    const expired = await rows<Root>(
      this.store.pool,
      'SELECT * FROM "ForeverBridgeMessage" WHERE "state"<>\'removed\' AND ("expiresAt"<=NOW() OR ("state"=\'held\' AND "createdAt"<NOW()-INTERVAL \'2 minutes\')) LIMIT 50',
    );
    for (const root of expired) await this.store.remove(root.id, "expired");
    // A lease that crossed an external POST boundary is never automatically reissued.
    const leases = await rows<Job>(
      this.store.pool,
      'SELECT * FROM "ForeverDiscordOutbox" WHERE "state"=\'leased\' AND "leaseUntil"<NOW()',
    );
    for (const job of leases) {
      const bundle = job.rootId ? await this.store.bundle(job.rootId) : null;
      const uncertain =
        job.operation === "deliver" &&
        !!job.startedAt &&
        !bundle?.projection.messageId;
      if (bundle)
        await this.store.pool.query(
          'UPDATE "ForeverBridgeProjection" SET "state"=$2 WHERE "rootId"=$1 AND "state"=\'sending\'',
          [
            bundle.root.id,
            uncertain
              ? "uncertain"
              : bundle.projection.messageId
                ? "live"
                : "pending",
          ],
        );
      await this.store.finish(
        job,
        uncertain ? "uncertain" : "pending",
        "expired_lease",
        5,
      );
    }
    await this.store.pool
      .query(`UPDATE "ForeverDiscordBridge" b SET "state"='retired',"version"="version"+1 WHERE b."state"='retiring'
      AND NOT EXISTS (SELECT 1 FROM "ForeverBridgeMessage" m JOIN "ForeverBridgeProjection" p ON p."rootId"=m."id" WHERE m."bridgeId"=b."id" AND p."state" NOT IN ('removed','suppressed'))`);
    await this.purge();
  }
  async reconcile(): Promise<void> {
    if ((await this.store.runtime()).mode === "hard_stop") return;
    const projection = await one<Projection>(
      this.store.pool,
      `SELECT p.* FROM "ForeverBridgeProjection" p JOIN "ForeverBridgeMessage" m ON m."id"=p."rootId"
      WHERE p."state" IN ('live','uncertain') AND (p."checkedAt" IS NULL OR p."checkedAt"<NOW()-INTERVAL '15 minutes')
      ORDER BY p."checkedAt" NULLS FIRST LIMIT 1`,
    );
    if (!projection) return;
    const bundle = (await this.store.bundle(projection.rootId))!;
    try {
      if (projection.messageId) {
        const output = await this.transport.output(projection);
        if (!output)
          await this.store.deleted(projection.guildId, projection.channelId, [
            projection.messageId,
          ]);
        else if (bundle.root.state === "removed")
          await this.requeueRemoval(bundle.root);
        else {
          const source = await this.transport.source(
            bundle.root.guildId,
            bundle.root.channelId,
            bundle.root.messageId,
          );
          if (!source)
            await this.store.remove(bundle.root.id, "source_deleted");
          else if (publicationAllowed(bundle.bridge, bundle.root.authorId))
            await this.store.observe(source, bundle.bridge.id, true);
        }
      }
      await this.store.pool.query(
        'UPDATE "ForeverBridgeProjection" SET "checkedAt"=NOW() WHERE "id"=$1',
        [projection.id],
      );
    } catch (error) {
      if (
        error instanceof DiscordFailure &&
        ["forbidden", "unauthorized"].includes(error.code)
      )
        await this.store.pause(bundle.bridge.id, error.code);
      await this.store.pool.query(
        'UPDATE "ForeverBridgeRuntime" SET "error"=\'reconciliation_delayed\' WHERE "id"=\'singleton\'',
      );
    }
  }
  private async requeueRemoval(root: Root): Promise<void> {
    await this.store.transaction(async (sql) => {
      await this.store.bridge(root.bridgeId, sql, true);
      await sql.query(
        'UPDATE "ForeverDiscordOutbox" SET "state"=\'pending\',"dueAt"=NOW(),"attempts"=0 WHERE "rootId"=$1 AND "operation"=\'remove\' AND "state" IN (\'failed\',\'uncertain\')',
        [root.id],
      );
      await enqueue(sql, root.bridgeId, root.id, "remove", root.revision);
    });
  }
  private async purge(): Promise<void> {
    await this.store.transaction(async (sql) => {
      await sql.query(
        'DELETE FROM "ForeverDiscordInteraction" WHERE "createdAt"<NOW()-INTERVAL \'7 days\' AND "tokenCipher" IS NULL',
      );
      await sql.query(
        "DELETE FROM \"ForeverDiscordOutbox\" WHERE \"state\" IN ('done','cancelled') AND \"finishedAt\"<NOW()-INTERVAL '7 days'",
      );
      // Purge only leaf mappings with confirmed deletion; repeat sweeps remove safe ancestors.
      const removable = await rows<{ id: string }>(
        sql,
        `SELECT m."id" FROM "ForeverBridgeMessage" m JOIN "ForeverBridgeProjection" p ON p."rootId"=m."id"
        WHERE m."state"='removed' AND p."state" IN ('removed','suppressed') AND p."removedAt"<NOW()-INTERVAL '7 days'
        AND NOT EXISTS (SELECT 1 FROM "ForeverBridgeMessage" child WHERE child."parentId"=m."id")
        AND NOT EXISTS (SELECT 1 FROM "ForeverDiscordOutbox" j WHERE j."rootId"=m."id" AND j."state" IN ('leased','pending')) LIMIT 100`,
      );
      const ids = removable.map((v) => v.id);
      if (ids.length) {
        await sql.query(
          'DELETE FROM "ForeverDiscordOutbox" WHERE "rootId"=ANY($1::text[])',
          [ids],
        );
        await sql.query(
          'DELETE FROM "ForeverBridgeProjection" WHERE "rootId"=ANY($1::text[])',
          [ids],
        );
        await sql.query(
          'DELETE FROM "ForeverBridgeMessage" WHERE "id"=ANY($1::text[])',
          [ids],
        );
      }
      await sql.query(`DELETE FROM "ForeverBridgeConsent" c WHERE NOT c."blocked" AND c."withdrawnAt"<NOW()-INTERVAL '37 days'
        AND NOT EXISTS (SELECT 1 FROM "ForeverBridgeMessage" m WHERE m."bridgeId"=c."bridgeId" AND m."authorId"=c."actorId")`);
      await sql.query("SELECT forever_bridge_prune_audit()");
    });
  }
}
