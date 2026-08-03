-- ============================================
-- PHASE 7: AI FEATURES
-- Estimate suggestions, photo analysis, voice transcription
-- ============================================

-- ============================================
-- ESTIMATE SUGGESTIONS TABLE
-- ============================================
CREATE TABLE estimate_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Context for the suggestion
  site_survey_id UUID REFERENCES site_surveys(id) ON DELETE SET NULL,
  hazard_types TEXT[] DEFAULT '{}',
  property_type VARCHAR(50),
  square_footage INTEGER,

  -- Suggested line items
  suggested_items JSONB NOT NULL DEFAULT '[]',
  total_amount DECIMAL(12, 2),

  -- AI model info
  model_version VARCHAR(50),
  confidence_score DECIMAL(5, 4), -- 0.0000 to 1.0000
  reasoning TEXT, -- AI explanation for suggestions

  -- Usage tracking
  was_accepted BOOLEAN,
  accepted_at TIMESTAMPTZ,
  modified_before_accept BOOLEAN,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PHOTO ANALYSES TABLE
-- ============================================
CREATE TABLE photo_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Source
  job_photo_id UUID, -- Reference to job_photos if applicable
  image_url TEXT,
  image_hash VARCHAR(64), -- SHA-256 for deduplication

  -- Analysis context
  property_type VARCHAR(50),
  known_hazards TEXT[] DEFAULT '{}',

  -- Results
  detected_hazards JSONB NOT NULL DEFAULT '[]', -- Array of { type, confidence, location, description }
  overall_risk_level VARCHAR(20), -- 'low', 'medium', 'high', 'critical'
  recommendations JSONB DEFAULT '[]', -- Array of suggested actions
  raw_analysis TEXT, -- Full AI response

  -- Model info
  model_version VARCHAR(50),
  processing_time_ms INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- VOICE TRANSCRIPTIONS TABLE
-- ============================================
CREATE TABLE voice_transcriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Source
  audio_url TEXT,
  audio_duration_seconds INTEGER,
  audio_format VARCHAR(20), -- 'webm', 'mp3', 'wav', etc.

  -- Context
  context_type VARCHAR(50), -- 'site_survey_note', 'job_note', 'customer_note'
  context_id UUID, -- ID of the related entity

  -- Transcription results
  raw_transcription TEXT NOT NULL,
  processed_text TEXT, -- Cleaned/formatted text
  extracted_data JSONB DEFAULT '{}', -- Structured data from the transcription

  -- Model info
  transcription_model VARCHAR(50), -- 'whisper-1', etc.
  processing_model VARCHAR(50), -- 'claude', etc.
  processing_time_ms INTEGER,

  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_estimate_suggestions_org ON estimate_suggestions(organization_id);
CREATE INDEX idx_estimate_suggestions_survey ON estimate_suggestions(site_survey_id) WHERE site_survey_id IS NOT NULL;

CREATE INDEX idx_photo_analyses_org ON photo_analyses(organization_id);
CREATE INDEX idx_photo_analyses_hash ON photo_analyses(image_hash);
CREATE INDEX idx_photo_analyses_job_photo ON photo_analyses(job_photo_id) WHERE job_photo_id IS NOT NULL;

CREATE INDEX idx_voice_transcriptions_org ON voice_transcriptions(organization_id);
CREATE INDEX idx_voice_transcriptions_user ON voice_transcriptions(user_id);
CREATE INDEX idx_voice_transcriptions_context ON voice_transcriptions(context_type, context_id);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE estimate_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_transcriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their org estimate suggestions"
  ON estimate_suggestions FOR ALL
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can manage their org photo analyses"
  ON photo_analyses FOR ALL
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can manage their org voice transcriptions"
  ON voice_transcriptions FOR ALL
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());
