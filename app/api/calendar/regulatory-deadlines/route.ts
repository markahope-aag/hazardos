import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/utils/api-handler'
import { calendarQuerySchema } from '@/lib/validations/jobs'
import { SecureError, throwDbError } from '@/lib/utils/secure-error-handler'
import { addDays, parseISO, format } from 'date-fns'

/**
 * GET /api/calendar/regulatory-deadlines?start=YYYY-MM-DD&end=YYYY-MM-DD
 *
 * Derives compliance deadlines from upcoming jobs and returns them as
 * pseudo-events the calendar can pin onto specific dates. Currently
 * surfaces:
 *
 *   - EPA NESHAP notification — 10 working days before the start of
 *     any asbestos abatement job. Missing this is a per-day fine, so
 *     the deadline showing up on the calendar is a real safety net.
 *
 * The deadline is computed *backwards* from each job's start date, so
 * we have to fetch jobs whose start_date can produce a deadline inside
 * the requested window. Conservatively, we look up to 30 days past the
 * window's end (covers the 10-working-day window plus weekends).
 */

const ASBESTOS_NOTICE_WORKING_DAYS = 10

function subtractWorkingDays(date: Date, workingDays: number): Date {
  let remaining = workingDays
  let cursor = date
  while (remaining > 0) {
    cursor = addDays(cursor, -1)
    const dow = cursor.getDay()
    // Skip Saturday (6) and Sunday (0). Holidays aren't tracked yet —
    // when they are, this is the function to teach.
    if (dow !== 0 && dow !== 6) remaining -= 1
  }
  return cursor
}

export const GET = createApiHandler(
  {
    rateLimit: 'general',
    querySchema: calendarQuerySchema,
  },
  async (_request, context, _body, query) => {
    if (!query.start || !query.end) {
      throw new SecureError('VALIDATION_ERROR', 'start and end dates are required')
    }

    const windowStart = parseISO(query.start)
    const windowEnd = parseISO(query.end)
    if (isNaN(windowStart.getTime()) || isNaN(windowEnd.getTime())) {
      throw new SecureError('VALIDATION_ERROR', 'Invalid date format. Use YYYY-MM-DD')
    }

    // Pull jobs whose start_date sits anywhere from `windowStart` up to
    // 30 days past `windowEnd` — wide enough to catch any deadline that
    // would land inside the visible window after subtracting 10 working
    // days. Cheaper than a per-day cross-join.
    const lookaheadEnd = format(addDays(windowEnd, 30), 'yyyy-MM-dd')

    const { data: jobs, error } = await context.supabase
      .from('jobs')
      .select('id, job_number, name, scheduled_start_date, hazard_types, customer:customers!customer_id(id, name, company_name)')
      .eq('organization_id', context.profile.organization_id)
      .gte('scheduled_start_date', query.start)
      .lte('scheduled_start_date', lookaheadEnd)
      .neq('status', 'cancelled')

    if (error) throwDbError(error, 'load regulatory deadlines')

    type DeadlineEvent = {
      id: string
      kind: 'epa_asbestos_notification'
      label: string
      deadline_date: string
      job_id: string
      job_number: string
      job_name: string | null
      job_start_date: string
      customer_name: string | null
    }

    const deadlines: DeadlineEvent[] = []

    for (const job of jobs || []) {
      const hazards = (job.hazard_types as string[] | null) || []
      if (!hazards.includes('asbestos')) continue

      const start = parseISO(job.scheduled_start_date)
      const deadline = subtractWorkingDays(start, ASBESTOS_NOTICE_WORKING_DAYS)

      // Only keep deadlines that fall inside the requested visible window.
      if (deadline < windowStart || deadline > windowEnd) continue

      const customer = Array.isArray(job.customer) ? job.customer[0] : job.customer
      const customerName = customer?.company_name || customer?.name || null

      deadlines.push({
        id: `epa-${job.id}`,
        kind: 'epa_asbestos_notification',
        label: 'EPA NESHAP notification due',
        deadline_date: format(deadline, 'yyyy-MM-dd'),
        job_id: job.id,
        job_number: job.job_number,
        job_name: job.name,
        job_start_date: job.scheduled_start_date,
        customer_name: customerName,
      })
    }

    return NextResponse.json({ deadlines })
  }
)
