import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/analytics/jobs-by-status/route'

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

describe('GET /api/analytics/jobs-by-status', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockProfile = {
    organization_id: '550e8400-e29b-41d4-a716-446655440000',
    role: 'user'
  }

  it('should return job counts by status for authenticated user', async () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1', email: 'user@example.com' } },
      error: null
    })

    const mockJobs = [
      { status: 'scheduled' },
      { status: 'scheduled' },
      { status: 'in_progress' },
      { status: 'completed' },
      { status: 'completed' },
      { status: 'completed' }
    ]

    let callCount = 0
    vi.mocked(mockSupabaseClient.from).mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockProfile, error: null })
            })
          })
        } as any
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: mockJobs, error: null })
        })
      } as any
    })

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
    vi.mocked(mockSupabaseClient.from).mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockProfile, error: null })
            })
          })
        } as any
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null })
        })
      } as any
    })

    const request = new NextRequest('http://localhost:3000/api/analytics/jobs-by-status')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(Array.isArray(data)).toBe(true)
  })
})
