CREATE TABLE "ForeverMember" (
  "id" TEXT PRIMARY KEY, "discordId" TEXT NOT NULL UNIQUE, "displayName" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT TRUE, "sessionVersion" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT NOW()
);
CREATE TABLE "ForeverCharacter" (
  "id" TEXT PRIMARY KEY, "memberId" TEXT NOT NULL REFERENCES "ForeverMember"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL, "className" TEXT NOT NULL, "region" TEXT NOT NULL, "faction" TEXT NOT NULL,
  "ruleset" TEXT NOT NULL, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  UNIQUE("memberId", "name", "region", "faction", "ruleset")
);
CREATE TABLE "ForeverRaidCatalog" (
  "id" TEXT PRIMARY KEY, "raidName" TEXT NOT NULL, "checksum" TEXT NOT NULL UNIQUE,
  "bundle" JSONB NOT NULL, "warnings" TEXT[] NOT NULL, "status" TEXT NOT NULL DEFAULT 'staged',
  "stagedBy" TEXT NOT NULL, "reviewedBy" TEXT, "reviewNote" TEXT, "reviewedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  CHECK ("status" IN ('staged', 'published', 'rejected')),
  CHECK ("bundle"->>'game' = 'forever')
);
CREATE TABLE "ForeverRaidEvent" (
  "id" TEXT PRIMARY KEY, "organizerId" TEXT NOT NULL REFERENCES "ForeverMember"("id") ON DELETE RESTRICT,
  "audience" TEXT[] NOT NULL, "title" TEXT NOT NULL, "raidName" TEXT NOT NULL,
  "region" TEXT NOT NULL, "faction" TEXT NOT NULL, "ruleset" TEXT NOT NULL, "description" TEXT NOT NULL,
  "startsAt" TIMESTAMPTZ(3) NOT NULL, "endsAt" TIMESTAMPTZ(3) NOT NULL,
  "signupClosesAt" TIMESTAMPTZ(3) NOT NULL, "reservesCloseAt" TIMESTAMPTZ(3) NOT NULL,
  "capacity" INTEGER NOT NULL CHECK ("capacity" BETWEEN 1 AND 100), "roleCaps" JSONB NOT NULL,
  "admission" TEXT NOT NULL CHECK ("admission" IN ('automatic', 'approval')),
  "catalogId" TEXT REFERENCES "ForeverRaidCatalog"("id") ON DELETE RESTRICT,
  "reserveLimit" INTEGER NOT NULL CHECK ("reserveLimit" BETWEEN 0 AND 10),
  "allowDuplicates" BOOLEAN NOT NULL, "hardReserves" INTEGER[] NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'open' CHECK ("status" IN ('open', 'locked', 'cancelled')),
  "version" INTEGER NOT NULL DEFAULT 1 CHECK ("version" > 0), "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  CHECK ("endsAt" > "startsAt" AND "signupClosesAt" <= "startsAt" AND "reservesCloseAt" <= "startsAt"),
  CHECK ("catalogId" IS NOT NULL OR ("reserveLimit" = 0 AND cardinality("hardReserves") = 0))
);
CREATE INDEX "ForeverRaidEvent_organizerId_startsAt_idx" ON "ForeverRaidEvent"("organizerId", "startsAt");
CREATE TABLE "ForeverRaidSignup" (
  "id" TEXT PRIMARY KEY, "eventId" TEXT NOT NULL REFERENCES "ForeverRaidEvent"("id") ON DELETE CASCADE,
  "memberId" TEXT NOT NULL REFERENCES "ForeverMember"("id") ON DELETE RESTRICT,
  "characterId" TEXT NOT NULL, "character" JSONB NOT NULL,
  "role" TEXT NOT NULL CHECK ("role" IN ('tank', 'healer', 'damage')),
  "status" TEXT NOT NULL CHECK ("status" IN ('accepted', 'pending', 'bench', 'withdrawn')),
  "reserves" INTEGER[] NOT NULL, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(), UNIQUE("eventId", "memberId")
);
CREATE TABLE "ForeverRaidLootSnapshot" (
  "id" TEXT PRIMARY KEY, "eventId" TEXT NOT NULL UNIQUE REFERENCES "ForeverRaidEvent"("id") ON DELETE RESTRICT,
  "payload" JSONB NOT NULL, "checksum" TEXT NOT NULL, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT NOW()
);
CREATE TABLE "ForeverRaidAudit" (
  "id" TEXT PRIMARY KEY, "eventId" TEXT NOT NULL REFERENCES "ForeverRaidEvent"("id") ON DELETE RESTRICT,
  "actorId" TEXT NOT NULL, "action" TEXT NOT NULL, "details" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT NOW()
);
CREATE INDEX "ForeverRaidAudit_eventId_createdAt_idx" ON "ForeverRaidAudit"("eventId", "createdAt");

CREATE FUNCTION forever_raid_immutable() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Raid snapshots and audit records are append-only';
END;
$$;
CREATE TRIGGER "ForeverRaidLootSnapshot_immutable" BEFORE UPDATE OR DELETE ON "ForeverRaidLootSnapshot"
  FOR EACH ROW EXECUTE FUNCTION forever_raid_immutable();
CREATE TRIGGER "ForeverRaidAudit_immutable" BEFORE UPDATE OR DELETE ON "ForeverRaidAudit"
  FOR EACH ROW EXECUTE FUNCTION forever_raid_immutable();
CREATE FUNCTION forever_raid_catalog_immutable() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."bundle" IS DISTINCT FROM OLD."bundle" OR NEW."checksum" IS DISTINCT FROM OLD."checksum"
     OR NEW."raidName" IS DISTINCT FROM OLD."raidName" OR OLD."status" <> 'staged' THEN
    RAISE EXCEPTION 'Reviewed catalogs are immutable; stage a new version';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "ForeverRaidCatalog_immutable" BEFORE UPDATE ON "ForeverRaidCatalog"
  FOR EACH ROW EXECUTE FUNCTION forever_raid_catalog_immutable();
