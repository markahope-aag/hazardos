-- ============================================
-- Recreate handle_new_user with more defensive code
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    invite_record RECORD;
    v_first_name TEXT;
    v_last_name TEXT;
    v_email TEXT;
BEGIN
    -- Safely extract values with null handling
    v_email := COALESCE(NEW.email, '');
    v_first_name := NEW.raw_user_meta_data->>'first_name';
    v_last_name := NEW.raw_user_meta_data->>'last_name';

    -- Look for pending invitation
    SELECT id, organization_id, role
    INTO invite_record
    FROM public.tenant_invitations
    WHERE email = v_email
      AND expires_at > NOW()
      AND accepted_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1;

    IF invite_record.id IS NOT NULL THEN
        -- User has an invitation - join that org
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
            v_email,
            v_first_name,
            v_last_name,
            invite_record.role,
            (invite_record.organization_id = '00000000-0000-0000-0000-000000000001')
        );

        UPDATE public.tenant_invitations
        SET accepted_at = NOW()
        WHERE id = invite_record.id;
    ELSE
        -- New user without invitation - create profile without org
        INSERT INTO public.profiles (
            id,
            email,
            first_name,
            last_name,
            role,
            is_platform_user
        ) VALUES (
            NEW.id,
            v_email,
            v_first_name,
            v_last_name,
            'estimator'::user_role,
            FALSE
        );
    END IF;

    RETURN NEW;
END;
$$;

-- Ensure the trigger is properly set up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;

-- Verify
DO $$ BEGIN RAISE NOTICE 'Recreated handle_new_user trigger with defensive code'; END $$;
