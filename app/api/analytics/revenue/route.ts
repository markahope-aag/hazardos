import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/utils/api-handler'
import { subMonths, format, startOfMonth, endOfMonth } from 'date-fns'

/**
 * GET /api/analytics/revenue
 * Revenue-earned by month over the last 6 months. Revenue is the value
 * of completed jobs (actual_revenue, falling back to final_amount and
 * then contract_amount), bucketed by scheduled_start_date so the x-axis
 * matches how Jobs and the stat card slice the data elsewhere on the
 * dashboard. Cash-received (payments) is a separate concept and lives
 * on the AR / Invoices surfaces.
 */
const REVENUE_STATUSES = ['completed', 'invoiced', 'paid', 'closed']

export const GET = createApiHandler(
  {
    rateLimit: 'general',
  },
  async (_request, context) => {
    const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5))
    const now = endOfMonth(new Date())

    const { data: jobs, error } = await context.supabase
      .from('jobs')
      .select('actual_revenue, contract_amount, final_amount, scheduled_start_date, status')
      .eq('organization_id', context.profile.organization_id)
      .in('status', REVENUE_STATUSES)
      .gte('scheduled_start_date', format(sixMonthsAgo, 'yyyy-MM-dd'))
      .lte('scheduled_start_date', format(now, 'yyyy-MM-dd'))

    if (error) {
      throw error
    }

    const monthlyRevenue = new Map<string, number>()
    for (let i = 5; i >= 0; i--) {
      const monthKey = format(subMonths(new Date(), i), 'yyyy-MM')
      monthlyRevenue.set(monthKey, 0)
    }

    for (const j of jobs || []) {
      if (!j.scheduled_start_date) continue
      const monthKey = j.scheduled_start_date.substring(0, 7) // 'yyyy-MM'
      const value = j.actual_revenue ?? j.final_amount ?? j.contract_amount ?? 0
      monthlyRevenue.set(monthKey, (monthlyRevenue.get(monthKey) || 0) + value)
    }

    const data = []
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(new Date(), i)
      const monthKey = format(monthDate, 'yyyy-MM')
      data.push({
        month: format(monthDate, 'MMM'),
        revenue: monthlyRevenue.get(monthKey) || 0,
      })
    }

    return NextResponse.json(data)
  }
)
