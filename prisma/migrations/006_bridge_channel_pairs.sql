-- Three independent pairs; each endpoint can belong to only one non-retired pair.
ALTER TABLE "ForeverDiscordBridge" ADD COLUMN "slot" SMALLINT NOT NULL DEFAULT 1 CHECK ("slot" BETWEEN 1 AND 3);
CREATE UNIQUE INDEX "ForeverDiscordBridge_live_slot" ON "ForeverDiscordBridge" ("slot") WHERE "state" <> 'retired';
CREATE UNIQUE INDEX "ForeverDiscordBridge_live_channel_a" ON "ForeverDiscordBridge" ("channelA") WHERE "state" <> 'retired';
CREATE UNIQUE INDEX "ForeverDiscordBridge_live_channel_b" ON "ForeverDiscordBridge" ("channelB") WHERE "state" <> 'retired';
DROP INDEX "ForeverDiscordBridge_single_pair";
