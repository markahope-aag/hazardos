import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock the dependencies
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn()
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

// Import the route handlers
import { GET as getJobsByStatus } from '@/app/api/analytics/jobs-by-status/route'
import { GET as getRevenue } from '@/app/api/analytics/revenue/route'

describe('Analytics API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockProfile = {
    organization_id: '550e8400-e29b-41d4-a716-446655440000',
    role: 'admin'
  }

  const _setupAuthenticatedUser = () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1', email: 'test@example.com' } },
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

  // The jobs-by-status endpoint chains .select().eq().gte().lte() (and
  // optionally .in() when a hazard filter is active). A flat
  // mockReturnValue chain breaks at .gte. This proxy makes any depth of
  // chain resolve to the supplied payload.
  function makeChainableResult(payload: { data?: unknown; count?: number | null; error?: unknown }) {
    type Proxied = ((...args: unknown[]) => Proxied) & { then?: unknown }
    const proxy: Proxied = new Proxy((() => proxy) as Proxied, {
      get(_target, prop) {
        if (prop === 'then') {
          return (onFulfilled: (value: unknown) => unknown) =>
            Promise.resolve({ data: [], count: 0, error: null, ...payload }).then(onFulfilled)
        }
        return proxy
      },
      apply() {
        return proxy
      },
    }) as Proxied
    return proxy
  }

  describe('GET /api/analytics/jobs-by-status', () => {
    it('should return jobs by status for authenticated user', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      const mockJobs = [
        { status: 'scheduled' },
        { status: 'scheduled' },
        { status: 'in_progress' },
        { status: 'completed' },
        { status: 'completed' },
        { status: 'completed' }
      ]

      vi.mocked(mockSupabaseClient.from).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockProfile, error: null })
              })
            })
          } as unknown as ReturnType<typeof mockSupabaseClient.from>
        }
        if (table === 'jobs') {
          return makeChainableResult({ data: mockJobs, error: null })
        }
        return makeChainableResult({ data: [], error: null })
      })

      const request = new NextRequest('http://localhost:3000/api/analytics/jobs-by-status')
      const response = await getJobsByStatus(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      // New shape: { total, buckets }
      expect(data).toHaveProperty('total')
      expect(data).toHaveProperty('buckets')
      expect(data.total).toBe(6)
      expect(Array.isArray(data.buckets)).toBe(true)
      expect(data.buckets.length).toBeGreaterThan(0)
    })

    it('should return 401 for unauthenticated user', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/analytics/jobs-by-status')
      const response = await getJobsByStatus(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication is required')
      expect(data.type).toBe('UNAUTHORIZED')
    })

    it('should handle empty results', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      vi.mocked(mockSupabaseClient.from).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockProfile, error: null })
              })
            })
          } as unknown as ReturnType<typeof mockSupabaseClient.from>
        }
        return makeChainableResult({ data: [], error: null })
      })

      const request = new NextRequest('http://localhost:3000/api/analytics/jobs-by-status')
      const response = await getJobsByStatus(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.total).toBe(0)
      expect(data.buckets).toEqual([])
    })

    it('should handle database errors securely', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      let callCount = 0
      vi.mocked(mockSupabaseClient.from).mockImplementation(() => {
        callCount++
        if (callCount === 1) {
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
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database connection failed', code: 'PGRST301' }
            })
          })
        } as any
      })

      const request = new NextRequest('http://localhost:3000/api/analytics/jobs-by-status')
      const response = await getJobsByStatus(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('An internal server error occurred')
      expect(data.type).toBe('INTERNAL_ERROR')
    })
  })

  describe('GET /api/analytics/revenue', () => {
    it('should return revenue analytics for authenticated user', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      const mockPayments = [
        { amount: 1000, payment_date: '2026-01-15' },
        { amount: 2500, payment_date: '2026-01-20' }
      ]

      let callCount = 0
      vi.mocked(mockSupabaseClient.from).mockImplementation(() => {
        callCount++
        if (callCount === 1) {
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
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  lte: vi.fn().mockResolvedValue({
                    data: mockPayments,
                    error: null
                  })
                })
              })
            })
          })
        } as any
      })

      const request = new NextRequest('http://localhost:3000/api/analytics/revenue')
      const response = await getRevenue(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBe(6) // 6 months of data
    })

    it('should return 401 for unauthenticated user', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/analytics/revenue')
      const response = await getRevenue(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication is required')
      expect(data.type).toBe('UNAUTHORIZED')
    })

    it('should handle database errors securely', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      let callCount = 0
      vi.mocked(mockSupabaseClient.from).mockImplementation(() => {
        callCount++
        if (callCount === 1) {
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
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  lte: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Permission denied for relation jobs', code: '42501' }
                  })
                })
              })
            })
          })
        } as any
      })

      const request = new NextRequest('http://localhost:3000/api/analytics/revenue')
      const response = await getRevenue(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('An internal server error occurred')
      expect(data.type).toBe('INTERNAL_ERROR')
      expect(data.error).not.toContain('Permission denied')
    })

    it('should handle empty payments', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      let callCount = 0
      vi.mocked(mockSupabaseClient.from).mockImplementation(() => {
        callCount++
        if (callCount === 1) {
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
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  lte: vi.fn().mockResolvedValue({
                    data: [],
                    error: null
                  })
                })
              })
            })
          })
        } as any
      })

      const request = new NextRequest('http://localhost:3000/api/analytics/revenue')
      const response = await getRevenue(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      // All months should have 0 revenue
      expect(data.every((d: { revenue: number }) => d.revenue === 0)).toBe(true)
    })
  })
})
