import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/feedback/submit/[token]/route'
import { FeedbackService } from '@/lib/services/feedback-service'
import type { FeedbackSurvey, PublicSurveyView } from '@/types/feedback'

function buildMockSurvey(overrides: Partial<FeedbackSurvey>): FeedbackSurvey {
  return {
    id: '550e8400-e29b-41d4-a716-446655440001',
    organization_id: 'org-123',
    job_id: 'job-123',
    customer_id: 'customer-123',
    access_token: 'valid-token-123',
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
    getSurveyByToken: vi.fn(),
    submitFeedback: vi.fn()
  }
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

describe('Feedback Token API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/feedback/submit/[token]', () => {
    it('should get survey by token', async () => {
      // Arrange
      const mockSurvey: PublicSurveyView = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        job_number: 'JOB-001',
        job_name: 'Asbestos Removal',
        organization_name: 'HazardOS Test Org',
        organization_logo: null,
        customer_name: 'Jane Doe',
        status: 'sent',
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
        testimonial_permission: false
      }

      vi.mocked(FeedbackService.getSurveyByToken).mockResolvedValue(mockSurvey)

      const request = new NextRequest('http://localhost:3000/api/feedback/submit/valid-token-123')

      // Act
      const response = await GET(request, {
        params: Promise.resolve({ token: 'valid-token-123' })
      })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.job_number).toBe('JOB-001')
      expect(FeedbackService.getSurveyByToken).toHaveBeenCalledWith('valid-token-123')
    })

    it('should return 404 when survey not found', async () => {
      // Arrange
      vi.mocked(FeedbackService.getSurveyByToken).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/feedback/submit/invalid-token')

      // Act
      const response = await GET(request, {
        params: Promise.resolve({ token: 'invalid-token' })
      })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(data.error).toBeTruthy()
    })
  })

  describe('POST /api/feedback/submit/[token]', () => {
    it('should submit feedback responses', async () => {
      // Arrange
      const mockSubmittedSurvey = buildMockSurvey({
        id: '550e8400-e29b-41d4-a716-446655440001',
        rating_overall: 5,
        rating_quality: 5,
        rating_communication: 4,
        rating_timeliness: 5,
        rating_value: 4,
        would_recommend: true,
        likelihood_to_recommend: 10,
        feedback_text: 'Excellent service!',
        testimonial_text: 'Highly professional team',
        testimonial_permission: true,
        status: 'completed',
        completed_at: new Date().toISOString()
      })

      vi.mocked(FeedbackService.submitFeedback).mockResolvedValue(mockSubmittedSurvey)

      const request = new NextRequest('http://localhost:3000/api/feedback/submit/valid-token-123', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Mozilla/5.0'
        },
        body: JSON.stringify({
          rating_overall: 5,
          rating_quality: 5,
          rating_communication: 4,
          rating_timeliness: 5,
          rating_value: 4,
          would_recommend: true,
          likelihood_to_recommend: 10,
          feedback_text: 'Excellent service!',
          testimonial_text: 'Highly professional team',
          testimonial_permission: true
        })
      })

      // Act
      const response = await POST(request, {
        params: Promise.resolve({ token: 'valid-token-123' })
      })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.status).toBe('completed')
      expect(FeedbackService.submitFeedback).toHaveBeenCalledWith(
        'valid-token-123',
        expect.objectContaining({
          rating_overall: 5,
          would_recommend: true,
          likelihood_to_recommend: 10
        }),
        '192.168.1.1',
        'Mozilla/5.0'
      )
    })

    it('should handle partial feedback submissions', async () => {
      // Arrange
      const mockSubmittedSurvey = buildMockSurvey({
        id: '550e8400-e29b-41d4-a716-446655440002',
        rating_overall: 3,
        feedback_text: 'Good but could improve',
        status: 'completed'
      })

      vi.mocked(FeedbackService.submitFeedback).mockResolvedValue(mockSubmittedSurvey)

      const request = new NextRequest('http://localhost:3000/api/feedback/submit/token-456', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating_overall: 3,
          feedback_text: 'Good but could improve'
        })
      })

      // Act
      const response = await POST(request, {
        params: Promise.resolve({ token: 'token-456' })
      })

      // Assert
      expect(response.status).toBe(200)
      expect(FeedbackService.submitFeedback).toHaveBeenCalledWith(
        'token-456',
        expect.objectContaining({
          rating_overall: 3,
          feedback_text: 'Good but could improve'
        }),
        'unknown',
        undefined
      )
    })
  })
})
