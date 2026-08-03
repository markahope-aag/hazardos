-- Migration: Create Estimates and Proposals Tables
-- Date: 2026-02-01
-- Description: Adds estimates, estimate_line_items, and proposals tables for Phase 2

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Estimate status enum
CREATE TYPE estimate_status AS ENUM (
  'draft',
  'pending_approval',
  'approved',
  'sent',
  'accepted',
  'rejected',
  'expired',
  'converted'
);

-- Line item type enum
CREATE TYPE line_item_type AS ENUM (
  'labor',
  'equipment',
  'material',
  'disposal',
  'travel',
  'permit',
  'testing',
  'other'
);

-- Proposal status enum
CREATE TYPE proposal_status AS ENUM (
  'draft',
  'sent',
  'viewed',
  'signed',
  'expired',
  'declined'
);

-- ============================================================================
-- ESTIMATES TABLE
-- ============================================================================

CREATE TABLE estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  site_survey_id UUID NOT NULL REFERENCES site_surveys(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,

  -- Estimate identification
  estimate_number TEXT NOT NULL,
  version INTEGER DEFAULT 1,

  -- Status tracking
  status estimate_status DEFAULT 'draft',

  -- Pricing summary (calculated from line items)
  subtotal NUMERIC(12,2) DEFAULT 0,
  markup_percent NUMERIC(5,2) DEFAULT 0,
  markup_amount NUMERIC(12,2) DEFAULT 0,
  discount_percent NUMERIC(5,2) DEFAULT 0,
  discount_amount NUMERIC(12,2) DEFAULT 0,
  tax_percent NUMERIC(5,2) DEFAULT 0,
  tax_amount NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) DEFAULT 0,

  -- Project details
  project_name TEXT,
  project_description TEXT,
  scope_of_work TEXT,

  -- Timeline
  estimated_duration_days INTEGER,
  estimated_start_date DATE,
  estimated_end_date DATE,

  -- Validity
  valid_until DATE,

  -- Approval tracking
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  approval_notes TEXT,

  -- Internal notes
  internal_notes TEXT,

  -- Metadata
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ESTIMATE LINE ITEMS TABLE
-- ============================================================================

CREATE TABLE estimate_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,

  -- Line item details
  item_type line_item_type NOT NULL,
  category TEXT, -- Sub-category within type (e.g., 'supervisor' for labor)
  description TEXT NOT NULL,

  -- Quantity and pricing
  quantity NUMERIC(10,2) DEFAULT 1,
  unit TEXT DEFAULT 'each', -- each, hour, sqft, lbs, etc.
  unit_price NUMERIC(12,2) DEFAULT 0,
  total_price NUMERIC(12,2) DEFAULT 0,

  -- Source reference (for auto-generated items)
  source_rate_id UUID, -- Reference to labor_rates, equipment_rates, etc.
  source_table TEXT, -- 'labor_rates', 'equipment_rates', etc.

  -- Display order
  sort_order INTEGER DEFAULT 0,

  -- Flags
  is_optional BOOLEAN DEFAULT FALSE,
  is_included BOOLEAN DEFAULT TRUE,

  -- Notes
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PROPOSALS TABLE
-- ============================================================================

CREATE TABLE proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,

  -- Proposal identification
  proposal_number TEXT NOT NULL,

  -- Status tracking
  status proposal_status DEFAULT 'draft',

  -- Customer portal access
  access_token TEXT UNIQUE,
  access_token_expires_at TIMESTAMPTZ,

  -- Content
  cover_letter TEXT,
  terms_and_conditions TEXT,
  payment_terms TEXT,
  exclusions TEXT[],
  inclusions TEXT[],

  -- Tracking
  sent_at TIMESTAMPTZ,
  sent_to_email TEXT,
  viewed_at TIMESTAMPTZ,
  viewed_count INTEGER DEFAULT 0,

  -- Signature
  signed_at TIMESTAMPTZ,
  signer_name TEXT,
  signer_email TEXT,
  signer_ip TEXT,
  signature_data TEXT, -- Base64 encoded signature image

  -- Expiration
  valid_until DATE,

  -- PDF storage
  pdf_path TEXT,
  pdf_generated_at TIMESTAMPTZ,

  -- Metadata
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Estimates indexes
CREATE INDEX idx_estimates_organization_id ON estimates(organization_id);
CREATE INDEX idx_estimates_site_survey_id ON estimates(site_survey_id);
CREATE INDEX idx_estimates_customer_id ON estimates(customer_id);
CREATE INDEX idx_estimates_status ON estimates(status);
CREATE INDEX idx_estimates_estimate_number ON estimates(estimate_number);
CREATE INDEX idx_estimates_created_at ON estimates(created_at);

-- Estimate line items indexes
CREATE INDEX idx_estimate_line_items_estimate_id ON estimate_line_items(estimate_id);
CREATE INDEX idx_estimate_line_items_item_type ON estimate_line_items(item_type);
CREATE INDEX idx_estimate_line_items_sort_order ON estimate_line_items(sort_order);

-- Proposals indexes
CREATE INDEX idx_proposals_organization_id ON proposals(organization_id);
CREATE INDEX idx_proposals_estimate_id ON proposals(estimate_id);
CREATE INDEX idx_proposals_customer_id ON proposals(customer_id);
CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_proposals_access_token ON proposals(access_token);
CREATE INDEX idx_proposals_created_at ON proposals(created_at);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated at triggers
CREATE TRIGGER set_updated_at_estimates
  BEFORE UPDATE ON estimates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_estimate_line_items
  BEFORE UPDATE ON estimate_line_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_proposals
  BEFORE UPDATE ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

-- Estimates policies
CREATE POLICY "Users can view estimates in their organization"
  ON estimates FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('platform_owner', 'platform_admin')
    )
  );

CREATE POLICY "Users can create estimates in their organization"
  ON estimates FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update estimates in their organization"
  ON estimates FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete estimates in their organization"
  ON estimates FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('tenant_owner', 'admin', 'platform_owner', 'platform_admin')
    )
  );

-- Estimate line items policies (inherit from parent estimate)
CREATE POLICY "Users can view line items for their estimates"
  ON estimate_line_items FOR SELECT
  USING (
    estimate_id IN (
      SELECT id FROM estimates WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('platform_owner', 'platform_admin')
    )
  );

CREATE POLICY "Users can create line items for their estimates"
  ON estimate_line_items FOR INSERT
  WITH CHECK (
    estimate_id IN (
      SELECT id FROM estimates WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update line items for their estimates"
  ON estimate_line_items FOR UPDATE
  USING (
    estimate_id IN (
      SELECT id FROM estimates WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete line items for their estimates"
  ON estimate_line_items FOR DELETE
  USING (
    estimate_id IN (
      SELECT id FROM estimates WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Proposals policies
CREATE POLICY "Users can view proposals in their organization"
  ON proposals FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('platform_owner', 'platform_admin')
    )
  );

CREATE POLICY "Users can create proposals in their organization"
  ON proposals FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update proposals in their organization"
  ON proposals FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete proposals in their organization"
  ON proposals FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('tenant_owner', 'admin', 'platform_owner', 'platform_admin')
    )
  );

-- Public access policy for customer portal (using access token)
CREATE POLICY "Public can view proposals with valid access token"
  ON proposals FOR SELECT
  USING (
    access_token IS NOT NULL
    AND access_token_expires_at > NOW()
  );

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to generate estimate number
CREATE OR REPLACE FUNCTION generate_estimate_number(org_id UUID)
RETURNS TEXT AS $$
DECLARE
  prefix TEXT;
  next_num INTEGER;
  result TEXT;
BEGIN
  -- Get organization prefix or use default
  SELECT COALESCE(UPPER(LEFT(name, 3)), 'EST') INTO prefix
  FROM organizations WHERE id = org_id;

  -- Get next number for this organization
  SELECT COALESCE(MAX(
    CASE
      WHEN estimate_number ~ '^[A-Z]+-[0-9]+$'
      THEN CAST(SPLIT_PART(estimate_number, '-', 2) AS INTEGER)
      ELSE 0
    END
  ), 0) + 1 INTO next_num
  FROM estimates WHERE organization_id = org_id;

  result := prefix || '-' || LPAD(next_num::TEXT, 5, '0');
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to generate proposal number
CREATE OR REPLACE FUNCTION generate_proposal_number(org_id UUID)
RETURNS TEXT AS $$
DECLARE
  prefix TEXT;
  next_num INTEGER;
  result TEXT;
BEGIN
  -- Get organization prefix or use default
  SELECT COALESCE(UPPER(LEFT(name, 3)), 'PRO') INTO prefix
  FROM organizations WHERE id = org_id;

  -- Get next number for this organization
  SELECT COALESCE(MAX(
    CASE
      WHEN proposal_number ~ '^[A-Z]+-P[0-9]+$'
      THEN CAST(SUBSTRING(SPLIT_PART(proposal_number, '-P', 2) FROM '[0-9]+') AS INTEGER)
      ELSE 0
    END
  ), 0) + 1 INTO next_num
  FROM proposals WHERE organization_id = org_id;

  result := prefix || '-P' || LPAD(next_num::TEXT, 5, '0');
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to generate access token
CREATE OR REPLACE FUNCTION generate_access_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Function to recalculate estimate totals
CREATE OR REPLACE FUNCTION recalculate_estimate_totals(est_id UUID)
RETURNS void AS $$
DECLARE
  calc_subtotal NUMERIC(12,2);
  est_record RECORD;
  calc_markup NUMERIC(12,2);
  calc_discount NUMERIC(12,2);
  calc_tax NUMERIC(12,2);
  calc_total NUMERIC(12,2);
BEGIN
  -- Calculate subtotal from included line items
  SELECT COALESCE(SUM(total_price), 0) INTO calc_subtotal
  FROM estimate_line_items
  WHERE estimate_id = est_id AND is_included = TRUE;

  -- Get current estimate settings
  SELECT * INTO est_record FROM estimates WHERE id = est_id;

  -- Calculate markup
  calc_markup := calc_subtotal * (COALESCE(est_record.markup_percent, 0) / 100);

  -- Calculate discount (applied after markup)
  calc_discount := (calc_subtotal + calc_markup) * (COALESCE(est_record.discount_percent, 0) / 100);

  -- Calculate tax (applied after discount)
  calc_tax := (calc_subtotal + calc_markup - calc_discount) * (COALESCE(est_record.tax_percent, 0) / 100);

  -- Calculate total
  calc_total := calc_subtotal + calc_markup - calc_discount + calc_tax;

  -- Update estimate
  UPDATE estimates SET
    subtotal = calc_subtotal,
    markup_amount = calc_markup,
    discount_amount = calc_discount,
    tax_amount = calc_tax,
    total = calc_total,
    updated_at = NOW()
  WHERE id = est_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to recalculate totals when line items change
CREATE OR REPLACE FUNCTION trigger_recalculate_estimate()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recalculate_estimate_totals(OLD.estimate_id);
    RETURN OLD;
  ELSE
    PERFORM recalculate_estimate_totals(NEW.estimate_id);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recalculate_estimate_on_line_item_change
  AFTER INSERT OR UPDATE OR DELETE ON estimate_line_items
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_estimate();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE estimates IS 'Cost estimates generated from site surveys';
COMMENT ON TABLE estimate_line_items IS 'Individual line items within an estimate';
COMMENT ON TABLE proposals IS 'Customer-facing proposals generated from estimates';
COMMENT ON COLUMN estimates.estimate_number IS 'Human-readable estimate identifier (e.g., HAZ-00001)';
COMMENT ON COLUMN proposals.access_token IS 'Secure token for customer portal access';
COMMENT ON COLUMN proposals.signature_data IS 'Base64 encoded signature image from e-signature';
