-- ============================================================================
-- SE17 / onboarding fix (root cause): INSERT ... RETURNING is blocked by the
-- organizations SELECT policy.
--
-- create_organization_for_onboarding did:
--     INSERT INTO organizations (...) RETURNING * INTO v_org;
--     UPDATE profiles SET organization_id = v_org.id ...;
--
-- RETURNING is governed by the table's SELECT (USING) policy, which is
-- `id = get_user_organization_id() OR platform admin`. At RETURNING time the
-- caller's profile.organization_id is still NULL (it's updated on the NEXT
-- line), so get_user_organization_id() returns NULL, the new row fails the
-- SELECT policy, and the whole statement errors with
-- "42501 new row violates row-level security policy for table organizations".
-- The prior migration's premise that RETURNING is governed only by WITH CHECK
-- was incorrect. Net effect: self-service onboarding — and creating a second,
-- independent organization — was impossible for anyone not provisioned via an
-- invite. Reproduced live end-to-end.
--
-- Fix: generate the id up front, INSERT WITHOUT RETURNING (only the INSERT
-- WITH CHECK applies), link the caller's profile to the new org, and only then
-- SELECT the row back — by which point the SELECT policy passes because the
-- profile is linked. Stays SECURITY INVOKER so RLS is fully enforced. The
-- existing-org guard (one org per user) is unchanged.
--
-- Also restores a sensible org INSERT policy (a diagnostic step had set it to
-- WITH CHECK (true)) and drops the throwaway diagnostic functions.
-- ============================================================================

DROP POLICY IF EXISTS "Allow organization creation with rate limit" ON organizations;
CREATE POLICY "Allow organization creation with rate limit" ON organizations
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND get_user_organization_id() IS NULL
  );

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
  v_org_id uuid := gen_random_uuid();
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

  -- INSERT without RETURNING: only the INSERT WITH CHECK is evaluated here,
  -- not the SELECT policy. (RETURNING would apply the SELECT policy, which the
  -- caller can't satisfy until their profile is linked below.)
  INSERT INTO organizations (
    id, name, email, phone, address, city, state, zip, license_number,
    status, subscription_tier
  ) VALUES (
    v_org_id,
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
  );

  -- Link the caller to the new org. Now get_user_organization_id() resolves to
  -- v_org_id for this caller, so the org is visible to the SELECT below.
  UPDATE profiles
  SET organization_id = v_org_id, role = 'tenant_owner'
  WHERE id = v_user_id;

  SELECT * INTO v_org FROM organizations WHERE id = v_org_id;
  RETURN v_org;
END;
$$;

REVOKE ALL ON FUNCTION public.create_organization_for_onboarding(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_organization_for_onboarding(jsonb) TO authenticated;

-- Clean up throwaway diagnostics from root-causing.
DROP FUNCTION IF EXISTS public._diag_org_policies();
DROP FUNCTION IF EXISTS public._diag_try_onboard();
DROP FUNCTION IF EXISTS public._diag2();
DROP FUNCTION IF EXISTS public._diag_full();
