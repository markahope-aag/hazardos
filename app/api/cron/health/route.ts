import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Public health endpoint for external monitors (Uptime Kuma etc.).
// Returns 200 when everything is green, 503 when any registered cron has a
// recent problem. Always returns a JSON body that describes the state so a
// human hitting it in a browser gets useful information.
//
// hazardos/allow-unauthenticated: Uptime Kuma probes need to reach this
// without a secret, and the response carries only cron names and last-run
// timestamps — nothing org-scoped. If that changes, protect with
// CRON_SECRET like the other cron routes.

interface CronStatus {
  cron_name: string
  sla_minutes: number
  last_status: string | null
  last_started_at: string | null
  last_finished_at: string | null
  last_failure_count: number | null
  last_error: string | null
  healthy: boolean
}

// Each entry declares: the cron name, and the longest tolerable gap in
// minutes between successful runs. appointment-reminders runs hourly on
// Vercel, so 75min gives a little grace for network jitter.
const MONITORED_CRONS: Array<{ cron_name: string; sla_minutes: number }> = [
  { cron_name: 'appointment-reminders', sla_minutes: 75 },
]

export async function GET(_request: NextRequest) {
  const supabase = await createClient()
  const now = new Date()

  const statuses: CronStatus[] = []

  for (const cron of MONITORED_CRONS) {
    const { data: lastRun } = await supabase
      .from('cron_runs')
      .select('status, started_at, finished_at, failure_count, error_message')
      .eq('cron_name', cron.cron_name)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const { data: lastOk } = await supabase
      .from('cron_runs')
      .select('started_at')
      .eq('cron_name', cron.cron_name)
      .eq('status', 'ok')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const lastOkAt = lastOk?.started_at ? new Date(lastOk.started_at) : null
    const withinSla = lastOkAt
      ? now.getTime() - lastOkAt.getTime() <= cron.sla_minutes * 60 * 1000
      : false

    const lastBad = lastRun?.status === 'failed' || lastRun?.status === 'partial'

    statuses.push({
      cron_name: cron.cron_name,
      sla_minutes: cron.sla_minutes,
      last_status: lastRun?.status ?? null,
      last_started_at: lastRun?.started_at ?? null,
      last_finished_at: lastRun?.finished_at ?? null,
      last_failure_count: lastRun?.failure_count ?? null,
      last_error: lastRun?.error_message ?? null,
      healthy: withinSla && !lastBad,
    })
  }

  // Stuck reminders: pending rows that are more than an hour past due.
  // If the cron is happy but rows are accumulating anyway, that's a
  // second-order failure mode worth surfacing.
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString()
  const { count: stuckReminders } = await supabase
    .from('scheduled_reminders')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')
    .lte('scheduled_for', oneHourAgo)

  const stuck = stuckReminders ?? 0
  const allHealthy = statuses.every((s) => s.healthy) && stuck === 0

  return NextResponse.json(
    {
      healthy: allHealthy,
      checked_at: now.toISOString(),
      crons: statuses,
      stuck_reminders: stuck,
    },
    { status: allHealthy ? 200 : 503 },
  )
}
