import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/feedback/stats/route'

const mockSupabaseClient = {
  auth: { getUser: vi.fn() },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({ single: vi.fn() }))
    }))
  }))
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}))

vi.mock('@/lib/services/feedback-service', () => ({
  FeedbackService: {
    getFeedbackStats: vi.fn()
  }
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

import { FeedbackService } from '@/lib/services/feedback-service'

describe('Feedback Stats API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockProfile = {
    organization_id: 'org-123',
    role: 'admin'
  }

  describe('GET /api/feedback/stats', () => {
    it('should return feedback statistics', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null
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

      const mockStats = {
        total_feedback: 150,
        average_rating: 4.5,
        positive_count: 120,
        negative_count: 30,
        response_rate: 85.5
      }

      vi.mocked(FeedbackService.getFeedbackStats).mockResolvedValue(mockStats)

      const request = new NextRequest('http://localhost:3000/api/feedback/stats')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.total_feedback).toBe(150)
      expect(data.average_rating).toBe(4.5)
      expect(data.positive_count).toBe(120)
      expect(FeedbackService.getFeedbackStats).toHaveBeenCalled()
    })

    it('should reject unauthenticated requests', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/feedback/stats')

      // Act
      const response = await GET(request)

      // Assert
      expect(response.status).toBe(401)
    })
  })
})
