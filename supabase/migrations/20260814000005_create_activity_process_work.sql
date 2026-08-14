-- Atomically create the work items a fired activity process produces.
--
-- A chain writes every one of its steps at once. Eleven inserts that partially
-- succeed leave a half-chain: some follow-ups exist, the rest never will, and
-- nothing in the data says which. So the whole set goes in one statement.
--
-- The due-date arithmetic deliberately stays in TypeScript
-- (lib/services/activity-process-scheduler.ts) where it is unit tested against
-- the weekend rules and the three due modes. Reimplementing it in PL/pgSQL
-- would give two implementations that drift. This function receives rows that
-- have already been computed and only guarantees they land together.
--
-- SECURITY DEFINER on purpose. The follow_ups insert policy stops at estimator,
-- but a technician completing their own to-do can legitimately trigger a chain.
-- The alternative, granting technicians general write on follow_ups, is a much
-- wider hole than a function that checks org membership and writes only what it
-- was handed.

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
  new_id uuid;
BEGIN
  caller_org := public.get_user_organization_id();

  IF caller_org IS NULL THEN
    RAISE EXCEPTION 'No organization for the current user';
  END IF;

  -- The caller passes the org explicitly so a bug that reads the wrong
  -- organization fails loudly here rather than writing across tenants.
  IF p_organization_id IS DISTINCT FROM caller_org THEN
    RAISE EXCEPTION 'Organization mismatch: cannot create work for another tenant';
  END IF;

  IF jsonb_typeof(p_rows) <> 'array' THEN
    RAISE EXCEPTION 'p_rows must be a JSON array';
  END IF;

  FOR row_data IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
    INSERT INTO public.follow_ups (
      organization_id,
      entity_type,
      entity_id,
      due_date,
      note,
      assigned_to,
      created_by,
      kind,
      activity_type_id,
      reminder_minutes,
      source,
      process_id,
      process_step_id
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

    RETURN NEXT new_id;
  END LOOP;

  RETURN;
END;
$$;

ALTER FUNCTION "public"."create_activity_process_work"("uuid", "jsonb") OWNER TO "postgres";

REVOKE ALL ON FUNCTION "public"."create_activity_process_work"("uuid", "jsonb") FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."create_activity_process_work"("uuid", "jsonb") TO "authenticated";

COMMENT ON FUNCTION "public"."create_activity_process_work"("uuid", "jsonb") IS
  'Inserts all work items for one fired activity process in a single transaction. Rows are pre-computed by lib/services/activity-process-runner.ts.';
