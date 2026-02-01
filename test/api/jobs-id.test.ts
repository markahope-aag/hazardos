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
    delete: vi.fn()
  }
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

// Import the route handlers
import { GET, PATCH, DELETE } from '@/app/api/jobs/[id]/route'
import { JobsService } from '@/lib/services/jobs-service'

describe('Jobs [id] API', () => {
  const mockJobId = '550e8400-e29b-41d4-a716-446655440001'
  const mockJob = {
    id: mockJobId,
    job_number: 'JOB-001',
    customer_id: '550e8400-e29b-41d4-a716-446655440000',
    job_address: '123 Test St',
    job_city: 'Test City',
    job_state: 'CA',
    job_zip: '12345',
    status: 'scheduled',
    scheduled_start_date: '2026-02-01',
    hazard_types: ['asbestos'],
    created_at: '2026-01-31T10:00:00Z',
    updated_at: '2026-01-31T10:00:00Z'
  }

  const mockProfile = {
    organization_id: 'org-123',
    role: 'user'
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
      expect(data.error).toBe('The requested resource was not found')
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
      status: 'in_progress',
      scheduled_start_date: '2026-02-02'
    }

    it('should update job for authenticated user', async () => {
      setupAuthenticatedUser()

      const updatedJob = { ...mockJob, ...updateData, updated_at: '2026-01-31T12:00:00Z' }
      vi.mocked(JobsService.update).mockResolvedValue(updatedJob)

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

    it('should return 404 for non-existent job', async () => {
      setupAuthenticatedUser()

      vi.mocked(JobsService.update).mockResolvedValue(null)

      const request = new NextRequest(`http://localhost:3000/api/jobs/${mockJobId}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData)
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: mockJobId }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('The requested resource was not found')
      expect(data.type).toBe('NOT_FOUND')
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

      vi.mocked(JobsService.delete).mockResolvedValue({ success: true })

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

    it('should return 404 for non-existent job', async () => {
      setupAuthenticatedUser()

      vi.mocked(JobsService.delete).mockResolvedValue(null)

      const request = new NextRequest(`http://localhost:3000/api/jobs/${mockJobId}`, {
        method: 'DELETE'
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: mockJobId }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('The requested resource was not found')
      expect(data.type).toBe('NOT_FOUND')
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
