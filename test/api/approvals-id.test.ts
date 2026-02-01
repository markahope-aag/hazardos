import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, PATCH } from '@/app/api/approvals/[id]/route'
import { ApprovalService } from '@/lib/services/approval-service'

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

describe('Approval ID API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/approvals/[id]', () => {
    it('should get an approval request', async () => {
      // Arrange
      const mockApproval = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        entity_type: 'job_completion',
        entity_id: '550e8400-e29b-41d4-a716-446655440010',
        level_1_status: 'pending',
        level_2_status: null,
        requested_by: 'user-456',
        requested_at: new Date().toISOString()
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
      expect(data.entity_type).toBe('job_completion')
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
      const mockResult = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        level_1_status: 'approved',
        level_1_decided_by: 'user-123',
        level_1_decided_at: new Date().toISOString(),
        level_1_notes: 'Looks good'
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
      expect(data.level_1_status).toBe('approved')
      expect(ApprovalService.decideLevel1).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440001',
        { approved: true, notes: 'Looks good' }
      )
    })

    it('should reject at level 1', async () => {
      // Arrange
      const mockResult = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        level_1_status: 'rejected',
        level_1_decided_by: 'user-123',
        level_1_decided_at: new Date().toISOString(),
        level_1_notes: 'Needs more work'
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
      expect(data.level_1_status).toBe('rejected')
    })

    it('should approve at level 2', async () => {
      // Arrange
      const mockResult = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        level_1_status: 'approved',
        level_2_status: 'approved',
        level_2_decided_by: 'user-123',
        level_2_decided_at: new Date().toISOString()
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
      expect(data.level_2_status).toBe('approved')
      expect(ApprovalService.decideLevel2).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440001',
        { approved: true, notes: undefined }
      )
    })

    it('should reject at level 2', async () => {
      // Arrange
      const mockResult = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        level_1_status: 'approved',
        level_2_status: 'rejected',
        level_2_decided_by: 'user-123',
        level_2_decided_at: new Date().toISOString(),
        level_2_notes: 'Safety concerns'
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
      expect(data.level_2_status).toBe('rejected')
    })
  })
})
