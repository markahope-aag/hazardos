-- Evaluate auth.uid() once per query instead of once per row.
--
-- Supabase advisor 0003 (auth_rls_initplan) flagged 60 policies across 35 tables
-- calling auth.uid() directly in their USING or WITH CHECK expression. Postgres
-- then treats it as a per-row function call, so a scan of ten thousand rows
-- calls it ten thousand times. Wrapping it as ( SELECT auth.uid() ) makes it an
-- InitPlan: evaluated once, then compared against each row.
--
-- The rewrite is mechanical and semantically identical. auth.uid() is stable
-- within a statement, so hoisting it cannot change which rows match. Every
-- policy below was regenerated from its live definition rather than retyped,
-- so the predicates are otherwise unchanged.
--
-- This matters more as tables grow. It costs nothing today and quietly gets
-- worse with row count, which is the sort of thing that is much cheaper to fix
-- before the data arrives than after.

DROP POLICY IF EXISTS "Org admins can view AI usage logs" ON "public"."ai_usage_log";
CREATE POLICY "Org admins can view AI usage logs" ON "public"."ai_usage_log"
  AS PERMISSIVE
  FOR SELECT
  USING (((organization_id = get_user_organization_id()) AND (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() )) AND (profiles.role = ANY (ARRAY['admin'::user_role, 'tenant_owner'::user_role])))))));

DROP POLICY IF EXISTS "Admins manage approval_thresholds" ON "public"."approval_thresholds";
CREATE POLICY "Admins manage approval_thresholds" ON "public"."approval_thresholds"
  AS PERMISSIVE
  FOR ALL
  USING (((organization_id = get_user_organization_id()) AND (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() )) AND (profiles.role = ANY (ARRAY['admin'::user_role, 'tenant_owner'::user_role])))))));

DROP POLICY IF EXISTS "Platform users can view all audit logs" ON "public"."audit_log";
CREATE POLICY "Platform users can view all audit logs" ON "public"."audit_log"
  AS PERMISSIVE
  FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() )) AND (profiles.role = ANY (ARRAY['platform_owner'::user_role, 'platform_admin'::user_role]))))));

DROP POLICY IF EXISTS "Users can view audit logs for their organization" ON "public"."audit_log";
CREATE POLICY "Users can view audit logs for their organization" ON "public"."audit_log"
  AS PERMISSIVE
  FOR SELECT
  USING (((organization_id IN ( SELECT profiles.organization_id
   FROM profiles
  WHERE (profiles.id = ( SELECT auth.uid() )))) OR (organization_id IS NULL)));

DROP POLICY IF EXISTS "Admins manage commissions" ON "public"."commission_earnings";
CREATE POLICY "Admins manage commissions" ON "public"."commission_earnings"
  AS PERMISSIVE
  FOR ALL
  USING (((organization_id = get_user_organization_id()) AND (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() )) AND (profiles.role = ANY (ARRAY['admin'::user_role, 'tenant_owner'::user_role])))))));

DROP POLICY IF EXISTS "Users see own commissions" ON "public"."commission_earnings";
CREATE POLICY "Users see own commissions" ON "public"."commission_earnings"
  AS PERMISSIVE
  FOR SELECT
  USING (((organization_id = get_user_organization_id()) AND ((user_id = ( SELECT auth.uid() )) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() )) AND (profiles.role = ANY (ARRAY['admin'::user_role, 'tenant_owner'::user_role]))))))));

DROP POLICY IF EXISTS "Admins manage org commission periods" ON "public"."commission_periods";
CREATE POLICY "Admins manage org commission periods" ON "public"."commission_periods"
  AS PERMISSIVE
  FOR ALL
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() )) AND (p.organization_id = commission_periods.organization_id) AND (p.role = ANY (ARRAY['platform_owner'::user_role, 'platform_admin'::user_role, 'tenant_owner'::user_role, 'admin'::user_role]))))));

DROP POLICY IF EXISTS "Platform owners access all commission periods" ON "public"."commission_periods";
CREATE POLICY "Platform owners access all commission periods" ON "public"."commission_periods"
  AS PERMISSIVE
  FOR ALL
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() )) AND (profiles.role = 'platform_owner'::user_role)))));

DROP POLICY IF EXISTS "Users view org commission periods" ON "public"."commission_periods";
CREATE POLICY "Users view org commission periods" ON "public"."commission_periods"
  AS PERMISSIVE
  FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() )) AND (p.organization_id = commission_periods.organization_id)))));

DROP POLICY IF EXISTS "Platform owners can access all customers" ON "public"."customers";
CREATE POLICY "Platform owners can access all customers" ON "public"."customers"
  AS PERMISSIVE
  FOR ALL
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() )) AND (profiles.role = 'platform_owner'::user_role)))));

DROP POLICY IF EXISTS "Admins can manage equipment in their organization" ON "public"."equipment_catalog";
CREATE POLICY "Admins can manage equipment in their organization" ON "public"."equipment_catalog"
  AS PERMISSIVE
  FOR ALL
  USING ((organization_id IN ( SELECT profiles.organization_id
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() )) AND (profiles.role = ANY (ARRAY['admin'::user_role, 'estimator'::user_role, 'tenant_owner'::user_role]))))));

DROP POLICY IF EXISTS "Users can view equipment in their organization" ON "public"."equipment_catalog";
CREATE POLICY "Users can view equipment in their organization" ON "public"."equipment_catalog"
  AS PERMISSIVE
  FOR SELECT
  USING ((organization_id IN ( SELECT profiles.organization_id
   FROM profiles
  WHERE (profiles.id = ( SELECT auth.uid() )))));

DROP POLICY IF EXISTS "Users can view line items for their estimates" ON "public"."estimate_line_items";
CREATE POLICY "Users can view line items for their estimates" ON "public"."estimate_line_items"
  AS PERMISSIVE
  FOR SELECT
  USING (((estimate_id IN ( SELECT estimates.id
   FROM estimates
  WHERE (estimates.organization_id IN ( SELECT profiles.organization_id
           FROM profiles
          WHERE (profiles.id = ( SELECT auth.uid() )))))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() )) AND (profiles.role = ANY (ARRAY['platform_owner'::user_role, 'platform_admin'::user_role])))))));

DROP POLICY IF EXISTS "Admins can delete estimates in their organization" ON "public"."estimates";
CREATE POLICY "Admins can delete estimates in their organization" ON "public"."estimates"
  AS PERMISSIVE
  FOR DELETE
  USING ((organization_id IN ( SELECT profiles.organization_id
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() )) AND (profiles.role = ANY (ARRAY['tenant_owner'::user_role, 'admin'::user_role, 'platform_owner'::user_role, 'platform_admin'::user_role]))))));

DROP POLICY IF EXISTS "Users can view estimates in their organization" ON "public"."estimates";
CREATE POLICY "Users can view estimates in their organization" ON "public"."estimates"
  AS PERMISSIVE
  FOR SELECT
  USING (((organization_id IN ( SELECT profiles.organization_id
   FROM profiles
  WHERE (profiles.id = ( SELECT auth.uid() )))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() )) AND (profiles.role = ANY (ARRAY['platform_owner'::user_role, 'platform_admin'::user_role])))))));

DROP POLICY IF EXISTS "follow_ups_update_own_assignment" ON "public"."follow_ups";
CREATE POLICY "follow_ups_update_own_assignment" ON "public"."follow_ups"
  AS PERMISSIVE
  FOR UPDATE
  USING (((organization_id = get_user_organization_id()) AND (assigned_to = ( SELECT auth.uid() ))))
  WITH CHECK (((organization_id = get_user_organization_id()) AND (assigned_to = ( SELECT auth.uid() ))));

DROP POLICY IF EXISTS "invoice_line_items_delete_write_roles" ON "public"."invoice_line_items";
CREATE POLICY "invoice_line_items_delete_write_roles" ON "public"."invoice_line_items"
  AS PERMISSIVE
  FOR DELETE
  USING (((EXISTS ( SELECT 1
   FROM (invoices i
     JOIN profiles p ON ((p.organization_id = i.organization_id)))
  WHERE ((i.id = invoice_line_items.invoice_id) AND (p.id = ( SELECT auth.uid() ))))) AND (get_user_role() = ANY (ARRAY['platform_owner'::text, 'platform_admin'::text, 'tenant_owner'::text, 'admin'::text, 'estimator'::text]))));

DROP POLICY IF EXISTS "invoice_line_items_insert_write_roles" ON "public"."invoice_line_items";
CREATE POLICY "invoice_line_items_insert_write_roles" ON "public"."invoice_line_items"
  AS PERMISSIVE
  FOR INSERT
  WITH CHECK (((EXISTS ( SELECT 1
   FROM (invoices i
     JOIN profiles p ON ((p.organization_id = i.organization_id)))
  WHERE ((i.id = invoice_line_items.invoice_id) AND (p.id = ( SELECT auth.uid() ))))) AND (get_user_role() = ANY (ARRAY['platform_owner'::text, 'platform_admin'::text, 'tenant_owner'::text, 'admin'::text, 'estimator'::text]))));

DROP POLICY IF EXISTS "invoice_line_items_select_org" ON "public"."invoice_line_items";
CREATE POLICY "invoice_line_items_select_org" ON "public"."invoice_line_items"
  AS PERMISSIVE
  FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM (invoices i
     JOIN profiles p ON ((p.organization_id = i.organization_id)))
  WHERE ((i.id = invoice_line_items.invoice_id) AND (p.id = ( SELECT auth.uid() ))))));

DROP POLICY IF EXISTS "invoice_line_items_update_write_roles" ON "public"."invoice_line_items";
CREATE POLICY "invoice_line_items_update_write_roles" ON "public"."invoice_line_items"
  AS PERMISSIVE
  FOR UPDATE
  USING (((EXISTS ( SELECT 1
   FROM (invoices i
     JOIN profiles p ON ((p.organization_id = i.organization_id)))
  WHERE ((i.id = invoice_line_items.invoice_id) AND (p.id = ( SELECT auth.uid() ))))) AND (get_user_role() = ANY (ARRAY['platform_owner'::text, 'platform_admin'::text, 'tenant_owner'::text, 'admin'::text, 'estimator'::text]))));

DROP POLICY IF EXISTS "Platform owners can access all invoices" ON "public"."invoices";
CREATE POLICY "Platform owners can access all invoices" ON "public"."invoices"
  AS PERMISSIVE
  FOR ALL
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() )) AND (profiles.role = 'platform_owner'::user_role)))));

DROP POLICY IF EXISTS "Users can view invoices in their organization" ON "public"."invoices";
CREATE POLICY "Users can view invoices in their organization" ON "public"."invoices"
  AS PERMISSIVE
  FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() )) AND (p.organization_id = invoices.organization_id)))));

DROP POLICY IF EXISTS "Admins can manage materials in their organization" ON "public"."materials_catalog";
CREATE POLICY "Admins can manage materials in their organization" ON "public"."materials_catalog"
  AS PERMISSIVE
  FOR ALL
  USING ((organization_id IN ( SELECT profiles.organization_id
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() )) AND (profiles.role = ANY (ARRAY['admin'::user_role, 'estimator'::user_role, 'tenant_owner'::user_role]))))));

DROP POLICY IF EXISTS "Users can view materials in their organization" ON "public"."materials_catalog";
CREATE POLICY "Users can view materials in their organization" ON "public"."materials_catalog"
  AS PERMISSIVE
  FOR SELECT
  USING ((organization_id IN ( SELECT profiles.organization_id
   FROM profiles
  WHERE (profiles.id = ( SELECT auth.uid() )))));

DROP POLICY IF EXISTS "Users can manage their notification preferences" ON "public"."notification_preferences";
CREATE POLICY "Users can manage their notification preferences" ON "public"."notification_preferences"
  AS PERMISSIVE
  FOR ALL
  USING ((user_id = ( SELECT auth.uid() )))
  WITH CHECK ((user_id = ( SELECT auth.uid() )));

DROP POLICY IF EXISTS "Users can update their own notifications" ON "public"."notifications";
CREATE POLICY "Users can update their own notifications" ON "public"."notifications"
  AS PERMISSIVE
  FOR UPDATE
  USING ((user_id = ( SELECT auth.uid() )));

DROP POLICY IF EXISTS "Users can view their own notifications" ON "public"."notifications";
CREATE POLICY "Users can view their own notifications" ON "public"."notifications"
  AS PERMISSIVE
  FOR SELECT
  USING ((user_id = ( SELECT auth.uid() )));

DROP POLICY IF EXISTS "Org admins can manage AI settings" ON "public"."organization_ai_settings";
CREATE POLICY "Org admins can manage AI settings" ON "public"."organization_ai_settings"
  AS PERMISSIVE
  FOR ALL
  USING (((organization_id = get_user_organization_id()) AND (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() )) AND (profiles.role = ANY (ARRAY['admin'::user_role, 'tenant_owner'::user_role])))))))
  WITH CHECK (((organization_id = get_user_organization_id()) AND (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() )) AND (profiles.role = ANY (ARRAY['admin'::user_role, 'tenant_owner'::user_role])))))));

DROP POLICY IF EXISTS "Platform users can view all SMS settings" ON "public"."organization_sms_settings";
CREATE POLICY "Platform users can view all SMS settings" ON "public"."organization_sms_settings"
  AS PERMISSIVE
  FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() )) AND (profiles.role = ANY (ARRAY['platform_owner'::user_role, 'platform_admin'::user_role]))))));

DROP POLICY IF EXISTS "Allow organization creation with rate limit" ON "public"."organizations";
CREATE POLICY "Allow organization creation with rate limit" ON "public"."organizations"
  AS PERMISSIVE
  FOR INSERT
  WITH CHECK (((( SELECT auth.uid() ) IS NOT NULL) AND (get_user_organization_id() IS NULL)));

DROP POLICY IF EXISTS "Admins can manage payment methods" ON "public"."payment_methods";
CREATE POLICY "Admins can manage payment methods" ON "public"."payment_methods"
  AS PERMISSIVE
  FOR ALL
  USING (((organization_id = get_user_organization_id()) AND (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() )) AND (profiles.role = ANY (ARRAY['admin'::user_role, 'tenant_owner'::user_role])))))));

DROP POLICY IF EXISTS "Platform owners can access all payments" ON "public"."payments";
CREATE POLICY "Platform owners can access all payments" ON "public"."payments"
  AS PERMISSIVE
  FOR ALL
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() )) AND (profiles.role = 'platform_owner'::user_role)))));

DROP POLICY IF EXISTS "Users can view payments in their organization" ON "public"."payments";
CREATE POLICY "Users can view payments in their organization" ON "public"."payments"
  AS PERMISSIVE
  FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() )) AND (p.organization_id = payments.organization_id)))));

DROP POLICY IF EXISTS "Users can create photos for assessments in their organization" ON "public"."photos";
CREATE POLICY "Users can create photos for assessments in their organization" ON "public"."photos"
  AS PERMISSIVE
  FOR INSERT
  WITH CHECK (((assessment_id IN ( SELECT a.id
   FROM (site_surveys a
     JOIN profiles p ON ((p.organization_id = a.organization_id)))
  WHERE (p.id = ( SELECT auth.uid() )))) AND (get_user_role() = ANY (ARRAY['platform_owner'::text, 'platform_admin'::text, 'tenant_owner'::text, 'admin'::text, 'estimator'::text, 'technician'::text]))));

DROP POLICY IF EXISTS "Users can delete photos for assessments in their organization" ON "public"."photos";
CREATE POLICY "Users can delete photos for assessments in their organization" ON "public"."photos"
  AS PERMISSIVE
  FOR DELETE
  USING (((assessment_id IN ( SELECT a.id
   FROM (site_surveys a
     JOIN profiles p ON ((p.organization_id = a.organization_id)))
  WHERE (p.id = ( SELECT auth.uid() )))) AND (get_user_role() = ANY (ARRAY['platform_owner'::text, 'platform_admin'::text, 'tenant_owner'::text, 'admin'::text, 'estimator'::text, 'technician'::text]))));

DROP POLICY IF EXISTS "Users can update photos for assessments in their organization" ON "public"."photos";
CREATE POLICY "Users can update photos for assessments in their organization" ON "public"."photos"
  AS PERMISSIVE
  FOR UPDATE
  USING (((assessment_id IN ( SELECT a.id
   FROM (site_surveys a
     JOIN profiles p ON ((p.organization_id = a.organization_id)))
  WHERE (p.id = ( SELECT auth.uid() )))) AND (get_user_role() = ANY (ARRAY['platform_owner'::text, 'platform_admin'::text, 'tenant_owner'::text, 'admin'::text, 'estimator'::text, 'technician'::text]))));

DROP POLICY IF EXISTS "Users can view photos for assessments in their organization" ON "public"."photos";
CREATE POLICY "Users can view photos for assessments in their organization" ON "public"."photos"
  AS PERMISSIVE
  FOR SELECT
  USING ((assessment_id IN ( SELECT a.id
   FROM (site_surveys a
     JOIN profiles p ON ((p.organization_id = a.organization_id)))
  WHERE (p.id = ( SELECT auth.uid() )))));

DROP POLICY IF EXISTS "Platform owners can manage platform settings" ON "public"."platform_settings";
CREATE POLICY "Platform owners can manage platform settings" ON "public"."platform_settings"
  AS PERMISSIVE
  FOR ALL
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() )) AND (profiles.role = ANY (ARRAY['platform_owner'::user_role, 'platform_admin'::user_role]))))));

DROP POLICY IF EXISTS "profile_own_insert" ON "public"."profiles";
CREATE POLICY "profile_own_insert" ON "public"."profiles"
  AS PERMISSIVE
  FOR INSERT
  WITH CHECK ((id = ( SELECT auth.uid() )));

DROP POLICY IF EXISTS "profiles_select" ON "public"."profiles";
CREATE POLICY "profiles_select" ON "public"."profiles"
  AS PERMISSIVE
  FOR SELECT
  USING (((id = ( SELECT auth.uid() )) OR (organization_id = get_user_organization_id()) OR (get_user_role() = ANY (ARRAY['platform_owner'::text, 'platform_admin'::text]))));

DROP POLICY IF EXISTS "profiles_update_own" ON "public"."profiles";
CREATE POLICY "profiles_update_own" ON "public"."profiles"
  AS PERMISSIVE
  FOR UPDATE
  USING ((id = ( SELECT auth.uid() )))
  WITH CHECK ((id = ( SELECT auth.uid() )));

DROP POLICY IF EXISTS "Users can view proposals in their organization" ON "public"."proposals";
CREATE POLICY "Users can view proposals in their organization" ON "public"."proposals"
  AS PERMISSIVE
  FOR SELECT
  USING (((organization_id IN ( SELECT profiles.organization_id
   FROM profiles
  WHERE (profiles.id = ( SELECT auth.uid() )))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() )) AND (profiles.role = ANY (ARRAY['platform_owner'::user_role, 'platform_admin'::user_role])))))));

DROP POLICY IF EXISTS "proposals_delete_write_roles" ON "public"."proposals";
CREATE POLICY "proposals_delete_write_roles" ON "public"."proposals"
  AS PERMISSIVE
  FOR DELETE
  USING (((organization_id IN ( SELECT profiles.organization_id
   FROM profiles
  WHERE (profiles.id = ( SELECT auth.uid() )))) AND (get_user_role() = ANY (ARRAY['platform_owner'::text, 'platform_admin'::text, 'tenant_owner'::text, 'admin'::text, 'estimator'::text]))));

DROP POLICY IF EXISTS "proposals_insert_write_roles" ON "public"."proposals";
CREATE POLICY "proposals_insert_write_roles" ON "public"."proposals"
  AS PERMISSIVE
  FOR INSERT
  WITH CHECK (((organization_id IN ( SELECT profiles.organization_id
   FROM profiles
  WHERE (profiles.id = ( SELECT auth.uid() )))) AND (get_user_role() = ANY (ARRAY['platform_owner'::text, 'platform_admin'::text, 'tenant_owner'::text, 'admin'::text, 'estimator'::text]))));

DROP POLICY IF EXISTS "proposals_update_write_roles" ON "public"."proposals";
CREATE POLICY "proposals_update_write_roles" ON "public"."proposals"
  AS PERMISSIVE
  FOR UPDATE
  USING (((organization_id IN ( SELECT profiles.organization_id
   FROM profiles
  WHERE (profiles.id = ( SELECT auth.uid() )))) AND (get_user_role() = ANY (ARRAY['platform_owner'::text, 'platform_admin'::text, 'tenant_owner'::text, 'admin'::text, 'estimator'::text]))));

DROP POLICY IF EXISTS "Users can manage their push subscriptions" ON "public"."push_subscriptions";
CREATE POLICY "Users can manage their push subscriptions" ON "public"."push_subscriptions"
  AS PERMISSIVE
  FOR ALL
  USING ((user_id = ( SELECT auth.uid() )))
  WITH CHECK ((user_id = ( SELECT auth.uid() )));

DROP POLICY IF EXISTS "Users can manage own reports" ON "public"."saved_reports";
CREATE POLICY "Users can manage own reports" ON "public"."saved_reports"
  AS PERMISSIVE
  FOR ALL
  USING (((organization_id = get_user_organization_id()) AND (created_by = ( SELECT auth.uid() ))));

DROP POLICY IF EXISTS "Users can view own and shared reports" ON "public"."saved_reports";
CREATE POLICY "Users can view own and shared reports" ON "public"."saved_reports"
  AS PERMISSIVE
  FOR SELECT
  USING (((organization_id = get_user_organization_id()) AND ((created_by = ( SELECT auth.uid() )) OR (is_shared = true))));

DROP POLICY IF EXISTS "Platform owners can access all site survey photos" ON "public"."site_survey_photos";
CREATE POLICY "Platform owners can access all site survey photos" ON "public"."site_survey_photos"
  AS PERMISSIVE
  FOR ALL
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() )) AND (profiles.role = 'platform_owner'::user_role)))));

DROP POLICY IF EXISTS "Platform owners can access all site surveys" ON "public"."site_surveys";
CREATE POLICY "Platform owners can access all site surveys" ON "public"."site_surveys"
  AS PERMISSIVE
  FOR ALL
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() )) AND (profiles.role = 'platform_owner'::user_role)))));

DROP POLICY IF EXISTS "Platform users can view all SMS messages" ON "public"."sms_messages";
CREATE POLICY "Platform users can view all SMS messages" ON "public"."sms_messages"
  AS PERMISSIVE
  FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() )) AND (profiles.role = ANY (ARRAY['platform_owner'::user_role, 'platform_admin'::user_role]))))));

DROP POLICY IF EXISTS "Platform owners can view stripe webhook events" ON "public"."stripe_webhook_events";
CREATE POLICY "Platform owners can view stripe webhook events" ON "public"."stripe_webhook_events"
  AS PERMISSIVE
  FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() )) AND (profiles.role = ANY (ARRAY['platform_owner'::user_role, 'platform_admin'::user_role]))))));

DROP POLICY IF EXISTS "Platform admins can manage plans" ON "public"."subscription_plans";
CREATE POLICY "Platform admins can manage plans" ON "public"."subscription_plans"
  AS PERMISSIVE
  FOR ALL
  USING ((EXISTS ( SELECT 1
   FROM (organizations o
     JOIN profiles p ON ((p.organization_id = o.id)))
  WHERE ((p.id = ( SELECT auth.uid() )) AND (o.is_platform_admin = true)))));

DROP POLICY IF EXISTS "survey_photos: tenant admins delete" ON "public"."survey_photos";
CREATE POLICY "survey_photos: tenant admins delete" ON "public"."survey_photos"
  AS PERMISSIVE
  FOR DELETE
  USING (((organization_id = get_user_organization_id()) AND (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() )) AND (profiles.role = ANY (ARRAY['tenant_owner'::user_role, 'admin'::user_role, 'platform_owner'::user_role, 'platform_admin'::user_role])))))));

DROP POLICY IF EXISTS "Platform users can view all invitations" ON "public"."tenant_invitations";
CREATE POLICY "Platform users can view all invitations" ON "public"."tenant_invitations"
  AS PERMISSIVE
  FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() )) AND (profiles.role = ANY (ARRAY['platform_owner'::user_role, 'platform_admin'::user_role]))))));

DROP POLICY IF EXISTS "Users can manage invitations for their organization" ON "public"."tenant_invitations";
CREATE POLICY "Users can manage invitations for their organization" ON "public"."tenant_invitations"
  AS PERMISSIVE
  FOR ALL
  USING ((organization_id IN ( SELECT profiles.organization_id
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() )) AND (profiles.role = ANY (ARRAY['admin'::user_role, 'tenant_owner'::user_role]))))));

DROP POLICY IF EXISTS "Platform users can view all tenant usage" ON "public"."tenant_usage";
CREATE POLICY "Platform users can view all tenant usage" ON "public"."tenant_usage"
  AS PERMISSIVE
  FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() )) AND (profiles.role = ANY (ARRAY['platform_owner'::user_role, 'platform_admin'::user_role]))))));

DROP POLICY IF EXISTS "Users can view their organization's usage" ON "public"."tenant_usage";
CREATE POLICY "Users can view their organization's usage" ON "public"."tenant_usage"
  AS PERMISSIVE
  FOR SELECT
  USING ((organization_id IN ( SELECT profiles.organization_id
   FROM profiles
  WHERE (profiles.id = ( SELECT auth.uid() )))));

DROP POLICY IF EXISTS "time_clock_entries_insert_own" ON "public"."time_clock_entries";
CREATE POLICY "time_clock_entries_insert_own" ON "public"."time_clock_entries"
  AS PERMISSIVE
  FOR INSERT
  WITH CHECK (((organization_id = get_user_organization_id()) AND (profile_id = ( SELECT auth.uid() ))));

DROP POLICY IF EXISTS "time_clock_entries_update_self" ON "public"."time_clock_entries";
CREATE POLICY "time_clock_entries_update_self" ON "public"."time_clock_entries"
  AS PERMISSIVE
  FOR UPDATE
  USING (((organization_id = get_user_organization_id()) AND (profile_id = ( SELECT auth.uid() ))))
  WITH CHECK (((organization_id = get_user_organization_id()) AND (profile_id = ( SELECT auth.uid() )) AND (status = ANY (ARRAY['open'::text, 'submitted'::text]))));

