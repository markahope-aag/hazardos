import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/estimates/[id]/approve/route'

const mockSupabaseClient = {
  auth: { getUser: vi.fn() },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({ single: vi.fn() }))
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({ single: vi.fn() }))
      }))
    }))
  }))
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

describe('POST /api/estimates/[id]/approve', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 for unauthenticated user', async () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null
    })

    const approvalData = {
      notes: 'Trying to approve'
    }

    const request = new NextRequest('http://localhost:3000/api/estimates/est-1/approve', {
      method: 'POST',
      body: JSON.stringify(approvalData)
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'est-1' }) })

    expect(response.status).toBe(401)
  })

  it('should return 403 for unauthorized role', async () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1', email: 'user@example.com' } },
      error: null
    })

    vi.mocked(mockSupabaseClient.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { organization_id: 'org-123', role: 'user' },
            error: null
          })
        })
      })
    } as any)

    const approvalData = {
      notes: 'Trying to approve'
    }

    const request = new NextRequest('http://localhost:3000/api/estimates/est-1/approve', {
      method: 'POST',
      body: JSON.stringify(approvalData)
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'est-1' }) })

    expect(response.status).toBe(403)
  })
})
