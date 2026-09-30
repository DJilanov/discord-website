-- Run as a database administrator after creating the dedicated NOINHERIT login.
-- Do not grant table privileges via a wildcard: this database also hosts KFC.
GRANT USAGE ON SCHEMA public TO forever_bridge_worker;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public."ForeverDiscordBridge", public."ForeverBridgeConsent",
  public."ForeverBridgeMessage", public."ForeverBridgeProjection",
  public."ForeverDiscordOutbox", public."ForeverDiscordInteraction",
  public."ForeverBridgeRuntime"
TO forever_bridge_worker;
GRANT EXECUTE ON FUNCTION public.forever_bridge_audit(TEXT,TEXT,TEXT,JSONB),
  public.forever_bridge_prune_audit() TO forever_bridge_worker;
REVOKE CREATE ON SCHEMA public FROM forever_bridge_worker;
