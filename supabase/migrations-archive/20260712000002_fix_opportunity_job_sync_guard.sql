-- ============================================================================
-- Fix: job -> opportunity reverse-sync trigger never fires on the actual
-- "convert won opportunity to job" path.
--
-- sync_opportunity_from_job() (added in 20260422000002) only linked
-- opportunities.job_id back when `outcome IS NULL`. But the real UI flow on
-- the opportunity detail page is:
--   1. User clicks "Won" -> sets opportunities.outcome = 'won' immediately.
--   2. The now-unlocked "Jobs" tab shows a "Create Job" link (pre-filled
--      /jobs/new?opportunity_id=...) -> user fills the form and submits.
--   3. POST /api/jobs inserts the job with opportunity_id set.
-- By step 3, outcome is already 'won' (not NULL), so the trigger's UPDATE
-- matches zero rows: opportunities.job_id is never set. The opportunity
-- detail page keeps showing "Ready for Job Creation" forever -- from the
-- user's perspective, the won opportunity never produced a job -- and
-- nothing stops them from clicking "Create Job" again and creating a
-- second, duplicate job for the same opportunity.
--
-- The guard should prevent re-linking an opportunity that already has a
-- job, not gate on outcome. Switching to `job_id IS NULL` fixes the
-- primary path (outcome already 'won') while still being idempotent (a
-- second job insert for the same opportunity won't clobber the existing
-- link) and still sets outcome/opportunity_status/actual_close_date for
-- jobs created before the opportunity was explicitly marked Won (e.g. the
-- proposal-first flow).
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_opportunity_from_job()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.opportunity_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.opportunity_id IS NOT DISTINCT FROM NEW.opportunity_id THEN
    RETURN NEW;
  END IF;

  UPDATE opportunities
  SET
    job_id = NEW.id,
    outcome = 'won',
    opportunity_status = 'won',
    actual_close_date = COALESCE(actual_close_date, CURRENT_DATE),
    estimated_value = COALESCE(NEW.contract_amount, estimated_value),
    weighted_value = COALESCE(NEW.contract_amount, weighted_value),
    updated_at = NOW()
  WHERE id = NEW.opportunity_id
    AND job_id IS NULL;

  RETURN NEW;
END;
$$;
