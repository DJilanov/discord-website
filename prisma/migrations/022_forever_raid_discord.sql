CREATE TABLE "ForeverRaidDiscordPost" (
  "eventId" TEXT PRIMARY KEY REFERENCES "ForeverRaidEvent"("id") ON DELETE CASCADE,
  "guildId" TEXT NOT NULL CHECK ("guildId" ~ '^[0-9]{17,20}$'),
  "channelId" TEXT NOT NULL CHECK ("channelId" ~ '^[0-9]{17,20}$'),
  "origin" TEXT NOT NULL,
  "messageId" TEXT CHECK ("messageId" ~ '^[0-9]{17,20}$'),
  "status" TEXT NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending','delivering','sent','uncertain','failed')),
  "desiredVersion" INTEGER NOT NULL CHECK ("desiredVersion" > 0),
  "deliveredVersion" INTEGER NOT NULL DEFAULT 0 CHECK ("deliveredVersion" >= 0),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "nextAttemptAt" TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  "startedAt" TIMESTAMPTZ(3),
  "approvedAt" TIMESTAMPTZ(3),
  "approvedBy" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  CHECK (("approvedAt" IS NULL) = ("approvedBy" IS NULL)),
  CHECK ("approvedAt" IS NULL OR "messageId" IS NOT NULL),
  UNIQUE ("channelId", "messageId")
);
CREATE INDEX "ForeverRaidDiscordPost_status_nextAttemptAt_idx"
  ON "ForeverRaidDiscordPost"("status", "nextAttemptAt");
REVOKE ALL ON "ForeverRaidDiscordPost" FROM PUBLIC;

CREATE FUNCTION forever_raid_discord_revision() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF ROW(NEW."title", NEW."eventType", NEW."raidName", NEW."region", NEW."faction",
    NEW."ruleset", NEW."description", NEW."startsAt", NEW."endsAt", NEW."signupClosesAt",
    NEW."reservesCloseAt", NEW."capacity", NEW."roleCaps", NEW."admission", NEW."catalogId",
    NEW."reserveLimit", NEW."allowDuplicates", NEW."hardReserves") IS DISTINCT FROM
    ROW(OLD."title", OLD."eventType", OLD."raidName", OLD."region", OLD."faction",
    OLD."ruleset", OLD."description", OLD."startsAt", OLD."endsAt", OLD."signupClosesAt",
    OLD."reservesCloseAt", OLD."capacity", OLD."roleCaps", OLD."admission", OLD."catalogId",
    OLD."reserveLimit", OLD."allowDuplicates", OLD."hardReserves") THEN
    UPDATE "ForeverRaidDiscordPost" SET "approvedAt" = NULL, "approvedBy" = NULL
      WHERE "eventId" = NEW."id";
  END IF;
  UPDATE "ForeverRaidDiscordPost" SET "desiredVersion" = NEW."version",
    "nextAttemptAt" = NOW(), "updatedAt" = NOW()
    WHERE "eventId" = NEW."id";
  RETURN NEW;
END;
$$;
CREATE TRIGGER "ForeverRaidDiscordPost_revision" AFTER UPDATE ON "ForeverRaidEvent"
  FOR EACH ROW EXECUTE FUNCTION forever_raid_discord_revision();
