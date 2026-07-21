-- SEC20: api_keys RLS was a single org-only FOR ALL policy with NO role gate, so
-- any org member (incl. viewer/technician) could INSERT/UPDATE/DELETE an API key
-- via a raw supabase client — minting a full-scope key and bypassing the API's
-- TENANT_ADMIN gate (privilege escalation). Restrict all operations to admin roles.
-- Key VALIDATION uses the service-role client (bypasses RLS) so it is unaffected.
DROP POLICY IF EXISTS "Users can manage their org API keys" ON api_keys;

CREATE POLICY "api_keys_select_admin" ON api_keys FOR SELECT USING (
  organization_id = get_user_organization_id()
  AND get_user_role() IN ('platform_owner','platform_admin','tenant_owner','admin')
);
CREATE POLICY "api_keys_insert_admin" ON api_keys FOR INSERT WITH CHECK (
  organization_id = get_user_organization_id()
  AND get_user_role() IN ('platform_owner','platform_admin','tenant_owner','admin')
);
CREATE POLICY "api_keys_update_admin" ON api_keys FOR UPDATE USING (
  organization_id = get_user_organization_id()
  AND get_user_role() IN ('platform_owner','platform_admin','tenant_owner','admin')
) WITH CHECK (
  organization_id = get_user_organization_id()
  AND get_user_role() IN ('platform_owner','platform_admin','tenant_owner','admin')
);
CREATE POLICY "api_keys_delete_admin" ON api_keys FOR DELETE USING (
  organization_id = get_user_organization_id()
  AND get_user_role() IN ('platform_owner','platform_admin','tenant_owner','admin')
);
