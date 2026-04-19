import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, PATCH } from '@/app/api/v1/jobs/[id]/route'

// Create a chainable query builder mock
function createQueryBuilder() {
  const builder: any = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    update: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve({ data: null, error: null })),
    then: vi.fn((resolve) => {
      resolve({
        data: [],
        count: 0,
        error: null
      })
    })
  }
  return builder
}

const mockSupabaseClient = {
  from: vi.fn(() => createQueryBuilder())
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}))

vi.mock('@/lib/services/api-key-service', () => ({
  ApiKeyService: {
    hasScope: vi.fn()
  }
}))

vi.mock('@/lib/middleware/api-key-auth', () => ({
  withApiKeyAuth: (handler: (req: any, ctx: any) => any) => {
    return (req: any) => {
      const mockContext = {
        organizationId: 'org-123',
        apiKey: { id: 'key-1', scopes: ['jobs:read', 'jobs:write'] }
      }
      return handler(req, mockContext)
    }
  }
}))

vi.mock('@/lib/middleware/cors', () => ({
  handlePreflight: vi.fn(() => new Response(null, { status: 200 }))
}))

import { ApiKeyService } from '@/lib/services/api-key-service'

describe('V1 Jobs ID API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockParams = { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }) }

  describe('GET /api/v1/jobs/[id]', () => {
    it('should get job by ID successfully', async () => {
      vi.mocked(ApiKeyService.hasScope).mockReturnValue(true)

      const mockJob = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        job_number: 'JOB-00001',
        organization_id: 'org-123',
        customer_id: '550e8400-e29b-41d4-a716-446655440001',
        status: 'scheduled',
        job_type: 'residential_survey',
        customer: {
          id: '550e8400-e29b-41d4-a716-446655440001',
          name: 'John Doe',
          company_name: 'ABC Corp',
          email: 'john@example.com',
          phone: '555-0123'
        }
      }

      mockSupabaseClient.from.mockImplementation((table) => {
        const builder = createQueryBuilder()
        if (table === 'jobs') {
          builder.single = vi.fn().mockResolvedValue({
            data: mockJob,
            error: null
          })
        }
        return builder
      })

      const request = new NextRequest('http://localhost/api/v1/jobs/550e8400-e29b-41d4-a716-446655440000')

      const response = await GET(request, mockParams)
      expect(response.status).toBe(200)

      const json = await response.json()
      expect(json.data).toEqual(mockJob)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('jobs')
    })

    it('should return 404 when job not found', async () => {
      vi.mocked(ApiKeyService.hasScope).mockReturnValue(true)

      mockSupabaseClient.from.mockImplementation((table) => {
        const builder = createQueryBuilder()
        if (table === 'jobs') {
          builder.single = vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Not found' }
          })
        }
        return builder
      })

      const request = new NextRequest('http://localhost/api/v1/jobs/550e8400-e29b-41d4-a716-446655440000')

      const response = await GET(request, mockParams)
      expect(response.status).toBe(404)

      const json = await response.json()
      expect(json.error).toBe('Job not found')
    })

    it('should return 403 without jobs:read scope', async () => {
      vi.mocked(ApiKeyService.hasScope).mockReturnValue(false)

      const request = new NextRequest('http://localhost/api/v1/jobs/550e8400-e29b-41d4-a716-446655440000')

      const response = await GET(request, mockParams)
      expect(response.status).toBe(403)

      const json = await response.json()
      expect(json.error).toBe('Missing required scope: jobs:read')
    })

    it('should return 400 for invalid job ID format', async () => {
      vi.mocked(ApiKeyService.hasScope).mockReturnValue(true)

      const invalidParams = { params: Promise.resolve({ id: 'invalid-uuid' }) }
      const request = new NextRequest('http://localhost/api/v1/jobs/invalid-uuid')

      const response = await GET(request, invalidParams)
      expect(response.status).toBe(400)

      const json = await response.json()
      expect(json.error).toBe('Invalid job ID format')
    })
  })

  describe('PATCH /api/v1/jobs/[id]', () => {
    it('should update job successfully', async () => {
      vi.mocked(ApiKeyService.hasScope).mockReturnValue(true)

      const updatedJob = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        job_number: 'JOB-00001',
        organization_id: 'org-123',
        status: 'completed',
        notes: 'Updated notes'
      }

      mockSupabaseClient.from.mockImplementation((table) => {
        const builder = createQueryBuilder()
        if (table === 'jobs') {
          builder.single = vi.fn().mockResolvedValue({
            data: updatedJob,
            error: null
          })
        }
        return builder
      })

      const updateData = {
        status: 'completed',
        notes: 'Updated notes'
      }

      const request = new NextRequest('http://localhost/api/v1/jobs/550e8400-e29b-41d4-a716-446655440000', {
        method: 'PATCH',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await PATCH(request, mockParams)
      expect(response.status).toBe(200)

      const json = await response.json()
      expect(json.data).toEqual(updatedJob)
    })

    it('should return 404 when job not found for update', async () => {
      vi.mocked(ApiKeyService.hasScope).mockReturnValue(true)

      mockSupabaseClient.from.mockImplementation((table) => {
        const builder = createQueryBuilder()
        if (table === 'jobs') {
          builder.single = vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Not found' }
          })
        }
        return builder
      })

      const updateData = { status: 'completed' }

      const request = new NextRequest('http://localhost/api/v1/jobs/550e8400-e29b-41d4-a716-446655440000', {
        method: 'PATCH',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await PATCH(request, mockParams)
      expect(response.status).toBe(404)

      const json = await response.json()
      expect(json.error).toBe('Job not found')
    })

    it('should return 403 without jobs:write scope', async () => {
      vi.mocked(ApiKeyService.hasScope).mockReturnValue(false)

      const updateData = { status: 'completed' }

      const request = new NextRequest('http://localhost/api/v1/jobs/550e8400-e29b-41d4-a716-446655440000', {
        method: 'PATCH',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await PATCH(request, mockParams)
      expect(response.status).toBe(403)

      const json = await response.json()
      expect(json.error).toBe('Missing required scope: jobs:write')
    })

    it('should return 400 for invalid JSON', async () => {
      vi.mocked(ApiKeyService.hasScope).mockReturnValue(true)

      const request = new NextRequest('http://localhost/api/v1/jobs/550e8400-e29b-41d4-a716-446655440000', {
        method: 'PATCH',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await PATCH(request, mockParams)
      expect(response.status).toBe(400)

      const json = await response.json()
      expect(json.error).toBe('Invalid JSON body')
    })

    it('should return 400 for invalid job ID format', async () => {
      vi.mocked(ApiKeyService.hasScope).mockReturnValue(true)

      const updateData = { status: 'completed' }
      const invalidParams = { params: Promise.resolve({ id: 'invalid-uuid' }) }

      const request = new NextRequest('http://localhost/api/v1/jobs/invalid-uuid', {
        method: 'PATCH',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await PATCH(request, invalidParams)
      expect(response.status).toBe(400)

      const json = await response.json()
      expect(json.error).toBe('Invalid job ID format')
    })

    it('should return 400 when no valid fields to update', async () => {
      vi.mocked(ApiKeyService.hasScope).mockReturnValue(true)

      const request = new NextRequest('http://localhost/api/v1/jobs/550e8400-e29b-41d4-a716-446655440000', {
        method: 'PATCH',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await PATCH(request, mockParams)
      expect(response.status).toBe(400)

      const json = await response.json()
      expect(json.error).toBe('No valid fields to update')
    })
  })
})
