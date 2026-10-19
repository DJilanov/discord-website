ALTER TABLE "ForeverRaidEvent" ADD COLUMN "reserveLimits" JSONB;
ALTER TABLE "ForeverRaidEvent" ADD CONSTRAINT "ForeverRaidEvent_reserveLimits_check" CHECK (
  "reserveLimits" IS NULL OR (
    "eventType" = 'raid' AND "catalogId" IS NOT NULL AND
    jsonb_typeof("reserveLimits") = 'object' AND
    "reserveLimits" ?& ARRAY['tank','healer','damage'] AND
    "reserveLimits" - ARRAY['tank','healer','damage'] = '{}'::jsonb AND
    jsonb_typeof("reserveLimits"->'tank') = 'number' AND
    jsonb_typeof("reserveLimits"->'healer') = 'number' AND
    jsonb_typeof("reserveLimits"->'damage') = 'number' AND
    ("reserveLimits"->>'tank')::numeric BETWEEN 0 AND 10 AND
    ("reserveLimits"->>'healer')::numeric BETWEEN 0 AND 10 AND
    ("reserveLimits"->>'damage')::numeric BETWEEN 0 AND 10 AND
    ("reserveLimits"->>'tank')::numeric = trunc(("reserveLimits"->>'tank')::numeric) AND
    ("reserveLimits"->>'healer')::numeric = trunc(("reserveLimits"->>'healer')::numeric) AND
    ("reserveLimits"->>'damage')::numeric = trunc(("reserveLimits"->>'damage')::numeric) AND
    "reserveLimit" = greatest(("reserveLimits"->>'tank')::numeric,
      ("reserveLimits"->>'healer')::numeric, ("reserveLimits"->>'damage')::numeric)
  )
);
CREATE FUNCTION forever_raid_reserve_limits_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."reserveLimits" IS DISTINCT FROM OLD."reserveLimits" THEN
    RAISE EXCEPTION 'Event reserve allowances are immutable; create another event';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "ForeverRaidEvent_reserve_limits_guard" BEFORE UPDATE ON "ForeverRaidEvent"
  FOR EACH ROW EXECUTE FUNCTION forever_raid_reserve_limits_guard();
