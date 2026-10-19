CREATE TABLE IF NOT EXISTS "ForeverResearchFeedback" (
  "id" TEXT PRIMARY KEY,
  "path" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "message" TEXT,
  "status" TEXT NOT NULL DEFAULT 'new',
  "reviewedBy" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "ForeverResearchFeedback_status_createdAt_idx"
  ON "ForeverResearchFeedback" ("status", "createdAt");

CREATE INDEX IF NOT EXISTS "ForeverResearchFeedback_path_createdAt_idx"
  ON "ForeverResearchFeedback" ("path", "createdAt");

ALTER TABLE "ForeverResearchFeedback"
  DROP CONSTRAINT IF EXISTS "ForeverResearchFeedback_kind_check";
ALTER TABLE "ForeverResearchFeedback"
  ADD CONSTRAINT "ForeverResearchFeedback_kind_check"
  CHECK ("kind" IN ('helpful', 'unclear', 'incorrect', 'missing'));

ALTER TABLE "ForeverResearchFeedback"
  DROP CONSTRAINT IF EXISTS "ForeverResearchFeedback_status_check";
ALTER TABLE "ForeverResearchFeedback"
  ADD CONSTRAINT "ForeverResearchFeedback_status_check"
  CHECK ("status" IN ('new', 'reviewing', 'resolved', 'dismissed'));

ALTER TABLE "ForeverResearchFeedback"
  DROP CONSTRAINT IF EXISTS "ForeverResearchFeedback_path_check";
ALTER TABLE "ForeverResearchFeedback"
  ADD CONSTRAINT "ForeverResearchFeedback_path_check"
  CHECK (char_length("path") BETWEEN 1 AND 200 AND "path" LIKE '/research%');

ALTER TABLE "ForeverResearchFeedback"
  DROP CONSTRAINT IF EXISTS "ForeverResearchFeedback_message_check";
ALTER TABLE "ForeverResearchFeedback"
  ADD CONSTRAINT "ForeverResearchFeedback_message_check"
  CHECK ("message" IS NULL OR char_length("message") <= 2000);
