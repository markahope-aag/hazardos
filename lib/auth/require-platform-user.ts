import { notFound } from 'next/navigation'
import { isPlatformUser } from '@/lib/auth/server-auth'

/**
 * Server-side guard for platform-only pages (db status, migration
 * verification, OpenAPI docs, etc.). Returns 404 to anyone who isn't
 * a platform owner/admin or marked as a platform user — no leaky
 * "Forbidden" message that confirms the route exists.
 *
 * Backed by React.cache() under the hood so co-rendered pages and
 * layouts share a single profile lookup per request.
 */
export async function requirePlatformUser(): Promise<void> {
  const ok = await isPlatformUser()
  if (!ok) notFound()
}
