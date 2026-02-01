import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/utils/api-handler'
import { subMonths, format, startOfMonth, endOfMonth } from 'date-fns'

/**
 * GET /api/analytics/revenue
 * Get revenue data for the last 6 months
 */
export const GET = createApiHandler(
  {
    rateLimit: 'general',
  },
  async (_request, context) => {
    const data = []

    // Get last 6 months of revenue
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(new Date(), i)
      const monthStart = format(startOfMonth(monthDate), 'yyyy-MM-dd')
      const monthEnd = format(endOfMonth(monthDate), 'yyyy-MM-dd')

      const { data: payments } = await context.supabase
        .from('payments')
        .select('amount')
        .gte('payment_date', monthStart)
        .lte('payment_date', monthEnd)

      const revenue = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0

      data.push({
        month: format(monthDate, 'MMM'),
        revenue,
      })
    }

    return NextResponse.json(data)
  }
)
