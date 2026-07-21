-- ============================================================================
-- ES16: Estimate line-item lock must be enforced in RLS, not only the API.
--
-- /api/estimates/[id]/line-items refuses to modify line items unless the parent
-- estimate is in ('draft','pending_approval'):
--     if (!['draft','pending_approval'].includes(estimate.status)) throw ...
-- But the RLS write policies (estimate_line_items_{insert,update,delete}_write_
-- roles) only checked org + role, so a write-role user (estimator/admin) could
-- INSERT/UPDATE/DELETE line items on an approved/sent/accepted estimate via a
-- raw supabase-js client, bypassing the lock. RLS enforced authorization but
-- not the workflow state.
--
-- Fix: fold the editable-status check into the estimate subquery of each write
-- policy, so writes are only permitted when the parent estimate is still in an
-- editable status. This is done with RLS (not a trigger) on purpose: an estimate
-- is hard-deleted with ON DELETE CASCADE to its line items, and cascaded deletes
-- bypass RLS — so whole-estimate deletion still works, while a *direct* line-item
-- write against a locked estimate is refused. The SELECT (view) policy is left
-- untouched so locked estimates remain fully readable.
-- ============================================================================

DROP POLICY IF EXISTS "estimate_line_items_insert_write_roles" ON estimate_line_items;
CREATE POLICY "estimate_line_items_insert_write_roles" ON estimate_line_items
  FOR INSERT WITH CHECK (
    estimate_id IN (
      SELECT id FROM estimates
      WHERE organization_id = get_user_organization_id()
        AND status IN ('draft', 'pending_approval')
    )
    AND get_user_role() IN ('platform_owner','platform_admin','tenant_owner','admin','estimator')
  );

DROP POLICY IF EXISTS "estimate_line_items_update_write_roles" ON estimate_line_items;
CREATE POLICY "estimate_line_items_update_write_roles" ON estimate_line_items
  FOR UPDATE USING (
    estimate_id IN (
      SELECT id FROM estimates
      WHERE organization_id = get_user_organization_id()
        AND status IN ('draft', 'pending_approval')
    )
    AND get_user_role() IN ('platform_owner','platform_admin','tenant_owner','admin','estimator')
  ) WITH CHECK (
    estimate_id IN (
      SELECT id FROM estimates
      WHERE organization_id = get_user_organization_id()
        AND status IN ('draft', 'pending_approval')
    )
    AND get_user_role() IN ('platform_owner','platform_admin','tenant_owner','admin','estimator')
  );

DROP POLICY IF EXISTS "estimate_line_items_delete_write_roles" ON estimate_line_items;
CREATE POLICY "estimate_line_items_delete_write_roles" ON estimate_line_items
  FOR DELETE USING (
    estimate_id IN (
      SELECT id FROM estimates
      WHERE organization_id = get_user_organization_id()
        AND status IN ('draft', 'pending_approval')
    )
    AND get_user_role() IN ('platform_owner','platform_admin','tenant_owner','admin','estimator')
  );
