CREATE TABLE "ForeverAuctionConfig" (
  "id" TEXT PRIMARY KEY,
  "version" INTEGER NOT NULL DEFAULT 1,
  "settings" JSONB NOT NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE "ForeverAuctionRun" (
  "id" TEXT PRIMARY KEY,
  "jobKey" TEXT NOT NULL UNIQUE,
  "marketKey" TEXT NOT NULL,
  "sourceScanId" TEXT NOT NULL,
  "sourceAt" TIMESTAMPTZ NOT NULL,
  "mode" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "channelId" TEXT,
  "threadId" TEXT,
  "messageId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ForeverAuctionRun_status_check" CHECK ("status" IN ('preview','skipped','pending','published','uncertain','stale')),
  CONSTRAINT "ForeverAuctionRun_mode_check" CHECK ("mode" IN ('preview','live'))
);
CREATE INDEX "ForeverAuctionRun_market_created_idx" ON "ForeverAuctionRun" ("marketKey","createdAt" DESC);
