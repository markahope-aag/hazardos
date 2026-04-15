import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/analytics/jobs-by-status/route'

const mockSupabaseClient = {
  auth: { getUser: vi.fn() },
  from: vi.fn(),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null)),
}))

/**
 * Build a chainable proxy that resolves any awaited terminal call to the
 * given payload. Every method returns the proxy; `then` makes it thenable.
 * This lets the endpoint chain `.from().select().eq().gte().lte()` or
 * any other suffix without the mock breaking.
 */
function makeChainableResult(payload: { data?: unknown; count?: number | null; error?: unknown }) {
  type Proxied = ((...args: unknown[]) => Proxied) & { then?: unknown }
  const proxy: Proxied = new Proxy((() => proxy) as Proxied, {
    get(_target, prop) {
      if (prop === 'then') {
        return (onFulfilled: (value: unknown) => unknown) =>
          Promise.resolve({ data: [], count: 0, error: null, ...payload }).then(onFulfilled)
      }
      return proxy
    },
    apply() {
      return proxy
    },
  }) as Proxied
  return proxy
}

const PROFILE_ROW = {
  organization_id: '550e8400-e29b-41d4-a716-446655440000',
  role: 'user',
}

describe('GET /api/analytics/jobs-by-status', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const setupAuthedMocks = (jobs: Array<{ status: string }>) => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1', email: 'user@example.com' } },
      error: null,
    })
    vi.mocked(mockSupabaseClient.from).mockImplementation((table: string) => {
      if (table === 'profiles') {
        // api-handler's auth lookup: .select().eq().single()
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: PROFILE_ROW, error: null }),
            }),
          }),
        } as unknown as ReturnType<typeof mockSupabaseClient.from>
      }
      if (table === 'jobs') {
        return makeChainableResult({ data: jobs, error: null })
      }
      // site_surveys lookup for hazard filter (unused in default-filter tests)
      return makeChainableResult({ data: [], error: null })
    })
  }

  it('returns grouped buckets and a total for the authenticated org', async () => {
    setupAuthedMocks([
      { status: 'scheduled' },
      { status: 'scheduled' },
      { status: 'in_progress' },
      { status: 'completed' },
      { status: 'completed' },
      { status: 'completed' },
    ])

    const request = new NextRequest('http://localhost:3000/api/analytics/jobs-by-status')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveProperty('total')
    expect(data).toHaveProperty('buckets')
    expect(data.total).toBe(6)
    expect(Array.isArray(data.buckets)).toBe(true)
    expect(data.buckets.length).toBeGreaterThan(0)
  })

  it('returns 401 for an unauthenticated caller', async () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null,
    })
    const request = new NextRequest('http://localhost:3000/api/analytics/jobs-by-status')
    const response = await GET(request)
    expect(response.status).toBe(401)
  })

  it('handles empty job results', async () => {
    setupAuthedMocks([])
    const request = new NextRequest('http://localhost:3000/api/analytics/jobs-by-status')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.total).toBe(0)
    expect(data.buckets).toEqual([])
  })
})
