import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST, PATCH, DELETE } from '@/app/api/settings/pricing/equipment-rates/route'

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

describe('Equipment Rates API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockProfile = {
    organization_id: 'org-123',
    role: 'admin'
  }

  describe('GET /api/settings/pricing/equipment-rates', () => {
    it('should return list of equipment rates', async () => {
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
                { id: '550e8400-e29b-41d4-a716-446655440003', name: 'HEPA Vacuum', equipment_name: 'Industrial HEPA Vacuum', daily_rate: 75, weekly_rate: 450, is_active: true },
                { id: 'er-2', name: 'Negative Air Machine', equipment_name: 'Portable Negative Air Unit', daily_rate: 125, weekly_rate: 750, is_active: true }
              ],
              error: null
            })
          })
        } as any
      })

      const request = new NextRequest('http://localhost:3000/api/settings/pricing/equipment-rates')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.equipment_rates).toHaveLength(2)
      expect(data.equipment_rates[0].daily_rate).toBe(75)
    })
  })

  describe('POST /api/settings/pricing/equipment-rates', () => {
    it('should create new equipment rate', async () => {
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
                  id: 'er-new',
                  organization_id: 'org-123',
                  name: 'Air Scrubber',
                  rate_per_day: 95,
                  description: 'Commercial air scrubber unit'
                },
                error: null
              })
            })
          })
        } as any
      })

      const request = new NextRequest('http://localhost:3000/api/settings/pricing/equipment-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Air Scrubber',
          rate_per_day: 95,
          description: 'Commercial air scrubber unit'
        })
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(201)
      expect(data.name).toBe('Air Scrubber')
      expect(data.rate_per_day).toBe(95)
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

      const request = new NextRequest('http://localhost:3000/api/settings/pricing/equipment-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test', rate_per_day: 100 })
      })

      // Act
      const response = await POST(request)

      // Assert
      expect(response.status).toBe(403)
    })
  })

  describe('PATCH /api/settings/pricing/equipment-rates', () => {
    it('should update equipment rate', async () => {
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
                    id: '550e8400-e29b-41d4-a716-446655440003',
                    name: 'HEPA Vacuum',
                    rate_per_day: 85
                  },
                  error: null
                })
              })
            })
          })
        } as any
      })

      const request = new NextRequest('http://localhost:3000/api/settings/pricing/equipment-rates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: '550e8400-e29b-41d4-a716-446655440003',
          rate_per_day: 85
        })
      })

      // Act
      const response = await PATCH(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.rate_per_day).toBe(85)
    })
  })

  describe('DELETE /api/settings/pricing/equipment-rates', () => {
    it('should delete equipment rate', async () => {
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

      const request = new NextRequest('http://localhost:3000/api/settings/pricing/equipment-rates?id=550e8400-e29b-41d4-a716-446655440003', {
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
