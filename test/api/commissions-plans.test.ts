import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/commissions/plans/route'
import { CommissionService } from '@/lib/services/commission-service'
import type { CommissionPlan } from '@/types/sales'

// Mock CommissionService
vi.mock('@/lib/services/commission-service', () => ({
  CommissionService: {
    getPlans: vi.fn(),
    createPlan: vi.fn()
  }
}))

// Mock createApiHandler to provide test context
vi.mock('@/lib/utils/api-handler', async (importOriginal) => {
  const actual = await importOriginal() as any
  return {
    ...actual,
    createApiHandler: (options: any, handler: any) => {
      return async (request: any) => {
        const mockContext = {
          user: { id: 'user-123', email: 'test@example.com' },
          profile: { organization_id: 'org-123', role: 'admin' },
          log: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
          requestId: 'test-request-id'
        }

        let body = {}
        if (options.bodySchema) {
          try {
            body = await request.json()
          } catch {
            // No body
          }
        }

        return await handler(request, mockContext, body, {})
      }
    }
  }
})

describe('Commission Plans API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/commissions/plans', () => {
    it('should list all commission plans', async () => {
      // Arrange
      const mockPlans: CommissionPlan[] = [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          organization_id: 'org-123',
          name: 'Sales Rep Standard',
          commission_type: 'percentage',
          base_rate: 0.05,
          tiers: null,
          applies_to: 'won',
          is_active: true,
          created_at: new Date().toISOString()
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          organization_id: 'org-123',
          name: 'Manager Tier',
          commission_type: 'percentage',
          base_rate: 0.08,
          tiers: null,
          applies_to: 'won',
          is_active: true,
          created_at: new Date().toISOString()
        }
      ]

      vi.mocked(CommissionService.getPlans).mockResolvedValue(mockPlans)

      const request = new NextRequest('http://localhost:3000/api/commissions/plans')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toHaveLength(2)
      expect(data[0].name).toBe('Sales Rep Standard')
      expect(CommissionService.getPlans).toHaveBeenCalledOnce()
    })

    it('should return empty array when no plans exist', async () => {
      // Arrange
      vi.mocked(CommissionService.getPlans).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/commissions/plans')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual([])
    })
  })

  describe('POST /api/commissions/plans', () => {
    it('should create a new commission plan', async () => {
      // Arrange
      const newPlan: CommissionPlan = {
        id: '550e8400-e29b-41d4-a716-446655440003',
        organization_id: 'org-123',
        name: 'New Sales Plan',
        commission_type: 'percentage',
        base_rate: 0.10,
        tiers: null,
        applies_to: 'won',
        is_active: true,
        created_at: new Date().toISOString()
      }

      vi.mocked(CommissionService.createPlan).mockResolvedValue(newPlan)

      const request = new NextRequest('http://localhost:3000/api/commissions/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Sales Plan',
          description: 'Performance-based commission',
          rate: 0.10,
          structure_type: 'percentage'
        })
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.id).toBe(newPlan.id)
      expect(data.name).toBe('New Sales Plan')
      expect(data.base_rate).toBe(0.10)
      expect(CommissionService.createPlan).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Sales Plan'
        })
      )
    })

    it('should create plan with tiered structure', async () => {
      // Arrange
      const tieredPlan: CommissionPlan = {
        id: '550e8400-e29b-41d4-a716-446655440004',
        organization_id: 'org-123',
        name: 'Tiered Sales Plan',
        commission_type: 'tiered',
        base_rate: null,
        tiers: [
          { min: 0, max: 10000, rate: 0.05 },
          { min: 10000, max: 50000, rate: 0.08 },
          { min: 50000, max: null, rate: 0.10 }
        ],
        applies_to: 'won',
        is_active: true,
        created_at: new Date().toISOString()
      }

      vi.mocked(CommissionService.createPlan).mockResolvedValue(tieredPlan)

      const request = new NextRequest('http://localhost:3000/api/commissions/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Tiered Sales Plan',
          description: 'Multi-tier commission structure',
          structure_type: 'tiered',
          tiers: [
            { min: 0, max: 10000, rate: 0.05 },
            { min: 10000, max: 50000, rate: 0.08 },
            { min: 50000, max: null, rate: 0.10 }
          ]
        })
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.commission_type).toBe('tiered')
      expect(data.tiers).toHaveLength(3)
    })
  })
})
