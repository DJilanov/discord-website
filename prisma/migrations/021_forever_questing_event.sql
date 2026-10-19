ALTER TABLE "ForeverRaidEvent"
  DROP CONSTRAINT "ForeverRaidEvent_eventType_check";

ALTER TABLE "ForeverRaidEvent"
  ADD CONSTRAINT "ForeverRaidEvent_eventType_check"
  CHECK ("eventType" IN (
    'raid', 'dungeon', 'battleground', 'world_pvp', 'questing', 'social', 'other'
  ));
