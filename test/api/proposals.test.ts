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
  from: vi.fn(),
  rpc: vi.fn()
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}))

// Import the route handlers
import { GET, POST } from '@/app/api/proposals/route'

describe('Proposals API', () => {
  const mockProfile = {
    organization_id: 'org-123',
    role: 'user'
  }

  const setupAuthenticatedUser = () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1', email: 'test@example.com' } },
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
  }

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
          id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
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
      ]

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
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  range: vi.fn().mockResolvedValue({
                    data: mockProposals,
                    error: null,
                    count: 1
                  })
                })
              })
            })
          } as any
        }
        return {} as any
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
      expect(data.error).toBe('Authentication is required')
    })

    it('should handle query parameters for filtering', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      // Track all eq calls
      const eqCalls: Array<[string, string]> = []

      // Create a mock that tracks eq calls and always returns itself for chaining
      const createChainableMock = () => {
        const chainable: any = {
          eq: vi.fn().mockImplementation((field: string, value: string) => {
            eqCalls.push([field, value])
            return chainable
          }),
          order: vi.fn().mockReturnThis(),
          range: vi.fn().mockImplementation(() => chainable),
          then: vi.fn().mockImplementation((callback) => {
            // Simulate async resolution
            return Promise.resolve({ data: [], error: null, count: 0 }).then(callback)
          })
        }
        // Make it thenable so await works
        Object.defineProperty(chainable, 'then', {
          value: (resolve: any) => Promise.resolve({ data: [], error: null, count: 0 }).then(resolve)
        })
        return chainable
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
          const chainable = createChainableMock()
          return {
            select: vi.fn().mockReturnValue(chainable)
          } as any
        }
        return {} as any
      })

      // Use valid UUIDs
      const estimateId = 'a47ac10b-58cc-4372-a567-0e02b2c3d479'
      const request = new NextRequest(`http://localhost:3000/api/proposals?status=sent&estimate_id=${estimateId}`)
      await GET(request)

      // Verify filtering was applied
      expect(eqCalls).toContainEqual(['organization_id', 'org-123'])
      expect(eqCalls).toContainEqual(['status', 'sent'])
      expect(eqCalls).toContainEqual(['estimate_id', estimateId])
    })

    it('should handle database errors', async () => {
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
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  range: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Connection refused', code: '08001' },
                    count: null
                  })
                })
              })
            })
          } as any
        }
        return {} as any
      })

      const request = new NextRequest('http://localhost:3000/api/proposals')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('An internal server error occurred')
    })
  })

  describe('POST /api/proposals', () => {
    // Use valid UUIDs for test data
    const validEstimateId = 'a47ac10b-58cc-4372-a567-0e02b2c3d479'
    const validProposalData = {
      estimate_id: validEstimateId,
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
        id: validEstimateId,
        customer_id: 'b47ac10b-58cc-4372-a567-0e02b2c3d479',
        status: 'approved',
        total: 5400.00
      }

      const mockCreatedProposal = {
        id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        proposal_number: 'PROP-001',
        estimate_id: validEstimateId,
        customer_id: 'b47ac10b-58cc-4372-a567-0e02b2c3d479',
        status: 'draft',
        organization_id: 'org-123',
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
                  data: mockProfile,
                  error: null
                })
              })
            })
          } as any
        }
        if (table === 'estimates') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation(() => ({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: mockEstimate,
                    error: null
                  })
                })
              }))
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
      expect(data.error).toBe('Authentication is required')
    })

    it('should validate required estimate_id field', async () => {
      setupAuthenticatedUser()

      // Test missing estimate_id
      const invalidData = { ...validProposalData }
      delete (invalidData as any).estimate_id

      const request = new NextRequest('http://localhost:3000/api/proposals', {
        method: 'POST',
        body: JSON.stringify(invalidData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      // The validation error message comes from Zod schema
      expect(data.error).toContain('estimate_id')
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
                  data: mockProfile,
                  error: null
                })
              })
            })
          } as any
        }
        if (table === 'estimates') {
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
      setupAuthenticatedUser()

      const request = new NextRequest('http://localhost:3000/api/proposals', {
        method: 'POST',
        body: 'invalid json'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid JSON body')
    })
  })
})
