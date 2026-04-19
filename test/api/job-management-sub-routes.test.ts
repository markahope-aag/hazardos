import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET as getAvailableCrew } from '@/app/api/jobs/available-crew/route'
import { GET as getCalendarJobs } from '@/app/api/jobs/calendar/route'
import { JobsService } from '@/lib/services/jobs-service'

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
          profile: { organization_id: 'org-123', role: 'user' },
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
          name: 'John Smith',
          role: 'Lead Technician',
          available_hours: 8,
          skills: ['asbestos', 'mold']
        },
        {
          id: 'crew-2',
          name: 'Jane Doe',
          role: 'Technician',
          available_hours: 6,
          skills: ['lead', 'hazmat']
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
        {
          id: 'job-1',
          title: 'Asbestos Survey - ABC Corp',
          start: '2024-02-15T09:00:00Z',
          end: '2024-02-15T17:00:00Z',
          status: 'scheduled',
          customer: { name: 'ABC Corp' },
          crew: ['John Smith', 'Jane Doe']
        },
        {
          id: 'job-2',
          title: 'Mold Inspection - XYZ Inc',
          start: '2024-02-16T10:00:00Z',
          end: '2024-02-16T14:00:00Z',
          status: 'in_progress',
          customer: { name: 'XYZ Inc' },
          crew: ['Bob Wilson']
        }
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
