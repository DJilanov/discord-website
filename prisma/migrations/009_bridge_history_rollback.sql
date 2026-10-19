-- Cleanup of an older completed batch must not compete with the current preview.
DROP INDEX "ForeverBridgeImport_one_open";
CREATE UNIQUE INDEX "ForeverBridgeImport_one_open" ON "ForeverBridgeImport" ("bridgeId")
  WHERE "state" IN ('scanning','preview','importing','paused');
