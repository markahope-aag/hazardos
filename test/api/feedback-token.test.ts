import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/feedback/submit/[token]/route'
import { FeedbackService } from '@/lib/services/feedback-service'

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
      const mockSurvey = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        access_token: 'valid-token-123',
        job_id: '550e8400-e29b-41d4-a716-446655440010',
        customer_id: '550e8400-e29b-41d4-a716-446655440020',
        status: 'sent',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
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
      expect(data.access_token).toBe('valid-token-123')
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
      const mockSubmittedSurvey = {
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
      }

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
      const mockSubmittedSurvey = {
        id: '550e8400-e29b-41d4-a716-446655440002',
        rating_overall: 3,
        feedback_text: 'Good but could improve',
        status: 'completed'
      }

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
