import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/utils/api-handler'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/platform-admin/query-performance/reset
 *
 * Clears pg_stat_statements so the next read reflects a fresh window.
 */

export const POST = createApiHandler(
  { allowedRoles: ['platform_owner', 'platform_admin'] },
  async (_request, context) => {
    void context
    const supabase = createAdminClient()
    const { error } = await supabase.rpc('reset_query_performance_stats')
    if (error) throw error
    return NextResponse.json({ ok: true })
  },
)
