-- ============================================
-- AI DATA CONSENT AND PII PROTECTION
-- Adds consent tracking and audit logging for AI features
-- ============================================

-- ============================================
-- 1. ORGANIZATION AI SETTINGS
-- ============================================

-- Add AI feature settings to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS ai_features_enabled BOOLEAN DEFAULT false;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS ai_consent_date TIMESTAMPTZ;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS ai_consent_user_id UUID REFERENCES profiles(id);

-- Create a table for granular AI feature consent
CREATE TABLE IF NOT EXISTS organization_ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,

  -- Master switch
  ai_enabled BOOLEAN DEFAULT false,
  consent_granted_at TIMESTAMPTZ,
  consent_granted_by UUID REFERENCES profiles(id),

  -- Granular feature toggles
  photo_analysis_enabled BOOLEAN DEFAULT false,
  estimate_suggestions_enabled BOOLEAN DEFAULT false,
  voice_transcription_enabled BOOLEAN DEFAULT false,

  -- Data handling preferences
  retain_ai_data BOOLEAN DEFAULT true,  -- Keep analysis results
  anonymize_customer_data BOOLEAN DEFAULT true,  -- Strip PII before sending
  allow_model_improvement BOOLEAN DEFAULT false,  -- Consent for training

  -- Audit
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

-- RLS for AI settings
ALTER TABLE organization_ai_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can manage AI settings"
  ON organization_ai_settings FOR ALL
  USING (organization_id = get_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'tenant_owner')
    ))
  WITH CHECK (organization_id = get_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'tenant_owner')
    ));

CREATE POLICY "Org members can view AI settings"
  ON organization_ai_settings FOR SELECT
  USING (organization_id = get_user_organization_id());


-- ============================================
-- 2. CUSTOMER AI CONSENT
-- ============================================

-- Add AI consent fields to customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS ai_processing_consent BOOLEAN DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS ai_consent_date TIMESTAMPTZ;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS ai_consent_source VARCHAR(50);  -- 'form', 'verbal', 'contract'


-- ============================================
-- 3. AI USAGE AUDIT LOG
-- ============================================

CREATE TABLE IF NOT EXISTS ai_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),

  -- What was called
  service_name VARCHAR(50) NOT NULL,  -- 'photo_analysis', 'estimate_suggestion', 'voice_transcription'
  operation VARCHAR(50) NOT NULL,  -- 'analyze', 'suggest', 'transcribe'

  -- Context
  customer_id UUID REFERENCES customers(id),
  related_entity_type VARCHAR(50),  -- 'site_survey', 'job', 'estimate'
  related_entity_id UUID,

  -- AI provider details
  provider VARCHAR(50) NOT NULL,  -- 'anthropic', 'openai', 'whisper'
  model_version VARCHAR(100),

  -- Data sent metrics (not actual data)
  input_token_count INTEGER,
  output_token_count INTEGER,
  data_categories TEXT[],  -- ['image', 'text', 'audio']
  pii_redacted BOOLEAN DEFAULT false,

  -- Response metadata
  processing_time_ms INTEGER,
  success BOOLEAN DEFAULT true,
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for audit queries
CREATE INDEX idx_ai_usage_log_org ON ai_usage_log(organization_id);
CREATE INDEX idx_ai_usage_log_customer ON ai_usage_log(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_ai_usage_log_service ON ai_usage_log(service_name);
CREATE INDEX idx_ai_usage_log_created ON ai_usage_log(created_at);

-- RLS for AI usage log
ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can view AI usage logs"
  ON ai_usage_log FOR SELECT
  USING (organization_id = get_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'tenant_owner')
    ));

CREATE POLICY "System can insert AI usage logs"
  ON ai_usage_log FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());


-- ============================================
-- 4. HELPER FUNCTIONS
-- ============================================

-- Check if AI features are enabled for an organization
CREATE OR REPLACE FUNCTION check_ai_enabled(p_organization_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_enabled BOOLEAN;
BEGIN
  SELECT ai_enabled INTO v_enabled
  FROM organization_ai_settings
  WHERE organization_id = p_organization_id;

  RETURN COALESCE(v_enabled, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check specific AI feature
CREATE OR REPLACE FUNCTION check_ai_feature_enabled(
  p_organization_id UUID,
  p_feature VARCHAR(50)
)
RETURNS BOOLEAN AS $$
DECLARE
  v_settings organization_ai_settings%ROWTYPE;
BEGIN
  SELECT * INTO v_settings
  FROM organization_ai_settings
  WHERE organization_id = p_organization_id;

  IF NOT FOUND OR NOT v_settings.ai_enabled THEN
    RETURN false;
  END IF;

  CASE p_feature
    WHEN 'photo_analysis' THEN RETURN v_settings.photo_analysis_enabled;
    WHEN 'estimate_suggestions' THEN RETURN v_settings.estimate_suggestions_enabled;
    WHEN 'voice_transcription' THEN RETURN v_settings.voice_transcription_enabled;
    ELSE RETURN false;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log AI usage
CREATE OR REPLACE FUNCTION log_ai_usage(
  p_organization_id UUID,
  p_service_name VARCHAR(50),
  p_operation VARCHAR(50),
  p_provider VARCHAR(50),
  p_model_version VARCHAR(100) DEFAULT NULL,
  p_customer_id UUID DEFAULT NULL,
  p_related_entity_type VARCHAR(50) DEFAULT NULL,
  p_related_entity_id UUID DEFAULT NULL,
  p_input_tokens INTEGER DEFAULT NULL,
  p_output_tokens INTEGER DEFAULT NULL,
  p_data_categories TEXT[] DEFAULT NULL,
  p_pii_redacted BOOLEAN DEFAULT false,
  p_processing_time_ms INTEGER DEFAULT NULL,
  p_success BOOLEAN DEFAULT true,
  p_error_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO ai_usage_log (
    organization_id,
    user_id,
    service_name,
    operation,
    provider,
    model_version,
    customer_id,
    related_entity_type,
    related_entity_id,
    input_token_count,
    output_token_count,
    data_categories,
    pii_redacted,
    processing_time_ms,
    success,
    error_message
  )
  VALUES (
    p_organization_id,
    auth.uid(),
    p_service_name,
    p_operation,
    p_provider,
    p_model_version,
    p_customer_id,
    p_related_entity_type,
    p_related_entity_id,
    p_input_tokens,
    p_output_tokens,
    p_data_categories,
    p_pii_redacted,
    p_processing_time_ms,
    p_success,
    p_error_message
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_ai_enabled(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_ai_feature_enabled(UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION log_ai_usage(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, UUID, VARCHAR, UUID, INTEGER, INTEGER, TEXT[], BOOLEAN, INTEGER, BOOLEAN, TEXT) TO authenticated;


-- ============================================
-- 5. INITIALIZE DEFAULT SETTINGS
-- ============================================

-- Create AI settings for existing orgs (disabled by default)
INSERT INTO organization_ai_settings (organization_id, ai_enabled)
SELECT id, false FROM organizations
WHERE NOT EXISTS (
  SELECT 1 FROM organization_ai_settings WHERE organization_id = organizations.id
)
ON CONFLICT (organization_id) DO NOTHING;

-- Trigger to create AI settings for new orgs
CREATE OR REPLACE FUNCTION create_org_ai_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO organization_ai_settings (organization_id, ai_enabled)
  VALUES (NEW.id, false)
  ON CONFLICT (organization_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS create_ai_settings_for_new_org ON organizations;
CREATE TRIGGER create_ai_settings_for_new_org
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION create_org_ai_settings();


-- ============================================
-- VERIFICATION
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'AI consent and PII protection migration applied:';
  RAISE NOTICE '  - organization_ai_settings table created';
  RAISE NOTICE '  - customers.ai_processing_consent field added';
  RAISE NOTICE '  - ai_usage_log table created for audit trail';
  RAISE NOTICE '  - Helper functions: check_ai_enabled, check_ai_feature_enabled, log_ai_usage';
  RAISE NOTICE '  - AI features are DISABLED by default for all organizations';
END $$;
