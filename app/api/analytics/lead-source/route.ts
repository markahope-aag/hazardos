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
 * GET /api/analytics/lead-source
 *
 * Breakdown of jobs by the lead_source recorded on the customer who owns
 * the originating site survey. Filtered by the same period and hazard
 * filters the rest of the dashboard uses.
 *
 * Traversal: jobs → site_surveys → customers.lead_source
 * We pre-resolve the two parent tables in two narrow queries and join in
 * memory — faster than PostgREST nested select for this size of dataset.
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

    // 1) jobs in the period
    const { data: jobs, error: jobsError } = await context.supabase
      .from('jobs')
      .select('id, site_survey_id')
      .eq('organization_id', context.profile.organization_id)
      .gte('start_date', range.start.toISOString().split('T')[0])
      .lte('start_date', range.end.toISOString().split('T')[0])
      .neq('status', 'cancelled')
    if (jobsError) throw jobsError

    const surveyIds = Array.from(new Set((jobs || []).map((j) => j.site_survey_id).filter(Boolean)))
    if (surveyIds.length === 0) {
      return NextResponse.json({ total: 0, buckets: [] })
    }

    // 2) site_surveys → customer_id (+ hazard filter if set)
    let surveysQuery = context.supabase
      .from('site_surveys')
      .select('id, customer_id, hazard_type')
      .in('id', surveyIds)

    if (hazardDb) {
      surveysQuery = surveysQuery.eq('hazard_type', hazardDb)
    }

    const { data: surveys, error: surveysError } = await surveysQuery
    if (surveysError) throw surveysError

    const matchedCustomerIds = Array.from(
      new Set((surveys || []).map((s) => s.customer_id).filter(Boolean))
    ) as string[]

    if (matchedCustomerIds.length === 0) {
      return NextResponse.json({ total: 0, buckets: [] })
    }

    // 3) customers → lead_source (with fallback to the legacy `source` enum).
    //
    // `lead_source` is a free-text column meant for specific provenance
    // ("Google Ads", "insurance adjuster", "Nextdoor"). `source` is the
    // older limited enum (phone/website/mail/referral/other). Historical
    // rows often only have `source` populated; coalescing both means this
    // chart reflects what's actually there instead of showing an empty
    // state for data that exists in a different column.
    const { data: customers, error: customersError } = await context.supabase
      .from('customers')
      .select('id, lead_source, source')
      .in('id', matchedCustomerIds)

    if (customersError) throw customersError

    const leadSourceByCustomerId = new Map<string, string>()
    for (const c of customers || []) {
      const lead = (c.lead_source || '').toString().trim()
      const legacy = (c.source || '').toString().trim()
      leadSourceByCustomerId.set(c.id, lead || legacy || 'Unknown')
    }

    // Build hazard-filtered job set via the survey matches
    const acceptedSurveyIds = new Set((surveys || []).map((s) => s.id))
    const acceptedJobs = (jobs || []).filter(
      (j) => j.site_survey_id && acceptedSurveyIds.has(j.site_survey_id)
    )

    // Tally: lead_source → job count (via survey → customer)
    const surveyIdToCustomer = new Map<string, string | null>()
    for (const s of surveys || []) {
      surveyIdToCustomer.set(s.id, s.customer_id as string | null)
    }

    const counts = new Map<string, number>()
    for (const job of acceptedJobs) {
      const customerId = surveyIdToCustomer.get(job.site_survey_id as string)
      const leadSource = customerId ? (leadSourceByCustomerId.get(customerId) || 'Unknown') : 'Unknown'
      counts.set(leadSource, (counts.get(leadSource) || 0) + 1)
    }

    const buckets = Array.from(counts.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)

    const total = buckets.reduce((s, b) => s + b.count, 0)

    return NextResponse.json({ total, buckets })
  }
)
