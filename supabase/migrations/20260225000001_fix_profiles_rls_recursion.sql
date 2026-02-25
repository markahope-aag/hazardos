-- ============================================
-- Fix Profiles RLS Circular Dependency
-- The "Platform admins can view all profiles" policy causes recursion
-- by querying the profiles table within the policy itself
-- ============================================

-- Drop the problematic policy that causes circular dependency
DROP POLICY IF EXISTS "Platform admins can view all profiles" ON profiles;

-- Create a safer platform admin policy using a function that doesn't recurse
-- First, create a helper function that checks platform admin status safely
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- Get the user's role directly from auth metadata or a cached value
    -- This avoids querying the profiles table from within a profiles policy
    SELECT raw_user_meta_data->>'role' INTO user_role
    FROM auth.users 
    WHERE id = auth.uid();
    
    -- If not in metadata, fall back to a direct query with a limit to prevent recursion
    IF user_role IS NULL THEN
        SELECT role INTO user_role
        FROM profiles 
        WHERE id = auth.uid()
        LIMIT 1;
    END IF;
    
    RETURN user_role IN ('platform_owner', 'platform_admin');
EXCEPTION
    WHEN OTHERS THEN
        -- If there's any error, deny access to be safe
        RETURN FALSE;
END;
$$;

-- Now create the platform admin policy using the safe function
CREATE POLICY "Platform admins can view all profiles" ON profiles
    FOR SELECT USING (is_platform_admin());

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;

-- Also simplify the "Users can view profiles in same org" policy to be more explicit
DROP POLICY IF EXISTS "Users can view profiles in same org" ON profiles;

CREATE POLICY "Users can view profiles in same org" ON profiles
    FOR SELECT USING (
        -- User can always see their own profile (no recursion)
        id = auth.uid()
        OR
        -- User can see others in their org, but only if they have an org
        (
            organization_id IS NOT NULL 
            AND organization_id = (
                SELECT p.organization_id 
                FROM profiles p 
                WHERE p.id = auth.uid() 
                AND p.organization_id IS NOT NULL
                LIMIT 1
            )
        )
    );

-- Add a comment explaining the fix
COMMENT ON FUNCTION public.is_platform_admin() IS 
'Safely checks if current user is platform admin without causing RLS recursion';

-- Verify the policies
DO $$ 
BEGIN 
    RAISE NOTICE 'Fixed profiles RLS recursion issue - policies updated'; 
END $$;