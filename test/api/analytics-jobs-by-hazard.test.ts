import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Create a chainable query builder mock. Route now uses .or() for the
// overlap filter (active during period) instead of BETWEEN on scheduled
// dates, so the mock has to chain that too.
function createQueryBuilder() {
  const builder: any = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    lte: vi.fn(() => builder),
    neq: vi.fn(() => builder),
    or: vi.fn(() => builder),
    in: vi.fn(() => builder),
    order: vi.fn(() => builder),
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
  }))
}))

import { GET } from '@/app/api/analytics/jobs-by-hazard/route'

describe('Analytics Jobs By Hazard API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return empty result when no jobs found', async () => {
    mockSupabaseClient.from.mockImplementation(() => {
      const builder = createQueryBuilder()
      builder.then.mockImplementation((resolve) => {
        resolve({ data: [], error: null })
      })
      return builder
    })

    const request = new NextRequest('http://localhost/api/analytics/jobs-by-hazard')
    
    const response = await GET(request)
    expect(response.status).toBe(200)
    
    const json = await response.json()
    expect(json).toEqual({ total: 0, buckets: [] })
  })

  it('should count jobs by hazard type correctly', async () => {
    const mockJobs = [
      { 
        id: 'job-1', 
        site_survey_id: 'survey-1',
        site_survey: { hazard_type: 'asbestos' }
      },
      { 
        id: 'job-2', 
        site_survey_id: 'survey-2',
        site_survey: { hazard_type: 'mold' }
      },
      { 
        id: 'job-3', 
        site_survey_id: 'survey-3',
        site_survey: { hazard_type: 'asbestos' }
      },
      { 
        id: 'job-4', 
        site_survey_id: 'survey-4',
        site_survey: { hazard_type: 'lead' }
      }
    ]

    mockSupabaseClient.from.mockImplementation(() => {
      const builder = createQueryBuilder()
      builder.then.mockImplementation((resolve) => {
        resolve({ data: mockJobs, error: null })
      })
      return builder
    })

    const request = new NextRequest('http://localhost/api/analytics/jobs-by-hazard')
    
    const response = await GET(request)
    expect(response.status).toBe(200)
    
    const json = await response.json()
    expect(json.total).toBe(4)
    
    // Should maintain consistent ordering and only include hazards with counts > 0
    const expectedBuckets = [
      { hazard: 'asbestos', count: 2 },
      { hazard: 'mold', count: 1 },
      { hazard: 'lead', count: 1 }
    ]
    expect(json.buckets).toEqual(expectedBuckets)
  })

  it('should handle jobs with no site survey as unknown', async () => {
    const mockJobs = [
      { 
        id: 'job-1', 
        site_survey_id: 'survey-1',
        site_survey: { hazard_type: 'asbestos' }
      },
      { 
        id: 'job-2', 
        site_survey_id: null,
        site_survey: null
      },
      { 
        id: 'job-3', 
        site_survey_id: 'survey-3',
        site_survey: null // Survey exists but wasn't loaded
      }
    ]

    mockSupabaseClient.from.mockImplementation(() => {
      const builder = createQueryBuilder()
      builder.then.mockImplementation((resolve) => {
        resolve({ data: mockJobs, error: null })
      })
      return builder
    })

    const request = new NextRequest('http://localhost/api/analytics/jobs-by-hazard')
    
    const response = await GET(request)
    expect(response.status).toBe(200)
    
    const json = await response.json()
    expect(json.total).toBe(3)
    
    const expectedBuckets = [
      { hazard: 'asbestos', count: 1 },
      { hazard: 'unknown', count: 2 }
    ]
    expect(json.buckets).toEqual(expectedBuckets)
  })

  it('should handle site_survey as array (PostgREST quirk)', async () => {
    const mockJobs = [
      { 
        id: 'job-1', 
        site_survey_id: 'survey-1',
        site_survey: [{ hazard_type: 'vermiculite' }] // Array format
      }
    ]

    mockSupabaseClient.from.mockImplementation(() => {
      const builder = createQueryBuilder()
      builder.then.mockImplementation((resolve) => {
        resolve({ data: mockJobs, error: null })
      })
      return builder
    })

    const request = new NextRequest('http://localhost/api/analytics/jobs-by-hazard')
    
    const response = await GET(request)
    expect(response.status).toBe(200)
    
    const json = await response.json()
    expect(json.buckets).toEqual([
      { hazard: 'vermiculite', count: 1 }
    ])
  })

  it('should maintain consistent hazard ordering', async () => {
    const mockJobs = [
      { id: 'job-1', site_survey_id: 'survey-1', site_survey: { hazard_type: 'unknown' } },
      { id: 'job-2', site_survey_id: 'survey-2', site_survey: { hazard_type: 'other' } },
      { id: 'job-3', site_survey_id: 'survey-3', site_survey: { hazard_type: 'lead' } },
      { id: 'job-4', site_survey_id: 'survey-4', site_survey: { hazard_type: 'vermiculite' } },
      { id: 'job-5', site_survey_id: 'survey-5', site_survey: { hazard_type: 'mold' } },
      { id: 'job-6', site_survey_id: 'survey-6', site_survey: { hazard_type: 'asbestos' } }
    ]

    mockSupabaseClient.from.mockImplementation(() => {
      const builder = createQueryBuilder()
      builder.then.mockImplementation((resolve) => {
        resolve({ data: mockJobs, error: null })
      })
      return builder
    })

    const request = new NextRequest('http://localhost/api/analytics/jobs-by-hazard')
    
    const response = await GET(request)
    expect(response.status).toBe(200)
    
    const json = await response.json()
    
    // Should follow the predefined order: asbestos, mold, lead, vermiculite, other, unknown
    const expectedOrder = ['asbestos', 'mold', 'lead', 'vermiculite', 'other', 'unknown']
    const actualOrder = json.buckets.map((b: any) => b.hazard)
    expect(actualOrder).toEqual(expectedOrder)
  })

  it('should handle database errors gracefully', async () => {
    mockSupabaseClient.from.mockImplementation(() => {
      const builder = createQueryBuilder()
      builder.then.mockImplementation(() => {
        throw new Error('Database connection failed')
      })
      return builder
    })

    const request = new NextRequest('http://localhost/api/analytics/jobs-by-hazard')
    
    // Should propagate the database error
    await expect(GET(request)).rejects.toThrow('Database connection failed')
  })

  it('should exclude cancelled jobs', async () => {
    const mockJobs = [
      { id: 'job-1', site_survey_id: 'survey-1', site_survey: { hazard_type: 'asbestos' } }
    ]

    const mockChain = createQueryBuilder()
    mockChain.then.mockImplementation((resolve) => {
      resolve({ data: mockJobs, error: null })
    })

    mockSupabaseClient.from.mockImplementation(() => mockChain)

    const request = new NextRequest('http://localhost/api/analytics/jobs-by-hazard')
    
    await GET(request)
    
    expect(mockChain.neq).toHaveBeenCalledWith('status', 'cancelled')
  })
})