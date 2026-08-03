-- ============================================
-- Fix RLS Infinite Recursion Issue
-- ============================================

-- The problem is that profiles policies are referencing profiles table
-- which creates infinite recursion. We need to break this cycle.

-- First, let's drop all the problematic policies
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON profiles;
DROP POLICY IF EXISTS "Admins can manage profiles in their organization" ON profiles;
DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;
DROP POLICY IF EXISTS "Admins can update their organization" ON organizations;

-- Create a simple, non-recursive profiles policy first
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (id = auth.uid());

-- Allow profile creation during onboarding (this one was fine)
-- DROP POLICY IF EXISTS "Allow profile creation during onboarding" ON profiles;
-- CREATE POLICY "Allow profile creation during onboarding" ON profiles
--     FOR INSERT WITH CHECK (id = auth.uid());

-- Now create organization policies that don't reference profiles recursively
-- We'll use a function to get the user's organization safely
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID AS $$
DECLARE
    org_id UUID;
BEGIN
    SELECT organization_id INTO org_id FROM profiles WHERE id = auth.uid();
    RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role FROM profiles WHERE id = auth.uid();
    RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_platform_user()
RETURNS BOOLEAN AS $$
DECLARE
    is_platform BOOLEAN;
BEGIN
    SELECT is_platform_user INTO is_platform FROM profiles WHERE id = auth.uid();
    RETURN COALESCE(is_platform, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Now create safe organization policies
CREATE POLICY "Users can view their own organization" ON organizations
    FOR SELECT USING (
        id = get_user_organization_id()
        OR get_user_role() IN ('platform_owner', 'platform_admin')
    );

CREATE POLICY "Admins can update their organization" ON organizations
    FOR UPDATE USING (
        (id = get_user_organization_id() AND get_user_role() IN ('admin', 'tenant_owner'))
        OR get_user_role() IN ('platform_owner', 'platform_admin')
    );

-- Now we can create safer profiles policies
CREATE POLICY "Users can view profiles in their organization" ON profiles
    FOR SELECT USING (
        organization_id = get_user_organization_id()
        OR id = auth.uid()
        OR get_user_role() IN ('platform_owner', 'platform_admin')
    );

CREATE POLICY "Admins can manage profiles in their organization" ON profiles
    FOR ALL USING (
        (organization_id = get_user_organization_id() AND get_user_role() IN ('admin', 'tenant_owner'))
        OR get_user_role() IN ('platform_owner', 'platform_admin')
    );

-- Update other policies to use the safe functions
-- Site surveys policies (assessments was renamed to site_surveys)
-- Drop any existing site_surveys policies first
DROP POLICY IF EXISTS "Users can view site_surveys in their organization" ON site_surveys;
DROP POLICY IF EXISTS "Users can create site_surveys in their organization" ON site_surveys;
DROP POLICY IF EXISTS "Users can update site_surveys in their organization" ON site_surveys;
DROP POLICY IF EXISTS "Admins can delete site_surveys in their organization" ON site_surveys;

-- Create policies for site_surveys table (the new name)
CREATE POLICY "Users can view site_surveys in their organization" ON site_surveys
    FOR SELECT USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can create site_surveys in their organization" ON site_surveys
    FOR INSERT WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update site_surveys in their organization" ON site_surveys
    FOR UPDATE USING (organization_id = get_user_organization_id());

CREATE POLICY "Admins can delete site_surveys in their organization" ON site_surveys
    FOR DELETE USING (
        organization_id = get_user_organization_id() 
        AND get_user_role() IN ('admin', 'tenant_owner')
    );

-- Site survey photos policies
DROP POLICY IF EXISTS "Users can view site_survey_photos in their organization" ON site_survey_photos;
DROP POLICY IF EXISTS "Users can create site_survey_photos in their organization" ON site_survey_photos;
DROP POLICY IF EXISTS "Users can update site_survey_photos in their organization" ON site_survey_photos;
DROP POLICY IF EXISTS "Users can delete site_survey_photos in their organization" ON site_survey_photos;

CREATE POLICY "Users can view site_survey_photos in their organization" ON site_survey_photos
    FOR SELECT USING (
        site_survey_id IN (
            SELECT id FROM site_surveys 
            WHERE organization_id = get_user_organization_id()
        )
    );

CREATE POLICY "Users can create site_survey_photos in their organization" ON site_survey_photos
    FOR INSERT WITH CHECK (
        site_survey_id IN (
            SELECT id FROM site_surveys 
            WHERE organization_id = get_user_organization_id()
        )
    );

CREATE POLICY "Users can update site_survey_photos in their organization" ON site_survey_photos
    FOR UPDATE USING (
        site_survey_id IN (
            SELECT id FROM site_surveys 
            WHERE organization_id = get_user_organization_id()
        )
    );

CREATE POLICY "Users can delete site_survey_photos in their organization" ON site_survey_photos
    FOR DELETE USING (
        site_survey_id IN (
            SELECT id FROM site_surveys 
            WHERE organization_id = get_user_organization_id()
        )
    );

-- Customers policies
DROP POLICY IF EXISTS "Users can view customers in their organization" ON customers;
DROP POLICY IF EXISTS "Users can create customers in their organization" ON customers;
DROP POLICY IF EXISTS "Users can update customers in their organization" ON customers;
DROP POLICY IF EXISTS "Admins can delete customers in their organization" ON customers;

CREATE POLICY "Users can view customers in their organization" ON customers
    FOR SELECT USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can create customers in their organization" ON customers
    FOR INSERT WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update customers in their organization" ON customers
    FOR UPDATE USING (organization_id = get_user_organization_id());

CREATE POLICY "Admins can delete customers in their organization" ON customers
    FOR DELETE USING (
        organization_id = get_user_organization_id() 
        AND get_user_role() IN ('admin', 'tenant_owner')
    );

-- Pricing tables policies
DROP POLICY IF EXISTS "Users can view labor_rates in their organization" ON labor_rates;
DROP POLICY IF EXISTS "Admins can manage labor_rates in their organization" ON labor_rates;
DROP POLICY IF EXISTS "Users can view equipment_rates in their organization" ON equipment_rates;
DROP POLICY IF EXISTS "Admins can manage equipment_rates in their organization" ON equipment_rates;
DROP POLICY IF EXISTS "Users can view material_costs in their organization" ON material_costs;
DROP POLICY IF EXISTS "Admins can manage material_costs in their organization" ON material_costs;
DROP POLICY IF EXISTS "Users can view disposal_fees in their organization" ON disposal_fees;
DROP POLICY IF EXISTS "Admins can manage disposal_fees in their organization" ON disposal_fees;
DROP POLICY IF EXISTS "Users can view travel_rates in their organization" ON travel_rates;
DROP POLICY IF EXISTS "Admins can manage travel_rates in their organization" ON travel_rates;
DROP POLICY IF EXISTS "Users can view pricing_settings in their organization" ON pricing_settings;
DROP POLICY IF EXISTS "Admins can manage pricing_settings in their organization" ON pricing_settings;

CREATE POLICY "Users can view labor_rates in their organization" ON labor_rates
    FOR SELECT USING (organization_id = get_user_organization_id());

CREATE POLICY "Admins can manage labor_rates in their organization" ON labor_rates
    FOR ALL USING (
        organization_id = get_user_organization_id() 
        AND get_user_role() IN ('admin', 'estimator', 'tenant_owner')
    );

CREATE POLICY "Users can view equipment_rates in their organization" ON equipment_rates
    FOR SELECT USING (organization_id = get_user_organization_id());

CREATE POLICY "Admins can manage equipment_rates in their organization" ON equipment_rates
    FOR ALL USING (
        organization_id = get_user_organization_id() 
        AND get_user_role() IN ('admin', 'estimator', 'tenant_owner')
    );

CREATE POLICY "Users can view material_costs in their organization" ON material_costs
    FOR SELECT USING (organization_id = get_user_organization_id());

CREATE POLICY "Admins can manage material_costs in their organization" ON material_costs
    FOR ALL USING (
        organization_id = get_user_organization_id() 
        AND get_user_role() IN ('admin', 'estimator', 'tenant_owner')
    );

CREATE POLICY "Users can view disposal_fees in their organization" ON disposal_fees
    FOR SELECT USING (organization_id = get_user_organization_id());

CREATE POLICY "Admins can manage disposal_fees in their organization" ON disposal_fees
    FOR ALL USING (
        organization_id = get_user_organization_id() 
        AND get_user_role() IN ('admin', 'estimator', 'tenant_owner')
    );

CREATE POLICY "Users can view travel_rates in their organization" ON travel_rates
    FOR SELECT USING (organization_id = get_user_organization_id());

CREATE POLICY "Admins can manage travel_rates in their organization" ON travel_rates
    FOR ALL USING (
        organization_id = get_user_organization_id() 
        AND get_user_role() IN ('admin', 'estimator', 'tenant_owner')
    );

CREATE POLICY "Users can view pricing_settings in their organization" ON pricing_settings
    FOR SELECT USING (organization_id = get_user_organization_id());

CREATE POLICY "Admins can manage pricing_settings in their organization" ON pricing_settings
    FOR ALL USING (
        organization_id = get_user_organization_id() 
        AND get_user_role() IN ('admin', 'estimator', 'tenant_owner')
    );

-- Enable RLS on new tables that might not have it
ALTER TABLE site_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_survey_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE labor_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE disposal_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_settings ENABLE ROW LEVEL SECURITY;