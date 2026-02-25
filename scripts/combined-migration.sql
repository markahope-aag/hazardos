-- Combined migration for HazardOS
-- Generated: 2026-02-25T00:58:37.380Z
-- This runs all pending migrations that haven't been applied to the hosted DB
--
-- IMPORTANT: The old estimates and jobs tables need to be dropped first
-- since newer migrations recreate them with a better schema.

-- ============================================================
-- STEP 0: Drop old tables that will be recreated
-- ============================================================

-- Back up seed data references before dropping
-- (The seed script can be re-run after migrations)

DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS estimates CASCADE;

-- Drop old enums that may conflict
DROP TYPE IF EXISTS estimate_status CASCADE;
DROP TYPE IF EXISTS line_item_type CASCADE;
DROP TYPE IF EXISTS proposal_status CASCADE;
DROP TYPE IF EXISTS sms_status CASCADE;
DROP TYPE IF EXISTS sms_message_type CASCADE;

-- SKIPPED (already applied): 20260131135419_create_customers_table.sql

-- SKIPPED (already applied): 20260131135551_add_customer_linkage_to_site_surveys.sql

-- SKIPPED (already applied): 20260131135626_add_scheduling_fields_to_site_surveys.sql

-- SKIPPED (already applied): 20260131135724_create_pricing_settings_tables.sql

-- SKIPPED (already applied): 20260131170746_initial_schema.sql

-- SKIPPED (already applied): 20260131170912_rls_policies.sql

-- SKIPPED (already applied): 20260131180000_rename_assessments_to_site_surveys.sql

-- SKIPPED (already applied): 20260131195342_create_customers_table.sql

-- SKIPPED (already applied): 20260131200000_add_mobile_survey_fields.sql

-- SKIPPED (already applied): 20260131210000_fix_rls_infinite_recursion.sql

-- ============================================================
-- Migration: 20260201000000_create_estimates_tables.sql
-- ============================================================

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


-- ============================================================
-- Migration: 20260201000010_jobs_system.sql
-- ============================================================

-- ============================================
-- JOBS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- References
  proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL,
  estimate_id UUID REFERENCES estimates(id) ON DELETE SET NULL,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  site_survey_id UUID REFERENCES site_surveys(id) ON DELETE SET NULL,

  -- Job identification
  job_number VARCHAR(50) NOT NULL,
  name VARCHAR(255),

  -- Status workflow
  status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
  -- scheduled → in_progress → completed → invoiced → paid → closed
  -- OR: scheduled → cancelled

  -- Hazard info (copied from survey/estimate for quick reference)
  hazard_types TEXT[],

  -- Scheduling
  scheduled_start_date DATE NOT NULL,
  scheduled_start_time TIME,
  scheduled_end_date DATE,
  scheduled_end_time TIME,
  estimated_duration_hours DECIMAL(6, 2),

  -- Actual timing
  actual_start_at TIMESTAMPTZ,
  actual_end_at TIMESTAMPTZ,

  -- Location
  job_address TEXT NOT NULL,
  job_city VARCHAR(100),
  job_state VARCHAR(50),
  job_zip VARCHAR(20),
  job_latitude DECIMAL(10, 8),
  job_longitude DECIMAL(11, 8),

  -- Access info (copied from survey)
  access_notes TEXT,
  gate_code VARCHAR(50),
  lockbox_code VARCHAR(50),
  contact_onsite_name VARCHAR(255),
  contact_onsite_phone VARCHAR(50),

  -- Pricing
  contract_amount DECIMAL(12, 2),
  change_order_amount DECIMAL(12, 2) DEFAULT 0,
  final_amount DECIMAL(12, 2),

  -- Completion
  completion_notes TEXT,
  completion_photos JSONB DEFAULT '[]',
  customer_signed_off BOOLEAN DEFAULT FALSE,
  customer_signoff_at TIMESTAMPTZ,
  customer_signoff_name VARCHAR(255),

  -- Quality
  inspection_required BOOLEAN DEFAULT FALSE,
  inspection_passed BOOLEAN,
  inspection_date DATE,
  inspection_notes TEXT,

  -- Notes
  internal_notes TEXT,
  special_instructions TEXT,

  -- Timestamps
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- JOB CREW ASSIGNMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS job_crew (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Role
  role VARCHAR(50) NOT NULL DEFAULT 'crew',
  -- 'lead', 'crew', 'supervisor', 'trainee'
  is_lead BOOLEAN DEFAULT FALSE,

  -- Scheduling for this person
  scheduled_start TIME,
  scheduled_end TIME,

  -- Time tracking
  clock_in_at TIMESTAMPTZ,
  clock_out_at TIMESTAMPTZ,
  break_minutes INTEGER DEFAULT 0,

  -- Calculated hours
  hours_worked DECIMAL(6, 2),

  -- Notes
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(job_id, profile_id)
);

-- ============================================
-- JOB EQUIPMENT
-- ============================================
CREATE TABLE IF NOT EXISTS job_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

  -- Equipment details
  equipment_name VARCHAR(255) NOT NULL,
  equipment_type VARCHAR(100),
  quantity INTEGER DEFAULT 1,

  -- Rental tracking
  is_rental BOOLEAN DEFAULT FALSE,
  rental_rate_daily DECIMAL(10, 2),
  rental_start_date DATE,
  rental_end_date DATE,
  rental_days INTEGER,
  rental_total DECIMAL(10, 2),

  -- Status
  status VARCHAR(50) DEFAULT 'assigned',
  -- assigned → deployed → returned

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- JOB MATERIALS USED
-- ============================================
CREATE TABLE IF NOT EXISTS job_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

  -- Material details
  material_name VARCHAR(255) NOT NULL,
  material_type VARCHAR(100),

  -- Quantities
  quantity_estimated DECIMAL(10, 2),
  quantity_used DECIMAL(10, 2),
  unit VARCHAR(50),

  -- Cost
  unit_cost DECIMAL(10, 2),
  total_cost DECIMAL(12, 2),

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- JOB DISPOSAL RECORDS
-- ============================================
CREATE TABLE IF NOT EXISTS job_disposal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

  -- Disposal details
  hazard_type VARCHAR(50) NOT NULL,
  disposal_type VARCHAR(100),

  -- Quantities
  quantity DECIMAL(10, 2) NOT NULL,
  unit VARCHAR(50) NOT NULL,

  -- Manifest tracking
  manifest_number VARCHAR(100),
  manifest_date DATE,

  -- Facility
  disposal_facility_name VARCHAR(255),
  disposal_facility_address TEXT,

  -- Cost
  disposal_cost DECIMAL(12, 2),

  -- Documentation
  manifest_document_url TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- JOB CHANGE ORDERS
-- ============================================
CREATE TABLE IF NOT EXISTS job_change_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

  -- Change order details
  change_order_number VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  reason TEXT,

  -- Pricing
  amount DECIMAL(12, 2) NOT NULL,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  -- pending → approved → rejected

  -- Approval
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  customer_approved BOOLEAN DEFAULT FALSE,
  customer_approved_at TIMESTAMPTZ,

  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- JOB NOTES / ACTIVITY LOG
-- ============================================
CREATE TABLE IF NOT EXISTS job_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

  -- Note details
  note_type VARCHAR(50) NOT NULL DEFAULT 'general',
  -- 'general', 'issue', 'customer_communication', 'inspection', 'safety', 'photo'

  content TEXT NOT NULL,

  -- Attachments
  attachments JSONB DEFAULT '[]',

  -- Visibility
  is_internal BOOLEAN DEFAULT TRUE,

  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SCHEDULED REMINDERS
-- ============================================
CREATE TABLE IF NOT EXISTS scheduled_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- What to remind about
  related_type VARCHAR(50) NOT NULL,
  related_id UUID NOT NULL,

  -- Reminder details
  reminder_type VARCHAR(50) NOT NULL,

  -- Recipient
  recipient_type VARCHAR(50) NOT NULL,
  recipient_email VARCHAR(255),
  recipient_phone VARCHAR(50),

  -- Delivery
  channel VARCHAR(50) NOT NULL DEFAULT 'email',

  -- Scheduling
  scheduled_for TIMESTAMPTZ NOT NULL,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  -- pending → sent → failed → cancelled

  sent_at TIMESTAMPTZ,
  error TEXT,

  -- Template
  template_slug VARCHAR(100),
  template_variables JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_jobs_org ON jobs(organization_id);
CREATE INDEX IF NOT EXISTS idx_jobs_customer ON jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_proposal ON jobs(proposal_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled_date ON jobs(scheduled_start_date);
CREATE INDEX IF NOT EXISTS idx_jobs_org_scheduled ON jobs(organization_id, scheduled_start_date) WHERE status = 'scheduled';

CREATE INDEX IF NOT EXISTS idx_job_crew_job ON job_crew(job_id);
CREATE INDEX IF NOT EXISTS idx_job_crew_profile ON job_crew(profile_id);
CREATE INDEX IF NOT EXISTS idx_job_equipment_job ON job_equipment(job_id);
CREATE INDEX IF NOT EXISTS idx_job_materials_job ON job_materials(job_id);
CREATE INDEX IF NOT EXISTS idx_job_disposal_job ON job_disposal(job_id);
CREATE INDEX IF NOT EXISTS idx_job_change_orders_job ON job_change_orders(job_id);
CREATE INDEX IF NOT EXISTS idx_job_notes_job ON job_notes(job_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_time ON scheduled_reminders(scheduled_for, status);
CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_related ON scheduled_reminders(related_type, related_id);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_crew ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_disposal ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_change_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their org jobs" ON jobs;
CREATE POLICY "Users can manage their org jobs"
  ON jobs FOR ALL
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can manage job crew for their org jobs" ON job_crew;
CREATE POLICY "Users can manage job crew for their org jobs"
  ON job_crew FOR ALL
  USING (EXISTS (
    SELECT 1 FROM jobs WHERE jobs.id = job_crew.job_id
    AND jobs.organization_id = get_user_organization_id()
  ));

DROP POLICY IF EXISTS "Users can manage job equipment for their org jobs" ON job_equipment;
CREATE POLICY "Users can manage job equipment for their org jobs"
  ON job_equipment FOR ALL
  USING (EXISTS (
    SELECT 1 FROM jobs WHERE jobs.id = job_equipment.job_id
    AND jobs.organization_id = get_user_organization_id()
  ));

DROP POLICY IF EXISTS "Users can manage job materials for their org jobs" ON job_materials;
CREATE POLICY "Users can manage job materials for their org jobs"
  ON job_materials FOR ALL
  USING (EXISTS (
    SELECT 1 FROM jobs WHERE jobs.id = job_materials.job_id
    AND jobs.organization_id = get_user_organization_id()
  ));

DROP POLICY IF EXISTS "Users can manage job disposal for their org jobs" ON job_disposal;
CREATE POLICY "Users can manage job disposal for their org jobs"
  ON job_disposal FOR ALL
  USING (EXISTS (
    SELECT 1 FROM jobs WHERE jobs.id = job_disposal.job_id
    AND jobs.organization_id = get_user_organization_id()
  ));

DROP POLICY IF EXISTS "Users can manage job change orders for their org jobs" ON job_change_orders;
CREATE POLICY "Users can manage job change orders for their org jobs"
  ON job_change_orders FOR ALL
  USING (EXISTS (
    SELECT 1 FROM jobs WHERE jobs.id = job_change_orders.job_id
    AND jobs.organization_id = get_user_organization_id()
  ));

DROP POLICY IF EXISTS "Users can manage job notes for their org jobs" ON job_notes;
CREATE POLICY "Users can manage job notes for their org jobs"
  ON job_notes FOR ALL
  USING (EXISTS (
    SELECT 1 FROM jobs WHERE jobs.id = job_notes.job_id
    AND jobs.organization_id = get_user_organization_id()
  ));

DROP POLICY IF EXISTS "Users can manage scheduled reminders for their org" ON scheduled_reminders;
CREATE POLICY "Users can manage scheduled reminders for their org"
  ON scheduled_reminders FOR ALL
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());

-- ============================================
-- FUNCTIONS
-- ============================================

-- Generate job number
CREATE OR REPLACE FUNCTION generate_job_number(org_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
  year_str VARCHAR(4);
  next_num INTEGER;
BEGIN
  year_str := TO_CHAR(NOW(), 'YYYY');

  SELECT COALESCE(MAX(
    CAST(SUBSTRING(job_number FROM 'JOB-\d{4}-(\d+)') AS INTEGER)
  ), 0) + 1
  INTO next_num
  FROM jobs
  WHERE organization_id = org_id
  AND job_number LIKE 'JOB-' || year_str || '-%';

  RETURN 'JOB-' || year_str || '-' || LPAD(next_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Calculate job crew hours
CREATE OR REPLACE FUNCTION calculate_crew_hours()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.clock_in_at IS NOT NULL AND NEW.clock_out_at IS NOT NULL THEN
    NEW.hours_worked := EXTRACT(EPOCH FROM (NEW.clock_out_at - NEW.clock_in_at)) / 3600
                        - COALESCE(NEW.break_minutes, 0) / 60.0;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS job_crew_calc_hours ON job_crew;
CREATE TRIGGER job_crew_calc_hours
  BEFORE INSERT OR UPDATE ON job_crew
  FOR EACH ROW EXECUTE FUNCTION calculate_crew_hours();

-- Update job change order total
CREATE OR REPLACE FUNCTION update_job_change_order_total()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE jobs
  SET
    change_order_amount = (
      SELECT COALESCE(SUM(amount), 0)
      FROM job_change_orders
      WHERE job_id = COALESCE(NEW.job_id, OLD.job_id)
      AND status = 'approved'
    ),
    final_amount = contract_amount + (
      SELECT COALESCE(SUM(amount), 0)
      FROM job_change_orders
      WHERE job_id = COALESCE(NEW.job_id, OLD.job_id)
      AND status = 'approved'
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.job_id, OLD.job_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS job_change_order_totals ON job_change_orders;
CREATE TRIGGER job_change_order_totals
  AFTER INSERT OR UPDATE OR DELETE ON job_change_orders
  FOR EACH ROW EXECUTE FUNCTION update_job_change_order_total();

-- Update jobs updated_at timestamp
CREATE OR REPLACE FUNCTION update_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS jobs_updated_at ON jobs;
CREATE TRIGGER jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_jobs_updated_at();


-- ============================================================
-- Migration: 20260201000020_invoices.sql
-- ============================================================

-- ============================================
-- INVOICES SYSTEM
-- ============================================

-- ============================================
-- INVOICES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- References
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  -- Invoice identification
  invoice_number VARCHAR(50) NOT NULL,

  -- Status: draft, sent, viewed, partial, paid, overdue, void
  status VARCHAR(50) NOT NULL DEFAULT 'draft',

  -- Dates
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,

  -- Amounts
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5, 4) DEFAULT 0,
  tax_amount DECIMAL(12, 2) DEFAULT 0,
  discount_amount DECIMAL(12, 2) DEFAULT 0,
  total DECIMAL(12, 2) NOT NULL DEFAULT 0,
  amount_paid DECIMAL(12, 2) DEFAULT 0,
  balance_due DECIMAL(12, 2) NOT NULL DEFAULT 0,

  -- Terms
  payment_terms VARCHAR(100),
  notes TEXT,

  -- Delivery tracking
  sent_at TIMESTAMPTZ,
  sent_via VARCHAR(50),
  viewed_at TIMESTAMPTZ,

  -- QuickBooks sync
  qb_invoice_id VARCHAR(100),
  qb_synced_at TIMESTAMPTZ,

  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INVOICE LINE ITEMS
-- ============================================
CREATE TABLE IF NOT EXISTS invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,

  description TEXT NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
  unit VARCHAR(50),
  unit_price DECIMAL(12, 2) NOT NULL,
  line_total DECIMAL(12, 2) NOT NULL,

  source_type VARCHAR(50),
  source_id UUID,
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PAYMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,

  amount DECIMAL(12, 2) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method VARCHAR(50),
  reference_number VARCHAR(100),
  notes TEXT,

  qb_payment_id VARCHAR(100),
  qb_synced_at TIMESTAMPTZ,

  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_invoices_org ON invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_job ON invoices(job_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(organization_id, invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_org ON payments(organization_id);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Invoices policies
DROP POLICY IF EXISTS "Users can view invoices in their organization" ON invoices;
CREATE POLICY "Users can view invoices in their organization" ON invoices
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.organization_id = invoices.organization_id
    )
  );

DROP POLICY IF EXISTS "Users can manage invoices in their organization" ON invoices;
CREATE POLICY "Users can manage invoices in their organization" ON invoices
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.organization_id = invoices.organization_id
    )
  );

-- Invoice line items policies
DROP POLICY IF EXISTS "Users can manage invoice line items" ON invoice_line_items;
CREATE POLICY "Users can manage invoice line items" ON invoice_line_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM invoices i
      JOIN profiles p ON p.organization_id = i.organization_id
      WHERE i.id = invoice_line_items.invoice_id
      AND p.id = auth.uid()
    )
  );

-- Payments policies
DROP POLICY IF EXISTS "Users can view payments in their organization" ON payments;
CREATE POLICY "Users can view payments in their organization" ON payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.organization_id = payments.organization_id
    )
  );

DROP POLICY IF EXISTS "Users can manage payments in their organization" ON payments;
CREATE POLICY "Users can manage payments in their organization" ON payments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.organization_id = payments.organization_id
    )
  );

-- Platform owner policies
DROP POLICY IF EXISTS "Platform owners can access all invoices" ON invoices;
CREATE POLICY "Platform owners can access all invoices" ON invoices
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'platform_owner'
    )
  );

DROP POLICY IF EXISTS "Platform owners can access all payments" ON payments;
CREATE POLICY "Platform owners can access all payments" ON payments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'platform_owner'
    )
  );

-- ============================================
-- FUNCTIONS
-- ============================================

-- Generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number(org_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
  year_str VARCHAR(4);
  next_num INTEGER;
BEGIN
  year_str := TO_CHAR(NOW(), 'YYYY');

  SELECT COALESCE(MAX(
    CAST(SUBSTRING(invoice_number FROM 'INV-\d{4}-(\d+)') AS INTEGER)
  ), 0) + 1
  INTO next_num
  FROM invoices
  WHERE organization_id = org_id
  AND invoice_number LIKE 'INV-' || year_str || '-%';

  RETURN 'INV-' || year_str || '-' || LPAD(next_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Auto-update balance when payment recorded
CREATE OR REPLACE FUNCTION update_invoice_balance()
RETURNS TRIGGER AS $$
DECLARE
  inv_id UUID;
  paid_total DECIMAL(12, 2);
  inv_total DECIMAL(12, 2);
BEGIN
  inv_id := COALESCE(NEW.invoice_id, OLD.invoice_id);

  SELECT COALESCE(SUM(amount), 0) INTO paid_total
  FROM payments WHERE invoice_id = inv_id;

  SELECT total INTO inv_total FROM invoices WHERE id = inv_id;

  UPDATE invoices
  SET
    amount_paid = paid_total,
    balance_due = inv_total - paid_total,
    status = CASE
      WHEN paid_total >= inv_total THEN 'paid'
      WHEN paid_total > 0 THEN 'partial'
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = inv_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS payment_update_balance ON payments;
CREATE TRIGGER payment_update_balance
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_invoice_balance();

-- Auto-recalculate totals when line items change
CREATE OR REPLACE FUNCTION recalculate_invoice_totals()
RETURNS TRIGGER AS $$
DECLARE
  inv_id UUID;
  new_subtotal DECIMAL(12, 2);
  inv_tax_rate DECIMAL(5, 4);
  inv_discount DECIMAL(12, 2);
  inv_amount_paid DECIMAL(12, 2);
BEGIN
  inv_id := COALESCE(NEW.invoice_id, OLD.invoice_id);

  SELECT COALESCE(SUM(line_total), 0) INTO new_subtotal
  FROM invoice_line_items WHERE invoice_id = inv_id;

  SELECT tax_rate, discount_amount, amount_paid
  INTO inv_tax_rate, inv_discount, inv_amount_paid
  FROM invoices WHERE id = inv_id;

  UPDATE invoices
  SET
    subtotal = new_subtotal,
    tax_amount = new_subtotal * COALESCE(inv_tax_rate, 0),
    total = new_subtotal + (new_subtotal * COALESCE(inv_tax_rate, 0)) - COALESCE(inv_discount, 0),
    balance_due = new_subtotal + (new_subtotal * COALESCE(inv_tax_rate, 0)) - COALESCE(inv_discount, 0) - COALESCE(inv_amount_paid, 0),
    updated_at = NOW()
  WHERE id = inv_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS invoice_line_item_totals ON invoice_line_items;
CREATE TRIGGER invoice_line_item_totals
  AFTER INSERT OR UPDATE OR DELETE ON invoice_line_items
  FOR EACH ROW EXECUTE FUNCTION recalculate_invoice_totals();

-- Updated at trigger
DROP TRIGGER IF EXISTS set_updated_at_invoices ON invoices;
CREATE TRIGGER set_updated_at_invoices
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Table comments
COMMENT ON TABLE invoices IS 'Customer invoices for completed jobs';
COMMENT ON TABLE invoice_line_items IS 'Line items for invoices';
COMMENT ON TABLE payments IS 'Payment records for invoices';


-- ============================================================
-- Migration: 20260201000025_organization_integrations.sql
-- ============================================================

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


-- ============================================================
-- Migration: 20260201000030_activity_log.sql
-- ============================================================

-- ============================================
-- ACTIVITY LOG TABLE
-- ============================================
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Actor
  user_id UUID REFERENCES profiles(id),
  user_name VARCHAR(255),

  -- Action details
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID NOT NULL,
  entity_name VARCHAR(255),

  -- Change details
  old_values JSONB,
  new_values JSONB,
  description TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_activity_log_org ON activity_log(organization_id);
CREATE INDEX idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_log_created ON activity_log(created_at DESC);
CREATE INDEX idx_activity_log_user ON activity_log(user_id);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org activity"
  ON activity_log FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can create activity logs"
  ON activity_log FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());


-- ============================================================
-- Migration: 20260202000001_customer_contacts.sql
-- ============================================================

-- Phase 3: Customer Contacts
-- Allows multiple contacts per customer with roles and communication preferences

-- ============================================================================
-- CUSTOMER CONTACTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS customer_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  -- Contact Info
  name TEXT NOT NULL,
  title TEXT,
  email TEXT,
  phone TEXT,
  mobile TEXT,

  -- Role & Preferences
  role TEXT NOT NULL DEFAULT 'general' CHECK (role IN ('primary', 'billing', 'site', 'scheduling', 'general')),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  preferred_contact_method TEXT CHECK (preferred_contact_method IN ('email', 'phone', 'mobile', 'any')),

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT customer_contacts_org_customer_fk
    FOREIGN KEY (organization_id, customer_id)
    REFERENCES customers(organization_id, id) ON DELETE CASCADE
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_customer_contacts_customer ON customer_contacts(customer_id);
CREATE INDEX idx_customer_contacts_org ON customer_contacts(organization_id);
CREATE INDEX idx_customer_contacts_primary ON customer_contacts(customer_id, is_primary) WHERE is_primary = true;
CREATE INDEX idx_customer_contacts_role ON customer_contacts(customer_id, role);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE customer_contacts ENABLE ROW LEVEL SECURITY;

-- View contacts in your organization
CREATE POLICY "Users can view contacts in their organization"
  ON customer_contacts FOR SELECT
  USING (organization_id = get_user_organization_id());

-- Insert contacts in your organization
CREATE POLICY "Users can insert contacts in their organization"
  ON customer_contacts FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

-- Update contacts in your organization
CREATE POLICY "Users can update contacts in their organization"
  ON customer_contacts FOR UPDATE
  USING (organization_id = get_user_organization_id());

-- Delete contacts in your organization
CREATE POLICY "Users can delete contacts in their organization"
  ON customer_contacts FOR DELETE
  USING (organization_id = get_user_organization_id());

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

CREATE TRIGGER set_customer_contacts_updated_at
  BEFORE UPDATE ON customer_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PRIMARY CONTACT SYNC TRIGGER
-- Ensures only one primary contact per customer and syncs to customers table
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_primary_contact()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting this contact as primary
  IF NEW.is_primary = true THEN
    -- Unset any other primary contacts for this customer
    UPDATE customer_contacts
    SET is_primary = false, updated_at = now()
    WHERE customer_id = NEW.customer_id
      AND id != NEW.id
      AND is_primary = true;

    -- Sync to customers table
    UPDATE customers
    SET
      name = NEW.name,
      email = NEW.email,
      phone = COALESCE(NEW.phone, NEW.mobile),
      updated_at = now()
    WHERE id = NEW.customer_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER sync_primary_contact_trigger
  AFTER INSERT OR UPDATE OF is_primary, name, email, phone, mobile
  ON customer_contacts
  FOR EACH ROW
  WHEN (NEW.is_primary = true)
  EXECUTE FUNCTION sync_primary_contact();

-- ============================================================================
-- ENSURE PRIMARY CONTACT FUNCTION
-- Called when deleting primary contact to promote another
-- ============================================================================

CREATE OR REPLACE FUNCTION ensure_primary_contact()
RETURNS TRIGGER AS $$
DECLARE
  remaining_contact UUID;
BEGIN
  -- Only act if we deleted a primary contact
  IF OLD.is_primary = true THEN
    -- Find another contact to make primary
    SELECT id INTO remaining_contact
    FROM customer_contacts
    WHERE customer_id = OLD.customer_id
    ORDER BY
      CASE role
        WHEN 'primary' THEN 1
        WHEN 'billing' THEN 2
        WHEN 'site' THEN 3
        WHEN 'scheduling' THEN 4
        ELSE 5
      END,
      created_at ASC
    LIMIT 1;

    -- Promote if found
    IF remaining_contact IS NOT NULL THEN
      UPDATE customer_contacts
      SET is_primary = true, updated_at = now()
      WHERE id = remaining_contact;
    END IF;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER ensure_primary_contact_trigger
  AFTER DELETE ON customer_contacts
  FOR EACH ROW
  EXECUTE FUNCTION ensure_primary_contact();

-- ============================================================================
-- MIGRATE EXISTING CUSTOMER DATA
-- Create initial contact from existing customer fields
-- ============================================================================

INSERT INTO customer_contacts (
  organization_id,
  customer_id,
  name,
  email,
  phone,
  role,
  is_primary
)
SELECT
  organization_id,
  id,
  name,
  email,
  phone,
  'primary',
  true
FROM customers
WHERE name IS NOT NULL
ON CONFLICT DO NOTHING;


-- ============================================================
-- Migration: 20260203000001_platform_billing.sql
-- ============================================================

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


-- ============================================================
-- Migration: 20260215000001_job_completion.sql
-- ============================================================

-- ============================================
-- JOB COMPLETION SYSTEM
-- Phase 4: Job completion tracking with detailed time, materials, photos, and checklists
-- ============================================

-- ============================================
-- JOB TIME ENTRIES
-- Track detailed crew time per job (separate from job_crew clock in/out)
-- ============================================
CREATE TABLE IF NOT EXISTS job_time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Time entry details
  work_date DATE NOT NULL,
  hours DECIMAL(5, 2) NOT NULL,
  work_type VARCHAR(100) NOT NULL DEFAULT 'regular',
  -- 'regular', 'overtime', 'travel', 'setup', 'cleanup', 'supervision'

  -- Billing info
  hourly_rate DECIMAL(10, 2),
  billable BOOLEAN DEFAULT TRUE,

  -- Notes
  description TEXT,
  notes TEXT,

  -- Audit
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- JOB MATERIAL USAGE
-- Track actual materials used vs estimated (links to job_materials for comparison)
-- ============================================
CREATE TABLE IF NOT EXISTS job_material_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  job_material_id UUID REFERENCES job_materials(id) ON DELETE SET NULL,

  -- Material details
  material_name VARCHAR(255) NOT NULL,
  material_type VARCHAR(100),

  -- Quantities
  quantity_estimated DECIMAL(10, 2),
  quantity_used DECIMAL(10, 2) NOT NULL,
  unit VARCHAR(50),

  -- Costs
  unit_cost DECIMAL(10, 2),
  total_cost DECIMAL(12, 2) GENERATED ALWAYS AS (
    CASE WHEN unit_cost IS NOT NULL THEN quantity_used * unit_cost ELSE NULL END
  ) STORED,

  -- Variance tracking
  variance_quantity DECIMAL(10, 2) GENERATED ALWAYS AS (
    CASE WHEN quantity_estimated IS NOT NULL THEN quantity_used - quantity_estimated ELSE NULL END
  ) STORED,
  variance_percent DECIMAL(5, 2) GENERATED ALWAYS AS (
    CASE WHEN quantity_estimated IS NOT NULL AND quantity_estimated > 0
      THEN ((quantity_used - quantity_estimated) / quantity_estimated * 100)
      ELSE NULL END
  ) STORED,

  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- JOB COMPLETION PHOTOS
-- Before/during/after photos with metadata
-- ============================================
CREATE TABLE IF NOT EXISTS job_completion_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

  -- Photo details
  photo_url TEXT NOT NULL,
  thumbnail_url TEXT,
  storage_path TEXT NOT NULL,

  -- Classification
  photo_type VARCHAR(50) NOT NULL DEFAULT 'during',
  -- 'before', 'during', 'after', 'issue', 'documentation'

  -- Metadata
  caption TEXT,
  taken_at TIMESTAMPTZ,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),

  -- EXIF data
  camera_make VARCHAR(100),
  camera_model VARCHAR(100),
  image_width INTEGER,
  image_height INTEGER,

  -- File info
  file_name VARCHAR(255),
  file_size INTEGER,
  mime_type VARCHAR(100),

  -- Audit
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- JOB COMPLETION CHECKLISTS
-- Safety, quality, cleanup, documentation checklists
-- ============================================
CREATE TABLE IF NOT EXISTS job_completion_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

  -- Checklist item details
  category VARCHAR(50) NOT NULL,
  -- 'safety', 'quality', 'cleanup', 'documentation', 'custom'

  item_name VARCHAR(255) NOT NULL,
  item_description TEXT,
  sort_order INTEGER DEFAULT 0,

  -- Completion
  is_required BOOLEAN DEFAULT TRUE,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES profiles(id),
  completion_notes TEXT,

  -- Photos/evidence
  evidence_photo_ids UUID[] DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- JOB COMPLETIONS
-- Summary record with variance calculations
-- ============================================
CREATE TABLE IF NOT EXISTS job_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  -- 'draft', 'submitted', 'approved', 'rejected'

  -- Estimated values (copied from job/estimate for comparison)
  estimated_hours DECIMAL(8, 2),
  estimated_material_cost DECIMAL(12, 2),
  estimated_total DECIMAL(12, 2),

  -- Actual values (calculated from entries)
  actual_hours DECIMAL(8, 2),
  actual_material_cost DECIMAL(12, 2),
  actual_labor_cost DECIMAL(12, 2),
  actual_total DECIMAL(12, 2),

  -- Variance summary
  hours_variance DECIMAL(8, 2),
  hours_variance_percent DECIMAL(5, 2),
  cost_variance DECIMAL(12, 2),
  cost_variance_percent DECIMAL(5, 2),

  -- Completion details
  field_notes TEXT,
  issues_encountered TEXT,
  recommendations TEXT,

  -- Submission
  submitted_at TIMESTAMPTZ,
  submitted_by UUID REFERENCES profiles(id),

  -- Review
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id),
  review_notes TEXT,
  rejection_reason TEXT,

  -- Customer sign-off
  customer_signed BOOLEAN DEFAULT FALSE,
  customer_signed_at TIMESTAMPTZ,
  customer_signature_name VARCHAR(255),
  customer_signature_data TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(job_id)
);

-- ============================================
-- ALTER JOBS TABLE
-- Add completion tracking fields
-- ============================================
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS completion_id UUID REFERENCES job_completions(id),
  ADD COLUMN IF NOT EXISTS actual_start_date DATE,
  ADD COLUMN IF NOT EXISTS actual_end_date DATE,
  ADD COLUMN IF NOT EXISTS actual_duration_days INTEGER;

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_job_time_entries_job ON job_time_entries(job_id);
CREATE INDEX IF NOT EXISTS idx_job_time_entries_profile ON job_time_entries(profile_id);
CREATE INDEX IF NOT EXISTS idx_job_time_entries_date ON job_time_entries(work_date);

CREATE INDEX IF NOT EXISTS idx_job_material_usage_job ON job_material_usage(job_id);
CREATE INDEX IF NOT EXISTS idx_job_material_usage_material ON job_material_usage(job_material_id);

CREATE INDEX IF NOT EXISTS idx_job_completion_photos_job ON job_completion_photos(job_id);
CREATE INDEX IF NOT EXISTS idx_job_completion_photos_type ON job_completion_photos(photo_type);

CREATE INDEX IF NOT EXISTS idx_job_completion_checklists_job ON job_completion_checklists(job_id);
CREATE INDEX IF NOT EXISTS idx_job_completion_checklists_category ON job_completion_checklists(category);

CREATE INDEX IF NOT EXISTS idx_job_completions_job ON job_completions(job_id);
CREATE INDEX IF NOT EXISTS idx_job_completions_status ON job_completions(status);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE job_time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_material_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_completion_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_completion_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_completions ENABLE ROW LEVEL SECURITY;

-- Time entries
DROP POLICY IF EXISTS "Users can manage time entries for their org jobs" ON job_time_entries;
CREATE POLICY "Users can manage time entries for their org jobs"
  ON job_time_entries FOR ALL
  USING (EXISTS (
    SELECT 1 FROM jobs WHERE jobs.id = job_time_entries.job_id
    AND jobs.organization_id = get_user_organization_id()
  ));

-- Material usage
DROP POLICY IF EXISTS "Users can manage material usage for their org jobs" ON job_material_usage;
CREATE POLICY "Users can manage material usage for their org jobs"
  ON job_material_usage FOR ALL
  USING (EXISTS (
    SELECT 1 FROM jobs WHERE jobs.id = job_material_usage.job_id
    AND jobs.organization_id = get_user_organization_id()
  ));

-- Completion photos
DROP POLICY IF EXISTS "Users can manage completion photos for their org jobs" ON job_completion_photos;
CREATE POLICY "Users can manage completion photos for their org jobs"
  ON job_completion_photos FOR ALL
  USING (EXISTS (
    SELECT 1 FROM jobs WHERE jobs.id = job_completion_photos.job_id
    AND jobs.organization_id = get_user_organization_id()
  ));

-- Completion checklists
DROP POLICY IF EXISTS "Users can manage checklists for their org jobs" ON job_completion_checklists;
CREATE POLICY "Users can manage checklists for their org jobs"
  ON job_completion_checklists FOR ALL
  USING (EXISTS (
    SELECT 1 FROM jobs WHERE jobs.id = job_completion_checklists.job_id
    AND jobs.organization_id = get_user_organization_id()
  ));

-- Job completions
DROP POLICY IF EXISTS "Users can manage completions for their org jobs" ON job_completions;
CREATE POLICY "Users can manage completions for their org jobs"
  ON job_completions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM jobs WHERE jobs.id = job_completions.job_id
    AND jobs.organization_id = get_user_organization_id()
  ));

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Update job_time_entries updated_at
CREATE OR REPLACE FUNCTION update_job_time_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS job_time_entries_updated_at ON job_time_entries;
CREATE TRIGGER job_time_entries_updated_at
  BEFORE UPDATE ON job_time_entries
  FOR EACH ROW EXECUTE FUNCTION update_job_time_entries_updated_at();

-- Update job_completion_checklists updated_at
CREATE OR REPLACE FUNCTION update_job_completion_checklists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS job_completion_checklists_updated_at ON job_completion_checklists;
CREATE TRIGGER job_completion_checklists_updated_at
  BEFORE UPDATE ON job_completion_checklists
  FOR EACH ROW EXECUTE FUNCTION update_job_completion_checklists_updated_at();

-- Update job_completions updated_at
CREATE OR REPLACE FUNCTION update_job_completions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS job_completions_updated_at ON job_completions;
CREATE TRIGGER job_completions_updated_at
  BEFORE UPDATE ON job_completions
  FOR EACH ROW EXECUTE FUNCTION update_job_completions_updated_at();

-- ============================================
-- DEFAULT CHECKLIST ITEMS
-- Function to initialize standard checklist for a job
-- ============================================
CREATE OR REPLACE FUNCTION initialize_job_checklist(p_job_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Safety items
  INSERT INTO job_completion_checklists (job_id, category, item_name, item_description, sort_order, is_required)
  VALUES
    (p_job_id, 'safety', 'PPE Used Properly', 'All crew wore required PPE throughout the job', 1, true),
    (p_job_id, 'safety', 'Safety Perimeter Maintained', 'Work area was properly cordoned off', 2, true),
    (p_job_id, 'safety', 'No Incidents Reported', 'No safety incidents or near-misses occurred', 3, true),
    (p_job_id, 'safety', 'Air Quality Monitored', 'Air quality monitoring was performed as required', 4, false);

  -- Quality items
  INSERT INTO job_completion_checklists (job_id, category, item_name, item_description, sort_order, is_required)
  VALUES
    (p_job_id, 'quality', 'Work Meets Specifications', 'All work completed to specification and standards', 1, true),
    (p_job_id, 'quality', 'Materials Properly Contained', 'Hazardous materials properly contained and sealed', 2, true),
    (p_job_id, 'quality', 'Area Clearance Testing', 'Post-work testing confirms safe levels', 3, false);

  -- Cleanup items
  INSERT INTO job_completion_checklists (job_id, category, item_name, item_description, sort_order, is_required)
  VALUES
    (p_job_id, 'cleanup', 'Work Area Cleaned', 'All debris and waste removed from work area', 1, true),
    (p_job_id, 'cleanup', 'Equipment Cleaned', 'All equipment properly decontaminated', 2, true),
    (p_job_id, 'cleanup', 'Waste Properly Bagged', 'All hazardous waste properly bagged and labeled', 3, true),
    (p_job_id, 'cleanup', 'Disposal Manifests Completed', 'Disposal documentation is complete', 4, true);

  -- Documentation items
  INSERT INTO job_completion_checklists (job_id, category, item_name, item_description, sort_order, is_required)
  VALUES
    (p_job_id, 'documentation', 'Before Photos Taken', 'Photos taken before work began', 1, true),
    (p_job_id, 'documentation', 'After Photos Taken', 'Photos taken after work completed', 2, true),
    (p_job_id, 'documentation', 'Time Entries Complete', 'All crew time entries recorded', 3, true),
    (p_job_id, 'documentation', 'Material Usage Recorded', 'All materials used have been recorded', 4, true);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VARIANCE CALCULATION FUNCTION
-- Calculate and update completion variance
-- ============================================
CREATE OR REPLACE FUNCTION calculate_completion_variance(p_completion_id UUID)
RETURNS VOID AS $$
DECLARE
  v_job_id UUID;
  v_actual_hours DECIMAL(8, 2);
  v_actual_material_cost DECIMAL(12, 2);
  v_estimated_hours DECIMAL(8, 2);
  v_estimated_material_cost DECIMAL(12, 2);
BEGIN
  -- Get job_id
  SELECT job_id INTO v_job_id FROM job_completions WHERE id = p_completion_id;

  -- Calculate actual hours from time entries
  SELECT COALESCE(SUM(hours), 0) INTO v_actual_hours
  FROM job_time_entries WHERE job_id = v_job_id;

  -- Calculate actual material cost from usage
  SELECT COALESCE(SUM(total_cost), 0) INTO v_actual_material_cost
  FROM job_material_usage WHERE job_id = v_job_id;

  -- Get estimated values from job
  SELECT estimated_duration_hours, contract_amount
  INTO v_estimated_hours, v_estimated_material_cost
  FROM jobs WHERE id = v_job_id;

  -- Update completion record
  UPDATE job_completions
  SET
    actual_hours = v_actual_hours,
    actual_material_cost = v_actual_material_cost,
    hours_variance = CASE WHEN v_estimated_hours IS NOT NULL
      THEN v_actual_hours - v_estimated_hours ELSE NULL END,
    hours_variance_percent = CASE WHEN v_estimated_hours IS NOT NULL AND v_estimated_hours > 0
      THEN ((v_actual_hours - v_estimated_hours) / v_estimated_hours * 100) ELSE NULL END,
    cost_variance = CASE WHEN v_estimated_material_cost IS NOT NULL
      THEN v_actual_material_cost - v_estimated_material_cost ELSE NULL END,
    cost_variance_percent = CASE WHEN v_estimated_material_cost IS NOT NULL AND v_estimated_material_cost > 0
      THEN ((v_actual_material_cost - v_estimated_material_cost) / v_estimated_material_cost * 100) ELSE NULL END,
    updated_at = NOW()
  WHERE id = p_completion_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STORAGE BUCKET (comment for manual setup)
-- ============================================
-- Run this in Supabase SQL Editor after migration:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('job-completion-photos', 'job-completion-photos', true);
--
-- Storage policies (run separately):
-- CREATE POLICY "Authenticated users can upload photos"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'job-completion-photos' AND auth.role() = 'authenticated');
--
-- CREATE POLICY "Anyone can view photos"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'job-completion-photos');
--
-- CREATE POLICY "Users can delete their org photos"
--   ON storage.objects FOR DELETE
--   USING (bucket_id = 'job-completion-photos' AND auth.role() = 'authenticated');


-- ============================================================
-- Migration: 20260215000002_customer_feedback.sql
-- ============================================================

-- ============================================
-- CUSTOMER FEEDBACK SYSTEM
-- Phase 4: Post-job surveys, ratings, and review requests
-- ============================================

-- ============================================
-- FEEDBACK SURVEYS
-- Customer satisfaction surveys with token-based access
-- ============================================
CREATE TABLE IF NOT EXISTS feedback_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  -- Token for public access
  access_token VARCHAR(64) NOT NULL UNIQUE,
  token_expires_at TIMESTAMPTZ NOT NULL,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  -- 'pending', 'sent', 'viewed', 'completed', 'expired'

  -- Survey sent tracking
  sent_at TIMESTAMPTZ,
  sent_to_email VARCHAR(255),
  reminder_sent_at TIMESTAMPTZ,

  -- Survey completion
  viewed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Ratings (1-5 scale)
  rating_overall INTEGER CHECK (rating_overall >= 1 AND rating_overall <= 5),
  rating_quality INTEGER CHECK (rating_quality >= 1 AND rating_quality <= 5),
  rating_communication INTEGER CHECK (rating_communication >= 1 AND rating_communication <= 5),
  rating_timeliness INTEGER CHECK (rating_timeliness >= 1 AND rating_timeliness <= 5),
  rating_value INTEGER CHECK (rating_value >= 1 AND rating_value <= 5),

  -- NPS
  would_recommend BOOLEAN,
  likelihood_to_recommend INTEGER CHECK (likelihood_to_recommend >= 0 AND likelihood_to_recommend <= 10),

  -- Feedback text
  feedback_text TEXT,
  improvement_suggestions TEXT,

  -- Testimonial
  testimonial_text TEXT,
  testimonial_permission BOOLEAN DEFAULT FALSE,
  testimonial_approved BOOLEAN DEFAULT FALSE,
  testimonial_approved_at TIMESTAMPTZ,
  testimonial_approved_by UUID REFERENCES profiles(id),

  -- Customer info at time of survey (in case customer record changes)
  customer_name VARCHAR(255),
  customer_company VARCHAR(255),

  -- Metadata
  ip_address VARCHAR(45),
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- REVIEW REQUESTS
-- Track requests to leave reviews on external platforms
-- ============================================
CREATE TABLE IF NOT EXISTS review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  feedback_survey_id UUID REFERENCES feedback_surveys(id) ON DELETE SET NULL,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  -- Platform
  platform VARCHAR(50) NOT NULL,
  -- 'google', 'yelp', 'facebook', 'bbb', 'homeadvisor', 'angi'

  platform_url TEXT,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  -- 'pending', 'sent', 'clicked', 'completed'

  -- Tracking
  sent_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Email tracking
  sent_to_email VARCHAR(255),
  click_token VARCHAR(64),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_feedback_surveys_org ON feedback_surveys(organization_id);
CREATE INDEX IF NOT EXISTS idx_feedback_surveys_job ON feedback_surveys(job_id);
CREATE INDEX IF NOT EXISTS idx_feedback_surveys_customer ON feedback_surveys(customer_id);
CREATE INDEX IF NOT EXISTS idx_feedback_surveys_token ON feedback_surveys(access_token);
CREATE INDEX IF NOT EXISTS idx_feedback_surveys_status ON feedback_surveys(status);
CREATE INDEX IF NOT EXISTS idx_feedback_surveys_testimonial ON feedback_surveys(testimonial_approved)
  WHERE testimonial_approved = true;

CREATE INDEX IF NOT EXISTS idx_review_requests_org ON review_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_review_requests_survey ON review_requests(feedback_survey_id);
CREATE INDEX IF NOT EXISTS idx_review_requests_customer ON review_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_review_requests_platform ON review_requests(platform);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE feedback_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_requests ENABLE ROW LEVEL SECURITY;

-- Surveys - org members can manage, public can access via token
DROP POLICY IF EXISTS "Users can manage their org feedback surveys" ON feedback_surveys;
CREATE POLICY "Users can manage their org feedback surveys"
  ON feedback_surveys FOR ALL
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Public can view surveys by token" ON feedback_surveys;
CREATE POLICY "Public can view surveys by token"
  ON feedback_surveys FOR SELECT
  USING (true); -- Token validation done in application layer

DROP POLICY IF EXISTS "Public can update surveys by token" ON feedback_surveys;
CREATE POLICY "Public can update surveys by token"
  ON feedback_surveys FOR UPDATE
  USING (true); -- Token validation done in application layer

-- Review requests
DROP POLICY IF EXISTS "Users can manage their org review requests" ON review_requests;
CREATE POLICY "Users can manage their org review requests"
  ON review_requests FOR ALL
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Generate secure access token
CREATE OR REPLACE FUNCTION generate_feedback_token()
RETURNS VARCHAR(64) AS $$
DECLARE
  token VARCHAR(64);
  token_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate a random 64-character hex string
    token := encode(gen_random_bytes(32), 'hex');

    -- Check if token already exists
    SELECT EXISTS(SELECT 1 FROM feedback_surveys WHERE access_token = token) INTO token_exists;

    EXIT WHEN NOT token_exists;
  END LOOP;

  RETURN token;
END;
$$ LANGUAGE plpgsql;

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_feedback_surveys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS feedback_surveys_updated_at ON feedback_surveys;
CREATE TRIGGER feedback_surveys_updated_at
  BEFORE UPDATE ON feedback_surveys
  FOR EACH ROW EXECUTE FUNCTION update_feedback_surveys_updated_at();

-- Calculate average rating
CREATE OR REPLACE FUNCTION calculate_survey_average_rating(survey_id UUID)
RETURNS DECIMAL(3, 2) AS $$
DECLARE
  total DECIMAL;
  count INTEGER;
BEGIN
  SELECT
    COALESCE(rating_overall, 0) +
    COALESCE(rating_quality, 0) +
    COALESCE(rating_communication, 0) +
    COALESCE(rating_timeliness, 0) +
    COALESCE(rating_value, 0),
    (CASE WHEN rating_overall IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN rating_quality IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN rating_communication IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN rating_timeliness IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN rating_value IS NOT NULL THEN 1 ELSE 0 END)
  INTO total, count
  FROM feedback_surveys
  WHERE id = survey_id;

  IF count = 0 THEN
    RETURN NULL;
  END IF;

  RETURN total / count;
END;
$$ LANGUAGE plpgsql;

-- Get organization feedback statistics
CREATE OR REPLACE FUNCTION get_feedback_stats(org_id UUID)
RETURNS TABLE (
  total_surveys BIGINT,
  completed_surveys BIGINT,
  avg_overall_rating DECIMAL(3, 2),
  avg_quality_rating DECIMAL(3, 2),
  avg_communication_rating DECIMAL(3, 2),
  avg_timeliness_rating DECIMAL(3, 2),
  nps_score DECIMAL(5, 2),
  testimonials_count BIGINT,
  response_rate DECIMAL(5, 2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_surveys,
    COUNT(*) FILTER (WHERE status = 'completed')::BIGINT as completed_surveys,
    AVG(rating_overall)::DECIMAL(3, 2) as avg_overall_rating,
    AVG(rating_quality)::DECIMAL(3, 2) as avg_quality_rating,
    AVG(rating_communication)::DECIMAL(3, 2) as avg_communication_rating,
    AVG(rating_timeliness)::DECIMAL(3, 2) as avg_timeliness_rating,
    (
      (COUNT(*) FILTER (WHERE likelihood_to_recommend >= 9)::DECIMAL / NULLIF(COUNT(*) FILTER (WHERE likelihood_to_recommend IS NOT NULL), 0) * 100) -
      (COUNT(*) FILTER (WHERE likelihood_to_recommend <= 6)::DECIMAL / NULLIF(COUNT(*) FILTER (WHERE likelihood_to_recommend IS NOT NULL), 0) * 100)
    )::DECIMAL(5, 2) as nps_score,
    COUNT(*) FILTER (WHERE testimonial_approved = true)::BIGINT as testimonials_count,
    (COUNT(*) FILTER (WHERE status = 'completed')::DECIMAL / NULLIF(COUNT(*) FILTER (WHERE status != 'pending'), 0) * 100)::DECIMAL(5, 2) as response_rate
  FROM feedback_surveys
  WHERE organization_id = org_id;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- Migration: 20260215000003_notifications.sql
-- ============================================================

-- ============================================
-- NOTIFICATIONS SYSTEM
-- Phase 4: In-app notifications and email alerts
-- ============================================

-- ============================================
-- NOTIFICATIONS TABLE
-- In-app notifications for users
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Notification type
  type VARCHAR(50) NOT NULL,
  -- 'job_assigned', 'job_completed', 'job_completion_review'
  -- 'proposal_signed', 'proposal_viewed'
  -- 'invoice_paid', 'invoice_overdue', 'invoice_viewed'
  -- 'feedback_received', 'testimonial_pending'
  -- 'system', 'reminder'

  -- Content
  title VARCHAR(255) NOT NULL,
  message TEXT,

  -- Related entity
  entity_type VARCHAR(50),
  entity_id UUID,

  -- Action URL
  action_url TEXT,
  action_label VARCHAR(100),

  -- Status
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,

  -- Priority
  priority VARCHAR(20) DEFAULT 'normal',
  -- 'low', 'normal', 'high', 'urgent'

  -- Email tracking
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- ============================================
-- NOTIFICATION PREFERENCES
-- Per-user settings for notification channels
-- ============================================
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Notification type
  notification_type VARCHAR(50) NOT NULL,

  -- Channels
  in_app BOOLEAN DEFAULT TRUE,
  email BOOLEAN DEFAULT TRUE,
  push BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, notification_type)
);

-- ============================================
-- PUSH SUBSCRIPTIONS
-- PWA push notification subscriptions
-- ============================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Subscription data
  endpoint TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,

  -- Device info
  device_name VARCHAR(255),
  user_agent TEXT,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, endpoint)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_org ON notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read)
  WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON notifications(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_type ON notification_preferences(notification_type);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(user_id, is_active)
  WHERE is_active = true;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Notifications - users can only see their own
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System can create notifications" ON notifications;
CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

-- Notification preferences - users can manage their own
DROP POLICY IF EXISTS "Users can manage their notification preferences" ON notification_preferences;
CREATE POLICY "Users can manage their notification preferences"
  ON notification_preferences FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Push subscriptions - users can manage their own
DROP POLICY IF EXISTS "Users can manage their push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can manage their push subscriptions"
  ON push_subscriptions FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Update notification_preferences updated_at
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_notification_preferences_updated_at();

-- Get unread notification count for a user
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM notifications
    WHERE user_id = p_user_id
    AND is_read = false
    AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql;

-- Create notification for all users with a specific role in an org
CREATE OR REPLACE FUNCTION create_notification_for_role(
  p_organization_id UUID,
  p_role VARCHAR(50),
  p_type VARCHAR(50),
  p_title VARCHAR(255),
  p_message TEXT DEFAULT NULL,
  p_entity_type VARCHAR(50) DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_action_url TEXT DEFAULT NULL,
  p_priority VARCHAR(20) DEFAULT 'normal'
)
RETURNS SETOF notifications AS $$
DECLARE
  v_user_id UUID;
BEGIN
  FOR v_user_id IN
    SELECT id FROM profiles
    WHERE organization_id = p_organization_id
    AND role = p_role
  LOOP
    RETURN QUERY
    INSERT INTO notifications (
      organization_id,
      user_id,
      type,
      title,
      message,
      entity_type,
      entity_id,
      action_url,
      priority
    ) VALUES (
      p_organization_id,
      v_user_id,
      p_type,
      p_title,
      p_message,
      p_entity_type,
      p_entity_id,
      p_action_url,
      p_priority
    )
    RETURNING *;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Initialize default notification preferences for a user
CREATE OR REPLACE FUNCTION initialize_notification_preferences(p_user_id UUID, p_org_id UUID)
RETURNS VOID AS $$
DECLARE
  notification_types TEXT[] := ARRAY[
    'job_assigned',
    'job_completed',
    'job_completion_review',
    'proposal_signed',
    'proposal_viewed',
    'invoice_paid',
    'invoice_overdue',
    'feedback_received',
    'system'
  ];
  nt TEXT;
BEGIN
  FOREACH nt IN ARRAY notification_types
  LOOP
    INSERT INTO notification_preferences (user_id, organization_id, notification_type, in_app, email, push)
    VALUES (p_user_id, p_org_id, nt, true, true, false)
    ON CONFLICT (user_id, notification_type) DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Clean up expired notifications (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM notifications
    WHERE expires_at IS NOT NULL
    AND expires_at < NOW()
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- DEFAULT NOTIFICATION TYPES
-- Reference for application layer
-- ============================================
COMMENT ON TABLE notifications IS 'Notification types:
- job_assigned: When a crew member is assigned to a job
- job_completed: When a job is marked as completed
- job_completion_review: When a completion needs admin review
- proposal_signed: When a customer signs a proposal
- proposal_viewed: When a customer views a proposal
- invoice_paid: When an invoice is paid
- invoice_overdue: When an invoice becomes overdue
- invoice_viewed: When a customer views an invoice
- feedback_received: When customer feedback is submitted
- testimonial_pending: When a testimonial needs approval
- system: System announcements
- reminder: Scheduled reminders';


-- ============================================================
-- Migration: 20260220000001_reporting.sql
-- ============================================================

-- ============================================
-- REPORTING INFRASTRUCTURE
-- Phase 6: Advanced Reporting
-- ============================================

-- Saved reports (user-created custom reports)
CREATE TABLE IF NOT EXISTS saved_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id),

  -- Report definition
  name VARCHAR(200) NOT NULL,
  description TEXT,
  report_type VARCHAR(50) NOT NULL, -- sales, jobs, leads, revenue, custom

  -- Configuration stored as JSON
  config JSONB NOT NULL DEFAULT '{}',
  -- {
  --   date_range: { type: 'last_30_days', start?, end? },
  --   filters: [{ field, operator, value }],
  --   grouping: { field, interval },
  --   metrics: ['revenue', 'count'],
  --   columns: [{ field, label, visible, format }],
  --   chart_type: 'bar' | 'line' | 'pie'
  -- }

  -- Sharing
  is_shared BOOLEAN DEFAULT false,

  -- Scheduling
  schedule_enabled BOOLEAN DEFAULT false,
  schedule_frequency VARCHAR(20), -- daily, weekly, monthly
  schedule_recipients TEXT[],
  last_sent_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Report export history
CREATE TABLE IF NOT EXISTS report_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  report_id UUID REFERENCES saved_reports(id) ON DELETE SET NULL,
  exported_by UUID NOT NULL REFERENCES profiles(id),

  report_name VARCHAR(200) NOT NULL,
  export_format VARCHAR(20) NOT NULL, -- xlsx, csv, pdf
  file_path TEXT,
  file_size INTEGER,
  parameters JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MATERIALIZED VIEWS FOR FAST REPORTING
-- ============================================

-- Sales performance by rep by month
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_sales_performance AS
SELECT
  p.organization_id,
  p.id as user_id,
  p.full_name,
  DATE_TRUNC('month', pr.created_at) as month,

  COUNT(DISTINCT pr.id) as proposals_sent,
  COUNT(DISTINCT CASE WHEN pr.status = 'signed' THEN pr.id END) as proposals_won,
  COUNT(DISTINCT CASE WHEN pr.status = 'rejected' THEN pr.id END) as proposals_lost,

  COALESCE(SUM(CASE WHEN pr.status = 'signed' THEN pr.total END), 0) as revenue_won,
  COALESCE(AVG(CASE WHEN pr.status = 'signed' THEN pr.total END), 0) as avg_deal_size,

  CASE
    WHEN COUNT(DISTINCT CASE WHEN pr.status IN ('signed', 'rejected') THEN pr.id END) > 0
    THEN ROUND(
      COUNT(DISTINCT CASE WHEN pr.status = 'signed' THEN pr.id END)::NUMERIC /
      COUNT(DISTINCT CASE WHEN pr.status IN ('signed', 'rejected') THEN pr.id END) * 100, 1
    )
    ELSE 0
  END as win_rate

FROM profiles p
LEFT JOIN proposals pr ON pr.created_by = p.id
WHERE p.role IN ('admin', 'owner', 'sales', 'tenant_owner')
GROUP BY p.organization_id, p.id, p.full_name, DATE_TRUNC('month', pr.created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_sales_perf ON mv_sales_performance(organization_id, user_id, month);

-- Job cost analysis
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_job_costs AS
SELECT
  j.organization_id,
  j.id as job_id,
  j.job_number,
  j.title,
  j.hazard_types,
  DATE_TRUNC('month', j.completed_at) as month,
  c.company_name as customer_name,

  e.total as estimated_total,
  COALESCE(jc.actual_labor_cost, 0) as actual_labor,
  COALESCE(jc.actual_material_cost, 0) as actual_materials,
  COALESCE(jc.actual_total, 0) as actual_total,

  COALESCE(i.total, 0) as invoiced,
  COALESCE(i.amount_paid, 0) as collected,

  COALESCE(e.total, 0) - COALESCE(jc.actual_total, 0) as variance,
  CASE WHEN e.total > 0
    THEN ROUND((COALESCE(e.total, 0) - COALESCE(jc.actual_total, 0)) / e.total * 100, 1)
    ELSE 0
  END as variance_pct

FROM jobs j
LEFT JOIN customers c ON j.customer_id = c.id
LEFT JOIN estimates e ON j.estimate_id = e.id
LEFT JOIN job_completions jc ON j.id = jc.job_id
LEFT JOIN invoices i ON i.job_id = j.id
WHERE j.status = 'completed';

CREATE INDEX IF NOT EXISTS idx_mv_job_costs ON mv_job_costs(organization_id, month);

-- Lead source ROI
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_lead_source_roi AS
SELECT
  c.organization_id,
  c.source,
  DATE_TRUNC('month', c.created_at) as month,

  COUNT(DISTINCT c.id) as leads,
  COUNT(DISTINCT CASE WHEN c.status = 'active' THEN c.id END) as converted,

  COALESCE(SUM(i.total), 0) as total_revenue,

  ROUND(
    COUNT(DISTINCT CASE WHEN c.status = 'active' THEN c.id END)::NUMERIC /
    NULLIF(COUNT(DISTINCT c.id), 0) * 100, 1
  ) as conversion_rate,

  ROUND(
    COALESCE(SUM(i.total), 0)::NUMERIC /
    NULLIF(COUNT(DISTINCT CASE WHEN c.status = 'active' THEN c.id END), 0), 2
  ) as avg_revenue_per_conversion

FROM customers c
LEFT JOIN invoices i ON c.id = i.customer_id AND i.status = 'paid'
GROUP BY c.organization_id, c.source, DATE_TRUNC('month', c.created_at);

CREATE INDEX IF NOT EXISTS idx_mv_lead_roi ON mv_lead_source_roi(organization_id, month);

-- Function to refresh views
CREATE OR REPLACE FUNCTION refresh_report_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_sales_performance;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_job_costs;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_lead_source_roi;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- INDEXES & RLS
-- ============================================
CREATE INDEX IF NOT EXISTS idx_saved_reports_org ON saved_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_saved_reports_type ON saved_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_report_exports_org ON report_exports(organization_id);

ALTER TABLE saved_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_exports ENABLE ROW LEVEL SECURITY;

-- Users can view own and shared reports
CREATE POLICY "Users can view own and shared reports"
  ON saved_reports FOR SELECT
  USING (organization_id = get_user_organization_id()
    AND (created_by = auth.uid() OR is_shared = true));

-- Users can manage own reports
CREATE POLICY "Users can manage own reports"
  ON saved_reports FOR ALL
  USING (organization_id = get_user_organization_id() AND created_by = auth.uid());

-- Users can view org exports
CREATE POLICY "Users can view org exports"
  ON report_exports FOR SELECT
  USING (organization_id = get_user_organization_id());

-- Users can create exports
CREATE POLICY "Users can create exports"
  ON report_exports FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================
CREATE TRIGGER set_saved_reports_updated_at
  BEFORE UPDATE ON saved_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- Migration: 20260220000002_sales_tools.sql
-- ============================================================

-- ============================================
-- SALES TOOLS
-- Phase 6: Sales Pipeline, Commissions, Approvals
-- ============================================

-- ============================================
-- SALES PIPELINE
-- ============================================

CREATE TABLE IF NOT EXISTS pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  name VARCHAR(100) NOT NULL,
  color VARCHAR(20) DEFAULT '#6366f1',
  stage_type VARCHAR(50) NOT NULL, -- lead, qualified, proposal, negotiation, won, lost
  probability INTEGER DEFAULT 0, -- 0-100
  sort_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  name VARCHAR(200) NOT NULL,
  description TEXT,
  stage_id UUID NOT NULL REFERENCES pipeline_stages(id),

  estimated_value DECIMAL(12,2),
  weighted_value DECIMAL(12,2),

  expected_close_date DATE,
  actual_close_date DATE,

  owner_id UUID REFERENCES profiles(id),
  estimate_id UUID REFERENCES estimates(id),
  proposal_id UUID REFERENCES proposals(id),
  job_id UUID REFERENCES jobs(id),

  outcome VARCHAR(20), -- won, lost, abandoned
  loss_reason VARCHAR(100),
  loss_notes TEXT,
  competitor VARCHAR(200),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS opportunity_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  from_stage_id UUID REFERENCES pipeline_stages(id),
  to_stage_id UUID NOT NULL REFERENCES pipeline_stages(id),
  changed_by UUID NOT NULL REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- COMMISSIONS
-- ============================================

CREATE TABLE IF NOT EXISTS commission_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  name VARCHAR(100) NOT NULL,
  commission_type VARCHAR(20) NOT NULL, -- percentage, flat, tiered
  base_rate DECIMAL(5,2),
  tiers JSONB, -- [{ min, max, rate }]
  applies_to VARCHAR(50) DEFAULT 'won', -- won, invoiced, paid
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS commission_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  plan_id UUID NOT NULL REFERENCES commission_plans(id),

  opportunity_id UUID REFERENCES opportunities(id),
  job_id UUID REFERENCES jobs(id),
  invoice_id UUID REFERENCES invoices(id),

  base_amount DECIMAL(12,2) NOT NULL,
  commission_rate DECIMAL(5,2) NOT NULL,
  commission_amount DECIMAL(12,2) NOT NULL,

  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, paid
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,

  earning_date DATE NOT NULL,
  pay_period VARCHAR(20),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TWO-LEVEL APPROVALS
-- ============================================

CREATE TABLE IF NOT EXISTS approval_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  entity_type VARCHAR(50) NOT NULL, -- estimate, discount, proposal
  threshold_amount DECIMAL(12,2) NOT NULL,
  approval_level INTEGER NOT NULL, -- 1 or 2
  approver_role VARCHAR(50),
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, entity_type, approval_level)
);

CREATE TABLE IF NOT EXISTS approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  amount DECIMAL(12,2),

  requested_by UUID NOT NULL REFERENCES profiles(id),
  requested_at TIMESTAMPTZ DEFAULT NOW(),

  -- Level 1
  level1_status VARCHAR(20) DEFAULT 'pending',
  level1_approver UUID REFERENCES profiles(id),
  level1_at TIMESTAMPTZ,
  level1_notes TEXT,

  -- Level 2 (if required)
  requires_level2 BOOLEAN DEFAULT false,
  level2_status VARCHAR(20),
  level2_approver UUID REFERENCES profiles(id),
  level2_at TIMESTAMPTZ,
  level2_notes TEXT,

  final_status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_org ON pipeline_stages(organization_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_active ON pipeline_stages(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_opportunities_org ON opportunities(organization_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON opportunities(stage_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_customer ON opportunities(customer_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_owner ON opportunities(owner_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_history_opp ON opportunity_history(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_commission_plans_org ON commission_plans(organization_id);
CREATE INDEX IF NOT EXISTS idx_commission_earnings_user ON commission_earnings(user_id);
CREATE INDEX IF NOT EXISTS idx_commission_earnings_status ON commission_earnings(status);
CREATE INDEX IF NOT EXISTS idx_approval_thresholds_org ON approval_thresholds(organization_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_entity ON approval_requests(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(final_status);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;

-- Pipeline stages - org access
CREATE POLICY "Org access pipeline_stages" ON pipeline_stages FOR ALL
  USING (organization_id = get_user_organization_id());

-- Opportunities - org access
CREATE POLICY "Org access opportunities" ON opportunities FOR ALL
  USING (organization_id = get_user_organization_id());

-- Opportunity history - org access via opportunity
CREATE POLICY "Org access opportunity_history" ON opportunity_history FOR ALL
  USING (EXISTS (
    SELECT 1 FROM opportunities o
    WHERE o.id = opportunity_history.opportunity_id
    AND o.organization_id = get_user_organization_id()
  ));

-- Commission plans - org access
CREATE POLICY "Org access commission_plans" ON commission_plans FOR ALL
  USING (organization_id = get_user_organization_id());

-- Commission earnings: users see own, admins see all
CREATE POLICY "Users see own commissions" ON commission_earnings FOR SELECT
  USING (organization_id = get_user_organization_id()
    AND (user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner', 'tenant_owner')
    )));

CREATE POLICY "Admins manage commissions" ON commission_earnings FOR ALL
  USING (organization_id = get_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner', 'tenant_owner')
    ));

-- Approval thresholds - org access for admins
CREATE POLICY "Admins manage approval_thresholds" ON approval_thresholds FOR ALL
  USING (organization_id = get_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner', 'tenant_owner')
    ));

CREATE POLICY "Users view approval_thresholds" ON approval_thresholds FOR SELECT
  USING (organization_id = get_user_organization_id());

-- Approval requests - org access
CREATE POLICY "Org access approval_requests" ON approval_requests FOR ALL
  USING (organization_id = get_user_organization_id());

-- ============================================
-- DEFAULT PIPELINE STAGES (per org)
-- ============================================
CREATE OR REPLACE FUNCTION create_default_pipeline_stages()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO pipeline_stages (organization_id, name, color, stage_type, probability, sort_order)
  VALUES
    (NEW.id, 'New Lead', '#94a3b8', 'lead', 10, 1),
    (NEW.id, 'Qualified', '#3b82f6', 'qualified', 25, 2),
    (NEW.id, 'Proposal Sent', '#8b5cf6', 'proposal', 50, 3),
    (NEW.id, 'Negotiation', '#f59e0b', 'negotiation', 75, 4),
    (NEW.id, 'Won', '#22c55e', 'won', 100, 5),
    (NEW.id, 'Lost', '#ef4444', 'lost', 0, 6);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'create_pipeline_stages_for_new_org') THEN
    CREATE TRIGGER create_pipeline_stages_for_new_org
      AFTER INSERT ON organizations
      FOR EACH ROW
      EXECUTE FUNCTION create_default_pipeline_stages();
  END IF;
END $$;

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================
CREATE TRIGGER set_opportunities_updated_at
  BEFORE UPDATE ON opportunities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- Migration: 20260301000001_marketing_integrations.sql
-- ============================================================

-- ============================================
-- PHASE 7: MARKETING INTEGRATIONS
-- Customer segments, segment members, marketing sync
-- ============================================

-- ============================================
-- CUSTOMER SEGMENTS TABLE
-- ============================================
CREATE TABLE customer_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Segment details
  name VARCHAR(100) NOT NULL,
  description TEXT,
  segment_type VARCHAR(20) NOT NULL DEFAULT 'dynamic', -- 'dynamic' or 'static'

  -- Dynamic segment rules (JSON array of conditions)
  -- e.g., [{"field": "total_revenue", "operator": ">", "value": 10000}, {"field": "job_count", "operator": ">=", "value": 3}]
  rules JSONB DEFAULT '[]',

  -- Cached counts for display
  member_count INTEGER DEFAULT 0,
  last_calculated_at TIMESTAMPTZ,

  -- Sync tracking
  mailchimp_tag_id VARCHAR(100),
  mailchimp_synced_at TIMESTAMPTZ,
  hubspot_list_id VARCHAR(100),
  hubspot_synced_at TIMESTAMPTZ,

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SEGMENT MEMBERS TABLE (for static segments)
-- ============================================
CREATE TABLE segment_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id UUID NOT NULL REFERENCES customer_segments(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  -- When was this member added
  added_at TIMESTAMPTZ DEFAULT NOW(),
  added_by UUID REFERENCES profiles(id),

  UNIQUE(segment_id, customer_id)
);

-- ============================================
-- MARKETING SYNC LOG TABLE
-- ============================================
CREATE TABLE marketing_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Sync details
  integration_type VARCHAR(50) NOT NULL, -- 'mailchimp', 'hubspot'
  sync_type VARCHAR(50) NOT NULL, -- 'contact', 'segment', 'full'
  entity_id UUID, -- Customer or segment ID

  -- Results
  status VARCHAR(20) NOT NULL, -- 'success', 'failed'
  external_id VARCHAR(255), -- Remote ID after sync
  error_message TEXT,

  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER
);

-- ============================================
-- ADD MARKETING SYNC COLUMNS TO CUSTOMERS
-- ============================================
ALTER TABLE customers ADD COLUMN IF NOT EXISTS mailchimp_id VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS mailchimp_synced_at TIMESTAMPTZ;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS hubspot_id VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS hubspot_synced_at TIMESTAMPTZ;

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_customer_segments_org ON customer_segments(organization_id);
CREATE INDEX idx_customer_segments_type ON customer_segments(segment_type);
CREATE INDEX idx_customer_segments_active ON customer_segments(is_active) WHERE is_active = true;
CREATE INDEX idx_segment_members_segment ON segment_members(segment_id);
CREATE INDEX idx_segment_members_customer ON segment_members(customer_id);
CREATE INDEX idx_marketing_sync_log_org ON marketing_sync_log(organization_id);
CREATE INDEX idx_marketing_sync_log_type ON marketing_sync_log(integration_type, sync_type);
CREATE INDEX idx_customers_mailchimp ON customers(mailchimp_id) WHERE mailchimp_id IS NOT NULL;
CREATE INDEX idx_customers_hubspot ON customers(hubspot_id) WHERE hubspot_id IS NOT NULL;

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE customer_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE segment_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their org segments"
  ON customer_segments FOR ALL
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can manage segment members for their org"
  ON segment_members FOR ALL
  USING (
    segment_id IN (
      SELECT id FROM customer_segments
      WHERE organization_id = get_user_organization_id()
    )
  )
  WITH CHECK (
    segment_id IN (
      SELECT id FROM customer_segments
      WHERE organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "Users can view their org marketing sync logs"
  ON marketing_sync_log FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "System can insert marketing sync logs"
  ON marketing_sync_log FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

-- ============================================
-- TRIGGER FOR UPDATED_AT
-- ============================================
CREATE TRIGGER update_customer_segments_updated_at
  BEFORE UPDATE ON customer_segments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- Migration: 20260301000002_calendar_automation.sql
-- ============================================================

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


-- ============================================================
-- Migration: 20260301000003_platform_extensibility.sql
-- ============================================================

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


-- ============================================================
-- Migration: 20260301000004_ai_features.sql
-- ============================================================

-- ============================================
-- PHASE 7: AI FEATURES
-- Estimate suggestions, photo analysis, voice transcription
-- ============================================

-- ============================================
-- ESTIMATE SUGGESTIONS TABLE
-- ============================================
CREATE TABLE estimate_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Context for the suggestion
  site_survey_id UUID REFERENCES site_surveys(id) ON DELETE SET NULL,
  hazard_types TEXT[] DEFAULT '{}',
  property_type VARCHAR(50),
  square_footage INTEGER,

  -- Suggested line items
  suggested_items JSONB NOT NULL DEFAULT '[]',
  total_amount DECIMAL(12, 2),

  -- AI model info
  model_version VARCHAR(50),
  confidence_score DECIMAL(5, 4), -- 0.0000 to 1.0000
  reasoning TEXT, -- AI explanation for suggestions

  -- Usage tracking
  was_accepted BOOLEAN,
  accepted_at TIMESTAMPTZ,
  modified_before_accept BOOLEAN,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PHOTO ANALYSES TABLE
-- ============================================
CREATE TABLE photo_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Source
  job_photo_id UUID, -- Reference to job_photos if applicable
  image_url TEXT,
  image_hash VARCHAR(64), -- SHA-256 for deduplication

  -- Analysis context
  property_type VARCHAR(50),
  known_hazards TEXT[] DEFAULT '{}',

  -- Results
  detected_hazards JSONB NOT NULL DEFAULT '[]', -- Array of { type, confidence, location, description }
  overall_risk_level VARCHAR(20), -- 'low', 'medium', 'high', 'critical'
  recommendations JSONB DEFAULT '[]', -- Array of suggested actions
  raw_analysis TEXT, -- Full AI response

  -- Model info
  model_version VARCHAR(50),
  processing_time_ms INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- VOICE TRANSCRIPTIONS TABLE
-- ============================================
CREATE TABLE voice_transcriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Source
  audio_url TEXT,
  audio_duration_seconds INTEGER,
  audio_format VARCHAR(20), -- 'webm', 'mp3', 'wav', etc.

  -- Context
  context_type VARCHAR(50), -- 'site_survey_note', 'job_note', 'customer_note'
  context_id UUID, -- ID of the related entity

  -- Transcription results
  raw_transcription TEXT NOT NULL,
  processed_text TEXT, -- Cleaned/formatted text
  extracted_data JSONB DEFAULT '{}', -- Structured data from the transcription

  -- Model info
  transcription_model VARCHAR(50), -- 'whisper-1', etc.
  processing_model VARCHAR(50), -- 'claude', etc.
  processing_time_ms INTEGER,

  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_estimate_suggestions_org ON estimate_suggestions(organization_id);
CREATE INDEX idx_estimate_suggestions_survey ON estimate_suggestions(site_survey_id) WHERE site_survey_id IS NOT NULL;

CREATE INDEX idx_photo_analyses_org ON photo_analyses(organization_id);
CREATE INDEX idx_photo_analyses_hash ON photo_analyses(image_hash);
CREATE INDEX idx_photo_analyses_job_photo ON photo_analyses(job_photo_id) WHERE job_photo_id IS NOT NULL;

CREATE INDEX idx_voice_transcriptions_org ON voice_transcriptions(organization_id);
CREATE INDEX idx_voice_transcriptions_user ON voice_transcriptions(user_id);
CREATE INDEX idx_voice_transcriptions_context ON voice_transcriptions(context_type, context_id);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE estimate_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_transcriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their org estimate suggestions"
  ON estimate_suggestions FOR ALL
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can manage their org photo analyses"
  ON photo_analyses FOR ALL
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can manage their org voice transcriptions"
  ON voice_transcriptions FOR ALL
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());


-- ============================================================
-- Migration: 20260301000005_sms.sql
-- ============================================================

-- ============================================
-- PHASE 7: SMS INFRASTRUCTURE
-- ============================================

-- ============================================
-- SMS ENUMS
-- ============================================
CREATE TYPE sms_status AS ENUM (
  'queued', 'sending', 'sent', 'delivered', 'failed', 'undelivered'
);

CREATE TYPE sms_message_type AS ENUM (
  'appointment_reminder',
  'job_status',
  'lead_notification',
  'payment_reminder',
  'estimate_follow_up',
  'general'
);

-- ============================================
-- ORGANIZATION SMS SETTINGS
-- ============================================
CREATE TABLE organization_sms_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Twilio credentials (can use own or platform shared)
  twilio_account_sid TEXT,
  twilio_auth_token TEXT,
  twilio_phone_number TEXT,
  use_platform_twilio BOOLEAN DEFAULT true,

  -- Feature toggles
  sms_enabled BOOLEAN DEFAULT false,
  appointment_reminders_enabled BOOLEAN DEFAULT true,
  appointment_reminder_hours INTEGER DEFAULT 24,
  job_status_updates_enabled BOOLEAN DEFAULT true,
  lead_notifications_enabled BOOLEAN DEFAULT true,
  payment_reminders_enabled BOOLEAN DEFAULT false,

  -- Quiet hours (TCPA compliance)
  quiet_hours_enabled BOOLEAN DEFAULT true,
  quiet_hours_start TIME DEFAULT '21:00',
  quiet_hours_end TIME DEFAULT '08:00',
  timezone VARCHAR(50) DEFAULT 'America/Chicago',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id)
);

-- ============================================
-- CUSTOMER SMS PREFERENCES
-- ============================================
ALTER TABLE customers ADD COLUMN IF NOT EXISTS sms_opt_in BOOLEAN DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS sms_opt_in_at TIMESTAMPTZ;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS sms_opt_out_at TIMESTAMPTZ;

-- ============================================
-- SMS MESSAGES LOG
-- ============================================
CREATE TABLE sms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Recipient
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  to_phone VARCHAR(20) NOT NULL,

  -- Message
  message_type sms_message_type NOT NULL,
  body TEXT NOT NULL,

  -- Related entity
  related_entity_type VARCHAR(50),
  related_entity_id UUID,

  -- Twilio tracking
  twilio_message_sid VARCHAR(50),
  status sms_status DEFAULT 'queued',
  error_code VARCHAR(20),
  error_message TEXT,

  -- Timestamps
  queued_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,

  -- Cost tracking
  segments INTEGER DEFAULT 1,
  cost DECIMAL(10,4)
);

-- ============================================
-- SMS TEMPLATES
-- ============================================
CREATE TABLE sms_templates (
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

-- ============================================
-- JOB REMINDER TRACKING
-- ============================================
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_sms_settings_org ON organization_sms_settings(organization_id);
CREATE INDEX idx_sms_messages_org ON sms_messages(organization_id);
CREATE INDEX idx_sms_messages_customer ON sms_messages(customer_id);
CREATE INDEX idx_sms_messages_status ON sms_messages(status);
CREATE INDEX idx_sms_messages_type ON sms_messages(message_type);
CREATE INDEX idx_sms_messages_twilio_sid ON sms_messages(twilio_message_sid);
CREATE INDEX idx_sms_templates_org ON sms_templates(organization_id);
CREATE INDEX idx_sms_templates_type ON sms_templates(message_type);
CREATE INDEX idx_jobs_reminder ON jobs(scheduled_start, reminder_sent_at) WHERE status = 'scheduled';

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE organization_sms_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their org SMS settings"
  ON organization_sms_settings FOR ALL
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can manage their org SMS messages"
  ON sms_messages FOR ALL
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can view system and org SMS templates"
  ON sms_templates FOR SELECT
  USING (organization_id IS NULL OR organization_id = get_user_organization_id());

CREATE POLICY "Users can manage their org SMS templates"
  ON sms_templates FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update their org SMS templates"
  ON sms_templates FOR UPDATE
  USING (organization_id = get_user_organization_id() AND is_system = false)
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete their org SMS templates"
  ON sms_templates FOR DELETE
  USING (organization_id = get_user_organization_id() AND is_system = false);

-- ============================================
-- DEFAULT SYSTEM TEMPLATES
-- ============================================
INSERT INTO sms_templates (organization_id, name, message_type, body, is_system) VALUES
(NULL, 'Appointment Reminder', 'appointment_reminder',
 'Hi {{customer_name}}! Reminder: {{company_name}} is scheduled for {{job_date}} at {{job_time}}. Reply STOP to opt out.', true),
(NULL, 'Job En Route', 'job_status',
 '{{company_name}}: Our crew is on the way! Expected arrival: {{eta}}. Questions? Call {{company_phone}}', true),
(NULL, 'Job Complete', 'job_status',
 '{{company_name}}: Your job is complete! Thank you for your business. Invoice will be sent shortly.', true),
(NULL, 'New Lead Response', 'lead_notification',
 'Hi {{customer_name}}! Thanks for contacting {{company_name}}. We''ll reach out within {{response_time}} to discuss your project.', true),
(NULL, 'Estimate Follow-up', 'estimate_follow_up',
 'Hi {{customer_name}}! Following up on your estimate from {{company_name}}. Questions? Reply or call {{company_phone}}', true),
(NULL, 'Payment Reminder', 'payment_reminder',
 '{{company_name}}: Reminder - Invoice #{{invoice_number}} for ${{amount}} is due {{due_date}}. Pay online: {{payment_link}}', true);


-- ============================================================
-- Migration: 20260301000006_performance_indexes.sql
-- ============================================================

-- Performance optimization indexes
-- These indexes improve query performance for common search and filter operations

-- Full-text search index on customers for name/company search
-- Uses GIN index with tsvector for efficient text search
CREATE INDEX IF NOT EXISTS idx_customers_search
ON customers USING gin(to_tsvector('english', name || ' ' || COALESCE(company_name, '')));

-- Composite index for jobs filtering by status and date
-- Optimizes dashboard queries that filter by organization, status, and scheduled date
CREATE INDEX IF NOT EXISTS idx_jobs_status_date
ON jobs(organization_id, status, scheduled_date);

-- Additional performance indexes for common query patterns

-- Index for customer lookup by organization and status
CREATE INDEX IF NOT EXISTS idx_customers_org_status
ON customers(organization_id, status);

-- Index for estimates by organization and status
CREATE INDEX IF NOT EXISTS idx_estimates_org_status
ON estimates(organization_id, status);

-- Index for invoices by organization and status
CREATE INDEX IF NOT EXISTS idx_invoices_org_status
ON invoices(organization_id, status);

-- Index for proposals by organization and status
CREATE INDEX IF NOT EXISTS idx_proposals_org_status
ON proposals(organization_id, status);

-- Index for site surveys by organization and status
CREATE INDEX IF NOT EXISTS idx_site_surveys_org_status
ON site_surveys(organization_id, status);

-- Index for notifications by user and read status
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
ON notifications(user_id, is_read) WHERE is_read = false;

-- Index for audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_log_org_created
ON audit_log(organization_id, created_at DESC);

-- Index for job time entries lookup
CREATE INDEX IF NOT EXISTS idx_job_time_entries_job
ON job_time_entries(job_id, work_date);

-- Index for job completion photos
CREATE INDEX IF NOT EXISTS idx_job_completion_photos_job
ON job_completion_photos(job_id, created_at);


-- ============================================================
-- Migration: 20260302000001_optimize_variance_calculation.sql
-- ============================================================

-- Migration: Optimize variance calculation to avoid N+1 query pattern
-- This adds a variant of calculate_completion_variance that accepts job_id directly,
-- avoiding the extra query to look up completion_id first.

-- Create variant that accepts job_id directly
CREATE OR REPLACE FUNCTION calculate_completion_variance_by_job(p_job_id UUID)
RETURNS VOID AS $$
DECLARE
  v_completion_id UUID;
  v_actual_hours DECIMAL(8, 2);
  v_actual_material_cost DECIMAL(12, 2);
  v_estimated_hours DECIMAL(8, 2);
  v_estimated_material_cost DECIMAL(12, 2);
BEGIN
  -- Get completion_id if it exists
  SELECT id INTO v_completion_id FROM job_completions WHERE job_id = p_job_id;

  -- If no completion record exists, nothing to update
  IF v_completion_id IS NULL THEN
    RETURN;
  END IF;

  -- Calculate actual hours from time entries
  SELECT COALESCE(SUM(hours), 0) INTO v_actual_hours
  FROM job_time_entries WHERE job_id = p_job_id;

  -- Calculate actual material cost from usage
  SELECT COALESCE(SUM(total_cost), 0) INTO v_actual_material_cost
  FROM job_material_usage WHERE job_id = p_job_id;

  -- Get estimated values from job
  SELECT estimated_duration_hours, contract_amount
  INTO v_estimated_hours, v_estimated_material_cost
  FROM jobs WHERE id = p_job_id;

  -- Update completion record
  UPDATE job_completions
  SET
    actual_hours = v_actual_hours,
    actual_material_cost = v_actual_material_cost,
    hours_variance = CASE WHEN v_estimated_hours IS NOT NULL AND v_estimated_hours > 0
      THEN v_actual_hours - v_estimated_hours
      ELSE NULL
    END,
    hours_variance_percent = CASE WHEN v_estimated_hours IS NOT NULL AND v_estimated_hours > 0
      THEN ((v_actual_hours - v_estimated_hours) / v_estimated_hours * 100)::DECIMAL(5, 2)
      ELSE NULL
    END,
    material_variance = CASE WHEN v_estimated_material_cost IS NOT NULL AND v_estimated_material_cost > 0
      THEN v_actual_material_cost - v_estimated_material_cost
      ELSE NULL
    END,
    material_variance_percent = CASE WHEN v_estimated_material_cost IS NOT NULL AND v_estimated_material_cost > 0
      THEN ((v_actual_material_cost - v_estimated_material_cost) / v_estimated_material_cost * 100)::DECIMAL(5, 2)
      ELSE NULL
    END,
    updated_at = NOW()
  WHERE id = v_completion_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION calculate_completion_variance_by_job(UUID) TO authenticated;


-- SKIPPED (already applied): 20260303000001_security_rls_fixes.sql

-- SKIPPED (already applied): 20260303000002_ai_consent_and_pii_protection.sql

-- SKIPPED (already applied): 20260303000003_add_full_name_to_profiles.sql

-- SKIPPED (already applied): 20260303000004_fix_handle_new_user_trigger.sql

-- SKIPPED (already applied): 20260303000005_debug_auth_triggers.sql

-- SKIPPED (already applied): 20260303000006_recreate_handle_new_user.sql

-- SKIPPED (already applied): 20260303000007_fix_profiles_rls_hang.sql

-- SKIPPED (already applied): 20260303000008_fix_profiles_rls_simple.sql

-- SKIPPED (already applied): 20260401000001_fix_rls_security_gaps.sql

-- SKIPPED (already applied): 20260401000002_fix_function_search_paths.sql

