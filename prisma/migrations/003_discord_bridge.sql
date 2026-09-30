CREATE TABLE "ForeverDiscordBridge" (
  "id" TEXT PRIMARY KEY, "name" TEXT NOT NULL,
  "guildA" TEXT NOT NULL CHECK ("guildA" = '1411533815356194968'),
  "channelA" TEXT NOT NULL CHECK ("channelA" ~ '^[1-9][0-9]{16,19}$'),
  "guildB" TEXT NOT NULL CHECK ("guildB" = '1554316932948172940'),
  "channelB" TEXT NOT NULL CHECK ("channelB" ~ '^[1-9][0-9]{16,19}$'),
  "direction" TEXT NOT NULL DEFAULT 'two_way' CHECK ("direction" = 'two_way'),
  "state" TEXT NOT NULL DEFAULT 'draft' CHECK ("state" IN ('draft','validating','ready','active','paused','retiring','retired')),
  "reviewRequired" BOOLEAN NOT NULL DEFAULT TRUE,
  "version" INTEGER NOT NULL DEFAULT 1, "generation" INTEGER NOT NULL DEFAULT 1,
  "policyVersion" INTEGER NOT NULL DEFAULT 1, "activatedAt" TIMESTAMPTZ,
  "validatedAt" TIMESTAMPTZ, "fingerprint" TEXT,
  "approvalA" TEXT, "approvalB" TEXT, "noticeA" TEXT, "noticeB" TEXT,
  "moderatorIds" TEXT[] NOT NULL DEFAULT '{}', "blockedTerms" TEXT[] NOT NULL DEFAULT '{}',
  "reason" TEXT, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ("channelA" <> "channelB"), CHECK ("version" > 0 AND "generation" > 0 AND "policyVersion" > 0)
);
-- The first release deliberately supports only one pair, including drafts.
CREATE UNIQUE INDEX "ForeverDiscordBridge_single_pair" ON "ForeverDiscordBridge" ((TRUE)) WHERE "state" <> 'retired';
CREATE TABLE "ForeverBridgeConsent" (
  "bridgeId" TEXT NOT NULL REFERENCES "ForeverDiscordBridge"("id") ON DELETE RESTRICT,
  "guildId" TEXT NOT NULL CHECK ("guildId" ~ '^[1-9][0-9]{16,19}$'),
  "actorId" TEXT NOT NULL CHECK ("actorId" ~ '^[1-9][0-9]{16,19}$'),
  "generation" INTEGER NOT NULL, "policyVersion" INTEGER NOT NULL,
  "optedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "withdrawnAt" TIMESTAMPTZ, "blocked" BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY ("bridgeId", "guildId", "actorId")
);
CREATE TABLE "ForeverBridgeMessage" (
  "id" TEXT PRIMARY KEY, "bridgeId" TEXT NOT NULL REFERENCES "ForeverDiscordBridge"("id") ON DELETE RESTRICT,
  "guildId" TEXT NOT NULL, "channelId" TEXT NOT NULL, "messageId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL, "generation" INTEGER NOT NULL, "revision" INTEGER NOT NULL DEFAULT 1,
  "approvedRevision" INTEGER NOT NULL DEFAULT 0,
  "state" TEXT NOT NULL CHECK ("state" IN ('held','live','removed')), "reason" TEXT,
  "parentId" TEXT REFERENCES "ForeverBridgeMessage"("id") ON DELETE RESTRICT,
  "sourceAt" TIMESTAMPTZ NOT NULL, "editedAt" TIMESTAMPTZ, "expiresAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("bridgeId", "guildId", "channelId", "messageId"),
  CHECK ("messageId" ~ '^[1-9][0-9]{16,19}$' AND "authorId" ~ '^[1-9][0-9]{16,19}$')
);
CREATE INDEX ON "ForeverBridgeMessage" ("bridgeId", "authorId", "state");
CREATE INDEX ON "ForeverBridgeMessage" ("parentId");
CREATE INDEX ON "ForeverBridgeMessage" ("expiresAt", "state");
CREATE TABLE "ForeverBridgeProjection" (
  "id" TEXT PRIMARY KEY, "rootId" TEXT NOT NULL UNIQUE REFERENCES "ForeverBridgeMessage"("id") ON DELETE RESTRICT,
  "guildId" TEXT NOT NULL, "channelId" TEXT NOT NULL, "messageId" TEXT UNIQUE, "candidateId" TEXT,
  "nonce" TEXT NOT NULL UNIQUE CHECK (length("nonce") <= 25),
  "state" TEXT NOT NULL DEFAULT 'pending' CHECK ("state" IN ('pending','sending','live','uncertain','suppressed','removed')),
  "appliedRevision" INTEGER NOT NULL DEFAULT 0, "fingerprint" TEXT,
  "checkedAt" TIMESTAMPTZ, "removedAt" TIMESTAMPTZ
);
CREATE INDEX ON "ForeverBridgeProjection" ("state", "checkedAt");
CREATE TABLE "ForeverDiscordOutbox" (
  "id" TEXT PRIMARY KEY, "bridgeId" TEXT NOT NULL REFERENCES "ForeverDiscordBridge"("id") ON DELETE RESTRICT,
  "rootId" TEXT REFERENCES "ForeverBridgeMessage"("id") ON DELETE RESTRICT,
  "operation" TEXT NOT NULL CHECK ("operation" IN ('deliver','remove','validate','resolve')),
  "revision" INTEGER NOT NULL DEFAULT 0, "dedupeKey" TEXT NOT NULL UNIQUE,
  "state" TEXT NOT NULL DEFAULT 'pending' CHECK ("state" IN ('pending','leased','done','cancelled','failed','uncertain')),
  "leaseToken" TEXT, "leaseUntil" TIMESTAMPTZ, "startedAt" TIMESTAMPTZ,
  "attempts" INTEGER NOT NULL DEFAULT 0, "dueAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "error" TEXT, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "finishedAt" TIMESTAMPTZ,
  CHECK (("operation" = 'validate' AND "rootId" IS NULL) OR ("operation" <> 'validate' AND "rootId" IS NOT NULL))
);
CREATE INDEX ON "ForeverDiscordOutbox" ("state", "dueAt");
CREATE TABLE "ForeverDiscordInteraction" (
  "id" TEXT PRIMARY KEY, "applicationId" TEXT NOT NULL, "guildId" TEXT NOT NULL, "actorId" TEXT NOT NULL,
  "bridgeId" TEXT NOT NULL REFERENCES "ForeverDiscordBridge"("id") ON DELETE RESTRICT,
  "operation" TEXT NOT NULL CHECK ("operation" IN ('join','confirm','status','leave','remove')),
  "generation" INTEGER NOT NULL, "policyVersion" INTEGER NOT NULL,
  "ack" JSONB NOT NULL, "state" TEXT NOT NULL DEFAULT 'done' CHECK ("state" IN ('challenge','pending','processing','done','failed')),
  "tokenCipher" TEXT, "challengeId" TEXT UNIQUE, "expiresAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "error" TEXT
);
CREATE INDEX ON "ForeverDiscordInteraction" ("state", "expiresAt");
CREATE TABLE "ForeverBridgeRuntime" (
  "id" TEXT PRIMARY KEY CHECK ("id" = 'singleton'),
  "mode" TEXT NOT NULL DEFAULT 'cleanup_only' CHECK ("mode" IN ('cleanup_only','running','hard_stop')),
  "version" INTEGER NOT NULL DEFAULT 1, "heartbeatAt" TIMESTAMPTZ, "build" TEXT,
  "gateway" TEXT NOT NULL DEFAULT 'offline', "leaderId" TEXT, "gapAt" TIMESTAMPTZ, "error" TEXT
);
INSERT INTO "ForeverBridgeRuntime" ("id") VALUES ('singleton');
