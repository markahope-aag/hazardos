-- ============================================
-- Repair: same-org view policy on profiles
-- ============================================
-- Migration 20260303000007_fix_profiles_rls_hang added a "Users can view
-- profiles in same org" SELECT policy, but it's missing from the live DB
-- — the history table claims applied, the policy isn't there. Result:
-- only `id = auth.uid()` policies remain, so every user sees themselves
-- and the Team settings page can't list the rest of their organization.
--
-- This migration re-creates the same-org SELECT and the platform-admin
-- cross-org SELECT, using the pre-existing SECURITY DEFINER helpers
-- (get_user_organization_id, get_user_role). Those helpers bypass RLS
-- when reading profiles, so the policy doesn't recurse.

DROP POLICY IF EXISTS "profile_org_select" ON profiles;
CREATE POLICY "profile_org_select" ON profiles
  FOR SELECT
  USING (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "profile_platform_admin_select" ON profiles;
CREATE POLICY "profile_platform_admin_select" ON profiles
  FOR SELECT
  USING (get_user_role() IN ('platform_owner', 'platform_admin'));

-- RLS policies combine via OR — the existing id = auth.uid() policy
-- still lets a user see their own row if their profile doesn't have
-- an organization_id yet (e.g. mid-onboarding).
