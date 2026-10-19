CREATE TABLE "ForeverRaidNativeDraft" (
  "id" TEXT PRIMARY KEY,
  "actorId" TEXT NOT NULL CHECK ("actorId" ~ '^[0-9]{17,20}$'),
  "eventId" TEXT NOT NULL,
  "guildId" TEXT NOT NULL CHECK ("guildId" ~ '^[0-9]{17,20}$'),
  "channelId" TEXT NOT NULL CHECK ("channelId" ~ '^[0-9]{17,20}$'),
  "sourceMessageId" TEXT NOT NULL CHECK ("sourceMessageId" ~ '^[0-9]{17,20}$'),
  "revision" INTEGER NOT NULL DEFAULT 1 CHECK ("revision" > 0),
  "state" JSONB NOT NULL,
  "policyChecksum" TEXT NOT NULL,
  "signupChecksum" TEXT NOT NULL,
  "completedAt" TIMESTAMPTZ(3),
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT NOW()
);
CREATE INDEX ON "ForeverRaidNativeDraft" ("expiresAt");
CREATE INDEX ON "ForeverRaidNativeDraft" ("eventId", "actorId");
CREATE TABLE "ForeverRaidNativeWork" (
  "id" TEXT PRIMARY KEY CHECK ("id" ~ '^[0-9]{17,20}$'),
  "actorId" TEXT NOT NULL CHECK ("actorId" ~ '^[0-9]{17,20}$'),
  "input" JSONB NOT NULL,
  "tokenCipher" TEXT,
  "response" JSONB,
  "status" TEXT NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending','processing','responding','done','failed')),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "leaseId" TEXT,
  "leaseUntil" TIMESTAMPTZ(3),
  "nextAttemptAt" TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "lastError" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT NOW()
);
CREATE INDEX ON "ForeverRaidNativeWork" ("status", "nextAttemptAt");
CREATE INDEX ON "ForeverRaidNativeWork" ("expiresAt");
REVOKE ALL ON "ForeverRaidNativeDraft", "ForeverRaidNativeWork" FROM PUBLIC;
