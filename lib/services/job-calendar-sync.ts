import { createClient } from '@/lib/supabase/server'
import { createServiceLogger, formatError } from '@/lib/utils/logger'

const log = createServiceLogger('JobCalendarSync')

/**
 * Push the job to every active external calendar integration the org has
 * (Google, Outlook). Failures never block the user's job save — they're
 * logged and surfaced through the calendar_sync_events table's
 * sync_error column instead. Called from JobsService create/update
 * whenever the job's scheduling state changes.
 */
export async function syncJobToExternalCalendars(
  jobId: string,
  organizationId: string,
): Promise<void> {
  const supabase = await createClient()
  const { data: integrations } = await supabase
    .from('organization_integrations')
    .select('integration_type, settings')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .in('integration_type', ['google_calendar', 'outlook_calendar'])

  if (!integrations || integrations.length === 0) return

  for (const integration of integrations) {
    const settings = (integration.settings as Record<string, unknown> | null) || {}
    // Respect per-integration opt-out. Default true so connecting a calendar
    // just works without digging into settings.
    if (settings.auto_sync_jobs === false) continue

    try {
      if (integration.integration_type === 'google_calendar') {
        const { GoogleCalendarService } = await import('@/lib/services/google-calendar-service')
        await GoogleCalendarService.syncJobToCalendar(organizationId, jobId)
      } else if (integration.integration_type === 'outlook_calendar') {
        const { OutlookCalendarService } = await import('@/lib/services/outlook-calendar-service')
        await OutlookCalendarService.syncJobToCalendar(organizationId, jobId)
      }
    } catch (e) {
      log.error(
        { jobId, integration: integration.integration_type, err: formatError(e) },
        'external calendar sync failed',
      )
      await supabase
        .from('calendar_sync_events')
        .upsert(
          {
            organization_id: organizationId,
            job_id: jobId,
            event_type: 'job',
            calendar_type: integration.integration_type === 'google_calendar' ? 'google' : 'outlook',
            sync_error: e instanceof Error ? e.message : String(e),
            last_synced_at: new Date().toISOString(),
          },
          { onConflict: 'job_id,calendar_type' },
        )
    }
  }
}

/**
 * Remove the job from every external calendar it was pushed to. Called
 * from JobsService.delete and from update() when a job moves to a
 * cancelled status. Cleans up the calendar_sync_events rows after.
 */
export async function deleteJobFromExternalCalendars(
  jobId: string,
  organizationId: string,
): Promise<void> {
  const supabase = await createClient()
  const { data: syncRows } = await supabase
    .from('calendar_sync_events')
    .select('calendar_type, google_event_id, outlook_event_id')
    .eq('job_id', jobId)

  if (!syncRows || syncRows.length === 0) return

  for (const row of syncRows) {
    try {
      if (row.calendar_type === 'google' && row.google_event_id) {
        const { GoogleCalendarService } = await import('@/lib/services/google-calendar-service')
        await GoogleCalendarService.deleteCalendarEvent(organizationId, row.google_event_id)
      } else if (row.calendar_type === 'outlook' && row.outlook_event_id) {
        const { OutlookCalendarService } = await import('@/lib/services/outlook-calendar-service')
        await OutlookCalendarService.deleteCalendarEvent(organizationId, row.outlook_event_id)
      }
    } catch (e) {
      log.error(
        { jobId, calendar: row.calendar_type, err: formatError(e) },
        'external calendar delete failed',
      )
    }
  }

  await supabase.from('calendar_sync_events').delete().eq('job_id', jobId)
}
