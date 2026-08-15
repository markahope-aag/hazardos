import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/utils/api-handler'
import { ROLES } from '@/lib/auth/roles'
import { TimeClockService } from '@/lib/services/time-clock-service'
import { listMineQuerySchema } from '@/lib/validations/time-clock'

/**
 * GET /api/time-clock?from=&to=
 * The caller's own entries. `from`/`to` are optional ISO timestamps —
 * omit both to get everything (bounded by the UI to a sane window).
 */
export const GET = createApiHandler(
  {
    rateLimit: 'general',
    allowedRoles: ROLES.TENANT_FIELD,
    querySchema: listMineQuerySchema,
  },
  async (_request, context, _body, query) => {
    const entries = await TimeClockService.listMine(
      context.user.id,
      query.from && query.to ? { from: query.from, to: query.to } : undefined,
    )
    return NextResponse.json({ entries })
  },
)
