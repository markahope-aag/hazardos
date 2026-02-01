import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock the dependencies
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn(),
  rpc: vi.fn()
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}))

// Import the route handlers
import { GET, POST } from '@/app/api/proposals/route'
import { createClient } from '@/lib/supabase/server'

describe('Proposals API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/proposals', () => {
    it('should return proposals for authenticated user', async () => {
      // Mock authenticated user
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      const mockProposals = [
        {
          id: 'proposal-1',
          proposal_number: 'PROP-001',
          estimate_id: 'estimate-1',
          customer_id: 'customer-1',
          status: 'draft',
          created_at: '2026-01-31T10:00:00Z',
          estimate: {
            id: 'estimate-1',
            estimate_number: 'EST-001',
            project_name: 'Test Project',
            total: 5400.00,
            status: 'approved'
          },
          customer: {
            id: 'customer-1',
            company_name: 'Test Company',
            first_name: 'John',
            last_name: 'Doe',
            email: 'john@test.com'
          }
        }
      ]

      // Mock the complex query chain
      const mockProposalsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: mockProposals,
          error: null,
          count: 1
        })
      }

      // Mock different table queries
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
        return mockProposalsQuery as any
      })

      const request = new NextRequest('http://localhost:3000/api/proposals')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.proposals).toEqual(mockProposals)
      expect(data.total).toBe(1)
      expect(data.limit).toBe(50)
      expect(data.offset).toBe(0)
    })

    it('should return 401 for unauthenticated user', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/proposals')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should handle query parameters for filtering', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      const mockProposalsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0
        })
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
        return mockProposalsQuery as any
      })

      const request = new NextRequest('http://localhost:3000/api/proposals?status=sent&estimate_id=estimate-1')
      await GET(request)

      // Verify filtering was applied
      expect(mockProposalsQuery.eq).toHaveBeenCalledWith('status', 'sent')
      expect(mockProposalsQuery.eq).toHaveBeenCalledWith('estimate_id', 'estimate-1')
    })

    it('should handle database errors', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      const mockProposalsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Connection refused', code: '08001' },
          count: null
        })
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
        return mockProposalsQuery as any
      })

      const request = new NextRequest('http://localhost:3000/api/proposals')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch proposals')
    })
  })

  describe('POST /api/proposals', () => {
    const validProposalData = {
      estimate_id: 'estimate-1',
      cover_letter: 'Thank you for considering our proposal',
      terms_and_conditions: 'Standard terms apply',
      payment_terms: 'Net 30',
      valid_until: '2026-03-01'
    }

    it('should create a new proposal for authenticated user', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      const mockEstimate = {
        id: 'estimate-1',
        customer_id: 'customer-1',
        status: 'approved',
        total: 5400.00
      }

      const mockCreatedProposal = {
        id: 'proposal-1',
        proposal_number: 'PROP-001',
        estimate_id: 'estimate-1',
        customer_id: 'customer-1',
        status: 'draft',
        organization_id: 'org-1',
        created_at: '2026-01-31T10:00:00Z'
      }

      // Mock RPC calls
      vi.mocked(mockSupabaseClient.rpc).mockImplementation((fn: string) => {
        if (fn === 'generate_proposal_number') {
          return Promise.resolve({ data: 'PROP-001', error: null })
        }
        if (fn === 'generate_access_token') {
          return Promise.resolve({ data: 'access-token-123', error: null })
        }
        return Promise.resolve({ data: null, error: null })
      })

      // Mock different table operations
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
        if (table === 'estimates') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockEstimate,
                  error: null
                })
              })
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: null,
                error: null
              })
            })
          } as any
        }
        if (table === 'proposals') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockCreatedProposal,
                  error: null
                })
              })
            })
          } as any
        }
        return {} as any
      })

      const request = new NextRequest('http://localhost:3000/api/proposals', {
        method: 'POST',
        body: JSON.stringify(validProposalData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.proposal).toEqual(mockCreatedProposal)
    })

    it('should return 401 for unauthenticated user', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/proposals', {
        method: 'POST',
        body: JSON.stringify(validProposalData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should validate required estimate_id field', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      // Test missing estimate_id
      const invalidData = { ...validProposalData }
      delete invalidData.estimate_id

      const request = new NextRequest('http://localhost:3000/api/proposals', {
        method: 'POST',
        body: JSON.stringify(invalidData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('estimate_id is required')
    })

    it('should handle missing estimate', async () => {
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
        if (table === 'estimates') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'No rows found', code: 'PGRST116' }
                })
              })
            })
          } as any
        }
        return {} as any
      })

      const request = new NextRequest('http://localhost:3000/api/proposals', {
        method: 'POST',
        body: JSON.stringify(validProposalData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Estimate not found')
    })

    it('should handle malformed JSON', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/proposals', {
        method: 'POST',
        body: 'invalid json'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })
})