-- ============================================
-- PHASE 7: MARKETING INTEGRATIONS
-- Customer segments, segment members, marketing sync
-- ============================================

-- ============================================
-- CUSTOMER SEGMENTS TABLE
-- ============================================
CREATE TABLE customer_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Segment details
  name VARCHAR(100) NOT NULL,
  description TEXT,
  segment_type VARCHAR(20) NOT NULL DEFAULT 'dynamic', -- 'dynamic' or 'static'

  -- Dynamic segment rules (JSON array of conditions)
  -- e.g., [{"field": "total_revenue", "operator": ">", "value": 10000}, {"field": "job_count", "operator": ">=", "value": 3}]
  rules JSONB DEFAULT '[]',

  -- Cached counts for display
  member_count INTEGER DEFAULT 0,
  last_calculated_at TIMESTAMPTZ,

  -- Sync tracking
  mailchimp_tag_id VARCHAR(100),
  mailchimp_synced_at TIMESTAMPTZ,
  hubspot_list_id VARCHAR(100),
  hubspot_synced_at TIMESTAMPTZ,

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SEGMENT MEMBERS TABLE (for static segments)
-- ============================================
CREATE TABLE segment_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id UUID NOT NULL REFERENCES customer_segments(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  -- When was this member added
  added_at TIMESTAMPTZ DEFAULT NOW(),
  added_by UUID REFERENCES profiles(id),

  UNIQUE(segment_id, customer_id)
);

-- ============================================
-- MARKETING SYNC LOG TABLE
-- ============================================
CREATE TABLE marketing_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Sync details
  integration_type VARCHAR(50) NOT NULL, -- 'mailchimp', 'hubspot'
  sync_type VARCHAR(50) NOT NULL, -- 'contact', 'segment', 'full'
  entity_id UUID, -- Customer or segment ID

  -- Results
  status VARCHAR(20) NOT NULL, -- 'success', 'failed'
  external_id VARCHAR(255), -- Remote ID after sync
  error_message TEXT,

  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER
);

-- ============================================
-- ADD MARKETING SYNC COLUMNS TO CUSTOMERS
-- ============================================
ALTER TABLE customers ADD COLUMN IF NOT EXISTS mailchimp_id VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS mailchimp_synced_at TIMESTAMPTZ;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS hubspot_id VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS hubspot_synced_at TIMESTAMPTZ;

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_customer_segments_org ON customer_segments(organization_id);
CREATE INDEX idx_customer_segments_type ON customer_segments(segment_type);
CREATE INDEX idx_customer_segments_active ON customer_segments(is_active) WHERE is_active = true;
CREATE INDEX idx_segment_members_segment ON segment_members(segment_id);
CREATE INDEX idx_segment_members_customer ON segment_members(customer_id);
CREATE INDEX idx_marketing_sync_log_org ON marketing_sync_log(organization_id);
CREATE INDEX idx_marketing_sync_log_type ON marketing_sync_log(integration_type, sync_type);
CREATE INDEX idx_customers_mailchimp ON customers(mailchimp_id) WHERE mailchimp_id IS NOT NULL;
CREATE INDEX idx_customers_hubspot ON customers(hubspot_id) WHERE hubspot_id IS NOT NULL;

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE customer_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE segment_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their org segments"
  ON customer_segments FOR ALL
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can manage segment members for their org"
  ON segment_members FOR ALL
  USING (
    segment_id IN (
      SELECT id FROM customer_segments
      WHERE organization_id = get_user_organization_id()
    )
  )
  WITH CHECK (
    segment_id IN (
      SELECT id FROM customer_segments
      WHERE organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "Users can view their org marketing sync logs"
  ON marketing_sync_log FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "System can insert marketing sync logs"
  ON marketing_sync_log FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

-- ============================================
-- TRIGGER FOR UPDATED_AT
-- ============================================
CREATE TRIGGER update_customer_segments_updated_at
  BEFORE UPDATE ON customer_segments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
