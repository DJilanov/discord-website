ALTER TABLE "ForeverRaidEvent"
  ADD COLUMN "compositionRevision" TEXT;

UPDATE "ForeverRaidEvent"
SET "compositionRevision" = CASE
  WHEN "game" = 'tbc' THEN 'tbc-anniversary-2026.10.1'
  ELSE 'forever-preview-2026.09.15'
END;

ALTER TABLE "ForeverRaidEvent"
  ALTER COLUMN "compositionRevision" SET NOT NULL,
  ALTER COLUMN "compositionRevision" SET DEFAULT 'legacy';

ALTER TABLE "ForeverRaidSignup"
  ADD COLUMN "partyIndex" INTEGER,
  ADD COLUMN "slotIndex" INTEGER,
  ADD CONSTRAINT "ForeverRaidSignup_party_position_check"
    CHECK (
      ("partyIndex" IS NULL AND "slotIndex" IS NULL)
      OR
      ("partyIndex" >= 0 AND "slotIndex" >= 0 AND "slotIndex" < 5)
    );

CREATE UNIQUE INDEX "ForeverRaidSignup_event_party_slot_key"
  ON "ForeverRaidSignup" ("eventId", "partyIndex", "slotIndex")
  WHERE "partyIndex" IS NOT NULL;
