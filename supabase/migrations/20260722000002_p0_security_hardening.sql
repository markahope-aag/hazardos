-- ============================================================================
-- P0 security hardening — three confirmed, independently reproduced defects.
--
-- SEC23  profiles: any user could rewrite their own role / organization_id /
--        is_platform_user, i.e. self-promote to platform_owner or move into
--        another tenant.
-- SEC24  Five SECURITY DEFINER RPCs were executable by anon with no tenant
--        check, one of which disclosed pg_stat_statements.
-- SEC25  calculate_completion_variance_by_job: SECURITY DEFINER, granted to
--        authenticated, no search_path, no tenant check — a cross-tenant write.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- SEC23 — profiles privilege escalation
--
-- profile_own_update and profiles_update_own were BOTH `FOR UPDATE
-- USING (id = auth.uid())` with no WITH CHECK. Postgres reuses USING as the
-- check when WITH CHECK is absent, so the only invariant enforced was "you may
-- edit your own row" — role, organization_id and is_platform_user were freely
-- writable, and no trigger guarded them.
--
-- Reproduced end-to-end against this database with a viewer account and the
-- public anon key:
--   BEFORE {"role":"viewer",        "is_platform_user":false}
--   AFTER  {"role":"platform_owner","is_platform_user":true}  + org changed
--
-- get_user_role() then returns platform_owner, which satisfies every
-- PLATFORM_ONLY policy and every allowedRoles check in createApiHandler — so
-- this sat underneath every other authorization control in the system.
--
-- Note the two policies were duplicates. Permissive policies OR together, so
-- correcting one would have had no effect; both are replaced by one canonical
-- policy. (profile_own_select / profiles_select_own are likewise duplicates but
-- are read-only and identical, so they are left alone here.)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "profile_own_update" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- RLS alone cannot express "these columns may not change" — a policy sees only
-- the new row, never the old one. The invariant therefore lives in a trigger,
-- which also covers the service-role client (which bypasses RLS but not
-- triggers) and any future write path.
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Server-side callers are trusted: the service-role client is only reachable
  -- from our own server code, and `postgres` covers migrations and SECURITY
  -- DEFINER functions such as handle_new_user().
  IF current_user IN ('service_role', 'postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'profiles.role cannot be changed by the account holder'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
    RAISE EXCEPTION 'profiles.organization_id cannot be changed by the account holder'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.is_platform_user IS DISTINCT FROM OLD.is_platform_user THEN
    RAISE EXCEPTION 'profiles.is_platform_user cannot be changed by the account holder'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_privilege_escalation ON profiles;
CREATE TRIGGER trg_prevent_profile_privilege_escalation
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_privilege_escalation();


-- ---------------------------------------------------------------------------
-- SEC24 — SECURITY DEFINER RPCs executable by anon
--
-- has_function_privilege confirmed anon held EXECUTE on all five. They run as
-- postgres (BYPASSRLS) and none check auth.uid() or organization_id:
--
--   get_top_slow_queries          returned live pg_stat_statements rows,
--                                 including PostgREST queries against
--                                 public.organizations — unauthenticated.
--   reset_rate_limit              unconditional UPDATE api_keys SET
--                                 rate_limit_count = 0 on any key id.
--   check_and_increment_rate_limit  the inverse: burn any tenant's quota.
--   recalc_customer_stats         overwrites lifetime_value / total_jobs /
--   recalc_company_stats          last_job_date on any row in any org.
--
-- Only get_top_slow_queries has a caller in application code
-- (app/api/platform-admin/query-performance/route.ts), and that route already
-- uses createAdminClient() — its comment even asserts the RPC "is locked to the
-- service role", which was never actually true. The other four have no caller
-- in app/, lib/, components/, or any other database function. Revoking from
-- both anon and authenticated therefore breaks nothing.
-- ---------------------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION public.get_top_slow_queries(text, int) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reset_rate_limit(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_and_increment_rate_limit(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalc_customer_stats(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalc_company_stats(uuid) FROM anon, authenticated;


-- ---------------------------------------------------------------------------
-- SEC25 — calculate_completion_variance_by_job cross-tenant write
--
-- SECURITY DEFINER + GRANT EXECUTE TO authenticated + no SET search_path + no
-- tenant check: a technician at org A could pass org B's job id and silently
-- rewrite org B's cost variance, actual cost and gross margin.
--
-- This was reinforced by 20260721000004_populate_actual_total_and_margin.sql,
-- which recreated the function to fix a schema-drift bug and carried the
-- SECURITY DEFINER and the grant forward without adding either guard.
--
-- The body below is unchanged from that migration apart from the two fixes:
-- an explicit search_path, and an organization check for non-server callers.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.calculate_completion_variance_by_job(p_job_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_completion_id UUID;
  v_actual_hours DECIMAL(8, 2);
  v_actual_material_cost DECIMAL(12, 2);
  v_actual_labor_cost DECIMAL(12, 2);
  v_actual_equipment_cost DECIMAL(12, 2);
  v_actual_total DECIMAL(12, 2);
  v_estimated_hours DECIMAL(8, 2);
  v_estimated_total DECIMAL(12, 2);
  v_revenue DECIMAL(12, 2);
BEGIN
  -- The function runs as postgres and therefore bypasses RLS. Server-side
  -- callers are trusted; anyone else must own the job they are recalculating.
  IF current_user NOT IN ('service_role', 'postgres', 'supabase_admin') THEN
    IF NOT EXISTS (
      SELECT 1 FROM jobs
      WHERE id = p_job_id
        AND organization_id = get_user_organization_id()
    ) THEN
      RAISE EXCEPTION 'job not found in your organization'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT id, estimated_total INTO v_completion_id, v_estimated_total
  FROM job_completions WHERE job_id = p_job_id;
  IF v_completion_id IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(SUM(hours), 0),
         COALESCE(SUM(hours * COALESCE(hourly_rate, 0)), 0)
  INTO v_actual_hours, v_actual_labor_cost
  FROM job_time_entries WHERE job_id = p_job_id;

  SELECT COALESCE(SUM(total_cost), 0) INTO v_actual_material_cost
  FROM job_material_usage WHERE job_id = p_job_id;

  SELECT COALESCE(SUM(rental_total), 0) INTO v_actual_equipment_cost
  FROM job_equipment WHERE job_id = p_job_id;

  v_actual_total := v_actual_labor_cost + v_actual_material_cost + v_actual_equipment_cost;

  SELECT estimated_duration_hours, COALESCE(actual_revenue, contract_amount, final_amount)
  INTO v_estimated_hours, v_revenue
  FROM jobs WHERE id = p_job_id;

  UPDATE job_completions
  SET
    actual_hours = v_actual_hours,
    actual_material_cost = v_actual_material_cost,
    actual_labor_cost = v_actual_labor_cost,
    actual_total = v_actual_total,
    hours_variance = CASE WHEN v_estimated_hours IS NOT NULL AND v_estimated_hours > 0
      THEN v_actual_hours - v_estimated_hours ELSE NULL END,
    hours_variance_percent = CASE WHEN v_estimated_hours IS NOT NULL AND v_estimated_hours > 0
      THEN ((v_actual_hours - v_estimated_hours) / v_estimated_hours * 100)::DECIMAL(5, 2) ELSE NULL END,
    cost_variance = CASE WHEN v_estimated_total IS NOT NULL AND v_estimated_total > 0
      THEN v_actual_total - v_estimated_total ELSE NULL END,
    cost_variance_percent = CASE WHEN v_estimated_total IS NOT NULL AND v_estimated_total > 0
      THEN ((v_actual_total - v_estimated_total) / v_estimated_total * 100)::DECIMAL(5, 2) ELSE NULL END,
    updated_at = NOW()
  WHERE id = v_completion_id;

  UPDATE jobs
  SET
    actual_cost = v_actual_total,
    gross_margin_pct = CASE
      WHEN v_revenue IS NOT NULL AND v_revenue > 0
      THEN (((v_revenue - v_actual_total) / NULLIF(v_revenue, 0)) * 100)::DECIMAL(5, 2)
      ELSE NULL
    END,
    updated_at = NOW()
  WHERE id = p_job_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_completion_variance_by_job(UUID) TO authenticated;
