import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/reports/route'
import { ReportingService } from '@/lib/services/reporting-service'

const mockSupabaseClient = {
  auth: { getUser: vi.fn() },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({ single: vi.fn() }))
    }))
  }))
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}))

vi.mock('@/lib/services/reporting-service', () => ({
  ReportingService: {
    listReports: vi.fn(),
    createReport: vi.fn()
  }
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

describe('Reports API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockProfile = {
    organization_id: '550e8400-e29b-41d4-a716-446655440000',
    role: 'admin'
  }

  const setupAuthenticatedUser = () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1', email: 'admin@example.com' } },
      error: null
    })

    vi.mocked(mockSupabaseClient.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null
          })
        })
      })
    } as any)
  }

  describe('GET /api/reports', () => {
    it('should list all reports', async () => {
      setupAuthenticatedUser()

      const mockReports = [
        { id: 'report-1', name: 'Monthly Revenue', report_type: 'revenue' },
        { id: 'report-2', name: 'Job Completion', report_type: 'jobs' }
      ]

      vi.mocked(ReportingService.listReports).mockResolvedValue(mockReports)

      const request = new NextRequest('http://localhost:3000/api/reports')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockReports)
    })

    it('should return 401 for unauthenticated user', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/reports')
      const response = await GET(request)

      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/reports', () => {
    it('should create a new report', async () => {
      setupAuthenticatedUser()

      const mockReport = {
        id: 'report-1',
        name: 'Q1 Revenue',
        report_type: 'revenue'
      }

      vi.mocked(ReportingService.createReport).mockResolvedValue(mockReport)

      const reportData = {
        name: 'Q1 Revenue',
        report_type: 'revenue',
        config: {
          date_range: { type: 'this_quarter' },
          filters: [],
          metrics: ['total_revenue'],
          columns: [{ field: 'revenue', label: 'Revenue', visible: true }],
          chart_type: 'bar'
        }
      }

      const request = new NextRequest('http://localhost:3000/api/reports', {
        method: 'POST',
        body: JSON.stringify(reportData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toEqual(mockReport)
    })

    it('should return 401 for unauthenticated user', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const reportData = {
        name: 'Q1 Revenue',
        report_type: 'revenue',
        config: {
          date_range: { type: 'this_quarter' },
          filters: [],
          metrics: ['total_revenue'],
          columns: [{ field: 'revenue', label: 'Revenue', visible: true }],
          chart_type: 'bar'
        }
      }

      const request = new NextRequest('http://localhost:3000/api/reports', {
        method: 'POST',
        body: JSON.stringify(reportData)
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
    })
  })
})
