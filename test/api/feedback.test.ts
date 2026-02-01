import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/feedback/route'
import { FeedbackService } from '@/lib/services/feedback-service'

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
    listSurveys: vi.fn(),
    createSurvey: vi.fn()
  }
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

describe('Feedback API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockProfile = {
    organization_id: 'org-123',
    role: 'user'
  }

  describe('GET /api/feedback', () => {
    it('should list feedback surveys', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'user@example.com' } },
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

      const mockSurveys = [
        { id: 'survey-1', job_id: 'job-1', status: 'sent', score: 5 },
        { id: 'survey-2', job_id: 'job-2', status: 'completed', score: 4 }
      ]

      vi.mocked(FeedbackService.listSurveys).mockResolvedValue(mockSurveys)

      const request = new NextRequest('http://localhost:3000/api/feedback')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockSurveys)
    })
  })

  describe('POST /api/feedback', () => {
    it('should create feedback survey', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'user@example.com' } },
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

      const mockSurvey = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        job_id: '550e8400-e29b-41d4-a716-446655440000',
        status: 'sent'
      }

      vi.mocked(FeedbackService.createSurvey).mockResolvedValue(mockSurvey)

      const surveyData = {
        job_id: '550e8400-e29b-41d4-a716-446655440000',
        send_immediately: true,
        recipient_email: 'customer@example.com'
      }

      const request = new NextRequest('http://localhost:3000/api/feedback', {
        method: 'POST',
        body: JSON.stringify(surveyData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toEqual(mockSurvey)
    })
  })
})
