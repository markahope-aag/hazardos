import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { PATCH } from '@/app/api/commissions/[id]/route'
import { CommissionService } from '@/lib/services/commission-service'
import { logger } from '@/lib/utils/logger'
import type { CommissionEarning } from '@/types/sales'

// Mock CommissionService
vi.mock('@/lib/services/commission-service', () => ({
  CommissionService: {
    approveEarning: vi.fn(),
    rejectEarning: vi.fn(),
    markPaid: vi.fn()
  }
}))

// Mock createApiHandlerWithParams
vi.mock('@/lib/utils/api-handler', async (importOriginal) => {
  const actual = await importOriginal() as any
  const errorHandler = await import('@/lib/utils/secure-error-handler')

  return {
    ...actual,
    createApiHandlerWithParams: (options: any, handler: any) => {
      return async (request: any, props: any) => {
        try {
          const mockContext = {
            user: { id: 'user-123', email: 'test@example.com' },
            profile: { organization_id: 'org-123', role: 'admin' },
            log: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
            requestId: 'test-request-id'
          }

          const params = await props.params

          let body = {}
          if (options.bodySchema) {
            try {
              body = await request.json()
            } catch {
              // No body
            }
          }

          return await handler(request, mockContext, params, body, {})
        } catch (error) {
          return errorHandler.createSecureErrorResponse(error, logger)
        }
      }
    }
  }
})

describe('Commission ID API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('PATCH /api/commissions/[id]', () => {
    it('should approve a commission earning', async () => {
      // Arrange
      const mockEarning: CommissionEarning = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        organization_id: 'org-123',
        user_id: 'user-456',
        plan_id: 'plan-1',
        opportunity_id: null,
        job_id: null,
        invoice_id: null,
        base_amount: 5000,
        commission_rate: 0.1,
        commission_amount: 500.00,
        status: 'approved',
        approved_by: 'user-123',
        approved_at: new Date().toISOString(),
        rejected_by: null,
        rejected_at: null,
        rejection_reason: null,
        paid_at: null,
        earning_date: new Date().toISOString(),
        pay_period: null,
        created_at: new Date().toISOString()
      }

      vi.mocked(CommissionService.approveEarning).mockResolvedValue(mockEarning)

      const request = new NextRequest('http://localhost:3000/api/commissions/550e8400-e29b-41d4-a716-446655440001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve'
        })
      })

      // Act
      const response = await PATCH(request, {
        params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440001' })
      })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.status).toBe('approved')
      expect(data.commission_amount).toBe(500.00)
      expect(CommissionService.approveEarning).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440001')
    })

    it('should reject a commission earning with a reason', async () => {
      const mockEarning = {
        id: '550e8400-e29b-41d4-a716-446655440003',
        user_id: 'user-456',
        status: 'rejected',
        rejected_by: 'user-123',
        rejection_reason: 'Deal fell through',
      }

      vi.mocked(CommissionService.rejectEarning).mockResolvedValue(mockEarning as never)

      const request = new NextRequest('http://localhost:3000/api/commissions/550e8400-e29b-41d4-a716-446655440003', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', reason: 'Deal fell through' }),
      })

      const response = await PATCH(request, {
        params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440003' }),
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('rejected')
      expect(CommissionService.rejectEarning).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440003',
        'Deal fell through',
      )
    })

    it('should mark a commission as paid', async () => {
      // Arrange
      const mockEarning: CommissionEarning = {
        id: '550e8400-e29b-41d4-a716-446655440002',
        organization_id: 'org-123',
        user_id: 'user-456',
        plan_id: 'plan-1',
        opportunity_id: null,
        job_id: null,
        invoice_id: null,
        base_amount: 7500,
        commission_rate: 0.1,
        commission_amount: 750.00,
        status: 'paid',
        approved_by: 'user-123',
        approved_at: new Date().toISOString(),
        rejected_by: null,
        rejected_at: null,
        rejection_reason: null,
        paid_at: new Date().toISOString(),
        earning_date: new Date().toISOString(),
        pay_period: null,
        created_at: new Date().toISOString()
      }

      vi.mocked(CommissionService.markPaid).mockResolvedValue(mockEarning)

      const request = new NextRequest('http://localhost:3000/api/commissions/550e8400-e29b-41d4-a716-446655440002', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark_paid'
        })
      })

      // Act
      const response = await PATCH(request, {
        params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440002' })
      })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.status).toBe('paid')
      expect(data.commission_amount).toBe(750.00)
      expect(CommissionService.markPaid).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440002')
    })
  })
})
