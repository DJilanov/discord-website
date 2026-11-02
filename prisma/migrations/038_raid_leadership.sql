ALTER TABLE "ForeverRaidEvent"
  ADD COLUMN "leaderName" TEXT NOT NULL DEFAULT ''
    CHECK (length("leaderName") <= 80 AND "leaderName" !~ '[[:cntrl:]]'),
  ADD COLUMN "assistantName" TEXT NOT NULL DEFAULT ''
    CHECK (length("assistantName") <= 80 AND "assistantName" !~ '[[:cntrl:]]');

-- Names are attribution, not authorization or loot-policy changes. Existing
-- version/delivery triggers refresh posts without resetting acknowledgements.
CREATE FUNCTION forever_raid_leadership_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF ROW(NEW."leaderName", NEW."assistantName") IS DISTINCT FROM
     ROW(OLD."leaderName", OLD."assistantName") AND
     (OLD."status" <> 'open' OR EXISTS (
       SELECT 1 FROM "ForeverRaidLootSnapshot" WHERE "eventId" = OLD."id"
     )) THEN
    RAISE EXCEPTION 'Locked or cancelled event leadership is immutable';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "ForeverRaidEvent_leadership_guard" BEFORE UPDATE ON "ForeverRaidEvent"
  FOR EACH ROW EXECUTE FUNCTION forever_raid_leadership_guard();
