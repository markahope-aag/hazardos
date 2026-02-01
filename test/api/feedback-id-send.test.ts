import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/feedback/[id]/send/route'
import { FeedbackService } from '@/lib/services/feedback-service'

// Mock FeedbackService
vi.mock('@/lib/services/feedback-service', () => ({
  FeedbackService: {
    sendSurvey: vi.fn()
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

describe('Feedback Send API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/feedback/[id]/send', () => {
    it('should send a feedback survey email', async () => {
      // Arrange
      vi.mocked(FeedbackService.sendSurvey).mockResolvedValue(undefined)

      const request = new NextRequest('http://localhost:3000/api/feedback/550e8400-e29b-41d4-a716-446655440001/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_email: 'customer@example.com'
        })
      })

      // Act
      const response = await POST(request, {
        params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440001' })
      })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(FeedbackService.sendSurvey).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440001',
        'customer@example.com'
      )
    })

    it('should handle sending to different email addresses', async () => {
      // Arrange
      vi.mocked(FeedbackService.sendSurvey).mockResolvedValue(undefined)

      const request = new NextRequest('http://localhost:3000/api/feedback/550e8400-e29b-41d4-a716-446655440002/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_email: 'alternate@example.com'
        })
      })

      // Act
      const response = await POST(request, {
        params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440002' })
      })

      // Assert
      expect(response.status).toBe(200)
      expect(FeedbackService.sendSurvey).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440002',
        'alternate@example.com'
      )
    })
  })
})
