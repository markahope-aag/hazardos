-- Setup Mark Hope as Platform Owner
-- Run this AFTER the multi-tenant schema and RLS policies

-- Create Mark Hope's user profile as platform owner
-- Note: The actual auth user needs to be created through Supabase Auth first
-- This script assumes the auth.users record exists with the specified email

DO $$
DECLARE
    mark_user_id UUID;
    platform_org_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
    -- Try to find Mark's user ID from auth.users
    SELECT id INTO mark_user_id 
    FROM auth.users 
    WHERE email = 'mark.hope@asymmetric.pro'
    LIMIT 1;
    
    IF mark_user_id IS NOT NULL THEN
        -- Create or update Mark's profile as platform owner
        INSERT INTO profiles (
            id,
            organization_id,
            email,
            first_name,
            last_name,
            role,
            is_platform_user,
            is_active
        ) VALUES (
            mark_user_id,
            platform_org_id,
            'mark.hope@asymmetric.pro',
            'Mark',
            'Hope',
            'platform_owner',
            TRUE,
            TRUE
        ) ON CONFLICT (id) DO UPDATE SET
            organization_id = platform_org_id,
            role = 'platform_owner',
            is_platform_user = TRUE,
            is_active = TRUE,
            updated_at = NOW();
            
        RAISE NOTICE 'Platform owner profile created/updated for Mark Hope (ID: %)', mark_user_id;
    ELSE
        RAISE NOTICE 'Auth user not found for mark.hope@asymmetric.pro. Please create the user in Supabase Auth first.';
    END IF;
END $$;

-- Create a tenant invitation for Mark Hope (in case the auth user doesn't exist yet)
INSERT INTO tenant_invitations (
    organization_id,
    email,
    role,
    invited_by,
    token,
    expires_at
) SELECT
    '00000000-0000-0000-0000-000000000001',
    'mark.hope@asymmetric.pro',
    'platform_owner',
    '00000000-0000-0000-0000-000000000001', -- Self-invited
    encode(gen_random_bytes(32), 'hex'),
    NOW() + INTERVAL '365 days' -- Long expiration for platform owner
WHERE NOT EXISTS (
    SELECT 1 FROM tenant_invitations 
    WHERE email = 'mark.hope@asymmetric.pro'
    AND expires_at > NOW()
);

-- Log the platform owner setup
INSERT INTO audit_log (
    organization_id,
    action,
    resource_type,
    new_values,
    created_at
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'platform_owner_setup',
    'platform',
    jsonb_build_object(
        'email', 'mark.hope@asymmetric.pro',
        'role', 'platform_owner',
        'setup_date', NOW()
    ),
    NOW()
);

-- Create some sample tenant organizations for testing
INSERT INTO organizations (
    id,
    name,
    address,
    city,
    state,
    zip,
    phone,
    email,
    license_number,
    status,
    subscription_tier,
    max_users,
    max_assessments_per_month,
    features,
    billing_email
) VALUES 
(
    '11111111-1111-1111-1111-111111111111',
    'Demo Environmental Services',
    '123 Demo Street',
    'Demo City',
    'CA',
    '90210',
    '(555) 123-4567',
    'demo@hazardos.app',
    'DEMO-2024-001',
    'active',
    'trial',
    5,
    25,
    '{"assessments": true, "estimates": true, "scheduling": false, "reporting": true}',
    'billing@demo-environmental.com'
),
(
    '22222222-2222-2222-2222-222222222222',
    'Pro Remediation Co',
    '456 Professional Ave',
    'Business City',
    'NY',
    '10001',
    '(555) 987-6543',
    'info@proremediation.com',
    'PRO-2024-002',
    'active',
    'professional',
    25,
    500,
    '{"assessments": true, "estimates": true, "scheduling": true, "reporting": true, "advanced_analytics": true}',
    'accounting@proremediation.com'
) ON CONFLICT (id) DO NOTHING;

-- Add some sample equipment and materials to the demo organization
INSERT INTO equipment_catalog (organization_id, name, category, daily_rate, description) VALUES
('11111111-1111-1111-1111-111111111111', 'Demo HEPA Air Scrubber', 'Air Filtration', 100.00, 'Demo equipment for testing'),
('11111111-1111-1111-1111-111111111111', 'Demo Negative Air Machine', 'Air Filtration', 85.00, 'Demo equipment for testing'),
('22222222-2222-2222-2222-222222222222', 'Pro HEPA Air Scrubber - Large', 'Air Filtration', 150.00, 'Professional grade equipment'),
('22222222-2222-2222-2222-222222222222', 'Pro Decontamination Unit', 'Containment', 200.00, 'Advanced decontamination system')
ON CONFLICT DO NOTHING;

INSERT INTO materials_catalog (organization_id, name, category, unit, unit_cost, description) VALUES
('11111111-1111-1111-1111-111111111111', 'Demo 6mil Poly Sheeting', 'Containment', 'sqft', 0.12, 'Demo material for testing'),
('11111111-1111-1111-1111-111111111111', 'Demo Tyvek Suits', 'PPE', 'each', 10.00, 'Demo PPE for testing'),
('22222222-2222-2222-2222-222222222222', 'Pro 6mil Poly Sheeting', 'Containment', 'sqft', 0.18, 'Professional grade sheeting'),
('22222222-2222-2222-2222-222222222222', 'Pro N100 Respirator Cartridges', 'PPE', 'pair', 30.00, 'High-grade respirator cartridges')
ON CONFLICT DO NOTHING;

-- Create tenant invitations for demo users
INSERT INTO tenant_invitations (organization_id, email, role, invited_by, token, expires_at) VALUES
('11111111-1111-1111-1111-111111111111', 'demo.admin@hazardos.app', 'tenant_owner', '00000000-0000-0000-0000-000000000001', encode(gen_random_bytes(32), 'hex'), NOW() + INTERVAL '30 days'),
('11111111-1111-1111-1111-111111111111', 'demo.estimator@hazardos.app', 'estimator', '00000000-0000-0000-0000-000000000001', encode(gen_random_bytes(32), 'hex'), NOW() + INTERVAL '30 days'),
('22222222-2222-2222-2222-222222222222', 'pro.admin@hazardos.app', 'tenant_owner', '00000000-0000-0000-0000-000000000001', encode(gen_random_bytes(32), 'hex'), NOW() + INTERVAL '30 days'),
('22222222-2222-2222-2222-222222222222', 'pro.estimator@hazardos.app', 'estimator', '00000000-0000-0000-0000-000000000001', encode(gen_random_bytes(32), 'hex'), NOW() + INTERVAL '30 days')
ON CONFLICT DO NOTHING;

-- Initialize usage tracking for current month
INSERT INTO tenant_usage (organization_id, month_year) VALUES
('11111111-1111-1111-1111-111111111111', DATE_TRUNC('month', NOW())),
('22222222-2222-2222-2222-222222222222', DATE_TRUNC('month', NOW()))
ON CONFLICT DO NOTHING;

RAISE NOTICE 'Multi-tenant setup complete!';
RAISE NOTICE 'Platform Owner: Mark Hope (mark.hope@asymmetric.pro)';
RAISE NOTICE 'Demo Organizations Created: Demo Environmental Services, Pro Remediation Co';
RAISE NOTICE 'Next Steps:';
RAISE NOTICE '1. Create auth user for mark.hope@asymmetric.pro in Supabase Auth';
RAISE NOTICE '2. Run this script again to link the auth user to the platform owner profile';
RAISE NOTICE '3. Access the platform admin interface at /platform-admin';