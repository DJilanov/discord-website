ALTER TABLE "ForeverGuild"
  ALTER COLUMN "status" SET DEFAULT 'approved';

ALTER TABLE "ForeverGroup"
  ALTER COLUMN "status" SET DEFAULT 'approved';

ALTER TABLE "ForeverListingDiscordJob"
  ADD COLUMN "reviewNotificationStatus" TEXT NOT NULL DEFAULT 'queued',
  ADD COLUMN "reviewNotificationMessageId" TEXT,
  ADD COLUMN "reviewNotificationAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "reviewNotificationNextAttemptAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN "reviewNotificationError" TEXT,
  ADD COLUMN "reviewNotifiedAt" TIMESTAMPTZ,
  ADD CONSTRAINT "ForeverListingDiscordJob_review_notification_status_check"
    CHECK ("reviewNotificationStatus" IN ('queued','sending','sent','failed')),
  ADD CONSTRAINT "ForeverListingDiscordJob_review_notification_attempts_check"
    CHECK ("reviewNotificationAttempts" >= 0);

CREATE INDEX "ForeverListingDiscordJob_reviewNotificationStatus_reviewNotificationNextAttemptAt_idx"
  ON "ForeverListingDiscordJob" ("reviewNotificationStatus", "reviewNotificationNextAttemptAt");

INSERT INTO "ForeverAuditLog" (
  "id", "actorId", "action", "entityType", "entityId", "details", "createdAt"
)
SELECT
  'listing-backfill:guild:' || "id",
  'migration:033',
  'auto_published',
  'guild',
  "id",
  jsonb_build_object('previousStatus', 'pending', 'reviewStatus', 'awaiting_review'),
  NOW()
FROM "ForeverGuild"
WHERE "status" = 'pending';

UPDATE "ForeverGuild"
SET "status" = 'approved', "updatedAt" = NOW()
WHERE "status" = 'pending';

INSERT INTO "ForeverAuditLog" (
  "id", "actorId", "action", "entityType", "entityId", "details", "createdAt"
)
SELECT
  'listing-backfill:group:' || "id",
  'migration:033',
  'auto_published',
  'group',
  "id",
  jsonb_build_object('previousStatus', 'pending', 'reviewStatus', 'awaiting_review'),
  NOW()
FROM "ForeverGroup"
WHERE "status" = 'pending' AND "expiresAt" > NOW();

UPDATE "ForeverGroup"
SET "status" = 'approved', "updatedAt" = NOW()
WHERE "status" = 'pending' AND "expiresAt" > NOW();

UPDATE "ForeverGroup"
SET "status" = 'expired', "updatedAt" = NOW()
WHERE "status" = 'pending' AND "expiresAt" <= NOW();

UPDATE "ForeverListingDiscordJob" AS job
SET
  "reviewNotificationStatus" = 'sent',
  "reviewNotifiedAt" = NOW()
WHERE
  (job."kind" = 'guild' AND EXISTS (
    SELECT 1 FROM "ForeverGuild" AS guild
    WHERE guild."id" = job."entityId"
      AND guild."status" IN ('hidden', 'rejected')
  ))
  OR
  (job."kind" = 'group' AND EXISTS (
    SELECT 1 FROM "ForeverGroup" AS group_listing
    WHERE group_listing."id" = job."entityId"
      AND group_listing."status" IN ('hidden', 'rejected', 'expired')
  ));
