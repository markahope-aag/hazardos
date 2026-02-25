-- ============================================================================
-- FIX: Replace old estimates and jobs tables with correct schema
-- ============================================================================
-- The initial_schema migration (20260131170746) created old-style estimates
-- and jobs tables. The later migrations (20260201000000, 20260201000010)
-- failed to replace them because the tables already existed.
-- This migration drops the old tables and recreates them with the correct
-- schema that the application code expects.
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop old tables and their dependencies
-- ============================================================================

-- Drop old jobs table (cascade drops old constraints)
DROP TABLE IF EXISTS jobs CASCADE;

-- Drop old estimates table
DROP TABLE IF EXISTS estimates CASCADE;

-- Drop old enums that may have been created by initial schema
DROP TYPE IF EXISTS estimate_status CASCADE;
DROP TYPE IF EXISTS line_item_type CASCADE;
DROP TYPE IF EXISTS proposal_status CASCADE;

-- ============================================================================
-- STEP 2: Recreate enums
-- ============================================================================

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

CREATE TYPE proposal_status AS ENUM (
  'draft',
  'sent',
  'viewed',
  'signed',
  'expired',
  'declined'
);

-- ============================================================================
-- STEP 3: Create new estimates table
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
-- STEP 4: Recreate estimate_line_items (may have been orphaned by CASCADE)
-- ============================================================================

CREATE TABLE IF NOT EXISTS estimate_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,

  item_type line_item_type NOT NULL,
  category TEXT,
  description TEXT NOT NULL,

  quantity NUMERIC(10,2) DEFAULT 1,
  unit TEXT DEFAULT 'each',
  unit_price NUMERIC(12,2) DEFAULT 0,
  total_price NUMERIC(12,2) DEFAULT 0,

  source_rate_id UUID,
  source_table TEXT,

  sort_order INTEGER DEFAULT 0,

  is_optional BOOLEAN DEFAULT FALSE,
  is_included BOOLEAN DEFAULT TRUE,

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- STEP 5: Recreate proposals (may have been orphaned by CASCADE)
-- ============================================================================

CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,

  proposal_number TEXT NOT NULL,

  status proposal_status DEFAULT 'draft',

  access_token TEXT UNIQUE,
  access_token_expires_at TIMESTAMPTZ,

  cover_letter TEXT,
  terms_and_conditions TEXT,
  payment_terms TEXT,
  exclusions TEXT[],
  inclusions TEXT[],

  sent_at TIMESTAMPTZ,
  sent_to_email TEXT,
  viewed_at TIMESTAMPTZ,
  viewed_count INTEGER DEFAULT 0,

  signed_at TIMESTAMPTZ,
  signer_name TEXT,
  signer_email TEXT,
  signer_ip TEXT,
  signature_data TEXT,

  valid_until DATE,

  pdf_path TEXT,
  pdf_generated_at TIMESTAMPTZ,

  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- STEP 6: Create new jobs table
-- ============================================================================

CREATE TABLE jobs (
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

  -- Hazard info
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

  -- Access info
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

-- ============================================================================
-- STEP 7: Recreate job supporting tables (may have been orphaned by CASCADE)
-- ============================================================================

CREATE TABLE IF NOT EXISTS job_crew (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'crew',
  is_lead BOOLEAN DEFAULT FALSE,
  scheduled_start TIME,
  scheduled_end TIME,
  clock_in_at TIMESTAMPTZ,
  clock_out_at TIMESTAMPTZ,
  break_minutes INTEGER DEFAULT 0,
  hours_worked DECIMAL(6, 2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, profile_id)
);

CREATE TABLE IF NOT EXISTS job_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  equipment_name VARCHAR(255) NOT NULL,
  equipment_type VARCHAR(100),
  quantity INTEGER DEFAULT 1,
  is_rental BOOLEAN DEFAULT FALSE,
  rental_rate_daily DECIMAL(10, 2),
  rental_start_date DATE,
  rental_end_date DATE,
  rental_days INTEGER,
  rental_total DECIMAL(10, 2),
  status VARCHAR(50) DEFAULT 'assigned',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  material_name VARCHAR(255) NOT NULL,
  material_type VARCHAR(100),
  quantity_estimated DECIMAL(10, 2),
  quantity_used DECIMAL(10, 2),
  unit VARCHAR(50),
  unit_cost DECIMAL(10, 2),
  total_cost DECIMAL(12, 2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_disposal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  hazard_type VARCHAR(50) NOT NULL,
  disposal_type VARCHAR(100),
  quantity DECIMAL(10, 2) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  manifest_number VARCHAR(100),
  manifest_date DATE,
  disposal_facility_name VARCHAR(255),
  disposal_facility_address TEXT,
  disposal_cost DECIMAL(12, 2),
  manifest_document_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_change_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  change_order_number VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  reason TEXT,
  amount DECIMAL(12, 2) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  customer_approved BOOLEAN DEFAULT FALSE,
  customer_approved_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  note_type VARCHAR(50) NOT NULL DEFAULT 'general',
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  is_internal BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- STEP 8: Indexes
-- ============================================================================

CREATE INDEX idx_estimates_organization_id ON estimates(organization_id);
CREATE INDEX idx_estimates_site_survey_id ON estimates(site_survey_id);
CREATE INDEX idx_estimates_customer_id ON estimates(customer_id);
CREATE INDEX idx_estimates_status ON estimates(status);
CREATE INDEX idx_estimates_estimate_number ON estimates(estimate_number);
CREATE INDEX idx_estimates_created_at ON estimates(created_at);

CREATE INDEX IF NOT EXISTS idx_estimate_line_items_estimate_id ON estimate_line_items(estimate_id);
CREATE INDEX IF NOT EXISTS idx_estimate_line_items_item_type ON estimate_line_items(item_type);

CREATE INDEX IF NOT EXISTS idx_proposals_organization_id ON proposals(organization_id);
CREATE INDEX IF NOT EXISTS idx_proposals_estimate_id ON proposals(estimate_id);
CREATE INDEX IF NOT EXISTS idx_proposals_access_token ON proposals(access_token);

CREATE INDEX idx_jobs_org ON jobs(organization_id);
CREATE INDEX idx_jobs_customer ON jobs(customer_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_scheduled_date ON jobs(scheduled_start_date);
CREATE INDEX idx_jobs_org_scheduled ON jobs(organization_id, scheduled_start_date) WHERE status = 'scheduled';

CREATE INDEX IF NOT EXISTS idx_job_crew_job ON job_crew(job_id);
CREATE INDEX IF NOT EXISTS idx_job_crew_profile ON job_crew(profile_id);
CREATE INDEX IF NOT EXISTS idx_job_equipment_job ON job_equipment(job_id);
CREATE INDEX IF NOT EXISTS idx_job_materials_job ON job_materials(job_id);
CREATE INDEX IF NOT EXISTS idx_job_disposal_job ON job_disposal(job_id);
CREATE INDEX IF NOT EXISTS idx_job_change_orders_job ON job_change_orders(job_id);
CREATE INDEX IF NOT EXISTS idx_job_notes_job ON job_notes(job_id);

-- ============================================================================
-- STEP 9: Triggers
-- ============================================================================

CREATE TRIGGER set_updated_at_estimates
  BEFORE UPDATE ON estimates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_estimate_line_items
  BEFORE UPDATE ON estimate_line_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_proposals
  BEFORE UPDATE ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS jobs_updated_at ON jobs;
CREATE TRIGGER jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 10: RLS Policies
-- ============================================================================

ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_crew ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_disposal ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_change_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_notes ENABLE ROW LEVEL SECURITY;

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

-- Estimate line items policies
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

CREATE POLICY "Users can manage line items for their estimates"
  ON estimate_line_items FOR ALL
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

CREATE POLICY "Users can manage proposals in their organization"
  ON proposals FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Public proposal access
CREATE POLICY "Public can view proposals with valid access token"
  ON proposals FOR SELECT
  USING (
    access_token IS NOT NULL
    AND access_token_expires_at > NOW()
  );

-- Jobs policies
CREATE POLICY "Users can manage their org jobs"
  ON jobs FOR ALL
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can manage job crew for their org jobs"
  ON job_crew FOR ALL
  USING (EXISTS (
    SELECT 1 FROM jobs WHERE jobs.id = job_crew.job_id
    AND jobs.organization_id = get_user_organization_id()
  ));

CREATE POLICY "Users can manage job equipment for their org jobs"
  ON job_equipment FOR ALL
  USING (EXISTS (
    SELECT 1 FROM jobs WHERE jobs.id = job_equipment.job_id
    AND jobs.organization_id = get_user_organization_id()
  ));

CREATE POLICY "Users can manage job materials for their org jobs"
  ON job_materials FOR ALL
  USING (EXISTS (
    SELECT 1 FROM jobs WHERE jobs.id = job_materials.job_id
    AND jobs.organization_id = get_user_organization_id()
  ));

CREATE POLICY "Users can manage job disposal for their org jobs"
  ON job_disposal FOR ALL
  USING (EXISTS (
    SELECT 1 FROM jobs WHERE jobs.id = job_disposal.job_id
    AND jobs.organization_id = get_user_organization_id()
  ));

CREATE POLICY "Users can manage job change orders for their org jobs"
  ON job_change_orders FOR ALL
  USING (EXISTS (
    SELECT 1 FROM jobs WHERE jobs.id = job_change_orders.job_id
    AND jobs.organization_id = get_user_organization_id()
  ));

CREATE POLICY "Users can manage job notes for their org jobs"
  ON job_notes FOR ALL
  USING (EXISTS (
    SELECT 1 FROM jobs WHERE jobs.id = job_notes.job_id
    AND jobs.organization_id = get_user_organization_id()
  ));

-- ============================================================================
-- STEP 11: Recreate functions (with search_path pinned)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_estimate_number(org_id UUID)
RETURNS TEXT
SET search_path = public
AS $$
DECLARE
  prefix TEXT;
  next_num INTEGER;
  result TEXT;
BEGIN
  SELECT COALESCE(UPPER(LEFT(name, 3)), 'EST') INTO prefix
  FROM organizations WHERE id = org_id;

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

CREATE OR REPLACE FUNCTION public.generate_proposal_number(org_id UUID)
RETURNS TEXT
SET search_path = public
AS $$
DECLARE
  prefix TEXT;
  next_num INTEGER;
  result TEXT;
BEGIN
  SELECT COALESCE(UPPER(LEFT(name, 3)), 'PRO') INTO prefix
  FROM organizations WHERE id = org_id;

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

CREATE OR REPLACE FUNCTION public.recalculate_estimate_totals(est_id UUID)
RETURNS void
SET search_path = public
AS $$
DECLARE
  calc_subtotal NUMERIC(12,2);
  est_record RECORD;
  calc_markup NUMERIC(12,2);
  calc_discount NUMERIC(12,2);
  calc_tax NUMERIC(12,2);
  calc_total NUMERIC(12,2);
BEGIN
  SELECT COALESCE(SUM(total_price), 0) INTO calc_subtotal
  FROM estimate_line_items
  WHERE estimate_id = est_id AND is_included = TRUE;

  SELECT * INTO est_record FROM estimates WHERE id = est_id;

  calc_markup := calc_subtotal * (COALESCE(est_record.markup_percent, 0) / 100);
  calc_discount := (calc_subtotal + calc_markup) * (COALESCE(est_record.discount_percent, 0) / 100);
  calc_tax := (calc_subtotal + calc_markup - calc_discount) * (COALESCE(est_record.tax_percent, 0) / 100);
  calc_total := calc_subtotal + calc_markup - calc_discount + calc_tax;

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

CREATE OR REPLACE FUNCTION public.trigger_recalculate_estimate()
RETURNS TRIGGER
SET search_path = public
AS $$
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

DROP TRIGGER IF EXISTS recalculate_estimate_on_line_item_change ON estimate_line_items;
CREATE TRIGGER recalculate_estimate_on_line_item_change
  AFTER INSERT OR UPDATE OR DELETE ON estimate_line_items
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_estimate();

CREATE OR REPLACE FUNCTION public.generate_job_number(org_id UUID)
RETURNS VARCHAR(50)
SET search_path = public
AS $$
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

CREATE OR REPLACE FUNCTION public.calculate_crew_hours()
RETURNS TRIGGER
SET search_path = public
AS $$
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

CREATE OR REPLACE FUNCTION public.update_job_change_order_total()
RETURNS TRIGGER
SET search_path = public
AS $$
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
