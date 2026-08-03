-- Supabase database-linter remediation:
--   * function_search_path_mutable
--   * materialized_view_in_api
--   * anon_security_definer_function_executable
--   * authenticated_security_definer_function_executable
--
-- The general pattern: SECURITY DEFINER functions that exist purely as
-- trigger bodies or to be called server-side by service_role should not
-- be exposed via PostgREST's /rest/v1/rpc/*. We REVOKE EXECUTE from
-- anon and authenticated where appropriate. Functions that legitimately
-- need to be called from RLS policies (which run as `authenticated`) or
-- from public flows (anonymous feedback links) keep their grants.

-- ============================================================================
-- 1. Pin search_path on inherit_creator_default_location.
--    A SECURITY DEFINER trigger function with a mutable search_path could
--    be tricked into resolving table names against an attacker-controlled
--    schema. Locking it to `public` removes that surface.
-- ============================================================================
ALTER FUNCTION public.inherit_creator_default_location()
  SET search_path = public;

-- ============================================================================
-- 2. Materialized views: revoke SELECT from authenticated/anon.
--    Materialized views can't enforce RLS. The reporting service was
--    relying on application-layer org_id filtering against the user
--    session — that's fragile (one missed .eq() leaks rows). Switching
--    to service_role-only access means the API surface no longer trusts
--    the client to filter, and the linter warning goes away.
--    `ReportingService.runSalesReport / runJobCostReport / runLeadSourceReport`
--    must use a service-role client (see lib/services/reporting-service.ts).
-- ============================================================================
REVOKE SELECT ON public.mv_sales_performance FROM authenticated, anon;
REVOKE SELECT ON public.mv_job_costs        FROM authenticated, anon;
REVOKE SELECT ON public.mv_lead_source_roi  FROM authenticated, anon;
-- (service_role retains SELECT from the prior migration.)

-- ============================================================================
-- 3. Trigger-only functions: never legitimately called via RPC.
--    These are wired to BEFORE INSERT/UPDATE triggers; revoking EXECUTE
--    has no functional impact (Postgres invokes triggers as the table
--    owner, not the caller).
-- ============================================================================
DO $$
BEGIN
  -- Each REVOKE wrapped in a per-function block so a missing function
  -- (e.g. trigger renamed in a future migration) doesn't abort the whole
  -- migration.
  BEGIN
    REVOKE EXECUTE ON FUNCTION public.inherit_creator_default_location() FROM anon, authenticated;
  EXCEPTION WHEN undefined_function THEN NULL;
  END;
  BEGIN
    REVOKE EXECUTE ON FUNCTION public.set_lab_reports_updated_at() FROM anon, authenticated;
  EXCEPTION WHEN undefined_function THEN NULL;
  END;
END $$;

-- ============================================================================
-- 4. Server-only functions called from API handlers via the service role.
--    None of these need to be reachable from client-side supabase-js
--    sessions. The service role bypasses these grants, so revoking from
--    anon/authenticated locks them down without breaking server callers.
-- ============================================================================
DO $$
BEGIN
  -- Rate-limit helpers (server-only — invoked by API handlers, not by users)
  BEGIN
    REVOKE EXECUTE ON FUNCTION public.check_and_increment_rate_limit(uuid)
      FROM anon, authenticated;
  EXCEPTION WHEN undefined_function THEN NULL;
  END;
  BEGIN
    REVOKE EXECUTE ON FUNCTION public.reset_rate_limit(uuid) FROM anon, authenticated;
  EXCEPTION WHEN undefined_function THEN NULL;
  END;

  -- Lab-report helpers
  BEGIN
    REVOKE EXECUTE ON FUNCTION public.generate_lab_report_number(uuid) FROM anon, authenticated;
  EXCEPTION WHEN undefined_function THEN NULL;
  END;

  -- Reporting refresh — called by cron / admin RPC, never client-direct
  BEGIN
    REVOKE EXECUTE ON FUNCTION public.refresh_report_views() FROM anon, authenticated;
  EXCEPTION WHEN undefined_function THEN NULL;
  END;

  -- Server-only computations and writes
  BEGIN
    REVOKE EXECUTE ON FUNCTION public.calculate_completion_variance_by_job(uuid)
      FROM anon, authenticated;
  EXCEPTION WHEN undefined_function THEN NULL;
  END;
  BEGIN
    REVOKE EXECUTE ON FUNCTION public.increment_tenant_usage(uuid, varchar, integer)
      FROM anon, authenticated;
  EXCEPTION WHEN undefined_function THEN NULL;
  END;
  BEGIN
    REVOKE EXECUTE ON FUNCTION public.initialize_notification_preferences(uuid, uuid)
      FROM anon, authenticated;
  EXCEPTION WHEN undefined_function THEN NULL;
  END;
  BEGIN
    REVOKE EXECUTE ON FUNCTION public.log_ai_usage(
      uuid, varchar, varchar, varchar, varchar, uuid, varchar, uuid,
      integer, integer, text[], boolean, integer, boolean, text)
      FROM anon, authenticated;
  EXCEPTION WHEN undefined_function THEN NULL;
  END;
  BEGIN
    REVOKE EXECUTE ON FUNCTION public.allow_first_org_creation() FROM anon, authenticated;
  EXCEPTION WHEN undefined_function THEN NULL;
  END;

  -- AI feature gates: only the server enforces these (handlers call them
  -- before kicking off OpenAI requests). Client UI uses a different feature
  -- flag read from the organizations row.
  BEGIN
    REVOKE EXECUTE ON FUNCTION public.check_ai_enabled(uuid) FROM anon, authenticated;
  EXCEPTION WHEN undefined_function THEN NULL;
  END;
  BEGIN
    REVOKE EXECUTE ON FUNCTION public.check_ai_feature_enabled(uuid, varchar)
      FROM anon, authenticated;
  EXCEPTION WHEN undefined_function THEN NULL;
  END;
END $$;

-- ============================================================================
-- 5. Functions kept open (intentionally callable) — documented here for
--    auditors so they don't get re-flagged in a future cleanup.
--
--    `authenticated` retains EXECUTE on:
--      * get_user_organization_id()  — used in nearly every RLS policy
--      * get_user_role()             — used in role-gated RLS policies
--      * is_platform_user()          — used in cross-org platform RLS
--      * can_create_organization()   — called from the onboarding UI
--    Each is SECURITY DEFINER because it must read profiles to answer,
--    and the answer is the user's own org/role — no privilege escalation.
--
--    `anon` retains EXECUTE on:
--      * get_feedback_survey_by_token(varchar)
--      * validate_feedback_token(varchar)
--      * submit_feedback(...)
--    These power the customer-facing feedback flow accessed via signed
--    URLs sent in completion emails — anonymous by design.
-- ============================================================================
