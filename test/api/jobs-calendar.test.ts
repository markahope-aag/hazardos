import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/jobs/calendar/route'

const mockSupabaseClient = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn()
      }))
    }))
  }))
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}))

vi.mock('@/lib/services/jobs-service', () => ({
  JobsService: {
    getCalendarEvents: vi.fn(),
  },
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

import { JobsService } from '@/lib/services/jobs-service'

describe('Jobs Calendar API', () => {
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

  describe('GET /api/jobs/calendar', () => {
    it('should return jobs for date range', async () => {
      setupAuthenticatedUser()

      const mockJobs = [
        { id: 'job-1', title: 'Job 1', scheduled_start_date: '2026-03-01', status: 'scheduled' },
        { id: 'job-2', title: 'Job 2', scheduled_start_date: '2026-03-15', status: 'in_progress' },
      ]
      vi.mocked(JobsService.getCalendarEvents).mockResolvedValue(mockJobs)

      const request = new NextRequest('http://localhost:3000/api/jobs/calendar?start=2026-03-01&end=2026-03-31')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockJobs)
      expect(JobsService.getCalendarEvents).toHaveBeenCalledWith('2026-03-01', '2026-03-31')
    })

    it('should return empty array when no jobs in range', async () => {
      setupAuthenticatedUser()

      vi.mocked(JobsService.getCalendarEvents).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/jobs/calendar?start=2026-06-01&end=2026-06-30')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual([])
    })

    it('should reject request without start date', async () => {
      setupAuthenticatedUser()

      const request = new NextRequest('http://localhost:3000/api/jobs/calendar?end=2026-03-31')
      const response = await GET(request)

      expect(response.status).toBe(400)
    })

    it('should reject request without end date', async () => {
      setupAuthenticatedUser()

      const request = new NextRequest('http://localhost:3000/api/jobs/calendar?start=2026-03-01')
      const response = await GET(request)

      expect(response.status).toBe(400)
    })

    it('should reject invalid date format', async () => {
      setupAuthenticatedUser()

      const request = new NextRequest('http://localhost:3000/api/jobs/calendar?start=invalid&end=2026-03-31')
      const response = await GET(request)

      expect(response.status).toBe(400)
    })
  })
})
