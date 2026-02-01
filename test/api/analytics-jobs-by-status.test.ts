import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/analytics/jobs-by-status/route'

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

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

describe('GET /api/analytics/jobs-by-status', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockProfile = {
    organization_id: 'org-123',
    role: 'user'
  }

  it('should return job counts by status for authenticated user', async () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1', email: 'user@example.com' } },
      error: null
    })

    let callCount = 0
    vi.mocked(mockSupabaseClient.from).mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockImplementation((field, value) => {
          if (callCount === 0) {
            callCount++
            return { single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }) }
          }
          const counts = { scheduled: 5, in_progress: 3, completed: 10, invoiced: 2, paid: 8 }
          return Promise.resolve({ count: counts[value as keyof typeof counts] || 0 })
        })
      })
    } as any))

    const request = new NextRequest('http://localhost:3000/api/analytics/jobs-by-status')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBeGreaterThan(0)
  })

  it('should return 401 for unauthenticated user', async () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null
    })

    const request = new NextRequest('http://localhost:3000/api/analytics/jobs-by-status')
    const response = await GET(request)

    expect(response.status).toBe(401)
  })

  it('should handle empty results', async () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1', email: 'user@example.com' } },
      error: null
    })

    let callCount = 0
    vi.mocked(mockSupabaseClient.from).mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockImplementation(() => {
          if (callCount === 0) {
            callCount++
            return { single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }) }
          }
          return Promise.resolve({ count: 0 })
        })
      })
    } as any))

    const request = new NextRequest('http://localhost:3000/api/analytics/jobs-by-status')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(Array.isArray(data)).toBe(true)
  })
})
