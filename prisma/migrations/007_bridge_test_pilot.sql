ALTER TABLE "ForeverDiscordBridge"
  ADD COLUMN "pilotActorIds" TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN "pilotUntil" TIMESTAMPTZ,
  DROP CONSTRAINT "ForeverDiscordBridge_state_check",
  ADD CONSTRAINT "ForeverDiscordBridge_state_check" CHECK ("state" IN ('draft','validating','ready','pilot','active','paused','retiring','retired')),
  ADD CONSTRAINT "ForeverDiscordBridge_pilot_check" CHECK (
    "state" <> 'pilot' OR (
      "reviewRequired" AND "activatedAt" IS NOT NULL AND "pilotUntil" IS NOT NULL
      AND "pilotUntil" > "activatedAt"
      AND "pilotUntil" <= "activatedAt" + INTERVAL '1 hour'
      AND cardinality("pilotActorIds") BETWEEN 1 AND 5
      AND array_to_string("pilotActorIds", ',') ~ '^[1-9][0-9]{16,19}(,[1-9][0-9]{16,19}){0,4}$'
    )
  );
