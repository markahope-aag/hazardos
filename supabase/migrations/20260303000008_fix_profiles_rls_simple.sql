-- ============================================
-- Fix Profiles RLS - Remove ALL Recursive Policies
-- Only allow users to see their own profile (no org-based access for now)
-- ============================================

-- Drop ALL policies on profiles to start fresh
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Platform admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles in same org" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON profiles;
DROP POLICY IF EXISTS "Admins can manage profiles in their organization" ON profiles;
DROP POLICY IF EXISTS "Allow profile creation during onboarding" ON profiles;

-- Create simple non-recursive policy: users can only see their own profile
CREATE POLICY "profiles_select_own" ON profiles
    FOR SELECT USING (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "profiles_update_own" ON profiles
    FOR UPDATE USING (id = auth.uid());

-- Allow the trigger to insert profiles (runs as postgres, bypasses RLS)
-- But also allow authenticated users to insert their own profile as fallback
CREATE POLICY "profiles_insert_own" ON profiles
    FOR INSERT WITH CHECK (id = auth.uid());
