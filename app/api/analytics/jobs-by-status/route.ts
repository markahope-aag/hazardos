import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/utils/api-handler'

/**
 * GET /api/analytics/jobs-by-status
 * Get job count grouped by status (single optimized query)
 */
export const GET = createApiHandler(
  {
    rateLimit: 'general',
  },
  async (_request, context) => {
    // Single query to get all status counts at once
    const { data: jobs, error } = await context.supabase
      .from('jobs')
      .select('status')
      .eq('organization_id', context.profile.organization_id)

    if (error) {
      throw error
    }

    // Count by status in memory (more efficient than 5 separate DB calls)
    const statusCounts = new Map<string, number>()
    for (const job of jobs || []) {
      const count = statusCounts.get(job.status) || 0
      statusCounts.set(job.status, count + 1)
    }

    // Format response
    const data = Array.from(statusCounts.entries())
      .filter(([, count]) => count > 0)
      .map(([status, count]) => ({
        status,
        count,
      }))
      .sort((a, b) => {
        const order = ['scheduled', 'in_progress', 'completed', 'invoiced', 'paid', 'cancelled', 'on_hold']
        return order.indexOf(a.status) - order.indexOf(b.status)
      })

    return NextResponse.json(data)
  }
)
