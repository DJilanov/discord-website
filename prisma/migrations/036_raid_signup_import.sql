ALTER TABLE "ForeverRaidSignup" ADD COLUMN "importSource" JSONB;
ALTER TABLE "ForeverRaidSignup" ALTER COLUMN "policyChecksum" DROP NOT NULL;
ALTER TABLE "ForeverRaidSignup" ALTER COLUMN "acknowledgedAt" DROP NOT NULL;

ALTER TABLE "ForeverRaidSignup" ADD CONSTRAINT "ForeverRaidSignup_acknowledgement_check"
  CHECK (
    ("policyChecksum" IS NOT NULL AND "acknowledgedAt" IS NOT NULL)
    OR ("policyChecksum" IS NULL AND "acknowledgedAt" IS NULL AND "importSource" IS NOT NULL)
  );
ALTER TABLE "ForeverRaidSignup" ADD CONSTRAINT "ForeverRaidSignup_import_source_check"
  CHECK (
    "importSource" IS NULL
    OR (jsonb_typeof("importSource") = 'object' AND COALESCE("importSource"->>'kind' = 'raid_helper', FALSE))
  );
