import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ROLES, type UserRole } from './roles'

/**
 * Require the caller's role to be in the given preset (or one of the
 * specific roles passed in). Used at the top of admin-only settings
 * pages so a non-admin can't bypass UI gating by hitting the URL
 * directly. If the check fails the user is redirected to the
 * appropriate fallback (login, onboarding, or /settings).
 *
 * Returns the authenticated context so the page can keep using it.
 *
 * Usage:
 *   const { profile, supabase } = await requireRoles(ROLES.TENANT_ADMIN)
 */
export async function requireRoles(allowed: readonly string[] | UserRole[]) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, organization_id, role, first_name, last_name, email')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) redirect('/onboard')
  if (!allowed.includes(profile.role)) redirect('/settings')

  return { user, profile, supabase }
}

/**
 * Convenience wrapper for the common "tenant admin only" case.
 */
export function requireTenantAdmin() {
  return requireRoles(ROLES.TENANT_ADMIN)
}
