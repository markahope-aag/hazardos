import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Server-side guard for platform-only pages (db status, migration
 * verification, OpenAPI docs, etc.). Returns 404 to anyone who isn't
 * a platform owner/admin or marked as a platform user — no leaky
 * "Forbidden" message that confirms the route exists.
 */
export async function requirePlatformUser(): Promise<void> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_platform_user')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) notFound()

  const isPlatform =
    profile.is_platform_user === true ||
    profile.role === 'platform_owner' ||
    profile.role === 'platform_admin'

  if (!isPlatform) notFound()
}
