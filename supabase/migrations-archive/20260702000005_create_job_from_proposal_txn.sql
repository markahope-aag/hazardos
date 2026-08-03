-- ============================================================================
-- Data integrity: atomic "create job from proposal"
--
-- JobsService.createFromProposal performed three separate writes with no
-- transaction: INSERT the job (via JobsService.create), UPDATE the job with
-- contract amount + access details, then UPDATE the proposal status to
-- 'converted'. Failures left corrupt state:
--   - update #1 fails -> job exists without a contract amount and the proposal
--     is still convertible, so it can be converted AGAIN -> duplicate jobs;
--   - update #2 fails -> job has the contract amount but the proposal never
--     flips to 'converted', so the UI keeps offering "Convert" -> duplicate.
--
-- Preventing the duplicate requires the proposal guard-and-flip to *bracket*
-- the job insert, so this folds all of it into one function/transaction:
--   1. lock the proposal row (FOR UPDATE) and reject if already 'converted'
--   2. INSERT the fully-populated job (contract amount + access details in the
--      same row — no separate update)
--   3. flip the proposal to 'converted'
-- Two concurrent conversions now serialize on the proposal lock: the first
-- commits, the second sees 'converted' and raises *before* inserting a job, so
-- no duplicate job is ever created.
--
-- Job-number generation stays in the service (it mirrors the estimate number
-- and needs the existing collision fallback) and is passed in; that carries the
-- same tiny uniqueness race it always has, so no regression. Reminder
-- scheduling and external-calendar sync remain best-effort in app code, after
-- this transaction commits. SECURITY INVOKER so RLS on jobs/proposals applies;
-- the jobs INSERT triggers (attribution inheritance, activity log) fire inside
-- the transaction exactly as before.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_job_from_proposal(
  p_proposal_id uuid,
  p_job jsonb,
  p_created_by uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_proposal_status text;
  v_job_id uuid;
BEGIN
  SELECT organization_id, status
    INTO v_org_id, v_proposal_status
  FROM proposals
  WHERE id = p_proposal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proposal % not found', p_proposal_id USING ERRCODE = 'no_data_found';
  END IF;

  IF v_proposal_status = 'converted' THEN
    RAISE EXCEPTION 'Proposal % is already converted', p_proposal_id
      USING ERRCODE = 'unique_violation';
  END IF;

  INSERT INTO jobs (
    organization_id, job_number, customer_id, proposal_id, estimate_id,
    site_survey_id, assigned_to, scheduled_start_date, scheduled_start_time,
    estimated_duration_hours, job_address, job_city, job_state, job_zip,
    access_notes, hazard_types, contract_amount, final_amount, gate_code,
    lockbox_code, contact_onsite_name, contact_onsite_phone, status, created_by
  ) VALUES (
    v_org_id,
    p_job->>'job_number',
    (p_job->>'customer_id')::uuid,
    p_proposal_id,
    NULLIF(p_job->>'estimate_id', '')::uuid,
    NULLIF(p_job->>'site_survey_id', '')::uuid,
    NULLIF(p_job->>'assigned_to', '')::uuid,
    NULLIF(p_job->>'scheduled_start_date', '')::date,
    NULLIF(p_job->>'scheduled_start_time', '')::time,
    NULLIF(p_job->>'estimated_duration_hours', '')::numeric,
    NULLIF(p_job->>'job_address', ''),
    NULLIF(p_job->>'job_city', ''),
    NULLIF(p_job->>'job_state', ''),
    NULLIF(p_job->>'job_zip', ''),
    NULLIF(p_job->>'access_notes', ''),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_job->'hazard_types', '[]'::jsonb))), '{}'),
    NULLIF(p_job->>'contract_amount', '')::numeric,
    NULLIF(p_job->>'final_amount', '')::numeric,
    NULLIF(p_job->>'gate_code', ''),
    NULLIF(p_job->>'lockbox_code', ''),
    NULLIF(p_job->>'contact_onsite_name', ''),
    NULLIF(p_job->>'contact_onsite_phone', ''),
    'scheduled',
    p_created_by
  )
  RETURNING id INTO v_job_id;

  UPDATE proposals SET status = 'converted' WHERE id = p_proposal_id;

  RETURN v_job_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_job_from_proposal(uuid, jsonb, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_job_from_proposal(uuid, jsonb, uuid) TO authenticated;
