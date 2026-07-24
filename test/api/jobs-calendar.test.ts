import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/jobs/calendar/route'
import type { Job } from '@/types/jobs'

const createMockJob = (overrides: Partial<Job> = {}): Job => ({
  id: 'job-1',
  organization_id: 'org-123',
  proposal_id: null,
  estimate_id: null,
  customer_id: 'customer-1',
  site_survey_id: null,
  job_number: 'JOB-0001',
  name: null,
  status: 'scheduled',
  hazard_types: ['asbestos'],
  scheduled_start_date: '2026-03-01',
  scheduled_start_time: null,
  scheduled_end_date: null,
  scheduled_end_time: null,
  estimated_duration_hours: null,
  estimated_labor_hours: null,
  actual_labor_hours: null,
  actual_start_at: null,
  actual_end_at: null,
  job_address: '123 Main St',
  job_city: null,
  job_state: null,
  job_zip: null,
  job_latitude: null,
  job_longitude: null,
  access_notes: null,
  gate_code: null,
  lockbox_code: null,
  contact_onsite_name: null,
  contact_onsite_phone: null,
  contract_amount: null,
  change_order_amount: 0,
  final_amount: null,
  completion_notes: null,
  completion_photos: [],
  customer_signed_off: false,
  customer_signoff_at: null,
  customer_signoff_name: null,
  inspection_required: false,
  inspection_passed: null,
  inspection_date: null,
  inspection_notes: null,
  internal_notes: null,
  special_instructions: null,
  location_id: null,
  created_by: null,
  created_at: '2026-02-01T00:00:00Z',
  updated_at: '2026-02-01T00:00:00Z',
  ...overrides
})

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
    role: 'admin'
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
        createMockJob({ id: 'job-1', name: 'Job 1', scheduled_start_date: '2026-03-01', status: 'scheduled' }),
        createMockJob({ id: 'job-2', name: 'Job 2', scheduled_start_date: '2026-03-15', status: 'in_progress' }),
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
