import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ExcelExportService } from '@/lib/services/excel-export-service'
import { ReportingService } from '@/lib/services/reporting-service'
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new SecureError('UNAUTHORIZED')

    const { format, title, data, columns, report_id } = await request.json()

    if (!format || !data || !columns) {
      throw new SecureError('VALIDATION_ERROR', 'format, data, and columns are required')
    }

    let content: Buffer | string
    let contentType: string
    let ext: string

    if (format === 'xlsx') {
      content = await ExcelExportService.generateExcel({ title: title || 'Report', data, columns })
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ext = 'xlsx'
    } else if (format === 'csv') {
      content = await ExcelExportService.generateCSV({ title: title || 'Report', data, columns })
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
    const body = typeof content === 'string' ? content : new Uint8Array(content)

    return new NextResponse(body, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
