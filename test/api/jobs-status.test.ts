import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/jobs/[id]/status/route'

// Mock rate limit
vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

// Mock Supabase client
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
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}))

vi.mock('@/lib/services/jobs-service', () => ({
  JobsService: {
    updateStatus: vi.fn(),
  },
}))

import { JobsService } from '@/lib/services/jobs-service'
import type { Job } from '@/types/jobs'

const createMockJob = (overrides: Partial<Job> = {}): Job => ({
  id: 'job-123',
  organization_id: 'org-123',
  proposal_id: null,
  estimate_id: null,
  customer_id: 'customer-1',
  site_survey_id: null,
  job_number: 'JOB-001',
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

const mockProfile = {
  organization_id: 'org-123',
  role: 'admin'
}

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

describe('Job Status API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/jobs/[id]/status', () => {
    it('should update job status to scheduled', async () => {
      // Arrange
      setupAuthenticatedUser()

      const updatedJob = createMockJob({ status: 'scheduled' })
      vi.mocked(JobsService.updateStatus).mockResolvedValue(updatedJob)

      const request = new NextRequest('http://localhost:3000/api/jobs/job-123/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'scheduled',
        }),
      })

      // Act
      const response = await POST(request, { params: Promise.resolve({ id: 'job-123' }) })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.status).toBe('scheduled')
      expect(JobsService.updateStatus).toHaveBeenCalledWith('job-123', 'scheduled', expect.any(Object))
    })

    it('should update job status to in_progress', async () => {
      // Arrange
      setupAuthenticatedUser()

      const updatedJob = createMockJob({ status: 'in_progress' })
      vi.mocked(JobsService.updateStatus).mockResolvedValue(updatedJob)

      const request = new NextRequest('http://localhost:3000/api/jobs/job-123/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'in_progress',
        }),
      })

      // Act
      const response = await POST(request, { params: Promise.resolve({ id: 'job-123' }) })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.status).toBe('in_progress')
    })

    it('should update job status to completed', async () => {
      // Arrange
      setupAuthenticatedUser()

      const updatedJob = createMockJob({ status: 'completed' })
      vi.mocked(JobsService.updateStatus).mockResolvedValue(updatedJob)

      const request = new NextRequest('http://localhost:3000/api/jobs/job-123/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
        }),
      })

      // Act
      const response = await POST(request, { params: Promise.resolve({ id: 'job-123' }) })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.status).toBe('completed')
    })

    it('should reject invalid status', async () => {
      // Arrange
      setupAuthenticatedUser()

      const request = new NextRequest('http://localhost:3000/api/jobs/job-123/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'invalid_status',
        }),
      })

      // Act
      const response = await POST(request, { params: Promise.resolve({ id: 'job-123' }) })

      // Assert
      expect(response.status).toBe(400)
    })

    it('should reject request without status', async () => {
      // Arrange
      setupAuthenticatedUser()

      const request = new NextRequest('http://localhost:3000/api/jobs/job-123/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      // Act
      const response = await POST(request, { params: Promise.resolve({ id: 'job-123' }) })

      // Assert
      expect(response.status).toBe(400)
    })

    it('should reject unauthenticated requests', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const request = new NextRequest('http://localhost:3000/api/jobs/job-123/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'scheduled' }),
      })

      // Act
      const response = await POST(request, { params: Promise.resolve({ id: 'job-123' }) })

      // Assert
      expect(response.status).toBe(401)
    })
  })
})
