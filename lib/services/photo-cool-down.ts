/**
 * Cool-down policy: stamped photos are visible to the whole org for
 * the first N days after capture, then drop out of normal gallery
 * surfaces. They remain in storage and are still retrievable by
 * admins until the per-org retention window expires (defaults to
 * 3 years, see organizations.photo_retention_days).
 *
 * The cool-down threshold is intentionally NOT stored on the row.
 * With single-tier R2, "going cold" doesn't move any bytes; it's
 * purely a visibility decision. Computing it from created_at lets us
 * change the policy by deploying a number rather than a backfill.
 */
const COOL_DOWN_DAYS = 180 // 6 months

const ADMIN_ROLES = new Set([
  'platform_owner',
  'platform_admin',
  'tenant_owner',
  'admin',
])

/** Date a photo was captured falls outside the cool-down window. */
export function isPhotoCold(createdAt: string | Date | null | undefined): boolean {
  if (!createdAt) return false
  const created = createdAt instanceof Date ? createdAt : new Date(createdAt)
  if (Number.isNaN(created.getTime())) return false
  const ageMs = Date.now() - created.getTime()
  return ageMs > COOL_DOWN_DAYS * 86400 * 1000
}

/** Should this role bypass the cool-down filter and see cold photos? */
export function canViewColdPhotos(role: string | null | undefined): boolean {
  return Boolean(role) && ADMIN_ROLES.has(String(role))
}

/**
 * Filter a list of photos to those visible to the given role under
 * the cool-down policy. Admins see everything; everyone else only
 * sees photos within the 6-month window.
 */
export function filterByCoolDown<T extends { createdAt?: string | Date | null }>(
  photos: T[],
  role: string | null | undefined,
): T[] {
  if (canViewColdPhotos(role)) return photos
  return photos.filter((p) => !isPhotoCold(p.createdAt))
}

export const photoCoolDownConfig = {
  coolDownDays: COOL_DOWN_DAYS,
}
