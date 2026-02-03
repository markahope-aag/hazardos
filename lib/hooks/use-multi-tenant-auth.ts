'use client'

import { useEffect, useState, useMemo } from 'react'
import { User } from '@supabase/supabase-js'
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

  useEffect(() => {
    let mounted = true

    async function fetchUserData() {
      try {
        // Get current user
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        
        if (!mounted) return
        
        if (!currentUser) {
          setUser(null)
          setProfile(null)
          setOrganization(null)
          setLoading(false)
          return
        }

        setUser(currentUser)

        // Get user profile
        const { data: userProfile, error: profileError } = await supabase
          .from('profiles')
          .select('id, email, first_name, last_name, phone, role, organization_id, is_active, is_platform_user, avatar_url, last_login_at, login_count, created_at, updated_at')
          .eq('id', currentUser.id)
          .single()

        if (!mounted) return

        if (profileError) {
          console.error('Error fetching profile:', profileError)
          setLoading(false)
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

          if (!mounted) return

          if (orgError) {
            console.error('Error fetching organization:', orgError)
          } else {
            setOrganization(org)
          }
        }

        // Update last login
        await supabase
          .from('profiles')
          .update({ 
            last_login_at: new Date().toISOString(),
            login_count: (userProfile.login_count || 0) + 1
          })
          .eq('id', currentUser.id)

      } catch (error) {
        console.error('Error in fetchUserData:', error)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchUserData()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      
      if (event === 'SIGNED_OUT' || !session?.user) {
        setUser(null)
        setProfile(null)
        setOrganization(null)
        setLoading(false)
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Refetch user data
        fetchUserData()
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase])

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