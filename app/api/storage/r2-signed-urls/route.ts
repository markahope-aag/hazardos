import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/utils/api-handler'
import { ROLES } from '@/lib/auth/roles'
import { r2SignedUrlsPayloadSchema } from '@/lib/validations/photo-upload'
import { presignDownload } from '@/lib/storage/r2'

const ADMIN_ROLES = new Set([
  'platform_owner',
  'platform_admin',
  'tenant_owner',
  'admin',
])

/**
 * POST /api/storage/r2-signed-urls
 *
 * Batch-issues presigned R2 GET URLs for the gallery / report layer.
 *
 * Authorization model — every key is checked against the caller's
 * organization_id (the first segment of the R2 key, by convention).
 * That's enough for stamped derivatives, which any org member may
 * view. Originals (the `originals/` prefix) carry stricter access:
 * only tenant admins and platform admins can request signed URLs for
 * those, mirroring the Supabase Storage RLS policy on the legacy
 * originals path.
 *
 * Returns a map keyed by the requested key so the client doesn't have
 * to maintain order.
 */
export const POST = createApiHandler(
  {
    allowedRoles: ROLES.TENANT_FIELD,
    bodySchema: r2SignedUrlsPayloadSchema,
    rateLimit: 'general',
  },
  async (_request, context, body) => {
    const orgId = context.profile.organization_id
    const orgPrefix = `${orgId}/`
    const isAdmin = ADMIN_ROLES.has(context.profile.role)

    const result: Record<string, string> = {}
    const denied: string[] = []

    for (const key of body.keys) {
      // Cross-org access is always denied. The first path segment is
      // the org id by construction; reject anything that doesn't
      // start with the caller's org.
      if (!key.startsWith(orgPrefix)) {
        denied.push(key)
        continue
      }

      // Originals (the forensic image bytes under `{org}/originals/`)
      // are admin-only — they aren't intended for normal gallery view
      // and exist purely for legal export. Stamped derivatives and
      // videos are visible to any org member.
      const segment = key.slice(orgPrefix.length).split('/')[0]
      if (segment === 'originals' && !isAdmin) {
        denied.push(key)
        continue
      }

      result[key] = await presignDownload({
        key,
        expiresIn: body.expiresIn ?? 60 * 60 * 8,
        filename: body.forceDownload ? key.split('/').pop() : undefined,
      })
    }

    if (denied.length > 0) {
      context.log.warn(
        { denied: denied.length, sample: denied.slice(0, 3) },
        'R2 signed URL: some keys denied for caller',
      )
    }

    return NextResponse.json({ urls: result, denied })
  },
)
