import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/utils/api-handler'
import { subMonths, format, startOfMonth, endOfMonth } from 'date-fns'

/**
 * GET /api/analytics/revenue
 * Get revenue data for the last 6 months (single optimized query)
 */
export const GET = createApiHandler(
  {
    rateLimit: 'general',
  },
  async (_request, context) => {
    // Calculate date range for all 6 months
    const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5))
    const now = endOfMonth(new Date())

    // Single query to fetch all payments in the 6-month range
    const { data: payments, error } = await context.supabase
      .from('payments')
      .select('amount, payment_date')
      .eq('organization_id', context.profile.organization_id)
      .gte('payment_date', format(sixMonthsAgo, 'yyyy-MM-dd'))
      .lte('payment_date', format(now, 'yyyy-MM-dd'))

    if (error) {
      throw error
    }

    // Group payments by month in memory
    const monthlyRevenue = new Map<string, number>()

    // Initialize all 6 months with 0
    for (let i = 5; i >= 0; i--) {
      const monthKey = format(subMonths(new Date(), i), 'yyyy-MM')
      monthlyRevenue.set(monthKey, 0)
    }

    // Sum payments by month
    for (const payment of payments || []) {
      if (payment.payment_date) {
        const monthKey = payment.payment_date.substring(0, 7) // 'yyyy-MM'
        const current = monthlyRevenue.get(monthKey) || 0
        monthlyRevenue.set(monthKey, current + (payment.amount || 0))
      }
    }

    // Format response
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
