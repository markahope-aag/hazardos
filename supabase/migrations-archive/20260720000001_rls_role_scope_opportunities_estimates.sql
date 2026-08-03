-- CRITICAL (audit finding): make write access to opportunities, pipeline_stages,
-- estimates and estimate_line_items ROLE-scoped, not just org-scoped.
--
-- These tables carried org-only policies with NO role predicate, so RLS enforced
-- tenant isolation but not authorization. Because write paths exist as raw
-- browser-side supabase.from(...).update(...) calls that bypass the app's only
-- RBAC layer (createApiHandler allowedRoles), any authenticated org member —
-- including read-only `viewer` and field-only `technician` — could:
--   * UPDATE/INSERT opportunities and pipeline_stages (verified: viewer edited both)
--   * UPDATE/INSERT estimates (verified: viewer renamed an estimate)
--   * UPDATE estimate_line_items on estimates of ANY status, bypassing the API's
--     line-item lock (verified: technician changed unit_price on 6/6 estimates)
--
-- Fix mirrors 20260714000006_rls_role_scoped_writes.sql (jobs/invoices/payments):
-- keep org-wide SELECT, restrict INSERT/UPDATE/DELETE to ROLES.TENANT_WRITE
-- (platform_owner, platform_admin, tenant_owner, admin, estimator). technician
-- and viewer become read-only at the database, matching the app's intent.
-- get_user_organization_id()/get_user_role() are the existing SECURITY DEFINER
-- helpers. Org-seed triggers run SECURITY DEFINER and are unaffected.

-- ======================= OPPORTUNITIES =======================
DROP POLICY IF EXISTS "Org access opportunities" ON opportunities;

CREATE POLICY "opportunities_select_org" ON opportunities
  FOR SELECT USING (organization_id = get_user_organization_id());

CREATE POLICY "opportunities_insert_write_roles" ON opportunities
  FOR INSERT WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('platform_owner','platform_admin','tenant_owner','admin','estimator')
  );

CREATE POLICY "opportunities_update_write_roles" ON opportunities
  FOR UPDATE USING (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('platform_owner','platform_admin','tenant_owner','admin','estimator')
  ) WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('platform_owner','platform_admin','tenant_owner','admin','estimator')
  );

CREATE POLICY "opportunities_delete_write_roles" ON opportunities
  FOR DELETE USING (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('platform_owner','platform_admin','tenant_owner','admin','estimator')
  );

-- ======================= PIPELINE_STAGES =====================
DROP POLICY IF EXISTS "Org access pipeline_stages" ON pipeline_stages;

CREATE POLICY "pipeline_stages_select_org" ON pipeline_stages
  FOR SELECT USING (organization_id = get_user_organization_id());

CREATE POLICY "pipeline_stages_insert_write_roles" ON pipeline_stages
  FOR INSERT WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('platform_owner','platform_admin','tenant_owner','admin','estimator')
  );

CREATE POLICY "pipeline_stages_update_write_roles" ON pipeline_stages
  FOR UPDATE USING (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('platform_owner','platform_admin','tenant_owner','admin','estimator')
  ) WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('platform_owner','platform_admin','tenant_owner','admin','estimator')
  );

CREATE POLICY "pipeline_stages_delete_write_roles" ON pipeline_stages
  FOR DELETE USING (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('platform_owner','platform_admin','tenant_owner','admin','estimator')
  );

-- ========================== ESTIMATES ========================
-- Replace only the org-only write policies; leave SELECT (org + platform) and the
-- admin-gated DELETE from 20260201000000 intact.
DROP POLICY IF EXISTS "Users can create estimates in their organization" ON estimates;
DROP POLICY IF EXISTS "Users can update estimates in their organization" ON estimates;

CREATE POLICY "estimates_insert_write_roles" ON estimates
  FOR INSERT WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('platform_owner','platform_admin','tenant_owner','admin','estimator')
  );

CREATE POLICY "estimates_update_write_roles" ON estimates
  FOR UPDATE USING (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('platform_owner','platform_admin','tenant_owner','admin','estimator')
  ) WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('platform_owner','platform_admin','tenant_owner','admin','estimator')
  );

-- ===================== ESTIMATE_LINE_ITEMS ===================
-- Org scope is inherited from the parent estimate; add the role predicate.
DROP POLICY IF EXISTS "Users can create line items for their estimates" ON estimate_line_items;
DROP POLICY IF EXISTS "Users can update line items for their estimates" ON estimate_line_items;
DROP POLICY IF EXISTS "Users can delete line items for their estimates" ON estimate_line_items;

CREATE POLICY "estimate_line_items_insert_write_roles" ON estimate_line_items
  FOR INSERT WITH CHECK (
    estimate_id IN (SELECT id FROM estimates WHERE organization_id = get_user_organization_id())
    AND get_user_role() IN ('platform_owner','platform_admin','tenant_owner','admin','estimator')
  );

CREATE POLICY "estimate_line_items_update_write_roles" ON estimate_line_items
  FOR UPDATE USING (
    estimate_id IN (SELECT id FROM estimates WHERE organization_id = get_user_organization_id())
    AND get_user_role() IN ('platform_owner','platform_admin','tenant_owner','admin','estimator')
  ) WITH CHECK (
    estimate_id IN (SELECT id FROM estimates WHERE organization_id = get_user_organization_id())
    AND get_user_role() IN ('platform_owner','platform_admin','tenant_owner','admin','estimator')
  );

CREATE POLICY "estimate_line_items_delete_write_roles" ON estimate_line_items
  FOR DELETE USING (
    estimate_id IN (SELECT id FROM estimates WHERE organization_id = get_user_organization_id())
    AND get_user_role() IN ('platform_owner','platform_admin','tenant_owner','admin','estimator')
  );
