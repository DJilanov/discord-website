ALTER TABLE "ForeverRaidSignup" ADD COLUMN "rosterDirectMessages" BOOLEAN NOT NULL DEFAULT TRUE;
CREATE TABLE "ForeverRaidRosterPublication" (
  "id" TEXT PRIMARY KEY, "eventId" TEXT NOT NULL REFERENCES "ForeverRaidEvent"("id") ON DELETE RESTRICT,
  "actorId" TEXT NOT NULL, "requestKey" TEXT NOT NULL UNIQUE, "requestHash" TEXT NOT NULL,
  "deadline" TIMESTAMPTZ(3) NOT NULL, "preparation" JSONB NOT NULL, "roster" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT NOW()
);
CREATE INDEX ON "ForeverRaidRosterPublication" ("eventId", "createdAt");
CREATE TABLE "ForeverRaidRosterInvitation" (
  "id" TEXT PRIMARY KEY, "eventId" TEXT NOT NULL REFERENCES "ForeverRaidEvent"("id") ON DELETE RESTRICT,
  "publicationId" TEXT NOT NULL REFERENCES "ForeverRaidRosterPublication"("id") ON DELETE RESTRICT,
  "signupId" TEXT NOT NULL REFERENCES "ForeverRaidSignup"("id") ON DELETE RESTRICT,
  "discordId" TEXT NOT NULL CHECK ("discordId" ~ '^[0-9]{17,20}$'),
  "guildId" TEXT NOT NULL CHECK ("guildId" ~ '^[0-9]{17,20}$'),
  "sourceChannelId" TEXT NOT NULL, "sourceMessageId" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1 CHECK ("version" > 0), "termsHash" TEXT NOT NULL,
  "offer" JSONB NOT NULL, "state" TEXT NOT NULL DEFAULT 'pending'
    CHECK ("state" IN ('pending','confirmed','declined','expired','changed','revoked','manual')),
  "dmChannelId" TEXT, "dmMessageId" TEXT, "repliedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(), "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  UNIQUE("eventId","signupId"), CHECK (("dmChannelId" IS NULL) = ("dmMessageId" IS NULL))
);
CREATE INDEX ON "ForeverRaidRosterInvitation" ("discordId", "eventId");
CREATE INDEX ON "ForeverRaidRosterInvitation" ("state", "updatedAt");
CREATE TABLE "ForeverRaidRosterResponse" (
  "id" TEXT PRIMARY KEY, "invitationId" TEXT NOT NULL REFERENCES "ForeverRaidRosterInvitation"("id") ON DELETE RESTRICT,
  "requestKey" TEXT NOT NULL UNIQUE, "actorId" TEXT NOT NULL, "version" INTEGER NOT NULL CHECK ("version" > 0),
  "choice" TEXT NOT NULL CHECK ("choice" IN ('confirmed','declined','manual')),
  "reason" TEXT CHECK (length("reason") <= 500), "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT NOW()
);
CREATE INDEX ON "ForeverRaidRosterResponse" ("invitationId", "createdAt");
CREATE TABLE "ForeverRaidNotification" (
  "id" TEXT PRIMARY KEY, "invitationId" TEXT NOT NULL REFERENCES "ForeverRaidRosterInvitation"("id") ON DELETE RESTRICT,
  "kind" TEXT NOT NULL CHECK ("kind" IN ('invitation','update','reminder','preparation','leader')),
  "revision" INTEGER NOT NULL CHECK ("revision" > 0), "recipientId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending','sending','sent','blocked','uncertain','cancelled','failed')),
  "attempts" INTEGER NOT NULL DEFAULT 0, "nonce" TEXT NOT NULL UNIQUE, "payload" JSONB NOT NULL,
  "channelId" TEXT, "messageId" TEXT, "leaseId" TEXT, "leaseUntil" TIMESTAMPTZ(3),
  "nextAttemptAt" TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(), "lastError" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(), UNIQUE("invitationId","kind","revision","recipientId")
);
CREATE INDEX ON "ForeverRaidNotification" ("status","nextAttemptAt");
CREATE TABLE "ForeverRaidRosterAmendment" (
  "id" TEXT PRIMARY KEY, "eventId" TEXT NOT NULL REFERENCES "ForeverRaidEvent"("id") ON DELETE RESTRICT,
  "requestKey" TEXT NOT NULL UNIQUE, "revision" INTEGER NOT NULL CHECK ("revision" > 0),
  "actorId" TEXT NOT NULL, "reason" TEXT NOT NULL CHECK (length("reason") BETWEEN 3 AND 500),
  "payload" JSONB NOT NULL, "checksum" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(), UNIQUE("eventId","revision")
);
CREATE TRIGGER "ForeverRaidRosterPublication_immutable" BEFORE UPDATE OR DELETE ON "ForeverRaidRosterPublication"
  FOR EACH ROW EXECUTE FUNCTION forever_raid_immutable();
CREATE FUNCTION forever_raid_roster_response_immutable() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW."reason" IS NULL AND OLD."createdAt" < NOW() - INTERVAL '90 days'
     AND (to_jsonb(NEW) - 'reason') = (to_jsonb(OLD) - 'reason') THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'Roster replies are append-only; only expired private notes can be redacted';
END;
$$;
CREATE TRIGGER "ForeverRaidRosterResponse_immutable" BEFORE UPDATE OR DELETE ON "ForeverRaidRosterResponse"
  FOR EACH ROW EXECUTE FUNCTION forever_raid_roster_response_immutable();
CREATE TRIGGER "ForeverRaidRosterAmendment_immutable" BEFORE UPDATE OR DELETE ON "ForeverRaidRosterAmendment"
  FOR EACH ROW EXECUTE FUNCTION forever_raid_immutable();
REVOKE ALL ON "ForeverRaidRosterPublication", "ForeverRaidRosterInvitation", "ForeverRaidRosterResponse", "ForeverRaidNotification", "ForeverRaidRosterAmendment" FROM PUBLIC;
