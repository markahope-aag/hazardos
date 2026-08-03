-- ============================================
-- ACTIVITY LOG TABLE
-- ============================================
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Actor
  user_id UUID REFERENCES profiles(id),
  user_name VARCHAR(255),

  -- Action details
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID NOT NULL,
  entity_name VARCHAR(255),

  -- Change details
  old_values JSONB,
  new_values JSONB,
  description TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_activity_log_org ON activity_log(organization_id);
CREATE INDEX idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_log_created ON activity_log(created_at DESC);
CREATE INDEX idx_activity_log_user ON activity_log(user_id);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org activity"
  ON activity_log FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can create activity logs"
  ON activity_log FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());
