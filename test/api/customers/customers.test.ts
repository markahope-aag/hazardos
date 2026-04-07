import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock CustomersService
const mockGetCustomers = vi.fn()
const mockCreateCustomer = vi.fn()

vi.mock('@/lib/supabase/customers', () => ({
  CustomersService: {
    getCustomers: (...args: unknown[]) => mockGetCustomers(...args),
    createCustomer: (...args: unknown[]) => mockCreateCustomer(...args),
  },
}))

// Mock createApiHandler to pass through with a fake auth context
vi.mock('@/lib/utils/api-handler', () => ({
  createApiHandler: vi.fn((options: Record<string, unknown>, handler: (...args: any[]) => any) => {
    return async (request: NextRequest) => {
      const url = new URL(request.url)
      const query: Record<string, unknown> = {}
      url.searchParams.forEach((value, key) => {
        query[key] = value
      })

      // Parse query schema if provided
      if (options.querySchema) {
        const schema = options.querySchema as { safeParse: (v: unknown) => { success: boolean; data?: unknown; error?: { message: string } } }
        const result = schema.safeParse(query)
        if (!result.success) {
          const { NextResponse } = await import('next/server')
          return NextResponse.json(
            { error: 'The provided data is invalid', type: 'VALIDATION_ERROR' },
            { status: 400 }
          )
        }
        Object.assign(query, result.data)
      }

      // Parse body schema if provided
      let body = null
      if (request.method === 'POST' || request.method === 'PUT') {
        try {
          body = await request.json()
        } catch {
          const { NextResponse } = await import('next/server')
          return NextResponse.json(
            { error: 'The provided data is invalid', type: 'VALIDATION_ERROR' },
            { status: 400 }
          )
        }
        if (options.bodySchema) {
          const schema = options.bodySchema as { safeParse: (v: unknown) => { success: boolean; data?: unknown; error?: { message: string } } }
          const result = schema.safeParse(body)
          if (!result.success) {
            const { NextResponse } = await import('next/server')
            return NextResponse.json(
              { error: 'The provided data is invalid', type: 'VALIDATION_ERROR' },
              { status: 400 }
            )
          }
          body = result.data
        }
      }

      const context = {
        supabase: {},
        user: { id: 'user-123', email: 'test@example.com' },
        profile: { id: 'profile-123', organization_id: 'org-123', role: 'admin' },
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
      }

      return handler(request, context, body, query)
    }
  }),
}))

import { GET, POST } from '@/app/api/customers/route'

describe('/api/customers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/customers', () => {
    it('retrieves customers successfully', async () => {
      const mockCustomers = [
        { id: '1', name: 'John Doe', email: 'john@example.com' },
        { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
      ]

      mockGetCustomers.mockResolvedValue(mockCustomers)

      const request = new NextRequest('http://localhost:3000/api/customers')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.customers).toEqual(mockCustomers)
      expect(mockGetCustomers).toHaveBeenCalledWith('org-123', expect.any(Object))
    })

    it('passes filter parameters to service', async () => {
      mockGetCustomers.mockResolvedValue([])

      const request = new NextRequest(
        'http://localhost:3000/api/customers?status=lead&search=john'
      )
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.customers).toEqual([])
      expect(mockGetCustomers).toHaveBeenCalledWith(
        'org-123',
        expect.objectContaining({
          status: 'lead',
          search: 'john',
        })
      )
    })

    it('handles service errors', async () => {
      mockGetCustomers.mockRejectedValue(new Error('Database connection failed'))

      const request = new NextRequest('http://localhost:3000/api/customers')

      // The createApiHandler mock doesn't wrap errors, so this will throw
      await expect(GET(request)).rejects.toThrow('Database connection failed')
    })
  })

  describe('POST /api/customers', () => {
    it('creates a new customer successfully', async () => {
      const createdCustomer = {
        id: '3',
        name: 'New Customer',
        email: 'new@example.com',
        organization_id: 'org-123',
        status: 'lead',
      }

      mockCreateCustomer.mockResolvedValue(createdCustomer)

      const request = new NextRequest('http://localhost:3000/api/customers', {
        method: 'POST',
        body: JSON.stringify({ name: 'New Customer', email: 'new@example.com' }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.customer).toBeDefined()
      expect(data.customer.id).toBe('3')
    })

    it('validates required name field', async () => {
      const request = new NextRequest('http://localhost:3000/api/customers', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      expect(mockCreateCustomer).not.toHaveBeenCalled()
    })

    it('handles malformed JSON', async () => {
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
