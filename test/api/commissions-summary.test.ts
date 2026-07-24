import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/commissions/summary/route'

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

vi.mock('@/lib/services/commission-service', () => ({
  CommissionService: {
    getSummary: vi.fn()
  }
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

import { CommissionService } from '@/lib/services/commission-service'
import type { CommissionSummary } from '@/types/sales'

describe('Commission Summary API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockProfile = {
    organization_id: 'org-123',
    role: 'admin'
  }

  describe('GET /api/commissions/summary', () => {
    it('should return commission summary for all users', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
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

      const mockSummary: CommissionSummary = {
        total_pending: 5000,
        total_approved: 0,
        total_paid: 10000,
        this_month: 15000,
        this_quarter: 15000
      }

      vi.mocked(CommissionService.getSummary).mockResolvedValue(mockSummary)

      const request = new NextRequest('http://localhost:3000/api/commissions/summary')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.this_month).toBe(15000)
      expect(data.total_paid).toBe(10000)
      expect(CommissionService.getSummary).toHaveBeenCalledWith(undefined)
    })

    it('should return commission summary for specific user', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
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

      const mockSummary: CommissionSummary = {
        total_pending: 2000,
        total_approved: 0,
        total_paid: 3000,
        this_month: 5000,
        this_quarter: 5000
      }

      vi.mocked(CommissionService.getSummary).mockResolvedValue(mockSummary)

      const request = new NextRequest('http://localhost:3000/api/commissions/summary?user_id=550e8400-e29b-41d4-a716-446655440012')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.this_month).toBe(5000)
      expect(CommissionService.getSummary).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440012')
    })

    it('should reject unauthenticated requests', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/commissions/summary')

      // Act
      const response = await GET(request)

      // Assert
      expect(response.status).toBe(401)
    })
  })
})
