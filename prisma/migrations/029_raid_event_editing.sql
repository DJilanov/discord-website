ALTER TABLE "ForeverRaidEvent" ADD COLUMN "policyRevision" INTEGER NOT NULL DEFAULT 0
  CHECK ("policyRevision" >= 0);

CREATE OR REPLACE FUNCTION raid_edition_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."catalogId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "ForeverRaidCatalog" c WHERE c."id" = NEW."catalogId"
      AND c."bundle"->>'game' = NEW."game" AND c."raidName" = NEW."raidName"
      AND c."status" = 'published'
  ) THEN
    RAISE EXCEPTION 'Event catalog must match its game and raid and be published';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER "ForeverRaidEvent_reserve_limits_guard" ON "ForeverRaidEvent";
DROP FUNCTION forever_raid_reserve_limits_guard();

CREATE FUNCTION forever_raid_settings_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE changed BOOLEAN;
BEGIN
  IF ROW(NEW."requestKey", NEW."requestHash", NEW."organizerId", NEW."audience") IS DISTINCT FROM
     ROW(OLD."requestKey", OLD."requestHash", OLD."organizerId", OLD."audience") THEN
    RAISE EXCEPTION 'Event creation identity and audience are immutable';
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
CREATE TRIGGER "ForeverRaidEvent_settings_guard" BEFORE UPDATE ON "ForeverRaidEvent"
  FOR EACH ROW EXECUTE FUNCTION forever_raid_settings_guard();

CREATE OR REPLACE FUNCTION forever_raid_discord_revision() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."policyRevision" IS DISTINCT FROM OLD."policyRevision" THEN
    UPDATE "ForeverRaidDiscordPost" SET "approvedAt" = NULL, "approvedBy" = NULL
      WHERE "eventId" = NEW."id";
  END IF;
  UPDATE "ForeverRaidDiscordPost" SET "desiredVersion" = NEW."version",
    "nextAttemptAt" = NOW(), "updatedAt" = NOW()
    WHERE "eventId" = NEW."id";
  RETURN NEW;
END;
$$;
