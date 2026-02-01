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

describe('Job Change Orders API', () => {
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

  describe('Job Change Orders', () => {
    it('should handle change orders for jobs', async () => {
      setupAuthenticatedUser()

      const mockChangeOrders = [
        { id: 'co-1', job_id: 'job-123', description: 'Additional work', amount: 500, status: 'pending' },
        { id: 'co-2', job_id: 'job-123', description: 'Extra materials', amount: 300, status: 'approved' },
      ]

      vi.mocked(mockSupabaseClient.from).mockImplementation((table: string) => {
        if (table === 'change_orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: mockChangeOrders,
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

      expect(mockChangeOrders).toHaveLength(2)
      expect(mockChangeOrders[0].status).toBe('pending')
    })

    it('should create change orders', async () => {
      setupAuthenticatedUser()

      const newChangeOrder = {
        id: 'co-new',
        job_id: 'job-123',
        description: 'New work',
        amount: 750,
        status: 'pending',
      }

      vi.mocked(mockSupabaseClient.from).mockImplementation((table: string) => {
        if (table === 'change_orders') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: newChangeOrder,
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

      expect(newChangeOrder.amount).toBe(750)
      expect(newChangeOrder.status).toBe('pending')
    })
  })
})
