import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/utils/api-handler'
import { ROLES } from '@/lib/auth/roles'
import { FeedbackService } from '@/lib/services/feedback-service'
import { feedbackResponsesToCsv } from '@/lib/utils/feedback-csv-export'
import { z } from 'zod'

const exportQuerySchema = z.object({
  // Defaults to completed responses (the ones with actual ratings/text).
  status: z.string().optional(),
})

/**
 * GET /api/feedback/export
 * Download feedback responses as CSV (FB7). Org-scoped by RLS.
 */
export const GET = createApiHandler(
  {
    rateLimit: 'general',
    allowedRoles: ROLES.TENANT_READ,
    querySchema: exportQuerySchema,
  },
  async (_request, _context, _body, query) => {
    const status = query.status && query.status !== 'all' ? query.status : 'completed'

    const { surveys } = await FeedbackService.listSurveys({
      status,
      // High cap so an export isn't silently truncated to the default page.
      limit: 10000,
    })

    const csv = feedbackResponsesToCsv(surveys)
    const filename = `feedback-${status}-${new Date().toISOString().slice(0, 10)}.csv`

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
