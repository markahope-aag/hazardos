import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/reports/export/route'
import { ExcelExportService } from '@/lib/services/excel-export-service'
import { ReportingService } from '@/lib/services/reporting-service'

vi.mock('@/lib/services/excel-export-service', () => ({
  ExcelExportService: {
    generateExcel: vi.fn(),
    generateCSV: vi.fn()
  }
}))

vi.mock('@/lib/services/reporting-service', () => ({
  ReportingService: {
    recordExport: vi.fn()
  }
}))

vi.mock('@/lib/utils/api-handler', async (importOriginal) => {
  const actual = await importOriginal() as any
  return {
    ...actual,
    createApiHandler: (options: any, handler: any) => {
      return async (request: any) => {
        const mockContext = {
          user: { id: 'user-123' },
          profile: { organization_id: 'org-123', role: 'admin' },
          log: { info: vi.fn() },
          requestId: 'test-id'
        }
        let body = {}
        if (options.bodySchema) {
          try { body = await request.json() } catch {}
        }
        return await handler(request, mockContext, body, {})
      }
    }
  }
})

describe('Reports Export API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should export report as Excel', async () => {
    const mockBuffer = Buffer.from('excel data')
    vi.mocked(ExcelExportService.generateExcel).mockResolvedValue(mockBuffer)
    vi.mocked(ReportingService.recordExport).mockResolvedValue(undefined)

    const request = new NextRequest('http://localhost:3000/api/reports/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        format: 'xlsx',
        title: 'Sales Report',
        data: [{ month: '2024-01', total: 50000 }],
        columns: [{ key: 'month', label: 'Month' }, { key: 'total', label: 'Total' }],
        report_id: 'report-123'
      })
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    expect(response.headers.get('Content-Disposition')).toContain('Sales_Report')
    expect(ReportingService.recordExport).toHaveBeenCalledWith(
      expect.objectContaining({
        report_id: 'report-123',
        export_format: 'xlsx'
      })
    )
  })

  it('should export report as CSV', async () => {
    const mockCSV = 'Month,Total\n2024-01,50000'
    vi.mocked(ExcelExportService.generateCSV).mockResolvedValue(mockCSV)
    vi.mocked(ReportingService.recordExport).mockResolvedValue(undefined)

    const request = new NextRequest('http://localhost:3000/api/reports/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        format: 'csv',
        title: 'Job Cost Report',
        data: [{ job: 'Job 1', cost: 10000 }],
        columns: [{ key: 'job', label: 'Job' }, { key: 'cost', label: 'Cost' }]
      })
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('text/csv')
    expect(response.headers.get('Content-Disposition')).toContain('.csv')
  })
})
