-- ============================================
-- FIX MUTABLE SEARCH PATH ON ALL PUBLIC FUNCTIONS
-- ============================================
-- Supabase linter warning: function_search_path_mutable
-- Without SET search_path, a malicious schema could shadow
-- tables/functions referenced inside these functions.
-- Fix: pin search_path to '' so all references use schema-qualified names.

DO $$
DECLARE
  fn RECORD;
BEGIN
  -- Set search_path = '' on every function in the public schema
  -- that doesn't already have it pinned.
  FOR fn IN
    SELECT
      p.oid,
      p.proname,
      pg_catalog.pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'update_updated_at_column',
        'check_tenant_limits',
        'update_tenant_usage',
        'track_assessment_creation',
        'track_photo_upload',
        'get_user_organization_id',
        'get_user_role',
        'is_platform_user',
        'log_audit_event',
        'update_notification_preferences_updated_at',
        'get_unread_notification_count',
        'create_notification_for_role',
        'initialize_notification_preferences',
        'cleanup_expired_notifications',
        'validate_feedback_token',
        'get_feedback_survey_by_token',
        'submit_feedback',
        'increment_tenant_usage',
        'reset_tenant_usage',
        'can_create_organization',
        'allow_first_org_creation',
        'log_platform_access',
        'check_ai_enabled',
        'check_ai_feature_enabled',
        'log_ai_usage',
        'create_org_ai_settings',
        'calculate_completion_variance_by_job'
      )
  LOOP
    EXECUTE format(
      'ALTER FUNCTION public.%I(%s) SET search_path = %L',
      fn.proname, fn.args, ''
    );
    RAISE NOTICE 'Fixed search_path for %(%)', fn.proname, fn.args;
  END LOOP;
END;
$$;
