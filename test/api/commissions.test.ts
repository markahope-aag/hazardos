import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/commissions/route'
import { CommissionService } from '@/lib/services/commission-service'

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
    getEarnings: vi.fn(),
    createEarning: vi.fn()
  }
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

describe('Commissions API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockProfile = {
    organization_id: 'org-123',
    role: 'user'
  }

  describe('GET /api/commissions', () => {
    it('should get commission earnings', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'user@example.com' } },
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

      const mockEarnings = [
        { id: 'earn-1', amount: 500, status: 'pending', job_id: 'job-1' },
        { id: 'earn-2', amount: 750, status: 'paid', job_id: 'job-2' }
      ]

      vi.mocked(CommissionService.getEarnings).mockResolvedValue(mockEarnings)

      const request = new NextRequest('http://localhost:3000/api/commissions')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockEarnings)
    })

    it('should filter by user_id', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'user@example.com' } },
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

      vi.mocked(CommissionService.getEarnings).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/commissions?user_id=user-123')
      await GET(request)

      expect(CommissionService.getEarnings).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 'user-123' })
      )
    })
  })

  describe('POST /api/commissions', () => {
    it('should create commission earning', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'user@example.com' } },
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

      const mockEarning = {
        id: 'earn-1',
        user_id: 'user-1',
        amount: 500,
        job_id: 'job-123'
      }

      vi.mocked(CommissionService.createEarning).mockResolvedValue(mockEarning)

      const earningData = {
        user_id: 'user-1',
        plan_id: 'plan-1',
        job_id: 'job-123',
        base_amount: 10000
      }

      const request = new NextRequest('http://localhost:3000/api/commissions', {
        method: 'POST',
        body: JSON.stringify(earningData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockEarning)
    })
  })
})
