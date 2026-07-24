import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET as getAvailableCrew } from '@/app/api/jobs/available-crew/route'
import { GET as getCalendarJobs } from '@/app/api/jobs/calendar/route'
import { JobsService } from '@/lib/services/jobs-service'
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
  scheduled_start_date: '2024-02-15',
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
  created_at: '2024-02-01T00:00:00Z',
  updated_at: '2024-02-01T00:00:00Z',
  ...overrides
})

vi.mock('@/lib/services/jobs-service', () => ({
  JobsService: {
    getAvailableCrew: vi.fn(),
    getCalendarEvents: vi.fn()
  }
}))

vi.mock('@/lib/utils/api-handler', async (importOriginal) => {
  const actual = await importOriginal() as any
  return {
    ...actual,
    createApiHandler: (options: any, handler: any) => {
      return async (request: any) => {
        const mockContext = {
          user: { id: 'user-123' },
          profile: { organization_id: 'org-123', role: 'admin' },
          log: { info: vi.fn(), error: vi.fn() }
        }
        
        // Parse query parameters
        const url = new URL(request.url)
        const query: Record<string, any> = {}
        for (const [key, value] of url.searchParams.entries()) {
          query[key] = value
        }
        
        return await handler(request, mockContext, {}, query)
      }
    }
  }
})

describe('Job Management Sub-routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/jobs/available-crew', () => {
    it('should get available crew for a date', async () => {
      const mockCrew = [
        {
          id: 'crew-1',
          full_name: 'John Smith',
          email: 'john.smith@example.com',
          role: 'Lead Technician',
          is_available: true
        },
        {
          id: 'crew-2',
          full_name: 'Jane Doe',
          email: 'jane.doe@example.com',
          role: 'Technician',
          is_available: true
        }
      ]

      vi.mocked(JobsService.getAvailableCrew).mockResolvedValue(mockCrew)

      const request = new NextRequest('http://localhost/api/jobs/available-crew?date=2024-02-15')
      const response = await getAvailableCrew(request)

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json).toEqual(mockCrew)
      expect(JobsService.getAvailableCrew).toHaveBeenCalledWith('2024-02-15')
    })

    it('should return 400 when date is missing', async () => {
      const request = new NextRequest('http://localhost/api/jobs/available-crew')

      await expect(async () => {
        await getAvailableCrew(request)
      }).rejects.toThrow('date is required')
    })

    it('should return 400 for invalid date format', async () => {
      const request = new NextRequest('http://localhost/api/jobs/available-crew?date=invalid-date')

      await expect(async () => {
        await getAvailableCrew(request)
      }).rejects.toThrow('Invalid date format. Use YYYY-MM-DD')
    })

    it('should handle empty crew results', async () => {
      vi.mocked(JobsService.getAvailableCrew).mockResolvedValue([])

      const request = new NextRequest('http://localhost/api/jobs/available-crew?date=2024-02-15')
      const response = await getAvailableCrew(request)

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json).toEqual([])
    })

    it('should handle service errors', async () => {
      vi.mocked(JobsService.getAvailableCrew).mockRejectedValue(new Error('Database connection failed'))

      const request = new NextRequest('http://localhost/api/jobs/available-crew?date=2024-02-15')

      await expect(async () => {
        await getAvailableCrew(request)
      }).rejects.toThrow('Database connection failed')
    })
  })

  describe('GET /api/jobs/calendar', () => {
    it('should get calendar events for date range', async () => {
      const mockJobs = [
        createMockJob({
          id: 'job-1',
          name: 'Asbestos Survey - ABC Corp',
          scheduled_start_date: '2024-02-15',
          scheduled_end_date: '2024-02-15',
          status: 'scheduled',
          customer_id: 'customer-abc'
        }),
        createMockJob({
          id: 'job-2',
          name: 'Mold Inspection - XYZ Inc',
          scheduled_start_date: '2024-02-16',
          scheduled_end_date: '2024-02-16',
          status: 'in_progress',
          customer_id: 'customer-xyz'
        })
      ]

      vi.mocked(JobsService.getCalendarEvents).mockResolvedValue(mockJobs)

      const request = new NextRequest('http://localhost/api/jobs/calendar?start=2024-02-15&end=2024-02-16')
      const response = await getCalendarJobs(request)

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json).toEqual(mockJobs)
      expect(JobsService.getCalendarEvents).toHaveBeenCalledWith('2024-02-15', '2024-02-16')
    })

    it('should return 400 when start date is missing', async () => {
      const request = new NextRequest('http://localhost/api/jobs/calendar?end=2024-02-16')

      await expect(async () => {
        await getCalendarJobs(request)
      }).rejects.toThrow('start and end dates are required')
    })

    it('should return 400 when end date is missing', async () => {
      const request = new NextRequest('http://localhost/api/jobs/calendar?start=2024-02-15')

      await expect(async () => {
        await getCalendarJobs(request)
      }).rejects.toThrow('start and end dates are required')
    })

    it('should return 400 for invalid start date format', async () => {
      const request = new NextRequest('http://localhost/api/jobs/calendar?start=invalid-date&end=2024-02-16')

      await expect(async () => {
        await getCalendarJobs(request)
      }).rejects.toThrow('Invalid date format. Use YYYY-MM-DD')
    })

    it('should return 400 for invalid end date format', async () => {
      const request = new NextRequest('http://localhost/api/jobs/calendar?start=2024-02-15&end=invalid-date')

      await expect(async () => {
        await getCalendarJobs(request)
      }).rejects.toThrow('Invalid date format. Use YYYY-MM-DD')
    })

    it('should handle empty calendar results', async () => {
      vi.mocked(JobsService.getCalendarEvents).mockResolvedValue([])

      const request = new NextRequest('http://localhost/api/jobs/calendar?start=2024-02-15&end=2024-02-16')
      const response = await getCalendarJobs(request)

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json).toEqual([])
    })

    it('should handle service errors', async () => {
      vi.mocked(JobsService.getCalendarEvents).mockRejectedValue(new Error('Database connection failed'))

      const request = new NextRequest('http://localhost/api/jobs/calendar?start=2024-02-15&end=2024-02-16')

      await expect(async () => {
        await getCalendarJobs(request)
      }).rejects.toThrow('Database connection failed')
    })
  })
})
