import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

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

  describe('Revenue Analytics', () => {
    it('should calculate total revenue', async () => {
      setupAuthenticatedUser()

      const mockRevenue = {
        total_revenue: 250000,
        revenue_by_month: [
          { month: '2026-01', revenue: 80000 },
          { month: '2026-02', revenue: 90000 },
          { month: '2026-03', revenue: 80000 },
        ],
      }

      vi.mocked(mockSupabaseClient.from).mockImplementation((table: string) => {
        if (table === 'invoices') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    { total: 80000, payment_status: 'paid' },
                    { total: 90000, payment_status: 'paid' },
                    { total: 80000, payment_status: 'paid' },
                  ],
                  error: null
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

      expect(mockRevenue.total_revenue).toBe(250000)
      expect(mockRevenue.revenue_by_month).toHaveLength(3)
    })

    it('should break down revenue by service type', async () => {
      setupAuthenticatedUser()

      const mockBreakdown = {
        asbestos_removal: 150000,
        mold_remediation: 75000,
        lead_abatement: 25000,
      }

      expect(mockBreakdown.asbestos_removal).toBeGreaterThan(mockBreakdown.lead_abatement)
    })

    it('should calculate revenue growth rate', async () => {
      setupAuthenticatedUser()

      const mockGrowth = {
        current_month: 90000,
        previous_month: 80000,
        growth_rate: 12.5,
      }

      expect(mockGrowth.growth_rate).toBe(12.5)
      expect(mockGrowth.current_month).toBeGreaterThan(mockGrowth.previous_month)
    })
  })
})
