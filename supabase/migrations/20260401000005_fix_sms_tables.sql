-- ============================================================================
-- FIX: Recreate SMS tables that failed to create from original migration
-- The 20260301000005_sms.sql migration was marked as applied but the tables
-- were not actually created (likely failed on CREATE TYPE conflicts).
-- ============================================================================

-- Recreate enums safely
DO $$ BEGIN
  CREATE TYPE sms_status AS ENUM (
    'queued', 'sending', 'sent', 'delivered', 'failed', 'undelivered'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE sms_message_type AS ENUM (
    'appointment_reminder',
    'job_status',
    'lead_notification',
    'payment_reminder',
    'estimate_follow_up',
    'general'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Organization SMS Settings
CREATE TABLE IF NOT EXISTS organization_sms_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  twilio_account_sid TEXT,
  twilio_auth_token TEXT,
  twilio_phone_number TEXT,
  use_platform_twilio BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  appointment_reminders_enabled BOOLEAN DEFAULT true,
  appointment_reminder_hours INTEGER DEFAULT 24,
  job_status_updates_enabled BOOLEAN DEFAULT true,
  lead_notifications_enabled BOOLEAN DEFAULT true,
  payment_reminders_enabled BOOLEAN DEFAULT false,
  quiet_hours_enabled BOOLEAN DEFAULT true,
  quiet_hours_start TIME DEFAULT '21:00',
  quiet_hours_end TIME DEFAULT '08:00',
  timezone VARCHAR(50) DEFAULT 'America/Chicago',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id)
);

-- Customer SMS preferences
ALTER TABLE customers ADD COLUMN IF NOT EXISTS sms_opt_in BOOLEAN DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS sms_opt_in_at TIMESTAMPTZ;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS sms_opt_out_at TIMESTAMPTZ;

-- SMS Messages log
CREATE TABLE IF NOT EXISTS sms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  to_phone VARCHAR(20) NOT NULL,
  message_type sms_message_type NOT NULL,
  body TEXT NOT NULL,
  related_entity_type VARCHAR(50),
  related_entity_id UUID,
  twilio_message_sid VARCHAR(50),
  status sms_status DEFAULT 'queued',
  error_code VARCHAR(20),
  error_message TEXT,
  queued_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  segments INTEGER DEFAULT 1,
  cost DECIMAL(10,4)
);

-- SMS Templates
CREATE TABLE IF NOT EXISTS sms_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  message_type sms_message_type NOT NULL,
  body TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sms_settings_org ON organization_sms_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_org ON sms_messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_customer ON sms_messages(customer_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_status ON sms_messages(status);
CREATE INDEX IF NOT EXISTS idx_sms_messages_type ON sms_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_sms_messages_twilio_sid ON sms_messages(twilio_message_sid);
CREATE INDEX IF NOT EXISTS idx_sms_templates_org ON sms_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_sms_templates_type ON sms_templates(message_type);

-- RLS
ALTER TABLE organization_sms_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;

-- Policies (use DROP IF EXISTS to avoid conflicts)
DROP POLICY IF EXISTS "Users can manage their org SMS settings" ON organization_sms_settings;
CREATE POLICY "Users can manage their org SMS settings"
  ON organization_sms_settings FOR ALL
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can manage their org SMS messages" ON sms_messages;
CREATE POLICY "Users can manage their org SMS messages"
  ON sms_messages FOR ALL
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can view system and org SMS templates" ON sms_templates;
CREATE POLICY "Users can view system and org SMS templates"
  ON sms_templates FOR SELECT
  USING (organization_id IS NULL OR organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can manage their org SMS templates" ON sms_templates;
CREATE POLICY "Users can manage their org SMS templates"
  ON sms_templates FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can update their org SMS templates" ON sms_templates;
CREATE POLICY "Users can update their org SMS templates"
  ON sms_templates FOR UPDATE
  USING (organization_id = get_user_organization_id() AND is_system = false)
  WITH CHECK (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can delete their org SMS templates" ON sms_templates;
CREATE POLICY "Users can delete their org SMS templates"
  ON sms_templates FOR DELETE
  USING (organization_id = get_user_organization_id() AND is_system = false);

-- Service role access for webhooks (service_role bypasses RLS, but let's
-- also allow platform users to view all SMS data)
DROP POLICY IF EXISTS "Platform users can view all SMS settings" ON organization_sms_settings;
CREATE POLICY "Platform users can view all SMS settings"
  ON organization_sms_settings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('platform_owner', 'platform_admin')
  ));

DROP POLICY IF EXISTS "Platform users can view all SMS messages" ON sms_messages;
CREATE POLICY "Platform users can view all SMS messages"
  ON sms_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('platform_owner', 'platform_admin')
  ));

-- Seed system templates (only if not already present)
INSERT INTO sms_templates (organization_id, name, message_type, body, is_system)
SELECT NULL, 'Appointment Reminder', 'appointment_reminder',
  'Hi {{customer_name}}! Reminder: {{company_name}} is scheduled for {{job_date}} at {{job_time}}. Reply STOP to opt out.', true
WHERE NOT EXISTS (SELECT 1 FROM sms_templates WHERE is_system = true AND message_type = 'appointment_reminder');

INSERT INTO sms_templates (organization_id, name, message_type, body, is_system)
SELECT NULL, 'Crew En Route', 'job_status',
  '{{company_name}}: Our crew is on the way! ETA: {{eta}}. Questions? Call {{company_phone}}', true
WHERE NOT EXISTS (SELECT 1 FROM sms_templates WHERE is_system = true AND message_type = 'job_status');

INSERT INTO sms_templates (organization_id, name, message_type, body, is_system)
SELECT NULL, 'New Lead Response', 'lead_notification',
  'Hi {{customer_name}}! Thanks for contacting {{company_name}}. We''ll reach out within {{response_time}} to discuss your project. Reply STOP to opt out.', true
WHERE NOT EXISTS (SELECT 1 FROM sms_templates WHERE is_system = true AND message_type = 'lead_notification');

INSERT INTO sms_templates (organization_id, name, message_type, body, is_system)
SELECT NULL, 'Estimate Follow-up', 'estimate_follow_up',
  'Hi {{customer_name}}! Following up on your estimate from {{company_name}}. Questions? Reply or call {{company_phone}}. Reply STOP to opt out.', true
WHERE NOT EXISTS (SELECT 1 FROM sms_templates WHERE is_system = true AND message_type = 'estimate_follow_up');

INSERT INTO sms_templates (organization_id, name, message_type, body, is_system)
SELECT NULL, 'Payment Reminder', 'payment_reminder',
  '{{company_name}}: Reminder - Invoice #{{invoice_number}} for ${{amount}} is due {{due_date}}. Reply STOP to opt out.', true
WHERE NOT EXISTS (SELECT 1 FROM sms_templates WHERE is_system = true AND message_type = 'payment_reminder');
