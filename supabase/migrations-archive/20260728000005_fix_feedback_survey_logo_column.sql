-- ============================================================================
-- get_feedback_survey_by_token selects a column that does not exist.
--
-- The function reads `o.logo_url` from organizations. There is no such
-- column — the org logo lives in `email_logo_url`. The query has therefore
-- never worked.
--
-- It went unnoticed because two faults masked each other:
--
--   1. The search_path hardening left the function unable to resolve any
--      table at all, so it failed with undefined_table before ever reaching
--      the bad column.
--   2. The function catches `WHEN undefined_table` and returns a tidy
--      {"success": false, "error": "Feedback system not configured"},
--      so the failure looked like an unconfigured feature rather than a bug.
--
-- Repairing the search_path (20260728000003) moved the failure on to
-- undefined_column (42703), which the handler does not catch, so it now
-- raises — which is how it surfaced, via the RLS suite's public-anon test.
--
-- Fixes the column reference. The exception handler is left in place but
-- narrowed in intent by a comment: it exists for the genuinely-unconfigured
-- case, not as a catch-all for schema drift.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_feedback_survey_by_token(p_token character varying)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_survey RECORD;
BEGIN
  SELECT
    fs.id,
    fs.status,
    fs.token_expires_at,
    fs.rating_overall,
    fs.rating_quality,
    fs.rating_communication,
    fs.rating_timeliness,
    fs.rating_value,
    fs.would_recommend,
    fs.likelihood_to_recommend,
    fs.feedback_text,
    fs.improvement_suggestions,
    fs.testimonial_text,
    fs.testimonial_permission,
    j.job_number,
    o.name AS organization_name,
    -- Was o.logo_url, which does not exist on organizations.
    o.email_logo_url AS organization_logo,
    c.first_name AS customer_first_name
  INTO v_survey
  FROM feedback_surveys fs
  JOIN jobs j ON j.id = fs.job_id
  JOIN organizations o ON o.id = fs.organization_id
  LEFT JOIN customers c ON c.id = fs.customer_id
  WHERE fs.access_token = p_token
    AND fs.token_expires_at > NOW();

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired token');
  END IF;

  -- Mark as viewed on first access.
  IF v_survey.status = 'sent' OR v_survey.status = 'pending' THEN
    UPDATE feedback_surveys
    SET viewed_at = NOW(),
        status = 'viewed'
    WHERE access_token = p_token;
  END IF;

  RETURN json_build_object(
    'success', true,
    'survey', json_build_object(
      'id', v_survey.id,
      'status', v_survey.status,
      'expires_at', v_survey.token_expires_at,
      'rating_overall', v_survey.rating_overall,
      'rating_quality', v_survey.rating_quality,
      'rating_communication', v_survey.rating_communication,
      'rating_timeliness', v_survey.rating_timeliness,
      'rating_value', v_survey.rating_value,
      'would_recommend', v_survey.would_recommend,
      'likelihood_to_recommend', v_survey.likelihood_to_recommend,
      'feedback_text', v_survey.feedback_text,
      'improvement_suggestions', v_survey.improvement_suggestions,
      'testimonial_text', v_survey.testimonial_text,
      'testimonial_permission', v_survey.testimonial_permission,
      'job_number', v_survey.job_number,
      'organization_name', v_survey.organization_name,
      'organization_logo', v_survey.organization_logo,
      'customer_first_name', v_survey.customer_first_name
    )
  );
-- Only for the case this was written for: the feedback tables genuinely not
-- being present. It must not be widened to swallow schema drift again.
EXCEPTION WHEN undefined_table THEN
  RETURN json_build_object('success', false, 'error', 'Feedback system not configured');
END;
$function$;
