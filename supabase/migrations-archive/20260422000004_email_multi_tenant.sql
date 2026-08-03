-- Multi-tenant email infrastructure.
--
-- Two tiers:
--   Default — every org sends as "<Tenant Name>" <no-reply@send.hazardos.app>
--             with Reply-To set to their configured contact email.
--   Verified — an org can add their own domain (e.g. acmeremediation.com);
--              once DNS is verified at the provider we start sending from
--              their real address. Better deliverability, branding, and
--              reputation isolation from other tenants.
--
-- The `email_sends` audit table records every transactional send so platform
-- admins can compute per-tenant bounce/complaint rates and auto-suspend any
-- tenant whose deliverability threatens shared-IP reputation.


-- ─── Organization email settings ─────────────────────────────────────────
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS email_from_name TEXT,
  ADD COLUMN IF NOT EXISTS email_reply_to TEXT,
  ADD COLUMN IF NOT EXISTS email_domain TEXT,
  ADD COLUMN IF NOT EXISTS email_domain_status TEXT
    CHECK (email_domain_status IS NULL OR email_domain_status IN ('pending', 'verified', 'failed')),
  ADD COLUMN IF NOT EXISTS email_domain_provider_id TEXT,
  ADD COLUMN IF NOT EXISTS email_domain_records JSONB,
  ADD COLUMN IF NOT EXISTS email_domain_verified_at TIMESTAMPTZ;


-- ─── Per-send audit log ──────────────────────────────────────────────────
-- Every transactional email is a row here. We keep the provider_id so
-- webhooks can update the row when bounces, complaints, opens, and clicks
-- come in. Status transitions: queued → sent → (delivered|bounced|complained).
CREATE TABLE IF NOT EXISTS email_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Who triggered the send (null for system-triggered sends like cron reminders)
  sent_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- The email itself
  to_email TEXT NOT NULL,
  cc TEXT[],
  bcc TEXT[],
  reply_to TEXT,
  from_email TEXT NOT NULL,
  from_name TEXT,
  subject TEXT NOT NULL,

  -- Provider + status
  provider TEXT NOT NULL DEFAULT 'resend',
  provider_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'sent', 'delivered', 'bounced', 'complained', 'failed')),
  error_message TEXT,

  -- Lifecycle timestamps, stamped by the provider webhook
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  complained_at TIMESTAMPTZ,
  first_opened_at TIMESTAMPTZ,
  last_opened_at TIMESTAMPTZ,
  open_count INTEGER DEFAULT 0,
  first_clicked_at TIMESTAMPTZ,
  click_count INTEGER DEFAULT 0,

  -- What this email is about — both optional; the rich variant lets us
  -- thread email activity into contact/job/invoice timelines.
  related_entity_type TEXT,
  related_entity_id UUID,

  -- Tagging for analytics (category/campaign). Free-text so callers
  -- can add new kinds of sends without schema churn.
  tags TEXT[],

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_sends_org ON email_sends(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_sends_provider_id ON email_sends(provider_message_id) WHERE provider_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_sends_entity ON email_sends(related_entity_type, related_entity_id) WHERE related_entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_sends_status ON email_sends(organization_id, status, created_at DESC);

ALTER TABLE email_sends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their org email sends" ON email_sends;
CREATE POLICY "Users can view their org email sends"
  ON email_sends FOR SELECT
  USING (organization_id = get_user_organization_id());

-- Inserts and updates happen through service-role server code (the
-- EmailService and webhook handler). No direct client insert/update.
DROP POLICY IF EXISTS "Service role manages email sends" ON email_sends;
CREATE POLICY "Service role manages email sends"
  ON email_sends FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ─── Keep updated_at fresh on the audit rows ─────────────────────────────
CREATE OR REPLACE FUNCTION touch_email_sends_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_email_sends_updated_at ON email_sends;
CREATE TRIGGER trg_email_sends_updated_at
  BEFORE UPDATE ON email_sends
  FOR EACH ROW
  EXECUTE FUNCTION touch_email_sends_updated_at();
