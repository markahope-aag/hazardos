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
    list: vi.fn(),
    create: vi.fn(),
    getById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

// Import the route handlers
import { GET, POST } from '@/app/api/jobs/route'
import { JobsService } from '@/lib/services/jobs-service'
import type { Job } from '@/types/jobs'

const createMockJob = (overrides: Partial<Job> = {}): Job => ({
  id: 'job-1',
  organization_id: 'org-123',
  proposal_id: null,
  estimate_id: null,
  customer_id: 'customer-1',
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
  created_at: '2026-01-31T10:00:00Z',
  updated_at: '2026-01-31T10:00:00Z',
  ...overrides
})

describe('Jobs API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockProfile = {
    organization_id: 'org-123',
    role: 'admin'
  }

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

  describe('GET /api/jobs', () => {
    it('should return jobs for authenticated user', async () => {
      setupAuthenticatedUser()

      // Mock jobs data
      const mockJobs = [
        createMockJob({
          id: 'job-1',
          job_number: 'JOB-001',
          customer_id: 'customer-1',
          job_address: '123 Test St',
          status: 'scheduled',
          scheduled_start_date: '2026-02-01',
          created_at: '2026-01-31T10:00:00Z'
        }),
        createMockJob({
          id: 'job-2',
          job_number: 'JOB-002',
          customer_id: 'customer-2',
          job_address: '456 Demo Ave',
          status: 'in_progress',
          scheduled_start_date: '2026-02-02',
          created_at: '2026-01-31T11:00:00Z'
        })
      ]
      const mockJobsResult = { jobs: mockJobs, total: mockJobs.length, limit: 50, offset: 0 }

      vi.mocked(JobsService.list).mockResolvedValue(mockJobsResult)

      // Create request
      const request = new NextRequest('http://localhost:3000/api/jobs')

      // Call the handler
      const response = await GET(request)
      const data = await response.json()

      // Assertions
      expect(response.status).toBe(200)
      expect(data).toEqual(mockJobsResult)
      expect(JobsService.list).toHaveBeenCalledWith({
        status: undefined,
        customer_id: undefined,
        from_date: undefined,
        to_date: undefined,
        crew_member_id: undefined
      })
    })

    it('should return 401 for unauthenticated user', async () => {
      setupUnauthenticatedUser()

      const request = new NextRequest('http://localhost:3000/api/jobs')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication is required')
      expect(data.type).toBe('UNAUTHORIZED')
    })

    it('should handle query parameters for filtering', async () => {
      setupAuthenticatedUser()

      vi.mocked(JobsService.list).mockResolvedValue({ jobs: [], total: 0, limit: 50, offset: 0 })

      // Create request with query parameters
      const request = new NextRequest('http://localhost:3000/api/jobs?status=scheduled&customer_id=customer-1')

      await GET(request)

      expect(JobsService.list).toHaveBeenCalledWith({
        status: 'scheduled',
        customer_id: 'customer-1',
        from_date: undefined,
        to_date: undefined,
        crew_member_id: undefined
      })
    })

    it('should handle service errors securely', async () => {
      setupAuthenticatedUser()

      // Mock service error
      vi.mocked(JobsService.list).mockRejectedValue(new Error('Database connection failed'))

      const request = new NextRequest('http://localhost:3000/api/jobs')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('An internal server error occurred')
      expect(data.type).toBe('INTERNAL_ERROR')
      // Should not expose database connection details
      expect(data.error).not.toContain('Database connection failed')
    })
  })

  describe('POST /api/jobs', () => {
    const validJobData = {
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
      // Assigned technician is now required on job create.
      assigned_to: '550e8400-e29b-41d4-a716-446655440099',
      // Job name is now required — used on the work order and calendar.
      name: 'Asbestos abatement test',
      scheduled_start_date: '2026-02-01',
      job_address: '123 Test St',
      job_city: 'Test City',
      job_state: 'CA',
      job_zip: '12345',
      hazard_types: ['asbestos']
    }

    it('should create a new job for authenticated user', async () => {
      setupAuthenticatedUser()

      const mockCreatedJob = createMockJob({
        id: '550e8400-e29b-41d4-a716-446655440001',
        job_number: 'JOB-001',
        customer_id: validJobData.customer_id,
        name: validJobData.name,
        scheduled_start_date: validJobData.scheduled_start_date,
        job_address: validJobData.job_address,
        job_city: validJobData.job_city,
        job_state: validJobData.job_state,
        job_zip: validJobData.job_zip,
        hazard_types: validJobData.hazard_types,
        status: 'scheduled',
        created_at: '2026-01-31T10:00:00Z'
      })

      vi.mocked(JobsService.create).mockResolvedValue(mockCreatedJob)

      // Create request
      const request = new NextRequest('http://localhost:3000/api/jobs', {
        method: 'POST',
        body: JSON.stringify(validJobData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toEqual(mockCreatedJob)
      // Verify service called with validated data
      expect(JobsService.create).toHaveBeenCalled()
    })

    it('should return 401 for unauthenticated user', async () => {
      setupUnauthenticatedUser()

      const request = new NextRequest('http://localhost:3000/api/jobs', {
        method: 'POST',
        body: JSON.stringify(validJobData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication is required')
      expect(data.type).toBe('UNAUTHORIZED')
    })

    it('should validate required fields', async () => {
      setupAuthenticatedUser()

      // Test missing customer_id
      const invalidData = { ...validJobData }
      delete (invalidData as any).customer_id

      const request = new NextRequest('http://localhost:3000/api/jobs', {
        method: 'POST',
        body: JSON.stringify(invalidData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.type).toBe('VALIDATION_ERROR')
    })

    it('should validate scheduled_start_date field', async () => {
      setupAuthenticatedUser()

      // Test missing scheduled_start_date
      const invalidData = { ...validJobData }
      delete (invalidData as any).scheduled_start_date

      const request = new NextRequest('http://localhost:3000/api/jobs', {
        method: 'POST',
        body: JSON.stringify(invalidData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.type).toBe('VALIDATION_ERROR')
    })

    it('should validate job_address field', async () => {
      setupAuthenticatedUser()

      // Test missing job_address
      const invalidData = { ...validJobData }
      delete (invalidData as any).job_address

      const request = new NextRequest('http://localhost:3000/api/jobs', {
        method: 'POST',
        body: JSON.stringify(invalidData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.type).toBe('VALIDATION_ERROR')
    })

    it('should handle service errors securely', async () => {
      setupAuthenticatedUser()

      // Mock service error
      vi.mocked(JobsService.create).mockRejectedValue(new Error('Foreign key constraint violation'))

      const request = new NextRequest('http://localhost:3000/api/jobs', {
        method: 'POST',
        body: JSON.stringify(validJobData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('An internal server error occurred')
      expect(data.type).toBe('INTERNAL_ERROR')
      // Should not expose database constraint details
      expect(data.error).not.toContain('Foreign key constraint')
    })

    it('should handle malformed JSON', async () => {
      setupAuthenticatedUser()

      const request = new NextRequest('http://localhost:3000/api/jobs', {
        method: 'POST',
        body: 'invalid json'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.type).toBe('BAD_REQUEST')
    })
  })
})
