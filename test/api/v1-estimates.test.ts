import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { GET, POST } from '@/app/api/v1/estimates/route'
import type { ApiKeyAuthContext } from '@/lib/middleware/api-key-auth'

type RouteHandler = (request: NextRequest, context: ApiKeyAuthContext) => Promise<NextResponse>
type ThenResolve = (result: { data?: unknown[] | null; count?: number | null; error?: unknown }) => void

const typedGET = GET as unknown as RouteHandler
const typedPOST = POST as unknown as RouteHandler

// Create a chainable query builder mock
function createQueryBuilder() {
  const builder: any = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    range: vi.fn(() => builder),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn()
      }))
    })),
    then: vi.fn((resolve: ThenResolve) => {
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
  from: vi.fn((_table: string) => createQueryBuilder())
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => mockSupabaseClient)
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

describe('V1 Estimates API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockContext: ApiKeyAuthContext = {
    organizationId: 'org-123',
    apiKey: {
      id: 'key-1',
      organization_id: 'org-123',
      name: 'Test Key',
      key_prefix: 'hz_test',
      scopes: ['estimates:read', 'estimates:write'],
      rate_limit: 1000,
      is_active: true,
      created_at: '2026-03-01T10:00:00Z'
    }
  }

  describe('GET /api/v1/estimates', () => {
    it('should list estimates with pagination', async () => {
      vi.mocked(ApiKeyService.hasScope).mockReturnValue(true)

      const mockEstimates = [
        {
          id: 'est-1',
          estimate_number: 'EST-00001',
          status: 'draft',
          total_amount: 1000,
          customer: { id: 'cust-1', name: 'John Doe', company_name: 'ABC Corp' }
        },
        {
          id: 'est-2',
          estimate_number: 'EST-00002',
          status: 'sent',
          total_amount: 2000,
          customer: { id: 'cust-2', name: 'Jane Smith', company_name: 'XYZ Inc' }
        }
      ]

      const builder = createQueryBuilder()
      builder.then.mockImplementation((resolve: ThenResolve) => {
        resolve({
          data: mockEstimates,
          count: 2,
          error: null
        })
      })

      vi.mocked(mockSupabaseClient.from).mockReturnValue(builder)

      const request = new NextRequest('http://localhost/api/v1/estimates')

      const response = await typedGET(request, mockContext)
      expect(response.status).toBe(200)

      const json = await response.json()
      expect(json.data).toEqual(mockEstimates)
      expect(json.pagination.total).toBe(2)
    })

    it('should filter by status', async () => {
      vi.mocked(ApiKeyService.hasScope).mockReturnValue(true)

      const builder = createQueryBuilder()
      vi.mocked(mockSupabaseClient.from).mockReturnValue(builder)

      const request = new NextRequest('http://localhost/api/v1/estimates?status=sent')

      const response = await typedGET(request, mockContext)
      expect(response.status).toBe(200)

      // Verify eq was called with status filter
      expect(builder.eq).toHaveBeenCalledWith('status', 'sent')
    })

    it('should return 403 without estimates:read scope', async () => {
      vi.mocked(ApiKeyService.hasScope).mockReturnValue(false)

      const request = new NextRequest('http://localhost/api/v1/estimates')

      const response = await typedGET(request, mockContext)
      expect(response.status).toBe(403)

      const json = await response.json()
      expect(json.error).toBe('Missing required scope: estimates:read')
    })

    it('should return 400 for invalid query parameters', async () => {
      vi.mocked(ApiKeyService.hasScope).mockReturnValue(true)

      const request = new NextRequest('http://localhost/api/v1/estimates?limit=invalid')

      const response = await typedGET(request, mockContext)
      expect(response.status).toBe(400)

      const json = await response.json()
      expect(json.error).toBe('Invalid query parameters')
    })
  })

  describe('POST /api/v1/estimates', () => {
    it('should create estimate with line items', async () => {
      vi.mocked(ApiKeyService.hasScope).mockReturnValue(true)

      const mockEstimate = {
        id: 'est-123',
        estimate_number: 'EST-00001',
        organization_id: 'org-123',
        customer_id: 'cust-1',
        total_amount: 250,
        status: 'draft'
      }

      // Mock customer lookup (success)
      mockSupabaseClient.from.mockImplementation((table: string) => {
        const builder = createQueryBuilder()
        
        if (table === 'customers') {
          builder.single = vi.fn().mockResolvedValue({
            data: { id: '550e8400-e29b-41d4-a716-446655440000' },
            error: null
          })
        } else if (table === 'estimates') {
          // For count query
          builder.then.mockImplementation((resolve: ThenResolve) => {
            resolve({ count: 0 })
          })
          // For insert query  
          builder.insert.mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockEstimate,
                error: null
              })
            })
          })
        } else if (table === 'estimate_line_items') {
          builder.insert = vi.fn().mockResolvedValue({ data: null, error: null })
        }
        
        return builder
      })

      const requestBody = {
        customer_id: '550e8400-e29b-41d4-a716-446655440000', // Valid UUID
        line_items: [
          { description: 'Asbestos removal', quantity: 2, unit_price: 100 },
          { description: 'Cleanup', quantity: 1, unit_price: 50 }
        ],
        notes: 'Test estimate'
      }

      const request = new NextRequest('http://localhost/api/v1/estimates', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })

      const response = await typedPOST(request, mockContext)
      expect(response.status).toBe(201)

      const json = await response.json()
      expect(json.data).toEqual(mockEstimate)
    })

    it('should return 404 when customer not found', async () => {
      vi.mocked(ApiKeyService.hasScope).mockReturnValue(true)

      mockSupabaseClient.from.mockImplementation((table: string) => {
        const builder = createQueryBuilder()
        
        if (table === 'customers') {
          builder.single = vi.fn().mockResolvedValue({
            data: null,
            error: null
          })
        }
        
        return builder
      })

      const request = new NextRequest('http://localhost/api/v1/estimates', {
        method: 'POST',
        body: JSON.stringify({
          customer_id: '550e8400-e29b-41d4-a716-446655440001', // Valid UUID but nonexistent
          line_items: [{ description: 'Test', quantity: 1, unit_price: 100 }]
        })
      })

      const response = await typedPOST(request, mockContext)
      expect(response.status).toBe(404)

      const json = await response.json()
      expect(json.error).toBe('Customer not found')
    })

    it('should return 403 without estimates:write scope', async () => {
      vi.mocked(ApiKeyService.hasScope).mockReturnValue(false)

      const request = new NextRequest('http://localhost/api/v1/estimates', {
        method: 'POST',
        body: JSON.stringify({
          customer_id: '550e8400-e29b-41d4-a716-446655440000',
          line_items: [{ description: 'Test', quantity: 1, unit_price: 100 }]
        })
      })

      const response = await typedPOST(request, mockContext)
      expect(response.status).toBe(403)

      const json = await response.json()
      expect(json.error).toBe('Missing required scope: estimates:write')
    })

    it('should return 400 for invalid JSON', async () => {
      vi.mocked(ApiKeyService.hasScope).mockReturnValue(true)

      const request = new NextRequest('http://localhost/api/v1/estimates', {
        method: 'POST',
        body: 'invalid json'
      })

      const response = await typedPOST(request, mockContext)
      expect(response.status).toBe(400)

      const json = await response.json()
      expect(json.error).toBe('Invalid JSON body')
    })
  })
})
