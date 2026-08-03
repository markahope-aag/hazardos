-- ============================================================================
-- Fix for 20260722000005: that migration broke signup for anyone without an
-- invitation — which is every self-serve signup. Caught by testing: creating a
-- user failed outright rather than falling through to the no-organization
-- branch.
--
-- Cause: `invite_record` is declared RECORD, and 20260722000005 made the
-- SELECT that populates it conditional on a token being present. In plpgsql,
-- reading a field from a RECORD that has never been assigned raises
-- "record is not assigned yet" — so `IF invite_record.id IS NOT NULL` threw
-- instead of evaluating false. The previous version always ran the SELECT, so
-- the record was always assigned (with NULLs on no match) and the guard
-- happened to be safe.
--
-- Fix: use scalar variables, which default to NULL and are safe to read
-- whether or not the SELECT ran. Behaviour is otherwise identical to
-- 20260722000005 — token-based matching, email cross-check, platform-role
-- clamp.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_first_name TEXT;
    v_last_name TEXT;
    v_email TEXT;
    v_token TEXT;
    v_invite_id UUID;
    v_invite_org UUID;
    v_invite_role user_role;
    v_role user_role;
BEGIN
    v_email := COALESCE(NEW.email, '');
    v_first_name := NEW.raw_user_meta_data->>'first_name';
    v_last_name := NEW.raw_user_meta_data->>'last_name';
    v_token := NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'invite_token', '')), '');

    -- Scalars, not a RECORD: these read as NULL when the SELECT is skipped.
    IF v_token IS NOT NULL THEN
        SELECT id, organization_id, role
        INTO v_invite_id, v_invite_org, v_invite_role
        FROM public.tenant_invitations
        WHERE token = v_token
          AND expires_at > NOW()
          AND accepted_at IS NULL
          AND lower(email) = lower(v_email)
        LIMIT 1;
    END IF;

    IF v_invite_id IS NOT NULL THEN
        v_role := v_invite_role;

        -- Never let an invitation confer platform access.
        IF v_role IN ('platform_owner', 'platform_admin') THEN
            RAISE WARNING 'invitation % carried privileged role %; downgraded to viewer',
                v_invite_id, v_invite_role;
            v_role := 'viewer'::user_role;
        END IF;

        INSERT INTO public.profiles (
            id, organization_id, email, first_name, last_name, role, is_platform_user
        ) VALUES (
            NEW.id,
            v_invite_org,
            v_email,
            v_first_name,
            v_last_name,
            v_role,
            (v_invite_org = '00000000-0000-0000-0000-000000000001')
        );

        UPDATE public.tenant_invitations
        SET accepted_at = NOW()
        WHERE id = v_invite_id;
    ELSE
        -- No usable invitation: profile with no organization. Onboarding
        -- assigns one when they create an org.
        INSERT INTO public.profiles (
            id, email, first_name, last_name, role, is_platform_user
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
