import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { applyUnifiedRateLimit } from '@/lib/middleware/unified-rate-limit'
import { processDueReminders } from '@/lib/services/reminder-sender'
import { withCronLogging } from '@/lib/services/cron-runner'

// Vercel cron — hits this hourly. Authorization is a timing-safe compare
// on CRON_SECRET or the Vercel-signed `x-vercel-cron` header.
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
  const isAuthorized = expected.length === provided.length && timingSafeEqual(expected, provided)
  if (!isAuthorized && !request.headers.get('x-vercel-cron')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await withCronLogging('appointment-reminders', async () => {
    const r = await processDueReminders()
    // Treat any send failures as a yellow condition so the run log records it
    // and alerting kicks in; skipped (opted-out, no recipient) is normal.
    return {
      summary: r,
      failureCount: r.failed,
    }
  })

  return NextResponse.json({
    sent: result.summary?.sent ?? 0,
    failed: result.summary?.failed ?? 0,
    skipped: result.summary?.skipped ?? 0,
    run_id: result.run_id,
    status: result.status,
    timestamp: new Date().toISOString(),
  })
}
