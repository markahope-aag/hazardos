-- ============================================
-- PLATFORM BILLING TABLES
-- Phase 5: SaaS Platform Infrastructure
-- ============================================

-- Subscription plans (defined by platform owner)
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Plan details
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL, -- starter, pro, enterprise
  description TEXT,

  -- Pricing (in cents)
  price_monthly INTEGER NOT NULL,
  price_yearly INTEGER, -- discounted yearly price

  -- Stripe IDs
  stripe_product_id VARCHAR(100),
  stripe_price_id_monthly VARCHAR(100),
  stripe_price_id_yearly VARCHAR(100),

  -- Limits
  max_users INTEGER, -- NULL = unlimited
  max_jobs_per_month INTEGER,
  max_storage_gb INTEGER,

  -- Features (JSON for flexibility)
  features JSONB DEFAULT '[]',
  feature_flags JSONB DEFAULT '{}', -- { "quickbooks": true, "api_access": false }

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT true, -- show on pricing page
  display_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization subscriptions
CREATE TABLE IF NOT EXISTS organization_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),

  -- Stripe IDs
  stripe_customer_id VARCHAR(100),
  stripe_subscription_id VARCHAR(100),

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'trialing',
  -- trialing, active, past_due, canceled, unpaid, incomplete

  -- Billing cycle
  billing_cycle VARCHAR(20) DEFAULT 'monthly', -- monthly, yearly
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,

  -- Trial
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,

  -- Cancellation
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,
  cancellation_reason TEXT,

  -- Usage (for metered billing)
  users_count INTEGER DEFAULT 1,
  jobs_this_month INTEGER DEFAULT 0,
  storage_used_mb INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id)
);

-- Billing history / invoices from Stripe
CREATE TABLE IF NOT EXISTS billing_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES organization_subscriptions(id),

  -- Stripe IDs
  stripe_invoice_id VARCHAR(100) UNIQUE,
  stripe_payment_intent_id VARCHAR(100),

  -- Invoice details
  invoice_number VARCHAR(50),
  status VARCHAR(50), -- draft, open, paid, void, uncollectible

  -- Amounts (cents)
  subtotal INTEGER,
  tax INTEGER,
  total INTEGER,
  amount_paid INTEGER,
  amount_due INTEGER,

  -- Dates
  invoice_date TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,

  -- URLs
  invoice_pdf_url TEXT,
  hosted_invoice_url TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment methods
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Stripe ID
  stripe_payment_method_id VARCHAR(100) UNIQUE,

  -- Card details (from Stripe, safe to store)
  card_brand VARCHAR(50), -- visa, mastercard, amex
  card_last4 VARCHAR(4),
  card_exp_month INTEGER,
  card_exp_year INTEGER,

  -- Status
  is_default BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stripe webhook events (for idempotency)
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id VARCHAR(100) UNIQUE NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  payload JSONB
);

-- ============================================
-- UPDATE ORGANIZATIONS TABLE
-- ============================================
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(100);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'trialing';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN DEFAULT false;

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON organization_subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON organization_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON organization_subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_org ON billing_invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe ON billing_invoices(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_org ON payment_methods(organization_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_stripe ON stripe_webhook_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_plans_slug ON subscription_plans(slug);
CREATE INDEX IF NOT EXISTS idx_plans_active ON subscription_plans(is_active, is_public);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- Plans are readable by all authenticated users
CREATE POLICY "Plans are publicly readable"
  ON subscription_plans FOR SELECT
  USING (is_active = true AND is_public = true);

-- Platform admins can manage plans
CREATE POLICY "Platform admins can manage plans"
  ON subscription_plans FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organizations o
      JOIN profiles p ON p.organization_id = o.id
      WHERE p.id = auth.uid() AND o.is_platform_admin = true
    )
  );

-- Subscriptions - org members can view their own
CREATE POLICY "Users can view their org subscription"
  ON organization_subscriptions FOR SELECT
  USING (organization_id = get_user_organization_id());

-- Invoices - org members can view their own
CREATE POLICY "Users can view their org invoices"
  ON billing_invoices FOR SELECT
  USING (organization_id = get_user_organization_id());

-- Payment methods - org admins only
CREATE POLICY "Admins can view payment methods"
  ON payment_methods FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Admins can manage payment methods"
  ON payment_methods FOR ALL
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin', 'tenant_owner')
    )
  );

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Increment jobs count for an organization
CREATE OR REPLACE FUNCTION increment_jobs_count(org_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE organization_subscriptions
  SET jobs_this_month = jobs_this_month + 1,
      updated_at = NOW()
  WHERE organization_id = org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reset monthly job counts (run via cron)
CREATE OR REPLACE FUNCTION reset_monthly_job_counts()
RETURNS VOID AS $$
BEGIN
  UPDATE organization_subscriptions
  SET jobs_this_month = 0,
      updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update users count for an organization
CREATE OR REPLACE FUNCTION update_org_users_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE organization_subscriptions
  SET users_count = (
    SELECT COUNT(*) FROM profiles WHERE organization_id = COALESCE(NEW.organization_id, OLD.organization_id)
  ),
  updated_at = NOW()
  WHERE organization_id = COALESCE(NEW.organization_id, OLD.organization_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_users_count_on_profile_change
  AFTER INSERT OR DELETE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_org_users_count();

-- ============================================
-- INSERT DEFAULT PLANS
-- ============================================
INSERT INTO subscription_plans (name, slug, description, price_monthly, price_yearly, max_users, max_jobs_per_month, max_storage_gb, features, feature_flags, display_order) VALUES
('Starter', 'starter', 'Perfect for small operations', 9900, 99900, 3, 50, 5,
  '["Customer management", "Site surveys", "Estimates & proposals", "Job scheduling", "Invoicing"]'::jsonb,
  '{"quickbooks": false, "api_access": false, "custom_branding": false, "advanced_reporting": false, "priority_support": false}'::jsonb, 1),
('Professional', 'pro', 'For growing businesses', 19900, 199900, 10, 200, 25,
  '["Everything in Starter", "QuickBooks integration", "Customer feedback", "Advanced reporting", "Priority support"]'::jsonb,
  '{"quickbooks": true, "api_access": false, "custom_branding": true, "advanced_reporting": true, "priority_support": true}'::jsonb, 2),
('Enterprise', 'enterprise', 'For large operations', 49900, 499900, NULL, NULL, 100,
  '["Everything in Professional", "Unlimited users", "Unlimited jobs", "API access", "Custom integrations", "Dedicated support"]'::jsonb,
  '{"quickbooks": true, "api_access": true, "custom_branding": true, "advanced_reporting": true, "priority_support": true}'::jsonb, 3)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  max_users = EXCLUDED.max_users,
  max_jobs_per_month = EXCLUDED.max_jobs_per_month,
  max_storage_gb = EXCLUDED.max_storage_gb,
  features = EXCLUDED.features,
  feature_flags = EXCLUDED.feature_flags,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================
CREATE TRIGGER set_subscription_plans_updated_at
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_organization_subscriptions_updated_at
  BEFORE UPDATE ON organization_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
