-- ============================================
-- Enhance opportunities table with full CRM fields
-- ============================================

-- Property type enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'property_type') THEN
    CREATE TYPE property_type AS ENUM (
      'residential_single_family',
      'residential_multi_family',
      'commercial',
      'industrial',
      'government'
    );
  END IF;
END $$;

-- Urgency enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'urgency_level') THEN
    CREATE TYPE urgency_level AS ENUM (
      'routine',
      'urgent',
      'emergency'
    );
  END IF;
END $$;

-- Regulatory trigger enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'regulatory_trigger') THEN
    CREATE TYPE regulatory_trigger AS ENUM (
      'inspection_required',
      'sale_pending',
      'tenant_complaint',
      'insurance_claim',
      'voluntary'
    );
  END IF;
END $$;

-- Opportunity status (richer than just pipeline stage)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'opportunity_status') THEN
    CREATE TYPE opportunity_status AS ENUM (
      'new',
      'assessment_scheduled',
      'estimate_sent',
      'won',
      'lost',
      'no_decision'
    );
  END IF;
END $$;

-- Core identity
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS opportunity_status opportunity_status DEFAULT 'new';
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS primary_contact_id UUID REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS site_contact_id UUID REFERENCES customers(id) ON DELETE SET NULL;

-- Property / Site
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS service_address_line1 TEXT;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS service_address_line2 TEXT;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS service_city TEXT;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS service_state TEXT;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS service_zip TEXT;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS property_type property_type;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS property_age INTEGER; -- year built

-- Hazard details
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS hazard_types TEXT[];
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS estimated_affected_area_sqft DECIMAL(10,2);
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS urgency urgency_level DEFAULT 'routine';
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS regulatory_trigger regulatory_trigger;

-- Pipeline / Sales (some already exist, adding new ones)
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS probability_pct INTEGER DEFAULT 0;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS assessment_date DATE;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS estimate_sent_date DATE;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS follow_up_date DATE;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS lost_to_competitor TEXT;

-- Marketing attribution
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS lead_source TEXT;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS lead_source_detail TEXT;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS utm_source TEXT;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS utm_medium TEXT;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS first_touch_date DATE;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS created_from_assessment_id UUID REFERENCES site_surveys(id) ON DELETE SET NULL;

-- Migrate existing data
-- Map existing probability from stage to opportunity-level probability
UPDATE opportunities o
SET probability_pct = ps.probability
FROM pipeline_stages ps
WHERE o.stage_id = ps.id
  AND o.probability_pct = 0;

-- Map existing loss_reason to lost_to_competitor
UPDATE opportunities
SET lost_to_competitor = competitor
WHERE competitor IS NOT NULL AND lost_to_competitor IS NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(organization_id, opportunity_status);
CREATE INDEX IF NOT EXISTS idx_opportunities_primary_contact ON opportunities(primary_contact_id) WHERE primary_contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_opportunities_site_contact ON opportunities(site_contact_id) WHERE site_contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_opportunities_urgency ON opportunities(urgency) WHERE urgency != 'routine';
CREATE INDEX IF NOT EXISTS idx_opportunities_follow_up ON opportunities(follow_up_date) WHERE follow_up_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_opportunities_assessment ON opportunities(created_from_assessment_id) WHERE created_from_assessment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_opportunities_hazard_types ON opportunities USING gin(hazard_types) WHERE hazard_types IS NOT NULL;
