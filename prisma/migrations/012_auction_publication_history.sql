ALTER TABLE "ForeverAuctionRun"
  ADD COLUMN "observations" JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN "publishedAt" TIMESTAMPTZ;

UPDATE "ForeverAuctionRun" SET "publishedAt" = "createdAt"
WHERE "status" IN ('published', 'stale');

ALTER TABLE "ForeverAuctionRun"
  ADD CONSTRAINT "ForeverAuctionRun_publication_timestamp"
  CHECK ("status" NOT IN ('published', 'stale') OR "publishedAt" IS NOT NULL);

CREATE INDEX "ForeverAuctionRun_marketKey_publishedAt_idx"
  ON "ForeverAuctionRun" ("marketKey", "publishedAt");
