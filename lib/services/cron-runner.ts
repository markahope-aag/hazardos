import { createClient } from '@/lib/supabase/server'
import { createServiceLogger, formatError } from '@/lib/utils/logger'

const log = createServiceLogger('cron-runner')

export interface CronResult {
  // Whatever structured payload the cron wants to persist on the run row.
  summary?: Record<string, unknown>
  // Number of items inside the cron that failed (e.g., reminders that
  // couldn't be delivered). Non-zero triggers a 'partial' status and
  // operator alerting.
  failureCount?: number
}

export interface CronRunRecord {
  run_id: string | null
  status: 'ok' | 'failed' | 'partial'
  summary?: Record<string, unknown>
}

// Wraps a cron's work with durable logging + alerting. Every invocation
// writes a row to cron_runs — starting as 'running', flipped to 'ok',
// 'partial', or 'failed' when the work completes.
//
// If the work throws OR returns a non-zero failureCount, an alert is raised
// so the team doesn't find out about broken notifications the hard way.
//
// The wrapper never swallows exceptions: if the cron itself rethrows here
// it's because the work couldn't complete. The HTTP handler catches and
// surfaces it — we want the cron-platform (Vercel) to see non-2xx so its
// own retry / alerting picks it up as a second line of defense.
export async function withCronLogging<T extends CronResult>(
  cronName: string,
  work: () => Promise<T>,
): Promise<CronRunRecord> {
  const supabase = await createClient()
  const startedAt = Date.now()

  const { data: runRow, error: insertErr } = await supabase
    .from('cron_runs')
    .insert({ cron_name: cronName, status: 'running' })
    .select('id')
    .single()

  const runId = runRow?.id ?? null
  if (insertErr) {
    // Failed to even create the log row. Record the problem so it shows up
    // somewhere before we run — but don't skip the work; the cron doing
    // its job is more important than the audit trail.
    log.error(
      { cronName, err: formatError(insertErr) },
      'failed to insert cron_runs row; proceeding without durable log',
    )
  }

  try {
    const result = await work()
    const durationMs = Date.now() - startedAt
    const failureCount = result.failureCount ?? 0
    const status: 'ok' | 'partial' = failureCount > 0 ? 'partial' : 'ok'

    if (runId) {
      await supabase
        .from('cron_runs')
        .update({
          status,
          finished_at: new Date().toISOString(),
          summary: result.summary ?? null,
          failure_count: failureCount,
          duration_ms: durationMs,
        })
        .eq('id', runId)
    }

    if (status === 'partial') {
      await alertCronProblem(cronName, runId, 'partial', {
        failure_count: failureCount,
        summary: result.summary,
      })
    }

    return {
      run_id: runId,
      status,
      summary: result.summary,
    }
  } catch (e) {
    const durationMs = Date.now() - startedAt
    const message = e instanceof Error ? e.message : String(e)

    if (runId) {
      await supabase
        .from('cron_runs')
        .update({
          status: 'failed',
          finished_at: new Date().toISOString(),
          error_message: message,
          failure_count: 1,
          duration_ms: durationMs,
        })
        .eq('id', runId)
    }

    log.error({ cronName, err: formatError(e), runId }, 'cron run failed')
    await alertCronProblem(cronName, runId, 'failed', { error: message })

    // Re-throw so the HTTP handler returns non-2xx — Vercel's own monitoring
    // then sees the failure too.
    throw e
  }
}

// Notifies platform admins + tenant owners in-app (and via email, per
// NotificationService preferences) when a cron goes bad. Deliberately
// tolerant of its own failures — if alerting breaks, don't cascade.
async function alertCronProblem(
  cronName: string,
  runId: string | null,
  kind: 'failed' | 'partial',
  context: Record<string, unknown>,
): Promise<void> {
  try {
    const { NotificationService } = await import('@/lib/services/notification-service')
    const title = kind === 'failed'
      ? `Cron "${cronName}" FAILED`
      : `Cron "${cronName}" completed with failures`
    const message = kind === 'failed'
      ? `The ${cronName} cron did not complete. Customer notifications may not have gone out. Investigate before the next scheduled run.`
      : `${context.failure_count ?? 'Some'} items failed inside ${cronName}. Check the run log.`

    await NotificationService.createForRole({
      role: 'platform_owner',
      type: 'system',
      title,
      message,
      entity_type: 'cron_run',
      entity_id: runId ?? undefined,
      action_url: '/platform-admin',
      priority: 'urgent',
    })
    await NotificationService.createForRole({
      role: 'tenant_owner',
      type: 'system',
      title,
      message,
      entity_type: 'cron_run',
      entity_id: runId ?? undefined,
      action_url: '/settings',
      priority: 'high',
    })
  } catch (e) {
    log.error(
      { cronName, runId, kind, err: formatError(e) },
      'failed to raise cron alert',
    )
  }
}
