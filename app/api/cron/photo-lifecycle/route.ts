import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { applyUnifiedRateLimit } from '@/lib/middleware/unified-rate-limit'
import { withCronLogging } from '@/lib/services/cron-runner'
import { expirePhotos } from '@/lib/services/photo-lifecycle'

/**
 * GET /api/cron/photo-lifecycle
 *
 * Hit by Vercel cron once per day. Hard-deletes survey photos whose
 * `expires_at` has passed (3 years past upload by default; configurable
 * per-org via `organizations.photo_retention_days`).
 *
 * "Cold" status (the 6-month visibility cutoff) is computed at read
 * time from `created_at` rather than maintained as a stored flag —
 * single-tier R2 means there's no bytes-movement work for the
 * cool-down transition, only access policy that the gallery
 * enforces. So this cron only handles permanent deletion.
 *
 * Auth: standard Vercel cron pattern — Bearer of CRON_SECRET, or the
 * `x-vercel-cron` header that Vercel signs into the request when the
 * call originates from its scheduler.
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyUnifiedRateLimit(request, 'auth')
  if (rateLimitResponse) return rateLimitResponse

  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'Cron not configured' }, { status: 500 })
  }
  const expected = Buffer.from(`Bearer ${cronSecret}`)
  const provided = Buffer.from(authHeader || '')
  const isAuthorized =
    expected.length === provided.length && timingSafeEqual(expected, provided)
  if (!isAuthorized && !request.headers.get('x-vercel-cron')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await withCronLogging('photo-lifecycle', async () => {
    const r = await expirePhotos()
    return {
      summary: {
        scanned: r.scanned,
        deleted: r.deleted,
        failed: r.failed,
        sample_failures: r.failures.slice(0, 5),
      },
      failureCount: r.failed,
    }
  })

  return NextResponse.json({
    run_id: result.run_id,
    status: result.status,
    ...result.summary,
  })
}
