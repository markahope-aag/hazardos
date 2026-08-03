-- ============================================
-- Fix ONLY Profiles Table RLS - Leave Other Tables Alone
-- ============================================

-- Drop ALL policies on profiles table only
DROP POLICY IF EXISTS "users_can_view_own_profile" ON profiles;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON profiles;
DROP POLICY IF EXISTS "allow_profile_insert" ON profiles;
DROP POLICY IF EXISTS "users_can_view_same_org_profiles" ON profiles;
DROP POLICY IF EXISTS "platform_admins_can_view_all_profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Platform admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles in same org" ON profiles;

-- Drop only the functions that are specific to profiles
DROP FUNCTION IF EXISTS public.is_platform_admin();
DROP FUNCTION IF EXISTS public.auth_user_is_platform_admin();

-- Temporarily disable and re-enable RLS to clear any cached policies
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create the simplest possible policies
CREATE POLICY "profile_own_select" ON profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "profile_own_update" ON profiles  
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "profile_own_insert" ON profiles
    FOR INSERT WITH CHECK (id = auth.uid());

-- Test the fix
DO $$
BEGIN
    RAISE NOTICE 'Profiles-only RLS fix applied successfully';
END $$;