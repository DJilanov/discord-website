ALTER TABLE "ForeverRaidDiscordPost"
  ADD COLUMN "repostNumber" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "previousMessageId" TEXT,
  ADD COLUMN "previousRetiredAt" TIMESTAMPTZ(3),
  ADD COLUMN "lastRepostedAt" TIMESTAMPTZ(3),
  ADD CONSTRAINT "ForeverRaidDiscordPost_repost_number_check" CHECK ("repostNumber" >= 0);
