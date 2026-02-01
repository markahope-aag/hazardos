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

vi.mock('@/lib/utils/secure-error-handler', () => ({
  createSecureErrorResponse: vi.fn((error) => {
    return new Response(JSON.stringify({ error: 'Database error' }), { status: 500 })
  }),
  SecureError: class SecureError extends Error {
    constructor(public type: string, message?: string) {
      super(message)
    }
  }
}))

// Import the route handlers
import { GET, POST, PATCH, DELETE } from '@/app/api/settings/pricing/travel-rates/route'
import { createClient } from '@/lib/supabase/server'

describe('Travel Rates API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/settings/pricing/travel-rates', () => {
    it('should return travel rates for authenticated user', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      const mockRates = [
        {
          id: 'rate-1',
          min_miles: 0,
          max_miles: 50,
          flat_fee: 100.00,
          per_mile_rate: null,
          organization_id: 'org-1',
          created_at: '2026-01-01T00:00:00Z'
        },
        {
          id: 'rate-2',
          min_miles: 51,
          max_miles: null,
          flat_fee: null,
          per_mile_rate: 2.50,
          organization_id: 'org-1',
          created_at: '2026-01-01T00:00:00Z'
        }
      ]

      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockRates,
            error: null
          })
        })
      } as any)

      const request = new NextRequest('http://localhost:3000/api/settings/pricing/travel-rates')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.travel_rates).toEqual(mockRates)
      expect(data.travel_rates).toHaveLength(2)
    })

    it('should return 401 for unauthenticated user', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should handle database errors', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Connection error', code: '08001' }
          })
        })
      } as any)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Database error')
    })
  })

  describe('POST /api/settings/pricing/travel-rates', () => {
    const validFlatFeeData = {
      min_miles: 0,
      max_miles: 25,
      flat_fee: 75.00,
      per_mile_rate: null
    }

    const validPerMileData = {
      min_miles: 26,
      max_miles: null,
      flat_fee: null,
      per_mile_rate: 3.00
    }

    it('should create travel rate with flat fee for authenticated admin user', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      const mockCreated = {
        id: 'rate-new',
        ...validFlatFeeData,
        organization_id: 'org-1',
        created_at: '2026-02-01T10:00:00Z'
      }

      vi.mocked(mockSupabaseClient.from).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { role: 'admin', organization_id: 'org-1' },
                  error: null
                })
              })
            })
          } as any
        }
        if (table === 'travel_rates') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockCreated,
                  error: null
                })
              })
            })
          } as any
        }
        return {} as any
      })

      const request = new NextRequest('http://localhost:3000/api/settings/pricing/travel-rates', {
        method: 'POST',
        body: JSON.stringify(validFlatFeeData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.flat_fee).toBe(validFlatFeeData.flat_fee)
      expect(data.min_miles).toBe(0)
    })

    it('should create travel rate with per-mile rate for authenticated admin user', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      const mockCreated = {
        id: 'rate-new',
        ...validPerMileData,
        organization_id: 'org-1',
        created_at: '2026-02-01T10:00:00Z'
      }

      vi.mocked(mockSupabaseClient.from).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { role: 'tenant_owner', organization_id: 'org-1' },
                  error: null
                })
              })
            })
          } as any
        }
        if (table === 'travel_rates') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockCreated,
                  error: null
                })
              })
            })
          } as any
        }
        return {} as any
      })

      const request = new NextRequest('http://localhost:3000/api/settings/pricing/travel-rates', {
        method: 'POST',
        body: JSON.stringify(validPerMileData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.per_mile_rate).toBe(validPerMileData.per_mile_rate)
    })

    it('should return 401 for unauthenticated user', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/settings/pricing/travel-rates', {
        method: 'POST',
        body: JSON.stringify(validFlatFeeData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 403 for non-admin user', async () => {
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
                  data: { role: 'user', organization_id: 'org-1' },
                  error: null
                })
              })
            })
          } as any
        }
        return {} as any
      })

      const request = new NextRequest('http://localhost:3000/api/settings/pricing/travel-rates', {
        method: 'POST',
        body: JSON.stringify(validFlatFeeData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })
  })

  describe('PATCH /api/settings/pricing/travel-rates', () => {
    const validUpdateData = {
      id: 'rate-1',
      flat_fee: 125.00
    }

    it('should update travel rate for authenticated admin user', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      const mockUpdated = {
        id: 'rate-1',
        min_miles: 0,
        max_miles: 25,
        flat_fee: 125.00,
        per_mile_rate: null,
        organization_id: 'org-1'
      }

      vi.mocked(mockSupabaseClient.from).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { role: 'admin', organization_id: 'org-1' },
                  error: null
                })
              })
            })
          } as any
        }
        if (table === 'travel_rates') {
          return {
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

      const request = new NextRequest('http://localhost:3000/api/settings/pricing/travel-rates', {
        method: 'PATCH',
        body: JSON.stringify(validUpdateData)
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.flat_fee).toBe(125.00)
    })

    it('should validate required id field', async () => {
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
                  data: { role: 'admin', organization_id: 'org-1' },
                  error: null
                })
              })
            })
          } as any
        }
        return {} as any
      })

      const invalidData = { flat_fee: 100.00 }

      const request = new NextRequest('http://localhost:3000/api/settings/pricing/travel-rates', {
        method: 'PATCH',
        body: JSON.stringify(invalidData)
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('ID is required')
    })
  })

  describe('DELETE /api/settings/pricing/travel-rates', () => {
    it('should delete travel rate for authenticated admin user', async () => {
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
                  data: { role: 'admin', organization_id: 'org-1' },
                  error: null
                })
              })
            })
          } as any
        }
        if (table === 'travel_rates') {
          return {
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: null,
                error: null
              })
            })
          } as any
        }
        return {} as any
      })

      const request = new NextRequest('http://localhost:3000/api/settings/pricing/travel-rates?id=rate-1', {
        method: 'DELETE'
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should validate required id parameter', async () => {
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
                  data: { role: 'admin', organization_id: 'org-1' },
                  error: null
                })
              })
            })
          } as any
        }
        return {} as any
      })

      const request = new NextRequest('http://localhost:3000/api/settings/pricing/travel-rates', {
        method: 'DELETE'
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('ID is required')
    })

    it('should return 403 for non-admin user', async () => {
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
                  data: { role: 'user', organization_id: 'org-1' },
                  error: null
                })
              })
            })
          } as any
        }
        return {} as any
      })

      const request = new NextRequest('http://localhost:3000/api/settings/pricing/travel-rates?id=rate-1', {
        method: 'DELETE'
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })
  })
})
