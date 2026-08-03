-- ============================================================================
-- CO2: auto-calculated commissions per won job need a way to resolve the
-- rep's commission plan. CommissionService.assignPlanToUser already writes
-- profiles.commission_plan_id, but that column was never created — so plan
-- assignment silently failed and there was nothing for the auto-create hook
-- to read. This adds the column.
-- ============================================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS commission_plan_id UUID REFERENCES commission_plans(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_commission_plan ON profiles(commission_plan_id);
