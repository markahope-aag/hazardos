import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// The route was rewritten to merge activity_log + sms_messages +
// email_sends into a single unified feed — it no longer delegates to
// the activity-service helpers. These tests mock the direct table
// queries instead.

// Create a chainable query builder mock. The unified feed uses
// .or(), .in(), .eq(), .order(), .limit() in various combinations.
function createQueryBuilder(response: { data?: unknown[]; error?: unknown } = { data: [], error: null }) {
  const builder: any = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    or: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    then: vi.fn((resolve) => resolve(response)),
  }
  return builder
}

const mockSupabaseClient = {
  from: vi.fn(() => createQueryBuilder()),
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
        profile: { organization_id: 'org-123' },
      }

      return handler(request, context, null, query)
    }
  }),
}))

import { GET } from '@/app/api/activity-log/route'

describe('Activity Log API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabaseClient.from.mockImplementation(() => createQueryBuilder())
  })

  it('should return recent activity when no parameters provided', async () => {
    const mockRows = [
      {
        id: 'activity-1',
        action: 'created',
        entity_type: 'job',
        entity_id: 'job-1',
        entity_name: 'JOB-123-01012024',
        user_name: 'John Doe',
        created_at: '2024-01-01T10:00:00Z',
      },
    ]

    mockSupabaseClient.from.mockImplementation((table) =>
      createQueryBuilder(table === 'activity_log'
        ? { data: mockRows, error: null }
        : { data: [], error: null },
      ),
    )

    const request = new NextRequest('http://localhost/api/activity-log')
    const response = await GET(request)
    expect(response.status).toBe(200)

    const json = await response.json()
    expect(Array.isArray(json.activity)).toBe(true)
    expect(json.activity.length).toBe(1)
    expect(json.activity[0].source).toBe('activity')
    expect(json.activity[0].kind).toBe('created')
  })

  it('should aggregate customer-related activity from all three sources', async () => {
    const mockCustomerId = '550e8400-e29b-41d4-a716-446655440000'

    mockSupabaseClient.from.mockImplementation((table) => {
      if (table === 'site_surveys') {
        return createQueryBuilder({
          data: [{ id: 'survey-1' }],
          error: null,
        })
      }
      if (table === 'activity_log') {
        return createQueryBuilder({
          data: [{
            id: 'activity-1',
            action: 'created',
            entity_type: 'customer',
            entity_id: mockCustomerId,
            entity_name: 'Jane Doe',
            created_at: '2024-01-01T10:00:00Z',
          }],
          error: null,
        })
      }
      if (table === 'sms_messages') {
        return createQueryBuilder({
          data: [{
            id: 'sms-1',
            customer_id: mockCustomerId,
            direction: 'outbound',
            body: 'Heads up',
            to_phone: '+15551234',
            status: 'sent',
            queued_at: '2024-01-02T10:00:00Z',
          }],
          error: null,
        })
      }
      if (table === 'email_sends') {
        return createQueryBuilder({
          data: [{
            id: 'email-1',
            to_email: 'jane@example.com',
            subject: 'Quote ready',
            status: 'delivered',
            related_entity_type: 'customer',
            related_entity_id: mockCustomerId,
            created_at: '2024-01-03T10:00:00Z',
            sent_at: '2024-01-03T10:00:00Z',
          }],
          error: null,
        })
      }
      return createQueryBuilder({ data: [], error: null })
    })

    const request = new NextRequest(`http://localhost/api/activity-log?customer_id=${mockCustomerId}`)
    const response = await GET(request)
    expect(response.status).toBe(200)

    const json = await response.json()
    expect(Array.isArray(json.activity)).toBe(true)
    // One from each source
    expect(json.activity.length).toBe(3)
    const sources = json.activity.map((e: { source: string }) => e.source).sort()
    expect(sources).toEqual(['activity', 'email', 'sms'])
  })

  it('should handle empty related entities gracefully', async () => {
    const mockCustomerId = '550e8400-e29b-41d4-a716-446655440002'
    mockSupabaseClient.from.mockImplementation(() =>
      createQueryBuilder({ data: [], error: null }),
    )

    const request = new NextRequest(`http://localhost/api/activity-log?customer_id=${mockCustomerId}`)
    const response = await GET(request)
    expect(response.status).toBe(200)

    const json = await response.json()
    expect(json.activity).toEqual([])
  })

  it('returns an entity-specific unified feed when entity_type + entity_id are given', async () => {
    mockSupabaseClient.from.mockImplementation((table) => {
      if (table === 'activity_log') {
        return createQueryBuilder({
          data: [{
            id: 'a-1',
            action: 'updated',
            entity_type: 'customer',
            entity_id: 'customer-123',
            entity_name: 'John Smith',
            old_values: { name: 'Jon Smith' },
            new_values: { name: 'John Smith' },
            created_at: '2024-01-01T10:00:00Z',
          }],
          error: null,
        })
      }
      return createQueryBuilder({ data: [], error: null })
    })

    const request = new NextRequest(
      'http://localhost/api/activity-log?entity_type=customer&entity_id=customer-123',
    )
    const response = await GET(request)
    expect(response.status).toBe(200)

    const json = await response.json()
    expect(json.activity.length).toBe(1)
    expect(json.activity[0].kind).toBe('updated')
  })
})
