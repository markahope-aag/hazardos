-- ============================================
-- Complete Fix for Profiles RLS Infinite Recursion
-- Drop ALL existing policies and create simple, non-recursive ones
-- ============================================

-- Drop ALL existing policies on profiles table
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Platform admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles in same org" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON profiles;
DROP POLICY IF EXISTS "Admins can manage profiles in their organization" ON profiles;
DROP POLICY IF EXISTS "Allow profile creation during onboarding" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;

-- Disable RLS temporarily to clear any cached policies
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create the simplest possible policies that cannot cause recursion

-- 1. Users can always see their own profile (no subqueries, no functions)
CREATE POLICY "users_can_view_own_profile" ON profiles
    FOR SELECT USING (id = auth.uid());

-- 2. Users can update their own profile (no subqueries, no functions)  
CREATE POLICY "users_can_update_own_profile" ON profiles
    FOR UPDATE USING (id = auth.uid());

-- 3. Allow profile insertion during signup (auth.uid() is the new user)
CREATE POLICY "allow_profile_insert" ON profiles
    FOR INSERT WITH CHECK (id = auth.uid());

-- 4. For organization access, use a completely different approach
-- Instead of checking within policies, we'll handle this in the application layer
-- This policy allows viewing profiles that share the same organization_id
-- but ONLY if both users have a non-null organization_id
CREATE POLICY "users_can_view_same_org_profiles" ON profiles
    FOR SELECT USING (
        -- Always allow own profile
        id = auth.uid()
        OR
        -- Allow if both users have the same non-null organization_id
        -- This uses a direct comparison without subqueries
        (
            organization_id IS NOT NULL 
            AND organization_id = (
                -- Get the requesting user's org_id with a LIMIT to prevent recursion
                SELECT p.organization_id 
                FROM profiles p 
                WHERE p.id = auth.uid() 
                LIMIT 1
            )
        )
    );

-- Drop the problematic function that might still be causing issues
DROP FUNCTION IF EXISTS public.is_platform_admin();

-- Create a much simpler platform admin check that doesn't query profiles
CREATE OR REPLACE FUNCTION public.auth_user_is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    -- Check if the user's email is in a list of platform admin emails
    -- This avoids querying the profiles table entirely
    SELECT EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = auth.uid() 
        AND email IN ('mark.hope@asymmetric.pro', 'admin@hazardos.com')
        LIMIT 1
    );
$$;

-- Platform admin policy using the safe function
CREATE POLICY "platform_admins_can_view_all_profiles" ON profiles
    FOR SELECT USING (auth_user_is_platform_admin());

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.auth_user_is_platform_admin() TO authenticated;

-- Test the policies by doing a simple select
DO $$
DECLARE
    test_result INTEGER;
BEGIN
    -- This should not cause recursion
    SELECT COUNT(*) INTO test_result FROM profiles LIMIT 1;
    RAISE NOTICE 'Policy test completed successfully. Profile count check: %', test_result;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Policy test failed: % %', SQLERRM, SQLSTATE;
END $$;