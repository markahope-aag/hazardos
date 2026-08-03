-- Follow-up to 20260724152045_role_scope_write_policies: companies and
-- customers were missed from that migration's table list. DELETE was already
-- role-gated (admin/tenant_owner) on both; INSERT/UPDATE had no role check at
-- all, and customers additionally carried two duplicate ungated INSERT
-- policies (P2-12 style duplication).

DROP POLICY IF EXISTS "Users can create companies in their organization" ON companies;
CREATE POLICY "Users can create companies in their organization" ON companies
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));

DROP POLICY IF EXISTS "Users can update companies in their organization" ON companies;
CREATE POLICY "Users can update companies in their organization" ON companies
  FOR UPDATE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));


DROP POLICY IF EXISTS "Users can create customers in their organization" ON customers;
DROP POLICY IF EXISTS "Users can insert customers in their organization" ON customers;
CREATE POLICY "Users can create customers in their organization" ON customers
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));

DROP POLICY IF EXISTS "Users can update customers in their organization" ON customers;
CREATE POLICY "Users can update customers in their organization" ON customers
  FOR UPDATE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));
