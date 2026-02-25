'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { Profile, Organization } from '@/types/database'
import { logger, formatError } from '@/lib/utils/logger'

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
      logger.debug({ userId: currentUser.id }, 'Fetching profile for user')
      // Get user profile
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, phone, role, organization_id, is_active, is_platform_user, last_login_at, login_count, created_at, updated_at')
        .eq('id', currentUser.id)
        .single()

      logger.debug(
        { hasProfile: !!userProfile, errorCode: profileError?.code },
        'Profile fetch complete'
      )

      if (profileError) {
        // PGRST116 means no rows found - profile doesn't exist yet
        if (profileError.code === 'PGRST116') {
          logger.info('Profile not found for user, may need to be created')
        } else {
          logger.error(
            { error: formatError(profileError, 'PROFILE_FETCH_ERROR') },
            'Error fetching profile'
          )
        }
        return
      }

      if (!userProfile) {
        logger.warn('No profile data returned')
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
          logger.error(
            { error: formatError(orgError, 'ORGANIZATION_FETCH_ERROR') },
            'Error fetching organization'
          )
        } else {
          setOrganization(org)
        }
      }

      // Update last login (don't await, fire and forget)
      const updateLoginInfo = async () => {
        try {
          await supabase
            .from('profiles')
            .update({
              last_login_at: new Date().toISOString(),
              login_count: (userProfile.login_count || 0) + 1
            })
            .eq('id', currentUser.id)
        } catch (error) {
          logger.error(
            { error: formatError(error, 'LOGIN_COUNT_UPDATE_ERROR') },
            'Failed to update login count'
          )
        }
      }
      updateLoginInfo()

    } catch (error) {
      logger.error(
        { error: formatError(error, 'FETCH_PROFILE_ORG_ERROR') },
        'Error in fetchProfileAndOrg'
      )
    }
  }, [supabase])

  useEffect(() => {
    let mounted = true

    // Handle session changes
    const handleSession = async (session: Session | null) => {
      if (!mounted) return

      if (!session?.user) {
        logger.debug('No session, clearing state')
        setUser(null)
        setProfile(null)
        setOrganization(null)
        setLoading(false)
        return
      }

      logger.debug({ userEmail: session.user.email }, 'Session found for user')
      setUser(session.user)
      await fetchProfileAndOrg(session.user)
      if (mounted) {
        setLoading(false)
      }
    }

    // Initial session check - use getSession which reads from storage without network call
    const initAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      logger.debug(
        { hasSession: !!session, errorMessage: error?.message },
        'Initial getSession'
      )
      await handleSession(session)
    }

    initAuth()

    // Listen for auth changes - this handles login, logout, and token refresh
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      logger.debug(
        { event, userEmail: session?.user?.email },
        'onAuthStateChange'
      )

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
