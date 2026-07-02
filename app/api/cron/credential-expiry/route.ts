import { NextRequest, NextResponse } from 'next/server'
import { authorizeCronRequest } from '@/lib/utils/cron-auth'
import { processCredentialExpiry } from '@/lib/services/credential-expiry-service'
import { withCronLogging } from '@/lib/services/cron-runner'

// Vercel cron — daily. Finds worker credentials crossing expiry thresholds
// (30/14/7/0 days), de-dupes per bucket, and alerts org admins in-app + email.
// Authorization: Vercel-signed `x-vercel-cron` header or timing-safe CRON_SECRET.
export async function GET(request: NextRequest) {
  const unauthorized = await authorizeCronRequest(request)
  if (unauthorized) return unauthorized

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
