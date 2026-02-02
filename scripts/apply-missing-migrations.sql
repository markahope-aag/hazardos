-- ============================================
-- CONSOLIDATED MISSING MIGRATIONS
-- Run this in Supabase Dashboard -> SQL Editor
-- ============================================

-- ============================================
-- 1. NOTIFICATIONS SYSTEM
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  entity_type VARCHAR(50),
  entity_id UUID,
  action_url TEXT,
  action_label VARCHAR(100),
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  priority VARCHAR(20) DEFAULT 'normal',
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL,
  in_app BOOLEAN DEFAULT TRUE,
  email BOOLEAN DEFAULT TRUE,
  push BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, notification_type)
);

-- ============================================
-- 2. API KEYS
-- ============================================
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  key_prefix VARCHAR(10) NOT NULL,
  key_hash VARCHAR(64) NOT NULL,
  scopes TEXT[] DEFAULT '{}',
  rate_limit INTEGER DEFAULT 1000,
  rate_limit_count INTEGER DEFAULT 0,
  rate_limit_reset_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- ============================================
-- 3. BILLING
-- ============================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  price_monthly INTEGER NOT NULL,
  price_yearly INTEGER,
  stripe_price_id_monthly VARCHAR(100),
  stripe_price_id_yearly VARCHAR(100),
  features JSONB DEFAULT '[]',
  limits JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  is_public BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS billing_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_invoice_id VARCHAR(100),
  invoice_number VARCHAR(50),
  status VARCHAR(50) DEFAULT 'draft',
  subtotal INTEGER DEFAULT 0,
  tax INTEGER DEFAULT 0,
  total INTEGER DEFAULT 0,
  amount_paid INTEGER DEFAULT 0,
  amount_due INTEGER DEFAULT 0,
  invoice_date DATE,
  due_date DATE,
  paid_at TIMESTAMPTZ,
  invoice_pdf_url TEXT,
  hosted_invoice_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. JOB COMPLETION TRACKING
-- ============================================
CREATE TABLE IF NOT EXISTS job_time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id),
  work_date DATE NOT NULL,
  hours DECIMAL(5,2) NOT NULL,
  work_type VARCHAR(50) DEFAULT 'regular',
  hourly_rate DECIMAL(10,2),
  billable BOOLEAN DEFAULT TRUE,
  description TEXT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_completion_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  thumbnail_url TEXT,
  storage_path TEXT NOT NULL,
  photo_type VARCHAR(50) DEFAULT 'documentation',
  caption TEXT,
  taken_at TIMESTAMPTZ,
  location_lat DECIMAL(10,8),
  location_lng DECIMAL(11,8),
  camera_make VARCHAR(100),
  camera_model VARCHAR(100),
  image_width INTEGER,
  image_height INTEGER,
  file_name VARCHAR(255),
  file_size INTEGER,
  mime_type VARCHAR(100),
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. SMS SYSTEM
-- ============================================
CREATE TABLE IF NOT EXISTS organization_sms_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  sms_enabled BOOLEAN DEFAULT FALSE,
  use_platform_twilio BOOLEAN DEFAULT TRUE,
  twilio_account_sid VARCHAR(100),
  twilio_auth_token TEXT,
  twilio_phone_number VARCHAR(20),
  appointment_reminders_enabled BOOLEAN DEFAULT TRUE,
  job_status_updates_enabled BOOLEAN DEFAULT TRUE,
  lead_notifications_enabled BOOLEAN DEFAULT TRUE,
  quiet_hours_enabled BOOLEAN DEFAULT FALSE,
  quiet_hours_start TIME DEFAULT '21:00',
  quiet_hours_end TIME DEFAULT '08:00',
  timezone VARCHAR(50) DEFAULT 'America/Chicago',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  to_phone VARCHAR(20) NOT NULL,
  message_type VARCHAR(50) NOT NULL,
  body TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'queued',
  twilio_message_sid VARCHAR(100),
  segments INTEGER DEFAULT 1,
  cost DECIMAL(10,4),
  error_code VARCHAR(20),
  error_message TEXT,
  related_entity_type VARCHAR(50),
  related_entity_id UUID,
  queued_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. PERFORMANCE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_org ON notifications(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash, key_prefix);
CREATE INDEX IF NOT EXISTS idx_job_time_entries_job ON job_time_entries(job_id, work_date);
CREATE INDEX IF NOT EXISTS idx_job_completion_photos_job ON job_completion_photos(job_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sms_messages_org ON sms_messages(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_org_status ON customers(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_jobs_status_date ON jobs(organization_id, status, scheduled_date);

-- ============================================
-- 7. RLS POLICIES
-- ============================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_completion_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_sms_settings ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (users can access their org's data)
CREATE POLICY IF NOT EXISTS "notifications_org_access" ON notifications
  FOR ALL USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS "notification_preferences_user" ON notification_preferences
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "api_keys_org_access" ON api_keys
  FOR ALL USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS "billing_invoices_org_access" ON billing_invoices
  FOR ALL USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS "job_time_entries_org_access" ON job_time_entries
  FOR ALL USING (job_id IN (SELECT id FROM jobs WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY IF NOT EXISTS "job_completion_photos_org_access" ON job_completion_photos
  FOR ALL USING (job_id IN (SELECT id FROM jobs WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY IF NOT EXISTS "sms_messages_org_access" ON sms_messages
  FOR ALL USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS "sms_settings_org_access" ON organization_sms_settings
  FOR ALL USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
