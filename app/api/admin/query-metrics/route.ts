import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/utils/api-handler'
import {
  getQueryMetrics,
  getMetricsByTable,
  getSlowestQueries,
  clearMetrics,
} from '@/lib/utils/query-monitor'

/**
 * GET /api/admin/query-metrics
 * Get database query performance metrics (admin only)
 */
export const GET = createApiHandler(
  {
    requireAuth: true,
    allowedRoles: ['admin', 'platform_admin'],
  },
  async () => {
    const metrics = getQueryMetrics()
    const byTable = getMetricsByTable()
    const slowest = getSlowestQueries(20)

    return NextResponse.json({
      summary: {
        totalQueries: metrics.totalQueries,
        totalDuration: `${metrics.totalDuration}ms`,
        averageDuration: `${metrics.averageDuration}ms`,
        slowQueries: metrics.slowQueries,
        slowQueryPercentage:
          metrics.totalQueries > 0
            ? `${((metrics.slowQueries / metrics.totalQueries) * 100).toFixed(1)}%`
            : '0%',
      },
      byTable,
      slowestQueries: slowest.map((q) => ({
        query: q.query,
        table: q.table,
        operation: q.operation,
        duration: `${q.duration}ms`,
        timestamp: q.timestamp.toISOString(),
      })),
    })
  }
)

/**
 * DELETE /api/admin/query-metrics
 * Clear all query metrics (admin only)
 */
export const DELETE = createApiHandler(
  {
    requireAuth: true,
    allowedRoles: ['platform_admin'],
  },
  async () => {
    clearMetrics()
    return NextResponse.json({ success: true, message: 'Metrics cleared' })
  }
)
