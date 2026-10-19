ALTER TABLE "ForeverCharacter"
  ADD COLUMN "game" TEXT NOT NULL DEFAULT 'forever',
  ADD COLUMN "realm" TEXT NOT NULL DEFAULT '',
  ADD CONSTRAINT "ForeverCharacter_game_check" CHECK ("game" IN ('forever', 'tbc')),
  ADD CONSTRAINT "ForeverCharacter_realm_check" CHECK (
    ("game" = 'forever' AND "realm" = '') OR
    ("game" = 'tbc' AND length("realm") BETWEEN 2 AND 80 AND "realm" = lower(trim("realm")))
  );
ALTER TABLE "ForeverCharacter" DROP CONSTRAINT "ForeverCharacter_memberId_name_region_faction_ruleset_key";
ALTER TABLE "ForeverCharacter" ADD CONSTRAINT "ForeverCharacter_identity_key"
  UNIQUE ("memberId", "name", "game", "realm", "region", "faction", "ruleset");

ALTER TABLE "ForeverRaidEvent"
  ADD COLUMN "game" TEXT NOT NULL DEFAULT 'forever',
  ADD COLUMN "realm" TEXT NOT NULL DEFAULT '',
  ADD CONSTRAINT "ForeverRaidEvent_game_check" CHECK ("game" IN ('forever', 'tbc')),
  ADD CONSTRAINT "ForeverRaidEvent_realm_check" CHECK (
    ("game" = 'forever' AND "realm" = '') OR
    ("game" = 'tbc' AND length("realm") BETWEEN 2 AND 80 AND "realm" = lower(trim("realm")))
  );
ALTER TABLE "ForeverRaidCatalog" DROP CONSTRAINT "ForeverRaidCatalog_bundle_check";
ALTER TABLE "ForeverRaidCatalog" DROP CONSTRAINT "ForeverRaidCatalog_forever_contract_check";
ALTER TABLE "ForeverRaidCatalog" ADD CONSTRAINT "ForeverRaidCatalog_edition_contract_check" CHECK (
  (("bundle"->>'game') IS NOT DISTINCT FROM 'forever' AND
    ("bundle"->>'schema') IS NOT DISTINCT FROM 'forever-wowhead-loot-candidates.v1') OR
  (("bundle"->>'game') IS NOT DISTINCT FROM 'tbc' AND
    ("bundle"->>'schema') IS NOT DISTINCT FROM 'tbc-wowhead-loot-candidates.v1')
);

CREATE FUNCTION raid_edition_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND ROW(NEW."game", NEW."realm") IS DISTINCT FROM ROW(OLD."game", OLD."realm") THEN
    RAISE EXCEPTION 'An event game and realm are immutable; create another event';
  END IF;
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
CREATE TRIGGER "ForeverRaidEvent_edition_guard" BEFORE INSERT OR UPDATE ON "ForeverRaidEvent"
  FOR EACH ROW EXECUTE FUNCTION raid_edition_guard();
