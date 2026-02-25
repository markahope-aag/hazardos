-- ============================================
-- FIX SECURITY ISSUES (CORRECTED VERSION)
-- ============================================
-- This migration fixes the security issues identified by Supabase linter
-- with proper error handling for missing tables/policies

-- ============================================
-- 1. FIX MUTABLE SEARCH PATH ON ALL PUBLIC FUNCTIONS
-- ============================================
DO $$
DECLARE
  fn RECORD;
BEGIN
  -- Set search_path = '' on every function in the public schema
  FOR fn IN
    SELECT
      p.oid,
      p.proname,
      pg_catalog.pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'update_updated_at_column',
        'check_tenant_limits',
        'update_tenant_usage',
        'track_assessment_creation',
        'track_photo_upload',
        'get_user_organization_id',
        'get_user_role',
        'is_platform_user',
        'log_audit_event',
        'update_notification_preferences_updated_at',
        'get_unread_notification_count',
        'create_notification_for_role',
        'initialize_notification_preferences',
        'cleanup_expired_notifications',
        'validate_feedback_token',
        'get_feedback_survey_by_token',
        'submit_feedback',
        'increment_tenant_usage',
        'reset_tenant_usage',
        'can_create_organization',
        'allow_first_org_creation',
        'log_platform_access',
        'check_ai_enabled',
        'check_ai_feature_enabled',
        'log_ai_usage',
        'create_org_ai_settings',
        'calculate_completion_variance_by_job'
      )
  LOOP
    EXECUTE format(
      'ALTER FUNCTION public.%I(%s) SET search_path = %L',
      fn.proname, fn.args, ''
    );
    RAISE NOTICE 'Fixed search_path for %(%)', fn.proname, fn.args;
  END LOOP;
END;
$$;

-- ============================================
-- 2. FIX OVERLY PERMISSIVE RLS POLICIES
-- ============================================

-- Fix audit_log table - replace permissive INSERT policy
DO $$
BEGIN
  -- Check if audit_log table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_log') THEN
    -- Drop existing permissive policy if it exists
    DROP POLICY IF EXISTS "System can insert audit logs" ON audit_log;
    
    -- Create more restrictive policy
    CREATE POLICY "Users can insert audit logs for their own org"
      ON audit_log FOR INSERT
      WITH CHECK (
        organization_id = get_user_organization_id()
        OR organization_id IS NULL
      );
    
    RAISE NOTICE 'Fixed audit_log RLS policy';
  ELSE
    RAISE NOTICE 'audit_log table does not exist, skipping policy fix';
  END IF;
END;
$$;

-- Fix tenant_usage policies if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tenant_usage') THEN
    DROP POLICY IF EXISTS "System can insert/update tenant usage" ON tenant_usage;
    
    CREATE POLICY "Users can insert usage for their own org"
      ON tenant_usage FOR INSERT
      WITH CHECK (organization_id = get_user_organization_id());
    
    CREATE POLICY "Users can update usage for their own org"
      ON tenant_usage FOR UPDATE
      USING (organization_id = get_user_organization_id());
    
    RAISE NOTICE 'Fixed tenant_usage RLS policies';
  END IF;
END;
$$;

-- Fix stripe_webhook_events policies if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stripe_webhook_events') THEN
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
    
    RAISE NOTICE 'Fixed stripe_webhook_events RLS policies';
  END IF;
END;
$$;

-- Fix feedback_surveys policies if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'feedback_surveys') THEN
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
    
    RAISE NOTICE 'Fixed feedback_surveys RLS policies';
  END IF;
END;
$$;

-- ============================================
-- 3. FIX STORAGE POLICIES
-- ============================================

-- Ensure job-completion-photos bucket exists and is private
INSERT INTO storage.buckets (id, name, public)
VALUES ('job-completion-photos', 'job-completion-photos', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Drop any existing permissive storage policies
DO $$
BEGIN
  -- Drop policies if they exist (ignore errors if they don't)
  BEGIN
    DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  BEGIN
    DROP POLICY IF EXISTS "Anyone can view photos" ON storage.objects;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  BEGIN
    DROP POLICY IF EXISTS "Users can delete their org photos" ON storage.objects;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  BEGIN
    DROP POLICY IF EXISTS "Org-scoped photo uploads" ON storage.objects;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  BEGIN
    DROP POLICY IF EXISTS "Org-scoped photo reads" ON storage.objects;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  BEGIN
    DROP POLICY IF EXISTS "Org-scoped photo deletes" ON storage.objects;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END;
$$;

-- Create org-scoped storage policies
CREATE POLICY "Org-scoped photo uploads"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'job-completion-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = get_user_organization_id()::text
  );

CREATE POLICY "Org-scoped photo reads"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'job-completion-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = get_user_organization_id()::text
  );

CREATE POLICY "Org-scoped photo deletes"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'job-completion-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = get_user_organization_id()::text
  );

-- Security fixes applied successfully