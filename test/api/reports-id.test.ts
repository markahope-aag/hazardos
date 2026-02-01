import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, PATCH, DELETE } from '@/app/api/reports/[id]/route'
import { ReportingService } from '@/lib/services/reporting-service'

vi.mock('@/lib/services/reporting-service', () => ({
  ReportingService: {
    getReport: vi.fn(),
    updateReport: vi.fn(),
    deleteReport: vi.fn()
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
            log: { info: vi.fn(), error: vi.fn() },
            requestId: 'test-id'
          }
          const params = await props.params
          let body = {}
          if (options.bodySchema && request.method === 'PATCH') {
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

describe('Reports ID API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/reports/[id]', () => {
    it('should get a report by ID', async () => {
      const mockReport = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Sales Report',
        type: 'sales',
        config: { date_from: '2024-01-01', date_to: '2024-12-31' },
        created_at: new Date().toISOString()
      }
      vi.mocked(ReportingService.getReport).mockResolvedValue(mockReport)
      const request = new NextRequest('http://localhost:3000/api/reports/550e8400-e29b-41d4-a716-446655440001')
      const response = await GET(request, { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440001' }) })
      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.name).toBe('Sales Report')
      expect(ReportingService.getReport).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440001')
    })

    it('should return 404 when report not found', async () => {
      vi.mocked(ReportingService.getReport).mockResolvedValue(null)
      const request = new NextRequest('http://localhost:3000/api/reports/nonexistent')
      const response = await GET(request, { params: Promise.resolve({ id: 'nonexistent' }) })
      const data = await response.json()
      expect(response.status).toBe(404)
      expect(data.error).toBeTruthy()
    })
  })

  describe('PATCH /api/reports/[id]', () => {
    it('should update a report', async () => {
      const mockUpdatedReport = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Updated Sales Report',
        config: { date_from: '2024-06-01' }
      }
      vi.mocked(ReportingService.updateReport).mockResolvedValue(mockUpdatedReport)
      const request = new NextRequest('http://localhost:3000/api/reports/550e8400-e29b-41d4-a716-446655440001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated Sales Report', config: { date_from: '2024-06-01' } })
      })
      const response = await PATCH(request, { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440001' }) })
      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.name).toBe('Updated Sales Report')
    })
  })

  describe('DELETE /api/reports/[id]', () => {
    it('should delete a report', async () => {
      vi.mocked(ReportingService.deleteReport).mockResolvedValue(undefined)
      const request = new NextRequest('http://localhost:3000/api/reports/550e8400-e29b-41d4-a716-446655440001', { method: 'DELETE' })
      const response = await DELETE(request, { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440001' }) })
      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(ReportingService.deleteReport).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440001')
    })
  })
})
