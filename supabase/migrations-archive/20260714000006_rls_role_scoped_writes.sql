-- CRITICAL: make write access to jobs / invoices / payments role-scoped, not
-- just org-scoped (audit finding).
--
-- These tables carried permissive `FOR ALL USING (organization_id = ...)`
-- policies with NO role predicate, so RLS enforced tenant isolation but not
-- authorization. Because at least one write path is a raw browser-side
-- supabase.from('jobs').update(...) (CRM job page) that bypasses the app's
-- only RBAC layer (createApiHandler's allowedRoles), any authenticated org
-- member — including read-only `viewer` and field-only `technician` roles —
-- could update job status/amounts (firing the auto-invoice trigger at an
-- attacker-chosen amount) or INSERT directly into `payments` to fabricate a
-- paid invoice.
--
-- Fix: keep org-wide SELECT (everyone in the org can read), but restrict
-- INSERT/UPDATE/DELETE to the write roles that ROLES.TENANT_WRITE already
-- gates the API to: platform_owner, platform_admin, tenant_owner, admin,
-- estimator. technician/viewer become read-only at the database, matching
-- the app's intent. get_user_role()/get_user_organization_id() are the
-- existing SECURITY DEFINER helpers (search_path pinned to public).
--
-- The separate "Platform owners can access all invoices/payments" cross-org
-- FOR ALL policies are left intact.

-- Reusable write-role set: TENANT_WRITE.
--   platform_owner, platform_admin, tenant_owner, admin, estimator

-- ============================ JOBS ============================
-- Drop the org-only (and the older, platform-incomplete) manage policies.
DROP POLICY IF EXISTS "Users can manage their org jobs" ON jobs;
DROP POLICY IF EXISTS "Admins can manage jobs in their organization" ON jobs;

-- Org-wide read (recreate canonically; harmless if an equivalent view policy exists).
DROP POLICY IF EXISTS "jobs_select_org" ON jobs;
CREATE POLICY "jobs_select_org" ON jobs
  FOR SELECT USING (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "jobs_insert_write_roles" ON jobs;
CREATE POLICY "jobs_insert_write_roles" ON jobs
  FOR INSERT WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('platform_owner','platform_admin','tenant_owner','admin','estimator')
  );

DROP POLICY IF EXISTS "jobs_update_write_roles" ON jobs;
CREATE POLICY "jobs_update_write_roles" ON jobs
  FOR UPDATE USING (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('platform_owner','platform_admin','tenant_owner','admin','estimator')
  ) WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('platform_owner','platform_admin','tenant_owner','admin','estimator')
  );

DROP POLICY IF EXISTS "jobs_delete_write_roles" ON jobs;
CREATE POLICY "jobs_delete_write_roles" ON jobs
  FOR DELETE USING (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('platform_owner','platform_admin','tenant_owner','admin','estimator')
  );

-- ========================== INVOICES ==========================
DROP POLICY IF EXISTS "Users can manage invoices in their organization" ON invoices;

DROP POLICY IF EXISTS "invoices_insert_write_roles" ON invoices;
CREATE POLICY "invoices_insert_write_roles" ON invoices
  FOR INSERT WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('platform_owner','platform_admin','tenant_owner','admin','estimator')
  );

DROP POLICY IF EXISTS "invoices_update_write_roles" ON invoices;
CREATE POLICY "invoices_update_write_roles" ON invoices
  FOR UPDATE USING (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('platform_owner','platform_admin','tenant_owner','admin','estimator')
  ) WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('platform_owner','platform_admin','tenant_owner','admin','estimator')
  );

DROP POLICY IF EXISTS "invoices_delete_write_roles" ON invoices;
CREATE POLICY "invoices_delete_write_roles" ON invoices
  FOR DELETE USING (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('platform_owner','platform_admin','tenant_owner','admin','estimator')
  );

-- ========================== PAYMENTS ==========================
DROP POLICY IF EXISTS "Users can manage payments in their organization" ON payments;

DROP POLICY IF EXISTS "payments_insert_write_roles" ON payments;
CREATE POLICY "payments_insert_write_roles" ON payments
  FOR INSERT WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('platform_owner','platform_admin','tenant_owner','admin','estimator')
  );

DROP POLICY IF EXISTS "payments_update_write_roles" ON payments;
CREATE POLICY "payments_update_write_roles" ON payments
  FOR UPDATE USING (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('platform_owner','platform_admin','tenant_owner','admin','estimator')
  ) WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('platform_owner','platform_admin','tenant_owner','admin','estimator')
  );

DROP POLICY IF EXISTS "payments_delete_write_roles" ON payments;
CREATE POLICY "payments_delete_write_roles" ON payments
  FOR DELETE USING (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('platform_owner','platform_admin','tenant_owner','admin','estimator')
  );
