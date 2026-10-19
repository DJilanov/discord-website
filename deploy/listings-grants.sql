REVOKE ALL ON "ForeverListingDiscordJob", "ForeverListingDiscordHealth" FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON "ForeverListingDiscordJob", "ForeverListingDiscordHealth" TO forever_web;
GRANT SELECT, UPDATE ON "ForeverListingDiscordJob" TO forever_listings;
GRANT SELECT, INSERT, UPDATE ON "ForeverListingDiscordHealth" TO forever_listings;
GRANT SELECT ("id","status","startsAt","expiresAt") ON "ForeverGroup" TO forever_listings;
GRANT UPDATE ("status","updatedAt") ON "ForeverGroup" TO forever_listings;
GRANT SELECT ("id","status") ON "ForeverGuild" TO forever_listings;
GRANT UPDATE ("status","updatedAt","lastVerifiedAt") ON "ForeverGuild" TO forever_listings;
GRANT INSERT ON "ForeverAuditLog" TO forever_listings;
