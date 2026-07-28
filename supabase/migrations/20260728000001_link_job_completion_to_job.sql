-- ============================================================================
-- Fix: technicians could not link a job completion back to its job.
--
-- The 24 July role-scoping sweep (20260724152045) put `jobs` writes in the
-- TENANT_WRITE tier (admin + estimator), while `job_completions` sits in
-- TENANT_FIELD (+ technician) — correctly, since the field crew submits
-- completions but must not edit contract amounts or addresses.
--
-- JobCompletionService.createCompletion then does:
--     INSERT job_completions            -- technician: allowed
--     UPDATE jobs SET completion_id     -- technician: refused by RLS
--
-- An RLS UPDATE refusal matches zero rows and raises NO error, and the call
-- site never checked rows-affected, so a technician's completion was created
-- and silently orphaned — the audit's "Pattern A: silent success" exactly.
--
-- Fix: make the linkage a database trigger instead of an application write,
-- matching how the other completion automation in this schema works. The
-- trigger is SECURITY DEFINER so it runs regardless of the caller's write
-- tier, but it can only ever act on the job the just-inserted completion
-- already points at — and inserting that completion row is itself RLS-gated
-- to the caller's own organization, so this grants no cross-tenant reach.
-- ============================================================================

CREATE OR REPLACE FUNCTION link_job_completion_to_job()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE jobs
     SET completion_id = NEW.id
   WHERE id = NEW.job_id
     AND completion_id IS DISTINCT FROM NEW.id;

  RETURN NEW;
END;
$$;

-- Trigger functions do not need EXECUTE granted to callers in order to fire.
-- Revoking keeps this off the "SECURITY DEFINER executable by anon" list that
-- P0-2 was about.
REVOKE EXECUTE ON FUNCTION link_job_completion_to_job() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION link_job_completion_to_job() FROM anon;
REVOKE EXECUTE ON FUNCTION link_job_completion_to_job() FROM authenticated;

DROP TRIGGER IF EXISTS trg_link_job_completion_to_job ON job_completions;

CREATE TRIGGER trg_link_job_completion_to_job
  AFTER INSERT ON job_completions
  FOR EACH ROW
  EXECUTE FUNCTION link_job_completion_to_job();

-- Backfill any completions orphaned by this bug since 24 July.
UPDATE jobs j
   SET completion_id = c.id
  FROM job_completions c
 WHERE c.job_id = j.id
   AND j.completion_id IS NULL;
