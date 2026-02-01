import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, PATCH } from '@/app/api/settings/pricing/route'

const mockSupabaseClient = {
  auth: { getUser: vi.fn() },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({ single: vi.fn() })),
      order: vi.fn(() => ({ order: vi.fn() }))
    })),
    upsert: vi.fn(() => ({
      select: vi.fn(() => ({ single: vi.fn() }))
    }))
  }))
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

describe('Settings Pricing API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockProfile = {
    organization_id: 'org-123',
    role: 'admin'
  }

  describe('GET /api/settings/pricing', () => {
    it('should return all pricing data for organization', async () => {
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

        if (table === 'pricing_settings') {
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { default_markup_percentage: 25, default_tax_rate: 7.5, rounding_method: 'nearest', currency: 'USD' },
                error: null
              })
            })
          } as any
        }

        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        } as any
      })

      const request = new NextRequest('http://localhost:3000/api/settings/pricing')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toHaveProperty('labor_rates')
      expect(data).toHaveProperty('equipment_rates')
      expect(data).toHaveProperty('material_costs')
      expect(data).toHaveProperty('disposal_fees')
      expect(data).toHaveProperty('travel_rates')
      expect(data).toHaveProperty('settings')
    })

    it('should reject unauthenticated requests', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/settings/pricing')

      // Act
      const response = await GET(request)

      // Assert
      expect(response.status).toBe(401)
    })
  })

  describe('PATCH /api/settings/pricing', () => {
    it('should update pricing settings', async () => {
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
          upsert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'settings-1',
                  organization_id: 'org-123',
                  default_markup_percentage: 30,
                  default_tax_rate: 8.5,
                  rounding_method: 'nearest',
                  currency: 'USD'
                },
                error: null
              })
            })
          })
        } as any
      })

      const request = new NextRequest('http://localhost:3000/api/settings/pricing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          default_markup_percentage: 30,
          default_tax_rate: 8.5,
          rounding_method: 'nearest',
          currency: 'USD'
        })
      })

      // Act
      const response = await PATCH(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.default_markup_percentage).toBe(30)
      expect(data.default_tax_rate).toBe(8.5)
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

      const request = new NextRequest('http://localhost:3000/api/settings/pricing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ default_markup_percentage: 30 })
      })

      // Act
      const response = await PATCH(request)

      // Assert
      expect(response.status).toBe(403)
    })
  })
})
