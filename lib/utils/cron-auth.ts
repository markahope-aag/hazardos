import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { applyUnifiedRateLimit } from '@/lib/middleware/unified-rate-limit'

/**
 * Shared authorization gate for Vercel cron routes.
 *
 * Applies the `auth` rate limit, then authorizes the request via either the
 * Vercel-signed `x-vercel-cron` header or a timing-safe comparison against
 * `CRON_SECRET`. Both paths are accepted because Vercel's scheduler may send
 * either depending on project configuration — treating them uniformly avoids
 * the per-route drift that previously left one cron rejecting the header.
 *
 * Returns a `NextResponse` to short-circuit the handler:
 *  - 429 when rate-limited
 *  - 500 when `CRON_SECRET` is not configured
 *  - 401 when neither credential is valid
 *
 * Returns `null` when the request is authorized and the handler should proceed.
 */
export async function authorizeCronRequest(
  request: NextRequest,
): Promise<NextResponse | null> {
  const rateLimitResponse = await applyUnifiedRateLimit(request, 'auth')
  if (rateLimitResponse) return rateLimitResponse

  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }

  // Vercel signs this header into scheduler-originated requests.
  if (request.headers.get('x-vercel-cron') === '1') return null

  const authHeader = request.headers.get('authorization')
  if (authHeader) {
    const expected = Buffer.from(`Bearer ${cronSecret}`)
    const provided = Buffer.from(authHeader)
    if (expected.length === provided.length && timingSafeEqual(expected, provided)) {
      return null
    }
  }

  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
