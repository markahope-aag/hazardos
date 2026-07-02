import { NextRequest, NextResponse } from 'next/server'
import { authorizeCronRequest } from '@/lib/utils/cron-auth'
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
  const unauthorized = await authorizeCronRequest(request)
  if (unauthorized) return unauthorized

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
