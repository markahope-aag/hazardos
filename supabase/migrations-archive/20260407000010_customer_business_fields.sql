-- Add business intelligence fields to customers table
-- These fields help assess customer value and track insurance relationships

-- Financial tracking
ALTER TABLE customers ADD COLUMN IF NOT EXISTS lifetime_value NUMERIC(12,2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_jobs INTEGER DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_job_date DATE;

-- Referral tracking (supplements existing lead_source for display)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS referral_source TEXT;

-- Insurance (critical for remediation claims workflow)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS insurance_carrier TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS insurance_policy_number TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS insurance_adjuster_name TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS insurance_adjuster_phone TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS insurance_adjuster_email TEXT;

-- Index for sorting/filtering by value
CREATE INDEX IF NOT EXISTS idx_customers_org_lifetime_value
  ON customers(organization_id, lifetime_value DESC);

CREATE INDEX IF NOT EXISTS idx_customers_org_last_job_date
  ON customers(organization_id, last_job_date DESC);

COMMENT ON COLUMN customers.lifetime_value IS 'Total invoiced amount across all jobs for this customer';
COMMENT ON COLUMN customers.total_jobs IS 'Number of completed jobs for this customer';
COMMENT ON COLUMN customers.last_job_date IS 'Date of most recent job — stale customers may need re-engagement';
COMMENT ON COLUMN customers.referral_source IS 'How the customer found us (free text for display)';
COMMENT ON COLUMN customers.insurance_carrier IS 'Insurance company name — speeds up claims processing';
