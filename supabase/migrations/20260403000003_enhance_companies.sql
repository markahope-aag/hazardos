-- ============================================
-- Enhance companies table with full CRM fields
-- ============================================

-- Company type enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'company_type') THEN
    CREATE TYPE company_type AS ENUM (
      'residential_property_mgr',
      'commercial_property_mgr',
      'general_contractor',
      'industrial',
      'hoa',
      'government',
      'direct_homeowner',
      'other'
    );
  END IF;
END $$;

-- Account status enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_status') THEN
    CREATE TYPE account_status AS ENUM (
      'prospect',
      'active',
      'inactive',
      'churned'
    );
  END IF;
END $$;

-- Core identity enhancements
ALTER TABLE companies ADD COLUMN IF NOT EXISTS company_type company_type;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS primary_phone TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS primary_email TEXT;

-- Billing vs service address
ALTER TABLE companies RENAME COLUMN address_line1 TO billing_address_line1;
ALTER TABLE companies RENAME COLUMN address_line2 TO billing_address_line2;
ALTER TABLE companies RENAME COLUMN city TO billing_city;
ALTER TABLE companies RENAME COLUMN state TO billing_state;
ALTER TABLE companies RENAME COLUMN zip TO billing_zip;

ALTER TABLE companies ADD COLUMN IF NOT EXISTS service_address_line1 TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS service_address_line2 TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS service_city TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS service_state TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS service_zip TEXT;

-- Relationship fields
ALTER TABLE companies ADD COLUMN IF NOT EXISTS account_owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS account_status account_status DEFAULT 'prospect';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS customer_since DATE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS preferred_contact_method TEXT CHECK (preferred_contact_method IN ('email', 'phone', 'text', 'mail'));

-- Marketing attribution
ALTER TABLE companies ADD COLUMN IF NOT EXISTS lead_source TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS lead_source_detail TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS first_touch_date DATE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS utm_source TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS utm_medium TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS referred_by_company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS referred_by_contact_id UUID REFERENCES customers(id) ON DELETE SET NULL;

-- Financial fields
ALTER TABLE companies ADD COLUMN IF NOT EXISTS lifetime_value DECIMAL(12,2) DEFAULT 0;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS total_jobs_completed INTEGER DEFAULT 0;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS average_job_value DECIMAL(12,2) DEFAULT 0;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS payment_terms TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS quickbooks_customer_id TEXT;

-- Drop old status column and use account_status instead
-- First migrate data
UPDATE companies SET account_status = 'active' WHERE status = 'active';
UPDATE companies SET account_status = 'inactive' WHERE status = 'inactive';

-- Copy phone/email to new primary fields if they exist
UPDATE companies SET primary_phone = phone WHERE phone IS NOT NULL AND primary_phone IS NULL;
UPDATE companies SET primary_email = email WHERE email IS NOT NULL AND primary_email IS NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_companies_account_status ON companies(organization_id, account_status);
CREATE INDEX IF NOT EXISTS idx_companies_company_type ON companies(organization_id, company_type);
CREATE INDEX IF NOT EXISTS idx_companies_account_owner ON companies(account_owner_id) WHERE account_owner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_companies_lead_source ON companies(organization_id, lead_source) WHERE lead_source IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_companies_quickbooks ON companies(quickbooks_customer_id) WHERE quickbooks_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_companies_referred_by ON companies(referred_by_company_id) WHERE referred_by_company_id IS NOT NULL;
