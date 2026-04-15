import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, FileText, Calendar, TrendingUp, ArrowUp, ArrowDown, Minus } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import {
  DashboardFilters,
  getPeriodRange,
  computeTrend,
  buildFilterQuery,
  hazardFilterToDbValue,
  Trend,
} from '@/lib/dashboard/filters'

export { StatsCardsErrorBoundary } from './error-wrappers'

interface StatsCardsProps {
  filters: DashboardFilters
}

/**
 * When a hazard filter is active we need to scope jobs/proposals to surveys
 * that match that hazard. site_surveys is the only table where hazard_type
 * actually lives, so we do one small prefetch for the matching survey IDs
 * and then use `.in()` on subsequent queries.
 */
async function getHazardScopedSurveyIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  hazardDb: string | null
): Promise<string[] | null> {
  if (!hazardDb) return null
  const { data } = await supabase
    .from('site_surveys')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('hazard_type', hazardDb)
  return (data || []).map((row) => row.id)
}

function toIsoDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

export async function StatsCards({ filters }: StatsCardsProps) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) return null
  const organizationId = profile.organization_id

  const range = getPeriodRange(filters.period)
  const hazardDb = hazardFilterToDbValue(filters.hazardType)
  const hazardSurveyIds = await getHazardScopedSurveyIds(supabase, organizationId, hazardDb)
  const hazardActive = hazardSurveyIds !== null
  const hasHazardMatches = !hazardActive || hazardSurveyIds.length > 0

  // ─── Revenue (paid invoice payments) ─────────────────────────────────
  // Revenue is computed off the payments table. Hazard filter isn't
  // applied here — payments don't carry hazard type and linking each
  // payment back through invoice→estimate→site_survey is expensive. We
  // note this constraint via a card description instead of faking it.
  const [currentRevenueRes, previousRevenueRes] = await Promise.all([
    supabase
      .from('payments')
      .select('amount')
      .eq('organization_id', organizationId)
      .gte('payment_date', toIsoDate(range.start))
      .lte('payment_date', toIsoDate(range.end)),
    supabase
      .from('payments')
      .select('amount')
      .eq('organization_id', organizationId)
      .gte('payment_date', toIsoDate(range.previousStart))
      .lte('payment_date', toIsoDate(range.previousEnd)),
  ])

  const currentRevenue = (currentRevenueRes.data || []).reduce((s, p) => s + (p.amount || 0), 0)
  const previousRevenue = (previousRevenueRes.data || []).reduce((s, p) => s + (p.amount || 0), 0)

  // ─── Outstanding AR ─────────────────────────────────────────────────
  // Point-in-time value (doesn't vary by period). We still compute a
  // "previous" number by treating previousEnd as a different point in
  // time but invoices don't carry historical balances — so the trend
  // line for AR is suppressed.
  const { data: outstandingInvoices } = await supabase
    .from('invoices')
    .select('balance_due')
    .eq('organization_id', organizationId)
    .gt('balance_due', 0)
    .not('status', 'in', '("void","paid")')

  const outstandingAR = (outstandingInvoices || []).reduce(
    (s, i) => s + (i.balance_due || 0),
    0
  )

  // ─── Jobs in period (filtered by hazard via survey IDs) ──────────────
  let jobsQuery = supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .gte('start_date', toIsoDate(range.start))
    .lte('start_date', toIsoDate(range.end))
    .neq('status', 'cancelled')

  if (hazardActive) {
    if (!hasHazardMatches) {
      jobsQuery = jobsQuery.in('site_survey_id', ['00000000-0000-0000-0000-000000000000'])
    } else {
      jobsQuery = jobsQuery.in('site_survey_id', hazardSurveyIds as string[])
    }
  }

  let previousJobsQuery = supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .gte('start_date', toIsoDate(range.previousStart))
    .lte('start_date', toIsoDate(range.previousEnd))
    .neq('status', 'cancelled')

  if (hazardActive) {
    if (!hasHazardMatches) {
      previousJobsQuery = previousJobsQuery.in(
        'site_survey_id',
        ['00000000-0000-0000-0000-000000000000']
      )
    } else {
      previousJobsQuery = previousJobsQuery.in('site_survey_id', hazardSurveyIds as string[])
    }
  }

  const [{ count: currentJobCount }, { count: previousJobCount }] = await Promise.all([
    jobsQuery,
    previousJobsQuery,
  ])

  // ─── Proposals / Win Rate ───────────────────────────────────────────
  // Filter by hazard via the joined estimate→site_survey relationship.
  // We build the estimate ID set first when hazard is active.
  let hazardScopedEstimateIds: string[] | null = null
  if (hazardActive) {
    if (!hasHazardMatches) {
      hazardScopedEstimateIds = []
    } else {
      const { data: estimates } = await supabase
        .from('estimates')
        .select('id')
        .eq('organization_id', organizationId)
        .in('site_survey_id', hazardSurveyIds as string[])
      hazardScopedEstimateIds = (estimates || []).map((e) => e.id)
    }
  }

  const buildProposalQuery = (startIso: string, endIso: string) => {
    let q = supabase
      .from('proposals')
      .select('status')
      .eq('organization_id', organizationId)
      .gte('created_at', startIso)
      .lte('created_at', endIso)
    if (hazardScopedEstimateIds !== null) {
      if (hazardScopedEstimateIds.length === 0) {
        q = q.in('estimate_id', ['00000000-0000-0000-0000-000000000000'])
      } else {
        q = q.in('estimate_id', hazardScopedEstimateIds)
      }
    }
    return q
  }

  const [{ data: currentProposals }, { data: previousProposals }] = await Promise.all([
    buildProposalQuery(range.start.toISOString(), range.end.toISOString()),
    buildProposalQuery(range.previousStart.toISOString(), range.previousEnd.toISOString()),
  ])

  const currentProposalsSent = currentProposals?.length || 0
  const currentProposalsWon = currentProposals?.filter((p) => p.status === 'signed').length || 0
  const currentWinRate =
    currentProposalsSent > 0 ? Math.round((currentProposalsWon / currentProposalsSent) * 100) : 0

  const previousProposalsSent = previousProposals?.length || 0
  const previousProposalsWon = previousProposals?.filter((p) => p.status === 'signed').length || 0
  const previousWinRate =
    previousProposalsSent > 0 ? Math.round((previousProposalsWon / previousProposalsSent) * 100) : 0

  const revenueTrend = computeTrend(currentRevenue, previousRevenue)
  const jobsTrend = computeTrend(currentJobCount || 0, previousJobCount || 0)
  const winRateTrend = computeTrend(currentWinRate, previousWinRate)

  const stats = [
    {
      title: 'Revenue',
      value: formatCurrency(currentRevenue),
      icon: DollarSign,
      description: hazardActive
        ? `${range.label} · hazard filter not applied to payments`
        : `Payments received ${range.label.toLowerCase()}`,
      trend: revenueTrend,
      href: `/invoices${buildFilterQuery(filters, { status: 'paid' })}`,
    },
    {
      title: 'Outstanding AR',
      value: formatCurrency(outstandingAR),
      icon: FileText,
      description: 'Unpaid invoice balance',
      trend: null,
      href: `/invoices${buildFilterQuery(filters, { status: 'outstanding' })}`,
    },
    {
      title: 'Jobs',
      value: (currentJobCount || 0).toString(),
      icon: Calendar,
      description: `Scheduled ${range.label.toLowerCase()}`,
      trend: jobsTrend,
      href: `/crm/jobs${buildFilterQuery(filters)}`,
    },
    {
      title: 'Win Rate',
      value: `${currentWinRate}%`,
      icon: TrendingUp,
      description: `${currentProposalsWon} of ${currentProposalsSent} proposals`,
      trend: winRateTrend,
      href: `/proposals${buildFilterQuery(filters)}`,
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Link
          key={stat.title}
          href={stat.href}
          className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
        >
          <Card className="h-full transition-colors hover:border-primary/40 hover:bg-accent/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="flex items-center justify-between gap-2 mt-1">
                <p className="text-xs text-muted-foreground truncate">{stat.description}</p>
                {stat.trend && <TrendBadge trend={stat.trend} />}
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}

function TrendBadge({ trend }: { trend: Trend }) {
  const { direction, percent } = trend

  const Icon = direction === 'up' ? ArrowUp : direction === 'down' ? ArrowDown : Minus
  const colorClass =
    direction === 'up'
      ? 'text-emerald-600'
      : direction === 'down'
        ? 'text-red-600'
        : 'text-muted-foreground'

  const label =
    percent === null
      ? '—'
      : `${percent >= 0 ? '+' : ''}${percent.toFixed(percent >= 10 || percent <= -10 ? 0 : 1)}%`

  return (
    <span
      className={cn('flex items-center gap-0.5 text-xs font-medium whitespace-nowrap', colorClass)}
      aria-label={
        direction === 'flat'
          ? 'No change vs previous period'
          : `${direction === 'up' ? 'Up' : 'Down'} ${label} vs previous period`
      }
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {label}
    </span>
  )
}
