import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/analytics/revenue/route'
import { format, subMonths } from 'date-fns'

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

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/analytics/revenue', () => {
    it('should return revenue data for last 6 months', async () => {
      setupAuthenticatedUser()

      const mockPayments = [
        { amount: 1000, payment_date: format(new Date(), 'yyyy-MM-dd') },
        { amount: 1500, payment_date: format(subMonths(new Date(), 1), 'yyyy-MM-dd') },
        { amount: 2000, payment_date: format(subMonths(new Date(), 2), 'yyyy-MM-dd') },
      ]

      vi.mocked(mockSupabaseClient.from).mockImplementation((table: string) => {
        if (table === 'payments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  lte: vi.fn().mockResolvedValue({
                    data: mockPayments,
                    error: null
                  })
                })
              })
            })
          } as any
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockProfile,
                error: null
              })
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

    it('should return zero revenue for months with no payments', async () => {
      setupAuthenticatedUser()

      vi.mocked(mockSupabaseClient.from).mockImplementation((table: string) => {
        if (table === 'payments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  lte: vi.fn().mockResolvedValue({
                    data: [],
                    error: null
                  })
                })
              })
            })
          } as any
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockProfile,
                error: null
              })
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
        if (table === 'payments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  lte: vi.fn().mockResolvedValue({
                    data: null,
                    error: new Error('Database connection failed')
                  })
                })
              })
            })
          } as any
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockProfile,
                error: null
              })
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

    it('should aggregate payments correctly by month', async () => {
      setupAuthenticatedUser()

      const currentMonth = format(new Date(), 'yyyy-MM')
      const mockPayments = [
        { amount: 1000, payment_date: format(new Date(), 'yyyy-MM-dd') },
        { amount: 500, payment_date: format(new Date(), 'yyyy-MM-dd') },
      ]

      vi.mocked(mockSupabaseClient.from).mockImplementation((table: string) => {
        if (table === 'payments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  lte: vi.fn().mockResolvedValue({
                    data: mockPayments,
                    error: null
                  })
                })
              })
            })
          } as any
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockProfile,
                error: null
              })
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
  })
})
