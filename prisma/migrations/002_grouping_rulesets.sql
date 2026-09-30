-- Legacy realm/activity values are retained; they do not establish a character ruleset.
ALTER TABLE "ForeverGuild" ADD COLUMN "gameRuleset" TEXT NOT NULL DEFAULT 'Unconfirmed';
ALTER TABLE "ForeverGuild" ALTER COLUMN "realm" SET DEFAULT '';
ALTER TABLE "ForeverGuild" ALTER COLUMN "ruleset" SET DEFAULT '';
ALTER TABLE "ForeverGroup" ADD COLUMN "gameRuleset" TEXT NOT NULL DEFAULT 'Unconfirmed';
ALTER TABLE "ForeverGroup" ALTER COLUMN "realm" SET DEFAULT '';
CREATE INDEX "ForeverGuild_status_region_faction_gameRuleset_idx"
  ON "ForeverGuild"("status", "region", "faction", "gameRuleset");
