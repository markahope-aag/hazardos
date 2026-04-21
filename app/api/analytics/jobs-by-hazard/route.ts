import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createApiHandler } from '@/lib/utils/api-handler'
import { getPeriodRange, type DashboardPeriod } from '@/lib/dashboard/filters'

const querySchema = z.object({
  period: z.enum(['week', 'month', 'quarter', 'ytd']).optional(),
})

// GET /api/analytics/jobs-by-hazard
//
// Jobs grouped by hazard_type for the current period. Deliberately does NOT
// accept a hazard_type filter — the whole point of the card is to show all
// hazards side by side so the user can compare the mix; applying a single-
// hazard filter would leave one bar and defeat the purpose.
//
// hazard_type lives on site_surveys, not jobs, so we join via site_survey_id.
// Jobs with no linked survey fall into an 'unknown' bucket so the total
// still reconciles with the Jobs stat card.
export const GET = createApiHandler(
  {
    rateLimit: 'general',
    querySchema,
  },
  async (_request, context, _body, query) => {
    const period = (query.period ?? 'month') as DashboardPeriod
    const range = getPeriodRange(period)

    const { data: jobs, error } = await context.supabase
      .from('jobs')
      .select('id, site_survey_id, site_survey:site_surveys(hazard_type)')
      .eq('organization_id', context.profile.organization_id)
      .gte('scheduled_start_date', range.start.toISOString().split('T')[0])
      .lte('scheduled_start_date', range.end.toISOString().split('T')[0])
      .neq('status', 'cancelled')

    if (error) throw error

    const counts = new Map<string, number>()
    for (const job of jobs || []) {
      const survey = Array.isArray(job.site_survey) ? job.site_survey[0] : job.site_survey
      const hazard = (survey?.hazard_type as string | undefined) || 'unknown'
      counts.set(hazard, (counts.get(hazard) || 0) + 1)
    }

    // Ordered consistently so the bars don't jump around between renders.
    const orderedHazards = ['asbestos', 'mold', 'lead', 'vermiculite', 'other', 'unknown']
    const buckets = orderedHazards
      .map((hazard) => ({ hazard, count: counts.get(hazard) || 0 }))
      .filter((b) => b.count > 0)

    const total = buckets.reduce((s, b) => s + b.count, 0)

    return NextResponse.json({ total, buckets })
  },
)
