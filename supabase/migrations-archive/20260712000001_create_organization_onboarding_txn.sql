-- ============================================================================
-- Data integrity: atomic "create organization during onboarding"
--
-- app/onboard/page.tsx performed two separate client-side writes: INSERT the
-- organization (with .select().single() to read the new row back), then
-- UPDATE the caller's profile with organization_id + role. Two bugs:
--
--   1. Chicken-and-egg RLS: the organizations SELECT policy is
--      `id = get_user_organization_id() OR platform admin`, and
--      get_user_organization_id() reads profiles.organization_id for the
--      caller. Right after the INSERT, the caller's profile still has
--      organization_id = NULL, so the immediate .select().single() is
--      blocked by RLS and returns zero rows. supabase-js throws a
--      PostgrestError (not a native Error), so the UI's
--      `error instanceof Error` check falls through to the generic
--      "An error occurred during onboarding" toast, and the profile is
--      NEVER updated -- the org row still exists in the DB, orphaned with
--      no owner, blocking the user in onboarding limbo on every retry.
--   2. No transaction: if the profile UPDATE failed for any other reason,
--      the organization INSERT was never rolled back (unlike
--      /api/onboard/complete, which does this rollback manually).
--
-- This folds both writes into one transaction and returns the row via
-- INSERT ... RETURNING, which is governed only by the INSERT policy's WITH
-- CHECK, not a second SELECT -- sidestepping the RLS ordering problem
-- entirely. SECURITY INVOKER so RLS still applies: the INSERT still goes
-- through the existing "Allow organization creation with rate limit" policy
-- (allow_first_org_creation / can_create_organization), so the 1-org-per-user
-- limit is preserved.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_organization_for_onboarding(
  p_org jsonb
)
RETURNS organizations
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_existing_org_id uuid;
  v_org organizations;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT organization_id INTO v_existing_org_id
  FROM profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF v_existing_org_id IS NOT NULL THEN
    RAISE EXCEPTION 'User already belongs to an organization' USING ERRCODE = 'unique_violation';
  END IF;

  INSERT INTO organizations (
    name, email, phone, address, city, state, zip, license_number,
    status, subscription_tier
  ) VALUES (
    p_org->>'name',
    COALESCE(NULLIF(p_org->>'email', ''), NULL),
    NULLIF(p_org->>'phone', ''),
    NULLIF(p_org->>'address', ''),
    NULLIF(p_org->>'city', ''),
    NULLIF(p_org->>'state', ''),
    NULLIF(p_org->>'zip', ''),
    NULLIF(p_org->>'license_number', ''),
    'active',
    'trial'
  )
  RETURNING * INTO v_org;

  UPDATE profiles
  SET organization_id = v_org.id, role = 'tenant_owner'
  WHERE id = v_user_id;

  RETURN v_org;
END;
$$;

REVOKE ALL ON FUNCTION public.create_organization_for_onboarding(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_organization_for_onboarding(jsonb) TO authenticated;
