CREATE TABLE "ForeverListingDiscordJob" (
  "id" TEXT PRIMARY KEY,
  "kind" TEXT NOT NULL CHECK ("kind" IN ('guild', 'group')),
  "entityId" TEXT NOT NULL,
  "forumId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "attachment" TEXT,
  "tagNames" TEXT[] NOT NULL,
  "consentAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "status" TEXT NOT NULL DEFAULT 'queued' CHECK ("status" IN ('queued','posting','posted','uncertain','failed','removed','expired')),
  "threadId" TEXT UNIQUE,
  "verifiedTagId" TEXT,
  "lastAuditId" TEXT,
  "lastActorId" TEXT,
  "lastError" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "checkedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("kind", "entityId")
);
CREATE INDEX "ForeverListingDiscordJob_status_nextAttemptAt_idx" ON "ForeverListingDiscordJob" ("status", "nextAttemptAt");
CREATE TABLE "ForeverListingDiscordHealth" (
  "id" TEXT PRIMARY KEY,
  "checkedAt" TIMESTAMPTZ NOT NULL,
  "status" TEXT NOT NULL
);
REVOKE ALL ON "ForeverListingDiscordJob", "ForeverListingDiscordHealth" FROM PUBLIC;
