-- ============================================
-- CUSTOMER FEEDBACK SYSTEM
-- Phase 4: Post-job surveys, ratings, and review requests
-- ============================================

-- ============================================
-- FEEDBACK SURVEYS
-- Customer satisfaction surveys with token-based access
-- ============================================
CREATE TABLE IF NOT EXISTS feedback_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  -- Token for public access
  access_token VARCHAR(64) NOT NULL UNIQUE,
  token_expires_at TIMESTAMPTZ NOT NULL,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  -- 'pending', 'sent', 'viewed', 'completed', 'expired'

  -- Survey sent tracking
  sent_at TIMESTAMPTZ,
  sent_to_email VARCHAR(255),
  reminder_sent_at TIMESTAMPTZ,

  -- Survey completion
  viewed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Ratings (1-5 scale)
  rating_overall INTEGER CHECK (rating_overall >= 1 AND rating_overall <= 5),
  rating_quality INTEGER CHECK (rating_quality >= 1 AND rating_quality <= 5),
  rating_communication INTEGER CHECK (rating_communication >= 1 AND rating_communication <= 5),
  rating_timeliness INTEGER CHECK (rating_timeliness >= 1 AND rating_timeliness <= 5),
  rating_value INTEGER CHECK (rating_value >= 1 AND rating_value <= 5),

  -- NPS
  would_recommend BOOLEAN,
  likelihood_to_recommend INTEGER CHECK (likelihood_to_recommend >= 0 AND likelihood_to_recommend <= 10),

  -- Feedback text
  feedback_text TEXT,
  improvement_suggestions TEXT,

  -- Testimonial
  testimonial_text TEXT,
  testimonial_permission BOOLEAN DEFAULT FALSE,
  testimonial_approved BOOLEAN DEFAULT FALSE,
  testimonial_approved_at TIMESTAMPTZ,
  testimonial_approved_by UUID REFERENCES profiles(id),

  -- Customer info at time of survey (in case customer record changes)
  customer_name VARCHAR(255),
  customer_company VARCHAR(255),

  -- Metadata
  ip_address VARCHAR(45),
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- REVIEW REQUESTS
-- Track requests to leave reviews on external platforms
-- ============================================
CREATE TABLE IF NOT EXISTS review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  feedback_survey_id UUID REFERENCES feedback_surveys(id) ON DELETE SET NULL,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  -- Platform
  platform VARCHAR(50) NOT NULL,
  -- 'google', 'yelp', 'facebook', 'bbb', 'homeadvisor', 'angi'

  platform_url TEXT,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  -- 'pending', 'sent', 'clicked', 'completed'

  -- Tracking
  sent_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Email tracking
  sent_to_email VARCHAR(255),
  click_token VARCHAR(64),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_feedback_surveys_org ON feedback_surveys(organization_id);
CREATE INDEX IF NOT EXISTS idx_feedback_surveys_job ON feedback_surveys(job_id);
CREATE INDEX IF NOT EXISTS idx_feedback_surveys_customer ON feedback_surveys(customer_id);
CREATE INDEX IF NOT EXISTS idx_feedback_surveys_token ON feedback_surveys(access_token);
CREATE INDEX IF NOT EXISTS idx_feedback_surveys_status ON feedback_surveys(status);
CREATE INDEX IF NOT EXISTS idx_feedback_surveys_testimonial ON feedback_surveys(testimonial_approved)
  WHERE testimonial_approved = true;

CREATE INDEX IF NOT EXISTS idx_review_requests_org ON review_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_review_requests_survey ON review_requests(feedback_survey_id);
CREATE INDEX IF NOT EXISTS idx_review_requests_customer ON review_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_review_requests_platform ON review_requests(platform);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE feedback_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_requests ENABLE ROW LEVEL SECURITY;

-- Surveys - org members can manage, public can access via token
DROP POLICY IF EXISTS "Users can manage their org feedback surveys" ON feedback_surveys;
CREATE POLICY "Users can manage their org feedback surveys"
  ON feedback_surveys FOR ALL
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Public can view surveys by token" ON feedback_surveys;
CREATE POLICY "Public can view surveys by token"
  ON feedback_surveys FOR SELECT
  USING (true); -- Token validation done in application layer

DROP POLICY IF EXISTS "Public can update surveys by token" ON feedback_surveys;
CREATE POLICY "Public can update surveys by token"
  ON feedback_surveys FOR UPDATE
  USING (true); -- Token validation done in application layer

-- Review requests
DROP POLICY IF EXISTS "Users can manage their org review requests" ON review_requests;
CREATE POLICY "Users can manage their org review requests"
  ON review_requests FOR ALL
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Generate secure access token
CREATE OR REPLACE FUNCTION generate_feedback_token()
RETURNS VARCHAR(64) AS $$
DECLARE
  token VARCHAR(64);
  token_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate a random 64-character hex string
    token := encode(gen_random_bytes(32), 'hex');

    -- Check if token already exists
    SELECT EXISTS(SELECT 1 FROM feedback_surveys WHERE access_token = token) INTO token_exists;

    EXIT WHEN NOT token_exists;
  END LOOP;

  RETURN token;
END;
$$ LANGUAGE plpgsql;

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_feedback_surveys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS feedback_surveys_updated_at ON feedback_surveys;
CREATE TRIGGER feedback_surveys_updated_at
  BEFORE UPDATE ON feedback_surveys
  FOR EACH ROW EXECUTE FUNCTION update_feedback_surveys_updated_at();

-- Calculate average rating
CREATE OR REPLACE FUNCTION calculate_survey_average_rating(survey_id UUID)
RETURNS DECIMAL(3, 2) AS $$
DECLARE
  total DECIMAL;
  count INTEGER;
BEGIN
  SELECT
    COALESCE(rating_overall, 0) +
    COALESCE(rating_quality, 0) +
    COALESCE(rating_communication, 0) +
    COALESCE(rating_timeliness, 0) +
    COALESCE(rating_value, 0),
    (CASE WHEN rating_overall IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN rating_quality IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN rating_communication IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN rating_timeliness IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN rating_value IS NOT NULL THEN 1 ELSE 0 END)
  INTO total, count
  FROM feedback_surveys
  WHERE id = survey_id;

  IF count = 0 THEN
    RETURN NULL;
  END IF;

  RETURN total / count;
END;
$$ LANGUAGE plpgsql;

-- Get organization feedback statistics
CREATE OR REPLACE FUNCTION get_feedback_stats(org_id UUID)
RETURNS TABLE (
  total_surveys BIGINT,
  completed_surveys BIGINT,
  avg_overall_rating DECIMAL(3, 2),
  avg_quality_rating DECIMAL(3, 2),
  avg_communication_rating DECIMAL(3, 2),
  avg_timeliness_rating DECIMAL(3, 2),
  nps_score DECIMAL(5, 2),
  testimonials_count BIGINT,
  response_rate DECIMAL(5, 2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_surveys,
    COUNT(*) FILTER (WHERE status = 'completed')::BIGINT as completed_surveys,
    AVG(rating_overall)::DECIMAL(3, 2) as avg_overall_rating,
    AVG(rating_quality)::DECIMAL(3, 2) as avg_quality_rating,
    AVG(rating_communication)::DECIMAL(3, 2) as avg_communication_rating,
    AVG(rating_timeliness)::DECIMAL(3, 2) as avg_timeliness_rating,
    (
      (COUNT(*) FILTER (WHERE likelihood_to_recommend >= 9)::DECIMAL / NULLIF(COUNT(*) FILTER (WHERE likelihood_to_recommend IS NOT NULL), 0) * 100) -
      (COUNT(*) FILTER (WHERE likelihood_to_recommend <= 6)::DECIMAL / NULLIF(COUNT(*) FILTER (WHERE likelihood_to_recommend IS NOT NULL), 0) * 100)
    )::DECIMAL(5, 2) as nps_score,
    COUNT(*) FILTER (WHERE testimonial_approved = true)::BIGINT as testimonials_count,
    (COUNT(*) FILTER (WHERE status = 'completed')::DECIMAL / NULLIF(COUNT(*) FILTER (WHERE status != 'pending'), 0) * 100)::DECIMAL(5, 2) as response_rate
  FROM feedback_surveys
  WHERE organization_id = org_id;
END;
$$ LANGUAGE plpgsql;
