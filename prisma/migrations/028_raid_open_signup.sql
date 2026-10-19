ALTER TABLE "ForeverRaidEvent" DROP CONSTRAINT "ForeverRaidEvent_admission_check";
ALTER TABLE "ForeverRaidEvent" ADD CONSTRAINT "ForeverRaidEvent_admission_check"
  CHECK ("admission" IN ('automatic', 'approval', 'open'));
ALTER TABLE "ForeverRaidSignup" DROP CONSTRAINT "ForeverRaidSignup_status_check";
ALTER TABLE "ForeverRaidSignup" ADD CONSTRAINT "ForeverRaidSignup_status_check"
  CHECK ("status" IN ('accepted', 'registered', 'pending', 'bench', 'withdrawn'));
