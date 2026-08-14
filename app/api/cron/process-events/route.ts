import { NextRequest, NextResponse } from 'next/server'
import { authorizeCronRequest } from '@/lib/utils/cron-auth'
import { withCronLogging } from '@/lib/services/cron-runner'
import { processQueuedEvents } from '@/lib/services/process-event-drain'

/**
 * Turns queued events into work.
 *
 * Database triggers record what happened; this decides what it means. The split
 * exists because the due-date arithmetic and rule matching are tested
 * TypeScript, and because no write path should be able to bypass the recording
 * half.
 *
 * Runs every ten minutes. Chains are measured in days, so that is well inside
 * the useful window, and it bounds how stale a step due "immediately" can be.
 */
export async function GET(request: NextRequest) {
  const unauthorized = await authorizeCronRequest(request)
  if (unauthorized) return unauthorized

  const result = await withCronLogging('process-events', async () => {
    const r = await processQueuedEvents()
    return {
      summary: r,
      // Surfaces as a yellow run rather than a silent success, so a chain that
      // cannot fire shows up in the run log instead of only in error logs.
      failureCount: r.failed,
    }
  })

  return NextResponse.json({
    processed: result.summary?.processed ?? 0,
    failed: result.summary?.failed ?? 0,
    work_created: result.summary?.workCreated ?? 0,
    run_id: result.run_id,
    status: result.status,
    timestamp: new Date().toISOString(),
  })
}
