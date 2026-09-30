CREATE TABLE "ForeverBridgeAdminRequest" (
  "id" TEXT PRIMARY KEY, "actorId" TEXT NOT NULL, "fingerprint" TEXT NOT NULL,
  "state" TEXT NOT NULL CHECK ("state" IN ('pending','done','failed')),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ON "ForeverBridgeAdminRequest" ("createdAt");
