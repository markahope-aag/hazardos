import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/utils/api-handler'

/**
 * GET /api/analytics/jobs-by-status
 * Get job count grouped by status
 */
export const GET = createApiHandler(
  {
    rateLimit: 'general',
  },
  async (_request, context) => {
    const statuses = ['scheduled', 'in_progress', 'completed', 'invoiced', 'paid']
    const data = []

    for (const status of statuses) {
      const { count } = await context.supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('status', status)

      if (count && count > 0) {
        data.push({
          status: status.replace('_', ' '),
          count,
        })
      }
    }

    return NextResponse.json(data)
  }
)
