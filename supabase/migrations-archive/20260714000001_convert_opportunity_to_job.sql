-- ============================================================================
-- C17: "Convert won opportunity -> creates a job" (one-click)
--
-- Root cause of the QA failure: winning an opportunity never produced a
-- job on its own. The only path was manual and multi-step — mark Won, open
-- the (previously hidden) Jobs tab, click a pre-filled "Create Job" link,
-- then fill out and submit the full /jobs/new form (which REQUIRES a
-- technician and a real start date). From the tester's seat, "won
-- opportunity did not create a job" — because it doesn't, until a human
-- completes that whole form.
--
-- Fix: a one-click "Convert to Job" that creates the linked job
-- immediately, the same way "Convert to Survey" already hands work off in
-- one click. This RPC is that atomic creation step.
--
-- The job is intentionally a placeholder, mirroring
-- create_job_from_signed_proposal(): assigned_to is left NULL and
-- scheduled_start_date defaults to today (jobs.scheduled_start_date is
-- NOT NULL, so it can't be left unset). Staff assign a technician and set
-- the real date on the job page — exactly the "drops the user on the new
-- job to finish scheduling/assigning" behavior chosen for this ticket.
--
-- Idempotent: if the opportunity already has a linked job (opp.job_id or
-- an existing job row pointing back at it), return that id instead of
-- creating a duplicate. The job->opportunity reverse-sync trigger
-- (sync_opportunity_from_job) sets opportunities.job_id after the insert,
-- so this function does not touch the opportunity itself.
--
-- SECURITY INVOKER so the jobs INSERT (and its RETURNING, which is
-- re-checked by the jobs SELECT policy) runs under the caller's RLS: they
-- can only convert opportunities in their own organization.
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
  -- RLS restricts this SELECT to the caller's organization; a NULL row
  -- means the opportunity doesn't exist or isn't theirs.
  SELECT * INTO v_opp FROM opportunities WHERE id = p_opportunity_id;
  IF v_opp.id IS NULL THEN
    RAISE EXCEPTION 'Opportunity not found';
  END IF;

  -- Idempotency: never create a second job for the same opportunity.
  IF v_opp.job_id IS NOT NULL THEN
    RETURN v_opp.job_id;
  END IF;
  SELECT id INTO v_existing FROM jobs WHERE opportunity_id = p_opportunity_id LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  SELECT * INTO v_customer FROM customers WHERE id = v_opp.customer_id;

  -- Prefer the opp's site address, fall back to the customer's address,
  -- then a clear placeholder. job_address is NOT NULL, and staff set the
  -- real address when scheduling.
  v_address := COALESCE(
    NULLIF(v_opp.service_address_line1, ''),
    NULLIF(v_customer.address_line1, ''),
    'Address pending — set when scheduling'
  );

  v_job_number := 'JOB-' || to_char(NOW(), 'MMDDYYYY') || '-'
                  || substr(encode(gen_random_bytes(3), 'hex'), 1, 6);

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
