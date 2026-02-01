import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock the dependencies
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn()
      }))
    }))
  })),
  rpc: vi.fn()
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}))

// Import the route handlers
import { GET as getJobsByStatus } from '@/app/api/analytics/jobs-by-status/route'
import { GET as getRevenue } from '@/app/api/analytics/revenue/route'
import { createClient } from '@/lib/supabase/server'

describe('Analytics API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/analytics/jobs-by-status', () => {
    it('should return jobs by status for authenticated user', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      // Mock profile data
      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { organization_id: 'org-1' },
              error: null
            })
          })
        })
      } as any)

      const mockJobsStats = [
        { status: 'scheduled', count: 15, total_value: 45000.00 },
        { status: 'in_progress', count: 8, total_value: 32000.00 },
        { status: 'completed', count: 25, total_value: 125000.00 },
        { status: 'cancelled', count: 2, total_value: 3000.00 }
      ]

      // Mock the analytics query
      vi.mocked(mockSupabaseClient.rpc).mockResolvedValue({
        data: mockJobsStats,
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/analytics/jobs-by-status')
      const response = await getJobsByStatus(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.stats).toEqual(mockJobsStats)
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_jobs_by_status', { org_id: 'org-1' })
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

    it('should handle date range filtering', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      // Mock profile data
      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { organization_id: 'org-1' },
              error: null
            })
          })
        })
      } as any)

      vi.mocked(mockSupabaseClient.rpc).mockResolvedValue({
        data: [],
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/analytics/jobs-by-status?from_date=2026-01-01&to_date=2026-01-31')
      await getJobsByStatus(request)

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_jobs_by_status', {
        org_id: 'org-1',
        from_date: '2026-01-01',
        to_date: '2026-01-31'
      })
    })

    it('should handle RPC errors securely', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      // Mock profile data
      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { organization_id: 'org-1' },
              error: null
            })
          })
        })
      } as any)

      // Mock RPC error
      vi.mocked(mockSupabaseClient.rpc).mockResolvedValue({
        data: null,
        error: { message: 'function get_jobs_by_status(org_id uuid) does not exist', code: '42883' }
      })

      const request = new NextRequest('http://localhost:3000/api/analytics/jobs-by-status')
      const response = await getJobsByStatus(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('An internal server error occurred')
      expect(data.type).toBe('INTERNAL_ERROR')
      expect(data.error).not.toContain('function get_jobs_by_status')
    })
  })

  describe('GET /api/analytics/revenue', () => {
    it('should return revenue analytics for authenticated user', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      // Mock profile data
      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { organization_id: 'org-1' },
              error: null
            })
          })
        })
      } as any)

      const mockRevenueStats = {
        total_revenue: 250000.00,
        monthly_revenue: [
          { month: '2026-01', revenue: 45000.00, jobs_completed: 12 },
          { month: '2025-12', revenue: 52000.00, jobs_completed: 15 },
          { month: '2025-11', revenue: 38000.00, jobs_completed: 10 }
        ],
        revenue_by_hazard_type: [
          { hazard_type: 'asbestos', revenue: 180000.00, percentage: 72 },
          { hazard_type: 'lead', revenue: 50000.00, percentage: 20 },
          { hazard_type: 'mold', revenue: 20000.00, percentage: 8 }
        ],
        avg_job_value: 4166.67,
        growth_rate: 12.5
      }

      // Mock the analytics RPC call
      vi.mocked(mockSupabaseClient.rpc).mockResolvedValue({
        data: mockRevenueStats,
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/analytics/revenue')
      const response = await getRevenue(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.analytics).toEqual(mockRevenueStats)
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_revenue_analytics', { org_id: 'org-1' })
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

    it('should handle date range parameters', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      // Mock profile data
      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { organization_id: 'org-1' },
              error: null
            })
          })
        })
      } as any)

      vi.mocked(mockSupabaseClient.rpc).mockResolvedValue({
        data: { total_revenue: 0 },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/analytics/revenue?from_date=2026-01-01&to_date=2026-01-31&hazard_type=asbestos')
      await getRevenue(request)

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_revenue_analytics', {
        org_id: 'org-1',
        from_date: '2026-01-01',
        to_date: '2026-01-31',
        hazard_type: 'asbestos'
      })
    })

    it('should handle RPC function errors securely', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      // Mock profile data
      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { organization_id: 'org-1' },
              error: null
            })
          })
        })
      } as any)

      // Mock RPC error
      vi.mocked(mockSupabaseClient.rpc).mockResolvedValue({
        data: null,
        error: { message: 'function get_revenue_analytics(org_id uuid, from_date date, to_date date) does not exist', code: '42883' }
      })

      const request = new NextRequest('http://localhost:3000/api/analytics/revenue')
      const response = await getRevenue(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('An internal server error occurred')
      expect(data.type).toBe('INTERNAL_ERROR')
      expect(data.error).not.toContain('function get_revenue_analytics')
    })

    it('should handle insufficient permissions', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      // Mock profile data
      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { organization_id: 'org-1' },
              error: null
            })
          })
        })
      } as any)

      // Mock RLS/permission error
      vi.mocked(mockSupabaseClient.rpc).mockResolvedValue({
        data: null,
        error: { message: 'insufficient_privilege: permission denied for function get_revenue_analytics', code: '42501' }
      })

      const request = new NextRequest('http://localhost:3000/api/analytics/revenue')
      const response = await getRevenue(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('You do not have permission to access this resource')
      expect(data.type).toBe('FORBIDDEN')
      expect(data.error).not.toContain('insufficient_privilege')
    })
  })
})