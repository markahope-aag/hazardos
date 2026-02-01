-- ============================================
-- PHASE 7: PLATFORM EXTENSIBILITY
-- API keys, white-label, multi-location
-- ============================================

-- ============================================
-- API KEYS TABLE
-- ============================================
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Key identification
  name VARCHAR(100) NOT NULL,
  key_prefix VARCHAR(20) NOT NULL, -- First 8 chars for identification (hzd_live_)
  key_hash VARCHAR(255) NOT NULL, -- SHA-256 hash of full key

  -- Permissions
  scopes TEXT[] NOT NULL DEFAULT '{}', -- e.g., ['customers:read', 'jobs:write']

  -- Rate limiting
  rate_limit INTEGER DEFAULT 1000, -- Requests per hour
  rate_limit_reset_at TIMESTAMPTZ,
  rate_limit_count INTEGER DEFAULT 0,

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ, -- Optional expiration

  -- Tracking
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

-- ============================================
-- API REQUEST LOG TABLE
-- ============================================
CREATE TABLE api_request_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Request details
  method VARCHAR(10) NOT NULL,
  path TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  response_time_ms INTEGER,

  -- Client info
  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CUSTOM DOMAINS TABLE (white-label)
-- ============================================
CREATE TABLE custom_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Domain configuration
  domain VARCHAR(255) NOT NULL UNIQUE,
  verification_token VARCHAR(100) NOT NULL,

  -- Status
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  ssl_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'provisioning', 'active', 'failed'

  -- DNS records expected
  dns_records JSONB DEFAULT '[]',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- LOCATIONS TABLE (multi-location)
-- ============================================
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Location details
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20), -- Short code like "NYC", "LA", etc.

  -- Address
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(50),
  zip VARCHAR(20),
  country VARCHAR(100) DEFAULT 'US',

  -- Contact
  phone VARCHAR(50),
  email VARCHAR(255),

  -- Settings
  timezone VARCHAR(100) DEFAULT 'America/New_York',
  is_headquarters BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- LOCATION USERS TABLE
-- ============================================
CREATE TABLE location_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Assignment details
  is_primary BOOLEAN DEFAULT false, -- User's primary location
  can_manage BOOLEAN DEFAULT false, -- Can manage location settings

  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES profiles(id),

  UNIQUE(location_id, user_id)
);

-- ============================================
-- ADD WHITE-LABEL COLUMNS TO ORGANIZATIONS
-- ============================================
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS white_label_enabled BOOLEAN DEFAULT false;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS white_label_config JSONB DEFAULT '{}';

-- ============================================
-- ADD LOCATION_ID TO RELEVANT TABLES
-- ============================================
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id);
ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS default_location_id UUID REFERENCES locations(id);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_api_keys_org ON api_keys(organization_id);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX idx_api_keys_active ON api_keys(is_active) WHERE is_active = true;

CREATE INDEX idx_api_request_log_key ON api_request_log(api_key_id);
CREATE INDEX idx_api_request_log_org ON api_request_log(organization_id);
CREATE INDEX idx_api_request_log_created ON api_request_log(created_at);

CREATE INDEX idx_custom_domains_org ON custom_domains(organization_id);
CREATE INDEX idx_custom_domains_domain ON custom_domains(domain);

CREATE INDEX idx_locations_org ON locations(organization_id);
CREATE INDEX idx_locations_active ON locations(is_active) WHERE is_active = true;

CREATE INDEX idx_location_users_location ON location_users(location_id);
CREATE INDEX idx_location_users_user ON location_users(user_id);

CREATE INDEX idx_jobs_location ON jobs(location_id) WHERE location_id IS NOT NULL;
CREATE INDEX idx_site_surveys_location ON site_surveys(location_id) WHERE location_id IS NOT NULL;

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_request_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their org API keys"
  ON api_keys FOR ALL
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can view their org API request logs"
  ON api_request_log FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "System can insert API request logs"
  ON api_request_log FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can manage their org custom domains"
  ON custom_domains FOR ALL
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can manage their org locations"
  ON locations FOR ALL
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can manage location user assignments for their org"
  ON location_users FOR ALL
  USING (
    location_id IN (
      SELECT id FROM locations
      WHERE organization_id = get_user_organization_id()
    )
  )
  WITH CHECK (
    location_id IN (
      SELECT id FROM locations
      WHERE organization_id = get_user_organization_id()
    )
  );

-- ============================================
-- TRIGGERS
-- ============================================
CREATE TRIGGER update_custom_domains_updated_at
  BEFORE UPDATE ON custom_domains
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_locations_updated_at
  BEFORE UPDATE ON locations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
