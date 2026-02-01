import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST, PATCH, DELETE } from '@/app/api/settings/pricing/labor-rates/route'

const mockSupabaseClient = {
  auth: { getUser: vi.fn() },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({ single: vi.fn() })),
      order: vi.fn(() => ({ order: vi.fn() }))
    })),
    insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn() })) })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({ single: vi.fn() })),
        neq: vi.fn()
      }))
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

describe('Labor Rates API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockProfile = {
    organization_id: 'org-123',
    role: 'admin'
  }

  describe('GET /api/settings/pricing/labor-rates', () => {
    it('should return list of labor rates', async () => {
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
            order: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [
                  { id: '550e8400-e29b-41d4-a716-446655440001', name: 'Technician', role_title: 'Field Technician', hourly_rate: 45, overtime_rate: 67.5, is_default: true },
                  { id: 'lr-2', name: 'Supervisor', role_title: 'Site Supervisor', hourly_rate: 65, overtime_rate: 97.5, is_default: false }
                ],
                error: null
              })
            })
          })
        } as any
      })

      const request = new NextRequest('http://localhost:3000/api/settings/pricing/labor-rates')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.labor_rates).toHaveLength(2)
      expect(data.labor_rates[0].hourly_rate).toBe(45)
    })
  })

  describe('POST /api/settings/pricing/labor-rates', () => {
    it('should create new labor rate', async () => {
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
                  id: 'lr-new',
                  organization_id: 'org-123',
                  name: 'Senior Technician',
                  rate_per_hour: 55,
                  description: 'Experienced field technician',
                  is_default: false
                },
                error: null
              })
            })
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn()
          })
        } as any
      })

      const request = new NextRequest('http://localhost:3000/api/settings/pricing/labor-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Senior Technician',
          rate_per_hour: 55,
          description: 'Experienced field technician',
          is_default: false
        })
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(201)
      expect(data.name).toBe('Senior Technician')
      expect(data.rate_per_hour).toBe(55)
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

      const request = new NextRequest('http://localhost:3000/api/settings/pricing/labor-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test', rate_per_hour: 50 })
      })

      // Act
      const response = await POST(request)

      // Assert
      expect(response.status).toBe(403)
    })
  })

  describe('PATCH /api/settings/pricing/labor-rates', () => {
    it('should update labor rate', async () => {
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
                    id: '550e8400-e29b-41d4-a716-446655440001',
                    name: 'Technician',
                    rate_per_hour: 50,
                    is_default: false
                  },
                  error: null
                }),
                neq: vi.fn()
              })
            })
          })
        } as any
      })

      const request = new NextRequest('http://localhost:3000/api/settings/pricing/labor-rates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: '550e8400-e29b-41d4-a716-446655440001',
          rate_per_hour: 50
        })
      })

      // Act
      const response = await PATCH(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.rate_per_hour).toBe(50)
    })
  })

  describe('DELETE /api/settings/pricing/labor-rates', () => {
    it('should delete labor rate', async () => {
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

      const request = new NextRequest('http://localhost:3000/api/settings/pricing/labor-rates?id=550e8400-e29b-41d4-a716-446655440001', {
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
