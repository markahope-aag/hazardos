-- Reverse-sync triggers: downstream progress pulls the opportunity
-- forward so the CRM pipeline never lies.
--
-- Flow we're modelling:
--   Opportunity → Survey → Estimate → Job (→ Invoice)
-- When a downstream record advances, we reach back and update the
-- opportunity so reporting ("what's in the pipeline, how much, where")
-- stays honest without a salesperson having to remember to click
-- anything.
--
-- One-way only: these triggers never move a closed-won or closed-lost
-- opportunity backwards. If someone needs to un-win an opp, they reverse
-- the downstream record (delete the job, etc.) and handle it manually.


-- ─── 1. Survey → Opportunity ────────────────────────────────────────────
-- When a survey moves into submitted / reviewed / completed, flag the
-- linked opp as 'survey_completed' so it shows up in "ready to estimate"
-- reporting. Only fires when the survey actually advances (not on every
-- UPDATE), and only if the opp is still open.
CREATE OR REPLACE FUNCTION sync_opportunity_from_survey()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('submitted', 'reviewed', 'completed') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  UPDATE opportunities
  SET
    opportunity_status = 'survey_completed',
    assessment_date = COALESCE(assessment_date, CURRENT_DATE),
    updated_at = NOW()
  WHERE created_from_assessment_id = NEW.id
    AND outcome IS NULL
    AND opportunity_status NOT IN ('won', 'lost', 'estimate_sent');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_opportunity_from_survey ON site_surveys;
CREATE TRIGGER trg_sync_opportunity_from_survey
  AFTER UPDATE OF status ON site_surveys
  FOR EACH ROW
  EXECUTE FUNCTION sync_opportunity_from_survey();


-- ─── 2. Estimate → Opportunity ──────────────────────────────────────────
-- When an estimate is created or its total changes, pull the value and
-- "estimate_sent" status through to the linked opportunity. Link is via
-- the survey chain: estimate.site_survey_id = opp.created_from_assessment_id.
-- Also recomputes weighted_value = total × probability_pct / 100 so the
-- forecast doesn't go stale.
CREATE OR REPLACE FUNCTION sync_opportunity_from_estimate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_opp_id UUID;
  v_probability NUMERIC;
BEGIN
  IF NEW.site_survey_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id, probability_pct INTO v_opp_id, v_probability
  FROM opportunities
  WHERE created_from_assessment_id = NEW.site_survey_id
    AND outcome IS NULL
    AND opportunity_status NOT IN ('won', 'lost')
  LIMIT 1;

  IF v_opp_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE opportunities
  SET
    estimate_id = NEW.id,
    estimated_value = NEW.total,
    weighted_value = CASE
      WHEN NEW.total IS NULL OR v_probability IS NULL THEN weighted_value
      ELSE NEW.total * v_probability / 100.0
    END,
    opportunity_status = CASE
      WHEN NEW.status IN ('sent', 'approved') THEN 'estimate_sent'
      ELSE opportunity_status
    END,
    estimate_sent_date = CASE
      WHEN NEW.status IN ('sent', 'approved') AND estimate_sent_date IS NULL THEN CURRENT_DATE
      ELSE estimate_sent_date
    END,
    updated_at = NOW()
  WHERE id = v_opp_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_opportunity_from_estimate ON estimates;
CREATE TRIGGER trg_sync_opportunity_from_estimate
  AFTER INSERT OR UPDATE OF total, status, site_survey_id ON estimates
  FOR EACH ROW
  EXECUTE FUNCTION sync_opportunity_from_estimate();


-- ─── 3. Job → Opportunity ───────────────────────────────────────────────
-- Creating a job is the "sold" signal: the opportunity closes as won
-- and the contract_amount becomes the authoritative deal size. Uses
-- the direct jobs.opportunity_id link added in 20260403000006.
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
    AND outcome IS NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_opportunity_from_job ON jobs;
CREATE TRIGGER trg_sync_opportunity_from_job
  AFTER INSERT OR UPDATE OF opportunity_id ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION sync_opportunity_from_job();
