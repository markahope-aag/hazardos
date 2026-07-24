import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/commissions/route'
import { CommissionService } from '@/lib/services/commission-service'
import type { CommissionEarning } from '@/types/sales'

function buildMockEarning(overrides: Partial<CommissionEarning>): CommissionEarning {
  return {
    id: 'earn-1',
    organization_id: '550e8400-e29b-41d4-a716-446655440000',
    user_id: 'user-456',
    plan_id: '550e8400-e29b-41d4-a716-446655440006',
    opportunity_id: null,
    job_id: null,
    invoice_id: null,
    base_amount: 5000,
    commission_rate: 0.1,
    commission_amount: 500,
    status: 'pending',
    approved_by: null,
    approved_at: null,
    rejected_by: null,
    rejected_at: null,
    rejection_reason: null,
    paid_at: null,
    earning_date: new Date().toISOString(),
    pay_period: null,
    created_at: new Date().toISOString(),
    ...overrides
  }
}

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
    organization_id: '550e8400-e29b-41d4-a716-446655440000',
    role: 'admin'
  }

  const setupAuthenticatedUser = () => {
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
  }

  describe('GET /api/commissions', () => {
    it('should get commission earnings', async () => {
      setupAuthenticatedUser()

      const mockEarnings = {
        earnings: [
          buildMockEarning({ id: 'earn-1', commission_amount: 500, status: 'pending', job_id: '550e8400-e29b-41d4-a716-446655440001' }),
          buildMockEarning({ id: 'earn-2', commission_amount: 750, status: 'paid', job_id: '550e8400-e29b-41d4-a716-446655440002' })
        ],
        total: 2,
        limit: 20,
        offset: 0
      }

      vi.mocked(CommissionService.getEarnings).mockResolvedValue(mockEarnings)

      const request = new NextRequest('http://localhost:3000/api/commissions')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockEarnings)
    })

    it('should filter by user_id with valid UUID', async () => {
      setupAuthenticatedUser()

      vi.mocked(CommissionService.getEarnings).mockResolvedValue({ earnings: [], total: 0, limit: 20, offset: 0 })

      const userId = '550e8400-e29b-41d4-a716-446655440003'
      const request = new NextRequest(`http://localhost:3000/api/commissions?user_id=${userId}`)
      await GET(request)

      expect(CommissionService.getEarnings).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: userId })
      )
    })

    it('should return 401 for unauthenticated user', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/commissions')
      const response = await GET(request)

      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/commissions', () => {
    it('should create commission earning', async () => {
      setupAuthenticatedUser()

      const mockEarning = buildMockEarning({
        id: 'earn-1',
        user_id: '550e8400-e29b-41d4-a716-446655440004',
        commission_amount: 500,
        job_id: '550e8400-e29b-41d4-a716-446655440005'
      })

      vi.mocked(CommissionService.createEarning).mockResolvedValue(mockEarning)

      const earningData = {
        user_id: '550e8400-e29b-41d4-a716-446655440004',
        plan_id: '550e8400-e29b-41d4-a716-446655440006',
        job_id: '550e8400-e29b-41d4-a716-446655440005',
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

    it('should return 401 for unauthenticated user', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const earningData = {
        user_id: '550e8400-e29b-41d4-a716-446655440004',
        plan_id: '550e8400-e29b-41d4-a716-446655440006',
        job_id: '550e8400-e29b-41d4-a716-446655440005',
        base_amount: 10000
      }

      const request = new NextRequest('http://localhost:3000/api/commissions', {
        method: 'POST',
        body: JSON.stringify(earningData)
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
    })
  })
})
