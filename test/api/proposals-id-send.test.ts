import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/proposals/[id]/send/route'

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn()
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

// Mock resend
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: vi.fn().mockResolvedValue({ id: 'email-123' })
    }
  }))
}))

describe('Proposals Send API', () => {
  const mockProfile = {
    organization_id: 'org-123',
    role: 'user'
  }

  const mockProposal = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    proposal_number: 'PROP-001',
    status: 'draft',
    access_token: 'abc123',
    access_token_expires_at: '2026-12-31T23:59:59Z',
    organization: { id: 'org-123', name: 'Test Org', email: 'org@test.com' }
  }

  const setupAuthenticatedUser = () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1', email: 'test@example.com' } },
      error: null
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should send a proposal', async () => {
    setupAuthenticatedUser()

    let callCount = 0
    vi.mocked(mockSupabaseClient.from).mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockProfile,
                error: null
              })
            })
          })
        } as any
      }

      if (table === 'proposals') {
        callCount++
        if (callCount === 1) {
          // First call: select proposal
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: mockProposal,
                    error: null
                  })
                })
              })
            })
          } as any
        } else {
          // Second call: update proposal
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { ...mockProposal, status: 'sent', sent_at: '2026-02-01T00:00:00Z' },
                    error: null
                  })
                })
              })
            })
          } as any
        }
      }

      return mockSupabaseClient as any
    })

    const request = new NextRequest('http://localhost:3000/api/proposals/550e8400-e29b-41d4-a716-446655440000/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient_email: 'customer@example.com' })
    })

    const response = await POST(request, { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.proposal).toBeDefined()
    expect(data.portal_url).toBeDefined()
  })

  it('should return 401 for unauthenticated user', async () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null
    })

    const request = new NextRequest('http://localhost:3000/api/proposals/550e8400-e29b-41d4-a716-446655440000/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient_email: 'customer@example.com' })
    })

    const response = await POST(request, { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }) })

    expect(response.status).toBe(401)
  })

  it('should return 404 for non-existent proposal', async () => {
    setupAuthenticatedUser()

    vi.mocked(mockSupabaseClient.from).mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockProfile,
                error: null
              })
            })
          })
        } as any
      }

      if (table === 'proposals') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST116' }
                })
              })
            })
          })
        } as any
      }

      return mockSupabaseClient as any
    })

    const request = new NextRequest('http://localhost:3000/api/proposals/550e8400-e29b-41d4-a716-446655440000/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient_email: 'customer@example.com' })
    })

    const response = await POST(request, { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }) })

    expect(response.status).toBe(404)
  })

  it('should validate required email field', async () => {
    setupAuthenticatedUser()

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

    const request = new NextRequest('http://localhost:3000/api/proposals/550e8400-e29b-41d4-a716-446655440000/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })

    const response = await POST(request, { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }) })

    expect(response.status).toBe(400)
  })
})
