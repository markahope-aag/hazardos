import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/feedback/testimonials/route'
import { FeedbackService } from '@/lib/services/feedback-service'

const mockSupabaseClient = {
  auth: { getUser: vi.fn() },
  from: vi.fn()
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}))

vi.mock('@/lib/services/feedback-service', () => ({
  FeedbackService: {
    getApprovedTestimonials: vi.fn()
  }
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

describe('Feedback Testimonials API', () => {
  const mockProfile = {
    organization_id: 'org-123',
    role: 'user'
  }

  const setupAuthenticatedUser = () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-123', email: 'user@example.com' } },
      error: null,
    })

    vi.mocked(mockSupabaseClient.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null
          })
        })
      })
    } as any)
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/feedback/testimonials', () => {
    it('should return approved testimonials', async () => {
      setupAuthenticatedUser()

      const mockTestimonials = [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          customer_name: 'John Doe',
          testimonial: 'Excellent service!',
          rating: 5,
          job_type: 'Asbestos Removal',
          approved_at: '2026-01-15T10:00:00Z',
          is_approved: true
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          customer_name: 'Jane Smith',
          testimonial: 'Very professional team',
          rating: 5,
          job_type: 'Mold Remediation',
          approved_at: '2026-01-20T10:00:00Z',
          is_approved: true
        }
      ]

      vi.mocked(FeedbackService.getApprovedTestimonials).mockResolvedValue(mockTestimonials)

      const request = new NextRequest('http://localhost:3000/api/feedback/testimonials')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      expect(data).toHaveLength(2)
      expect(data[0].is_approved).toBe(true)
      expect(FeedbackService.getApprovedTestimonials).toHaveBeenCalled()
    })

    it('should return empty array when no testimonials', async () => {
      setupAuthenticatedUser()

      vi.mocked(FeedbackService.getApprovedTestimonials).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/feedback/testimonials')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      expect(data).toHaveLength(0)
    })

    it('should return 401 for unauthenticated user', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/feedback/testimonials')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication is required')
      expect(data.type).toBe('UNAUTHORIZED')
    })

    it('should handle service errors securely', async () => {
      setupAuthenticatedUser()

      vi.mocked(FeedbackService.getApprovedTestimonials).mockRejectedValue(
        new Error('Database connection failed')
      )

      const request = new NextRequest('http://localhost:3000/api/feedback/testimonials')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('An internal server error occurred')
      expect(data.type).toBe('INTERNAL_ERROR')
    })

    it('should only return approved testimonials', async () => {
      setupAuthenticatedUser()

      const mockTestimonials = [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          customer_name: 'John Doe',
          testimonial: 'Great work!',
          rating: 5,
          is_approved: true,
          approved_at: '2026-01-15T10:00:00Z'
        }
      ]

      vi.mocked(FeedbackService.getApprovedTestimonials).mockResolvedValue(mockTestimonials)

      const request = new NextRequest('http://localhost:3000/api/feedback/testimonials')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.every((t: any) => t.is_approved === true)).toBe(true)
    })
  })
})
