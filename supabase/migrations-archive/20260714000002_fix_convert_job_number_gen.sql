-- ============================================================================
-- Fix convert_opportunity_to_job: gen_random_bytes() is a pgcrypto function
-- that lives in the `extensions` schema on Supabase, so it is NOT resolvable
-- under this function's `search_path = public` — the RPC raised
-- "function gen_random_bytes(integer) does not exist" on every call.
--
-- Switch the random suffix to gen_random_uuid() (core Postgres, always in
-- pg_catalog) so job-number generation has no extension-schema dependency.
-- Same JOB-MMDDYYYY-<6 hex> shape, just sourced from a UUID's hex.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.convert_opportunity_to_job(p_opportunity_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_opp        RECORD;
  v_customer   RECORD;
  v_existing   uuid;
  v_job_number text;
  v_address    text;
  v_job_id     uuid;
BEGIN
  SELECT * INTO v_opp FROM opportunities WHERE id = p_opportunity_id;
  IF v_opp.id IS NULL THEN
    RAISE EXCEPTION 'Opportunity not found';
  END IF;

  IF v_opp.job_id IS NOT NULL THEN
    RETURN v_opp.job_id;
  END IF;
  SELECT id INTO v_existing FROM jobs WHERE opportunity_id = p_opportunity_id LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  SELECT * INTO v_customer FROM customers WHERE id = v_opp.customer_id;

  v_address := COALESCE(
    NULLIF(v_opp.service_address_line1, ''),
    NULLIF(v_customer.address_line1, ''),
    'Address pending — set when scheduling'
  );

  v_job_number := 'JOB-' || to_char(NOW(), 'MMDDYYYY') || '-'
                  || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);

  INSERT INTO jobs (
    organization_id, customer_id, opportunity_id,
    job_number, name, status,
    scheduled_start_date, job_address, job_city, job_state, job_zip,
    created_by
  ) VALUES (
    v_opp.organization_id, v_opp.customer_id, v_opp.id,
    v_job_number,
    COALESCE(NULLIF(v_opp.name, ''), 'Job from opportunity'),
    'scheduled',
    CURRENT_DATE,
    v_address,
    COALESCE(NULLIF(v_opp.service_city, ''),  v_customer.city),
    COALESCE(NULLIF(v_opp.service_state, ''), v_customer.state),
    COALESCE(NULLIF(v_opp.service_zip, ''),   v_customer.zip),
    auth.uid()
  )
  RETURNING id INTO v_job_id;

  RETURN v_job_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.convert_opportunity_to_job(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.convert_opportunity_to_job(uuid) TO authenticated;
