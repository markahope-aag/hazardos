import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/reports/run/[type]/route'
import { ReportingService } from '@/lib/services/reporting-service'
import { logger } from '@/lib/utils/logger'
import type { SalesPerformanceRow, JobCostRow, LeadSourceRow } from '@/types/reporting'

vi.spyOn(logger, 'error').mockImplementation(() => {})
vi.spyOn(logger, 'warn').mockImplementation(() => {})
vi.spyOn(logger, 'info').mockImplementation(() => {})

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
          const { logger } = await import('@/lib/utils/logger')
          return errorHandler.createSecureErrorResponse(error, logger)
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
    const mockData: SalesPerformanceRow[] = [
      { organization_id: 'org-123', user_id: 'user-1', full_name: 'Jane Doe', month: '2024-01', proposals_sent: 12, proposals_won: 5, proposals_lost: 4, revenue_won: 50000, avg_deal_size: 10000, win_rate: 0.42 },
      { organization_id: 'org-123', user_id: 'user-1', full_name: 'Jane Doe', month: '2024-02', proposals_sent: 15, proposals_won: 7, proposals_lost: 3, revenue_won: 75000, avg_deal_size: 10714, win_rate: 0.47 }
    ]
    vi.mocked(ReportingService.runSalesReport).mockResolvedValue(mockData)
    const request = new NextRequest('http://localhost:3000/api/reports/run/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: { date_from: '2024-01-01', date_to: '2024-12-31' } })
    })
    const response = await POST(request, { params: Promise.resolve({ type: 'sales' }) })
    const data = await response.json()
    expect(response.status).toBe(200)
    expect(data.data).toHaveLength(2)
    expect(data.data[0].revenue_won).toBe(50000)
  })

  it('should run job cost report', async () => {
    const mockData: JobCostRow[] = [{
      organization_id: 'org-123',
      job_id: 'job-1',
      job_number: 'JOB-001',
      title: 'Asbestos Removal',
      customer_name: 'ACME Corp',
      hazard_types: ['asbestos'],
      month: '2024-01',
      estimated_total: 12000,
      actual_labor: 6000,
      actual_materials: 4000,
      actual_total: 10000,
      invoiced: 10000,
      collected: 10000,
      variance: -2000,
      variance_pct: -16.67
    }]
    vi.mocked(ReportingService.runJobCostReport).mockResolvedValue(mockData)
    const request = new NextRequest('http://localhost:3000/api/reports/run/jobs', {
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
    const mockData: LeadSourceRow[] = [{
      organization_id: 'org-123',
      source: 'referral',
      month: '2024-01',
      leads: 25,
      converted: 9,
      total_revenue: 45000,
      conversion_rate: 0.35,
      avg_revenue_per_conversion: 5000
    }]
    vi.mocked(ReportingService.runLeadSourceReport).mockResolvedValue(mockData)
    const request = new NextRequest('http://localhost:3000/api/reports/run/leads', {
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
    const request = new NextRequest('http://localhost:3000/api/reports/run/invalid', {
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
