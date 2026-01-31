-- Multi-Tenant RLS Policies for HazardOS
-- Run this AFTER the multi-tenant schema update

-- Enable RLS on new tables
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_invitations ENABLE ROW LEVEL SECURITY;

-- Platform settings policies (only platform owners/admins can access)
CREATE POLICY "Platform owners can manage platform settings" ON platform_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('platform_owner', 'platform_admin')
        )
    );

-- Tenant usage policies
CREATE POLICY "Users can view their organization's usage" ON tenant_usage
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Platform users can view all tenant usage" ON tenant_usage
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('platform_owner', 'platform_admin')
        )
    );

CREATE POLICY "System can insert/update tenant usage" ON tenant_usage
    FOR ALL USING (TRUE);

-- Audit log policies
CREATE POLICY "Users can view audit logs for their organization" ON audit_log
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
        OR organization_id IS NULL -- Platform-level actions
    );

CREATE POLICY "Platform users can view all audit logs" ON audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('platform_owner', 'platform_admin')
        )
    );

CREATE POLICY "System can insert audit logs" ON audit_log
    FOR INSERT WITH CHECK (TRUE);

-- Tenant invitations policies
CREATE POLICY "Users can manage invitations for their organization" ON tenant_invitations
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'tenant_owner')
        )
    );

CREATE POLICY "Platform users can view all invitations" ON tenant_invitations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('platform_owner', 'platform_admin')
        )
    );

-- Update existing organization policies for platform access
DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;
CREATE POLICY "Users can view their own organization" ON organizations
    FOR SELECT USING (
        id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
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

-- Platform users can create organizations (for tenant onboarding)
CREATE POLICY "Platform users can create organizations" ON organizations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('platform_owner', 'platform_admin')
        )
    );

-- Update profiles policies for platform access
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON profiles;
CREATE POLICY "Users can view profiles in their organization" ON profiles
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('platform_owner', 'platform_admin')
        )
    );

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

-- Create triggers for audit logging
CREATE OR REPLACE FUNCTION audit_organization_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM log_audit_event(NEW.id, 'organization_created', 'organization', NEW.id, NULL, to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM log_audit_event(NEW.id, 'organization_updated', 'organization', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM log_audit_event(OLD.id, 'organization_deleted', 'organization', OLD.id, to_jsonb(OLD), NULL);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_organization_changes_trigger
    AFTER INSERT OR UPDATE OR DELETE ON organizations
    FOR EACH ROW EXECUTE FUNCTION audit_organization_changes();

-- Update the user registration function for multi-tenancy
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
        
        -- Log the event
        PERFORM log_audit_event(
            invite_record.organization_id, 
            'user_joined_via_invitation', 
            'profile', 
            NEW.id
        );
    ELSE
        -- Create profile without organization (will need to be assigned)
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
            'viewer',
            FALSE
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;