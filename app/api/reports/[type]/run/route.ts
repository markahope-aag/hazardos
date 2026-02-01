import { NextResponse } from 'next/server'
import { ReportingService } from '@/lib/services/reporting-service'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { runReportSchema } from '@/lib/validations/reports'
import { SecureError } from '@/lib/utils/secure-error-handler'

/**
 * POST /api/reports/[type]/run
 * Run a report
 */
export const POST = createApiHandlerWithParams<
  typeof runReportSchema._type,
  unknown,
  { type: string }
>(
  {
    rateLimit: 'heavy',
    bodySchema: runReportSchema,
  },
  async (_request, _context, params, body) => {
    let data: unknown[]

    switch (params.type) {
      case 'sales':
        data = await ReportingService.runSalesReport(body)
        break
      case 'jobs':
        data = await ReportingService.runJobCostReport(body)
        break
      case 'leads':
        data = await ReportingService.runLeadSourceReport(body)
        break
      default:
        throw new SecureError('VALIDATION_ERROR', 'Invalid report type')
    }

    return NextResponse.json({ data })
  }
)
