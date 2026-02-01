import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST, PATCH, DELETE } from '@/app/api/settings/pricing/material-costs/route'

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

describe('Material Costs API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockProfile = {
    organization_id: 'org-123',
    role: 'admin'
  }

  describe('GET /api/settings/pricing/material-costs', () => {
    it('should return list of material costs', async () => {
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
                { id: '550e8400-e29b-41d4-a716-446655440002', name: 'HEPA Filter', material_name: 'HEPA Filter H13', unit_cost: 45.99, unit_type: 'each', is_active: true },
                { id: 'mc-2', name: 'Containment Plastic', material_name: '6mil Poly Sheeting', unit_cost: 120.00, unit_type: 'roll', is_active: true }
              ],
              error: null
            })
          })
        } as any
      })

      const request = new NextRequest('http://localhost:3000/api/settings/pricing/material-costs')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.material_costs).toHaveLength(2)
      expect(data.material_costs[0].unit_cost).toBe(45.99)
    })
  })

  describe('POST /api/settings/pricing/material-costs', () => {
    it('should create new material cost', async () => {
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
                  id: 'mc-new',
                  organization_id: 'org-123',
                  name: 'Negative Air Machine',
                  cost_per_unit: 850.00,
                  unit: 'each',
                  description: 'Portable negative air unit'
                },
                error: null
              })
            })
          })
        } as any
      })

      const request = new NextRequest('http://localhost:3000/api/settings/pricing/material-costs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Negative Air Machine',
          cost_per_unit: 850.00,
          unit: 'each',
          description: 'Portable negative air unit'
        })
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(201)
      expect(data.name).toBe('Negative Air Machine')
      expect(data.cost_per_unit).toBe(850.00)
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

      const request = new NextRequest('http://localhost:3000/api/settings/pricing/material-costs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test', cost_per_unit: 100, unit: 'each' })
      })

      // Act
      const response = await POST(request)

      // Assert
      expect(response.status).toBe(403)
    })
  })

  describe('PATCH /api/settings/pricing/material-costs', () => {
    it('should update material cost', async () => {
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
                    id: '550e8400-e29b-41d4-a716-446655440002',
                    name: 'HEPA Filter',
                    cost_per_unit: 49.99,
                    unit: 'each'
                  },
                  error: null
                })
              })
            })
          })
        } as any
      })

      const request = new NextRequest('http://localhost:3000/api/settings/pricing/material-costs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: '550e8400-e29b-41d4-a716-446655440002',
          cost_per_unit: 49.99
        })
      })

      // Act
      const response = await PATCH(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.cost_per_unit).toBe(49.99)
    })
  })

  describe('DELETE /api/settings/pricing/material-costs', () => {
    it('should delete material cost', async () => {
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

      const request = new NextRequest('http://localhost:3000/api/settings/pricing/material-costs?id=550e8400-e29b-41d4-a716-446655440002', {
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
