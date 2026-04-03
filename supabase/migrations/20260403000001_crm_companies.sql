-- ============================================
-- CRM: Add companies table + contact_type on customers
-- ============================================

-- 1. Create companies table
CREATE TABLE IF NOT EXISTS companies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    website TEXT,
    industry TEXT,
    phone TEXT,
    email TEXT,
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_companies_org ON companies(organization_id);
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(organization_id, name);
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(organization_id, status);

-- Auto-update updated_at
CREATE OR REPLACE TRIGGER set_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view companies in their organization" ON companies
    FOR SELECT USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can create companies in their organization" ON companies
    FOR INSERT WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update companies in their organization" ON companies
    FOR UPDATE USING (organization_id = get_user_organization_id());

CREATE POLICY "Admins can delete companies in their organization" ON companies
    FOR DELETE USING (
        organization_id = get_user_organization_id()
        AND get_user_role() IN ('admin', 'tenant_owner')
    );

-- 2. Add company_id and contact_type to customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS contact_type TEXT NOT NULL DEFAULT 'residential' CHECK (contact_type IN ('residential', 'commercial'));

CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company_id) WHERE company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_contact_type ON customers(organization_id, contact_type);

-- 3. Add company_id to opportunities (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'opportunities') THEN
        ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_opportunities_company ON opportunities(company_id) WHERE company_id IS NOT NULL;
    END IF;
END $$;

-- 4. Migrate existing data: create companies from customer.company_name
DO $$
DECLARE
    r RECORD;
    new_company_id UUID;
BEGIN
    -- For each unique org + company_name combination, create a company
    FOR r IN
        SELECT DISTINCT organization_id, company_name
        FROM customers
        WHERE company_name IS NOT NULL AND company_name != ''
        ORDER BY organization_id, company_name
    LOOP
        -- Check if company already exists (idempotent)
        SELECT id INTO new_company_id
        FROM companies
        WHERE organization_id = r.organization_id AND name = r.company_name
        LIMIT 1;

        IF new_company_id IS NULL THEN
            INSERT INTO companies (organization_id, name)
            VALUES (r.organization_id, r.company_name)
            RETURNING id INTO new_company_id;
        END IF;

        -- Link customers to the company and set contact_type
        UPDATE customers
        SET company_id = new_company_id, contact_type = 'commercial'
        WHERE organization_id = r.organization_id
          AND company_name = r.company_name
          AND company_id IS NULL;
    END LOOP;

    -- Backfill opportunities.company_id from their linked customer (if table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'opportunities') THEN
        UPDATE opportunities o
        SET company_id = c.company_id
        FROM customers c
        WHERE o.customer_id = c.id
          AND c.company_id IS NOT NULL
          AND o.company_id IS NULL;
    END IF;
END $$;

-- Grant permissions
GRANT ALL ON companies TO authenticated;
GRANT ALL ON companies TO service_role;
