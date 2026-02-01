import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/approvals/route'
import { ApprovalService } from '@/lib/services/approval-service'

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

vi.mock('@/lib/services/approval-service', () => ({
  ApprovalService: {
    getRequests: vi.fn(),
    createRequest: vi.fn()
  }
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

describe('Approvals API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockProfile = {
    organization_id: 'org-123',
    role: 'admin'
  }

  describe('GET /api/approvals', () => {
    it('should list approval requests', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'admin@example.com' } },
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

      const mockRequests = [
        { id: 'approval-1', entity_type: 'estimate', status: 'pending', amount: 5000 },
        { id: 'approval-2', entity_type: 'change_order', status: 'approved', amount: 2000 }
      ]

      vi.mocked(ApprovalService.getRequests).mockResolvedValue(mockRequests)

      const request = new NextRequest('http://localhost:3000/api/approvals')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockRequests)
    })

    it('should filter by entity type', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'admin@example.com' } },
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

      vi.mocked(ApprovalService.getRequests).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/approvals?entity_type=estimate')
      await GET(request)

      expect(ApprovalService.getRequests).toHaveBeenCalledWith(
        expect.objectContaining({ entity_type: 'estimate' })
      )
    })

    it('should filter pending only', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'admin@example.com' } },
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

      vi.mocked(ApprovalService.getRequests).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/approvals?pending_only=true')
      await GET(request)

      expect(ApprovalService.getRequests).toHaveBeenCalledWith(
        expect.objectContaining({ pending_only: true })
      )
    })
  })

  describe('POST /api/approvals', () => {
    it('should create approval request', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'admin@example.com' } },
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

      const mockRequest = {
        id: 'approval-1',
        entity_type: 'estimate',
        entity_id: 'est-123',
        amount: 5000,
        status: 'pending'
      }

      vi.mocked(ApprovalService.createRequest).mockResolvedValue(mockRequest)

      const approvalData = {
        entity_type: 'estimate',
        entity_id: 'est-123',
        amount: 5000
      }

      const request = new NextRequest('http://localhost:3000/api/approvals', {
        method: 'POST',
        body: JSON.stringify(approvalData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockRequest)
    })

    it('should return 401 for unauthenticated user', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const approvalData = {
        entity_type: 'estimate',
        entity_id: 'est-123',
        amount: 5000
      }

      const request = new NextRequest('http://localhost:3000/api/approvals', {
        method: 'POST',
        body: JSON.stringify(approvalData)
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
    })
  })
})
