-- ============================================================================
-- Fix: create_job_from_signed_proposal() (20260712000005) failed every
-- time with "function gen_random_bytes(integer) does not exist" (42883).
--
-- pgcrypto's gen_random_bytes lives in the `extensions` schema on Supabase,
-- not `public`. The function sets `SET search_path = public` (standard
-- SECURITY DEFINER hardening, to block search_path injection), which
-- excludes `extensions` and hides gen_random_bytes from an unqualified
-- call. 20260421000005_harden_functions_and_policies.sql already hit this
-- exact issue and fixed it by qualifying the call as
-- extensions.gen_random_bytes(...) -- same fix here.
-- ============================================================================

CREATE OR REPLACE FUNCTION create_job_from_signed_proposal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_survey RECORD;
  v_job_number TEXT;
  v_existing_job_id UUID;
BEGIN
  IF NEW.status != 'signed' OR OLD.status IS NOT DISTINCT FROM 'signed' THEN
    RETURN NEW;
  END IF;

  IF NEW.customer_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_existing_job_id FROM jobs WHERE proposal_id = NEW.id LIMIT 1;
  IF v_existing_job_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT s.site_address, s.site_city, s.site_state, s.site_zip
    INTO v_survey
  FROM estimates e
  JOIN site_surveys s ON s.id = e.site_survey_id
  WHERE e.id = NEW.estimate_id;

  v_job_number := 'JOB-' || to_char(NOW(), 'MMDDYYYY') || '-' || substr(encode(extensions.gen_random_bytes(3), 'hex'), 1, 6);

  INSERT INTO jobs (
    organization_id, customer_id, estimate_id, proposal_id,
    job_number, name, status,
    scheduled_start_date, job_address, job_city, job_state, job_zip
  ) VALUES (
    NEW.organization_id, NEW.customer_id, NEW.estimate_id, NEW.id,
    v_job_number,
    'Job from proposal ' || NEW.proposal_number,
    'scheduled',
    CURRENT_DATE + 3,
    COALESCE(v_survey.site_address, 'Address pending -- see proposal ' || NEW.proposal_number),
    v_survey.site_city, v_survey.site_state, v_survey.site_zip
  );

  RETURN NEW;
END;
$$;
