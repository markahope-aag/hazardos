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
import { GET, POST, PATCH, DELETE } from '@/app/api/settings/pricing/equipment-rates/route'
import { createClient } from '@/lib/supabase/server'

describe('Equipment Rates API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/settings/pricing/equipment-rates', () => {
    it('should return equipment rates for authenticated user', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      const mockRates = [
        {
          id: 'rate-1',
          name: 'Backhoe',
          rate_per_day: 450.00,
          description: 'Standard backhoe loader',
          organization_id: 'org-1',
          created_at: '2026-01-01T00:00:00Z'
        },
        {
          id: 'rate-2',
          name: 'Excavator',
          rate_per_day: 850.00,
          description: 'Heavy-duty excavator',
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

      const request = new NextRequest('http://localhost:3000/api/settings/pricing/equipment-rates')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.equipment_rates).toEqual(mockRates)
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

  describe('POST /api/settings/pricing/equipment-rates', () => {
    const validRateData = {
      name: 'Dump Truck',
      rate_per_day: 350.00,
      description: 'Standard dump truck'
    }

    it('should create equipment rate for authenticated admin user', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      const mockCreated = {
        id: 'rate-new',
        ...validRateData,
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
        if (table === 'equipment_rates') {
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

      const request = new NextRequest('http://localhost:3000/api/settings/pricing/equipment-rates', {
        method: 'POST',
        body: JSON.stringify(validRateData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.name).toBe(validRateData.name)
      expect(data.rate_per_day).toBe(validRateData.rate_per_day)
    })

    it('should return 401 for unauthenticated user', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/settings/pricing/equipment-rates', {
        method: 'POST',
        body: JSON.stringify(validRateData)
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

      const request = new NextRequest('http://localhost:3000/api/settings/pricing/equipment-rates', {
        method: 'POST',
        body: JSON.stringify(validRateData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })
  })

  describe('PATCH /api/settings/pricing/equipment-rates', () => {
    const validUpdateData = {
      id: 'rate-1',
      rate_per_day: 475.00,
      description: 'Updated description'
    }

    it('should update equipment rate for authenticated admin user', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      const mockUpdated = {
        id: 'rate-1',
        name: 'Backhoe',
        rate_per_day: 475.00,
        description: 'Updated description',
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
        if (table === 'equipment_rates') {
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

      const request = new NextRequest('http://localhost:3000/api/settings/pricing/equipment-rates', {
        method: 'PATCH',
        body: JSON.stringify(validUpdateData)
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.rate_per_day).toBe(475.00)
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

      const invalidData = { ...validUpdateData }
      delete invalidData.id

      const request = new NextRequest('http://localhost:3000/api/settings/pricing/equipment-rates', {
        method: 'PATCH',
        body: JSON.stringify(invalidData)
      })

      const response = await PATCH(request)
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

      const request = new NextRequest('http://localhost:3000/api/settings/pricing/equipment-rates', {
        method: 'PATCH',
        body: JSON.stringify(validUpdateData)
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })
  })

  describe('DELETE /api/settings/pricing/equipment-rates', () => {
    it('should delete equipment rate for authenticated admin user', async () => {
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
        if (table === 'equipment_rates') {
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

      const request = new NextRequest('http://localhost:3000/api/settings/pricing/equipment-rates?id=rate-1', {
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

      const request = new NextRequest('http://localhost:3000/api/settings/pricing/equipment-rates', {
        method: 'DELETE'
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('ID is required')
    })

    it('should return 401 for unauthenticated user', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/settings/pricing/equipment-rates?id=rate-1', {
        method: 'DELETE'
      })

      const response = await DELETE(request)
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

      const request = new NextRequest('http://localhost:3000/api/settings/pricing/equipment-rates?id=rate-1', {
        method: 'DELETE'
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })
  })
})
