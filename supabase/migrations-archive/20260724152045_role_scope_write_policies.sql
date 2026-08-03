-- ============================================================================
-- Pattern B (audit): role-scope RLS write policies across the tables that
-- currently gate ONLY on organization_id. Any authenticated org member —
-- including viewer — can write to these tables directly via PostgREST with
-- the public anon key, because "allowedRoles" is enforced in the Next.js API
-- layer, not the database, and these policies never checked get_user_role().
--
-- Approach: for every policy touched, this migration takes the table's
-- EXISTING qual/with_check expression verbatim (preserving whatever join
-- logic already scopes org membership — several of these go through a job_id
-- / invoice_id / segment_id subquery rather than a direct organization_id
-- column) and ANDs a role check onto it. Nothing about the org-scoping logic
-- itself changes.
--
-- Where a table previously had a single FOR ALL policy covering SELECT too,
-- that policy is split: a new SELECT policy is created with the OLD qual and
-- NO role check (read access is unchanged — every org member can still read),
-- and separate INSERT/UPDATE/DELETE policies are created with the role check
-- added. Getting this split wrong would silently break read access for
-- viewer/technician on their own org's data, so every ALL-only table in this
-- migration was checked against pg_policies first to confirm no other SELECT
-- policy already existed for it.
--
-- Role tiers (mirrors lib/auth/roles.ts ROLES presets):
--   TENANT_ADMIN = platform_owner, platform_admin, tenant_owner, admin
--   TENANT_WRITE = TENANT_ADMIN + estimator
--   TENANT_FIELD = TENANT_WRITE + technician
-- ============================================================================


-- ----------------------------------------------------------------------------
-- TENANT_ADMIN tier: secrets (P1-9/P1-10) + org structure/config.
-- No estimator/technician — these are account-owner/admin configuration, not
-- day-to-day content.
-- ----------------------------------------------------------------------------

-- organization_integrations (OAuth tokens — encrypted at rest as of the prior
-- migration in this series, but read/write should also be admin-only).
DROP POLICY IF EXISTS "Users can manage their org integrations" ON organization_integrations;

CREATE POLICY "organization_integrations_select_org" ON organization_integrations
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "organization_integrations_insert_admin" ON organization_integrations
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin']));

CREATE POLICY "organization_integrations_update_admin" ON organization_integrations
  FOR UPDATE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin']))
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin']));

CREATE POLICY "organization_integrations_delete_admin" ON organization_integrations
  FOR DELETE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin']));


-- organization_sms_settings (Twilio credentials). Existing "Platform users can
-- view all SMS settings" SELECT policy is platform-staff-only (is_platform_user
-- style role check), so a new org-scoped SELECT is required or regular org
-- members lose read access entirely once the ALL policy is split.
DROP POLICY IF EXISTS "Users can manage their org SMS settings" ON organization_sms_settings;

CREATE POLICY "organization_sms_settings_select_org" ON organization_sms_settings
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "organization_sms_settings_insert_admin" ON organization_sms_settings
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin']));

CREATE POLICY "organization_sms_settings_update_admin" ON organization_sms_settings
  FOR UPDATE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin']))
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin']));

CREATE POLICY "organization_sms_settings_delete_admin" ON organization_sms_settings
  FOR DELETE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin']));


-- webhooks (outbound HMAC signing secret).
DROP POLICY IF EXISTS "Users can manage their org webhooks" ON webhooks;

CREATE POLICY "webhooks_select_org" ON webhooks
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "webhooks_insert_admin" ON webhooks
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin']));

CREATE POLICY "webhooks_update_admin" ON webhooks
  FOR UPDATE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin']))
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin']));

CREATE POLICY "webhooks_delete_admin" ON webhooks
  FOR DELETE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin']));


-- lead_webhook_endpoints (inbound api_key + HMAC secret).
DROP POLICY IF EXISTS "Users can manage their org lead endpoints" ON lead_webhook_endpoints;

CREATE POLICY "lead_webhook_endpoints_select_org" ON lead_webhook_endpoints
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "lead_webhook_endpoints_insert_admin" ON lead_webhook_endpoints
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin']));

CREATE POLICY "lead_webhook_endpoints_update_admin" ON lead_webhook_endpoints
  FOR UPDATE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin']))
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin']));

CREATE POLICY "lead_webhook_endpoints_delete_admin" ON lead_webhook_endpoints
  FOR DELETE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin']));


-- locations (org structure).
DROP POLICY IF EXISTS "Users can manage their org locations" ON locations;

CREATE POLICY "locations_select_org" ON locations
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "locations_insert_admin" ON locations
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin']));

CREATE POLICY "locations_update_admin" ON locations
  FOR UPDATE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin']))
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin']));

CREATE POLICY "locations_delete_admin" ON locations
  FOR DELETE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin']));


-- location_users (org structure; qual routes through locations.organization_id).
DROP POLICY IF EXISTS "Users can manage location user assignments for their org" ON location_users;

CREATE POLICY "location_users_select_org" ON location_users
  FOR SELECT
  USING (location_id IN (SELECT locations.id FROM locations WHERE locations.organization_id = get_user_organization_id()));

CREATE POLICY "location_users_insert_admin" ON location_users
  FOR INSERT
  WITH CHECK (location_id IN (SELECT locations.id FROM locations WHERE locations.organization_id = get_user_organization_id())
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin']));

CREATE POLICY "location_users_update_admin" ON location_users
  FOR UPDATE
  USING (location_id IN (SELECT locations.id FROM locations WHERE locations.organization_id = get_user_organization_id())
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin']))
  WITH CHECK (location_id IN (SELECT locations.id FROM locations WHERE locations.organization_id = get_user_organization_id())
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin']));

CREATE POLICY "location_users_delete_admin" ON location_users
  FOR DELETE
  USING (location_id IN (SELECT locations.id FROM locations WHERE locations.organization_id = get_user_organization_id())
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin']));


-- custom_domains (org structure).
DROP POLICY IF EXISTS "Users can manage their org custom domains" ON custom_domains;

CREATE POLICY "custom_domains_select_org" ON custom_domains
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "custom_domains_insert_admin" ON custom_domains
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin']));

CREATE POLICY "custom_domains_update_admin" ON custom_domains
  FOR UPDATE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin']))
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin']));

CREATE POLICY "custom_domains_delete_admin" ON custom_domains
  FOR DELETE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin']));


-- calendar_sync_events (Google/Outlook sync bookkeeping — server/admin only).
DROP POLICY IF EXISTS "Users can manage their org calendar events" ON calendar_sync_events;

CREATE POLICY "calendar_sync_events_select_org" ON calendar_sync_events
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "calendar_sync_events_insert_admin" ON calendar_sync_events
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin']));

CREATE POLICY "calendar_sync_events_update_admin" ON calendar_sync_events
  FOR UPDATE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin']))
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin']));

CREATE POLICY "calendar_sync_events_delete_admin" ON calendar_sync_events
  FOR DELETE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin']));


-- commission_plans (compensation structure).
DROP POLICY IF EXISTS "Org access commission_plans" ON commission_plans;

CREATE POLICY "commission_plans_select_org" ON commission_plans
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "commission_plans_insert_admin" ON commission_plans
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin']));

CREATE POLICY "commission_plans_update_admin" ON commission_plans
  FOR UPDATE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin']))
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin']));

CREATE POLICY "commission_plans_delete_admin" ON commission_plans
  FOR DELETE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin']));


-- ----------------------------------------------------------------------------
-- TENANT_WRITE tier: CRM content, documents, marketing/segments, money.
-- Viewer excluded; estimator and above can create/edit.
-- ----------------------------------------------------------------------------

-- customer_contacts: already split into SELECT/INSERT/UPDATE/DELETE — just add
-- the role check to the three write policies, same names.
DROP POLICY IF EXISTS "Users can insert contacts in their organization" ON customer_contacts;
CREATE POLICY "Users can insert contacts in their organization" ON customer_contacts
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));

DROP POLICY IF EXISTS "Users can update contacts in their organization" ON customer_contacts;
CREATE POLICY "Users can update contacts in their organization" ON customer_contacts
  FOR UPDATE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));

DROP POLICY IF EXISTS "Users can delete contacts in their organization" ON customer_contacts;
CREATE POLICY "Users can delete contacts in their organization" ON customer_contacts
  FOR DELETE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));


-- properties
DROP POLICY IF EXISTS "Org access properties" ON properties;

CREATE POLICY "properties_select_org" ON properties
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "properties_insert_write_roles" ON properties
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));

CREATE POLICY "properties_update_write_roles" ON properties
  FOR UPDATE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']))
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));

CREATE POLICY "properties_delete_write_roles" ON properties
  FOR DELETE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));


-- property_contacts
DROP POLICY IF EXISTS "Org access property_contacts" ON property_contacts;

CREATE POLICY "property_contacts_select_org" ON property_contacts
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "property_contacts_insert_write_roles" ON property_contacts
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));

CREATE POLICY "property_contacts_update_write_roles" ON property_contacts
  FOR UPDATE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']))
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));

CREATE POLICY "property_contacts_delete_write_roles" ON property_contacts
  FOR DELETE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));


-- organization_documents
DROP POLICY IF EXISTS "Org access organization_documents" ON organization_documents;

CREATE POLICY "organization_documents_select_org" ON organization_documents
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "organization_documents_insert_write_roles" ON organization_documents
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));

CREATE POLICY "organization_documents_update_write_roles" ON organization_documents
  FOR UPDATE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']))
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));

CREATE POLICY "organization_documents_delete_write_roles" ON organization_documents
  FOR DELETE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));


-- organization_document_shares
DROP POLICY IF EXISTS "Org access organization_document_shares" ON organization_document_shares;

CREATE POLICY "organization_document_shares_select_org" ON organization_document_shares
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "organization_document_shares_insert_write_roles" ON organization_document_shares
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));

CREATE POLICY "organization_document_shares_update_write_roles" ON organization_document_shares
  FOR UPDATE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']))
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));

CREATE POLICY "organization_document_shares_delete_write_roles" ON organization_document_shares
  FOR DELETE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));


-- work_order_documents
DROP POLICY IF EXISTS "Org access work_order_documents" ON work_order_documents;

CREATE POLICY "work_order_documents_select_org" ON work_order_documents
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "work_order_documents_insert_write_roles" ON work_order_documents
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));

CREATE POLICY "work_order_documents_update_write_roles" ON work_order_documents
  FOR UPDATE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']))
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));

CREATE POLICY "work_order_documents_delete_write_roles" ON work_order_documents
  FOR DELETE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));


-- invoice_attached_documents
DROP POLICY IF EXISTS "Org access invoice_attached_documents" ON invoice_attached_documents;

CREATE POLICY "invoice_attached_documents_select_org" ON invoice_attached_documents
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "invoice_attached_documents_insert_write_roles" ON invoice_attached_documents
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));

CREATE POLICY "invoice_attached_documents_update_write_roles" ON invoice_attached_documents
  FOR UPDATE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']))
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));

CREATE POLICY "invoice_attached_documents_delete_write_roles" ON invoice_attached_documents
  FOR DELETE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));


-- estimate_attached_documents
DROP POLICY IF EXISTS "Org access estimate_attached_documents" ON estimate_attached_documents;

CREATE POLICY "estimate_attached_documents_select_org" ON estimate_attached_documents
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "estimate_attached_documents_insert_write_roles" ON estimate_attached_documents
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));

CREATE POLICY "estimate_attached_documents_update_write_roles" ON estimate_attached_documents
  FOR UPDATE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']))
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));

CREATE POLICY "estimate_attached_documents_delete_write_roles" ON estimate_attached_documents
  FOR DELETE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));


-- opportunity_history (qual routes through opportunities.organization_id)
DROP POLICY IF EXISTS "Org access opportunity_history" ON opportunity_history;

CREATE POLICY "opportunity_history_select_org" ON opportunity_history
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM opportunities o WHERE o.id = opportunity_history.opportunity_id AND o.organization_id = get_user_organization_id()));

CREATE POLICY "opportunity_history_insert_write_roles" ON opportunity_history
  FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM opportunities o WHERE o.id = opportunity_history.opportunity_id AND o.organization_id = get_user_organization_id())
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));

CREATE POLICY "opportunity_history_update_write_roles" ON opportunity_history
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM opportunities o WHERE o.id = opportunity_history.opportunity_id AND o.organization_id = get_user_organization_id())
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));

CREATE POLICY "opportunity_history_delete_write_roles" ON opportunity_history
  FOR DELETE
  USING (EXISTS (SELECT 1 FROM opportunities o WHERE o.id = opportunity_history.opportunity_id AND o.organization_id = get_user_organization_id())
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));


-- follow_ups
DROP POLICY IF EXISTS "Org access follow_ups" ON follow_ups;

CREATE POLICY "follow_ups_select_org" ON follow_ups
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "follow_ups_insert_write_roles" ON follow_ups
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));

CREATE POLICY "follow_ups_update_write_roles" ON follow_ups
  FOR UPDATE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']))
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));

CREATE POLICY "follow_ups_delete_write_roles" ON follow_ups
  FOR DELETE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));


-- attribution_touchpoints (mostly trigger-populated; gate direct writes anyway)
DROP POLICY IF EXISTS "Org access attribution_touchpoints" ON attribution_touchpoints;

CREATE POLICY "attribution_touchpoints_select_org" ON attribution_touchpoints
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "attribution_touchpoints_insert_write_roles" ON attribution_touchpoints
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));

CREATE POLICY "attribution_touchpoints_update_write_roles" ON attribution_touchpoints
  FOR UPDATE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));

CREATE POLICY "attribution_touchpoints_delete_write_roles" ON attribution_touchpoints
  FOR DELETE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));


-- customer_segments
DROP POLICY IF EXISTS "Users can manage their org segments" ON customer_segments;

CREATE POLICY "customer_segments_select_org" ON customer_segments
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "customer_segments_insert_write_roles" ON customer_segments
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));

CREATE POLICY "customer_segments_update_write_roles" ON customer_segments
  FOR UPDATE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']))
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));

CREATE POLICY "customer_segments_delete_write_roles" ON customer_segments
  FOR DELETE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));


-- segment_members (qual routes through customer_segments.organization_id)
DROP POLICY IF EXISTS "Users can manage segment members for their org" ON segment_members;

CREATE POLICY "segment_members_select_org" ON segment_members
  FOR SELECT
  USING (segment_id IN (SELECT customer_segments.id FROM customer_segments WHERE customer_segments.organization_id = get_user_organization_id()));

CREATE POLICY "segment_members_insert_write_roles" ON segment_members
  FOR INSERT
  WITH CHECK (segment_id IN (SELECT customer_segments.id FROM customer_segments WHERE customer_segments.organization_id = get_user_organization_id())
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));

CREATE POLICY "segment_members_update_write_roles" ON segment_members
  FOR UPDATE
  USING (segment_id IN (SELECT customer_segments.id FROM customer_segments WHERE customer_segments.organization_id = get_user_organization_id())
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']))
  WITH CHECK (segment_id IN (SELECT customer_segments.id FROM customer_segments WHERE customer_segments.organization_id = get_user_organization_id())
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));

CREATE POLICY "segment_members_delete_write_roles" ON segment_members
  FOR DELETE
  USING (segment_id IN (SELECT customer_segments.id FROM customer_segments WHERE customer_segments.organization_id = get_user_organization_id())
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));


-- feedback_surveys
DROP POLICY IF EXISTS "Users can manage their org feedback surveys" ON feedback_surveys;

CREATE POLICY "feedback_surveys_select_org" ON feedback_surveys
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "feedback_surveys_insert_write_roles" ON feedback_surveys
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));

CREATE POLICY "feedback_surveys_update_write_roles" ON feedback_surveys
  FOR UPDATE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']))
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));

CREATE POLICY "feedback_surveys_delete_write_roles" ON feedback_surveys
  FOR DELETE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));


-- review_requests
DROP POLICY IF EXISTS "Users can manage their org review requests" ON review_requests;

CREATE POLICY "review_requests_select_org" ON review_requests
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "review_requests_insert_write_roles" ON review_requests
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));

CREATE POLICY "review_requests_update_write_roles" ON review_requests
  FOR UPDATE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']))
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));

CREATE POLICY "review_requests_delete_write_roles" ON review_requests
  FOR DELETE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));


-- sms_messages: existing "Platform users can view all SMS messages" SELECT is
-- platform-staff-only, so a new org-scoped SELECT is required.
DROP POLICY IF EXISTS "Users can manage their org SMS messages" ON sms_messages;

CREATE POLICY "sms_messages_select_org" ON sms_messages
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "sms_messages_insert_write_roles" ON sms_messages
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));

CREATE POLICY "sms_messages_update_write_roles" ON sms_messages
  FOR UPDATE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']))
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));

CREATE POLICY "sms_messages_delete_write_roles" ON sms_messages
  FOR DELETE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));


-- sms_templates: already split (SELECT covers system+org templates already;
-- leave it). Add role check to the three write policies, same names.
DROP POLICY IF EXISTS "Users can manage their org SMS templates" ON sms_templates;
CREATE POLICY "Users can manage their org SMS templates" ON sms_templates
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));

DROP POLICY IF EXISTS "Users can update their org SMS templates" ON sms_templates;
CREATE POLICY "Users can update their org SMS templates" ON sms_templates
  FOR UPDATE
  USING (organization_id = get_user_organization_id() AND is_system = false
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']))
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));

DROP POLICY IF EXISTS "Users can delete their org SMS templates" ON sms_templates;
CREATE POLICY "Users can delete their org SMS templates" ON sms_templates
  FOR DELETE
  USING (organization_id = get_user_organization_id() AND is_system = false
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));


-- voice_transcriptions
DROP POLICY IF EXISTS "Users can manage their org voice transcriptions" ON voice_transcriptions;

CREATE POLICY "voice_transcriptions_select_org" ON voice_transcriptions
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "voice_transcriptions_insert_write_roles" ON voice_transcriptions
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));

CREATE POLICY "voice_transcriptions_update_write_roles" ON voice_transcriptions
  FOR UPDATE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']))
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));

CREATE POLICY "voice_transcriptions_delete_write_roles" ON voice_transcriptions
  FOR DELETE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));


-- invoice_line_items (qual joins invoices+profiles rather than a direct
-- organization_id column; append role check onto that same join).
DROP POLICY IF EXISTS "Users can manage invoice line items" ON invoice_line_items;

CREATE POLICY "invoice_line_items_select_org" ON invoice_line_items
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM invoices i JOIN profiles p ON p.organization_id = i.organization_id
    WHERE i.id = invoice_line_items.invoice_id AND p.id = auth.uid()));

CREATE POLICY "invoice_line_items_insert_write_roles" ON invoice_line_items
  FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM invoices i JOIN profiles p ON p.organization_id = i.organization_id
    WHERE i.id = invoice_line_items.invoice_id AND p.id = auth.uid())
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));

CREATE POLICY "invoice_line_items_update_write_roles" ON invoice_line_items
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM invoices i JOIN profiles p ON p.organization_id = i.organization_id
    WHERE i.id = invoice_line_items.invoice_id AND p.id = auth.uid())
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));

CREATE POLICY "invoice_line_items_delete_write_roles" ON invoice_line_items
  FOR DELETE
  USING (EXISTS (SELECT 1 FROM invoices i JOIN profiles p ON p.organization_id = i.organization_id
    WHERE i.id = invoice_line_items.invoice_id AND p.id = auth.uid())
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));


-- labs
DROP POLICY IF EXISTS "Org access labs" ON labs;

CREATE POLICY "labs_select_org" ON labs
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "labs_insert_write_roles" ON labs
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));

CREATE POLICY "labs_update_write_roles" ON labs
  FOR UPDATE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']))
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));

CREATE POLICY "labs_delete_write_roles" ON labs
  FOR DELETE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));


-- lab_reports
DROP POLICY IF EXISTS "Org access lab_reports" ON lab_reports;

CREATE POLICY "lab_reports_select_org" ON lab_reports
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "lab_reports_insert_write_roles" ON lab_reports
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));

CREATE POLICY "lab_reports_update_write_roles" ON lab_reports
  FOR UPDATE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']))
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));

CREATE POLICY "lab_reports_delete_write_roles" ON lab_reports
  FOR DELETE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));


-- proposals: keep the existing SELECT policy (already correct, includes
-- platform-staff cross-org read) untouched. Replace the ALL policy — which
-- was the only thing gating writes — with role-gated write policies using
-- its exact existing qual.
DROP POLICY IF EXISTS "Users can manage proposals in their organization" ON proposals;

CREATE POLICY "proposals_insert_write_roles" ON proposals
  FOR INSERT
  WITH CHECK (organization_id IN (SELECT profiles.organization_id FROM profiles WHERE profiles.id = auth.uid())
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));

CREATE POLICY "proposals_update_write_roles" ON proposals
  FOR UPDATE
  USING (organization_id IN (SELECT profiles.organization_id FROM profiles WHERE profiles.id = auth.uid())
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));

CREATE POLICY "proposals_delete_write_roles" ON proposals
  FOR DELETE
  USING (organization_id IN (SELECT profiles.organization_id FROM profiles WHERE profiles.id = auth.uid())
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));


-- industry_events: already split (SELECT untouched). Add role check to the
-- three write policies, same names.
DROP POLICY IF EXISTS "industry_events_insert" ON industry_events;
CREATE POLICY "industry_events_insert" ON industry_events
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));

DROP POLICY IF EXISTS "industry_events_update" ON industry_events;
CREATE POLICY "industry_events_update" ON industry_events
  FOR UPDATE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));

DROP POLICY IF EXISTS "industry_events_delete" ON industry_events;
CREATE POLICY "industry_events_delete" ON industry_events
  FOR DELETE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));


-- work_orders
DROP POLICY IF EXISTS "Users can manage their org work orders" ON work_orders;

CREATE POLICY "work_orders_select_org" ON work_orders
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "work_orders_insert_write_roles" ON work_orders
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));

CREATE POLICY "work_orders_update_write_roles" ON work_orders
  FOR UPDATE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']))
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));

CREATE POLICY "work_orders_delete_write_roles" ON work_orders
  FOR DELETE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));


-- work_order_vehicles (qual routes through work_orders.organization_id)
DROP POLICY IF EXISTS "Users can manage work order vehicles for their org" ON work_order_vehicles;

CREATE POLICY "work_order_vehicles_select_org" ON work_order_vehicles
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM work_orders WHERE work_orders.id = work_order_vehicles.work_order_id AND work_orders.organization_id = get_user_organization_id()));

CREATE POLICY "work_order_vehicles_insert_write_roles" ON work_order_vehicles
  FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM work_orders WHERE work_orders.id = work_order_vehicles.work_order_id AND work_orders.organization_id = get_user_organization_id())
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));

CREATE POLICY "work_order_vehicles_update_write_roles" ON work_order_vehicles
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM work_orders WHERE work_orders.id = work_order_vehicles.work_order_id AND work_orders.organization_id = get_user_organization_id())
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));

CREATE POLICY "work_order_vehicles_delete_write_roles" ON work_order_vehicles
  FOR DELETE
  USING (EXISTS (SELECT 1 FROM work_orders WHERE work_orders.id = work_order_vehicles.work_order_id AND work_orders.organization_id = get_user_organization_id())
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));


-- estimate_suggestions (AI suggestions during estimate building — estimator tier)
DROP POLICY IF EXISTS "Users can manage their org estimate suggestions" ON estimate_suggestions;

CREATE POLICY "estimate_suggestions_select_org" ON estimate_suggestions
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "estimate_suggestions_insert_write_roles" ON estimate_suggestions
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));

CREATE POLICY "estimate_suggestions_update_write_roles" ON estimate_suggestions
  FOR UPDATE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']))
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));

CREATE POLICY "estimate_suggestions_delete_write_roles" ON estimate_suggestions
  FOR DELETE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator']));


-- ----------------------------------------------------------------------------
-- TENANT_FIELD tier: job execution & field-captured data. Technicians
-- legitimately write these day-to-day (time entries, checklists, completion
-- photos, crew/materials/disposal logs) — only viewer is excluded.
-- ----------------------------------------------------------------------------

-- All eleven job-child tables share the identical qual shape:
--   EXISTS (SELECT 1 FROM jobs WHERE jobs.id = <table>.job_id AND jobs.organization_id = get_user_organization_id())

DROP POLICY IF EXISTS "Users can manage job change orders for their org jobs" ON job_change_orders;
CREATE POLICY "job_change_orders_select_org" ON job_change_orders FOR SELECT
  USING (EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_change_orders.job_id AND jobs.organization_id = get_user_organization_id()));
CREATE POLICY "job_change_orders_insert_field_roles" ON job_change_orders FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_change_orders.job_id AND jobs.organization_id = get_user_organization_id())
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator','technician']));
CREATE POLICY "job_change_orders_update_field_roles" ON job_change_orders FOR UPDATE
  USING (EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_change_orders.job_id AND jobs.organization_id = get_user_organization_id())
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator','technician']));
CREATE POLICY "job_change_orders_delete_field_roles" ON job_change_orders FOR DELETE
  USING (EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_change_orders.job_id AND jobs.organization_id = get_user_organization_id())
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator','technician']));

DROP POLICY IF EXISTS "Users can manage checklists for their org jobs" ON job_completion_checklists;
CREATE POLICY "job_completion_checklists_select_org" ON job_completion_checklists FOR SELECT
  USING (EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_completion_checklists.job_id AND jobs.organization_id = get_user_organization_id()));
CREATE POLICY "job_completion_checklists_insert_field_roles" ON job_completion_checklists FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_completion_checklists.job_id AND jobs.organization_id = get_user_organization_id())
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator','technician']));
CREATE POLICY "job_completion_checklists_update_field_roles" ON job_completion_checklists FOR UPDATE
  USING (EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_completion_checklists.job_id AND jobs.organization_id = get_user_organization_id())
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator','technician']));
CREATE POLICY "job_completion_checklists_delete_field_roles" ON job_completion_checklists FOR DELETE
  USING (EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_completion_checklists.job_id AND jobs.organization_id = get_user_organization_id())
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator','technician']));

DROP POLICY IF EXISTS "Users can manage completion photos for their org jobs" ON job_completion_photos;
CREATE POLICY "job_completion_photos_select_org" ON job_completion_photos FOR SELECT
  USING (EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_completion_photos.job_id AND jobs.organization_id = get_user_organization_id()));
CREATE POLICY "job_completion_photos_insert_field_roles" ON job_completion_photos FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_completion_photos.job_id AND jobs.organization_id = get_user_organization_id())
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator','technician']));
CREATE POLICY "job_completion_photos_update_field_roles" ON job_completion_photos FOR UPDATE
  USING (EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_completion_photos.job_id AND jobs.organization_id = get_user_organization_id())
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator','technician']));
CREATE POLICY "job_completion_photos_delete_field_roles" ON job_completion_photos FOR DELETE
  USING (EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_completion_photos.job_id AND jobs.organization_id = get_user_organization_id())
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator','technician']));

DROP POLICY IF EXISTS "Users can manage completions for their org jobs" ON job_completions;
CREATE POLICY "job_completions_select_org" ON job_completions FOR SELECT
  USING (EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_completions.job_id AND jobs.organization_id = get_user_organization_id()));
CREATE POLICY "job_completions_insert_field_roles" ON job_completions FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_completions.job_id AND jobs.organization_id = get_user_organization_id())
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator','technician']));
CREATE POLICY "job_completions_update_field_roles" ON job_completions FOR UPDATE
  USING (EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_completions.job_id AND jobs.organization_id = get_user_organization_id())
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator','technician']));
CREATE POLICY "job_completions_delete_field_roles" ON job_completions FOR DELETE
  USING (EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_completions.job_id AND jobs.organization_id = get_user_organization_id())
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator','technician']));

DROP POLICY IF EXISTS "Users can manage job crew for their org jobs" ON job_crew;
CREATE POLICY "job_crew_select_org" ON job_crew FOR SELECT
  USING (EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_crew.job_id AND jobs.organization_id = get_user_organization_id()));
CREATE POLICY "job_crew_insert_field_roles" ON job_crew FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_crew.job_id AND jobs.organization_id = get_user_organization_id())
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator','technician']));
CREATE POLICY "job_crew_update_field_roles" ON job_crew FOR UPDATE
  USING (EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_crew.job_id AND jobs.organization_id = get_user_organization_id())
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator','technician']));
CREATE POLICY "job_crew_delete_field_roles" ON job_crew FOR DELETE
  USING (EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_crew.job_id AND jobs.organization_id = get_user_organization_id())
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator','technician']));

DROP POLICY IF EXISTS "Users can manage job disposal for their org jobs" ON job_disposal;
CREATE POLICY "job_disposal_select_org" ON job_disposal FOR SELECT
  USING (EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_disposal.job_id AND jobs.organization_id = get_user_organization_id()));
CREATE POLICY "job_disposal_insert_field_roles" ON job_disposal FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_disposal.job_id AND jobs.organization_id = get_user_organization_id())
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator','technician']));
CREATE POLICY "job_disposal_update_field_roles" ON job_disposal FOR UPDATE
  USING (EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_disposal.job_id AND jobs.organization_id = get_user_organization_id())
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator','technician']));
CREATE POLICY "job_disposal_delete_field_roles" ON job_disposal FOR DELETE
  USING (EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_disposal.job_id AND jobs.organization_id = get_user_organization_id())
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator','technician']));

DROP POLICY IF EXISTS "Users can manage job equipment for their org jobs" ON job_equipment;
CREATE POLICY "job_equipment_select_org" ON job_equipment FOR SELECT
  USING (EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_equipment.job_id AND jobs.organization_id = get_user_organization_id()));
CREATE POLICY "job_equipment_insert_field_roles" ON job_equipment FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_equipment.job_id AND jobs.organization_id = get_user_organization_id())
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator','technician']));
CREATE POLICY "job_equipment_update_field_roles" ON job_equipment FOR UPDATE
  USING (EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_equipment.job_id AND jobs.organization_id = get_user_organization_id())
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator','technician']));
CREATE POLICY "job_equipment_delete_field_roles" ON job_equipment FOR DELETE
  USING (EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_equipment.job_id AND jobs.organization_id = get_user_organization_id())
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator','technician']));

DROP POLICY IF EXISTS "Users can manage material usage for their org jobs" ON job_material_usage;
CREATE POLICY "job_material_usage_select_org" ON job_material_usage FOR SELECT
  USING (EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_material_usage.job_id AND jobs.organization_id = get_user_organization_id()));
CREATE POLICY "job_material_usage_insert_field_roles" ON job_material_usage FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_material_usage.job_id AND jobs.organization_id = get_user_organization_id())
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator','technician']));
CREATE POLICY "job_material_usage_update_field_roles" ON job_material_usage FOR UPDATE
  USING (EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_material_usage.job_id AND jobs.organization_id = get_user_organization_id())
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator','technician']));
CREATE POLICY "job_material_usage_delete_field_roles" ON job_material_usage FOR DELETE
  USING (EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_material_usage.job_id AND jobs.organization_id = get_user_organization_id())
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator','technician']));

DROP POLICY IF EXISTS "Users can manage job materials for their org jobs" ON job_materials;
CREATE POLICY "job_materials_select_org" ON job_materials FOR SELECT
  USING (EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_materials.job_id AND jobs.organization_id = get_user_organization_id()));
CREATE POLICY "job_materials_insert_field_roles" ON job_materials FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_materials.job_id AND jobs.organization_id = get_user_organization_id())
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator','technician']));
CREATE POLICY "job_materials_update_field_roles" ON job_materials FOR UPDATE
  USING (EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_materials.job_id AND jobs.organization_id = get_user_organization_id())
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator','technician']));
CREATE POLICY "job_materials_delete_field_roles" ON job_materials FOR DELETE
  USING (EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_materials.job_id AND jobs.organization_id = get_user_organization_id())
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator','technician']));

DROP POLICY IF EXISTS "Users can manage job notes for their org jobs" ON job_notes;
CREATE POLICY "job_notes_select_org" ON job_notes FOR SELECT
  USING (EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_notes.job_id AND jobs.organization_id = get_user_organization_id()));
CREATE POLICY "job_notes_insert_field_roles" ON job_notes FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_notes.job_id AND jobs.organization_id = get_user_organization_id())
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator','technician']));
CREATE POLICY "job_notes_update_field_roles" ON job_notes FOR UPDATE
  USING (EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_notes.job_id AND jobs.organization_id = get_user_organization_id())
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator','technician']));
CREATE POLICY "job_notes_delete_field_roles" ON job_notes FOR DELETE
  USING (EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_notes.job_id AND jobs.organization_id = get_user_organization_id())
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator','technician']));

DROP POLICY IF EXISTS "Users can manage time entries for their org jobs" ON job_time_entries;
CREATE POLICY "job_time_entries_select_org" ON job_time_entries FOR SELECT
  USING (EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_time_entries.job_id AND jobs.organization_id = get_user_organization_id()));
CREATE POLICY "job_time_entries_insert_field_roles" ON job_time_entries FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_time_entries.job_id AND jobs.organization_id = get_user_organization_id())
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator','technician']));
CREATE POLICY "job_time_entries_update_field_roles" ON job_time_entries FOR UPDATE
  USING (EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_time_entries.job_id AND jobs.organization_id = get_user_organization_id())
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator','technician']));
CREATE POLICY "job_time_entries_delete_field_roles" ON job_time_entries FOR DELETE
  USING (EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_time_entries.job_id AND jobs.organization_id = get_user_organization_id())
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator','technician']));

-- job_documents: direct organization_id column, not job_id-routed like its siblings.
DROP POLICY IF EXISTS "Org access job_documents" ON job_documents;
CREATE POLICY "job_documents_select_org" ON job_documents FOR SELECT
  USING (organization_id = get_user_organization_id());
CREATE POLICY "job_documents_insert_field_roles" ON job_documents FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator','technician']));
CREATE POLICY "job_documents_update_field_roles" ON job_documents FOR UPDATE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator','technician']))
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator','technician']));
CREATE POLICY "job_documents_delete_field_roles" ON job_documents FOR DELETE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator','technician']));


-- photos: already split (SELECT untouched). Add role check to the three
-- write policies, same names, preserving the existing assessment_id join.
DROP POLICY IF EXISTS "Users can create photos for assessments in their organization" ON photos;
CREATE POLICY "Users can create photos for assessments in their organization" ON photos
  FOR INSERT
  WITH CHECK (assessment_id IN (SELECT a.id FROM site_surveys a JOIN profiles p ON p.organization_id = a.organization_id WHERE p.id = auth.uid())
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator','technician']));

DROP POLICY IF EXISTS "Users can update photos for assessments in their organization" ON photos;
CREATE POLICY "Users can update photos for assessments in their organization" ON photos
  FOR UPDATE
  USING (assessment_id IN (SELECT a.id FROM site_surveys a JOIN profiles p ON p.organization_id = a.organization_id WHERE p.id = auth.uid())
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator','technician']));

DROP POLICY IF EXISTS "Users can delete photos for assessments in their organization" ON photos;
CREATE POLICY "Users can delete photos for assessments in their organization" ON photos
  FOR DELETE
  USING (assessment_id IN (SELECT a.id FROM site_surveys a JOIN profiles p ON p.organization_id = a.organization_id WHERE p.id = auth.uid())
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator','technician']));


-- photo_analyses (AI analysis triggered during field capture)
DROP POLICY IF EXISTS "Users can manage their org photo analyses" ON photo_analyses;

CREATE POLICY "photo_analyses_select_org" ON photo_analyses
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "photo_analyses_insert_field_roles" ON photo_analyses
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator','technician']));

CREATE POLICY "photo_analyses_update_field_roles" ON photo_analyses
  FOR UPDATE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator','technician']))
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator','technician']));

CREATE POLICY "photo_analyses_delete_field_roles" ON photo_analyses
  FOR DELETE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator','technician']));


-- ----------------------------------------------------------------------------
-- Consolidate duplicate/legacy policies on site_survey_photos, survey_photos,
-- and site_surveys (P2-12), and add the missing role check while doing it.
-- Each of these tables accumulated 2-3 policies per command across migrations
-- that never got cleaned up; permissive policies OR together so the
-- duplicates were not a bypass, but the unchecked ones ARE the write-role gap.
-- ----------------------------------------------------------------------------

-- site_survey_photos: drop every existing SELECT/INSERT/UPDATE/DELETE policy
-- (all were org-scoped duplicates with no role check) and the odd one-off
-- "Platform owners can access all" ALL policy is left as-is (intentional
-- cross-org platform access, already role-scoped to platform_owner).
DROP POLICY IF EXISTS "Users can delete site_survey_photos in their organization" ON site_survey_photos;
DROP POLICY IF EXISTS "Users can delete site survey photos in their organization" ON site_survey_photos;
DROP POLICY IF EXISTS "Users can create site_survey_photos in their organization" ON site_survey_photos;
DROP POLICY IF EXISTS "Users can create site survey photos in their organization" ON site_survey_photos;
DROP POLICY IF EXISTS "Users can insert site survey photos in their organization" ON site_survey_photos;
DROP POLICY IF EXISTS "Users can view site survey photos in their organization" ON site_survey_photos;
DROP POLICY IF EXISTS "Users can view site_survey_photos in their organization" ON site_survey_photos;
DROP POLICY IF EXISTS "Users can update site survey photos in their organization" ON site_survey_photos;
DROP POLICY IF EXISTS "Users can update site_survey_photos in their organization" ON site_survey_photos;

CREATE POLICY "site_survey_photos_select_org" ON site_survey_photos
  FOR SELECT
  USING (site_survey_id IN (SELECT site_surveys.id FROM site_surveys WHERE site_surveys.organization_id = get_user_organization_id()));

CREATE POLICY "site_survey_photos_insert_field_roles" ON site_survey_photos
  FOR INSERT
  WITH CHECK (site_survey_id IN (SELECT site_surveys.id FROM site_surveys WHERE site_surveys.organization_id = get_user_organization_id())
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator','technician']));

CREATE POLICY "site_survey_photos_update_field_roles" ON site_survey_photos
  FOR UPDATE
  USING (site_survey_id IN (SELECT site_surveys.id FROM site_surveys WHERE site_surveys.organization_id = get_user_organization_id())
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator','technician']));

CREATE POLICY "site_survey_photos_delete_field_roles" ON site_survey_photos
  FOR DELETE
  USING (site_survey_id IN (SELECT site_surveys.id FROM site_surveys WHERE site_surveys.organization_id = get_user_organization_id())
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator','technician']));


-- survey_photos: SELECT and DELETE are already correct (DELETE deliberately
-- admin-only, matching the P1-13 destructive-action posture). Only INSERT
-- and UPDATE lack a role check.
DROP POLICY IF EXISTS "survey_photos: org members insert" ON survey_photos;
CREATE POLICY "survey_photos: org members insert" ON survey_photos
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator','technician']));

DROP POLICY IF EXISTS "survey_photos: org members update" ON survey_photos;
CREATE POLICY "survey_photos: org members update" ON survey_photos
  FOR UPDATE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator','technician']))
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator','technician']));


-- site_surveys: consolidate duplicate SELECT/INSERT/UPDATE/DELETE policies.
-- "Platform owners can access all site surveys" (ALL, platform_owner-only) is
-- left untouched. The already-role-gated "Admins can delete site_surveys in
-- their organization" (admin/tenant_owner) is kept as the sole DELETE policy —
-- deletion cascades to estimates and signed proposals (P1-6), so restricting
-- it to admin tier rather than opening to estimator/technician is intentional.
DROP POLICY IF EXISTS "Users can view site surveys in their organization" ON site_surveys;
DROP POLICY IF EXISTS "Users can delete site surveys in their organization" ON site_surveys;
DROP POLICY IF EXISTS "Admins can delete site surveys in their organization" ON site_surveys;
DROP POLICY IF EXISTS "Users can create site surveys in their organization" ON site_surveys;
DROP POLICY IF EXISTS "Users can insert site surveys in their organization" ON site_surveys;
DROP POLICY IF EXISTS "Users can create site_surveys in their organization" ON site_surveys;
DROP POLICY IF EXISTS "Users can update site surveys in their organization" ON site_surveys;
DROP POLICY IF EXISTS "Users can update site_surveys in their organization" ON site_surveys;

CREATE POLICY "site_surveys_insert_field_roles" ON site_surveys
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator','technician']));

CREATE POLICY "site_surveys_update_field_roles" ON site_surveys
  FOR UPDATE
  USING (organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator','technician']));
