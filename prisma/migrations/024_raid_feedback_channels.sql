ALTER TABLE "ForeverRaidDiscordPost"
  ADD COLUMN "visibility" TEXT NOT NULL DEFAULT 'private',
  ADD COLUMN "label" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "confirmedAt" TIMESTAMPTZ(3),
  ADD CONSTRAINT "ForeverRaidDiscordPost_visibility_check" CHECK (
    "visibility" IN ('private', 'community') AND
    ("visibility" <> 'community' OR "confirmedAt" IS NOT NULL)
  );
