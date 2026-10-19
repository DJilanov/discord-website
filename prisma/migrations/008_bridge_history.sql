CREATE TABLE "ForeverBridgeImport" (
  "id" TEXT PRIMARY KEY,
  "bridgeId" TEXT NOT NULL REFERENCES "ForeverDiscordBridge"("id") ON DELETE RESTRICT,
  "direction" TEXT NOT NULL CHECK ("direction" IN ('both','a_to_b','b_to_a')),
  "fromAt" TIMESTAMPTZ NOT NULL, "untilAt" TIMESTAMPTZ NOT NULL,
  "state" TEXT NOT NULL DEFAULT 'scanning' CHECK ("state" IN ('scanning','preview','importing','paused','completed','rolling_back','rolled_back')),
  "phase" TEXT NOT NULL DEFAULT 'scan' CHECK ("phase" IN ('scan','import')),
  "version" INTEGER NOT NULL DEFAULT 1 CHECK ("version">0),
  "cursorA" TEXT, "cursorB" TEXT, "doneA" BOOLEAN NOT NULL DEFAULT FALSE, "doneB" BOOLEAN NOT NULL DEFAULT FALSE,
  "limit" INTEGER NOT NULL CHECK ("limit" BETWEEN 1 AND 10000),
  "reason" TEXT, "fingerprint" TEXT NOT NULL, "dueAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ("fromAt" >= '2015-01-01T00:00:00Z' AND "fromAt" < "untilAt")
);
CREATE UNIQUE INDEX "ForeverBridgeImport_one_open" ON "ForeverBridgeImport" ("bridgeId") WHERE "state" NOT IN ('completed','rolled_back');
CREATE TABLE "ForeverBridgeImportConsent" (
  "batchId" TEXT NOT NULL REFERENCES "ForeverBridgeImport"("id") ON DELETE CASCADE,
  "guildId" TEXT NOT NULL, "actorId" TEXT NOT NULL,
  "policyVersion" INTEGER NOT NULL, "attestedBy" TEXT NOT NULL,
  "optedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "expiresAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()+INTERVAL '30 days', "withdrawnAt" TIMESTAMPTZ,
  PRIMARY KEY ("batchId","guildId","actorId")
);
ALTER TABLE "ForeverBridgeMessage" ADD COLUMN "historyBatchId" TEXT REFERENCES "ForeverBridgeImport"("id") ON DELETE RESTRICT;
CREATE TABLE "ForeverBridgeImportItem" (
  "batchId" TEXT NOT NULL REFERENCES "ForeverBridgeImport"("id") ON DELETE CASCADE,
  "guildId" TEXT NOT NULL, "channelId" TEXT NOT NULL, "messageId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL, "sourceAt" TIMESTAMPTZ NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "state" TEXT NOT NULL CHECK ("state" IN ('pending','skipped','staged')),
  "reason" TEXT,
  "rootId" TEXT REFERENCES "ForeverBridgeMessage"("id") ON DELETE SET NULL,
  PRIMARY KEY ("batchId","channelId","messageId")
);
CREATE INDEX ON "ForeverBridgeImportItem" ("batchId","state","sourceAt","messageId");
CREATE INDEX ON "ForeverBridgeMessage" ("historyBatchId");
