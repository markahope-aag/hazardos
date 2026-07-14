import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/utils/api-handler'
import { throwDbError } from '@/lib/utils/secure-error-handler'
import { ROLES } from '@/lib/auth/roles'
import { z } from 'zod'

const ZERO_UUID = '00000000-0000-0000-0000-000000000000'

const querySchema = z.object({
  // 'all' (default) skips location filtering, 'unassigned' matches
  // location_id IS NULL, otherwise a specific location_id.
  location_id: z.string().optional(),
})

/**
 * GET /api/estimates/stats
 *
 * Returns the KPI bundle for the Estimates list page (open, draft,
 * overdue, win_rate, avg_value, total_value). Computed by SQL
 * aggregate so the numbers are accurate regardless of how many
 * estimates exist — the previous client-side useMemo() iterated
 * only the first 50 paginated rows.
 */
export const GET = createApiHandler(
  {
    rateLimit: 'general',
    allowedRoles: ROLES.TENANT_READ,
    querySchema,
  },
  async (_request, context, _body, query) => {
    const locationParam =
      !query.location_id || query.location_id === 'all'
        ? null
        : query.location_id === 'unassigned'
          ? ZERO_UUID
          : query.location_id

    const { data, error } = await context.supabase.rpc('get_estimate_metrics', {
      p_location_id: locationParam,
    })

    if (error) throwDbError(error, 'estimate stats')

    return NextResponse.json(data ?? {})
  },
)
