REVOKE ALL ON TABLE "ForeverAuctionConfig", "ForeverAuctionRun", "ForeverAuctionHealth" FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "ForeverAuctionConfig", "ForeverAuctionRun", "ForeverAuctionHealth" TO forever_web;
GRANT SELECT ON TABLE "ForeverAuctionConfig" TO forever_auction;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "ForeverAuctionRun", "ForeverAuctionHealth" TO forever_auction;
