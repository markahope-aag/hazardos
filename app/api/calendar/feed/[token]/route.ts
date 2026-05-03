import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateICal, type ICalEvent } from '@/lib/services/ical-generator'
import { addDays, format } from 'date-fns'

/**
 * GET /api/calendar/feed/[token]
 *
 * Public iCal subscribe endpoint. The token is a per-user secret
 * stored on profiles.calendar_feed_token — possession of it grants
 * read-only access to that user's assigned jobs and surveys for
 * use in Apple/Google/Outlook Calendar.
 *
 * Calendar clients don't carry session cookies, so this route
 * intentionally bypasses RLS via the service-role client and
 * scopes results purely by the token-mapped user.
 */

const WINDOW_PAST_DAYS = 30
const WINDOW_FUTURE_DAYS = 180

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params

  // Quick UUID format check — saves a DB round-trip on garbage URLs.
  if (!/^[0-9a-f-]{36}$/i.test(token)) {
    return new NextResponse('Not found', { status: 404 })
  }

  const supabase = createAdminClient()

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, organization_id, first_name, last_name, full_name')
    .eq('calendar_feed_token', token)
    .single()

  if (profileError || !profile) {
    return new NextResponse('Not found', { status: 404 })
  }

  const today = new Date()
  const windowStart = format(addDays(today, -WINDOW_PAST_DAYS), 'yyyy-MM-dd')
  const windowEnd = format(addDays(today, WINDOW_FUTURE_DAYS), 'yyyy-MM-dd')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hazardos.app'

  // Jobs the user is on the crew for, plus jobs they own. The
  // job_crew table is the modern way; assigned_to is the legacy
  // single-tech pointer — keep both for now.
  const [jobCrewResult, jobsAssignedResult, surveysResult] = await Promise.all([
    supabase
      .from('job_crew')
      .select(`
        job:jobs(
          id, job_number, name, status, scheduled_start_date,
          scheduled_end_date, scheduled_start_time, job_address, job_city,
          customer:customers!customer_id(name, company_name)
        )
      `)
      .eq('user_id', profile.id),
    supabase
      .from('jobs')
      .select(`
        id, job_number, name, status, scheduled_start_date,
        scheduled_end_date, scheduled_start_time, job_address, job_city,
        customer:customers!customer_id(name, company_name)
      `)
      .eq('organization_id', profile.organization_id)
      .eq('assigned_to', profile.id)
      .gte('scheduled_start_date', windowStart)
      .lte('scheduled_start_date', windowEnd)
      .neq('status', 'cancelled'),
    supabase
      .from('site_surveys')
      .select(`
        id, job_name, status, scheduled_date, scheduled_time_start,
        site_address, site_city, hazard_type, customer_name
      `)
      .eq('organization_id', profile.organization_id)
      .eq('assigned_to', profile.id)
      .not('scheduled_date', 'is', null)
      .gte('scheduled_date', windowStart)
      .lte('scheduled_date', windowEnd)
      .neq('status', 'cancelled'),
  ])

  // Merge crew jobs + assigned-to jobs, dedupe by id.
  const jobsById = new Map<string, NonNullable<typeof jobsAssignedResult.data>[number]>()

  for (const row of jobCrewResult.data || []) {
    const job = Array.isArray(row.job) ? row.job[0] : row.job
    if (!job) continue
    if (!job.scheduled_start_date) continue
    if (job.scheduled_start_date < windowStart || job.scheduled_start_date > windowEnd) continue
    if (job.status === 'cancelled') continue
    jobsById.set(job.id, job as never)
  }
  for (const job of jobsAssignedResult.data || []) {
    jobsById.set(job.id, job)
  }

  const events: ICalEvent[] = []

  for (const job of jobsById.values()) {
    const customer = Array.isArray(job.customer) ? job.customer[0] : job.customer
    const customerName = customer?.company_name || customer?.name || ''
    const location = [job.job_address, job.job_city].filter(Boolean).join(', ')

    if (job.scheduled_start_time) {
      // Timed event — use start time + assume 8h duration when no
      // end time is recorded (matches the day-based pricing model).
      const [y, m, d] = job.scheduled_start_date.split('-').map(Number)
      const [hh, mm] = job.scheduled_start_time.split(':').map(Number)
      const start = new Date(y, m - 1, d, hh, mm)
      const end = new Date(start.getTime() + 8 * 60 * 60 * 1000)
      events.push({
        uid: `job-${job.id}@hazardos`,
        summary: `${job.job_number}${job.name ? ` — ${job.name}` : ''}${customerName ? ` (${customerName})` : ''}`,
        location,
        url: `${appUrl}/jobs/${job.id}`,
        start,
        end,
      })
    } else {
      // All-day, possibly multi-day.
      events.push({
        uid: `job-${job.id}@hazardos`,
        summary: `${job.job_number}${job.name ? ` — ${job.name}` : ''}${customerName ? ` (${customerName})` : ''}`,
        location,
        url: `${appUrl}/jobs/${job.id}`,
        start: job.scheduled_start_date,
        end: job.scheduled_end_date || job.scheduled_start_date,
        allDay: true,
      })
    }
  }

  for (const survey of surveysResult.data || []) {
    if (!survey.scheduled_date) continue
    const location = [survey.site_address, survey.site_city].filter(Boolean).join(', ')
    const summary = `Survey: ${survey.job_name}${survey.customer_name ? ` (${survey.customer_name})` : ''}`

    if (survey.scheduled_time_start) {
      const [y, m, d] = survey.scheduled_date.split('-').map(Number)
      const [hh, mm] = survey.scheduled_time_start.split(':').map(Number)
      const start = new Date(y, m - 1, d, hh, mm)
      // Surveys are typically 1-2 hours; use 2h as a sensible default.
      const end = new Date(start.getTime() + 2 * 60 * 60 * 1000)
      events.push({
        uid: `survey-${survey.id}@hazardos`,
        summary,
        location,
        url: `${appUrl}/site-surveys/${survey.id}`,
        start,
        end,
      })
    } else {
      events.push({
        uid: `survey-${survey.id}@hazardos`,
        summary,
        location,
        url: `${appUrl}/site-surveys/${survey.id}`,
        start: survey.scheduled_date,
        allDay: true,
      })
    }
  }

  const calendarName = `HazardOS — ${profile.full_name || profile.first_name || 'Schedule'}`

  const ics = generateICal({
    calendarName,
    prodId: '-//HazardOS//Calendar Feed v1//EN',
    events,
  })

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="hazardos.ics"',
      'Cache-Control': 'private, max-age=300',
    },
  })
}
