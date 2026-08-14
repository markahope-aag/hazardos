-- Canceling queued work that has been overtaken by events.
--
-- Context: docs/marketsharp-hazardos-diff.md item P1-4. MarketSharp has a
-- global setting, "Transferring a Lead to a Customer: Automatically Delete All
-- Incomplete Activities". Without an equivalent, the nurture chain that chases
-- someone for a year keeps chasing them after they have bought, which is the
-- kind of mistake a customer notices before we do.
--
-- Deliberately cancel rather than delete. Their system deletes; we keep the row
-- with a reason, because "why did the twelve-month follow-up never happen" is a
-- question someone will ask, and a deleted row cannot answer it. It also means
-- a mistaken cancellation is recoverable.

ALTER TABLE "public"."follow_ups"
    ADD COLUMN IF NOT EXISTS "canceled_at" timestamp with time zone,
    ADD COLUMN IF NOT EXISTS "canceled_by" "uuid",
    ADD COLUMN IF NOT EXISTS "cancel_reason" "text";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "pg_constraint" WHERE "conname" = 'follow_ups_canceled_by_fkey') THEN
    ALTER TABLE "public"."follow_ups"
      ADD CONSTRAINT "follow_ups_canceled_by_fkey"
      FOREIGN KEY ("canceled_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
  END IF;

  -- Completed and canceled are different endings and a row cannot be both.
  -- Allowing both would make "what happened to this" unanswerable.
  IF NOT EXISTS (SELECT 1 FROM "pg_constraint" WHERE "conname" = 'follow_ups_not_both_endings') THEN
    ALTER TABLE "public"."follow_ups"
      ADD CONSTRAINT "follow_ups_not_both_endings"
      CHECK ("completed_at" IS NULL OR "canceled_at" IS NULL);
  END IF;
END $$;

COMMENT ON COLUMN "public"."follow_ups"."cancel_reason" IS
  'Why this queued work will never happen, e.g. the lead converted to a customer.';

-- The definition of "open" now excludes canceled work, so every partial index
-- that backs the queue has to be rebuilt. Left as-is they would still contain
-- canceled rows and the planner would hand them back.
DROP INDEX IF EXISTS "public"."follow_ups_open_by_assignee_idx";
DROP INDEX IF EXISTS "public"."follow_ups_open_by_due_idx";
DROP INDEX IF EXISTS "public"."follow_ups_open_by_entity_idx";

CREATE INDEX IF NOT EXISTS "follow_ups_open_by_assignee_idx"
    ON "public"."follow_ups" ("organization_id", "assigned_to", "due_date")
    WHERE "completed_at" IS NULL AND "canceled_at" IS NULL;

CREATE INDEX IF NOT EXISTS "follow_ups_open_by_due_idx"
    ON "public"."follow_ups" ("organization_id", "due_date")
    WHERE "completed_at" IS NULL AND "canceled_at" IS NULL;

CREATE INDEX IF NOT EXISTS "follow_ups_open_by_entity_idx"
    ON "public"."follow_ups" ("organization_id", "entity_type", "entity_id")
    WHERE "completed_at" IS NULL AND "canceled_at" IS NULL;

-- ---------------------------------------------------------------------------
-- Cancel in one statement
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER for the same reason as create_activity_process_work: the
-- follow_ups update policy stops at estimator, but conversion can be triggered
-- by anyone who can edit a contact, and the cleanup has to happen regardless of
-- who did it.
--
-- Returns the number canceled so the caller can log something meaningful rather
-- than guessing.

CREATE OR REPLACE FUNCTION "public"."cancel_open_activity_work"(
    "p_organization_id" "uuid",
    "p_entity_type" "text",
    "p_entity_id" "uuid",
    "p_reason" "text",
    "p_only_automated" boolean DEFAULT true
) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  caller_org uuid;
  affected integer;
BEGIN
  caller_org := public.get_user_organization_id();

  IF caller_org IS NULL THEN
    RAISE EXCEPTION 'No organization for the current user';
  END IF;

  IF p_organization_id IS DISTINCT FROM caller_org THEN
    RAISE EXCEPTION 'Organization mismatch: cannot cancel work for another tenant';
  END IF;

  UPDATE public.follow_ups
     SET canceled_at = now(),
         canceled_by = auth.uid(),
         cancel_reason = p_reason
   WHERE organization_id = p_organization_id
     AND entity_type = p_entity_type
     AND entity_id = p_entity_id
     AND completed_at IS NULL
     AND canceled_at IS NULL
     -- Default to sparing anything a person typed. Automated nurture steps are
     -- safe to drop when they are overtaken; a hand-written "call them back
     -- about the crawlspace" is somebody's intent and should survive.
     AND (NOT p_only_automated OR source = 'process');

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

ALTER FUNCTION "public"."cancel_open_activity_work"("uuid", "text", "uuid", "text", boolean) OWNER TO "postgres";

REVOKE ALL ON FUNCTION "public"."cancel_open_activity_work"("uuid", "text", "uuid", "text", boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."cancel_open_activity_work"("uuid", "text", "uuid", "text", boolean) TO "authenticated";
