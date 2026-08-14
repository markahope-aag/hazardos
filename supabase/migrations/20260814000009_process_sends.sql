-- Chains that send, and stop sending when they are canceled.
--
-- Two things here, and the second is why they are in one migration.
--
-- 1. A process step of kind email or text now queues an actual message
--    alongside its work item, in the same transaction.
--
-- 2. Those queued messages are linked to the work item that created them, so
--    canceling the work cancels the send.
--
-- Without the second, the first is a bug waiting to happen: a lead converts,
-- the twelve-month nurture chain is canceled, and the emails go out anyway
-- because nothing connected them. Cancellation would look correct in the work
-- queue while the customer kept receiving mail.

-- ---------------------------------------------------------------------------
-- Link a queued message to the work item that created it
-- ---------------------------------------------------------------------------

ALTER TABLE "public"."scheduled_reminders"
    ADD COLUMN IF NOT EXISTS "follow_up_id" "uuid";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "pg_constraint" WHERE "conname" = 'scheduled_reminders_follow_up_id_fkey') THEN
    ALTER TABLE "public"."scheduled_reminders"
      ADD CONSTRAINT "scheduled_reminders_follow_up_id_fkey"
      FOREIGN KEY ("follow_up_id") REFERENCES "public"."follow_ups"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- Cancellation walks from work item to queued message, so index that direction.
-- Partial because only pending rows can still be stopped.
CREATE INDEX IF NOT EXISTS "scheduled_reminders_pending_by_follow_up_idx"
    ON "public"."scheduled_reminders" ("follow_up_id")
    WHERE "status" = 'pending';

COMMENT ON COLUMN "public"."scheduled_reminders"."follow_up_id" IS
  'The work item that queued this message, when it came from an automation chain. Canceling that work cancels this send.';

-- ---------------------------------------------------------------------------
-- Create work and its queued messages together
-- ---------------------------------------------------------------------------
-- Replaces the earlier version. Each row may now carry a `reminder` object,
-- inserted with follow_up_id pointing at the work item just created, which is
-- why this has to happen inside the same loop rather than as a second pass.

CREATE OR REPLACE FUNCTION "public"."create_activity_process_work"(
    "p_organization_id" "uuid",
    "p_rows" "jsonb"
) RETURNS SETOF "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  caller_org uuid;
  row_data jsonb;
  reminder jsonb;
  new_id uuid;
BEGIN
  caller_org := public.get_user_organization_id();

  IF caller_org IS NULL THEN
    RAISE EXCEPTION 'No organization for the current user';
  END IF;

  IF p_organization_id IS DISTINCT FROM caller_org THEN
    RAISE EXCEPTION 'Organization mismatch: cannot create work for another tenant';
  END IF;

  IF jsonb_typeof(p_rows) <> 'array' THEN
    RAISE EXCEPTION 'p_rows must be a JSON array';
  END IF;

  FOR row_data IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
    INSERT INTO public.follow_ups (
      organization_id, entity_type, entity_id, due_date, note, assigned_to,
      created_by, kind, activity_type_id, reminder_minutes, source,
      process_id, process_step_id
    ) VALUES (
      p_organization_id,
      row_data->>'entity_type',
      (row_data->>'entity_id')::uuid,
      (row_data->>'due_date')::timestamptz,
      NULLIF(row_data->>'note', ''),
      NULLIF(row_data->>'assigned_to', '')::uuid,
      auth.uid(),
      COALESCE(row_data->>'kind', 'todo'),
      NULLIF(row_data->>'activity_type_id', '')::uuid,
      NULLIF(row_data->>'reminder_minutes', '')::integer,
      'process',
      NULLIF(row_data->>'process_id', '')::uuid,
      NULLIF(row_data->>'process_step_id', '')::uuid
    )
    RETURNING id INTO new_id;

    reminder := row_data->'reminder';

    IF reminder IS NOT NULL AND jsonb_typeof(reminder) = 'object' THEN
      INSERT INTO public.scheduled_reminders (
        organization_id, related_type, related_id, reminder_type,
        recipient_type, recipient_email, recipient_phone, channel,
        scheduled_for, status, template_variables,
        email_template_id, sms_template_id, follow_up_id
      ) VALUES (
        p_organization_id,
        reminder->>'related_type',
        (reminder->>'related_id')::uuid,
        'activity_process',
        'customer',
        NULLIF(reminder->>'recipient_email', ''),
        NULLIF(reminder->>'recipient_phone', ''),
        reminder->>'channel',
        (reminder->>'scheduled_for')::timestamptz,
        'pending',
        COALESCE(reminder->'template_variables', '{}'::jsonb),
        NULLIF(reminder->>'email_template_id', '')::uuid,
        NULLIF(reminder->>'sms_template_id', '')::uuid,
        new_id
      );
    END IF;

    RETURN NEXT new_id;
  END LOOP;

  RETURN;
END;
$$;

ALTER FUNCTION "public"."create_activity_process_work"("uuid", "jsonb") OWNER TO "postgres";

-- ---------------------------------------------------------------------------
-- Canceling work cancels its queued messages
-- ---------------------------------------------------------------------------

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

  WITH canceled AS (
    UPDATE public.follow_ups
       SET canceled_at = now(),
           canceled_by = auth.uid(),
           cancel_reason = p_reason
     WHERE organization_id = p_organization_id
       AND entity_type = p_entity_type
       AND entity_id = p_entity_id
       AND completed_at IS NULL
       AND canceled_at IS NULL
       AND (NOT p_only_automated OR source = 'process')
    RETURNING id
  ),
  stopped AS (
    -- Same statement, so a message can never survive the cancellation of the
    -- work that queued it.
    UPDATE public.scheduled_reminders
       SET status = 'canceled'
     WHERE follow_up_id IN (SELECT id FROM canceled)
       AND status = 'pending'
    RETURNING 1
  )
  SELECT count(*)::integer INTO affected FROM canceled;

  RETURN affected;
END;
$$;

ALTER FUNCTION "public"."cancel_open_activity_work"("uuid", "text", "uuid", "text", boolean) OWNER TO "postgres";

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

  WITH canceled AS (
    UPDATE public.follow_ups
       SET canceled_at = now(),
           canceled_by = auth.uid(),
           cancel_reason = 'Contact converted to customer'
     WHERE organization_id = NEW.organization_id
       AND entity_type IN ('customer', 'contact')
       AND entity_id = NEW.id
       AND completed_at IS NULL
       AND canceled_at IS NULL
       AND source = 'process'
    RETURNING id
  ),
  stopped AS (
    UPDATE public.scheduled_reminders
       SET status = 'canceled'
     WHERE follow_up_id IN (SELECT id FROM canceled)
       AND status = 'pending'
    RETURNING 1
  )
  SELECT count(*)::integer INTO affected FROM canceled;

  IF affected > 0 THEN
    RAISE LOG 'Canceled % queued follow-up(s) for contact % on conversion to customer', affected, NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."cancel_work_on_customer_conversion"() OWNER TO "postgres";
