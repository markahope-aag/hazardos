import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

/**
 * Per-request, deduplicated auth helpers for Server Components and
 * server-only call sites. React's `cache()` deduplicates these per
 * render so a layout, page, and component can each ask for the user
 * (or profile, or organization) without triggering separate
 * round-trips to Supabase.
 *
 * Use these everywhere you'd otherwise call
 *   const supabase = await createClient()
 *   const { data: { user } } = await supabase.auth.getUser()
 * inside a Server Component.
 *
 * Route handlers should keep using `createApiHandler` — `cache()`
 * only deduplicates within a single React render and isn't useful
 * outside RSC.
 */

export const getCurrentUser = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
})

export interface CurrentProfile {
  id: string
  organization_id: string | null
  role: string | null
  is_platform_user: boolean | null
  first_name: string | null
  last_name: string | null
  default_location_id: string | null
}

export const getCurrentProfile = cache(async (): Promise<CurrentProfile | null> => {
  const user = await getCurrentUser()
  if (!user) return null

  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select(
      'id, organization_id, role, is_platform_user, first_name, last_name, default_location_id',
    )
    .eq('id', user.id)
    .maybeSingle()

  return data as CurrentProfile | null
})

export const getCurrentOrganizationId = cache(async (): Promise<string | null> => {
  const profile = await getCurrentProfile()
  return profile?.organization_id ?? null
})

export const isPlatformUser = cache(async (): Promise<boolean> => {
  const profile = await getCurrentProfile()
  if (!profile) return false
  return (
    profile.is_platform_user === true ||
    profile.role === 'platform_owner' ||
    profile.role === 'platform_admin'
  )
})
