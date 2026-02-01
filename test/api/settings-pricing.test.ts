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
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn()
          }))
        }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn()
          }))
        }))
      }))
    }))
  }))
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}))

// Import the route handlers
import { GET as getLaborRates, POST as createLaborRate } from '@/app/api/settings/pricing/labor-rates/route'
import { GET as getMaterialCosts, POST as createMaterialCost } from '@/app/api/settings/pricing/material-costs/route'
import { GET as getDisposalFees, POST as createDisposalFee } from '@/app/api/settings/pricing/disposal-fees/route'
import { createClient } from '@/lib/supabase/server'

describe('Settings Pricing API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Labor Rates API', () => {
    describe('GET /api/settings/pricing/labor-rates', () => {
      it('should return labor rates for authenticated user', async () => {
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

        const mockLaborRates = [
          {
            id: 'rate-1',
            role: 'technician',
            hourly_rate: 75.00,
            overtime_rate: 112.50,
            hazard_multiplier: 1.25,
            effective_date: '2026-01-01',
            is_active: true,
            created_at: '2026-01-01T00:00:00Z'
          },
          {
            id: 'rate-2',
            role: 'supervisor',
            hourly_rate: 95.00,
            overtime_rate: 142.50,
            hazard_multiplier: 1.25,
            effective_date: '2026-01-01',
            is_active: true,
            created_at: '2026-01-01T00:00:00Z'
          }
        ]

        const mockQuery = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          range: vi.fn().mockResolvedValue({
            data: mockLaborRates,
            error: null,
            count: 2
          })
        }

        vi.mocked(mockSupabaseClient.from).mockReturnValue(mockQuery as any)

        const request = new NextRequest('http://localhost:3000/api/settings/pricing/labor-rates')
        const response = await getLaborRates(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.rates).toEqual(mockLaborRates)
        expect(data.total).toBe(2)
      })

      it('should return 401 for unauthenticated user', async () => {
        vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
          data: { user: null },
          error: null
        })

        const request = new NextRequest('http://localhost:3000/api/settings/pricing/labor-rates')
        const response = await getLaborRates(request)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe('Authentication is required')
        expect(data.type).toBe('UNAUTHORIZED')
      })

      it('should handle role filtering', async () => {
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

        const request = new NextRequest('http://localhost:3000/api/settings/pricing/labor-rates?role=technician&is_active=true')
        await getLaborRates(request)

        expect(mockQuery.eq).toHaveBeenCalledWith('role', 'technician')
        expect(mockQuery.eq).toHaveBeenCalledWith('is_active', true)
      })
    })

    describe('POST /api/settings/pricing/labor-rates', () => {
      const validLaborRateData = {
        role: 'technician',
        hourly_rate: 75.00,
        overtime_rate: 112.50,
        hazard_multiplier: 1.25,
        effective_date: '2026-02-01'
      }

      it('should create a new labor rate for authenticated user', async () => {
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

        const mockCreatedRate = {
          id: 'rate-3',
          ...validLaborRateData,
          organization_id: 'org-1',
          is_active: true,
          created_at: '2026-01-31T10:00:00Z'
        }

        const mockInsert = {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: mockCreatedRate,
            error: null
          })
        }

        vi.mocked(mockSupabaseClient.from).mockReturnValue(mockInsert as any)

        const request = new NextRequest('http://localhost:3000/api/settings/pricing/labor-rates', {
          method: 'POST',
          body: JSON.stringify(validLaborRateData)
        })

        const response = await createLaborRate(request)
        const data = await response.json()

        expect(response.status).toBe(201)
        expect(data.rate).toEqual(mockCreatedRate)
      })

      it('should validate required role field', async () => {
        vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
          data: { user: { id: 'user-1', email: 'test@example.com' } },
          error: null
        })

        const invalidData = { ...validLaborRateData }
        delete invalidData.role

        const request = new NextRequest('http://localhost:3000/api/settings/pricing/labor-rates', {
          method: 'POST',
          body: JSON.stringify(invalidData)
        })

        const response = await createLaborRate(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('role is required')
        expect(data.type).toBe('VALIDATION_ERROR')
        expect(data.field).toBe('role')
      })

      it('should validate hourly_rate is positive', async () => {
        vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
          data: { user: { id: 'user-1', email: 'test@example.com' } },
          error: null
        })

        const invalidData = { ...validLaborRateData, hourly_rate: -10.00 }

        const request = new NextRequest('http://localhost:3000/api/settings/pricing/labor-rates', {
          method: 'POST',
          body: JSON.stringify(invalidData)
        })

        const response = await createLaborRate(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('hourly_rate must be positive')
        expect(data.type).toBe('VALIDATION_ERROR')
        expect(data.field).toBe('hourly_rate')
      })
    })
  })

  describe('Material Costs API', () => {
    describe('GET /api/settings/pricing/material-costs', () => {
      it('should return material costs for authenticated user', async () => {
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

        const mockMaterialRates = [
          {
            id: 'mat-1',
            material_type: 'plastic_sheeting',
            unit: 'sqft',
            cost_per_unit: 2.50,
            markup_percentage: 25,
            effective_date: '2026-01-01',
            is_active: true,
            created_at: '2026-01-01T00:00:00Z'
          }
        ]

        const mockQuery = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          range: vi.fn().mockResolvedValue({
            data: mockMaterialRates,
            error: null,
            count: 1
          })
        }

        vi.mocked(mockSupabaseClient.from).mockReturnValue(mockQuery as any)

        const request = new NextRequest('http://localhost:3000/api/settings/pricing/material-costs')
        const response = await getMaterialCosts(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.rates).toEqual(mockMaterialRates)
        expect(data.total).toBe(1)
      })
    })

    describe('POST /api/settings/pricing/material-costs', () => {
      const validMaterialRateData = {
        material_type: 'plastic_sheeting',
        unit: 'sqft',
        cost_per_unit: 2.50,
        markup_percentage: 25,
        effective_date: '2026-02-01'
      }

      it('should create a new material rate for authenticated user', async () => {
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

        const mockCreatedRate = {
          id: 'mat-2',
          ...validMaterialRateData,
          organization_id: 'org-1',
          is_active: true,
          created_at: '2026-01-31T10:00:00Z'
        }

        const mockInsert = {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: mockCreatedRate,
            error: null
          })
        }

        vi.mocked(mockSupabaseClient.from).mockReturnValue(mockInsert as any)

        const request = new NextRequest('http://localhost:3000/api/settings/pricing/material-costs', {
          method: 'POST',
          body: JSON.stringify(validMaterialRateData)
        })

        const response = await createMaterialCost(request)
        const data = await response.json()

        expect(response.status).toBe(201)
        expect(data.rate).toEqual(mockCreatedRate)
      })

      it('should validate required material_type field', async () => {
        vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
          data: { user: { id: 'user-1', email: 'test@example.com' } },
          error: null
        })

        const invalidData = { ...validMaterialRateData }
        delete invalidData.material_type

        const request = new NextRequest('http://localhost:3000/api/settings/pricing/material-costs', {
          method: 'POST',
          body: JSON.stringify(invalidData)
        })

        const response = await createMaterialCost(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('material_type is required')
        expect(data.type).toBe('VALIDATION_ERROR')
        expect(data.field).toBe('material_type')
      })
    })
  })

  describe('Disposal Fees API', () => {
    describe('GET /api/settings/pricing/disposal-fees', () => {
      it('should return disposal fees for authenticated user', async () => {
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

        const mockDisposalRates = [
          {
            id: 'disp-1',
            hazard_type: 'asbestos',
            disposal_method: 'landfill',
            cost_per_unit: 150.00,
            unit: 'cubic_yard',
            minimum_charge: 500.00,
            effective_date: '2026-01-01',
            is_active: true,
            created_at: '2026-01-01T00:00:00Z'
          }
        ]

        const mockQuery = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          range: vi.fn().mockResolvedValue({
            data: mockDisposalRates,
            error: null,
            count: 1
          })
        }

        vi.mocked(mockSupabaseClient.from).mockReturnValue(mockQuery as any)

        const request = new NextRequest('http://localhost:3000/api/settings/pricing/disposal-fees')
        const response = await getDisposalFees(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.rates).toEqual(mockDisposalRates)
        expect(data.total).toBe(1)
      })
    })

    describe('POST /api/settings/pricing/disposal-fees', () => {
      const validDisposalRateData = {
        hazard_type: 'asbestos',
        disposal_method: 'landfill',
        cost_per_unit: 150.00,
        unit: 'cubic_yard',
        minimum_charge: 500.00,
        effective_date: '2026-02-01'
      }

      it('should create a new disposal rate for authenticated user', async () => {
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

        const mockCreatedRate = {
          id: 'disp-2',
          ...validDisposalRateData,
          organization_id: 'org-1',
          is_active: true,
          created_at: '2026-01-31T10:00:00Z'
        }

        const mockInsert = {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: mockCreatedRate,
            error: null
          })
        }

        vi.mocked(mockSupabaseClient.from).mockReturnValue(mockInsert as any)

        const request = new NextRequest('http://localhost:3000/api/settings/pricing/disposal-fees', {
          method: 'POST',
          body: JSON.stringify(validDisposalRateData)
        })

        const response = await createDisposalFee(request)
        const data = await response.json()

        expect(response.status).toBe(201)
        expect(data.rate).toEqual(mockCreatedRate)
      })

      it('should validate required hazard_type field', async () => {
        vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
          data: { user: { id: 'user-1', email: 'test@example.com' } },
          error: null
        })

        const invalidData = { ...validDisposalRateData }
        delete invalidData.hazard_type

        const request = new NextRequest('http://localhost:3000/api/settings/pricing/disposal-fees', {
          method: 'POST',
          body: JSON.stringify(invalidData)
        })

        const response = await createDisposalFee(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('hazard_type is required')
        expect(data.type).toBe('VALIDATION_ERROR')
        expect(data.field).toBe('hazard_type')
      })

      it('should validate cost_per_unit is positive', async () => {
        vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
          data: { user: { id: 'user-1', email: 'test@example.com' } },
          error: null
        })

        const invalidData = { ...validDisposalRateData, cost_per_unit: -50.00 }

        const request = new NextRequest('http://localhost:3000/api/settings/pricing/disposal-fees', {
          method: 'POST',
          body: JSON.stringify(invalidData)
        })

        const response = await createDisposalFee(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('cost_per_unit must be positive')
        expect(data.type).toBe('VALIDATION_ERROR')
        expect(data.field).toBe('cost_per_unit')
      })
    })
  })
})