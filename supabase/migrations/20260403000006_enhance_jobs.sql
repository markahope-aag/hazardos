-- ============================================
-- Enhance jobs table with full CRM fields
-- ============================================

-- Containment level enum (OSHA classifications)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'containment_level') THEN
    CREATE TYPE containment_level AS ENUM ('type_i', 'type_ii', 'type_iii');
  END IF;
END $$;

-- Variance reason enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'variance_reason') THEN
    CREATE TYPE variance_reason AS ENUM (
      'scope_change',
      'estimator_error',
      'unforeseen_conditions',
      'weather',
      'access_issues',
      'material_shortage',
      'other'
    );
  END IF;
END $$;

-- Core identity / relationships
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS primary_contact_id UUID REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS site_contact_id UUID REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS crew_lead_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Site / Scope
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS containment_level containment_level;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS actual_affected_area_sqft DECIMAL(10,2);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS disposal_manifest_numbers TEXT[];
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS permit_numbers TEXT[];
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS air_monitoring_required BOOLEAN DEFAULT false;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS clearance_testing_required BOOLEAN DEFAULT false;

-- Scheduling
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS estimated_labor_hours DECIMAL(8,2);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS actual_labor_hours DECIMAL(8,2);

-- Financial
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS estimated_revenue DECIMAL(12,2);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS actual_revenue DECIMAL(12,2);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS estimated_cost DECIMAL(12,2);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS actual_cost DECIMAL(12,2);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS gross_margin_pct DECIMAL(5,2);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS invoice_id TEXT; -- QB sync
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(12,2);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS deposit_received_date DATE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS final_invoice_date DATE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS final_payment_date DATE;

-- Ralph Wiggum Loop (learning engine)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS estimate_variance_pct DECIMAL(5,2);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS variance_reason variance_reason;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS estimator_override_notes TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS job_complexity_rating INTEGER CHECK (job_complexity_rating BETWEEN 1 AND 5);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS customer_satisfaction_score INTEGER CHECK (customer_satisfaction_score BETWEEN 1 AND 5);

-- Marketing attribution
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS lead_source TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_repeat_customer BOOLEAN DEFAULT false;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS referral_job_id UUID REFERENCES jobs(id) ON DELETE SET NULL;

-- Migrate existing data
-- Set estimated_revenue from contract_amount
UPDATE jobs SET estimated_revenue = contract_amount WHERE estimated_revenue IS NULL AND contract_amount IS NOT NULL;
UPDATE jobs SET actual_revenue = final_amount WHERE actual_revenue IS NULL AND final_amount IS NOT NULL;
UPDATE jobs SET estimated_labor_hours = estimated_duration_hours WHERE estimated_labor_hours IS NULL AND estimated_duration_hours IS NOT NULL;

-- Backfill company_id from customer's company
UPDATE jobs j
SET company_id = c.company_id
FROM customers c
WHERE j.customer_id = c.id
  AND c.company_id IS NOT NULL
  AND j.company_id IS NULL;

-- Set crew_lead_id from job_crew where is_lead = true
UPDATE jobs j
SET crew_lead_id = jc.profile_id
FROM job_crew jc
WHERE jc.job_id = j.id
  AND jc.is_lead = true
  AND j.crew_lead_id IS NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_jobs_opportunity ON jobs(opportunity_id) WHERE opportunity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company_id) WHERE company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_primary_contact ON jobs(primary_contact_id) WHERE primary_contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_crew_lead ON jobs(crew_lead_id) WHERE crew_lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_containment ON jobs(containment_level) WHERE containment_level IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_variance ON jobs(organization_id, estimate_variance_pct) WHERE estimate_variance_pct IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_referral ON jobs(referral_job_id) WHERE referral_job_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_invoice ON jobs(invoice_id) WHERE invoice_id IS NOT NULL;
