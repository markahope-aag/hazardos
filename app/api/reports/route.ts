import { NextResponse } from 'next/server'
import { ReportingService } from '@/lib/services/reporting-service'
import { createApiHandler } from '@/lib/utils/api-handler'
import { createReportSchema } from '@/lib/validations/reports'

/**
 * GET /api/reports
 * List all reports
 */
export const GET = createApiHandler(
  {
    rateLimit: 'general',
  },
  async () => {
    const reports = await ReportingService.listReports()
    return NextResponse.json(reports)
  }
)

/**
 * POST /api/reports
 * Create a new report
 */
export const POST = createApiHandler(
  {
    rateLimit: 'general',
    bodySchema: createReportSchema,
  },
  async (_request, _context, body) => {
    const report = await ReportingService.createReport(body)
    return NextResponse.json(report, { status: 201 })
  }
)
