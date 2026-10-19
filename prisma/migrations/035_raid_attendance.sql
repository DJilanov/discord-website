ALTER TABLE "ForeverRaidSignup" DROP CONSTRAINT "ForeverRaidSignup_status_check";
ALTER TABLE "ForeverRaidSignup" ADD CONSTRAINT "ForeverRaidSignup_status_check"
  CHECK ("status" IN ('accepted', 'registered', 'pending', 'bench', 'tentative', 'absent', 'withdrawn'));

ALTER TABLE "ForeverRaidSignup" ADD CONSTRAINT "ForeverRaidSignup_unavailable_check"
  CHECK (
    "status" NOT IN ('tentative', 'absent')
    OR ("partyIndex" IS NULL AND "slotIndex" IS NULL AND cardinality("reserves") = 0)
  );
