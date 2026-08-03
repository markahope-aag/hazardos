-- ============================================================================
-- SEC21: Pricing tables — RLS must gate writes to admins, matching the API.
--
-- The 20260131210000_fix_rls_infinite_recursion migration recreated every
-- pricing "manage" policy with get_user_role() IN ('admin','estimator',
-- 'tenant_owner') — it ADDED 'estimator'. But every /api/settings/pricing
-- route gates writes to TENANT_ADMIN
-- (['platform_owner','platform_admin','tenant_owner','admin']). So an
-- estimator could UPDATE/INSERT/DELETE pricing rows via a raw supabase-js
-- client even though the UI/API refuse — RLS enforced org isolation but not
-- role authorization (same systemic class as SEC17/SEC19/SEC20).
--
-- Fix: recreate the six pricing "manage" policies with the admin role set
-- (adds the platform roles, drops estimator). The separate org-only SELECT
-- policies are untouched, so estimators keep READ access needed to build
-- estimates — only writes are locked down.
-- ============================================================================

-- labor_rates
DROP POLICY IF EXISTS "Admins can manage labor_rates in their organization" ON labor_rates;
CREATE POLICY "Admins can manage labor_rates in their organization" ON labor_rates
    FOR ALL USING (
        organization_id = get_user_organization_id()
        AND get_user_role() IN ('platform_owner', 'platform_admin', 'tenant_owner', 'admin')
    );

-- equipment_rates
DROP POLICY IF EXISTS "Admins can manage equipment_rates in their organization" ON equipment_rates;
CREATE POLICY "Admins can manage equipment_rates in their organization" ON equipment_rates
    FOR ALL USING (
        organization_id = get_user_organization_id()
        AND get_user_role() IN ('platform_owner', 'platform_admin', 'tenant_owner', 'admin')
    );

-- material_costs
DROP POLICY IF EXISTS "Admins can manage material_costs in their organization" ON material_costs;
CREATE POLICY "Admins can manage material_costs in their organization" ON material_costs
    FOR ALL USING (
        organization_id = get_user_organization_id()
        AND get_user_role() IN ('platform_owner', 'platform_admin', 'tenant_owner', 'admin')
    );

-- disposal_fees
DROP POLICY IF EXISTS "Admins can manage disposal_fees in their organization" ON disposal_fees;
CREATE POLICY "Admins can manage disposal_fees in their organization" ON disposal_fees
    FOR ALL USING (
        organization_id = get_user_organization_id()
        AND get_user_role() IN ('platform_owner', 'platform_admin', 'tenant_owner', 'admin')
    );

-- travel_rates
DROP POLICY IF EXISTS "Admins can manage travel_rates in their organization" ON travel_rates;
CREATE POLICY "Admins can manage travel_rates in their organization" ON travel_rates
    FOR ALL USING (
        organization_id = get_user_organization_id()
        AND get_user_role() IN ('platform_owner', 'platform_admin', 'tenant_owner', 'admin')
    );

-- pricing_settings
DROP POLICY IF EXISTS "Admins can manage pricing_settings in their organization" ON pricing_settings;
CREATE POLICY "Admins can manage pricing_settings in their organization" ON pricing_settings
    FOR ALL USING (
        organization_id = get_user_organization_id()
        AND get_user_role() IN ('platform_owner', 'platform_admin', 'tenant_owner', 'admin')
    );
