import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock the rate limiter
vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

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

// Import the route handlers
import { GET, PATCH, DELETE } from '@/app/api/proposals/[id]/route'

describe('Proposals [id] API', () => {
  const mockProposalId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
  const mockProposal = {
    id: mockProposalId,
    proposal_number: 'PROP-001',
    estimate_id: 'a47ac10b-58cc-4372-a567-0e02b2c3d479',
    customer_id: 'b47ac10b-58cc-4372-a567-0e02b2c3d479',
    status: 'draft',
    created_at: '2026-01-31T10:00:00Z',
    estimate: {
      id: 'a47ac10b-58cc-4372-a567-0e02b2c3d479',
      estimate_number: 'EST-001',
      project_name: 'Test Project',
      total: 5400.00,
      status: 'approved'
    },
    customer: {
      id: 'b47ac10b-58cc-4372-a567-0e02b2c3d479',
      company_name: 'Test Company',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@test.com'
    }
  }

  const mockProfile = {
    organization_id: 'org-123',
    role: 'user'
  }

  const mockAdminProfile = {
    organization_id: 'org-123',
    role: 'admin'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/proposals/[id]', () => {
    it('should return proposal by id for authenticated user', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      // Mock different table queries
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
              eq: vi.fn().mockImplementation(() => ({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: mockProposal,
                    error: null
                  })
                })
              }))
            })
          } as any
        }
        return {} as any
      })

      const request = new NextRequest(`http://localhost:3000/api/proposals/${mockProposalId}`)
      const response = await GET(request, { params: Promise.resolve({ id: mockProposalId }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.proposal).toEqual(mockProposal)
    })

    it('should return 401 for unauthenticated user', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const request = new NextRequest(`http://localhost:3000/api/proposals/${mockProposalId}`)
      const response = await GET(request, { params: Promise.resolve({ id: mockProposalId }) })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication is required')
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
              eq: vi.fn().mockImplementation(() => ({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'No rows found', code: 'PGRST116' }
                  })
                })
              }))
            })
          } as any
        }
        return {} as any
      })

      const request = new NextRequest(`http://localhost:3000/api/proposals/${mockProposalId}`)
      const response = await GET(request, { params: Promise.resolve({ id: mockProposalId }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Proposal not found')
    })
  })

  describe('PATCH /api/proposals/[id]', () => {
    const updateData = {
      status: 'sent',
      cover_letter: 'Updated cover letter',
      valid_until: '2026-03-15'
    }

    it('should update proposal for authenticated user', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      const updatedProposal = {
        ...mockProposal,
        ...updateData,
        updated_at: '2026-01-31T12:00:00Z'
      }

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
              eq: vi.fn().mockImplementation(() => ({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: mockProposalId, status: 'draft' },
                    error: null
                  })
                })
              }))
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: updatedProposal,
                    error: null
                  })
                })
              })
            })
          } as any
        }
        return {} as any
      })

      const request = new NextRequest(`http://localhost:3000/api/proposals/${mockProposalId}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData)
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: mockProposalId }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.proposal).toEqual(updatedProposal)
    })

    it('should return 401 for unauthenticated user', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const request = new NextRequest(`http://localhost:3000/api/proposals/${mockProposalId}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData)
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: mockProposalId }) })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication is required')
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
              eq: vi.fn().mockImplementation(() => ({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'No rows found', code: 'PGRST116' }
                  })
                })
              }))
            })
          } as any
        }
        return {} as any
      })

      const request = new NextRequest(`http://localhost:3000/api/proposals/${mockProposalId}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData)
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: mockProposalId }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Proposal not found')
    })
  })

  describe('DELETE /api/proposals/[id]', () => {
    it('should delete proposal for authenticated admin user', async () => {
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
                  data: mockAdminProfile,
                  error: null
                })
              })
            })
          } as any
        }
        if (table === 'proposals') {
          return {
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation(() => ({
                eq: vi.fn().mockResolvedValue({
                  data: null,
                  error: null
                })
              }))
            })
          } as any
        }
        return {} as any
      })

      const request = new NextRequest(`http://localhost:3000/api/proposals/${mockProposalId}`, {
        method: 'DELETE'
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: mockProposalId }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should return 401 for unauthenticated user', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const request = new NextRequest(`http://localhost:3000/api/proposals/${mockProposalId}`, {
        method: 'DELETE'
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: mockProposalId }) })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication is required')
    })

    it('should return 403 for user without delete permissions', async () => {
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
                  data: mockProfile, // role: 'user' which is not in allowedRoles
                  error: null
                })
              })
            })
          } as any
        }
        return {} as any
      })

      const request = new NextRequest(`http://localhost:3000/api/proposals/${mockProposalId}`, {
        method: 'DELETE'
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: mockProposalId }) })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('You do not have permission to access this resource')
    })
  })
})
