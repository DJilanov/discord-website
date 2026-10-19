CREATE TABLE "ForeverRaidDiscordMirror" (
  "id" TEXT PRIMARY KEY,
  "eventId" TEXT NOT NULL REFERENCES "ForeverRaidEvent"("id") ON DELETE CASCADE,
  "guildId" TEXT NOT NULL CHECK ("guildId" ~ '^[0-9]{17,20}$'),
  "channelId" TEXT NOT NULL CHECK ("channelId" ~ '^[0-9]{17,20}$'),
  "messageId" TEXT NOT NULL CHECK ("messageId" ~ '^[0-9]{17,20}$'),
  "origin" TEXT NOT NULL,
  "confirmedAt" TIMESTAMPTZ(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending','delivering','sent','failed','disabled')),
  "desiredVersion" INTEGER NOT NULL CHECK ("desiredVersion" > 0),
  "deliveredVersion" INTEGER NOT NULL DEFAULT 0 CHECK ("deliveredVersion" >= 0),
  "deliveredChecksum" TEXT CHECK ("deliveredChecksum" ~ '^[a-f0-9]{64}$'),
  "attempts" INTEGER NOT NULL DEFAULT 0 CHECK ("attempts" >= 0),
  "lastError" TEXT,
  "nextAttemptAt" TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  "startedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  UNIQUE ("eventId", "channelId"),
  UNIQUE ("channelId", "messageId")
);
CREATE INDEX "ForeverRaidDiscordMirror_status_nextAttemptAt_idx"
  ON "ForeverRaidDiscordMirror"("status", "nextAttemptAt");
REVOKE ALL ON "ForeverRaidDiscordMirror" FROM PUBLIC;

CREATE FUNCTION forever_raid_mirror_revision() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE "ForeverRaidDiscordMirror" SET "desiredVersion" = NEW."version",
    "nextAttemptAt" = NOW(), "updatedAt" = NOW()
    WHERE "eventId" = NEW."id" AND "status" IN ('pending','delivering','sent');
  RETURN NEW;
END;
$$;
CREATE TRIGGER "ForeverRaidDiscordMirror_revision" AFTER UPDATE ON "ForeverRaidEvent"
  FOR EACH ROW EXECUTE FUNCTION forever_raid_mirror_revision();
