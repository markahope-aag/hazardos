'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { Profile, Organization } from '@/types/database'

interface MultiTenantAuthState {
  user: User | null
  profile: Profile | null
  organization: Organization | null
  loading: boolean
  isPlatformUser: boolean
  canAccessPlatformAdmin: boolean
  canAccessTenantAdmin: boolean
}

export function useMultiTenantAuth(): MultiTenantAuthState {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  // Memoize the client to prevent recreation on every render
  const supabase = useMemo(() => createClient(), [])

  const fetchProfileAndOrg = useCallback(async (currentUser: User) => {
    try {
      console.log('[Auth] Fetching profile for user:', currentUser.id)
      // Get user profile
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, phone, role, organization_id, is_active, is_platform_user, avatar_url, last_login_at, login_count, created_at, updated_at')
        .eq('id', currentUser.id)
        .single()

      console.log('[Auth] Profile fetch complete:', { hasProfile: !!userProfile, error: profileError?.code })

      if (profileError) {
        // PGRST116 means no rows found - profile doesn't exist yet
        if (profileError.code === 'PGRST116') {
          console.log('[Auth] Profile not found for user, may need to be created')
        } else {
          console.error('[Auth] Error fetching profile:', profileError.code, profileError.message)
        }
        return
      }

      if (!userProfile) {
        console.log('[Auth] No profile data returned')
        return
      }

      setProfile(userProfile)

      // Get organization if user belongs to one
      if (userProfile.organization_id) {
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', userProfile.organization_id)
          .single()

        if (orgError) {
          console.error('[Auth] Error fetching organization:', orgError)
        } else {
          setOrganization(org)
        }
      }

      // Update last login (don't await, fire and forget)
      supabase
        .from('profiles')
        .update({
          last_login_at: new Date().toISOString(),
          login_count: (userProfile.login_count || 0) + 1
        })
        .eq('id', currentUser.id)
        .then(() => {})
        .catch(() => {})

    } catch (error) {
      console.error('[Auth] Error in fetchProfileAndOrg:', error)
    }
  }, [supabase])

  useEffect(() => {
    let mounted = true

    // Handle session changes
    const handleSession = async (session: Session | null) => {
      if (!mounted) return

      if (!session?.user) {
        console.log('[Auth] No session, clearing state')
        setUser(null)
        setProfile(null)
        setOrganization(null)
        setLoading(false)
        return
      }

      console.log('[Auth] Session found for:', session.user.email)
      setUser(session.user)
      await fetchProfileAndOrg(session.user)
      if (mounted) {
        setLoading(false)
      }
    }

    // Initial session check - use getSession which reads from storage without network call
    const initAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      console.log('[Auth] Initial getSession:', { hasSession: !!session, error: error?.message })
      await handleSession(session)
    }

    initAuth()

    // Listen for auth changes - this handles login, logout, and token refresh
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] onAuthStateChange:', event, session?.user?.email)

      if (!mounted) return

      // INITIAL_SESSION is fired on first load, we've already handled it above
      if (event === 'INITIAL_SESSION') {
        return
      }

      await handleSession(session)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase, fetchProfileAndOrg])

  const isPlatformUser = profile?.is_platform_user ?? false
  const canAccessPlatformAdmin = isPlatformUser && ['platform_owner', 'platform_admin'].includes(profile?.role || '')
  const canAccessTenantAdmin = Boolean(profile?.role && ['platform_owner', 'platform_admin', 'tenant_owner', 'admin'].includes(profile.role))

  return {
    user,
    profile,
    organization,
    loading,
    isPlatformUser,
    canAccessPlatformAdmin,
    canAccessTenantAdmin
  }
}

// Helper function to check if user has specific permission
export function usePermissions() {
  const auth = useMultiTenantAuth()

  const hasRole = (roles: string | string[]) => {
    if (!auth.profile) return false
    const roleArray = Array.isArray(roles) ? roles : [roles]
    return roleArray.includes(auth.profile.role)
  }

  const canManageTenant = () => {
    return hasRole(['platform_owner', 'platform_admin', 'tenant_owner', 'admin'])
  }

  const canCreateAssessments = () => {
    return hasRole(['platform_owner', 'platform_admin', 'tenant_owner', 'admin', 'estimator'])
  }

  const canViewReports = () => {
    return hasRole(['platform_owner', 'platform_admin', 'tenant_owner', 'admin', 'estimator', 'technician'])
  }

  const isPlatformOwner = () => {
    return hasRole('platform_owner')
  }

  return {
    hasRole,
    canManageTenant,
    canCreateAssessments,
    canViewReports,
    isPlatformOwner,
    ...auth
  }
}
