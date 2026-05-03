import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/utils/api-handler'
import { calendarQuerySchema } from '@/lib/validations/jobs'
import { SecureError, throwDbError } from '@/lib/utils/secure-error-handler'

/**
 * GET /api/site-surveys/calendar?start=YYYY-MM-DD&end=YYYY-MM-DD
 *
 * Returns scheduled site surveys overlapping the requested window.
 * Mirrors the shape of /api/jobs/calendar so the calendar UI can merge
 * both event types without per-source branching everywhere.
 */
export const GET = createApiHandler(
  {
    rateLimit: 'general',
    querySchema: calendarQuerySchema,
  },
  async (_request, context, _body, query) => {
    if (!query.start || !query.end) {
      throw new SecureError('VALIDATION_ERROR', 'start and end dates are required')
    }

    const startDate = new Date(query.start)
    const endDate = new Date(query.end)
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new SecureError('VALIDATION_ERROR', 'Invalid date format. Use YYYY-MM-DD')
    }

    // Surveys are single-day appointments — no end date column. Window
    // them by scheduled_date alone and skip cancelled rows.
    const { data, error } = await context.supabase
      .from('site_surveys')
      .select(`
        id,
        job_name,
        status,
        appointment_status,
        scheduled_date,
        scheduled_time_start,
        scheduled_time_end,
        site_address,
        site_city,
        hazard_type,
        customer_name,
        assigned_to,
        customer:customers!customer_id(id, first_name, last_name, company_name, name),
        assignee:profiles!assigned_to(id, first_name, last_name)
      `)
      .eq('organization_id', context.profile.organization_id)
      .not('scheduled_date', 'is', null)
      .gte('scheduled_date', query.start)
      .lte('scheduled_date', query.end)
      .neq('status', 'cancelled')
      .order('scheduled_date', { ascending: true })

    if (error) throwDbError(error, 'list survey calendar')

    const surveys = (data || []).map((row) => ({
      ...row,
      customer: Array.isArray(row.customer) ? row.customer[0] : row.customer,
      assignee: Array.isArray(row.assignee) ? row.assignee[0] : row.assignee,
    }))

    return NextResponse.json({ surveys })
  }
)
