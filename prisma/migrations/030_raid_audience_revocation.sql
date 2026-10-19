CREATE OR REPLACE FUNCTION forever_raid_settings_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE changed BOOLEAN;
BEGIN
  IF ROW(NEW."requestKey", NEW."requestHash", NEW."organizerId") IS DISTINCT FROM
     ROW(OLD."requestKey", OLD."requestHash", OLD."organizerId") THEN
    RAISE EXCEPTION 'Event creation identity is immutable';
  END IF;
  IF NEW."audience" IS DISTINCT FROM OLD."audience" AND NOT NEW."audience" <@ OLD."audience" THEN
    RAISE EXCEPTION 'Existing event audiences may only be reduced';
  END IF;
  changed := ROW(NEW."title", NEW."eventType", NEW."game", NEW."realm", NEW."raidName",
    NEW."region", NEW."faction", NEW."ruleset", NEW."description", NEW."startsAt", NEW."endsAt",
    NEW."signupClosesAt", NEW."reservesCloseAt", NEW."capacity", NEW."roleCaps", NEW."admission",
    NEW."catalogId", NEW."reserveLimit", NEW."reserveLimits", NEW."allowDuplicates", NEW."hardReserves") IS DISTINCT FROM
    ROW(OLD."title", OLD."eventType", OLD."game", OLD."realm", OLD."raidName",
    OLD."region", OLD."faction", OLD."ruleset", OLD."description", OLD."startsAt", OLD."endsAt",
    OLD."signupClosesAt", OLD."reservesCloseAt", OLD."capacity", OLD."roleCaps", OLD."admission",
    OLD."catalogId", OLD."reserveLimit", OLD."reserveLimits", OLD."allowDuplicates", OLD."hardReserves");
  IF changed AND (OLD."status" <> 'open' OR EXISTS (
    SELECT 1 FROM "ForeverRaidLootSnapshot" WHERE "eventId" = OLD."id"
  )) THEN
    RAISE EXCEPTION 'Locked or cancelled event settings are immutable';
  END IF;
  NEW."policyRevision" := OLD."policyRevision" + CASE WHEN changed THEN 1 ELSE 0 END;
  RETURN NEW;
END;
$$;
