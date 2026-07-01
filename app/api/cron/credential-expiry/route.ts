import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { applyUnifiedRateLimit } from '@/lib/middleware/unified-rate-limit'
import { processCredentialExpiry } from '@/lib/services/credential-expiry-service'
import { withCronLogging } from '@/lib/services/cron-runner'

// Vercel cron — daily. Finds worker credentials crossing expiry thresholds
// (30/14/7/0 days), de-dupes per bucket, and alerts org admins in-app + email.
// Authorization: Vercel-signed `x-vercel-cron` header or timing-safe CRON_SECRET.
export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyUnifiedRateLimit(request, 'auth')
  if (rateLimitResponse) return rateLimitResponse

  const vercelCronHeader = request.headers.get('x-vercel-cron')
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }

  let isAuthorized = false
  if (vercelCronHeader === '1') {
    isAuthorized = true
  } else if (authHeader) {
    const expected = Buffer.from(`Bearer ${cronSecret}`)
    const provided = Buffer.from(authHeader)
    isAuthorized = expected.length === provided.length && timingSafeEqual(expected, provided)
  }

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await withCronLogging('credential-expiry', async () => {
    const r = await processCredentialExpiry()
    return {
      summary: r,
      failureCount: r.failed,
    }
  })

  return NextResponse.json({
    scanned: result.summary?.scanned ?? 0,
    alerted: result.summary?.alerted ?? 0,
    failed: result.summary?.failed ?? 0,
    orgs: result.summary?.orgs ?? 0,
    run_id: result.run_id,
    status: result.status,
    timestamp: new Date().toISOString(),
  })
}
