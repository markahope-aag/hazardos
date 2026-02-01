import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { PATCH } from '@/app/api/commissions/[id]/route'
import { CommissionService } from '@/lib/services/commission-service'

// Mock CommissionService
vi.mock('@/lib/services/commission-service', () => ({
  CommissionService: {
    approveEarning: vi.fn(),
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
          return errorHandler.createSecureErrorResponse(error, {
            error: vi.fn(),
            warn: vi.fn(),
            info: vi.fn()
          })
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
      const mockEarning = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        user_id: 'user-456',
        amount: 500.00,
        status: 'approved',
        approved_by: 'user-123',
        approved_at: new Date().toISOString()
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
      expect(data.amount).toBe(500.00)
      expect(CommissionService.approveEarning).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440001')
    })

    it('should mark a commission as paid', async () => {
      // Arrange
      const mockEarning = {
        id: '550e8400-e29b-41d4-a716-446655440002',
        user_id: 'user-456',
        amount: 750.00,
        status: 'paid',
        paid_by: 'user-123',
        paid_at: new Date().toISOString()
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
      expect(data.amount).toBe(750.00)
      expect(CommissionService.markPaid).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440002')
    })
  })
})
