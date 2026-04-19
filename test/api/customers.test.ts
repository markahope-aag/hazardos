import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// The /api/customers route was inlined to query `context.supabase` directly
// (instead of delegating to CustomersService), so these tests mock the
// createApiHandler wrapper to supply a fake context with a chainable
// Supabase stub. Going through the real handler would fight with auth,
// rate limiting, and profile lookup — none of which we're trying to cover
// here. See the route comment for why the inlining happened.

type QueryResult = { data: unknown; error: unknown | null }

function makeSupabaseStub(queryResult: QueryResult, insertResult?: QueryResult) {
  const single = vi.fn().mockResolvedValue(insertResult ?? { data: null, error: null })
  const chain: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single,
    then: (resolve: (v: QueryResult) => void) => Promise.resolve(queryResult).then(resolve),
  }
  const from = vi.fn().mockReturnValue(chain)
  return { from, chain }
}

let supabaseStub = makeSupabaseStub({ data: [], error: null })

vi.mock('@/lib/utils/api-handler', () => ({
  createApiHandler: vi.fn(
    (options: Record<string, unknown>, handler: (...args: unknown[]) => unknown) => {
      return async (request: NextRequest) => {
        const url = new URL(request.url)
        const query: Record<string, unknown> = {}
        url.searchParams.forEach((value, key) => {
          query[key] = value
        })

        if (options.querySchema) {
          const schema = options.querySchema as { safeParse: (v: unknown) => { success: boolean; data?: unknown } }
          const result = schema.safeParse(query)
          if (!result.success) {
            return NextResponse.json(
              { error: 'The provided data is invalid', type: 'VALIDATION_ERROR' },
              { status: 400 },
            )
          }
          Object.assign(query, result.data)
        }

        let body: unknown = null
        if (request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH') {
          try {
            body = await request.json()
          } catch {
            return NextResponse.json(
              { error: 'The provided data is invalid', type: 'VALIDATION_ERROR' },
              { status: 400 },
            )
          }
          if (options.bodySchema) {
            const schema = options.bodySchema as { safeParse: (v: unknown) => { success: boolean; data?: unknown } }
            const result = schema.safeParse(body)
            if (!result.success) {
              return NextResponse.json(
                { error: 'The provided data is invalid', type: 'VALIDATION_ERROR' },
                { status: 400 },
              )
            }
            body = result.data
          }
        }

        const context = {
          supabase: supabaseStub,
          user: { id: 'user-123', email: 'test@example.com' },
          profile: { id: 'profile-123', organization_id: 'org-123', role: 'admin' },
          log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
        }

        return (handler as (req: NextRequest, ctx: unknown, body: unknown, query: unknown) => unknown)(
          request,
          context,
          body,
          query,
        )
      }
    },
  ),
}))

import { GET, POST } from '@/app/api/customers/route'

describe('/api/customers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    supabaseStub = makeSupabaseStub({ data: [], error: null })
  })

  describe('GET', () => {
    it('returns rows scoped to the caller organization', async () => {
      const rows = [
        { id: '1', name: 'John Doe', email: 'john@example.com' },
        { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
      ]
      supabaseStub = makeSupabaseStub({ data: rows, error: null })

      const request = new NextRequest('http://localhost:3000/api/customers')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.customers).toEqual(rows)
      expect(supabaseStub.from).toHaveBeenCalledWith('customers')
      expect(supabaseStub.chain.eq).toHaveBeenCalledWith('organization_id', 'org-123')
    })

    it('applies the status filter when provided', async () => {
      supabaseStub = makeSupabaseStub({ data: [], error: null })

      const request = new NextRequest('http://localhost:3000/api/customers?status=lead')
      await GET(request)

      expect(supabaseStub.chain.eq).toHaveBeenCalledWith('status', 'lead')
    })

    it('applies the search filter as a sanitized OR clause', async () => {
      supabaseStub = makeSupabaseStub({ data: [], error: null })

      const request = new NextRequest('http://localhost:3000/api/customers?search=john')
      await GET(request)

      expect(supabaseStub.chain.or).toHaveBeenCalledTimes(1)
      const orArg = (supabaseStub.chain.or as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
      expect(orArg).toContain('name.ilike.%john%')
      expect(orArg).toContain('email.ilike.%john%')
    })

    it('paginates using limit and offset', async () => {
      supabaseStub = makeSupabaseStub({ data: [], error: null })

      const request = new NextRequest('http://localhost:3000/api/customers?limit=10&offset=20')
      await GET(request)

      expect(supabaseStub.chain.limit).toHaveBeenCalledWith(10)
      expect(supabaseStub.chain.range).toHaveBeenCalledWith(20, 29)
    })
  })

  describe('POST', () => {
    it('inserts with organization_id and created_by stamped from context', async () => {
      const created = {
        id: '3',
        name: 'New Customer',
        email: 'new@example.com',
        organization_id: 'org-123',
      }
      supabaseStub = makeSupabaseStub({ data: [], error: null }, { data: created, error: null })

      const request = new NextRequest('http://localhost:3000/api/customers', {
        method: 'POST',
        body: JSON.stringify({ name: 'New Customer', email: 'new@example.com' }),
        headers: { 'Content-Type': 'application/json' },
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.customer).toEqual(created)
      const insertArg = (supabaseStub.chain.insert as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(insertArg).toMatchObject({
        organization_id: 'org-123',
        name: 'New Customer',
        email: 'new@example.com',
        created_by: 'user-123',
      })
    })

    it('rejects payloads missing the required name field', async () => {
      const request = new NextRequest('http://localhost:3000/api/customers', {
        method: 'POST',
        body: JSON.stringify({ email: 'no-name@example.com' }),
        headers: { 'Content-Type': 'application/json' },
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
      expect(supabaseStub.chain.insert).not.toHaveBeenCalled()
    })

    it('rejects payloads with an invalid email format', async () => {
      const request = new NextRequest('http://localhost:3000/api/customers', {
        method: 'POST',
        body: JSON.stringify({ name: 'New Customer', email: 'not-an-email' }),
        headers: { 'Content-Type': 'application/json' },
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
      expect(supabaseStub.chain.insert).not.toHaveBeenCalled()
    })

    it('rejects malformed JSON bodies', async () => {
      const request = new NextRequest('http://localhost:3000/api/customers', {
        method: 'POST',
        body: 'invalid json{',
        headers: { 'Content-Type': 'application/json' },
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })
  })
})
