-- ============================================================================
-- Cleanup: drop the legacy duplicate RLS policies on the six pricing tables.
--
-- Each pricing table currently carries TWO copies of the same rule — an older
-- space-named pair written against inline `profiles` subqueries, and the
-- current underscore-named pair written against the get_user_*() helpers:
--
--   "Admins can manage labor rates in their organization"    <- legacy
--   "Admins can manage labor_rates in their organization"    <- current
--   "Users can view labor rates in their organization"       <- legacy
--   "Users can view labor_rates in their organization"       <- current
--
-- Permissive policies OR together, so the duplicates were never a security
-- hole: the legacy manage policy allows {admin, tenant_owner}, a strict subset
-- of the current {platform_owner, platform_admin, tenant_owner, admin}, and the
-- legacy view policy is logically identical to the current one — both helpers
-- resolve via `SELECT ... FROM profiles WHERE id = auth.uid()`, exactly what the
-- legacy subqueries inline. Dropping the legacy pair is therefore a no-op on
-- effective access; it just removes the second copy an auditor has to reason
-- about before concluding the pair is redundant.
--
-- DELIBERATELY KEPT: "Platform owners can access all <table>". Those look like
-- a third duplicate but are not — they carry no organization_id predicate, so
-- they are what grants platform staff the cross-org access the app relies on
-- (see `is_platform_user` in CLAUDE.md). The current underscore policy requires
-- an org match and cannot substitute for them.
-- ============================================================================

-- labor_rates
DROP POLICY IF EXISTS "Admins can manage labor rates in their organization" ON labor_rates;
DROP POLICY IF EXISTS "Users can view labor rates in their organization" ON labor_rates;

-- equipment_rates
DROP POLICY IF EXISTS "Admins can manage equipment rates in their organization" ON equipment_rates;
DROP POLICY IF EXISTS "Users can view equipment rates in their organization" ON equipment_rates;

-- material_costs
DROP POLICY IF EXISTS "Admins can manage material costs in their organization" ON material_costs;
DROP POLICY IF EXISTS "Users can view material costs in their organization" ON material_costs;

-- disposal_fees
DROP POLICY IF EXISTS "Admins can manage disposal fees in their organization" ON disposal_fees;
DROP POLICY IF EXISTS "Users can view disposal fees in their organization" ON disposal_fees;

-- travel_rates
DROP POLICY IF EXISTS "Admins can manage travel rates in their organization" ON travel_rates;
DROP POLICY IF EXISTS "Users can view travel rates in their organization" ON travel_rates;

-- pricing_settings
DROP POLICY IF EXISTS "Admins can manage pricing settings in their organization" ON pricing_settings;
DROP POLICY IF EXISTS "Users can view pricing settings in their organization" ON pricing_settings;
