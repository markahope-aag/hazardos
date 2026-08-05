-- Self-serve onboarding has been broken since 2026-07-22.
--
-- prevent_profile_privilege_escalation() blocks an account holder changing their
-- own role or organization_id. That is correct for every case but one: the
-- onboarding step, where a brand-new user legitimately claims the organisation
-- they just created and becomes its tenant_owner.
--
-- create_organization_for_onboarding() is SECURITY INVOKER on purpose (so the
-- "Allow organization creation with rate limit" INSERT policy still applies), so
-- its profile update runs as the user and the guard rejects it with
--   42501: profiles.role cannot be changed by the account holder
-- Signup therefore leaves a login with a profile and no organisation: the user
-- can authenticate and then see nothing, because get_user_organization_id()
-- returns NULL and every policy denies. Four accounts were found in production
-- in exactly that state, two of them a client's own staff.
--
-- The exemption is deliberately narrow. "Allow it when the user has no
-- organisation" would let anyone with no organisation set organization_id to an
-- EXISTING tenant and role to tenant_owner, taking over another customer's
-- account. So the claim is only permitted when the target organisation has no
-- other members.
--
-- The membership check lives in a SECURITY DEFINER helper. A first attempt did
-- the count inline, but the trigger is SECURITY INVOKER, so the count ran as the
-- calling user and was filtered by RLS: an outsider cannot see the victim's
-- profile, the count came back 0, and the exemption was granted. The trigger
-- itself cannot become DEFINER, because it tests current_user to recognise
-- trusted server contexts and under DEFINER that is always the owner, which
-- would stop it enforcing anything at all.

CREATE OR REPLACE FUNCTION public.organization_has_other_members(p_org uuid, p_except uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE organization_id = p_org
      AND id IS DISTINCT FROM p_except
  );
$function$;

REVOKE ALL ON FUNCTION public.organization_has_other_members(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.organization_has_other_members(uuid, uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.organization_has_other_members(uuid, uuid) IS
  'Whether an organisation has any member other than the given profile. SECURITY DEFINER so the onboarding guard sees real membership rather than an RLS-filtered view.';

CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  -- Trusted server context: no end-user JWT, or an explicitly privileged role.
  IF auth.uid() IS NULL
     OR current_user IN ('service_role', 'postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  -- Onboarding: a user with no organisation claiming an EMPTY one as its owner.
  IF OLD.organization_id IS NULL
     AND NEW.organization_id IS NOT NULL
     AND NEW.role = 'tenant_owner'
     AND NEW.is_platform_user IS NOT DISTINCT FROM OLD.is_platform_user
  THEN
    IF public.organization_has_other_members(NEW.organization_id, NEW.id) THEN
      RAISE EXCEPTION 'cannot join an existing organisation as its owner'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'profiles.role cannot be changed by the account holder'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
    RAISE EXCEPTION 'profiles.organization_id cannot be changed by the account holder'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.is_platform_user IS DISTINCT FROM OLD.is_platform_user THEN
    RAISE EXCEPTION 'profiles.is_platform_user cannot be changed by the account holder'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;
