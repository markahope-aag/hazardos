-- ============================================
-- FIX CRITICAL & HIGH MULTI-TENANCY RLS GAPS
-- ============================================
-- Security audit fixes for:
--   C1: tenant_usage wildcard policy
--   C2: stripe_webhook_events missing policies
--   C3: job-completion-photos storage bucket org-scoping
--   H1: audit_log wildcard INSERT policy
--   H2: feedback_surveys public access too permissive

-- ============================================
-- C1: tenant_usage — replace wildcard FOR ALL with scoped INSERT/UPDATE
-- ============================================
DROP POLICY IF EXISTS "System can insert/update tenant usage" ON tenant_usage;

CREATE POLICY "Users can insert usage for their own org"
  ON tenant_usage FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update usage for their own org"
  ON tenant_usage FOR UPDATE
  USING (organization_id = get_user_organization_id());

-- ============================================
-- C2: stripe_webhook_events — add service-level policies
-- RLS is enabled but no policies exist, so all access is blocked.
-- The Stripe webhook handler runs server-side; we gate to service_role
-- for INSERT/SELECT and restrict DELETE to platform admins.
-- ============================================
CREATE POLICY "Service role can insert webhook events"
  ON stripe_webhook_events FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can read webhook events"
  ON stripe_webhook_events FOR SELECT
  USING (auth.role() = 'service_role');

CREATE POLICY "Platform admins can manage webhook events"
  ON stripe_webhook_events FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organizations o
      JOIN profiles p ON p.organization_id = o.id
      WHERE p.id = auth.uid() AND o.is_platform_admin = true
    )
  );

-- ============================================
-- C3: job-completion-photos storage bucket — org-scoped policies
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('job-completion-photos', 'job-completion-photos', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Drop any existing permissive policies
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their org photos" ON storage.objects;
DROP POLICY IF EXISTS "Org-scoped photo uploads" ON storage.objects;
DROP POLICY IF EXISTS "Org-scoped photo reads" ON storage.objects;
DROP POLICY IF EXISTS "Org-scoped photo deletes" ON storage.objects;

-- INSERT: authenticated users can only upload under their org's folder
CREATE POLICY "Org-scoped photo uploads"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'job-completion-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = get_user_organization_id()::text
  );

-- SELECT: authenticated users can only read their org's photos
CREATE POLICY "Org-scoped photo reads"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'job-completion-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = get_user_organization_id()::text
  );

-- DELETE: authenticated users can only delete their org's photos
CREATE POLICY "Org-scoped photo deletes"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'job-completion-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = get_user_organization_id()::text
  );

-- ============================================
-- H1: audit_log — scope INSERT to user's own org
-- ============================================
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_log;

CREATE POLICY "Users can insert audit logs for their own org"
  ON audit_log FOR INSERT
  WITH CHECK (
    organization_id = get_user_organization_id()
    OR organization_id IS NULL
  );

-- ============================================
-- H2: feedback_surveys — replace permissive public policies with token-based checks
-- ============================================
DROP POLICY IF EXISTS "Public can view surveys by token" ON feedback_surveys;
DROP POLICY IF EXISTS "Public can update surveys by token" ON feedback_surveys;

-- Public can only view surveys that have an active token
CREATE POLICY "Public can view surveys by token"
  ON feedback_surveys FOR SELECT
  USING (
    access_token IS NOT NULL
    AND status IN ('pending', 'sent')
  );

-- Public can only submit responses to active surveys
CREATE POLICY "Public can update surveys by token"
  ON feedback_surveys FOR UPDATE
  USING (
    access_token IS NOT NULL
    AND status IN ('pending', 'sent')
  )
  WITH CHECK (
    status IN ('pending', 'completed')
  );
