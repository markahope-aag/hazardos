-- ============================================================================
-- SEC26 — the second half of the privilege-escalation class closed by SEC23.
--
-- SEC23 stopped a user rewriting their own profiles.role. This closes the
-- route that reaches the same end state one step further round.
--
-- Two defects, both in the invitation path:
--
-- 1. ROLE ESCALATION TO PLATFORM
--    tenant_invitations.role is `user_role NOT NULL` with no CHECK, and the
--    RLS policy "Users can manage invitations for their organization" is
--    cmd=ALL, so any admin/tenant_owner can INSERT a row directly through
--    PostgREST with role='platform_owner'. handle_new_user() then copies
--    invite_record.role verbatim into profiles.role. The z.enum guard in
--    app/api/invitations/route.ts is application-side only and PostgREST is
--    reachable with the public anon key, so the database enforced nothing.
--    A tenant admin invites a burner address as platform_owner, accepts it,
--    and owns every organization.
--
-- 2. CROSS-TENANT INVITATION INTERCEPTION
--    The invitation lookup was:
--      WHERE email = v_email AND expires_at > NOW() AND accepted_at IS NULL
--      ORDER BY created_at DESC LIMIT 1
--    No token, no organization constraint, newest wins — despite
--    tenant_invitations.token existing, being NOT NULL and unique, and
--    already being delivered to the signup form, which passes it through as
--    raw_user_meta_data.invite_token (components/auth/signup-form.tsx:75).
--    Org A invites ops@customer.com; anyone able to create an invitation at
--    org B for the same address later wins the race, and the victim clicks
--    org A's link but lands in org B with org B's role.
--
-- Fix: constrain the column to the four roles the API actually issues, and
-- make the trigger match on the token it was already being given.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. The database now enforces what the API always claimed.
--    Existing data uses only these four values (14 admin, 3 technician,
--    1 viewer, 1 estimator; zero tenant_owner or platform rows), so this
--    matches both the API contract in app/api/invitations/route.ts:9 and
--    everything already stored. tenant_owner is excluded deliberately: it is
--    assigned by onboarding when someone creates an organization, never by
--    invitation, so allowing it here would only enable an admin to escalate
--    above their own level.
-- ---------------------------------------------------------------------------
ALTER TABLE tenant_invitations
  DROP CONSTRAINT IF EXISTS tenant_invitations_role_not_privileged;

ALTER TABLE tenant_invitations
  ADD CONSTRAINT tenant_invitations_role_not_privileged
  CHECK (role IN ('admin', 'estimator', 'technician', 'viewer'));


-- ---------------------------------------------------------------------------
-- 2. Match the invitation by its token.
--
--    The token is the capability: it is unique, unguessable, and delivered
--    only to the invited address. Requiring it makes interception impossible
--    without possession of the link, and email is still checked so a leaked
--    token cannot be redeemed by a different address.
--
--    Signing up without a token now yields a profile with no organization —
--    the same outcome as an uninvited signup, which the onboarding flow
--    already handles. That is a deliberate behaviour change: the previous
--    email-only fallback IS the vulnerability, and every legitimate invite
--    arrives with ?invite=<token> in the URL.
--
--    The role clamp is belt-and-braces. The CHECK above should make a
--    platform role unstorable, but this function is SECURITY DEFINER and
--    writes profiles.role directly, so it refuses to propagate one even if
--    the constraint is ever dropped.
-- ---------------------------------------------------------------------------
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
    v_token TEXT;
    v_role user_role;
BEGIN
    v_email := COALESCE(NEW.email, '');
    v_first_name := NEW.raw_user_meta_data->>'first_name';
    v_last_name := NEW.raw_user_meta_data->>'last_name';
    v_token := NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'invite_token', '')), '');

    IF v_token IS NOT NULL THEN
        SELECT id, organization_id, role
        INTO invite_record
        FROM public.tenant_invitations
        WHERE token = v_token
          AND expires_at > NOW()
          AND accepted_at IS NULL
          AND lower(email) = lower(v_email)
        LIMIT 1;
    END IF;

    IF invite_record.id IS NOT NULL THEN
        v_role := invite_record.role;

        -- Never let an invitation confer platform access.
        IF v_role IN ('platform_owner', 'platform_admin') THEN
            v_role := 'viewer'::user_role;
            RAISE WARNING 'invitation % carried privileged role %; downgraded to viewer',
                invite_record.id, invite_record.role;
        END IF;

        INSERT INTO public.profiles (
            id, organization_id, email, first_name, last_name, role, is_platform_user
        ) VALUES (
            NEW.id,
            invite_record.organization_id,
            v_email,
            v_first_name,
            v_last_name,
            v_role,
            (invite_record.organization_id = '00000000-0000-0000-0000-000000000001')
        );

        UPDATE public.tenant_invitations
        SET accepted_at = NOW()
        WHERE id = invite_record.id;
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
