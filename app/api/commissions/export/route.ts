import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/utils/api-handler'
import { ROLES } from '@/lib/auth/roles'
import { CommissionService } from '@/lib/services/commission-service'
import { commissionsToCsv } from '@/lib/utils/commission-csv-export'
import type { CommissionStatus } from '@/types/sales'
import { z } from 'zod'

const exportQuerySchema = z.object({
  // Defaults to approved — the CO5 case is "approved commissions
  // exportable" (e.g. handing a payout list to finance) — but any status
  // filter is allowed, plus 'all'.
  status: z.enum(['pending', 'approved', 'rejected', 'paid', 'all']).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
})

/**
 * GET /api/commissions/export
 * Download commission earnings as CSV (CO5). Admin-only, org-scoped by RLS.
 */
export const GET = createApiHandler(
  {
    rateLimit: 'general',
    allowedRoles: ROLES.TENANT_ADMIN,
    querySchema: exportQuerySchema,
  },
  async (_request, _context, _body, query) => {
    const status = query.status && query.status !== 'all'
      ? (query.status as CommissionStatus)
      : undefined

    const { earnings } = await CommissionService.getEarnings({
      status,
      start_date: query.start_date,
      end_date: query.end_date,
      // High cap so an export isn't silently truncated to the default page.
      limit: 10000,
    })

    const csv = commissionsToCsv(earnings)
    const label = query.status && query.status !== 'all' ? query.status : 'all'
    const filename = `commissions-${label}-${new Date().toISOString().slice(0, 10)}.csv`

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
      },
    })
  },
)
