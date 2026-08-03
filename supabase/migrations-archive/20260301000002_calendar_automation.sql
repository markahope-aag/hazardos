-- ============================================
-- PHASE 7: CALENDAR & AUTOMATION
-- Calendar sync, webhooks, lead capture
-- ============================================

-- ============================================
-- CALENDAR SYNC EVENTS TABLE
-- ============================================
CREATE TABLE calendar_sync_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Event details
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- 'job', 'site_survey', 'follow_up'

  -- External calendar references
  google_event_id VARCHAR(255),
  outlook_event_id VARCHAR(255),

  -- Sync tracking
  calendar_type VARCHAR(50) NOT NULL, -- 'google', 'outlook'
  last_synced_at TIMESTAMPTZ,
  sync_error TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- WEBHOOKS TABLE (outgoing)
-- ============================================
CREATE TABLE webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Webhook configuration
  name VARCHAR(100) NOT NULL,
  url TEXT NOT NULL,
  secret VARCHAR(255), -- For HMAC signature verification

  -- Events to trigger on
  events TEXT[] NOT NULL DEFAULT '{}', -- Array of event types

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  failure_count INTEGER DEFAULT 0,

  -- Headers (optional)
  headers JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- WEBHOOK DELIVERIES TABLE
-- ============================================
CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Delivery details
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,

  -- Response tracking
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'success', 'failed'
  status_code INTEGER,
  response_body TEXT,
  error_message TEXT,

  -- Retry tracking
  attempt_count INTEGER DEFAULT 0,
  next_retry_at TIMESTAMPTZ,

  -- Timing
  created_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ
);

-- ============================================
-- LEAD WEBHOOK ENDPOINTS TABLE (incoming)
-- ============================================
CREATE TABLE lead_webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Endpoint configuration
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) NOT NULL, -- URL path identifier
  provider VARCHAR(50) NOT NULL, -- 'homeadvisor', 'thumbtack', 'angi', 'custom'

  -- Authentication
  api_key VARCHAR(255), -- For custom integrations
  secret VARCHAR(255), -- For signature verification

  -- Mapping configuration
  field_mapping JSONB DEFAULT '{}', -- Map provider fields to HazardOS fields

  -- Status
  is_active BOOLEAN DEFAULT true,
  leads_received INTEGER DEFAULT 0,
  last_lead_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, slug)
);

-- ============================================
-- LEAD WEBHOOK LOG TABLE
-- ============================================
CREATE TABLE lead_webhook_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id UUID NOT NULL REFERENCES lead_webhook_endpoints(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Request details
  raw_payload JSONB NOT NULL,
  headers JSONB,
  ip_address INET,

  -- Processing status
  status VARCHAR(20) NOT NULL, -- 'success', 'failed', 'duplicate'
  error_message TEXT,

  -- Created customer/lead
  customer_id UUID REFERENCES customers(id),
  opportunity_id UUID REFERENCES opportunities(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_calendar_sync_org ON calendar_sync_events(organization_id);
CREATE INDEX idx_calendar_sync_job ON calendar_sync_events(job_id);
CREATE INDEX idx_calendar_sync_google ON calendar_sync_events(google_event_id) WHERE google_event_id IS NOT NULL;
CREATE INDEX idx_calendar_sync_outlook ON calendar_sync_events(outlook_event_id) WHERE outlook_event_id IS NOT NULL;

CREATE INDEX idx_webhooks_org ON webhooks(organization_id);
CREATE INDEX idx_webhooks_active ON webhooks(is_active) WHERE is_active = true;

CREATE INDEX idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX idx_webhook_deliveries_retry ON webhook_deliveries(next_retry_at) WHERE status = 'failed';

CREATE INDEX idx_lead_endpoints_org ON lead_webhook_endpoints(organization_id);
CREATE INDEX idx_lead_endpoints_slug ON lead_webhook_endpoints(slug);

CREATE INDEX idx_lead_log_endpoint ON lead_webhook_log(endpoint_id);
CREATE INDEX idx_lead_log_status ON lead_webhook_log(status);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE calendar_sync_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_webhook_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their org calendar events"
  ON calendar_sync_events FOR ALL
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can manage their org webhooks"
  ON webhooks FOR ALL
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can view their org webhook deliveries"
  ON webhook_deliveries FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "System can manage webhook deliveries"
  ON webhook_deliveries FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can manage their org lead endpoints"
  ON lead_webhook_endpoints FOR ALL
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can view their org lead logs"
  ON lead_webhook_log FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "System can insert lead logs"
  ON lead_webhook_log FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

-- ============================================
-- TRIGGERS
-- ============================================
CREATE TRIGGER update_calendar_sync_events_updated_at
  BEFORE UPDATE ON calendar_sync_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_webhooks_updated_at
  BEFORE UPDATE ON webhooks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lead_endpoints_updated_at
  BEFORE UPDATE ON lead_webhook_endpoints
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
