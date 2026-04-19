import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/v1/jobs/route'

// Create a chainable query builder mock
function createQueryBuilder() {
  const builder: any = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    range: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve({ data: null, error: null })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn()
      }))
    })),
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
  withApiKeyAuth: (handler: (...args: unknown[]) => unknown) => handler
}))

vi.mock('@/lib/middleware/cors', () => ({
  handlePreflight: vi.fn(() => new Response(null, { status: 200 }))
}))

import { ApiKeyService } from '@/lib/services/api-key-service'

describe('V1 Jobs API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockContext = {
    organizationId: 'org-123',
    apiKey: { id: 'key-1', scopes: ['jobs:read', 'jobs:write'] }
  }

  describe('GET /api/v1/jobs', () => {
    it('should list jobs with pagination', async () => {
      vi.mocked(ApiKeyService.hasScope).mockReturnValue(true)

      const mockJobs = [
        {
          id: 'job-1',
          job_number: 'JOB-123-01012024',
          status: 'in_progress',
          start_date: '2024-01-01',
          customer: { id: 'cust-1', name: 'John Doe', company_name: 'ABC Corp' }
        },
        {
          id: 'job-2',
          job_number: 'JOB-124-01022024',
          status: 'scheduled',
          start_date: '2024-01-02',
          customer: { id: 'cust-2', name: 'Jane Smith', company_name: 'XYZ Inc' }
        }
      ]

      const builder = createQueryBuilder()
      builder.then.mockImplementation((resolve) => {
        resolve({
          data: mockJobs,
          count: 2,
          error: null
        })
      })

      vi.mocked(mockSupabaseClient.from).mockReturnValue(builder)

      const request = new NextRequest('http://localhost/api/v1/jobs')

      const response = await GET(request, mockContext)
      expect(response.status).toBe(200)

      const json = await response.json()
      expect(json.data).toEqual(mockJobs)
      expect(json.pagination.total).toBe(2)
    })

    it('should filter by status', async () => {
      vi.mocked(ApiKeyService.hasScope).mockReturnValue(true)

      const builder = createQueryBuilder()
      vi.mocked(mockSupabaseClient.from).mockReturnValue(builder)

      const request = new NextRequest('http://localhost/api/v1/jobs?status=in_progress')

      const response = await GET(request, mockContext)
      expect(response.status).toBe(200)

      expect(builder.eq).toHaveBeenCalledWith('status', 'in_progress')
    })

    it('should return 403 without jobs:read scope', async () => {
      vi.mocked(ApiKeyService.hasScope).mockReturnValue(false)

      const request = new NextRequest('http://localhost/api/v1/jobs')

      const response = await GET(request, mockContext)
      expect(response.status).toBe(403)

      const json = await response.json()
      expect(json.error).toBe('Missing required scope: jobs:read')
    })

    it('should return 400 for invalid query parameters', async () => {
      vi.mocked(ApiKeyService.hasScope).mockReturnValue(true)

      const request = new NextRequest('http://localhost/api/v1/jobs?limit=invalid')

      const response = await GET(request, mockContext)
      expect(response.status).toBe(400)

      const json = await response.json()
      expect(json.error).toBe('Invalid query parameters')
    })
  })

  describe('POST /api/v1/jobs', () => {
    it('should create job from estimate', async () => {
      vi.mocked(ApiKeyService.hasScope).mockReturnValue(true)

      const mockJob = {
        id: 'job-123',
        job_number: 'JOB-125-01032024',
        organization_id: 'org-123',
        estimate_id: '550e8400-e29b-41d4-a716-446655440000',
        customer_id: '550e8400-e29b-41d4-a716-446655440001',
        status: 'scheduled',
        start_date: '2024-02-01'
      }

      // Mock estimate and customer lookups (success)
      mockSupabaseClient.from.mockImplementation((table) => {
        const builder = createQueryBuilder()
        
        if (table === 'estimates') {
          builder.single = vi.fn().mockResolvedValue({
            data: { 
              id: '550e8400-e29b-41d4-a716-446655440000',
              customer_id: '550e8400-e29b-41d4-a716-446655440001',
              status: 'accepted'
            },
            error: null
          })
        } else if (table === 'customers') {
          builder.single = vi.fn().mockResolvedValue({
            data: { 
              id: '550e8400-e29b-41d4-a716-446655440001'
            },
            error: null
          })
        } else if (table === 'jobs') {
          // For count query
          builder.then.mockImplementation((resolve) => {
            resolve({ count: 0 })
          })
          // For insert query  
          builder.insert.mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockJob,
                error: null
              })
            })
          })
        }
        
        return builder
      })

      const requestBody = {
        customer_id: '550e8400-e29b-41d4-a716-446655440001',
        estimate_id: '550e8400-e29b-41d4-a716-446655440000',
        start_date: '2024-02-01',
        notes: 'Test job'
      }

      const request = new NextRequest('http://localhost/api/v1/jobs', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })

      const response = await POST(request, mockContext)
      expect(response.status).toBe(201)

      const json = await response.json()
      expect(json.data).toEqual(mockJob)
    })

    it('should return 404 when customer not found', async () => {
      vi.mocked(ApiKeyService.hasScope).mockReturnValue(true)

      mockSupabaseClient.from.mockImplementation((table) => {
        const builder = createQueryBuilder()
        
        if (table === 'customers') {
          builder.single = vi.fn().mockResolvedValue({
            data: null,
            error: null
          })
        }
        
        return builder
      })

      const request = new NextRequest('http://localhost/api/v1/jobs', {
        method: 'POST',
        body: JSON.stringify({
          customer_id: '550e8400-e29b-41d4-a716-446655440002',
          job_type: 'residential_survey',
          hazard_types: ['asbestos'],
          scheduled_date: '2024-02-15',
          description: 'Test job from nonexistent customer'
        })
      })

      const response = await POST(request, mockContext)
      expect(response.status).toBe(404)

      const json = await response.json()
      expect(json.error).toBe('Customer not found')
    })

    it('should return 403 without jobs:write scope', async () => {
      vi.mocked(ApiKeyService.hasScope).mockReturnValue(false)

      const request = new NextRequest('http://localhost/api/v1/jobs', {
        method: 'POST',
        body: JSON.stringify({
          customer_id: '550e8400-e29b-41d4-a716-446655440001',
          estimate_id: '550e8400-e29b-41d4-a716-446655440000',
          start_date: '2024-02-01'
        })
      })

      const response = await POST(request, mockContext)
      expect(response.status).toBe(403)

      const json = await response.json()
      expect(json.error).toBe('Missing required scope: jobs:write')
    })

    it('should return 400 for invalid JSON', async () => {
      vi.mocked(ApiKeyService.hasScope).mockReturnValue(true)

      const request = new NextRequest('http://localhost/api/v1/jobs', {
        method: 'POST',
        body: 'invalid json'
      })

      const response = await POST(request, mockContext)
      expect(response.status).toBe(400)

      const json = await response.json()
      expect(json.error).toBe('Invalid JSON body')
    })
  })
})
