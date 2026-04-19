import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('@/lib/services/activity-service', () => ({
  getEntityActivity: vi.fn(),
  getRecentActivity: vi.fn(),
}))

// Create a chainable query builder mock
function createQueryBuilder() {
  const builder: any = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    then: vi.fn((resolve) => {
      resolve({ data: [], error: null })
    })
  }
  return builder
}

const mockSupabaseClient = {
  from: vi.fn(() => createQueryBuilder())
}

vi.mock('@/lib/utils/api-handler', () => ({
  createApiHandler: vi.fn((options, handler) => {
    return async (request: NextRequest) => {
      const url = new URL(request.url)
      const query: Record<string, string> = {}
      url.searchParams.forEach((value, key) => {
        query[key] = value
      })

      const context = {
        supabase: mockSupabaseClient,
        profile: { organization_id: 'org-123' }
      }

      return handler(request, context, null, query)
    }
  })
}))

// Import services and route after mocks
import { getEntityActivity, getRecentActivity } from '@/lib/services/activity-service'
import { GET } from '@/app/api/activity-log/route'

describe('Activity Log API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return recent activity when no parameters provided', async () => {
    const mockActivity = [
      {
        id: 'activity-1',
        action: 'created',
        entity_type: 'job',
        entity_id: 'job-1',
        entity_name: 'JOB-123-01012024',
        user_name: 'John Doe',
        created_at: '2024-01-01T10:00:00Z'
      }
    ]

    vi.mocked(getRecentActivity).mockResolvedValue(mockActivity as any)

    const request = new NextRequest('http://localhost/api/activity-log')
    
    const response = await GET(request)
    expect(response.status).toBe(200)
    
    const json = await response.json()
    expect(json.activity).toEqual(mockActivity)
    expect(getRecentActivity).toHaveBeenCalledWith(20) // Default limit
  })

  it('should handle custom limit for recent activity', async () => {
    vi.mocked(getRecentActivity).mockResolvedValue([])

    const request = new NextRequest('http://localhost/api/activity-log?limit=50')
    
    await GET(request)
    
    expect(getRecentActivity).toHaveBeenCalledWith('50')
  })

  it('should return entity-specific activity', async () => {
    const mockActivity = [
      {
        id: 'activity-1',
        action: 'updated',
        entity_type: 'customer',
        entity_id: 'customer-123',
        entity_name: 'John Smith',
        old_values: { name: 'Jon Smith' },
        new_values: { name: 'John Smith' },
        created_at: '2024-01-01T10:00:00Z'
      }
    ]

    vi.mocked(getEntityActivity).mockResolvedValue(mockActivity as any)

    const request = new NextRequest('http://localhost/api/activity-log?entity_type=customer&entity_id=customer-123')
    
    const response = await GET(request)
    expect(response.status).toBe(200)
    
    const json = await response.json()
    expect(json.activity).toEqual(mockActivity)
    expect(getEntityActivity).toHaveBeenCalledWith('customer', 'customer-123')
  })

  it('should aggregate customer-related activity across all entity types', async () => {
    const mockCustomerId = '550e8400-e29b-41d4-a716-446655440000'
    
    // Mock related entity queries
    mockSupabaseClient.from.mockImplementation((table) => {
      const builder = createQueryBuilder()
      
      // Return some test data for different entity types
      if (table === 'site_surveys') {
        builder.then.mockImplementation((resolve) => {
          resolve({ 
            data: [{ id: 'survey-1' }, { id: 'survey-2' }], 
            error: null 
          })
        })
      } else if (table === 'estimates') {
        builder.then.mockImplementation((resolve) => {
          resolve({ 
            data: [{ id: 'estimate-1' }], 
            error: null 
          })
        })
      } else if (table === 'activity_log') {
        builder.then.mockImplementation((resolve) => {
          resolve({
            data: [
              {
                id: 'activity-1',
                action: 'created',
                entity_type: 'customer',
                entity_id: mockCustomerId,
                entity_name: 'Jane Doe'
              }
            ],
            error: null
          })
        })
      } else {
        builder.then.mockImplementation((resolve) => {
          resolve({ data: [], error: null })
        })
      }
      
      return builder
    })

    const request = new NextRequest(`http://localhost/api/activity-log?customer_id=${mockCustomerId}`)
    
    const response = await GET(request)
    expect(response.status).toBe(200)
    
    const json = await response.json()
    expect(Array.isArray(json.activity)).toBe(true)
  })

  it('should aggregate company-related activity across all entity types', async () => {
    const mockCompanyId = '550e8400-e29b-41d4-a716-446655440001'
    
    // Mock related entity queries
    mockSupabaseClient.from.mockImplementation((table) => {
      const builder = createQueryBuilder()
      
      // Return some test data for different entity types
      if (table === 'customers') {
        builder.then.mockImplementation((resolve) => {
          resolve({ 
            data: [{ id: 'customer-1' }, { id: 'customer-2' }], 
            error: null 
          })
        })
      } else if (table === 'opportunities') {
        builder.then.mockImplementation((resolve) => {
          resolve({ 
            data: [{ id: 'opp-1' }], 
            error: null 
          })
        })
      } else if (table === 'activity_log') {
        builder.then.mockImplementation((resolve) => {
          resolve({
            data: [
              {
                id: 'activity-1',
                action: 'created',
                entity_type: 'company',
                entity_id: mockCompanyId,
                entity_name: 'Acme Corp'
              }
            ],
            error: null
          })
        })
      } else {
        builder.then.mockImplementation((resolve) => {
          resolve({ data: [], error: null })
        })
      }
      
      return builder
    })

    const request = new NextRequest(`http://localhost/api/activity-log?company_id=${mockCompanyId}`)
    
    const response = await GET(request)
    expect(response.status).toBe(200)
    
    const json = await response.json()
    expect(Array.isArray(json.activity)).toBe(true)
  })

  it('should handle empty related entities gracefully', async () => {
    const mockCustomerId = '550e8400-e29b-41d4-a716-446655440002'
    
    // Mock all related entities as empty
    mockSupabaseClient.from.mockImplementation((table) => {
      const builder = createQueryBuilder()
      
      if (table === 'activity_log') {
        builder.then.mockImplementation((resolve) => {
          resolve({ data: [], error: null })
        })
      } else {
        builder.then.mockImplementation((resolve) => {
          resolve({ data: [], error: null })
        })
      }
      
      return builder
    })

    const request = new NextRequest(`http://localhost/api/activity-log?customer_id=${mockCustomerId}`)
    
    const response = await GET(request)
    expect(response.status).toBe(200)
    
    const json = await response.json()
    expect(json.activity).toEqual([])
  })

  it('should respect custom limit for aggregated activity', async () => {
    const mockCustomerId = '550e8400-e29b-41d4-a716-446655440003'
    let capturedLimit: number | undefined

    mockSupabaseClient.from.mockImplementation((table) => {
      const builder = createQueryBuilder()
      
      if (table === 'activity_log') {
        builder.limit = vi.fn().mockImplementation((limit) => {
          capturedLimit = limit
          return builder
        })
        builder.then.mockImplementation((resolve) => {
          resolve({ data: [], error: null })
        })
      } else {
        builder.then.mockImplementation((resolve) => {
          resolve({ data: [], error: null })
        })
      }
      
      return builder
    })

    const request = new NextRequest(`http://localhost/api/activity-log?customer_id=${mockCustomerId}&limit=100`)
    
    await GET(request)
    
    expect(capturedLimit).toBe('100')
  })

  it('should handle service errors gracefully', async () => {
    vi.mocked(getRecentActivity).mockRejectedValue(new Error('Service error'))

    const request = new NextRequest('http://localhost/api/activity-log')
    
    // Should propagate the service error
    await expect(GET(request)).rejects.toThrow('Service error')
  })
})