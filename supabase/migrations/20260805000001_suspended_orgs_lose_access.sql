-- Make organizations.status actually mean something.
--
-- The column has accepted 'suspended' and 'cancelled' since the initial schema,
-- but nothing read it: no RLS policy, no query, no UI. Setting an org to
-- 'cancelled' changed nothing at all — its users carried on working. So there
-- was no way to freeze an account short of deleting it, which is irreversible.
--
-- Nearly every RLS policy in the schema is written as
--   organization_id = get_user_organization_id()
-- so gating that one function gates reads AND writes everywhere at once, rather
-- than editing 350-odd policies and hoping none were missed.
--
-- Platform staff are unaffected: their policies test profiles.role directly
-- (e.g. "Platform owners can access all customers") and never call this.
--
-- Safe for existing data: every organisation is 'active' or 'trial' today, so
-- this changes nobody's access until someone deliberately suspends an org.

CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    org_id UUID;
BEGIN
    SELECT p.organization_id INTO org_id
    FROM public.profiles p
    JOIN public.organizations o ON o.id = p.organization_id
    WHERE p.id = auth.uid()
      AND o.status IN ('active', 'trial');

    -- NULL for a suspended/cancelled org, and for a profile with no org yet
    -- (mid-onboarding) — both already meant "no access" to every caller.
    RETURN org_id;
END;
$function$;

COMMENT ON FUNCTION public.get_user_organization_id() IS
  'Returns the caller''s organization_id, or NULL if they have none or their organisation is suspended/cancelled. Used by nearly every RLS policy, so suspending an organisation revokes its data access immediately.';
