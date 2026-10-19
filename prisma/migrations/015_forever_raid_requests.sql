ALTER TABLE "ForeverRaidEvent" ADD COLUMN "requestKey" TEXT;
ALTER TABLE "ForeverRaidEvent" ADD COLUMN "requestHash" TEXT;
UPDATE "ForeverRaidEvent" SET "requestKey" = "id", "requestHash" = 'legacy-private-pilot';
ALTER TABLE "ForeverRaidEvent" ALTER COLUMN "requestKey" SET NOT NULL;
ALTER TABLE "ForeverRaidEvent" ALTER COLUMN "requestHash" SET NOT NULL;
ALTER TABLE "ForeverRaidEvent" ADD CONSTRAINT "ForeverRaidEvent_organizerId_requestKey_key" UNIQUE ("organizerId", "requestKey");
