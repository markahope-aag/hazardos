import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/estimates/route'

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
  })),
  rpc: vi.fn()
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

vi.mock('@/lib/services/estimate-calculator', () => ({
  calculateEstimateFromSurvey: vi.fn(),
}))

import { calculateEstimateFromSurvey } from '@/lib/services/estimate-calculator'

describe('Estimates API', () => {
  const mockProfile = {
    organization_id: 'org-123',
    role: 'user'
  }

  // Helper to setup authenticated user with profile
  const setupAuthenticatedUser = () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-123', email: 'user@example.com' } },
      error: null,
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

  describe('GET /api/estimates', () => {
    it('should return list of estimates with relations', async () => {
      setupAuthenticatedUser()

      const mockEstimates = [
        {
          id: 'est-1',
          estimate_number: 'EST-001',
          project_name: 'Asbestos Removal Project',
          status: 'draft',
          total: 5000,
          site_survey: { id: 'survey-1', job_name: 'Test Job' },
          customer: { id: 'cust-1', company_name: 'Acme Corp' },
          created_by_user: { id: 'user-1', first_name: 'John', last_name: 'Doe' },
        },
      ]

      // Setup mock for profile lookup first, then estimates query
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
                order: vi.fn().mockReturnValue({
                  range: vi.fn().mockResolvedValue({
                    data: mockEstimates,
                    error: null,
                    count: 1,
                  }),
                }),
              }),
            }),
          } as any
        }
        return mockSupabaseClient as any
      })

      const request = new NextRequest('http://localhost:3000/api/estimates')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.estimates).toBeDefined()
      expect(data.total).toBe(1)
    })

    it('should filter estimates by status', async () => {
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
                order: vi.fn().mockReturnValue({
                  range: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({
                      data: [],
                      error: null,
                      count: 0,
                    }),
                  }),
                }),
              }),
            }),
          } as any
        }
        return mockSupabaseClient as any
      })

      const request = new NextRequest('http://localhost:3000/api/estimates?status=approved')

      const response = await GET(request)

      expect(response.status).toBe(200)
    })

    it('should filter estimates by survey_id', async () => {
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
                order: vi.fn().mockReturnValue({
                  range: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({
                      data: [],
                      error: null,
                      count: 0,
                    }),
                  }),
                }),
              }),
            }),
          } as any
        }
        return mockSupabaseClient as any
      })

      const request = new NextRequest('http://localhost:3000/api/estimates?survey_id=survey-123')

      const response = await GET(request)

      expect(response.status).toBe(200)
    })

    it('should support pagination', async () => {
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
                order: vi.fn().mockReturnValue({
                  range: vi.fn().mockResolvedValue({
                    data: [],
                    error: null,
                    count: 0,
                  }),
                }),
              }),
            }),
          } as any
        }
        return mockSupabaseClient as any
      })

      const request = new NextRequest('http://localhost:3000/api/estimates?limit=20&offset=10')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.limit).toBe(20)
      expect(data.offset).toBe(10)
    })

    it('should reject unauthenticated requests', async () => {
      setupUnauthenticatedUser()

      const request = new NextRequest('http://localhost:3000/api/estimates')

      const response = await GET(request)

      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/estimates', () => {
    it('should create estimate from site survey', async () => {
      setupAuthenticatedUser()

      const surveyId = '550e8400-e29b-41d4-a716-446655440000'
      const mockSurvey = {
        id: surveyId,
        organization_id: 'org-123',
        job_name: 'Test Job',
        customer_id: 'cust-123',
      }

      const mockCalculation = {
        subtotal: 4000,
        markup_percent: 15,
        markup_amount: 600,
        discount_percent: 0,
        discount_amount: 0,
        tax_percent: 8,
        tax_amount: 368,
        total: 4968,
        line_items: [
          {
            item_type: 'labor',
            category: 'removal',
            description: 'Asbestos removal',
            quantity: 40,
            unit: 'hours',
            unit_price: 100,
            total_price: 4000,
          },
        ],
      }

      const mockEstimate = {
        id: 'est-123',
        estimate_number: 'EST-001',
        total: 4968,
      }

      // Mock from for different tables
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
        if (table === 'site_surveys') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: mockSurvey,
                    error: null,
                  }),
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          } as any
        }
        if (table === 'estimates') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockEstimate,
                  error: null,
                }),
              }),
            }),
          } as any
        }
        if (table === 'estimate_line_items') {
          return {
            insert: vi.fn().mockResolvedValue({ data: [], error: null }),
          } as any
        }
        return mockSupabaseClient as any
      })

      vi.mocked(mockSupabaseClient.rpc).mockResolvedValue({
        data: 'EST-001',
        error: null,
      })

      vi.mocked(calculateEstimateFromSurvey).mockResolvedValue(mockCalculation as any)

      const request = new NextRequest('http://localhost:3000/api/estimates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site_survey_id: surveyId,
          project_name: 'Test Project',
          markup_percent: 15,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.estimate).toBeDefined()
      expect(calculateEstimateFromSurvey).toHaveBeenCalledWith(
        mockSurvey,
        'org-123',
        expect.objectContaining({ customMarkup: 15 })
      )
    })

    it('should reject estimate creation without site_survey_id', async () => {
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
        return mockSupabaseClient as any
      })

      const request = new NextRequest('http://localhost:3000/api/estimates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_name: 'Test Project',
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('should return 404 for non-existent survey', async () => {
      setupAuthenticatedUser()

      const surveyId = '550e8400-e29b-41d4-a716-446655440001'

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
        if (table === 'site_surveys') {
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

      const request = new NextRequest('http://localhost:3000/api/estimates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site_survey_id: surveyId,
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(404)
    })

    it('should reject unauthenticated requests', async () => {
      setupUnauthenticatedUser()

      const request = new NextRequest('http://localhost:3000/api/estimates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site_survey_id: '550e8400-e29b-41d4-a716-446655440000',
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
    })
  })
})
