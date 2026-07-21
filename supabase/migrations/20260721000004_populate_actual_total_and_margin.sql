-- ============================================================================
-- J27: populate job_completions.actual_total + actual_labor_cost and
-- jobs.actual_cost / gross_margin_pct — and fix schema drift that had the
-- optimized variance RPC erroring on every call.
--
-- Two problems, one function:
--  1. calculate_completion_variance_by_job (the "optimize" variant the service
--     calls first) SET material_variance / material_variance_percent, but the
--     live job_completions table has cost_variance / cost_variance_percent —
--     so the RPC raised "column does not exist" on every call and the service
--     silently fell back to the legacy per-completion function.
--  2. Neither function ever set actual_total, so job_completions.actual_total,
--     jobs.actual_cost and jobs.gross_margin_pct stayed NULL — margin/reporting
--     were uncomputable.
--
-- Fix: recreate the _by_job function against the real columns and populate the
-- actuals from recorded data (no valuation guess): labor = SUM(hours *
-- hourly_rate) from job_time_entries, materials = SUM(total_cost) from
-- job_material_usage, equipment = SUM(rental_total) from job_equipment.
-- actual_total is their sum; cost_variance compares it to the completion's
-- estimated_total; the job's actual_cost mirrors actual_total and
-- gross_margin_pct = (revenue - actual_total) / revenue * 100.
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_completion_variance_by_job(p_job_id UUID)
RETURNS VOID AS $$
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

  -- Mirror the actual cost onto the job and compute gross margin against
  -- revenue. NULLIF avoids a divide-by-zero when there's no revenue yet.
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION calculate_completion_variance_by_job(UUID) TO authenticated;
