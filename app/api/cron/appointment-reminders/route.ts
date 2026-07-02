import { NextRequest, NextResponse } from 'next/server'
import { authorizeCronRequest } from '@/lib/utils/cron-auth'
import { processDueReminders } from '@/lib/services/reminder-sender'
import { withCronLogging } from '@/lib/services/cron-runner'

// Vercel cron — hits this hourly. Authorization is a timing-safe compare
// on CRON_SECRET or the Vercel-signed `x-vercel-cron` header.
export async function GET(request: NextRequest) {
  const unauthorized = await authorizeCronRequest(request)
  if (unauthorized) return unauthorized

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
