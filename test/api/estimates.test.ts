import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock the dependencies
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
        order: vi.fn(() => ({
          range: vi.fn()
        }))
      }))
    }))
  }))
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}))

// Import the route handlers
import { GET, POST } from '@/app/api/estimates/route'
import { createClient } from '@/lib/supabase/server'

describe('Estimates API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/estimates', () => {
    it('should return estimates for authenticated user', async () => {
      // Mock authenticated user
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      // Mock profile data
      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { organization_id: 'org-1' },
              error: null
            })
          })
        })
      } as any)

      const mockEstimates = [
        {
          id: 'estimate-1',
          estimate_number: 'EST-001',
          site_survey_id: 'survey-1',
          customer_id: 'customer-1',
          status: 'draft',
          subtotal: 5000.00,
          tax_amount: 400.00,
          total_amount: 5400.00,
          valid_until: '2026-03-01',
          created_at: '2026-01-31T10:00:00Z',
          site_survey: {
            id: 'survey-1',
            job_name: 'Test Survey',
            site_address: '123 Test St',
            hazard_type: 'asbestos'
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
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: mockEstimates,
          error: null,
          count: 1
        })
      }

      vi.mocked(mockSupabaseClient.from).mockReturnValue(mockQuery as any)

      const request = new NextRequest('http://localhost:3000/api/estimates')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.estimates).toEqual(mockEstimates)
      expect(data.total).toBe(1)
      expect(data.page).toBe(1)
      expect(data.limit).toBe(20)
    })

    it('should return 401 for unauthenticated user', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/estimates')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication is required')
      expect(data.type).toBe('UNAUTHORIZED')
    })

    it('should handle query parameters for filtering', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      // Mock profile data
      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { organization_id: 'org-1' },
              error: null
            })
          })
        })
      } as any)

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0
        })
      }

      vi.mocked(mockSupabaseClient.from).mockReturnValue(mockQuery as any)

      const request = new NextRequest('http://localhost:3000/api/estimates?status=approved&customer_id=customer-1')
      await GET(request)

      // Verify filtering was applied
      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'approved')
      expect(mockQuery.eq).toHaveBeenCalledWith('customer_id', 'customer-1')
    })

    it('should handle pagination parameters', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      // Mock profile data
      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { organization_id: 'org-1' },
              error: null
            })
          })
        })
      } as any)

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0
        })
      }

      vi.mocked(mockSupabaseClient.from).mockReturnValue(mockQuery as any)

      const request = new NextRequest('http://localhost:3000/api/estimates?page=3&limit=5')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.page).toBe(3)
      expect(data.limit).toBe(5)
      expect(mockQuery.range).toHaveBeenCalledWith(10, 14) // page 3, limit 5
    })

    it('should handle database errors securely', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      // Mock profile data
      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { organization_id: 'org-1' },
              error: null
            })
          })
        })
      } as any)

      // Mock database error
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'relation "estimates" does not exist', code: '42P01' },
          count: null
        })
      }

      vi.mocked(mockSupabaseClient.from).mockReturnValue(mockQuery as any)

      const request = new NextRequest('http://localhost:3000/api/estimates')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('An internal server error occurred')
      expect(data.type).toBe('INTERNAL_ERROR')
      expect(data.error).not.toContain('relation "estimates" does not exist')
    })
  })

  describe('POST /api/estimates', () => {
    const validEstimateData = {
      site_survey_id: 'survey-1',
      customer_id: 'customer-1',
      valid_until: '2026-03-01',
      subtotal: 5000.00,
      tax_rate: 0.08,
      tax_amount: 400.00,
      total_amount: 5400.00,
      line_items: [
        {
          description: 'Asbestos survey and testing',
          quantity: 1,
          unit_price: 2500.00,
          total: 2500.00
        },
        {
          description: 'Asbestos removal',
          quantity: 1,
          unit_price: 2500.00,
          total: 2500.00
        }
      ]
    }

    it('should create a new estimate for authenticated user', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      // Mock profile data
      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { organization_id: 'org-1' },
              error: null
            })
          })
        })
      } as any)

      const mockCreatedEstimate = {
        id: 'estimate-1',
        estimate_number: 'EST-001',
        ...validEstimateData,
        status: 'draft',
        organization_id: 'org-1',
        created_at: '2026-01-31T10:00:00Z'
      }

      // Mock the insert operation
      const mockInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockCreatedEstimate,
          error: null
        })
      }

      vi.mocked(mockSupabaseClient.from).mockReturnValue(mockInsert as any)

      const request = new NextRequest('http://localhost:3000/api/estimates', {
        method: 'POST',
        body: JSON.stringify(validEstimateData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.estimate).toEqual(mockCreatedEstimate)
    })

    it('should return 401 for unauthenticated user', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/estimates', {
        method: 'POST',
        body: JSON.stringify(validEstimateData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication is required')
      expect(data.type).toBe('UNAUTHORIZED')
    })

    it('should validate required site_survey_id field', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      // Mock profile data
      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { organization_id: 'org-1' },
              error: null
            })
          })
        })
      } as any)

      // Test missing site_survey_id
      const invalidData = { ...validEstimateData }
      delete invalidData.site_survey_id

      const request = new NextRequest('http://localhost:3000/api/estimates', {
        method: 'POST',
        body: JSON.stringify(invalidData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('site_survey_id is required')
      expect(data.type).toBe('VALIDATION_ERROR')
      expect(data.field).toBe('site_survey_id')
    })

    it('should validate required customer_id field', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      // Mock profile data
      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { organization_id: 'org-1' },
              error: null
            })
          })
        })
      } as any)

      // Test missing customer_id
      const invalidData = { ...validEstimateData }
      delete invalidData.customer_id

      const request = new NextRequest('http://localhost:3000/api/estimates', {
        method: 'POST',
        body: JSON.stringify(invalidData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('customer_id is required')
      expect(data.type).toBe('VALIDATION_ERROR')
      expect(data.field).toBe('customer_id')
    })

    it('should validate required total_amount field', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      // Mock profile data
      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { organization_id: 'org-1' },
              error: null
            })
          })
        })
      } as any)

      // Test missing total_amount
      const invalidData = { ...validEstimateData }
      delete invalidData.total_amount

      const request = new NextRequest('http://localhost:3000/api/estimates', {
        method: 'POST',
        body: JSON.stringify(invalidData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('total_amount is required')
      expect(data.type).toBe('VALIDATION_ERROR')
      expect(data.field).toBe('total_amount')
    })

    it('should handle foreign key constraint errors', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      // Mock profile data
      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { organization_id: 'org-1' },
              error: null
            })
          })
        })
      } as any)

      // Mock foreign key constraint error
      const mockInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'insert or update on table "estimates" violates foreign key constraint', code: '23503' }
        })
      }

      vi.mocked(mockSupabaseClient.from).mockReturnValue(mockInsert as any)

      const request = new NextRequest('http://localhost:3000/api/estimates', {
        method: 'POST',
        body: JSON.stringify(validEstimateData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('The requested resource was not found')
      expect(data.type).toBe('NOT_FOUND')
      expect(data.error).not.toContain('foreign key constraint')
    })

    it('should handle malformed JSON', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/estimates', {
        method: 'POST',
        body: 'invalid json'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('An internal server error occurred')
      expect(data.type).toBe('INTERNAL_ERROR')
    })
  })
})