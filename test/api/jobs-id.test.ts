import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock the dependencies
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
    getById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    rescheduleReminders: vi.fn()
  }
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

// Import the route handlers
import { GET, PATCH, DELETE } from '@/app/api/jobs/[id]/route'
import { JobsService } from '@/lib/services/jobs-service'
import type { Job } from '@/types/jobs'

const createMockJob = (overrides: Partial<Job> = {}): Job => ({
  id: '550e8400-e29b-41d4-a716-446655440001',
  organization_id: 'org-123',
  proposal_id: null,
  estimate_id: null,
  customer_id: '550e8400-e29b-41d4-a716-446655440000',
  site_survey_id: null,
  job_number: 'JOB-001',
  name: null,
  status: 'scheduled',
  hazard_types: ['asbestos'],
  scheduled_start_date: '2026-02-01',
  scheduled_start_time: null,
  scheduled_end_date: null,
  scheduled_end_time: null,
  estimated_duration_hours: null,
  estimated_labor_hours: null,
  actual_labor_hours: null,
  actual_start_at: null,
  actual_end_at: null,
  job_address: '123 Test St',
  job_city: 'Test City',
  job_state: 'CA',
  job_zip: '12345',
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
  created_at: '2026-01-31T10:00:00Z',
  updated_at: '2026-01-31T10:00:00Z',
  ...overrides
})

describe('Jobs [id] API', () => {
  const mockJobId = '550e8400-e29b-41d4-a716-446655440001'
  const mockJob = createMockJob({ id: mockJobId })

  const mockProfile = {
    organization_id: 'org-123',
    role: 'admin'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Helper to setup authenticated user with profile
  const setupAuthenticatedUser = () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1', email: 'test@example.com' } },
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
  }

  // Helper to setup unauthenticated user
  const setupUnauthenticatedUser = () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null
    })
  }

  describe('GET /api/jobs/[id]', () => {
    it('should return job by id for authenticated user', async () => {
      setupAuthenticatedUser()

      vi.mocked(JobsService.getById).mockResolvedValue(mockJob)

      const request = new NextRequest(`http://localhost:3000/api/jobs/${mockJobId}`)
      const response = await GET(request, { params: Promise.resolve({ id: mockJobId }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockJob)
      expect(JobsService.getById).toHaveBeenCalledWith(mockJobId)
    })

    it('should return 401 for unauthenticated user', async () => {
      setupUnauthenticatedUser()

      const request = new NextRequest(`http://localhost:3000/api/jobs/${mockJobId}`)
      const response = await GET(request, { params: Promise.resolve({ id: mockJobId }) })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication is required')
      expect(data.type).toBe('UNAUTHORIZED')
    })

    it('should return 404 for non-existent job', async () => {
      setupAuthenticatedUser()

      vi.mocked(JobsService.getById).mockResolvedValue(null)

      const request = new NextRequest(`http://localhost:3000/api/jobs/${mockJobId}`)
      const response = await GET(request, { params: Promise.resolve({ id: mockJobId }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Job not found')
      expect(data.type).toBe('NOT_FOUND')
    })

    it('should handle service errors securely', async () => {
      setupAuthenticatedUser()

      vi.mocked(JobsService.getById).mockRejectedValue(new Error('Database connection timeout'))

      const request = new NextRequest(`http://localhost:3000/api/jobs/${mockJobId}`)
      const response = await GET(request, { params: Promise.resolve({ id: mockJobId }) })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('An internal server error occurred')
      expect(data.type).toBe('INTERNAL_ERROR')
      expect(data.error).not.toContain('Database connection timeout')
    })
  })

  describe('PATCH /api/jobs/[id]', () => {
    const updateData = {
      status: 'in_progress' as const,
      scheduled_start_date: '2026-02-02'
    }

    it('should update job for authenticated user', async () => {
      setupAuthenticatedUser()

      const updatedJob = { ...mockJob, ...updateData, updated_at: '2026-01-31T12:00:00Z' }
      vi.mocked(JobsService.update).mockResolvedValue(updatedJob)
      vi.mocked(JobsService.rescheduleReminders).mockResolvedValue(undefined)

      const request = new NextRequest(`http://localhost:3000/api/jobs/${mockJobId}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData)
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: mockJobId }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(updatedJob)
    })

    it('should return 401 for unauthenticated user', async () => {
      setupUnauthenticatedUser()

      const request = new NextRequest(`http://localhost:3000/api/jobs/${mockJobId}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData)
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: mockJobId }) })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication is required')
      expect(data.type).toBe('UNAUTHORIZED')
    })

    it('should handle update with service returning null', async () => {
      setupAuthenticatedUser()

      // Service returns null for non-existent job but route doesn't explicitly check
      vi.mocked(JobsService.update).mockResolvedValue(null as any)
      vi.mocked(JobsService.rescheduleReminders).mockResolvedValue(undefined)

      const request = new NextRequest(`http://localhost:3000/api/jobs/${mockJobId}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData)
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: mockJobId }) })
      const data = await response.json()

      // Route returns whatever the service returns (null in this case)
      expect(response.status).toBe(200)
      expect(data).toBeNull()
    })

    it('should handle invalid JSON', async () => {
      setupAuthenticatedUser()

      const request = new NextRequest(`http://localhost:3000/api/jobs/${mockJobId}`, {
        method: 'PATCH',
        body: 'invalid json'
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: mockJobId }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.type).toBe('BAD_REQUEST')
    })

    it('should handle service errors securely', async () => {
      setupAuthenticatedUser()

      vi.mocked(JobsService.update).mockRejectedValue(new Error('Constraint violation: invalid status'))

      const request = new NextRequest(`http://localhost:3000/api/jobs/${mockJobId}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData)
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: mockJobId }) })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('An internal server error occurred')
      expect(data.type).toBe('INTERNAL_ERROR')
      expect(data.error).not.toContain('Constraint violation')
    })
  })

  describe('DELETE /api/jobs/[id]', () => {
    it('should delete job for authenticated user', async () => {
      setupAuthenticatedUser()

      vi.mocked(JobsService.delete).mockResolvedValue(undefined)

      const request = new NextRequest(`http://localhost:3000/api/jobs/${mockJobId}`, {
        method: 'DELETE'
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: mockJobId }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(JobsService.delete).toHaveBeenCalledWith(mockJobId)
    })

    it('should return 401 for unauthenticated user', async () => {
      setupUnauthenticatedUser()

      const request = new NextRequest(`http://localhost:3000/api/jobs/${mockJobId}`, {
        method: 'DELETE'
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: mockJobId }) })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication is required')
      expect(data.type).toBe('UNAUTHORIZED')
    })

    it('should handle delete with service returning void', async () => {
      setupAuthenticatedUser()

      // Service returns void for delete (route doesn't check the return value)
      vi.mocked(JobsService.delete).mockResolvedValue(undefined as any)

      const request = new NextRequest(`http://localhost:3000/api/jobs/${mockJobId}`, {
        method: 'DELETE'
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: mockJobId }) })
      const data = await response.json()

      // Route always returns success: true if no error
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should handle service errors securely', async () => {
      setupAuthenticatedUser()

      vi.mocked(JobsService.delete).mockRejectedValue(new Error('Cannot delete job with active invoices'))

      const request = new NextRequest(`http://localhost:3000/api/jobs/${mockJobId}`, {
        method: 'DELETE'
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: mockJobId }) })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('An internal server error occurred')
      expect(data.type).toBe('INTERNAL_ERROR')
      expect(data.error).not.toContain('active invoices')
    })
  })
})
