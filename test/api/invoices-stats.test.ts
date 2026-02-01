import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/invoices/stats/route'

const mockSupabaseClient = {
  auth: { getUser: vi.fn() },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn()
      }))
    }))
  }))
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}))

vi.mock('@/lib/services/invoices-service', () => ({
  InvoicesService: {
    getStats: vi.fn(),
  },
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

import { InvoicesService } from '@/lib/services/invoices-service'

describe('Invoice Stats API', () => {
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

  describe('GET /api/invoices/stats', () => {
    it('should return invoice statistics', async () => {
      setupAuthenticatedUser()

      const mockStats = {
        total_invoices: 100,
        total_amount: 250000,
        paid_amount: 200000,
        outstanding_amount: 50000,
        overdue_amount: 10000,
        draft_count: 5,
        sent_count: 15,
        paid_count: 80,
      }
      vi.mocked(InvoicesService.getStats).mockResolvedValue(mockStats)

      const request = new NextRequest('http://localhost:3000/api/invoices/stats')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockStats)
      expect(InvoicesService.getStats).toHaveBeenCalled()
    })

    it('should handle empty statistics', async () => {
      setupAuthenticatedUser()

      const emptyStats = {
        total_invoices: 0,
        total_amount: 0,
        paid_amount: 0,
        outstanding_amount: 0,
      }
      vi.mocked(InvoicesService.getStats).mockResolvedValue(emptyStats)

      const request = new NextRequest('http://localhost:3000/api/invoices/stats')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.total_invoices).toBe(0)
    })

    it('should return stats with payment rate calculation', async () => {
      setupAuthenticatedUser()

      const statsWithRate = {
        total_invoices: 50,
        paid_count: 40,
        payment_rate: 80,
      }
      vi.mocked(InvoicesService.getStats).mockResolvedValue(statsWithRate)

      const request = new NextRequest('http://localhost:3000/api/invoices/stats')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.payment_rate).toBe(80)
    })
  })
})
