-- Tighten EXECUTE grants on SECURITY DEFINER functions in `public`.
-- Supabase's database linter flags every SECURITY DEFINER function that
-- anon or authenticated can EXECUTE — the risk being that a malicious
-- caller could invoke the function and run its body with the owner's
-- privileges (bypassing RLS).
--
-- Strategy:
--   1. Trigger functions: REVOKE from anon AND authenticated. They run
--      via trigger machinery, not direct calls — no breakage.
--   2. Callable helpers (RLS, app rpc): REVOKE from anon. Authenticated
--      keeps EXECUTE because RLS policies and app code rely on it.
--   3. Public token-based feedback functions: leave as-is — anon access
--      is intentional (the public feedback URL has no session).
--
-- Re-running this migration is safe (REVOKE on a non-grant is a no-op).

-- ─── 1. Trigger functions — revoke from anon AND authenticated ──────────

REVOKE EXECUTE ON FUNCTION public.enforce_admin_for_address_change()           FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_primary_contact()                     FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                            FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.inherit_job_attribution()                    FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.inherit_opportunity_attribution()            FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_entity_activity()                        FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recompute_survey_photo_expiry_for_org()      FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_opportunity_from_estimate()             FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_opportunity_from_job()                  FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_opportunity_from_survey()               FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_primary_contact()                       FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_property_contact_current()              FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.track_assessment_creation()                  FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.track_photo_upload()                         FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_org_users_count()                     FROM anon, authenticated;

-- ─── 2. Callable helpers — revoke from anon only ────────────────────────
-- authenticated keeps EXECUTE: these are invoked from RLS policies
-- (get_user_organization_id, get_user_role, is_platform_user, etc.) or
-- from server-side rpc calls running under the user's session.

REVOKE EXECUTE ON FUNCTION public._debug_list_profiles_policies()              FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.allow_first_org_creation()                   FROM anon;
REVOKE EXECUTE ON FUNCTION public.calculate_completion_variance_by_job(uuid)   FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_create_organization()                    FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_ai_enabled(uuid)                       FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_ai_feature_enabled(uuid, varchar)      FROM anon;
REVOKE EXECUTE ON FUNCTION public.cron_has_recent_problem(text, integer)       FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_organization_id()                   FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_role()                              FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_jobs_count(uuid)                   FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_tenant_usage(uuid, varchar, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.initialize_notification_preferences(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_platform_user()                           FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_ai_usage(uuid, varchar, varchar, varchar, varchar, uuid, varchar, uuid, integer, integer, text[], boolean, integer, boolean, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_audit_event(uuid, varchar, varchar, uuid, jsonb, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_platform_access(varchar, uuid, varchar, uuid, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reset_monthly_job_counts()                   FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reset_tenant_usage(uuid, varchar)            FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_tenant_usage(uuid, varchar, integer)  FROM anon, authenticated;

-- ─── 3. Intentionally untouched: public anon-token feedback flow ────────
-- get_feedback_survey_by_token, submit_feedback, validate_feedback_token
-- are reached from public URLs without a session and must stay anon-callable.
