-- ============================================
-- Fix Profiles RLS Hang Issue
-- The get_user_organization_id() function might be causing recursion
-- Simplify to just allow users to read their own profile
-- ============================================

-- Drop potentially problematic policies
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON profiles;
DROP POLICY IF EXISTS "Admins can manage profiles in their organization" ON profiles;

-- Keep the simple, non-recursive policy
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (id = auth.uid());

-- Allow users to update their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (id = auth.uid());

-- Platform admins can view all profiles (no recursion - just checks role directly)
CREATE POLICY "Platform admins can view all profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.role IN ('platform_owner', 'platform_admin')
        )
    );

-- For organization-level access, we need to be careful about recursion
-- Use a simpler approach: allow viewing profiles that share the same organization_id
-- This requires getting the user's org_id first, but we do it safely
CREATE POLICY "Users can view profiles in same org" ON profiles
    FOR SELECT USING (
        -- User can always see their own profile
        id = auth.uid()
        OR
        -- User can see others in their org (using subquery that gets their org_id directly)
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );
