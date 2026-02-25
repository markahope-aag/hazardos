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
  const supabase = useMemo(() => createClient(), [])

  // Fetch profile and org using the access token directly (no re-entrant getSession calls)
  const fetchProfileAndOrg = useCallback(async (currentUser: User, accessToken: string) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    const headers = {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/vnd.pgrst.object+json',
      'Content-Type': 'application/json',
    }

    try {
      // Fetch profile
      const profileResp = await fetch(
        `${supabaseUrl}/rest/v1/profiles?select=id,email,first_name,last_name,phone,role,organization_id,is_active,is_platform_user,last_login_at,login_count,created_at,updated_at&id=eq.${currentUser.id}`,
        { headers }
      )

      if (!profileResp.ok) {
        console.error('[AUTH] Profile fetch failed:', profileResp.status)
        return
      }

      const userProfile = await profileResp.json()
      if (!userProfile?.id) return

      setProfile(userProfile)

      // Fetch organization if user belongs to one
      if (userProfile.organization_id) {
        const orgResp = await fetch(
          `${supabaseUrl}/rest/v1/organizations?select=*&id=eq.${userProfile.organization_id}`,
          { headers }
        )
        if (orgResp.ok) {
          const org = await orgResp.json()
          if (org?.id) setOrganization(org)
        }
      }

      // Update last login (fire and forget)
      fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${currentUser.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          last_login_at: new Date().toISOString(),
          login_count: (userProfile.login_count || 0) + 1
        })
      }).catch(() => {})
    } catch (error) {
      console.error('[AUTH] fetchProfileAndOrg error:', error)
    }
  }, [])

  useEffect(() => {
    let mounted = true

    const handleSession = async (session: Session | null) => {
      if (!mounted) return

      if (!session?.user) {
        setUser(null)
        setProfile(null)
        setOrganization(null)
        setLoading(false)
        return
      }

      setUser(session.user)

      // Pass the access token directly to avoid re-entrant getSession deadlock
      await fetchProfileAndOrg(session.user, session.access_token)

      if (mounted) setLoading(false)
    }

    // Use setTimeout(0) to break out of any internal Supabase auth lock chain
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      // Break the async chain before making data calls
      setTimeout(() => {
        if (mounted) handleSession(session)
      }, 0)
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      if (event === 'INITIAL_SESSION') return
      // Break the async chain for auth state changes too
      setTimeout(() => {
        if (mounted) handleSession(session)
      }, 0)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase, fetchProfileAndOrg])

  const isPlatformUser = profile?.is_platform_user ?? false
  const canAccessPlatformAdmin = isPlatformUser && ['platform_owner', 'platform_admin'].includes(profile?.role || '')
  const canAccessTenantAdmin = Boolean(profile?.role && ['platform_owner', 'platform_admin', 'tenant_owner', 'admin'].includes(profile.role))

  return { user, profile, organization, loading, isPlatformUser, canAccessPlatformAdmin, canAccessTenantAdmin }
}

// Helper function to check if user has specific permission
export function usePermissions() {
  const auth = useMultiTenantAuth()

  const hasRole = (roles: string | string[]) => {
    if (!auth.profile) return false
    const roleArray = Array.isArray(roles) ? roles : [roles]
    return roleArray.includes(auth.profile.role)
  }

  const canManageTenant = () => hasRole(['platform_owner', 'platform_admin', 'tenant_owner', 'admin'])
  const canCreateAssessments = () => hasRole(['platform_owner', 'platform_admin', 'tenant_owner', 'admin', 'estimator'])
  const canViewReports = () => hasRole(['platform_owner', 'platform_admin', 'tenant_owner', 'admin', 'estimator', 'technician'])
  const isPlatformOwner = () => hasRole('platform_owner')

  return { hasRole, canManageTenant, canCreateAssessments, canViewReports, isPlatformOwner, ...auth }
}
