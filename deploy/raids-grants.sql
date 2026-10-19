-- Website pilot only. No privileges are added to auction/listings/bridge workers.
REVOKE ALL ON "ForeverMember", "ForeverCharacter", "ForeverRaidCatalog", "ForeverRaidEvent",
  "ForeverRaidSignup", "ForeverRaidLootSnapshot", "ForeverRaidAudit", "ForeverRaidInteraction" FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON "ForeverMember", "ForeverCharacter", "ForeverRaidCatalog",
  "ForeverRaidEvent", "ForeverRaidSignup" TO forever_web;
GRANT SELECT, INSERT ON "ForeverRaidLootSnapshot", "ForeverRaidAudit" TO forever_web;
GRANT SELECT, INSERT, DELETE ON "ForeverRaidInteraction" TO forever_web;
GRANT SELECT, INSERT, UPDATE ON "ForeverRaidDiscordPost" TO forever_web;
GRANT SELECT, INSERT, UPDATE ON "ForeverRaidDiscordMirror" TO forever_web;
GRANT SELECT, INSERT, UPDATE, DELETE ON "ForeverRaidNativeDraft", "ForeverRaidNativeWork" TO forever_web;
