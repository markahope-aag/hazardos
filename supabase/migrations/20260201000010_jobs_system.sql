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
