-- Migration: Optimize variance calculation to avoid N+1 query pattern
-- This adds a variant of calculate_completion_variance that accepts job_id directly,
-- avoiding the extra query to look up completion_id first.

-- Create variant that accepts job_id directly
CREATE OR REPLACE FUNCTION calculate_completion_variance_by_job(p_job_id UUID)
RETURNS VOID AS $$
DECLARE
  v_completion_id UUID;
  v_actual_hours DECIMAL(8, 2);
  v_actual_material_cost DECIMAL(12, 2);
  v_estimated_hours DECIMAL(8, 2);
  v_estimated_material_cost DECIMAL(12, 2);
BEGIN
  -- Get completion_id if it exists
  SELECT id INTO v_completion_id FROM job_completions WHERE job_id = p_job_id;

  -- If no completion record exists, nothing to update
  IF v_completion_id IS NULL THEN
    RETURN;
  END IF;

  -- Calculate actual hours from time entries
  SELECT COALESCE(SUM(hours), 0) INTO v_actual_hours
  FROM job_time_entries WHERE job_id = p_job_id;

  -- Calculate actual material cost from usage
  SELECT COALESCE(SUM(total_cost), 0) INTO v_actual_material_cost
  FROM job_material_usage WHERE job_id = p_job_id;

  -- Get estimated values from job
  SELECT estimated_duration_hours, contract_amount
  INTO v_estimated_hours, v_estimated_material_cost
  FROM jobs WHERE id = p_job_id;

  -- Update completion record
  UPDATE job_completions
  SET
    actual_hours = v_actual_hours,
    actual_material_cost = v_actual_material_cost,
    hours_variance = CASE WHEN v_estimated_hours IS NOT NULL AND v_estimated_hours > 0
      THEN v_actual_hours - v_estimated_hours
      ELSE NULL
    END,
    hours_variance_percent = CASE WHEN v_estimated_hours IS NOT NULL AND v_estimated_hours > 0
      THEN ((v_actual_hours - v_estimated_hours) / v_estimated_hours * 100)::DECIMAL(5, 2)
      ELSE NULL
    END,
    material_variance = CASE WHEN v_estimated_material_cost IS NOT NULL AND v_estimated_material_cost > 0
      THEN v_actual_material_cost - v_estimated_material_cost
      ELSE NULL
    END,
    material_variance_percent = CASE WHEN v_estimated_material_cost IS NOT NULL AND v_estimated_material_cost > 0
      THEN ((v_actual_material_cost - v_estimated_material_cost) / v_estimated_material_cost * 100)::DECIMAL(5, 2)
      ELSE NULL
    END,
    updated_at = NOW()
  WHERE id = v_completion_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION calculate_completion_variance_by_job(UUID) TO authenticated;
