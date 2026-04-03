-- ============================================
-- Enhance contacts (customers) table with full CRM fields
-- ============================================

-- Contact role enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contact_role') THEN
    CREATE TYPE contact_role AS ENUM (
      'decision_maker',
      'influencer',
      'billing',
      'property_manager',
      'site_contact',
      'other'
    );
  END IF;
END $$;

-- Contact status enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contact_status') THEN
    CREATE TYPE contact_status AS ENUM (
      'active',
      'inactive',
      'do_not_contact'
    );
  END IF;
END $$;

-- Core identity: split name into first/last
ALTER TABLE customers ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS role_title TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS mobile_phone TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS office_phone TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS preferred_contact_method TEXT CHECK (preferred_contact_method IN ('email', 'phone', 'text', 'mail'));

-- Relationship fields
ALTER TABLE customers ADD COLUMN IF NOT EXISTS contact_role contact_role;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_primary_contact BOOLEAN DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS contact_status contact_status DEFAULT 'active';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS opted_into_email BOOLEAN DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS opted_into_email_date TIMESTAMPTZ;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS opted_into_sms BOOLEAN DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS opted_into_sms_date TIMESTAMPTZ;

-- Marketing attribution
ALTER TABLE customers ADD COLUMN IF NOT EXISTS lead_source TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS lead_source_detail TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS first_touch_date DATE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS utm_source TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS utm_medium TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS referred_by_contact_id UUID REFERENCES customers(id) ON DELETE SET NULL;

-- Notes enhancements
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_contacted_date DATE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS next_followup_date DATE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS next_followup_note TEXT;

-- Migrate existing name data to first_name / last_name
UPDATE customers
SET
  first_name = CASE
    WHEN name LIKE '% %' THEN split_part(name, ' ', 1)
    ELSE name
  END,
  last_name = CASE
    WHEN name LIKE '% %' THEN substring(name from position(' ' in name) + 1)
    ELSE NULL
  END
WHERE first_name IS NULL;

-- Migrate existing phone to office_phone
UPDATE customers SET office_phone = phone WHERE phone IS NOT NULL AND office_phone IS NULL;

-- Set contact_role for existing contacts based on is_primary_contact or contact_type
UPDATE customers SET contact_role = 'decision_maker' WHERE contact_role IS NULL AND company_id IS NOT NULL;
UPDATE customers SET contact_status = 'active' WHERE contact_status IS NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customers_first_name ON customers(organization_id, first_name);
CREATE INDEX IF NOT EXISTS idx_customers_last_name ON customers(organization_id, last_name);
CREATE INDEX IF NOT EXISTS idx_customers_contact_status ON customers(organization_id, contact_status);
CREATE INDEX IF NOT EXISTS idx_customers_contact_role ON customers(contact_role) WHERE contact_role IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_lead_source ON customers(organization_id, lead_source) WHERE lead_source IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_next_followup ON customers(next_followup_date) WHERE next_followup_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_referred_by ON customers(referred_by_contact_id) WHERE referred_by_contact_id IS NOT NULL;
