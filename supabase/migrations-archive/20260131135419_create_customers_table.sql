-- Create customers table for lead/prospect/customer management
-- This table tracks all potential and actual customers with their contact info and status

-- Create customer status enum
DO $$ BEGIN
    CREATE TYPE customer_status AS ENUM ('lead', 'prospect', 'customer', 'inactive');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create customer source enum  
DO $$ BEGIN
    CREATE TYPE customer_source AS ENUM ('phone', 'website', 'mail', 'referral', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Contact information
    name TEXT NOT NULL,
    company_name TEXT,
    email TEXT,
    phone TEXT,
    
    -- Address fields
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    
    -- Status and source tracking
    status customer_status DEFAULT 'lead' NOT NULL,
    source customer_source,
    
    -- Communication preferences (JSONB for flexibility)
    communication_preferences JSONB DEFAULT '{"email": true, "sms": false, "mail": false}'::jsonb,
    
    -- Marketing consent
    marketing_consent BOOLEAN DEFAULT false,
    marketing_consent_date TIMESTAMPTZ,
    
    -- Notes and metadata
    notes TEXT,
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES profiles(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_organization_id ON customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);

-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customers table
-- Users can view customers in their organization
DROP POLICY IF EXISTS "Users can view customers in their organization" ON customers;
CREATE POLICY "Users can view customers in their organization" ON customers
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.organization_id = customers.organization_id
        )
    );

-- Users can insert customers in their organization
DROP POLICY IF EXISTS "Users can insert customers in their organization" ON customers;
CREATE POLICY "Users can insert customers in their organization" ON customers
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.organization_id = customers.organization_id
        )
    );

-- Users can update customers in their organization
DROP POLICY IF EXISTS "Users can update customers in their organization" ON customers;
CREATE POLICY "Users can update customers in their organization" ON customers
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.organization_id = customers.organization_id
        )
    );

-- Users can delete customers in their organization (admin+ only)
DROP POLICY IF EXISTS "Admins can delete customers in their organization" ON customers;
CREATE POLICY "Admins can delete customers in their organization" ON customers
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.organization_id = customers.organization_id
            AND p.role IN ('admin', 'tenant_owner')
        )
    );

-- Platform owners can access all customers
DROP POLICY IF EXISTS "Platform owners can access all customers" ON customers;
CREATE POLICY "Platform owners can access all customers" ON customers
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'platform_owner'
        )
    );

-- Add updated_at trigger
DROP TRIGGER IF EXISTS set_updated_at_customers ON customers;
CREATE TRIGGER set_updated_at_customers
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add table comment
COMMENT ON TABLE customers IS 'Customer and lead management - tracks prospects from initial contact through customer lifecycle';
COMMENT ON COLUMN customers.status IS 'Customer status: lead (initial contact) -> prospect (survey scheduled) -> customer (job completed) -> inactive';
COMMENT ON COLUMN customers.communication_preferences IS 'JSON object with email, sms, mail boolean preferences';
COMMENT ON COLUMN customers.marketing_consent IS 'Whether customer has consented to marketing communications';