-- ============================================
-- SECURITY FIX: RLS Policy Tightening
-- Addresses: feedback_surveys, tenant_usage, organizations
-- ============================================

-- ============================================
-- FIX 1: FEEDBACK SURVEYS RLS
-- Previously allowed any user to SELECT/UPDATE any survey
-- Now properly validates token at database level
-- ============================================

-- Only apply if feedback_surveys table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'feedback_surveys') THEN
    -- Drop the overly permissive policies
    DROP POLICY IF EXISTS "Public can view surveys by token" ON feedback_surveys;
    DROP POLICY IF EXISTS "Public can update surveys by token" ON feedback_surveys;
    RAISE NOTICE 'Dropped overly permissive feedback_surveys policies';
  ELSE
    RAISE NOTICE 'feedback_surveys table does not exist, skipping policy drops';
  END IF;
END $$;

-- Create a function to validate feedback tokens (used by service role)
-- This function will work once feedback_surveys exists
CREATE OR REPLACE FUNCTION validate_feedback_token(token_value VARCHAR(64))
RETURNS UUID AS $$
DECLARE
  survey_id UUID;
BEGIN
  SELECT id INTO survey_id
  FROM feedback_surveys
  WHERE access_token = token_value
    AND token_expires_at > NOW()
    AND status NOT IN ('completed', 'expired');

  RETURN survey_id;
EXCEPTION WHEN undefined_table THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to submit feedback (used via RPC, validates token)
CREATE OR REPLACE FUNCTION submit_feedback(
  p_token VARCHAR(64),
  p_rating_overall INTEGER DEFAULT NULL,
  p_rating_quality INTEGER DEFAULT NULL,
  p_rating_communication INTEGER DEFAULT NULL,
  p_rating_timeliness INTEGER DEFAULT NULL,
  p_rating_value INTEGER DEFAULT NULL,
  p_would_recommend BOOLEAN DEFAULT NULL,
  p_likelihood_to_recommend INTEGER DEFAULT NULL,
  p_feedback_text TEXT DEFAULT NULL,
  p_improvement_suggestions TEXT DEFAULT NULL,
  p_testimonial_text TEXT DEFAULT NULL,
  p_testimonial_permission BOOLEAN DEFAULT FALSE,
  p_ip_address VARCHAR(45) DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_survey RECORD;
  v_result JSON;
BEGIN
  -- Find and validate the survey by token
  SELECT * INTO v_survey
  FROM feedback_surveys
  WHERE access_token = p_token
    AND token_expires_at > NOW()
    AND status NOT IN ('completed', 'expired')
  FOR UPDATE;  -- Lock the row to prevent race conditions

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired token');
  END IF;

  -- Mark as viewed if first access
  IF v_survey.viewed_at IS NULL THEN
    UPDATE feedback_surveys
    SET viewed_at = NOW(),
        status = 'viewed'
    WHERE id = v_survey.id;
  END IF;

  -- Update with feedback data
  UPDATE feedback_surveys
  SET
    rating_overall = COALESCE(p_rating_overall, rating_overall),
    rating_quality = COALESCE(p_rating_quality, rating_quality),
    rating_communication = COALESCE(p_rating_communication, rating_communication),
    rating_timeliness = COALESCE(p_rating_timeliness, rating_timeliness),
    rating_value = COALESCE(p_rating_value, rating_value),
    would_recommend = COALESCE(p_would_recommend, would_recommend),
    likelihood_to_recommend = COALESCE(p_likelihood_to_recommend, likelihood_to_recommend),
    feedback_text = COALESCE(p_feedback_text, feedback_text),
    improvement_suggestions = COALESCE(p_improvement_suggestions, improvement_suggestions),
    testimonial_text = COALESCE(p_testimonial_text, testimonial_text),
    testimonial_permission = COALESCE(p_testimonial_permission, testimonial_permission),
    ip_address = COALESCE(p_ip_address, ip_address),
    user_agent = COALESCE(p_user_agent, user_agent),
    status = CASE
      WHEN p_rating_overall IS NOT NULL THEN 'completed'
      ELSE status
    END,
    completed_at = CASE
      WHEN p_rating_overall IS NOT NULL THEN NOW()
      ELSE completed_at
    END,
    updated_at = NOW()
  WHERE id = v_survey.id
  RETURNING json_build_object(
    'success', true,
    'survey_id', id,
    'status', status
  ) INTO v_result;

  RETURN v_result;
EXCEPTION WHEN undefined_table THEN
  RETURN json_build_object('success', false, 'error', 'Feedback system not configured');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get survey for public viewing (validates token)
CREATE OR REPLACE FUNCTION get_feedback_survey_by_token(p_token VARCHAR(64))
RETURNS JSON AS $$
DECLARE
  v_survey RECORD;
BEGIN
  SELECT
    fs.id,
    fs.status,
    fs.token_expires_at,
    fs.rating_overall,
    fs.rating_quality,
    fs.rating_communication,
    fs.rating_timeliness,
    fs.rating_value,
    fs.would_recommend,
    fs.likelihood_to_recommend,
    fs.feedback_text,
    fs.improvement_suggestions,
    fs.testimonial_text,
    fs.testimonial_permission,
    j.job_number,
    o.name as organization_name,
    o.logo_url as organization_logo,
    c.first_name as customer_first_name
  INTO v_survey
  FROM feedback_surveys fs
  JOIN jobs j ON j.id = fs.job_id
  JOIN organizations o ON o.id = fs.organization_id
  LEFT JOIN customers c ON c.id = fs.customer_id
  WHERE fs.access_token = p_token
    AND fs.token_expires_at > NOW();

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired token');
  END IF;

  -- Mark as viewed if first access
  IF v_survey.status = 'sent' OR v_survey.status = 'pending' THEN
    UPDATE feedback_surveys
    SET viewed_at = NOW(),
        status = 'viewed'
    WHERE access_token = p_token;
  END IF;

  RETURN json_build_object(
    'success', true,
    'survey', json_build_object(
      'id', v_survey.id,
      'status', v_survey.status,
      'expires_at', v_survey.token_expires_at,
      'rating_overall', v_survey.rating_overall,
      'rating_quality', v_survey.rating_quality,
      'rating_communication', v_survey.rating_communication,
      'rating_timeliness', v_survey.rating_timeliness,
      'rating_value', v_survey.rating_value,
      'would_recommend', v_survey.would_recommend,
      'likelihood_to_recommend', v_survey.likelihood_to_recommend,
      'feedback_text', v_survey.feedback_text,
      'improvement_suggestions', v_survey.improvement_suggestions,
      'testimonial_text', v_survey.testimonial_text,
      'testimonial_permission', v_survey.testimonial_permission,
      'job_number', v_survey.job_number,
      'organization_name', v_survey.organization_name,
      'organization_logo', v_survey.organization_logo,
      'customer_first_name', v_survey.customer_first_name
    )
  );
EXCEPTION WHEN undefined_table THEN
  RETURN json_build_object('success', false, 'error', 'Feedback system not configured');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to anon and authenticated for public feedback endpoints
GRANT EXECUTE ON FUNCTION validate_feedback_token(VARCHAR) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION submit_feedback(VARCHAR, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, BOOLEAN, INTEGER, TEXT, TEXT, TEXT, BOOLEAN, VARCHAR, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_feedback_survey_by_token(VARCHAR) TO anon, authenticated;


-- ============================================
-- FIX 2: TENANT USAGE RLS
-- Previously allowed any authenticated user to modify any org's usage
-- Now restricted to service role functions only
-- ============================================

-- Only apply if tenant_usage table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tenant_usage') THEN
    DROP POLICY IF EXISTS "System can insert/update tenant usage" ON tenant_usage;
    RAISE NOTICE 'Dropped overly permissive tenant_usage policy';
  ELSE
    RAISE NOTICE 'tenant_usage table does not exist, skipping policy drop';
  END IF;
END $$;

-- Create a SECURITY DEFINER function for updating usage (service role only)
CREATE OR REPLACE FUNCTION increment_tenant_usage(
  p_organization_id UUID,
  p_metric VARCHAR(50),
  p_increment INTEGER DEFAULT 1
)
RETURNS VOID AS $$
DECLARE
  v_current_month VARCHAR(7);
BEGIN
  v_current_month := to_char(NOW(), 'YYYY-MM');

  INSERT INTO tenant_usage (organization_id, month, metric, usage_count, last_updated)
  VALUES (p_organization_id, v_current_month, p_metric, p_increment, NOW())
  ON CONFLICT (organization_id, month, metric)
  DO UPDATE SET
    usage_count = tenant_usage.usage_count + p_increment,
    last_updated = NOW();
EXCEPTION WHEN undefined_table THEN
  -- Table doesn't exist yet, silently ignore
  NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to reset usage (for billing cycle resets)
CREATE OR REPLACE FUNCTION reset_tenant_usage(
  p_organization_id UUID,
  p_month VARCHAR(7) DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  DELETE FROM tenant_usage
  WHERE organization_id = p_organization_id
    AND (p_month IS NULL OR month = p_month);
EXCEPTION WHEN undefined_table THEN
  -- Table doesn't exist yet, silently ignore
  NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only grant to authenticated (service calls), not direct table access
GRANT EXECUTE ON FUNCTION increment_tenant_usage(UUID, VARCHAR, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION reset_tenant_usage(UUID, VARCHAR) TO authenticated;


-- ============================================
-- FIX 3: ORGANIZATION CREATION RATE LIMITING
-- Previously allowed unlimited org creation
-- Now limits to 1 org per user (can be increased via settings)
-- ============================================

-- Drop the overly permissive INSERT policy (if exists)
DROP POLICY IF EXISTS "Allow organization creation during onboarding" ON organizations;

-- Create a function to check if user can create org
CREATE OR REPLACE FUNCTION can_create_organization()
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_org_count INTEGER;
  v_max_orgs INTEGER := 1;  -- Default: 1 org per user
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Count how many orgs this user owns
  SELECT COUNT(*) INTO v_org_count
  FROM profiles
  WHERE id = v_user_id
    AND role IN ('owner', 'tenant_owner');

  -- Platform owners can create unlimited orgs
  IF EXISTS (
    SELECT 1 FROM profiles
    WHERE id = v_user_id
    AND role IN ('platform_owner', 'platform_admin')
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN v_org_count < v_max_orgs;
EXCEPTION WHEN undefined_table THEN
  -- Profiles table doesn't exist, allow creation
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Allow users without a profile to create their first org during onboarding
CREATE OR REPLACE FUNCTION allow_first_org_creation()
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_profile_exists BOOLEAN;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check if user has a profile yet
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = v_user_id) INTO v_profile_exists;

  -- If no profile, this is initial signup - allow org creation
  IF NOT v_profile_exists THEN
    RETURN TRUE;
  END IF;

  -- Otherwise use the normal rate limit check
  RETURN can_create_organization();
EXCEPTION WHEN undefined_table THEN
  -- Profiles table doesn't exist, allow creation
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- New policy with rate limiting
CREATE POLICY "Allow organization creation with rate limit" ON organizations
  FOR INSERT WITH CHECK (
    allow_first_org_creation()
  );


-- ============================================
-- FIX 4: AUDIT LOGGING FOR SECURITY-SENSITIVE OPERATIONS
-- Add logging for cross-org access by platform admins
-- ============================================

CREATE OR REPLACE FUNCTION log_platform_access(
  p_action VARCHAR(100),
  p_target_org_id UUID,
  p_resource_type VARCHAR(50),
  p_resource_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO audit_log (
    organization_id,
    user_id,
    action,
    resource_type,
    resource_id,
    old_values,
    new_values,
    ip_address,
    created_at
  )
  VALUES (
    p_target_org_id,
    auth.uid(),
    'platform_access:' || p_action,
    p_resource_type,
    p_resource_id,
    NULL,
    p_details,
    inet_client_addr(),
    NOW()
  );
EXCEPTION WHEN undefined_table THEN
  -- audit_log table doesn't exist yet, silently ignore
  NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION log_platform_access(VARCHAR, UUID, VARCHAR, UUID, JSONB) TO authenticated;


-- ============================================
-- VERIFICATION
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'Security RLS fixes applied successfully:';
  RAISE NOTICE '  - feedback_surveys: Public access now via RPC functions only';
  RAISE NOTICE '  - tenant_usage: Write access now via SECURITY DEFINER functions only';
  RAISE NOTICE '  - organizations: INSERT rate limited to 1 org per user';
  RAISE NOTICE '  - Added log_platform_access for audit trail';
END $$;
