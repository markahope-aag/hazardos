import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, PATCH, DELETE } from '@/app/api/estimates/[id]/route'

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn()
      }))
    }))
  }))
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

describe('Estimate By ID API', () => {
  const mockProfile = {
    organization_id: 'org-123',
    role: 'admin'
  }

  const mockUserProfile = {
    organization_id: 'org-123',
    role: 'user'
  }

  // Helper to setup authenticated user with profile
  const setupAuthenticatedUser = (profile = mockProfile) => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-123', email: 'user@example.com' } },
      error: null,
    })

    vi.mocked(mockSupabaseClient.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: profile,
            error: null
          })
        })
      })
    } as any)
  }

  // Helper to setup unauthenticated user
  const setupUnauthenticatedUser = () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' } as any,
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/estimates/[id]', () => {
    it('should return estimate with all relations', async () => {
      setupAuthenticatedUser()

      const mockEstimate = {
        id: 'est-123',
        estimate_number: 'EST-001',
        project_name: 'Asbestos Removal',
        status: 'draft',
        total: 5000,
        site_survey: { id: 'survey-1', job_name: 'Test Job' },
        customer: { id: 'cust-1', company_name: 'Acme Corp' },
        created_by_user: { id: 'user-1', first_name: 'John' },
        approved_by_user: null,
        line_items: [
          { id: 'item-1', description: 'Labor', total_price: 3000, sort_order: 0 },
          { id: 'item-2', description: 'Materials', total_price: 2000, sort_order: 1 },
        ],
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
        if (table === 'estimates') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: mockEstimate,
                    error: null,
                  }),
                }),
              }),
            }),
          } as any
        }
        return mockSupabaseClient as any
      })

      const request = new NextRequest('http://localhost:3000/api/estimates/est-123')

      const response = await GET(request, { params: Promise.resolve({ id: 'est-123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.estimate).toBeDefined()
      expect(data.estimate.line_items).toHaveLength(2)
    })

    it('should return 404 for non-existent estimate', async () => {
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
        if (table === 'estimates') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { code: 'PGRST116' },
                  }),
                }),
              }),
            }),
          } as any
        }
        return mockSupabaseClient as any
      })

      const request = new NextRequest('http://localhost:3000/api/estimates/non-existent')

      const response = await GET(request, { params: Promise.resolve({ id: 'non-existent' }) })

      expect(response.status).toBe(404)
    })

    it('should reject unauthenticated requests', async () => {
      setupUnauthenticatedUser()

      const request = new NextRequest('http://localhost:3000/api/estimates/est-123')

      const response = await GET(request, { params: Promise.resolve({ id: 'est-123' }) })

      expect(response.status).toBe(401)
    })
  })

  describe('PATCH /api/estimates/[id]', () => {
    it('should update estimate details', async () => {
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
        if (table === 'estimates') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'est-123', status: 'draft' },
                    error: null,
                  }),
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: 'est-123',
                      project_name: 'Updated Project',
                      status: 'draft',
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          } as any
        }
        return mockSupabaseClient as any
      })

      const request = new NextRequest('http://localhost:3000/api/estimates/est-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_name: 'Updated Project',
          markup_percent: 20,
        }),
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: 'est-123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.estimate).toBeDefined()
    })

    it('should update estimate status', async () => {
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
        if (table === 'estimates') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'est-123', status: 'draft' },
                    error: null,
                  }),
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'est-123', status: 'sent' },
                    error: null,
                  }),
                }),
              }),
            }),
          } as any
        }
        return mockSupabaseClient as any
      })

      const request = new NextRequest('http://localhost:3000/api/estimates/est-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'sent',
        }),
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: 'est-123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.estimate.status).toBe('sent')
    })

    it('should return 404 for non-existent estimate', async () => {
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
        if (table === 'estimates') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Not found' },
                  }),
                }),
              }),
            }),
          } as any
        }
        return mockSupabaseClient as any
      })

      const request = new NextRequest('http://localhost:3000/api/estimates/non-existent', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_name: 'Updated' }),
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: 'non-existent' }) })

      expect(response.status).toBe(404)
    })

    it('should reject unauthenticated requests', async () => {
      setupUnauthenticatedUser()

      const request = new NextRequest('http://localhost:3000/api/estimates/est-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_name: 'Updated' }),
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: 'est-123' }) })

      expect(response.status).toBe(401)
    })
  })

  describe('DELETE /api/estimates/[id]', () => {
    it('should delete estimate with admin role', async () => {
      setupAuthenticatedUser(mockProfile) // admin role

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
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          } as any
        }
        return mockSupabaseClient as any
      })

      const request = new NextRequest('http://localhost:3000/api/estimates/est-123', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: 'est-123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should reject deletion from non-admin role', async () => {
      // Setup user with 'crew' role - not in allowedRoles
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
                  data: {
                    organization_id: 'org-123',
                    role: 'crew' // Not in allowedRoles: ['platform_owner', 'platform_admin', 'tenant_owner', 'admin']
                  },
                  error: null
                })
              })
            })
          } as any
        }
        return mockSupabaseClient as any
      })

      const request = new NextRequest('http://localhost:3000/api/estimates/est-123', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: 'est-123' }) })

      expect(response.status).toBe(403)
    })

    it('should reject unauthenticated requests', async () => {
      setupUnauthenticatedUser()

      const request = new NextRequest('http://localhost:3000/api/estimates/est-123', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: 'est-123' }) })

      expect(response.status).toBe(401)
    })
  })
})
