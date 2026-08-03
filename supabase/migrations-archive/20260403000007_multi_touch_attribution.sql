-- ============================================
-- Multi-touch attribution model
-- ============================================

-- 1. Opportunities: three-touch attribution
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS first_touch_source TEXT;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS first_touch_medium TEXT;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS first_touch_campaign TEXT;

ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS last_touch_source TEXT;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS last_touch_medium TEXT;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS last_touch_campaign TEXT;

ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS converting_touch_source TEXT;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS converting_touch_medium TEXT;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS converting_touch_campaign TEXT;

-- Rename existing utm fields to be explicit first-touch (they were first-touch by design)
-- Keep the old columns as aliases for backward compat, populate new ones from them
UPDATE opportunities
SET
  first_touch_source = COALESCE(first_touch_source, utm_source),
  first_touch_medium = COALESCE(first_touch_medium, utm_medium),
  first_touch_campaign = COALESCE(first_touch_campaign, utm_campaign)
WHERE utm_source IS NOT NULL OR utm_medium IS NOT NULL OR utm_campaign IS NOT NULL;

-- 2. Jobs: inherit full attribution chain + add multi-touch
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS first_touch_source TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS first_touch_medium TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS first_touch_campaign TEXT;

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS last_touch_source TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS last_touch_medium TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS last_touch_campaign TEXT;

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS converting_touch_source TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS converting_touch_medium TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS converting_touch_campaign TEXT;

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS attributed_lead_source TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS attributed_lead_source_detail TEXT;

-- 3. Contacts: add last_touch and converting_touch
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_touch_source TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_touch_medium TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_touch_campaign TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_touch_date DATE;

ALTER TABLE customers ADD COLUMN IF NOT EXISTS converting_touch_source TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS converting_touch_medium TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS converting_touch_campaign TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS converting_touch_date DATE;

-- 4. Companies: add last_touch and converting_touch
ALTER TABLE companies ADD COLUMN IF NOT EXISTS last_touch_source TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS last_touch_medium TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS last_touch_campaign TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS last_touch_date DATE;

ALTER TABLE companies ADD COLUMN IF NOT EXISTS converting_touch_source TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS converting_touch_medium TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS converting_touch_campaign TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS converting_touch_date DATE;

-- 5. Attribution touchpoints log — records every interaction for full journey
CREATE TABLE IF NOT EXISTS attribution_touchpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- What entity does this touch belong to
  entity_type TEXT NOT NULL CHECK (entity_type IN ('contact', 'company', 'opportunity', 'job')),
  entity_id UUID NOT NULL,

  -- Touch details
  touch_type TEXT NOT NULL CHECK (touch_type IN ('first_touch', 'last_touch', 'converting_touch', 'nurture_touch')),
  source TEXT,
  medium TEXT,
  campaign TEXT,
  content TEXT,         -- ad content / variant
  term TEXT,            -- search keyword
  referrer_url TEXT,
  landing_page TEXT,

  -- Referral-specific
  referred_by_contact_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  referred_by_company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  referred_by_job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,

  -- Context
  channel TEXT,         -- web, phone, email, in_person, social, event
  notes TEXT,
  touched_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_touchpoints_entity ON attribution_touchpoints(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_touchpoints_org ON attribution_touchpoints(organization_id);
CREATE INDEX IF NOT EXISTS idx_touchpoints_source ON attribution_touchpoints(organization_id, source) WHERE source IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_touchpoints_channel ON attribution_touchpoints(organization_id, channel) WHERE channel IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_touchpoints_date ON attribution_touchpoints(touched_at);

-- RLS
ALTER TABLE attribution_touchpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org access attribution_touchpoints" ON attribution_touchpoints FOR ALL
  USING (organization_id = get_user_organization_id());

GRANT ALL ON attribution_touchpoints TO authenticated;
GRANT ALL ON attribution_touchpoints TO service_role;

-- 6. Function: inherit attribution from contact/company → opportunity
CREATE OR REPLACE FUNCTION inherit_opportunity_attribution()
RETURNS TRIGGER AS $$
DECLARE
  v_contact RECORD;
  v_company RECORD;
BEGIN
  -- Only on insert, and only if first_touch fields are empty
  IF TG_OP = 'INSERT' AND NEW.first_touch_source IS NULL THEN
    -- Try contact first
    IF NEW.customer_id IS NOT NULL THEN
      SELECT lead_source, lead_source_detail, utm_source, utm_medium, utm_campaign, first_touch_date
      INTO v_contact
      FROM customers WHERE id = NEW.customer_id;

      NEW.lead_source := COALESCE(NEW.lead_source, v_contact.lead_source);
      NEW.lead_source_detail := COALESCE(NEW.lead_source_detail, v_contact.lead_source_detail);
      NEW.first_touch_source := COALESCE(NEW.first_touch_source, v_contact.utm_source);
      NEW.first_touch_medium := COALESCE(NEW.first_touch_medium, v_contact.utm_medium);
      NEW.first_touch_campaign := COALESCE(NEW.first_touch_campaign, v_contact.utm_campaign);
      NEW.first_touch_date := COALESCE(NEW.first_touch_date, v_contact.first_touch_date);
    END IF;

    -- Then try company (fills any remaining gaps)
    IF NEW.company_id IS NOT NULL THEN
      SELECT lead_source, lead_source_detail, utm_source, utm_medium, utm_campaign, first_touch_date
      INTO v_company
      FROM companies WHERE id = NEW.company_id;

      NEW.lead_source := COALESCE(NEW.lead_source, v_company.lead_source);
      NEW.lead_source_detail := COALESCE(NEW.lead_source_detail, v_company.lead_source_detail);
      NEW.first_touch_source := COALESCE(NEW.first_touch_source, v_company.utm_source);
      NEW.first_touch_medium := COALESCE(NEW.first_touch_medium, v_company.utm_medium);
      NEW.first_touch_campaign := COALESCE(NEW.first_touch_campaign, v_company.utm_campaign);
      NEW.first_touch_date := COALESCE(NEW.first_touch_date, v_company.first_touch_date);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS inherit_opp_attribution ON opportunities;
CREATE TRIGGER inherit_opp_attribution
  BEFORE INSERT ON opportunities
  FOR EACH ROW
  EXECUTE FUNCTION inherit_opportunity_attribution();

-- 7. Function: inherit attribution from opportunity → job
CREATE OR REPLACE FUNCTION inherit_job_attribution()
RETURNS TRIGGER AS $$
DECLARE
  v_opp RECORD;
BEGIN
  -- Only on insert, and only if attribution fields are empty
  IF TG_OP = 'INSERT' AND NEW.first_touch_source IS NULL AND NEW.opportunity_id IS NOT NULL THEN
    SELECT
      lead_source, lead_source_detail,
      first_touch_source, first_touch_medium, first_touch_campaign,
      last_touch_source, last_touch_medium, last_touch_campaign,
      converting_touch_source, converting_touch_medium, converting_touch_campaign,
      first_touch_date
    INTO v_opp
    FROM opportunities WHERE id = NEW.opportunity_id;

    NEW.lead_source := COALESCE(NEW.lead_source, v_opp.lead_source);
    NEW.attributed_lead_source := COALESCE(NEW.attributed_lead_source, v_opp.lead_source);
    NEW.attributed_lead_source_detail := COALESCE(NEW.attributed_lead_source_detail, v_opp.lead_source_detail);
    NEW.first_touch_source := v_opp.first_touch_source;
    NEW.first_touch_medium := v_opp.first_touch_medium;
    NEW.first_touch_campaign := v_opp.first_touch_campaign;
    NEW.last_touch_source := v_opp.last_touch_source;
    NEW.last_touch_medium := v_opp.last_touch_medium;
    NEW.last_touch_campaign := v_opp.last_touch_campaign;
    NEW.converting_touch_source := v_opp.converting_touch_source;
    NEW.converting_touch_medium := v_opp.converting_touch_medium;
    NEW.converting_touch_campaign := v_opp.converting_touch_campaign;
  END IF;

  -- Inherit company from opportunity if not set
  IF NEW.company_id IS NULL AND NEW.opportunity_id IS NOT NULL THEN
    SELECT company_id INTO NEW.company_id FROM opportunities WHERE id = NEW.opportunity_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS inherit_job_attribution ON jobs;
CREATE TRIGGER inherit_job_attribution
  BEFORE INSERT ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION inherit_job_attribution();
