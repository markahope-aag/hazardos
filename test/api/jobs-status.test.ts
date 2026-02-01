import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/jobs/[id]/status/route'

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(() => mockSupabaseClient),
  select: vi.fn(() => mockSupabaseClient),
  eq: vi.fn(() => mockSupabaseClient),
  single: vi.fn(),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}))

vi.mock('@/lib/services/jobs-service', () => ({
  JobsService: {
    updateStatus: vi.fn(),
  },
}))

import { JobsService } from '@/lib/services/jobs-service'

describe('Job Status API', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default auth mock - authenticated user
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    })

    // Default profile mock
    mockSupabaseClient.single.mockResolvedValue({
      data: {
        id: 'profile-123',
        organization_id: 'org-123',
        role: 'admin'
      },
      error: null,
    })
  })

  describe('POST /api/jobs/[id]/status', () => {
    it('should update job status to scheduled', async () => {
      // Arrange
      const updatedJob = {
        id: 'job-123',
        status: 'scheduled',
        job_number: 'JOB-001',
      }
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
      expect(JobsService.updateStatus).toHaveBeenCalledWith('job-123', 'scheduled')
    })

    it('should update job status to in_progress', async () => {
      // Arrange
      const updatedJob = {
        id: 'job-123',
        status: 'in_progress',
      }
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
      const updatedJob = {
        id: 'job-123',
        status: 'completed',
      }
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
      mockSupabaseClient.auth.getUser.mockResolvedValue({
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
