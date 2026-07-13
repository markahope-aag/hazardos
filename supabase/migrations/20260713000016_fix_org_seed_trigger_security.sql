-- ============================================================================
-- SE17 / onboarding fix (part 2): org-seed triggers run as the invoking user.
--
-- Creating an organization fires several AFTER INSERT triggers that seed the
-- org's default child rows (AI settings, pipeline stages, credential types,
-- photo-retention recompute). These run inside the caller's transaction, and
-- at that moment the caller's profile.organization_id is still NULL — the
-- profile isn't linked to the new org until the next statement in
-- create_organization_for_onboarding.
--
-- Two of these seed functions were SECURITY INVOKER, so their INSERTs were
-- evaluated under the caller's RLS:
--   * create_org_ai_settings       -> organization_ai_settings
--       ("Org admins can manage AI settings" WITH CHECK requires
--        organization_id = get_user_organization_id() AND admin/tenant_owner)
--   * create_default_pipeline_stages -> pipeline_stages
--       ("Org access pipeline_stages" scoped to get_user_organization_id())
-- With the caller not yet linked, both checks fail and org creation aborts with
-- "new row violates row-level security policy" for the child table. The sibling
-- seed functions (create_default_credential_types,
-- recompute_survey_photo_expiry_for_org) were already SECURITY DEFINER, which
-- is why they didn't trip.
--
-- Fix: make the two remaining org-seed functions SECURITY DEFINER, consistent
-- with their siblings, so seeding the new org's defaults isn't gated on an org
-- membership that by definition can't exist yet. Both only insert rows keyed to
-- the NEW organization's own id, so there is no cross-tenant exposure. A pinned
-- search_path is set as standard hardening for SECURITY DEFINER functions.
-- ============================================================================

ALTER FUNCTION public.create_org_ai_settings() SECURITY DEFINER;
ALTER FUNCTION public.create_org_ai_settings() SET search_path = public;

ALTER FUNCTION public.create_default_pipeline_stages() SECURITY DEFINER;
ALTER FUNCTION public.create_default_pipeline_stages() SET search_path = public;

-- Remove the throwaway introspection helpers from root-causing.
DROP FUNCTION IF EXISTS public._se17_diag();
DROP FUNCTION IF EXISTS public._se17_diag2();
