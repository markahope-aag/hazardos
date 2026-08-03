-- Postgres grants EXECUTE on every new function to PUBLIC by default,
-- and PUBLIC includes anon/authenticated — so REVOKE FROM anon alone
-- doesn't actually restrict access. The fix is to REVOKE FROM PUBLIC
-- (which lifts the default grant) and then explicitly GRANT to the
-- roles that should keep access.
--
-- Same strategy as the previous migration: trigger functions get no
-- direct grants; callable RLS/app helpers grant to authenticated only;
-- public feedback flow keeps anon + authenticated.

-- ─── 1. Trigger functions — no role-direct EXECUTE needed ──────────────

REVOKE EXECUTE ON FUNCTION public.enforce_admin_for_address_change()           FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_primary_contact()                     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                            FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.inherit_job_attribution()                    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.inherit_opportunity_attribution()            FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_entity_activity()                        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recompute_survey_photo_expiry_for_org()      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_opportunity_from_estimate()             FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_opportunity_from_job()                  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_opportunity_from_survey()               FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_primary_contact()                       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_property_contact_current()              FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.track_assessment_creation()                  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.track_photo_upload()                         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_org_users_count()                     FROM PUBLIC, anon, authenticated;

-- ─── 2. Service-role-only callables — no public/auth/anon grants ───────

REVOKE EXECUTE ON FUNCTION public._debug_list_profiles_policies()              FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cron_has_recent_problem(text, integer)       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_jobs_count(uuid)                   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_audit_event(uuid, varchar, varchar, uuid, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_platform_access(varchar, uuid, varchar, uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reset_monthly_job_counts()                   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reset_tenant_usage(uuid, varchar)            FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_tenant_usage(uuid, varchar, integer)  FROM PUBLIC, anon, authenticated;

-- ─── 3. RLS / app rpc callables — strip PUBLIC default, grant authenticated ──

REVOKE EXECUTE ON FUNCTION public.allow_first_org_creation()                   FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.allow_first_org_creation()                   TO authenticated;

REVOKE EXECUTE ON FUNCTION public.calculate_completion_variance_by_job(uuid)   FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.calculate_completion_variance_by_job(uuid)   TO authenticated;

REVOKE EXECUTE ON FUNCTION public.can_create_organization()                    FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.can_create_organization()                    TO authenticated;

REVOKE EXECUTE ON FUNCTION public.check_ai_enabled(uuid)                       FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.check_ai_enabled(uuid)                       TO authenticated;

REVOKE EXECUTE ON FUNCTION public.check_ai_feature_enabled(uuid, varchar)      FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.check_ai_feature_enabled(uuid, varchar)      TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_user_organization_id()                   FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_user_organization_id()                   TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_user_role()                              FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_user_role()                              TO authenticated;

REVOKE EXECUTE ON FUNCTION public.increment_tenant_usage(uuid, varchar, integer) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.increment_tenant_usage(uuid, varchar, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.initialize_notification_preferences(uuid, uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.initialize_notification_preferences(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_platform_user()                           FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.is_platform_user()                           TO authenticated;

REVOKE EXECUTE ON FUNCTION public.log_ai_usage(uuid, varchar, varchar, varchar, varchar, uuid, varchar, uuid, integer, integer, text[], boolean, integer, boolean, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.log_ai_usage(uuid, varchar, varchar, varchar, varchar, uuid, varchar, uuid, integer, integer, text[], boolean, integer, boolean, text) TO authenticated;

-- ─── 4. Public anon-token feedback flow — keep anon + authenticated ────
-- Strip the PUBLIC default and re-grant explicitly so the intent is
-- recorded in migration history.

REVOKE EXECUTE ON FUNCTION public.get_feedback_survey_by_token(varchar)        FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_feedback_survey_by_token(varchar)        TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.submit_feedback(varchar, integer, integer, integer, integer, integer, boolean, integer, text, text, text, boolean, varchar, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.submit_feedback(varchar, integer, integer, integer, integer, integer, boolean, integer, text, text, text, boolean, varchar, text) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.validate_feedback_token(varchar)             FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.validate_feedback_token(varchar)             TO anon, authenticated;
