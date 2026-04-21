import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createApiHandler } from '@/lib/utils/api-handler'
import {
  getPeriodRange,
  hazardFilterToDbValue,
  type DashboardPeriod,
  type DashboardHazardType,
} from '@/lib/dashboard/filters'

const querySchema = z.object({
  period: z.enum(['week', 'month', 'quarter', 'ytd']).optional(),
  hazard_type: z
    .enum(['all', 'asbestos', 'mold', 'lead', 'vermiculite', 'other'])
    .optional(),
})

/**
 * GET /api/analytics/jobs-by-status
 *
 * Returns job counts grouped by status for the requested period and hazard
 * filter. If `period` is omitted it defaults to 'month'. If `hazard_type` is
 * 'all' or omitted, the hazard filter is off.
 */
export const GET = createApiHandler(
  {
    rateLimit: 'general',
    querySchema,
  },
  async (_request, context, _body, query) => {
    const period = (query.period ?? 'month') as DashboardPeriod
    const hazardFilter = (query.hazard_type ?? 'all') as DashboardHazardType
    const range = getPeriodRange(period)
    const hazardDb = hazardFilterToDbValue(hazardFilter)

    // Resolve hazard filter to a set of site_survey IDs we'll scope jobs to.
    let surveyIdFilter: string[] | null = null
    if (hazardDb) {
      const { data: surveys } = await context.supabase
        .from('site_surveys')
        .select('id')
        .eq('organization_id', context.profile.organization_id)
        .eq('hazard_type', hazardDb)
      surveyIdFilter = (surveys || []).map((s) => s.id)
    }

    let jobsQuery = context.supabase
      .from('jobs')
      .select('status')
      .eq('organization_id', context.profile.organization_id)
      .gte('scheduled_start_date', range.start.toISOString().split('T')[0])
      .lte('scheduled_start_date', range.end.toISOString().split('T')[0])

    if (surveyIdFilter !== null) {
      if (surveyIdFilter.length === 0) {
        // Hazard filter matches no surveys; short-circuit to empty result.
        return NextResponse.json({ total: 0, buckets: [] })
      }
      jobsQuery = jobsQuery.in('site_survey_id', surveyIdFilter)
    }

    const { data: jobs, error } = await jobsQuery

    if (error) {
      throw error
    }

    const statusCounts = new Map<string, number>()
    for (const job of jobs || []) {
      statusCounts.set(job.status, (statusCounts.get(job.status) || 0) + 1)
    }

    const orderedStatuses = [
      'scheduled',
      'in_progress',
      'completed',
      'invoiced',
      'paid',
      'cancelled',
      'on_hold',
    ]

    const buckets = Array.from(statusCounts.entries())
      .filter(([, count]) => count > 0)
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => orderedStatuses.indexOf(a.status) - orderedStatuses.indexOf(b.status))

    const total = buckets.reduce((s, b) => s + b.count, 0)

    return NextResponse.json({ total, buckets })
  }
)
