-- ============================================
-- ORGANIZATION INTEGRATIONS TABLE
-- ============================================
CREATE TABLE organization_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Integration type
  integration_type VARCHAR(50) NOT NULL, -- 'quickbooks', 'stripe', etc.

  -- OAuth tokens (encrypted in production)
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,

  -- External reference
  external_id VARCHAR(255), -- QuickBooks realmId, Stripe account ID, etc.

  -- Status
  is_active BOOLEAN DEFAULT false,
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,

  -- Settings specific to integration
  settings JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, integration_type)
);

-- ============================================
-- ADD QB SYNC COLUMNS TO EXISTING TABLES
-- ============================================

-- Customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS qb_customer_id VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS qb_synced_at TIMESTAMPTZ;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS qb_sync_error TEXT;

-- ============================================
-- SYNC LOG TABLE
-- ============================================
CREATE TABLE integration_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  integration_type VARCHAR(50) NOT NULL,

  -- Sync details
  sync_type VARCHAR(50) NOT NULL, -- 'customer', 'invoice', 'payment', 'full'
  direction VARCHAR(20) NOT NULL, -- 'push', 'pull', 'both'

  -- Results
  status VARCHAR(50) NOT NULL, -- 'success', 'partial', 'failed'
  records_processed INTEGER DEFAULT 0,
  records_succeeded INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,

  -- Errors
  errors JSONB DEFAULT '[]',

  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_org_integrations_org ON organization_integrations(organization_id);
CREATE INDEX idx_org_integrations_type ON organization_integrations(integration_type);
CREATE INDEX idx_customers_qb ON customers(qb_customer_id) WHERE qb_customer_id IS NOT NULL;
CREATE INDEX idx_sync_log_org ON integration_sync_log(organization_id);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE organization_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their org integrations"
  ON organization_integrations FOR ALL
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can view their org sync logs"
  ON integration_sync_log FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "System can insert sync logs"
  ON integration_sync_log FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());
