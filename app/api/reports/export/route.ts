import { NextResponse } from 'next/server'
import { ExcelExportService } from '@/lib/services/excel-export-service'
import { ReportingService } from '@/lib/services/reporting-service'
import { createApiHandler } from '@/lib/utils/api-handler'
import { exportReportSchema } from '@/lib/validations/reports'
import { SecureError } from '@/lib/utils/secure-error-handler'

/**
 * POST /api/reports/export
 * Export report data to xlsx or csv
 */
export const POST = createApiHandler(
  {
    rateLimit: 'heavy',
    bodySchema: exportReportSchema,
  },
  async (_request, _context, body) => {
    const { format, title, data, columns, report_id } = body

    let content: Buffer | string
    let contentType: string
    let ext: string

    if (format === 'xlsx') {
      content = await ExcelExportService.generateExcel({
        title: title || 'Report',
        data,
        columns
      })
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ext = 'xlsx'
    } else if (format === 'csv') {
      content = await ExcelExportService.generateCSV({
        title: title || 'Report',
        data,
        columns
      })
      contentType = 'text/csv'
      ext = 'csv'
    } else {
      throw new SecureError('VALIDATION_ERROR', 'Invalid export format')
    }

    // Record export
    await ReportingService.recordExport({
      report_id,
      report_name: title || 'Report',
      export_format: format,
      file_size: typeof content === 'string' ? content.length : content.length,
    })

    const filename = `${(title || 'report').replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.${ext}`

    // Convert Buffer to Uint8Array for NextResponse compatibility
    const responseBody = typeof content === 'string' ? content : new Uint8Array(content)

    return new NextResponse(responseBody, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  }
)
