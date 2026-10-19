CREATE TABLE "ForeverRaidInteraction" (
  "id" TEXT PRIMARY KEY, "actorId" TEXT NOT NULL, "requestHash" TEXT NOT NULL,
  "response" JSONB NOT NULL, "expiresAt" TIMESTAMPTZ(3) NOT NULL
);
CREATE INDEX "ForeverRaidInteraction_expiresAt_idx" ON "ForeverRaidInteraction"("expiresAt");
