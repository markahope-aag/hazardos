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
      setupAuthenticatedUser()

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
      setupAuthenticatedUser()

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
