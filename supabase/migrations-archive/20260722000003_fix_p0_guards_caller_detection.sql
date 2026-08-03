-- ============================================================================
-- Fix for 20260722000002: both guards detected the caller incorrectly and were
-- therefore inert. Verified by re-running the SEC23 exploit after that
-- migration applied cleanly — a viewer still reached platform_owner.
--
-- Cause: both guards branched on `current_user NOT IN ('service_role', ...)`,
-- but inside a SECURITY DEFINER function current_user is the function OWNER
-- (postgres), not the caller. The "trusted server caller" branch therefore
-- matched on every call, including from `authenticated`, and the checks never
-- ran.
--
-- Fix: identify the caller by JWT instead of by executing role.
--   auth.uid() is non-NULL only for a logged-in end user. The service-role key
--   is a JWT with role=service_role and no `sub` claim, and a direct postgres
--   connection has no request.jwt.claims at all — so both yield NULL, which is
--   exactly the "trusted server context" we mean.
--
-- The trigger is additionally switched to SECURITY INVOKER so current_user is
-- meaningful there too, giving two independent signals rather than one.
-- anon also yields NULL from auth.uid(), but anon cannot pass the UPDATE
-- policy (id = auth.uid() is never true for it), so it never reaches either.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- SEC23 — profiles privilege escalation guard
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Trusted server context: no end-user JWT, or an explicitly privileged role.
  IF auth.uid() IS NULL
     OR current_user IN ('service_role', 'postgres', 'supabase_admin') THEN
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


-- ---------------------------------------------------------------------------
-- SEC25 — cross-tenant variance write guard
--
-- This function must stay SECURITY DEFINER (it has to bypass RLS to write
-- job_completions and jobs), so it cannot rely on current_user at all. The
-- tenant check now keys off auth.uid() instead.
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
  -- Runs as postgres and bypasses RLS, so an end user must be shown to own the
  -- job. auth.uid() is NULL for the service-role client and for direct
  -- connections, which are the trusted server paths.
  IF auth.uid() IS NOT NULL THEN
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
