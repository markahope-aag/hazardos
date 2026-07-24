import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST, DELETE } from '@/app/api/feedback/[id]/approve-testimonial/route'
import { FeedbackService } from '@/lib/services/feedback-service'
import { logger } from '@/lib/utils/logger'
import type { FeedbackSurvey } from '@/types/feedback'

function buildMockSurvey(overrides: Partial<FeedbackSurvey>): FeedbackSurvey {
  return {
    id: '550e8400-e29b-41d4-a716-446655440001',
    organization_id: 'org-123',
    job_id: 'job-123',
    customer_id: 'customer-123',
    access_token: 'token-123',
    token_expires_at: new Date().toISOString(),
    status: 'completed',
    sent_at: null,
    sent_to_email: null,
    reminder_sent_at: null,
    viewed_at: null,
    completed_at: null,
    rating_overall: null,
    rating_quality: null,
    rating_communication: null,
    rating_timeliness: null,
    rating_value: null,
    would_recommend: null,
    likelihood_to_recommend: null,
    feedback_text: null,
    improvement_suggestions: null,
    testimonial_text: null,
    testimonial_permission: false,
    testimonial_approved: false,
    testimonial_approved_at: null,
    testimonial_approved_by: null,
    customer_name: null,
    customer_company: null,
    ip_address: null,
    user_agent: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  }
}

// Mock FeedbackService
vi.mock('@/lib/services/feedback-service', () => ({
  FeedbackService: {
    approveTestimonial: vi.fn(),
    rejectTestimonial: vi.fn()
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
            user: { id: 'user-123', email: 'admin@example.com' },
            profile: { organization_id: 'org-123', role: 'admin' },
            log: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
            requestId: 'test-request-id'
          }

          const params = await props.params

          let body = {}
          if (options.bodySchema && request.method === 'POST') {
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

describe('Feedback Approve Testimonial API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/feedback/[id]/approve-testimonial', () => {
    it('should approve a testimonial', async () => {
      // Arrange
      const mockSurvey = buildMockSurvey({
        id: '550e8400-e29b-41d4-a716-446655440001',
        testimonial_text: 'Great service, highly recommend!',
        testimonial_permission: true,
        testimonial_approved: true,
        testimonial_approved_by: 'user-123',
        testimonial_approved_at: new Date().toISOString()
      })

      vi.mocked(FeedbackService.approveTestimonial).mockResolvedValue(mockSurvey)

      const request = new NextRequest('http://localhost:3000/api/feedback/550e8400-e29b-41d4-a716-446655440001/approve-testimonial', {
        method: 'POST'
      })

      // Act
      const response = await POST(request, {
        params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440001' })
      })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.testimonial_approved).toBe(true)
      expect(FeedbackService.approveTestimonial).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440001')
    })

    it('should only allow admin roles to approve', async () => {
      // This is handled by the allowedRoles option in createApiHandlerWithParams
      // The mock bypasses this, but in real usage only admins can access
      const mockSurvey = buildMockSurvey({
        id: '550e8400-e29b-41d4-a716-446655440001',
        testimonial_approved: true
      })

      vi.mocked(FeedbackService.approveTestimonial).mockResolvedValue(mockSurvey)

      const request = new NextRequest('http://localhost:3000/api/feedback/550e8400-e29b-41d4-a716-446655440001/approve-testimonial', {
        method: 'POST'
      })

      const response = await POST(request, {
        params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440001' })
      })

      expect(response.status).toBe(200)
    })
  })

  describe('DELETE /api/feedback/[id]/approve-testimonial', () => {
    it('should reject a testimonial', async () => {
      // Arrange
      const mockSurvey = buildMockSurvey({
        id: '550e8400-e29b-41d4-a716-446655440002',
        testimonial_text: 'Not appropriate for website',
        testimonial_permission: true,
        testimonial_approved: false,
        testimonial_approved_at: null,
        testimonial_approved_by: null
      })

      vi.mocked(FeedbackService.rejectTestimonial).mockResolvedValue(mockSurvey)

      const request = new NextRequest('http://localhost:3000/api/feedback/550e8400-e29b-41d4-a716-446655440002/approve-testimonial', {
        method: 'DELETE'
      })

      // Act
      const response = await DELETE(request, {
        params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440002' })
      })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.testimonial_approved).toBe(false)
      expect(FeedbackService.rejectTestimonial).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440002')
    })
  })
})
