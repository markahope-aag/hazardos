import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Create a chainable query builder mock
function createQueryBuilder() {
  const builder: any = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    lte: vi.fn(() => builder),
    neq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    or: vi.fn(() => builder),
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

vi.mock('@/lib/dashboard/filters', () => ({
  getPeriodRange: vi.fn(() => ({
    start: new Date('2024-01-01'),
    end: new Date('2024-01-31')
  })),
  hazardFilterToDbValue: vi.fn((hazard) => hazard === 'all' ? null : hazard)
}))

import { GET } from '@/app/api/analytics/lead-source/route'

describe('Analytics Lead Source API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return empty result when no jobs found', async () => {
    mockSupabaseClient.from.mockImplementation((table) => {
      const builder = createQueryBuilder()
      if (table === 'jobs') {
        builder.then.mockImplementation((resolve) => {
          resolve({ data: [], error: null })
        })
      }
      return builder
    })

    const request = new NextRequest('http://localhost/api/analytics/lead-source')
    
    const response = await GET(request)
    expect(response.status).toBe(200)
    
    const json = await response.json()
    expect(json).toEqual({ total: 0, buckets: [] })
  })

  it('should aggregate jobs by lead source successfully', async () => {
    const mockJobs = [
      { id: 'job-1', site_survey_id: 'survey-1' },
      { id: 'job-2', site_survey_id: 'survey-2' }
    ]

    const mockSurveys = [
      { id: 'survey-1', customer_id: 'customer-1', hazard_type: 'asbestos' },
      { id: 'survey-2', customer_id: 'customer-2', hazard_type: 'mold' }
    ]

    const mockCustomers = [
      { id: 'customer-1', lead_source: 'Google Ads', source: null },
      { id: 'customer-2', lead_source: null, source: 'referral' }
    ]

    mockSupabaseClient.from.mockImplementation((table) => {
      const builder = createQueryBuilder()
      
      if (table === 'jobs') {
        builder.then.mockImplementation((resolve) => {
          resolve({ data: mockJobs, error: null })
        })
      } else if (table === 'site_surveys') {
        builder.then.mockImplementation((resolve) => {
          resolve({ data: mockSurveys, error: null })
        })
      } else if (table === 'customers') {
        builder.then.mockImplementation((resolve) => {
          resolve({ data: mockCustomers, error: null })
        })
      }
      
      return builder
    })

    const request = new NextRequest('http://localhost/api/analytics/lead-source')
    
    const response = await GET(request)
    expect(response.status).toBe(200)
    
    const json = await response.json()
    expect(json.total).toBe(2)
    expect(json.buckets).toEqual([
      { source: 'Google Ads', count: 1 },
      { source: 'referral', count: 1 }
    ])
  })

  it('should handle customers with no lead source as Unknown', async () => {
    const mockJobs = [{ id: 'job-1', site_survey_id: 'survey-1' }]
    const mockSurveys = [{ id: 'survey-1', customer_id: 'customer-1', hazard_type: 'asbestos' }]
    const mockCustomers = [{ id: 'customer-1', lead_source: null, source: null }]

    mockSupabaseClient.from.mockImplementation((table) => {
      const builder = createQueryBuilder()
      
      if (table === 'jobs') {
        builder.then.mockImplementation((resolve) => {
          resolve({ data: mockJobs, error: null })
        })
      } else if (table === 'site_surveys') {
        builder.then.mockImplementation((resolve) => {
          resolve({ data: mockSurveys, error: null })
        })
      } else if (table === 'customers') {
        builder.then.mockImplementation((resolve) => {
          resolve({ data: mockCustomers, error: null })
        })
      }
      
      return builder
    })

    const request = new NextRequest('http://localhost/api/analytics/lead-source')
    
    const response = await GET(request)
    expect(response.status).toBe(200)
    
    const json = await response.json()
    expect(json.buckets).toEqual([
      { source: 'Unknown', count: 1 }
    ])
  })

  it('should filter by hazard type when specified', async () => {
    const mockJobs = [
      { id: 'job-1', site_survey_id: 'survey-1' },
      { id: 'job-2', site_survey_id: 'survey-2' }
    ]

    // Only one survey matches hazard filter
    const mockSurveys = [
      { id: 'survey-1', customer_id: 'customer-1', hazard_type: 'asbestos' }
    ]

    const mockCustomers = [
      { id: 'customer-1', lead_source: 'Google Ads', source: null }
    ]

    mockSupabaseClient.from.mockImplementation((table) => {
      const builder = createQueryBuilder()
      
      if (table === 'jobs') {
        builder.then.mockImplementation((resolve) => {
          resolve({ data: mockJobs, error: null })
        })
      } else if (table === 'site_surveys') {
        builder.then.mockImplementation((resolve) => {
          resolve({ data: mockSurveys, error: null })
        })
      } else if (table === 'customers') {
        builder.then.mockImplementation((resolve) => {
          resolve({ data: mockCustomers, error: null })
        })
      }
      
      return builder
    })

    const request = new NextRequest('http://localhost/api/analytics/lead-source?hazard_type=asbestos')
    
    const response = await GET(request)
    expect(response.status).toBe(200)
    
    const json = await response.json()
    expect(json.total).toBe(1)
    expect(json.buckets).toEqual([
      { source: 'Google Ads', count: 1 }
    ])
  })

  it('should handle database errors gracefully', async () => {
    mockSupabaseClient.from.mockImplementation((table) => {
      const builder = createQueryBuilder()
      if (table === 'jobs') {
        builder.then.mockImplementation(() => {
          throw new Error('Database connection failed')
        })
      }
      return builder
    })

    const request = new NextRequest('http://localhost/api/analytics/lead-source')
    
    // Should propagate the database error
    await expect(GET(request)).rejects.toThrow('Database connection failed')
  })
})