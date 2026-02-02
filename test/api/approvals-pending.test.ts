import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/approvals/pending/route'

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

describe('Approvals Pending API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/approvals/pending', () => {
    it('should return pending approvals', async () => {
      const mockApprovals = [
        {
          id: 'approval-1',
          entity_type: 'estimate',
          final_status: 'pending',
          level1_status: 'pending',
          created_at: '2026-03-01',
          requester: { full_name: 'John Doe' }
        },
        {
          id: 'approval-2',
          entity_type: 'job_completion',
          final_status: 'pending',
          level1_status: 'pending',
          created_at: '2026-03-02',
          requester: { full_name: 'Jane Smith' }
        },
      ]

      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-123', email: 'user@example.com' } },
        error: null,
      })

      vi.mocked(mockSupabaseClient.from).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { organization_id: 'org-123', role: 'admin' },
                  error: null
                })
              })
            })
          } as any
        }
        if (table === 'approval_requests') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: mockApprovals,
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
                data: null,
                error: null
              })
            })
          })
        } as any
      })

      const request = new NextRequest('http://localhost:3000/api/approvals/pending')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBeTruthy()
      expect(data.length).toBe(2)
    })

    it('should return empty array when no pending approvals', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-123', email: 'user@example.com' } },
        error: null,
      })

      vi.mocked(mockSupabaseClient.from).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { organization_id: 'org-123', role: 'admin' },
                  error: null
                })
              })
            })
          } as any
        }
        if (table === 'approval_requests') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [],
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
                data: null,
                error: null
              })
            })
          })
        } as any
      })

      const request = new NextRequest('http://localhost:3000/api/approvals/pending')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBeTruthy()
      expect(data.length).toBe(0)
    })
  })
})
