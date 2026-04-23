import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/analytics/revenue/route'
import { format, subMonths } from 'date-fns'

// Revenue aggregation switched from the `payments` table to
// `jobs.actual_revenue` (falling back to final_amount / contract_amount)
// bucketed by scheduled_start_date. These tests mock the new jobs query
// shape accordingly.

const mockSupabaseClient = {
  auth: { getUser: vi.fn() },
  from: vi.fn()
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

describe('Analytics Revenue API', () => {
  const mockProfile = {
    organization_id: 'org-123',
    role: 'user'
  }

  const setupAuthenticatedUser = () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-123', email: 'user@example.com' } },
      error: null,
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

  // The jobs query chains select → eq → in → gte → lte, resolving with
  // rows carrying actual_revenue / final_amount / contract_amount and
  // scheduled_start_date. This helper builds a mock matching that shape.
  const mockJobsResponse = (jobs: Array<{
    actual_revenue?: number | null
    contract_amount?: number | null
    final_amount?: number | null
    scheduled_start_date?: string | null
    status?: string
  }>, error: unknown = null) => ({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        in: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            lte: vi.fn().mockResolvedValue({
              data: jobs,
              error,
            })
          })
        })
      })
    })
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/analytics/revenue', () => {
    it('should return revenue data for last 6 months', async () => {
      setupAuthenticatedUser()

      const mockJobs = [
        { actual_revenue: 1000, scheduled_start_date: format(new Date(), 'yyyy-MM-dd'), status: 'completed' },
        { actual_revenue: 1500, scheduled_start_date: format(subMonths(new Date(), 1), 'yyyy-MM-dd'), status: 'completed' },
        { actual_revenue: 2000, scheduled_start_date: format(subMonths(new Date(), 2), 'yyyy-MM-dd'), status: 'completed' },
      ]

      vi.mocked(mockSupabaseClient.from).mockImplementation((table: string) => {
        if (table === 'jobs') return mockJobsResponse(mockJobs) as any
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockProfile, error: null })
            })
          })
        } as any
      })

      const request = new NextRequest('http://localhost:3000/api/analytics/revenue')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      expect(data).toHaveLength(6)
      expect(data[0]).toHaveProperty('month')
      expect(data[0]).toHaveProperty('revenue')
    })

    it('should return 401 for unauthenticated user', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/analytics/revenue')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication is required')
      expect(data.type).toBe('UNAUTHORIZED')
    })

    it('should return zero revenue for months with no completed jobs', async () => {
      setupAuthenticatedUser()

      vi.mocked(mockSupabaseClient.from).mockImplementation((table: string) => {
        if (table === 'jobs') return mockJobsResponse([]) as any
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockProfile, error: null })
            })
          })
        } as any
      })

      const request = new NextRequest('http://localhost:3000/api/analytics/revenue')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(6)
      expect(data.every((month: any) => month.revenue === 0)).toBe(true)
    })

    it('should handle database errors securely', async () => {
      setupAuthenticatedUser()

      vi.mocked(mockSupabaseClient.from).mockImplementation((table: string) => {
        if (table === 'jobs') {
          return mockJobsResponse(null as any, new Error('Database connection failed')) as any
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockProfile, error: null })
            })
          })
        } as any
      })

      const request = new NextRequest('http://localhost:3000/api/analytics/revenue')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('An internal server error occurred')
      expect(data.type).toBe('INTERNAL_ERROR')
    })

    it('should aggregate job revenue correctly by month', async () => {
      setupAuthenticatedUser()

      const mockJobs = [
        { actual_revenue: 1000, scheduled_start_date: format(new Date(), 'yyyy-MM-dd'), status: 'completed' },
        { actual_revenue: 500, scheduled_start_date: format(new Date(), 'yyyy-MM-dd'), status: 'completed' },
      ]

      vi.mocked(mockSupabaseClient.from).mockImplementation((table: string) => {
        if (table === 'jobs') return mockJobsResponse(mockJobs) as any
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockProfile, error: null })
            })
          })
        } as any
      })

      const request = new NextRequest('http://localhost:3000/api/analytics/revenue')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      const currentMonthData = data.find((item: any) => item.month === format(new Date(), 'MMM'))
      expect(currentMonthData?.revenue).toBe(1500)
    })

    it('falls back to final_amount then contract_amount when actual_revenue is null', async () => {
      setupAuthenticatedUser()

      const todayStr = format(new Date(), 'yyyy-MM-dd')
      const mockJobs = [
        { actual_revenue: null, final_amount: 800, contract_amount: 1000, scheduled_start_date: todayStr, status: 'completed' },
        { actual_revenue: null, final_amount: null, contract_amount: 600, scheduled_start_date: todayStr, status: 'invoiced' },
      ]

      vi.mocked(mockSupabaseClient.from).mockImplementation((table: string) => {
        if (table === 'jobs') return mockJobsResponse(mockJobs) as any
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockProfile, error: null })
            })
          })
        } as any
      })

      const request = new NextRequest('http://localhost:3000/api/analytics/revenue')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      const currentMonthData = data.find((item: any) => item.month === format(new Date(), 'MMM'))
      // 800 (final_amount fallback) + 600 (contract_amount fallback) = 1400
      expect(currentMonthData?.revenue).toBe(1400)
    })
  })
})
