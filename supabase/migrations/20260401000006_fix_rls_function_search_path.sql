-- ============================================================================
-- FIX: Restore search_path on RLS helper functions
--
-- Migration 20260401000003 set search_path = '' on all public functions,
-- but get_user_organization_id(), get_user_role(), and is_platform_user()
-- reference the 'profiles' table without schema qualification. With an empty
-- search_path, these functions fail with "relation profiles does not exist",
-- which breaks ALL organization-scoped RLS policies.
--
-- Fix: Recreate these functions with SET search_path = public.
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID AS $$
DECLARE
    org_id UUID;
BEGIN
    SELECT organization_id INTO org_id FROM public.profiles WHERE id = auth.uid();
    RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
    RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION is_platform_user()
RETURNS BOOLEAN AS $$
DECLARE
    is_platform BOOLEAN;
BEGIN
    SELECT COALESCE(p.is_platform_user, false) INTO is_platform
    FROM public.profiles p WHERE p.id = auth.uid();
    RETURN COALESCE(is_platform, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
