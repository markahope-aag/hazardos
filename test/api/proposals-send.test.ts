import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock the dependencies
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn()
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}))

// Mock Resend
vi.mock('resend', () => ({
  Resend: vi.fn(() => ({
    emails: {
      send: vi.fn()
    }
  }))
}))

// Import the route handler
import { POST } from '@/app/api/proposals/[id]/send/route'
import { createClient } from '@/lib/supabase/server'

describe('Proposals Send API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.RESEND_API_KEY
  })

  describe('POST /api/proposals/[id]/send', () => {
    const validSendData = {
      recipient_email: 'client@example.com',
      recipient_name: 'John Doe',
      custom_message: 'Please review the attached proposal'
    }

    it('should send proposal for authenticated user', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      const mockProposal = {
        id: 'proposal-1',
        proposal_number: 'PROP-001',
        status: 'draft',
        access_token: 'access-token-123',
        access_token_expires_at: '2026-03-01T00:00:00Z',
        organization: {
          id: 'org-1',
          name: 'Test Company',
          email: 'info@testcompany.com'
        }
      }

      const mockUpdated = {
        ...mockProposal,
        status: 'sent',
        sent_at: '2026-02-01T10:00:00Z',
        sent_to_email: validSendData.recipient_email
      }

      vi.mocked(mockSupabaseClient.from).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { organization_id: 'org-1' },
                  error: null
                })
              })
            })
          } as any
        }
        if (table === 'proposals') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: mockProposal,
                error: null
              })
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: mockUpdated,
                    error: null
                  })
                })
              })
            })
          } as any
        }
        return {} as any
      })

      const params = { id: 'proposal-1' }
      const request = new NextRequest('http://localhost:3000/api/proposals/proposal-1/send', {
        method: 'POST',
        body: JSON.stringify(validSendData)
      })

      const response = await POST(request, { params: Promise.resolve(params) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.proposal.status).toBe('sent')
      expect(data.portal_url).toContain(mockProposal.access_token)
      expect(data.email_sent).toBe(false) // No RESEND_API_KEY set
    })

    it('should return 401 for unauthenticated user', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const params = { id: 'proposal-1' }
      const request = new NextRequest('http://localhost:3000/api/proposals/proposal-1/send', {
        method: 'POST',
        body: JSON.stringify(validSendData)
      })

      const response = await POST(request, { params: Promise.resolve(params) })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should validate required recipient_email field', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      vi.mocked(mockSupabaseClient.from).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { organization_id: 'org-1' },
                  error: null
                })
              })
            })
          } as any
        }
        return {} as any
      })

      const invalidData = { ...validSendData }
      delete invalidData.recipient_email

      const params = { id: 'proposal-1' }
      const request = new NextRequest('http://localhost:3000/api/proposals/proposal-1/send', {
        method: 'POST',
        body: JSON.stringify(invalidData)
      })

      const response = await POST(request, { params: Promise.resolve(params) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('recipient_email is required')
    })

    it('should return 404 for non-existent proposal', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      vi.mocked(mockSupabaseClient.from).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { organization_id: 'org-1' },
                  error: null
                })
              })
            })
          } as any
        }
        if (table === 'proposals') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'No rows found', code: 'PGRST116' }
              })
            })
          } as any
        }
        return {} as any
      })

      const params = { id: 'non-existent' }
      const request = new NextRequest('http://localhost:3000/api/proposals/non-existent/send', {
        method: 'POST',
        body: JSON.stringify(validSendData)
      })

      const response = await POST(request, { params: Promise.resolve(params) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Proposal not found')
    })

    it('should reject sending proposal not in valid status', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      const mockProposal = {
        id: 'proposal-1',
        status: 'signed',
        access_token: 'access-token-123'
      }

      vi.mocked(mockSupabaseClient.from).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { organization_id: 'org-1' },
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
                single: vi.fn().mockResolvedValue({
                  data: mockProposal,
                  error: null
                })
              })
            })
          } as any
        }
        return {} as any
      })

      const params = { id: 'proposal-1' }
      const request = new NextRequest('http://localhost:3000/api/proposals/proposal-1/send', {
        method: 'POST',
        body: JSON.stringify(validSendData)
      })

      const response = await POST(request, { params: Promise.resolve(params) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('cannot be sent')
    })

    it('should handle database update errors', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      const mockProposal = {
        id: 'proposal-1',
        status: 'draft',
        access_token: 'access-token-123',
        access_token_expires_at: '2026-03-01T00:00:00Z'
      }

      vi.mocked(mockSupabaseClient.from).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { organization_id: 'org-1' },
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
                single: vi.fn().mockResolvedValue({
                  data: mockProposal,
                  error: null
                })
              })
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Update failed', code: '42501' }
                  })
                })
              })
            })
          } as any
        }
        return {} as any
      })

      const params = { id: 'proposal-1' }
      const request = new NextRequest('http://localhost:3000/api/proposals/proposal-1/send', {
        method: 'POST',
        body: JSON.stringify(validSendData)
      })

      const response = await POST(request, { params: Promise.resolve(params) })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to update proposal')
    })

    it('should generate correct portal URL', async () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://example.com'

      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      const mockProposal = {
        id: 'proposal-1',
        status: 'draft',
        access_token: 'test-token-abc',
        access_token_expires_at: '2026-03-01T00:00:00Z'
      }

      vi.mocked(mockSupabaseClient.from).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { organization_id: 'org-1' },
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
                single: vi.fn().mockResolvedValue({
                  data: mockProposal,
                  error: null
                })
              })
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { ...mockProposal, status: 'sent' },
                    error: null
                  })
                })
              })
            })
          } as any
        }
        return {} as any
      })

      const params = { id: 'proposal-1' }
      const request = new NextRequest('http://localhost:3000/api/proposals/proposal-1/send', {
        method: 'POST',
        body: JSON.stringify(validSendData)
      })

      const response = await POST(request, { params: Promise.resolve(params) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.portal_url).toBe('https://example.com/portal/proposal/test-token-abc')

      delete process.env.NEXT_PUBLIC_APP_URL
    })
  })
})
