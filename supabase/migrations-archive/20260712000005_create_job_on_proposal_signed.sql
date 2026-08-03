-- ============================================================================
-- P12: "Signed proposal -> job auto-created in scheduler view"
--
-- Neither /api/proposals/sign nor /api/proposals/[id]/record-verbal-approval
-- ever created a job — signing a proposal just flipped its status and the
-- linked estimate's status. The verbal-approval route's own comment already
-- states the intended design: "so the downstream job/invoice flow works
-- without a separate branch" — i.e. job creation was meant to react to
-- proposals.status becoming 'signed' generically, regardless of which of
-- the two routes got it there. That reaction never got built.
--
-- A DB trigger is the right place for it: it covers both the public
-- digital-sign endpoint and the internal verbal-approval endpoint with one
-- implementation, matching that stated intent instead of duplicating the
-- logic in two routes (one of which runs unauthenticated).
--
-- The job is intentionally a placeholder, not a fully scheduled job:
-- assigned_to is left NULL and scheduled_start_date defaults to 3 days out
-- (jobs.scheduled_start_date is NOT NULL, so it can't be left unset) — the
-- customer signing has no way to supply a technician or a real date. It
-- shows up in the scheduler as an unscheduled job for staff to assign and
-- reschedule, the same way a manually-created job would.
--
-- Idempotent: guarded by both the status-transition check (only fires
-- entering 'signed') and a lookup for an existing job on this proposal_id,
-- so a second signed-status write (which the route-level status guards
-- already prevent) can't create a duplicate job.
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

  -- A proposal can technically have no linked customer (ON DELETE SET
  -- NULL) — jobs.customer_id is NOT NULL, so skip rather than fail the
  -- signing transaction over a malformed proposal.
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

  v_job_number := 'JOB-' || to_char(NOW(), 'MMDDYYYY') || '-' || substr(encode(gen_random_bytes(3), 'hex'), 1, 6);

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

DROP TRIGGER IF EXISTS trg_create_job_from_signed_proposal ON proposals;
CREATE TRIGGER trg_create_job_from_signed_proposal
  AFTER UPDATE OF status ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION create_job_from_signed_proposal();

REVOKE EXECUTE ON FUNCTION public.create_job_from_signed_proposal() FROM PUBLIC, anon, authenticated;
