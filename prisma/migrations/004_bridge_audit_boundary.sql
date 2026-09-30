-- The worker must not have SELECT/DELETE on the shared staff/case audit table.
CREATE FUNCTION public.forever_bridge_audit(actor TEXT, entity TEXT, event TEXT, detail JSONB)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF actor !~ '^(system:bridge|discord:[1-9][0-9]{16,19}|staff:[a-zA-Z0-9_-]{1,80})$'
    OR length(entity)>80 OR length(event)>80 OR octet_length(detail::text)>4096 THEN
    RAISE EXCEPTION 'Invalid bridge audit boundary';
  END IF;
  INSERT INTO public."ForeverAuditLog" ("id","actorId","action","entityType","entityId","details")
    VALUES (gen_random_uuid()::text,actor,event,'discord_bridge',entity,detail);
END $$;
REVOKE ALL ON FUNCTION public.forever_bridge_audit(TEXT,TEXT,TEXT,JSONB) FROM PUBLIC;
CREATE FUNCTION public.forever_bridge_prune_audit()
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  DELETE FROM public."ForeverAuditLog" WHERE "entityType"='discord_bridge' AND "createdAt"<NOW()-INTERVAL '90 days';
$$;
REVOKE ALL ON FUNCTION public.forever_bridge_prune_audit() FROM PUBLIC;
