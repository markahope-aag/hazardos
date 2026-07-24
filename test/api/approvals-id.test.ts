import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, PATCH } from '@/app/api/approvals/[id]/route'
import { ApprovalService } from '@/lib/services/approval-service'
import { logger } from '@/lib/utils/logger'
import type { ApprovalRequest } from '@/types/sales'

const baseApproval: ApprovalRequest = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  organization_id: 'org-123',
  entity_type: 'estimate',
  entity_id: '550e8400-e29b-41d4-a716-446655440010',
  amount: 5000,
  requested_by: 'user-456',
  requested_at: new Date().toISOString(),
  level1_status: 'pending',
  level1_approver: null,
  level1_at: null,
  level1_notes: null,
  requires_level2: false,
  level2_status: null,
  level2_approver: null,
  level2_at: null,
  level2_notes: null,
  final_status: 'pending',
  created_at: new Date().toISOString()
}

// Mock ApprovalService
vi.mock('@/lib/services/approval-service', () => ({
  ApprovalService: {
    getRequest: vi.fn(),
    decideLevel1: vi.fn(),
    decideLevel2: vi.fn()
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
          if (options.bodySchema && request.method !== 'GET') {
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

describe('Approval ID API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/approvals/[id]', () => {
    it('should get an approval request', async () => {
      // Arrange
      const mockApproval: ApprovalRequest = {
        ...baseApproval,
        entity_type: 'estimate'
      }

      vi.mocked(ApprovalService.getRequest).mockResolvedValue(mockApproval)

      const request = new NextRequest('http://localhost:3000/api/approvals/550e8400-e29b-41d4-a716-446655440001')

      // Act
      const response = await GET(request, {
        params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440001' })
      })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.id).toBe(mockApproval.id)
      expect(data.entity_type).toBe('estimate')
      expect(ApprovalService.getRequest).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440001')
    })

    it('should return 404 when approval not found', async () => {
      // Arrange
      vi.mocked(ApprovalService.getRequest).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/approvals/nonexistent-id')

      // Act
      const response = await GET(request, {
        params: Promise.resolve({ id: 'nonexistent-id' })
      })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(data.error).toBeTruthy()
    })
  })

  describe('PATCH /api/approvals/[id]', () => {
    it('should approve at level 1', async () => {
      // Arrange
      const mockResult: ApprovalRequest = {
        ...baseApproval,
        level1_status: 'approved',
        level1_approver: 'user-123',
        level1_at: new Date().toISOString(),
        level1_notes: 'Looks good',
        final_status: 'approved'
      }

      vi.mocked(ApprovalService.decideLevel1).mockResolvedValue(mockResult)

      const request = new NextRequest('http://localhost:3000/api/approvals/550e8400-e29b-41d4-a716-446655440001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: 1,
          approved: true,
          notes: 'Looks good'
        })
      })

      // Act
      const response = await PATCH(request, {
        params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440001' })
      })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.level1_status).toBe('approved')
      expect(ApprovalService.decideLevel1).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440001',
        { approved: true, notes: 'Looks good' }
      )
    })

    it('should reject at level 1', async () => {
      // Arrange
      const mockResult: ApprovalRequest = {
        ...baseApproval,
        level1_status: 'rejected',
        level1_approver: 'user-123',
        level1_at: new Date().toISOString(),
        level1_notes: 'Needs more work',
        final_status: 'rejected'
      }

      vi.mocked(ApprovalService.decideLevel1).mockResolvedValue(mockResult)

      const request = new NextRequest('http://localhost:3000/api/approvals/550e8400-e29b-41d4-a716-446655440001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: 1,
          approved: false,
          notes: 'Needs more work'
        })
      })

      // Act
      const response = await PATCH(request, {
        params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440001' })
      })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.level1_status).toBe('rejected')
    })

    it('should approve at level 2', async () => {
      // Arrange
      const mockResult: ApprovalRequest = {
        ...baseApproval,
        level1_status: 'approved',
        requires_level2: true,
        level2_status: 'approved',
        level2_approver: 'user-123',
        level2_at: new Date().toISOString(),
        final_status: 'approved'
      }

      vi.mocked(ApprovalService.decideLevel2).mockResolvedValue(mockResult)

      const request = new NextRequest('http://localhost:3000/api/approvals/550e8400-e29b-41d4-a716-446655440001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: 2,
          approved: true
        })
      })

      // Act
      const response = await PATCH(request, {
        params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440001' })
      })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.level2_status).toBe('approved')
      expect(ApprovalService.decideLevel2).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440001',
        { approved: true, notes: undefined }
      )
    })

    it('should reject at level 2', async () => {
      // Arrange
      const mockResult: ApprovalRequest = {
        ...baseApproval,
        level1_status: 'approved',
        requires_level2: true,
        level2_status: 'rejected',
        level2_approver: 'user-123',
        level2_at: new Date().toISOString(),
        level2_notes: 'Safety concerns',
        final_status: 'rejected'
      }

      vi.mocked(ApprovalService.decideLevel2).mockResolvedValue(mockResult)

      const request = new NextRequest('http://localhost:3000/api/approvals/550e8400-e29b-41d4-a716-446655440001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: 2,
          approved: false,
          notes: 'Safety concerns'
        })
      })

      // Act
      const response = await PATCH(request, {
        params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440001' })
      })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.level2_status).toBe('rejected')
    })
  })
})
