-- Multi-Tenant Architecture Update for HazardOS
-- Run this AFTER the base schema (01-schema.sql)

-- Add platform-level roles
ALTER TYPE user_role ADD VALUE 'platform_owner';
ALTER TYPE user_role ADD VALUE 'platform_admin';
ALTER TYPE user_role ADD VALUE 'tenant_owner';

-- Add tenant status and subscription info to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled', 'trial'));
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(20) DEFAULT 'starter' CHECK (subscription_tier IN ('trial', 'starter', 'professional', 'enterprise'));
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS max_users INTEGER DEFAULT 5;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS max_assessments_per_month INTEGER DEFAULT 50;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{}';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS billing_email VARCHAR(255);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS billing_address JSONB;

-- Add platform-level settings
CREATE TABLE platform_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add tenant usage tracking
CREATE TABLE tenant_usage (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    month_year DATE NOT NULL, -- First day of the month
    assessments_created INTEGER DEFAULT 0,
    photos_uploaded INTEGER DEFAULT 0,
    storage_used_mb INTEGER DEFAULT 0,
    api_calls INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, month_year)
);

-- Add audit log for platform-level actions
CREATE TABLE audit_log (
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

-- Add tenant invitations system
CREATE TABLE tenant_invitations (
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
CREATE INDEX idx_organizations_status ON organizations(status);
CREATE INDEX idx_organizations_subscription_tier ON organizations(subscription_tier);
CREATE INDEX idx_tenant_usage_organization_month ON tenant_usage(organization_id, month_year);
CREATE INDEX idx_audit_log_organization_id ON audit_log(organization_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX idx_tenant_invitations_email ON tenant_invitations(email);
CREATE INDEX idx_tenant_invitations_token ON tenant_invitations(token);
CREATE INDEX idx_profiles_platform_user ON profiles(is_platform_user);

-- Create function to check tenant limits
CREATE OR REPLACE FUNCTION check_tenant_limits(org_id UUID, limit_type VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    org_record organizations%ROWTYPE;
    current_month DATE;
    usage_record tenant_usage%ROWTYPE;
BEGIN
    -- Get organization details
    SELECT * INTO org_record FROM organizations WHERE id = org_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Check if organization is active
    IF org_record.status != 'active' THEN
        RETURN FALSE;
    END IF;
    
    current_month := DATE_TRUNC('month', NOW());
    
    -- Get current usage
    SELECT * INTO usage_record 
    FROM tenant_usage 
    WHERE organization_id = org_id AND month_year = current_month;
    
    -- Check specific limits
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

-- Create function to update tenant usage
CREATE OR REPLACE FUNCTION update_tenant_usage(org_id UUID, usage_type VARCHAR, increment_by INTEGER DEFAULT 1)
RETURNS VOID AS $$
DECLARE
    current_month DATE;
BEGIN
    current_month := DATE_TRUNC('month', NOW());
    
    -- Insert or update usage record
    INSERT INTO tenant_usage (organization_id, month_year)
    VALUES (org_id, current_month)
    ON CONFLICT (organization_id, month_year) DO NOTHING;
    
    -- Update specific usage counter
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

-- Create trigger to track assessment creation
CREATE OR REPLACE FUNCTION track_assessment_creation()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM update_tenant_usage(NEW.organization_id, 'assessments');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_assessment_creation_trigger
    AFTER INSERT ON assessments
    FOR EACH ROW EXECUTE FUNCTION track_assessment_creation();

-- Create trigger to track photo uploads
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

CREATE TRIGGER track_photo_upload_trigger
    AFTER INSERT ON photos
    FOR EACH ROW EXECUTE FUNCTION track_photo_upload();

-- Add updated_at triggers for new tables
CREATE TRIGGER update_platform_settings_updated_at BEFORE UPDATE ON platform_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tenant_usage_updated_at BEFORE UPDATE ON tenant_usage FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default platform settings
INSERT INTO platform_settings (key, value, description) VALUES
('maintenance_mode', 'false', 'Enable maintenance mode for the platform'),
('registration_enabled', 'true', 'Allow new tenant registrations'),
('max_trial_days', '30', 'Default trial period in days'),
('support_email', '"support@hazardos.app"', 'Platform support email'),
('platform_name', '"HazardOS"', 'Platform display name'),
('default_features', '{"assessments": true, "estimates": true, "scheduling": true, "reporting": true}', 'Default features for new tenants');

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