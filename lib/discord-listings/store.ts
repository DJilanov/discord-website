import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import type { ListingJob } from "./contracts";

export interface ListingState {
  status: string;
  startsAt?: Date;
  expiresAt?: Date;
}
export interface ListingStore {
  state(job: ListingJob): Promise<ListingState | null>;
  update(
    job: ListingJob,
    values: {
      status?: string;
      threadId?: string;
      lastError?: string | null;
    },
  ): Promise<void>;
  withdraw(job: ListingJob, reason: string): Promise<void>;
  beginNotification(job: ListingJob): Promise<boolean>;
  completeNotification(job: ListingJob, messageId: string): Promise<void>;
  failNotification(
    job: ListingJob,
    reason: string,
    terminal: boolean,
  ): Promise<void>;
}

export function listingStore(client: PoolClient): ListingStore {
  const table = (job: ListingJob): string =>
    job.kind === "guild" ? '"ForeverGuild"' : '"ForeverGroup"';
  return {
    async state(job): Promise<ListingState | null> {
      const columns =
        job.kind === "guild" ? '"status"' : '"status","startsAt","expiresAt"';
      const rows = await client.query<ListingState>(
        `SELECT ${columns} FROM ${table(job)} WHERE "id"=$1`,
        [job.entityId],
      );
      return rows.rows[0] ?? null;
    },
    async update(job, values): Promise<void> {
      const entries = Object.entries(values);
      await client.query(
        `UPDATE "ForeverListingDiscordJob" SET ${entries.map(([key], index) => `"${key}"=$${index + 2}`).join(",")},"updatedAt"=NOW(),"checkedAt"=NOW(),"nextAttemptAt"=NOW()+INTERVAL '2 minutes',"attempts"="attempts"+1 WHERE "id"=$1`,
        [job.id, ...entries.map(([, value]) => value)],
      );
      Object.assign(job, values);
    },
    async withdraw(job, reason): Promise<void> {
      await client.query("BEGIN");
      try {
        const locked = await client.query<{ id: string }>(
          'SELECT "id" FROM "ForeverListingDiscordJob" WHERE "id"=$1 FOR UPDATE',
          [job.id],
        );
        const existing = await client.query<ListingState>(
          `SELECT "status"${job.kind === "group" ? ',"startsAt","expiresAt"' : ""} FROM ${table(job)} WHERE "id"=$1 FOR UPDATE`,
          [job.entityId],
        );
        const state = existing.rows[0];
        if (!locked.rows[0]) throw new Error("listing_job_missing");
        const expired = state?.startsAt && state.startsAt <= new Date();
        const status = !state
          ? null
          : expired
            ? "expired"
            : state.status === "approved"
              ? "hidden"
              : state.status;
        if (state && status !== state.status) {
          await client.query(
            `UPDATE ${table(job)} SET "status"=$2,"updatedAt"=NOW() WHERE "id"=$1`,
            [job.entityId, status],
          );
          await client.query(
            'INSERT INTO "ForeverAuditLog" ("id","actorId","entityType","entityId","action","details","createdAt") VALUES ($1,$2,$3,$4,$5,$6,NOW())',
            [
              randomUUID(),
              "discord:listings-worker",
              job.kind,
              job.entityId,
              status,
              JSON.stringify({
                reason,
                previousStatus: state.status,
                threadId: job.threadId,
              }),
            ],
          );
        }
        await client.query(
          'UPDATE "ForeverListingDiscordJob" SET "lastError"=$2,"checkedAt"=NOW(),"updatedAt"=NOW() WHERE "id"=$1',
          [job.id, reason],
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    },
    async beginNotification(job): Promise<boolean> {
      const result = await client.query<{ reviewNotificationAttempts: number }>(
        `UPDATE "ForeverListingDiscordJob"
         SET "reviewNotificationStatus"='sending',
             "reviewNotificationAttempts"="reviewNotificationAttempts"+1,
             "reviewNotificationError"=NULL,
             "updatedAt"=NOW()
         WHERE "id"=$1
           AND "reviewNotificationStatus"='queued'
           AND "reviewNotificationNextAttemptAt"<=NOW()
         RETURNING "reviewNotificationAttempts"`,
        [job.id],
      );
      const attempt = result.rows[0]?.reviewNotificationAttempts;
      if (!attempt) return false;
      job.reviewNotificationStatus = "sending";
      job.reviewNotificationAttempts = attempt;
      job.reviewNotificationError = null;
      return true;
    },
    async completeNotification(job, messageId): Promise<void> {
      await client.query(
        `UPDATE "ForeverListingDiscordJob"
         SET "reviewNotificationStatus"='sent',
             "reviewNotificationMessageId"=$2,
             "reviewNotificationError"=NULL,
             "reviewNotifiedAt"=NOW(),
             "updatedAt"=NOW()
         WHERE "id"=$1 AND "reviewNotificationStatus"='sending'`,
        [job.id, messageId],
      );
      job.reviewNotificationStatus = "sent";
      job.reviewNotificationMessageId = messageId;
      job.reviewNotificationError = null;
      job.reviewNotifiedAt = new Date();
    },
    async failNotification(job, reason, terminal): Promise<void> {
      const nextStatus = terminal ? "failed" : "queued";
      const delaySeconds = Math.min(
        300,
        15 * 2 ** Math.max(0, job.reviewNotificationAttempts - 1),
      );
      await client.query(
        `UPDATE "ForeverListingDiscordJob"
         SET "reviewNotificationStatus"=$2,
             "reviewNotificationError"=$3,
             "reviewNotificationNextAttemptAt"=NOW()+($4 * INTERVAL '1 second'),
             "updatedAt"=NOW()
         WHERE "id"=$1 AND "reviewNotificationStatus"='sending'`,
        [job.id, nextStatus, reason, delaySeconds],
      );
      job.reviewNotificationStatus = nextStatus;
      job.reviewNotificationError = reason;
      job.reviewNotificationNextAttemptAt = new Date(
        Date.now() + delaySeconds * 1000,
      );
    },
  };
}
