-- ============================================
-- HazardOS Full Database Migration
-- ============================================
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- This combines all migrations into a single file
-- ============================================

-- ============================================
-- PART 1: Base Schema (01-schema.sql)
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
DO $$ BEGIN
    CREATE TYPE hazard_type AS ENUM ('asbestos', 'mold', 'lead', 'vermiculite', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE assessment_status AS ENUM ('draft', 'submitted', 'estimated', 'quoted', 'scheduled', 'completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'estimator', 'technician', 'viewer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    zip VARCHAR(20),
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    license_number VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    role user_role DEFAULT 'estimator',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assessments table
CREATE TABLE IF NOT EXISTS assessments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    estimator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Job Information
    job_name VARCHAR(255) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(20),
    site_address TEXT NOT NULL,
    site_city VARCHAR(100) NOT NULL,
    site_state VARCHAR(50) NOT NULL,
    site_zip VARCHAR(20) NOT NULL,
    site_location POINT,

    -- Hazard Classification
    hazard_type hazard_type NOT NULL,
    hazard_subtype VARCHAR(255),
    containment_level INTEGER CHECK (containment_level BETWEEN 1 AND 4),

    -- Area/Scope
    area_sqft DECIMAL(10,2),
    linear_ft DECIMAL(10,2),
    volume_cuft DECIMAL(10,2),
    material_type VARCHAR(255),

    -- Site Conditions
    occupied BOOLEAN DEFAULT FALSE,
    access_issues TEXT[],
    special_conditions TEXT,

    -- Risk Assessment
    clearance_required BOOLEAN DEFAULT FALSE,
    clearance_lab VARCHAR(255),
    regulatory_notifications_needed BOOLEAN DEFAULT FALSE,

    -- Documentation
    notes TEXT,

    -- Status
    status assessment_status DEFAULT 'draft'
);

-- Photos table
CREATE TABLE IF NOT EXISTS photos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE NOT NULL,
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    caption TEXT,
    gps_coordinates POINT,
    file_size INTEGER,
    file_type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Equipment catalog table
CREATE TABLE IF NOT EXISTS equipment_catalog (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    daily_rate DECIMAL(10,2) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Materials catalog table
CREATE TABLE IF NOT EXISTS materials_catalog (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    unit VARCHAR(50),
    unit_cost DECIMAL(10,2) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Estimates table
CREATE TABLE IF NOT EXISTS estimates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

    estimated_duration_days INTEGER NOT NULL,
    estimated_labor_hours DECIMAL(8,2) NOT NULL,

    crew_type VARCHAR(100),
    crew_size INTEGER NOT NULL,
    labor_rate_per_hour DECIMAL(8,2) NOT NULL,

    equipment_needed JSONB DEFAULT '[]',
    equipment_cost DECIMAL(10,2) DEFAULT 0,

    materials_needed JSONB DEFAULT '[]',
    materials_cost DECIMAL(10,2) DEFAULT 0,

    disposal_method VARCHAR(255),
    disposal_cost DECIMAL(10,2) DEFAULT 0,

    total_direct_cost DECIMAL(10,2) NOT NULL,
    markup_percentage DECIMAL(5,2) DEFAULT 0,
    total_price DECIMAL(10,2) NOT NULL,

    overrides JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE
);

-- Jobs table
CREATE TABLE IF NOT EXISTS jobs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE NOT NULL,
    estimate_id UUID REFERENCES estimates(id) ON DELETE CASCADE NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

    job_number VARCHAR(50) UNIQUE NOT NULL,
    start_date DATE,
    end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,

    assigned_crew JSONB DEFAULT '[]',
    project_manager_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

    status VARCHAR(50) DEFAULT 'scheduled',

    actual_labor_hours DECIMAL(8,2),
    actual_material_cost DECIMAL(10,2),
    actual_equipment_cost DECIMAL(10,2),
    actual_disposal_cost DECIMAL(10,2),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_assessments_organization_id ON assessments(organization_id);
CREATE INDEX IF NOT EXISTS idx_assessments_estimator_id ON assessments(estimator_id);
CREATE INDEX IF NOT EXISTS idx_assessments_status ON assessments(status);
CREATE INDEX IF NOT EXISTS idx_assessments_hazard_type ON assessments(hazard_type);
CREATE INDEX IF NOT EXISTS idx_assessments_created_at ON assessments(created_at);
CREATE INDEX IF NOT EXISTS idx_photos_assessment_id ON photos(assessment_id);
CREATE INDEX IF NOT EXISTS idx_estimates_assessment_id ON estimates(assessment_id);
CREATE INDEX IF NOT EXISTS idx_jobs_organization_id ON jobs(organization_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_assessments_updated_at ON assessments;
CREATE TRIGGER update_assessments_updated_at BEFORE UPDATE ON assessments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_jobs_updated_at ON jobs;
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PART 2: Multi-Tenant Schema (04-multi-tenant-schema.sql)
-- ============================================

-- Add platform-level roles
DO $$ BEGIN
    ALTER TYPE user_role ADD VALUE 'platform_owner';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TYPE user_role ADD VALUE 'platform_admin';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TYPE user_role ADD VALUE 'tenant_owner';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add tenant status and subscription info to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled', 'trial'));
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(20) DEFAULT 'starter' CHECK (subscription_tier IN ('trial', 'starter', 'professional', 'enterprise'));
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS max_users INTEGER DEFAULT 5;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS max_assessments_per_month INTEGER DEFAULT 50;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{}';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS billing_email VARCHAR(255);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS billing_address JSONB;

-- Platform settings table
CREATE TABLE IF NOT EXISTS platform_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tenant usage tracking
CREATE TABLE IF NOT EXISTS tenant_usage (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    month_year DATE NOT NULL,
    assessments_created INTEGER DEFAULT 0,
    photos_uploaded INTEGER DEFAULT 0,
    storage_used_mb INTEGER DEFAULT 0,
    api_calls INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, month_year)
);

-- Audit log
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tenant invitations
CREATE TABLE IF NOT EXISTS tenant_invitations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    email VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    invited_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update profiles table for multi-tenancy
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_platform_user BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;

-- Create indexes for multi-tenant queries
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);
CREATE INDEX IF NOT EXISTS idx_organizations_subscription_tier ON organizations(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_tenant_usage_organization_month ON tenant_usage(organization_id, month_year);
CREATE INDEX IF NOT EXISTS idx_audit_log_organization_id ON audit_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_email ON tenant_invitations(email);
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_token ON tenant_invitations(token);
CREATE INDEX IF NOT EXISTS idx_profiles_platform_user ON profiles(is_platform_user);

-- Tenant limits checking function
CREATE OR REPLACE FUNCTION check_tenant_limits(org_id UUID, limit_type VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    org_record organizations%ROWTYPE;
    current_month DATE;
    usage_record tenant_usage%ROWTYPE;
BEGIN
    SELECT * INTO org_record FROM organizations WHERE id = org_id;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    IF org_record.status != 'active' THEN
        RETURN FALSE;
    END IF;

    current_month := DATE_TRUNC('month', NOW());

    SELECT * INTO usage_record
    FROM tenant_usage
    WHERE organization_id = org_id AND month_year = current_month;

    CASE limit_type
        WHEN 'assessments' THEN
            RETURN COALESCE(usage_record.assessments_created, 0) < org_record.max_assessments_per_month;
        WHEN 'users' THEN
            RETURN (SELECT COUNT(*) FROM profiles WHERE organization_id = org_id AND is_active = TRUE) < org_record.max_users;
        ELSE
            RETURN TRUE;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Update tenant usage function
CREATE OR REPLACE FUNCTION update_tenant_usage(org_id UUID, usage_type VARCHAR, increment_by INTEGER DEFAULT 1)
RETURNS VOID AS $$
DECLARE
    current_month DATE;
BEGIN
    current_month := DATE_TRUNC('month', NOW());

    INSERT INTO tenant_usage (organization_id, month_year)
    VALUES (org_id, current_month)
    ON CONFLICT (organization_id, month_year) DO NOTHING;

    CASE usage_type
        WHEN 'assessments' THEN
            UPDATE tenant_usage
            SET assessments_created = assessments_created + increment_by,
                updated_at = NOW()
            WHERE organization_id = org_id AND month_year = current_month;
        WHEN 'photos' THEN
            UPDATE tenant_usage
            SET photos_uploaded = photos_uploaded + increment_by,
                updated_at = NOW()
            WHERE organization_id = org_id AND month_year = current_month;
        WHEN 'api_calls' THEN
            UPDATE tenant_usage
            SET api_calls = api_calls + increment_by,
                updated_at = NOW()
            WHERE organization_id = org_id AND month_year = current_month;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Assessment creation tracking trigger
CREATE OR REPLACE FUNCTION track_assessment_creation()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM update_tenant_usage(NEW.organization_id, 'assessments');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS track_assessment_creation_trigger ON assessments;
CREATE TRIGGER track_assessment_creation_trigger
    AFTER INSERT ON assessments
    FOR EACH ROW EXECUTE FUNCTION track_assessment_creation();

-- Photo upload tracking trigger
CREATE OR REPLACE FUNCTION track_photo_upload()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM update_tenant_usage(
        (SELECT organization_id FROM assessments WHERE id = NEW.assessment_id),
        'photos'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS track_photo_upload_trigger ON photos;
CREATE TRIGGER track_photo_upload_trigger
    AFTER INSERT ON photos
    FOR EACH ROW EXECUTE FUNCTION track_photo_upload();

-- Updated_at triggers for new tables
DROP TRIGGER IF EXISTS update_platform_settings_updated_at ON platform_settings;
CREATE TRIGGER update_platform_settings_updated_at BEFORE UPDATE ON platform_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tenant_usage_updated_at ON tenant_usage;
CREATE TRIGGER update_tenant_usage_updated_at BEFORE UPDATE ON tenant_usage FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default platform settings
INSERT INTO platform_settings (key, value, description) VALUES
('maintenance_mode', 'false', 'Enable maintenance mode for the platform'),
('registration_enabled', 'true', 'Allow new tenant registrations'),
('max_trial_days', '30', 'Default trial period in days'),
('support_email', '"support@hazardos.app"', 'Platform support email'),
('platform_name', '"HazardOS"', 'Platform display name'),
('default_features', '{"assessments": true, "estimates": true, "scheduling": true, "reporting": true}', 'Default features for new tenants')
ON CONFLICT (key) DO NOTHING;

-- Create the platform owner organization
INSERT INTO organizations (
    id,
    name,
    email,
    status,
    subscription_tier,
    max_users,
    max_assessments_per_month,
    features
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'HazardOS Platform',
    'platform@hazardos.app',
    'active',
    'enterprise',
    999999,
    999999,
    '{"all_features": true, "platform_admin": true}'
) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- PART 3: RLS Policies (02-rls-policies.sql + 05-multi-tenant-rls.sql)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_invitations ENABLE ROW LEVEL SECURITY;

-- Organizations policies
DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;
CREATE POLICY "Users can view their own organization" ON organizations
    FOR SELECT USING (
        id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('platform_owner', 'platform_admin')
        )
    );

DROP POLICY IF EXISTS "Admins can update their organization" ON organizations;
CREATE POLICY "Admins can update their organization" ON organizations
    FOR UPDATE USING (
        id IN (
            SELECT organization_id FROM profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'tenant_owner')
        )
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('platform_owner', 'platform_admin')
        )
    );

DROP POLICY IF EXISTS "Platform users can create organizations" ON organizations;
CREATE POLICY "Platform users can create organizations" ON organizations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('platform_owner', 'platform_admin')
        )
    );

-- Allow anyone to insert organization during onboarding (before profile exists)
DROP POLICY IF EXISTS "Allow organization creation during onboarding" ON organizations;
CREATE POLICY "Allow organization creation during onboarding" ON organizations
    FOR INSERT WITH CHECK (true);

-- Profiles policies
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON profiles;
CREATE POLICY "Users can view profiles in their organization" ON profiles
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
        OR id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('platform_owner', 'platform_admin')
        )
    );

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage profiles in their organization" ON profiles;
CREATE POLICY "Admins can manage profiles in their organization" ON profiles
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'tenant_owner')
        )
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('platform_owner', 'platform_admin')
        )
    );

-- Allow profile creation during onboarding
DROP POLICY IF EXISTS "Allow profile creation during onboarding" ON profiles;
CREATE POLICY "Allow profile creation during onboarding" ON profiles
    FOR INSERT WITH CHECK (id = auth.uid());

-- Assessments policies
DROP POLICY IF EXISTS "Users can view assessments in their organization" ON assessments;
CREATE POLICY "Users can view assessments in their organization" ON assessments
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can create assessments in their organization" ON assessments;
CREATE POLICY "Users can create assessments in their organization" ON assessments
    FOR INSERT WITH CHECK (
        organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can update assessments in their organization" ON assessments;
CREATE POLICY "Users can update assessments in their organization" ON assessments
    FOR UPDATE USING (
        organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Admins can delete assessments in their organization" ON assessments;
CREATE POLICY "Admins can delete assessments in their organization" ON assessments
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'tenant_owner')
        )
    );

-- Photos policies
DROP POLICY IF EXISTS "Users can view photos for assessments in their organization" ON photos;
CREATE POLICY "Users can view photos for assessments in their organization" ON photos
    FOR SELECT USING (
        assessment_id IN (
            SELECT a.id FROM assessments a
            JOIN profiles p ON p.organization_id = a.organization_id
            WHERE p.id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can create photos for assessments in their organization" ON photos;
CREATE POLICY "Users can create photos for assessments in their organization" ON photos
    FOR INSERT WITH CHECK (
        assessment_id IN (
            SELECT a.id FROM assessments a
            JOIN profiles p ON p.organization_id = a.organization_id
            WHERE p.id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update photos for assessments in their organization" ON photos;
CREATE POLICY "Users can update photos for assessments in their organization" ON photos
    FOR UPDATE USING (
        assessment_id IN (
            SELECT a.id FROM assessments a
            JOIN profiles p ON p.organization_id = a.organization_id
            WHERE p.id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete photos for assessments in their organization" ON photos;
CREATE POLICY "Users can delete photos for assessments in their organization" ON photos
    FOR DELETE USING (
        assessment_id IN (
            SELECT a.id FROM assessments a
            JOIN profiles p ON p.organization_id = a.organization_id
            WHERE p.id = auth.uid()
        )
    );

-- Equipment catalog policies
DROP POLICY IF EXISTS "Users can view equipment in their organization" ON equipment_catalog;
CREATE POLICY "Users can view equipment in their organization" ON equipment_catalog
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Admins can manage equipment in their organization" ON equipment_catalog;
CREATE POLICY "Admins can manage equipment in their organization" ON equipment_catalog
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'estimator', 'tenant_owner')
        )
    );

-- Materials catalog policies
DROP POLICY IF EXISTS "Users can view materials in their organization" ON materials_catalog;
CREATE POLICY "Users can view materials in their organization" ON materials_catalog
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Admins can manage materials in their organization" ON materials_catalog;
CREATE POLICY "Admins can manage materials in their organization" ON materials_catalog
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'estimator', 'tenant_owner')
        )
    );

-- Estimates policies
DROP POLICY IF EXISTS "Users can view estimates for assessments in their organization" ON estimates;
CREATE POLICY "Users can view estimates for assessments in their organization" ON estimates
    FOR SELECT USING (
        assessment_id IN (
            SELECT a.id FROM assessments a
            JOIN profiles p ON p.organization_id = a.organization_id
            WHERE p.id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Estimators can create estimates in their organization" ON estimates;
CREATE POLICY "Estimators can create estimates in their organization" ON estimates
    FOR INSERT WITH CHECK (
        assessment_id IN (
            SELECT a.id FROM assessments a
            JOIN profiles p ON p.organization_id = a.organization_id
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'estimator', 'tenant_owner')
        )
    );

DROP POLICY IF EXISTS "Estimators can update estimates in their organization" ON estimates;
CREATE POLICY "Estimators can update estimates in their organization" ON estimates
    FOR UPDATE USING (
        assessment_id IN (
            SELECT a.id FROM assessments a
            JOIN profiles p ON p.organization_id = a.organization_id
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'estimator', 'tenant_owner')
        )
    );

-- Jobs policies
DROP POLICY IF EXISTS "Users can view jobs in their organization" ON jobs;
CREATE POLICY "Users can view jobs in their organization" ON jobs
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Admins can manage jobs in their organization" ON jobs;
CREATE POLICY "Admins can manage jobs in their organization" ON jobs
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'estimator', 'tenant_owner')
        )
    );

-- Platform settings policies
DROP POLICY IF EXISTS "Platform owners can manage platform settings" ON platform_settings;
CREATE POLICY "Platform owners can manage platform settings" ON platform_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('platform_owner', 'platform_admin')
        )
    );

-- Tenant usage policies
DROP POLICY IF EXISTS "Users can view their organization's usage" ON tenant_usage;
CREATE POLICY "Users can view their organization's usage" ON tenant_usage
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Platform users can view all tenant usage" ON tenant_usage;
CREATE POLICY "Platform users can view all tenant usage" ON tenant_usage
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('platform_owner', 'platform_admin')
        )
    );

DROP POLICY IF EXISTS "System can insert/update tenant usage" ON tenant_usage;
CREATE POLICY "System can insert/update tenant usage" ON tenant_usage
    FOR ALL USING (TRUE);

-- Audit log policies
DROP POLICY IF EXISTS "Users can view audit logs for their organization" ON audit_log;
CREATE POLICY "Users can view audit logs for their organization" ON audit_log
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
        OR organization_id IS NULL
    );

DROP POLICY IF EXISTS "Platform users can view all audit logs" ON audit_log;
CREATE POLICY "Platform users can view all audit logs" ON audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('platform_owner', 'platform_admin')
        )
    );

DROP POLICY IF EXISTS "System can insert audit logs" ON audit_log;
CREATE POLICY "System can insert audit logs" ON audit_log
    FOR INSERT WITH CHECK (TRUE);

-- Tenant invitations policies
DROP POLICY IF EXISTS "Users can manage invitations for their organization" ON tenant_invitations;
CREATE POLICY "Users can manage invitations for their organization" ON tenant_invitations
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'tenant_owner')
        )
    );

DROP POLICY IF EXISTS "Platform users can view all invitations" ON tenant_invitations;
CREATE POLICY "Platform users can view all invitations" ON tenant_invitations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('platform_owner', 'platform_admin')
        )
    );

-- ============================================
-- PART 4: User Registration Trigger
-- ============================================

-- Create function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event(
    p_organization_id UUID,
    p_action VARCHAR,
    p_resource_type VARCHAR DEFAULT NULL,
    p_resource_id UUID DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO audit_log (
        organization_id,
        user_id,
        action,
        resource_type,
        resource_id,
        old_values,
        new_values,
        ip_address,
        created_at
    ) VALUES (
        p_organization_id,
        auth.uid(),
        p_action,
        p_resource_type,
        p_resource_id,
        p_old_values,
        p_new_values,
        inet_client_addr(),
        NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- User registration handler
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    invite_record tenant_invitations%ROWTYPE;
BEGIN
    -- Check if user was invited
    SELECT * INTO invite_record
    FROM tenant_invitations
    WHERE email = NEW.email
    AND expires_at > NOW()
    AND accepted_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1;

    IF FOUND THEN
        -- Create profile with invited organization and role
        INSERT INTO public.profiles (
            id,
            organization_id,
            email,
            first_name,
            last_name,
            role,
            is_platform_user
        ) VALUES (
            NEW.id,
            invite_record.organization_id,
            NEW.email,
            NEW.raw_user_meta_data->>'first_name',
            NEW.raw_user_meta_data->>'last_name',
            invite_record.role,
            invite_record.organization_id = '00000000-0000-0000-0000-000000000001'
        );

        -- Mark invitation as accepted
        UPDATE tenant_invitations
        SET accepted_at = NOW()
        WHERE id = invite_record.id;
    ELSE
        -- Create profile without organization (will be set during onboarding)
        INSERT INTO public.profiles (
            id,
            email,
            first_name,
            last_name,
            role,
            is_platform_user
        ) VALUES (
            NEW.id,
            NEW.email,
            NEW.raw_user_meta_data->>'first_name',
            NEW.raw_user_meta_data->>'last_name',
            'estimator',
            FALSE
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- PART 5: Storage Bucket for Photos
-- ============================================

-- Note: Storage bucket creation must be done via Supabase Dashboard
-- Go to Storage > Create new bucket > Name: "assessment-photos"
-- Set to public or private based on your needs

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- Next steps:
-- 1. Create Storage bucket "assessment-photos" in Supabase Dashboard
-- 2. Create your first user account via the app
-- 3. Manually update that user's profile to be tenant_owner if needed
