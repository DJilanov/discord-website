ALTER TABLE "ForeverRaidEvent" ADD COLUMN "eventType" TEXT NOT NULL DEFAULT 'raid';
ALTER TABLE "ForeverRaidEvent" ADD CONSTRAINT "ForeverRaidEvent_eventType_check"
  CHECK ("eventType" IN ('raid', 'dungeon', 'battleground', 'world_pvp', 'social', 'other'));
ALTER TABLE "ForeverRaidEvent" ADD CONSTRAINT "ForeverRaidEvent_eventType_loot_check"
  CHECK ("eventType" = 'raid' OR (
    "catalogId" IS NULL AND "reserveLimit" = 0 AND NOT "allowDuplicates"
    AND cardinality("hardReserves") = 0
  ));
ALTER TABLE "ForeverRaidEvent" ADD CONSTRAINT "ForeverRaidEvent_participant_caps_check"
  CHECK ("eventType" NOT IN ('social', 'other') OR
    "roleCaps" = '{"tank":0,"healer":0,"damage":0}'::JSONB);
ALTER TABLE "ForeverRaidSignup" DROP CONSTRAINT "ForeverRaidSignup_role_check";
ALTER TABLE "ForeverRaidSignup" ADD CONSTRAINT "ForeverRaidSignup_role_check"
  CHECK ("role" IN ('tank', 'healer', 'damage', 'participant'));
