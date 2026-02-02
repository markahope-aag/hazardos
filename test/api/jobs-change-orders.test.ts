import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST, PATCH } from '@/app/api/jobs/[id]/change-orders/route'
import { JobsService } from '@/lib/services/jobs-service'

const mockSupabaseClient = {
  auth: { getUser: vi.fn() },
  from: vi.fn()
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}))

vi.mock('@/lib/services/jobs-service', () => ({
  JobsService: {
    addChangeOrder: vi.fn(),
    approveChangeOrder: vi.fn(),
    rejectChangeOrder: vi.fn()
  }
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

  describe('POST /api/jobs/[id]/change-orders', () => {
    it('should create a change order', async () => {
      setupAuthenticatedUser()

      const newChangeOrder = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        job_id: 'job-123',
        description: 'Additional work required',
        amount: 500,
        status: 'pending'
      }
      vi.mocked(JobsService.addChangeOrder).mockResolvedValue(newChangeOrder)

      const request = new NextRequest('http://localhost:3000/api/jobs/job-123/change-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: 'Additional work required',
          amount: 500
        })
      })

      const response = await POST(request, { params: { id: 'job-123' } })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.description).toBe('Additional work required')
      expect(JobsService.addChangeOrder).toHaveBeenCalledWith('job-123', expect.any(Object))
    })

    it('should return 401 for unauthenticated user', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/jobs/job-123/change-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: 'Work',
          amount: 500
        })
      })

      const response = await POST(request, { params: { id: 'job-123' } })

      expect(response.status).toBe(401)
    })

    it('should validate required fields', async () => {
      setupAuthenticatedUser()

      const request = new NextRequest('http://localhost:3000/api/jobs/job-123/change-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: 'Work'
          // Missing amount
        })
      })

      const response = await POST(request, { params: { id: 'job-123' } })

      expect(response.status).toBe(400)
    })
  })

  describe('PATCH /api/jobs/[id]/change-orders', () => {
    it('should approve a change order', async () => {
      setupAuthenticatedUser()

      const approvedChangeOrder = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        status: 'approved',
        approved_at: '2026-03-01T10:00:00Z'
      }
      vi.mocked(JobsService.approveChangeOrder).mockResolvedValue(approvedChangeOrder)

      const request = new NextRequest('http://localhost:3000/api/jobs/job-123/change-orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          change_order_id: '550e8400-e29b-41d4-a716-446655440001',
          action: 'approve'
        })
      })

      const response = await PATCH(request, { params: { id: 'job-123' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('approved')
      expect(JobsService.approveChangeOrder).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440001')
    })

    it('should reject a change order', async () => {
      setupAuthenticatedUser()

      const rejectedChangeOrder = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        status: 'rejected',
        rejected_at: '2026-03-01T10:00:00Z'
      }
      vi.mocked(JobsService.rejectChangeOrder).mockResolvedValue(rejectedChangeOrder)

      const request = new NextRequest('http://localhost:3000/api/jobs/job-123/change-orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          change_order_id: '550e8400-e29b-41d4-a716-446655440001',
          action: 'reject'
        })
      })

      const response = await PATCH(request, { params: { id: 'job-123' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('rejected')
      expect(JobsService.rejectChangeOrder).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440001')
    })

    it('should validate required fields', async () => {
      setupAuthenticatedUser()

      const request = new NextRequest('http://localhost:3000/api/jobs/job-123/change-orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Missing change_order_id and action
        })
      })

      const response = await PATCH(request, { params: { id: 'job-123' } })

      expect(response.status).toBe(400)
    })
  })
})
