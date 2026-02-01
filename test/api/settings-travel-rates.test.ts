import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST, PATCH, DELETE } from '@/app/api/settings/pricing/travel-rates/route'

const mockSupabaseClient = {
  auth: { getUser: vi.fn() },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({ single: vi.fn() })),
      order: vi.fn()
    })),
    insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn() })) })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn() })) }))
    })),
    delete: vi.fn(() => ({ eq: vi.fn() }))
  }))
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

describe('Travel Rates API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockProfile = {
    organization_id: 'org-123',
    role: 'admin'
  }

  describe('GET /api/settings/pricing/travel-rates', () => {
    it('should return list of travel rates', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
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

        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [
                { id: 'tr-1', min_miles: 0, max_miles: 25, flat_fee: 75, per_mile_rate: null, is_active: true },
                { id: 'tr-2', min_miles: 25, max_miles: 50, flat_fee: null, per_mile_rate: 3.50, is_active: true }
              ],
              error: null
            })
          })
        } as any
      })

      const request = new NextRequest('http://localhost:3000/api/settings/pricing/travel-rates')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.travel_rates).toHaveLength(2)
      expect(data.travel_rates[0].min_miles).toBe(0)
    })
  })

  describe('POST /api/settings/pricing/travel-rates', () => {
    it('should create new travel rate', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
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

        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'tr-new',
                  organization_id: 'org-123',
                  min_miles: 50,
                  max_miles: 100,
                  flat_fee: null,
                  per_mile_rate: 4.00
                },
                error: null
              })
            })
          })
        } as any
      })

      const request = new NextRequest('http://localhost:3000/api/settings/pricing/travel-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          min_miles: 50,
          max_miles: 100,
          per_mile_rate: 4.00
        })
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(201)
      expect(data.min_miles).toBe(50)
      expect(data.per_mile_rate).toBe(4.00)
    })

    it('should reject non-admin users', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null
      })

      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { ...mockProfile, role: 'user' },
              error: null
            })
          })
        })
      } as any)

      const request = new NextRequest('http://localhost:3000/api/settings/pricing/travel-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ min_miles: 0, max_miles: 10, flat_fee: 50 })
      })

      // Act
      const response = await POST(request)

      // Assert
      expect(response.status).toBe(403)
    })
  })

  describe('PATCH /api/settings/pricing/travel-rates', () => {
    it('should update travel rate', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
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

        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'tr-1',
                    min_miles: 0,
                    max_miles: 25,
                    flat_fee: 85
                  },
                  error: null
                })
              })
            })
          })
        } as any
      })

      const request = new NextRequest('http://localhost:3000/api/settings/pricing/travel-rates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'tr-1',
          flat_fee: 85
        })
      })

      // Act
      const response = await PATCH(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.flat_fee).toBe(85)
    })
  })

  describe('DELETE /api/settings/pricing/travel-rates', () => {
    it('should delete travel rate', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
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

        return {
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              error: null
            })
          })
        } as any
      })

      const request = new NextRequest('http://localhost:3000/api/settings/pricing/travel-rates?id=tr-1', {
        method: 'DELETE'
      })

      // Act
      const response = await DELETE(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })
})
