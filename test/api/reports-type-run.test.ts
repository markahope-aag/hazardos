import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/reports/[type]/run/route'
import { ReportingService } from '@/lib/services/reporting-service'

vi.mock('@/lib/services/reporting-service', () => ({
  ReportingService: {
    runSalesReport: vi.fn(),
    runJobCostReport: vi.fn(),
    runLeadSourceReport: vi.fn()
  }
}))

vi.mock('@/lib/utils/api-handler', async (importOriginal) => {
  const actual = await importOriginal() as any
  const errorHandler = await import('@/lib/utils/secure-error-handler')
  return {
    ...actual,
    createApiHandlerWithParams: (options: any, handler: any) => {
      return async (request: any, props: any) => {
        try {
          const mockContext = {
            user: { id: 'user-123' },
            profile: { organization_id: 'org-123', role: 'admin' },
            log: { info: vi.fn() },
            requestId: 'test-id'
          }
          const params = await props.params
          let body = {}
          if (options.bodySchema) {
            try { body = await request.json() } catch {}
          }
          return await handler(request, mockContext, params, body, {})
        } catch (error) {
          return errorHandler.createSecureErrorResponse(error, {
            error: vi.fn(), warn: vi.fn(), info: vi.fn()
          })
        }
      }
    }
  }
})

describe('Reports Type Run API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should run sales report', async () => {
    const mockData = [
      { month: '2024-01', total: 50000, count: 10 },
      { month: '2024-02', total: 75000, count: 15 }
    ]
    vi.mocked(ReportingService.runSalesReport).mockResolvedValue(mockData)
    const request = new NextRequest('http://localhost:3000/api/reports/sales/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: { date_from: '2024-01-01', date_to: '2024-12-31' } })
    })
    const response = await POST(request, { params: Promise.resolve({ type: 'sales' }) })
    const data = await response.json()
    expect(response.status).toBe(200)
    expect(data.data).toHaveLength(2)
    expect(data.data[0].total).toBe(50000)
  })

  it('should run job cost report', async () => {
    const mockData = [{ job_id: 'job-1', actual_cost: 10000, estimated_cost: 12000 }]
    vi.mocked(ReportingService.runJobCostReport).mockResolvedValue(mockData)
    const request = new NextRequest('http://localhost:3000/api/reports/jobs/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: {} })
    })
    const response = await POST(request, { params: Promise.resolve({ type: 'jobs' }) })
    const data = await response.json()
    expect(response.status).toBe(200)
    expect(data.data).toHaveLength(1)
  })

  it('should run lead source report', async () => {
    const mockData = [{ source: 'referral', count: 25, conversion_rate: 0.35 }]
    vi.mocked(ReportingService.runLeadSourceReport).mockResolvedValue(mockData)
    const request = new NextRequest('http://localhost:3000/api/reports/leads/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: {} })
    })
    const response = await POST(request, { params: Promise.resolve({ type: 'leads' }) })
    const data = await response.json()
    expect(response.status).toBe(200)
    expect(data.data[0].source).toBe('referral')
  })

  it('should return error for invalid report type', async () => {
    const request = new NextRequest('http://localhost:3000/api/reports/invalid/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: {} })
    })
    const response = await POST(request, { params: Promise.resolve({ type: 'invalid' }) })
    const data = await response.json()
    expect(response.status).toBe(400)
    expect(data.error).toBeTruthy()
  })
})
