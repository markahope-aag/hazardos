-- ============================================
-- Fix handle_new_user trigger with better error handling
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    invite_record tenant_invitations%ROWTYPE;
BEGIN
    -- Look for pending invitation
    SELECT * INTO invite_record
    FROM tenant_invitations
    WHERE email = NEW.email
      AND expires_at > NOW()
      AND accepted_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1;

    IF FOUND THEN
        -- User has an invitation - join that org
        INSERT INTO public.profiles (id, organization_id, email, first_name, last_name, role, is_platform_user)
        VALUES (
            NEW.id,
            invite_record.organization_id,
            NEW.email,
            NEW.raw_user_meta_data->>'first_name',
            NEW.raw_user_meta_data->>'last_name',
            invite_record.role,
            invite_record.organization_id = '00000000-0000-0000-0000-000000000001'
        );
        UPDATE tenant_invitations SET accepted_at = NOW() WHERE id = invite_record.id;
    ELSE
        -- New user without invitation - create profile without org
        INSERT INTO public.profiles (id, email, first_name, last_name, role, is_platform_user)
        VALUES (
            NEW.id,
            NEW.email,
            NEW.raw_user_meta_data->>'first_name',
            NEW.raw_user_meta_data->>'last_name',
            'estimator',
            FALSE
        );
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail user creation
    RAISE WARNING 'handle_new_user failed for user %: % %', NEW.id, SQLERRM, SQLSTATE;
    -- Still try to create a minimal profile
    BEGIN
        INSERT INTO public.profiles (id, email, role, is_platform_user)
        VALUES (NEW.id, NEW.email, 'estimator', FALSE)
        ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Minimal profile creation also failed: %', SQLERRM;
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify
DO $$
BEGIN
  RAISE NOTICE 'Updated handle_new_user trigger with better error handling';
END $$;
