import { NextResponse } from 'next/server'
import { ReportingService } from '@/lib/services/reporting-service'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { updateReportSchema } from '@/lib/validations/reports'
import { SecureError } from '@/lib/utils/secure-error-handler'

/**
 * GET /api/reports/[id]
 * Get a report
 */
export const GET = createApiHandlerWithParams(
  {
    rateLimit: 'general',
  },
  async (_request, _context, params) => {
    const report = await ReportingService.getReport(params.id)

    if (!report) {
      throw new SecureError('NOT_FOUND', 'Report not found')
    }

    return NextResponse.json(report)
  }
)

/**
 * PATCH /api/reports/[id]
 * Update a report
 */
export const PATCH = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    bodySchema: updateReportSchema,
  },
  async (_request, _context, params, body) => {
    const report = await ReportingService.updateReport(params.id, body)
    return NextResponse.json(report)
  }
)

/**
 * DELETE /api/reports/[id]
 * Delete a report
 */
export const DELETE = createApiHandlerWithParams(
  {
    rateLimit: 'general',
  },
  async (_request, _context, params) => {
    await ReportingService.deleteReport(params.id)
    return NextResponse.json({ success: true })
  }
)
