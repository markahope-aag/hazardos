import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/jobs/[id]/time-entries/route'

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

vi.mock('@/lib/services/job-completion-service', () => ({
  JobCompletionService: {
    getTimeEntries: vi.fn(),
    createTimeEntry: vi.fn(),
  },
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

import { JobCompletionService } from '@/lib/services/job-completion-service'

const JOB_UUID = '550e8400-e29b-41d4-a716-446655440001'

describe('Job Time Entries API', () => {
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

  describe('GET /api/jobs/[id]/time-entries', () => {
    it('should return time entries for a job', async () => {
      setupAuthenticatedUser()

      const mockTimeEntries = [
        { id: 'entry-1', job_id: JOB_UUID, user_id: 'user-1', hours: 8, work_date: '2026-03-01' },
        { id: 'entry-2', job_id: JOB_UUID, user_id: 'user-2', hours: 6, work_date: '2026-03-02' },
      ]
      vi.mocked(JobCompletionService.getTimeEntries).mockResolvedValue(mockTimeEntries)

      const request = new NextRequest(`http://localhost:3000/api/jobs/${JOB_UUID}/time-entries`)
      const response = await GET(request, { params: Promise.resolve({ id: JOB_UUID }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockTimeEntries)
      expect(JobCompletionService.getTimeEntries).toHaveBeenCalledWith(JOB_UUID)
    })

    it('should return empty array when no time entries', async () => {
      setupAuthenticatedUser()

      vi.mocked(JobCompletionService.getTimeEntries).mockResolvedValue([])

      const request = new NextRequest(`http://localhost:3000/api/jobs/${JOB_UUID}/time-entries`)
      const response = await GET(request, { params: Promise.resolve({ id: JOB_UUID }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual([])
    })
  })

  describe('POST /api/jobs/[id]/time-entries', () => {
    it('should create a time entry', async () => {
      setupAuthenticatedUser()

      const newEntry = {
        id: 'entry-new',
        job_id: JOB_UUID,
        user_id: 'user-123',
        hours: 8,
        work_date: '2026-03-01',
        description: 'Removal work',
      }
      vi.mocked(JobCompletionService.createTimeEntry).mockResolvedValue(newEntry)

      const request = new NextRequest(`http://localhost:3000/api/jobs/${JOB_UUID}/time-entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hours: 8,
          work_date: '2026-03-01',
          description: 'Removal work',
        }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: JOB_UUID }) })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toEqual(newEntry)
      expect(JobCompletionService.createTimeEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          job_id: JOB_UUID,
          hours: 8,
          work_date: '2026-03-01',
        })
      )
    })

    it('should create time entry with work_type', async () => {
      setupAuthenticatedUser()

      const overtimeEntry = {
        id: 'entry-overtime',
        job_id: JOB_UUID,
        hours: 10,
        work_type: 'overtime',
        work_date: '2026-03-01',
      }
      vi.mocked(JobCompletionService.createTimeEntry).mockResolvedValue(overtimeEntry)

      const request = new NextRequest(`http://localhost:3000/api/jobs/${JOB_UUID}/time-entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hours: 10,
          work_type: 'overtime',
          work_date: '2026-03-01',
        }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: JOB_UUID }) })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.work_type).toBe('overtime')
    })
  })
})
