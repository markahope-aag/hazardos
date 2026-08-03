-- ============================================
-- HazardOS RLS Policies
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
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('platform_owner', 'platform_admin'))
    );

DROP POLICY IF EXISTS "Admins can update their organization" ON organizations;
CREATE POLICY "Admins can update their organization" ON organizations
    FOR UPDATE USING (
        id IN (SELECT organization_id FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'tenant_owner'))
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('platform_owner', 'platform_admin'))
    );

DROP POLICY IF EXISTS "Allow organization creation during onboarding" ON organizations;
CREATE POLICY "Allow organization creation during onboarding" ON organizations
    FOR INSERT WITH CHECK (true);

-- Profiles policies
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON profiles;
CREATE POLICY "Users can view profiles in their organization" ON profiles
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
        OR id = auth.uid()
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('platform_owner', 'platform_admin'))
    );

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage profiles in their organization" ON profiles;
CREATE POLICY "Admins can manage profiles in their organization" ON profiles
    FOR ALL USING (
        organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'tenant_owner'))
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('platform_owner', 'platform_admin'))
    );

DROP POLICY IF EXISTS "Allow profile creation during onboarding" ON profiles;
CREATE POLICY "Allow profile creation during onboarding" ON profiles
    FOR INSERT WITH CHECK (id = auth.uid());

-- Assessments policies
DROP POLICY IF EXISTS "Users can view assessments in their organization" ON assessments;
CREATE POLICY "Users can view assessments in their organization" ON assessments
    FOR SELECT USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can create assessments in their organization" ON assessments;
CREATE POLICY "Users can create assessments in their organization" ON assessments
    FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update assessments in their organization" ON assessments;
CREATE POLICY "Users can update assessments in their organization" ON assessments
    FOR UPDATE USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Admins can delete assessments in their organization" ON assessments;
CREATE POLICY "Admins can delete assessments in their organization" ON assessments
    FOR DELETE USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'tenant_owner')));

-- Photos policies
DROP POLICY IF EXISTS "Users can view photos for assessments in their organization" ON photos;
CREATE POLICY "Users can view photos for assessments in their organization" ON photos
    FOR SELECT USING (assessment_id IN (SELECT a.id FROM assessments a JOIN profiles p ON p.organization_id = a.organization_id WHERE p.id = auth.uid()));

DROP POLICY IF EXISTS "Users can create photos for assessments in their organization" ON photos;
CREATE POLICY "Users can create photos for assessments in their organization" ON photos
    FOR INSERT WITH CHECK (assessment_id IN (SELECT a.id FROM assessments a JOIN profiles p ON p.organization_id = a.organization_id WHERE p.id = auth.uid()));

DROP POLICY IF EXISTS "Users can update photos for assessments in their organization" ON photos;
CREATE POLICY "Users can update photos for assessments in their organization" ON photos
    FOR UPDATE USING (assessment_id IN (SELECT a.id FROM assessments a JOIN profiles p ON p.organization_id = a.organization_id WHERE p.id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete photos for assessments in their organization" ON photos;
CREATE POLICY "Users can delete photos for assessments in their organization" ON photos
    FOR DELETE USING (assessment_id IN (SELECT a.id FROM assessments a JOIN profiles p ON p.organization_id = a.organization_id WHERE p.id = auth.uid()));

-- Equipment catalog policies
DROP POLICY IF EXISTS "Users can view equipment in their organization" ON equipment_catalog;
CREATE POLICY "Users can view equipment in their organization" ON equipment_catalog
    FOR SELECT USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage equipment in their organization" ON equipment_catalog;
CREATE POLICY "Admins can manage equipment in their organization" ON equipment_catalog
    FOR ALL USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'estimator', 'tenant_owner')));

-- Materials catalog policies
DROP POLICY IF EXISTS "Users can view materials in their organization" ON materials_catalog;
CREATE POLICY "Users can view materials in their organization" ON materials_catalog
    FOR SELECT USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage materials in their organization" ON materials_catalog;
CREATE POLICY "Admins can manage materials in their organization" ON materials_catalog
    FOR ALL USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'estimator', 'tenant_owner')));

-- Estimates policies
DROP POLICY IF EXISTS "Users can view estimates for assessments in their organization" ON estimates;
CREATE POLICY "Users can view estimates for assessments in their organization" ON estimates
    FOR SELECT USING (assessment_id IN (SELECT a.id FROM assessments a JOIN profiles p ON p.organization_id = a.organization_id WHERE p.id = auth.uid()));

DROP POLICY IF EXISTS "Estimators can create estimates in their organization" ON estimates;
CREATE POLICY "Estimators can create estimates in their organization" ON estimates
    FOR INSERT WITH CHECK (assessment_id IN (SELECT a.id FROM assessments a JOIN profiles p ON p.organization_id = a.organization_id WHERE p.id = auth.uid() AND p.role IN ('admin', 'estimator', 'tenant_owner')));

DROP POLICY IF EXISTS "Estimators can update estimates in their organization" ON estimates;
CREATE POLICY "Estimators can update estimates in their organization" ON estimates
    FOR UPDATE USING (assessment_id IN (SELECT a.id FROM assessments a JOIN profiles p ON p.organization_id = a.organization_id WHERE p.id = auth.uid() AND p.role IN ('admin', 'estimator', 'tenant_owner')));

-- Jobs policies
DROP POLICY IF EXISTS "Users can view jobs in their organization" ON jobs;
CREATE POLICY "Users can view jobs in their organization" ON jobs
    FOR SELECT USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage jobs in their organization" ON jobs;
CREATE POLICY "Admins can manage jobs in their organization" ON jobs
    FOR ALL USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'estimator', 'tenant_owner')));

-- Platform settings policies
DROP POLICY IF EXISTS "Platform owners can manage platform settings" ON platform_settings;
CREATE POLICY "Platform owners can manage platform settings" ON platform_settings
    FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('platform_owner', 'platform_admin')));

-- Tenant usage policies
DROP POLICY IF EXISTS "Users can view their organization's usage" ON tenant_usage;
CREATE POLICY "Users can view their organization's usage" ON tenant_usage
    FOR SELECT USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Platform users can view all tenant usage" ON tenant_usage;
CREATE POLICY "Platform users can view all tenant usage" ON tenant_usage
    FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('platform_owner', 'platform_admin')));

DROP POLICY IF EXISTS "System can insert/update tenant usage" ON tenant_usage;
CREATE POLICY "System can insert/update tenant usage" ON tenant_usage
    FOR ALL USING (TRUE);

-- Audit log policies
DROP POLICY IF EXISTS "Users can view audit logs for their organization" ON audit_log;
CREATE POLICY "Users can view audit logs for their organization" ON audit_log
    FOR SELECT USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()) OR organization_id IS NULL);

DROP POLICY IF EXISTS "Platform users can view all audit logs" ON audit_log;
CREATE POLICY "Platform users can view all audit logs" ON audit_log
    FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('platform_owner', 'platform_admin')));

DROP POLICY IF EXISTS "System can insert audit logs" ON audit_log;
CREATE POLICY "System can insert audit logs" ON audit_log
    FOR INSERT WITH CHECK (TRUE);

-- Tenant invitations policies
DROP POLICY IF EXISTS "Users can manage invitations for their organization" ON tenant_invitations;
CREATE POLICY "Users can manage invitations for their organization" ON tenant_invitations
    FOR ALL USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'tenant_owner')));

DROP POLICY IF EXISTS "Platform users can view all invitations" ON tenant_invitations;
CREATE POLICY "Platform users can view all invitations" ON tenant_invitations
    FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('platform_owner', 'platform_admin')));

-- User registration handler
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    invite_record tenant_invitations%ROWTYPE;
BEGIN
    SELECT * INTO invite_record FROM tenant_invitations WHERE email = NEW.email AND expires_at > NOW() AND accepted_at IS NULL ORDER BY created_at DESC LIMIT 1;
    IF FOUND THEN
        INSERT INTO public.profiles (id, organization_id, email, first_name, last_name, role, is_platform_user)
        VALUES (NEW.id, invite_record.organization_id, NEW.email, NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'last_name', invite_record.role, invite_record.organization_id = '00000000-0000-0000-0000-000000000001');
        UPDATE tenant_invitations SET accepted_at = NOW() WHERE id = invite_record.id;
    ELSE
        INSERT INTO public.profiles (id, email, first_name, last_name, role, is_platform_user)
        VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'last_name', 'estimator', FALSE);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Audit event logging function
CREATE OR REPLACE FUNCTION log_audit_event(p_organization_id UUID, p_action VARCHAR, p_resource_type VARCHAR DEFAULT NULL, p_resource_id UUID DEFAULT NULL, p_old_values JSONB DEFAULT NULL, p_new_values JSONB DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
    INSERT INTO audit_log (organization_id, user_id, action, resource_type, resource_id, old_values, new_values, ip_address, created_at)
    VALUES (p_organization_id, auth.uid(), p_action, p_resource_type, p_resource_id, p_old_values, p_new_values, inet_client_addr(), NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
