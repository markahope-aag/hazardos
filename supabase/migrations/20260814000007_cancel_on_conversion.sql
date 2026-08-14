-- Stop chasing people who have already bought.
--
-- MarketSharp does this with a global checkbox, "Transferring a Lead to a
-- Customer: Automatically Delete All Incomplete Activities". AHS have it on.
-- Their twelve-month nurture chain runs to day 365, so without an equivalent a
-- customer who buys in month two keeps getting follow-up email for ten more
-- months.
--
-- Implemented as a database trigger, not application code, on purpose. A
-- contact's status is changed from several places including direct client
-- writes, and automation that must always happen cannot live in one of those
-- paths. This is the same lesson job completion taught: if it has to be true,
-- put it where the data is.
--
-- Per-organization rather than global, because it is a business policy and
-- theirs is one opinion. A company that wants its post-sale chain to keep
-- running should be able to say so.

ALTER TABLE "public"."organizations"
    ADD COLUMN IF NOT EXISTS "cancel_work_on_conversion" boolean DEFAULT true NOT NULL;

COMMENT ON COLUMN "public"."organizations"."cancel_work_on_conversion" IS
  'When a contact becomes a customer, cancel automated follow-up work still queued against them. Hand-written follow-ups are never canceled.';

CREATE OR REPLACE FUNCTION "public"."cancel_work_on_customer_conversion"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  enabled boolean;
  affected integer;
BEGIN
  SELECT cancel_work_on_conversion INTO enabled
  FROM public.organizations
  WHERE id = NEW.organization_id;

  IF NOT COALESCE(enabled, true) THEN
    RETURN NEW;
  END IF;

  UPDATE public.follow_ups
     SET canceled_at = now(),
         canceled_by = auth.uid(),
         cancel_reason = 'Contact converted to customer'
   WHERE organization_id = NEW.organization_id
     -- Work can hang off a contact under either label, so both are cleaned.
     AND entity_type IN ('customer', 'contact')
     AND entity_id = NEW.id
     AND completed_at IS NULL
     AND canceled_at IS NULL
     -- Only automated work. A hand-written "call them about the crawlspace"
     -- is somebody's intent and is often more relevant after the sale, not
     -- less.
     AND source = 'process';

  GET DIAGNOSTICS affected = ROW_COUNT;

  IF affected > 0 THEN
    RAISE LOG 'Canceled % queued follow-up(s) for contact % on conversion to customer', affected, NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."cancel_work_on_customer_conversion"() OWNER TO "postgres";

-- Fires only on the transition into 'customer'. A record already at that
-- status being saved again must not re-cancel work scheduled since.
CREATE OR REPLACE TRIGGER "customers_cancel_work_on_conversion"
    AFTER UPDATE OF "status" ON "public"."customers"
    FOR EACH ROW
    WHEN (OLD."status" IS DISTINCT FROM NEW."status" AND NEW."status" = 'customer')
    EXECUTE FUNCTION "public"."cancel_work_on_customer_conversion"();
