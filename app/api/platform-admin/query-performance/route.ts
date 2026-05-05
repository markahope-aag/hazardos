import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createApiHandler } from '@/lib/utils/api-handler'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/platform-admin/query-performance
 *
 * Returns the top entries from pg_stat_statements for triage. Service-role
 * is required because the underlying RPC is locked to the service role and
 * the data exposes raw query text.
 *
 * POST /api/platform-admin/query-performance/reset
 *   Resets the pg_stat_statements buffer.
 */

const ALLOWED_ORDER = ['total_time', 'mean_time', 'max_time', 'calls'] as const
type OrderBy = (typeof ALLOWED_ORDER)[number]

const querySchema = z.object({
  order_by: z.enum(ALLOWED_ORDER).optional().default('total_time'),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
})

interface SlowQueryRow {
  query: string
  calls: number
  total_exec_ms: number
  mean_exec_ms: number
  min_exec_ms: number
  max_exec_ms: number
  stddev_exec_ms: number
  rows_returned: number
  shared_blks_hit: number
  shared_blks_read: number
}

export const GET = createApiHandler(
  { allowedRoles: ['platform_owner', 'platform_admin'], querySchema },
  async (_request, context, _body, query) => {
    void context
    const { order_by, limit } = query as { order_by: OrderBy; limit: number }

    const supabase = createAdminClient()
    const { data, error } = await supabase.rpc('get_top_slow_queries', {
      order_by,
      limit_n: limit,
    })
    if (error) throw error

    const rows = (data || []) as SlowQueryRow[]
    return NextResponse.json({
      order_by,
      limit,
      rows,
    })
  },
)
