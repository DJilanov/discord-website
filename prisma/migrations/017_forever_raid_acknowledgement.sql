ALTER TABLE "ForeverRaidSignup" ADD COLUMN "policyChecksum" TEXT NOT NULL DEFAULT 'unconfirmed';
ALTER TABLE "ForeverRaidSignup" ADD COLUMN "acknowledgedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT NOW();
ALTER TABLE "ForeverRaidSignup" ALTER COLUMN "policyChecksum" DROP DEFAULT;
ALTER TABLE "ForeverRaidSignup" ALTER COLUMN "acknowledgedAt" DROP DEFAULT;
