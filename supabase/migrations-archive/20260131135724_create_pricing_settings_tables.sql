-- Create pricing settings tables for per-organization pricing configuration
-- These tables enable organizations to configure their pricing rules and rates

-- Create hazard type enum for disposal fees (more specific than general hazard_type)
DO $$ BEGIN
    CREATE TYPE disposal_hazard_type AS ENUM ('asbestos_friable', 'asbestos_non_friable', 'mold', 'lead', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Labor rates table
CREATE TABLE IF NOT EXISTS labor_rates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    rate_per_hour DECIMAL(10,2) NOT NULL CHECK (rate_per_hour >= 0),
    description TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Equipment rates table
CREATE TABLE IF NOT EXISTS equipment_rates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    rate_per_day DECIMAL(10,2) NOT NULL CHECK (rate_per_day >= 0),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Material costs table
CREATE TABLE IF NOT EXISTS material_costs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    cost_per_unit DECIMAL(10,2) NOT NULL CHECK (cost_per_unit >= 0),
    unit TEXT NOT NULL, -- e.g., 'roll', 'each', 'pair', 'job'
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Disposal fees table
CREATE TABLE IF NOT EXISTS disposal_fees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    hazard_type disposal_hazard_type NOT NULL,
    cost_per_cubic_yard DECIMAL(10,2) NOT NULL CHECK (cost_per_cubic_yard >= 0),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Travel rates table
CREATE TABLE IF NOT EXISTS travel_rates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    min_miles INTEGER NOT NULL CHECK (min_miles >= 0),
    max_miles INTEGER CHECK (max_miles IS NULL OR max_miles >= min_miles),
    flat_fee DECIMAL(10,2) CHECK (flat_fee IS NULL OR flat_fee >= 0),
    per_mile_rate DECIMAL(10,2) CHECK (per_mile_rate IS NULL OR per_mile_rate >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT travel_rates_fee_check CHECK (flat_fee IS NOT NULL OR per_mile_rate IS NOT NULL)
);

-- Pricing settings table (one per organization)
CREATE TABLE IF NOT EXISTS pricing_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
    default_markup_percent DECIMAL(5,2) DEFAULT 25.00 CHECK (default_markup_percent >= 0 AND default_markup_percent <= 100),
    minimum_markup_percent DECIMAL(5,2) DEFAULT 10.00 CHECK (minimum_markup_percent >= 0 AND minimum_markup_percent <= 100),
    maximum_markup_percent DECIMAL(5,2) DEFAULT 50.00 CHECK (maximum_markup_percent >= 0 AND maximum_markup_percent <= 100),
    -- Office address for distance calculations
    office_address_line1 TEXT,
    office_address_line2 TEXT,
    office_city TEXT,
    office_state TEXT,
    office_zip TEXT,
    office_lat DECIMAL(10,8),
    office_lng DECIMAL(11,8),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT pricing_settings_markup_check CHECK (minimum_markup_percent <= default_markup_percent AND default_markup_percent <= maximum_markup_percent)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_labor_rates_organization_id ON labor_rates(organization_id);
CREATE INDEX IF NOT EXISTS idx_labor_rates_is_default ON labor_rates(organization_id, is_default);

CREATE INDEX IF NOT EXISTS idx_equipment_rates_organization_id ON equipment_rates(organization_id);

CREATE INDEX IF NOT EXISTS idx_material_costs_organization_id ON material_costs(organization_id);

CREATE INDEX IF NOT EXISTS idx_disposal_fees_organization_id ON disposal_fees(organization_id);
CREATE INDEX IF NOT EXISTS idx_disposal_fees_hazard_type ON disposal_fees(organization_id, hazard_type);

CREATE INDEX IF NOT EXISTS idx_travel_rates_organization_id ON travel_rates(organization_id);
CREATE INDEX IF NOT EXISTS idx_travel_rates_miles ON travel_rates(organization_id, min_miles, max_miles);

CREATE INDEX IF NOT EXISTS idx_pricing_settings_organization_id ON pricing_settings(organization_id);

-- Enable RLS on all tables
ALTER TABLE labor_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE disposal_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for labor_rates
DROP POLICY IF EXISTS "Users can view labor rates in their organization" ON labor_rates;
CREATE POLICY "Users can view labor rates in their organization" ON labor_rates
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.organization_id = labor_rates.organization_id
        )
    );

DROP POLICY IF EXISTS "Admins can manage labor rates in their organization" ON labor_rates;
CREATE POLICY "Admins can manage labor rates in their organization" ON labor_rates
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.organization_id = labor_rates.organization_id
            AND p.role IN ('admin', 'tenant_owner')
        )
    );

-- RLS Policies for equipment_rates
DROP POLICY IF EXISTS "Users can view equipment rates in their organization" ON equipment_rates;
CREATE POLICY "Users can view equipment rates in their organization" ON equipment_rates
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.organization_id = equipment_rates.organization_id
        )
    );

DROP POLICY IF EXISTS "Admins can manage equipment rates in their organization" ON equipment_rates;
CREATE POLICY "Admins can manage equipment rates in their organization" ON equipment_rates
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.organization_id = equipment_rates.organization_id
            AND p.role IN ('admin', 'tenant_owner')
        )
    );

-- RLS Policies for material_costs
DROP POLICY IF EXISTS "Users can view material costs in their organization" ON material_costs;
CREATE POLICY "Users can view material costs in their organization" ON material_costs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.organization_id = material_costs.organization_id
        )
    );

DROP POLICY IF EXISTS "Admins can manage material costs in their organization" ON material_costs;
CREATE POLICY "Admins can manage material costs in their organization" ON material_costs
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.organization_id = material_costs.organization_id
            AND p.role IN ('admin', 'tenant_owner')
        )
    );

-- RLS Policies for disposal_fees
DROP POLICY IF EXISTS "Users can view disposal fees in their organization" ON disposal_fees;
CREATE POLICY "Users can view disposal fees in their organization" ON disposal_fees
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.organization_id = disposal_fees.organization_id
        )
    );

DROP POLICY IF EXISTS "Admins can manage disposal fees in their organization" ON disposal_fees;
CREATE POLICY "Admins can manage disposal fees in their organization" ON disposal_fees
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.organization_id = disposal_fees.organization_id
            AND p.role IN ('admin', 'tenant_owner')
        )
    );

-- RLS Policies for travel_rates
DROP POLICY IF EXISTS "Users can view travel rates in their organization" ON travel_rates;
CREATE POLICY "Users can view travel rates in their organization" ON travel_rates
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.organization_id = travel_rates.organization_id
        )
    );

DROP POLICY IF EXISTS "Admins can manage travel rates in their organization" ON travel_rates;
CREATE POLICY "Admins can manage travel rates in their organization" ON travel_rates
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.organization_id = travel_rates.organization_id
            AND p.role IN ('admin', 'tenant_owner')
        )
    );

-- RLS Policies for pricing_settings
DROP POLICY IF EXISTS "Users can view pricing settings in their organization" ON pricing_settings;
CREATE POLICY "Users can view pricing settings in their organization" ON pricing_settings
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.organization_id = pricing_settings.organization_id
        )
    );

DROP POLICY IF EXISTS "Admins can manage pricing settings in their organization" ON pricing_settings;
CREATE POLICY "Admins can manage pricing settings in their organization" ON pricing_settings
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.organization_id = pricing_settings.organization_id
            AND p.role IN ('admin', 'tenant_owner')
        )
    );

-- Platform owners can access all pricing data
DROP POLICY IF EXISTS "Platform owners can access all labor rates" ON labor_rates;
CREATE POLICY "Platform owners can access all labor rates" ON labor_rates
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'platform_owner'
        )
    );

DROP POLICY IF EXISTS "Platform owners can access all equipment rates" ON equipment_rates;
CREATE POLICY "Platform owners can access all equipment rates" ON equipment_rates
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'platform_owner'
        )
    );

DROP POLICY IF EXISTS "Platform owners can access all material costs" ON material_costs;
CREATE POLICY "Platform owners can access all material costs" ON material_costs
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'platform_owner'
        )
    );

DROP POLICY IF EXISTS "Platform owners can access all disposal fees" ON disposal_fees;
CREATE POLICY "Platform owners can access all disposal fees" ON disposal_fees
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'platform_owner'
        )
    );

DROP POLICY IF EXISTS "Platform owners can access all travel rates" ON travel_rates;
CREATE POLICY "Platform owners can access all travel rates" ON travel_rates
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'platform_owner'
        )
    );

DROP POLICY IF EXISTS "Platform owners can access all pricing settings" ON pricing_settings;
CREATE POLICY "Platform owners can access all pricing settings" ON pricing_settings
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'platform_owner'
        )
    );

-- Add updated_at triggers
DROP TRIGGER IF EXISTS set_updated_at_labor_rates ON labor_rates;
CREATE TRIGGER set_updated_at_labor_rates
    BEFORE UPDATE ON labor_rates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_equipment_rates ON equipment_rates;
CREATE TRIGGER set_updated_at_equipment_rates
    BEFORE UPDATE ON equipment_rates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_material_costs ON material_costs;
CREATE TRIGGER set_updated_at_material_costs
    BEFORE UPDATE ON material_costs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_disposal_fees ON disposal_fees;
CREATE TRIGGER set_updated_at_disposal_fees
    BEFORE UPDATE ON disposal_fees
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_travel_rates ON travel_rates;
CREATE TRIGGER set_updated_at_travel_rates
    BEFORE UPDATE ON travel_rates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_pricing_settings ON pricing_settings;
CREATE TRIGGER set_updated_at_pricing_settings
    BEFORE UPDATE ON pricing_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add table comments
COMMENT ON TABLE labor_rates IS 'Per-organization labor rates for different types of workers';
COMMENT ON TABLE equipment_rates IS 'Per-organization equipment rental rates';
COMMENT ON TABLE material_costs IS 'Per-organization material and supply costs';
COMMENT ON TABLE disposal_fees IS 'Per-organization hazardous waste disposal fees by material type';
COMMENT ON TABLE travel_rates IS 'Per-organization travel fees based on distance ranges';
COMMENT ON TABLE pricing_settings IS 'Per-organization pricing configuration including markup percentages and office location';