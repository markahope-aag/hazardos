import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/v1/invoices/route'

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

describe('V1 Invoices API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockContext = {
    organizationId: 'org-123',
    apiKey: { id: 'key-1', scopes: ['invoices:read', 'invoices:write'] }
  }

  describe('GET /api/v1/invoices', () => {
    it('should list invoices with pagination', async () => {
      vi.mocked(ApiKeyService.hasScope).mockReturnValue(true)

      const mockInvoices = [
        {
          id: 'inv-1',
          invoice_number: 'INV-00001',
          status: 'sent',
          total_amount: 1000,
          customer: { id: 'cust-1', name: 'John Doe', company_name: 'ABC Corp' }
        },
        {
          id: 'inv-2',
          invoice_number: 'INV-00002',
          status: 'paid',
          total_amount: 2000,
          customer: { id: 'cust-2', name: 'Jane Smith', company_name: 'XYZ Inc' }
        }
      ]

      const builder = createQueryBuilder()
      builder.then.mockImplementation((resolve) => {
        resolve({
          data: mockInvoices,
          count: 2,
          error: null
        })
      })

      vi.mocked(mockSupabaseClient.from).mockReturnValue(builder)

      const request = new NextRequest('http://localhost/api/v1/invoices')

      const response = await GET(request, mockContext)
      expect(response.status).toBe(200)

      const json = await response.json()
      expect(json.data).toEqual(mockInvoices)
      expect(json.pagination.total).toBe(2)
    })

    it('should filter by status', async () => {
      vi.mocked(ApiKeyService.hasScope).mockReturnValue(true)

      const builder = createQueryBuilder()
      vi.mocked(mockSupabaseClient.from).mockReturnValue(builder)

      const request = new NextRequest('http://localhost/api/v1/invoices?status=paid')

      const response = await GET(request, mockContext)
      expect(response.status).toBe(200)

      expect(builder.eq).toHaveBeenCalledWith('status', 'paid')
    })

    it('should return 403 without invoices:read scope', async () => {
      vi.mocked(ApiKeyService.hasScope).mockReturnValue(false)

      const request = new NextRequest('http://localhost/api/v1/invoices')

      const response = await GET(request, mockContext)
      expect(response.status).toBe(403)

      const json = await response.json()
      expect(json.error).toBe('Missing required scope: invoices:read')
    })

    it('should return 400 for invalid query parameters', async () => {
      vi.mocked(ApiKeyService.hasScope).mockReturnValue(true)

      const request = new NextRequest('http://localhost/api/v1/invoices?limit=invalid')

      const response = await GET(request, mockContext)
      expect(response.status).toBe(400)

      const json = await response.json()
      expect(json.error).toBe('Invalid query parameters')
    })
  })

  describe('POST /api/v1/invoices', () => {
    it('should create invoice from job', async () => {
      vi.mocked(ApiKeyService.hasScope).mockReturnValue(true)

      const mockInvoice = {
        id: 'inv-123',
        invoice_number: 'INV-00001',
        organization_id: 'org-123',
        job_id: '550e8400-e29b-41d4-a716-446655440000',
        total_amount: 1500,
        status: 'draft'
      }

      // Mock customer and job lookup (success)
      mockSupabaseClient.from.mockImplementation((table) => {
        const builder = createQueryBuilder()
        
        if (table === 'customers') {
          builder.single = vi.fn().mockResolvedValue({
            data: { id: '550e8400-e29b-41d4-a716-446655440001' },
            error: null
          })
        } else if (table === 'jobs') {
          builder.single = vi.fn().mockResolvedValue({
            data: { 
              id: '550e8400-e29b-41d4-a716-446655440000',
              organization_id: 'org-123'
            },
            error: null
          })
        } else if (table === 'invoices') {
          // For count query - check if it's a count query
          builder.then.mockImplementation((resolve) => {
            resolve({ count: 0 })
          })
          // For insert query  
          builder.insert.mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockInvoice,
                error: null
              })
            })
          })
        } else if (table === 'invoice_line_items') {
          builder.insert = vi.fn().mockResolvedValue({ data: null, error: null })
        }
        
        return builder
      })

      const requestBody = {
        customer_id: '550e8400-e29b-41d4-a716-446655440001',
        job_id: '550e8400-e29b-41d4-a716-446655440000',
        line_items: [
          { description: 'Job completion', quantity: 1, unit_price: 1500 }
        ],
        due_date: '2024-02-01',
        notes: 'Test invoice'
      }

      const request = new NextRequest('http://localhost/api/v1/invoices', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })

      const response = await POST(request, mockContext)
      expect(response.status).toBe(201)

      const json = await response.json()
      expect(json.data).toEqual(mockInvoice)
    })

    it('should return 404 when job not found', async () => {
      vi.mocked(ApiKeyService.hasScope).mockReturnValue(true)

      mockSupabaseClient.from.mockImplementation((table) => {
        const builder = createQueryBuilder()
        
        if (table === 'customers') {
          builder.single = vi.fn().mockResolvedValue({
            data: { id: '550e8400-e29b-41d4-a716-446655440001' },
            error: null
          })
        } else if (table === 'jobs') {
          builder.single = vi.fn().mockResolvedValue({
            data: null,
            error: null
          })
        }
        
        return builder
      })

      const request = new NextRequest('http://localhost/api/v1/invoices', {
        method: 'POST',
        body: JSON.stringify({
          customer_id: '550e8400-e29b-41d4-a716-446655440002',
          job_id: '550e8400-e29b-41d4-a716-446655440001',
          line_items: [
            { description: 'Test service', quantity: 1, unit_price: 100 }
          ],
          due_date: '2024-02-01'
        })
      })

      const response = await POST(request, mockContext)
      expect(response.status).toBe(404)

      const json = await response.json()
      expect(json.error).toBe('Job not found')
    })

    it('should return 403 without invoices:write scope', async () => {
      vi.mocked(ApiKeyService.hasScope).mockReturnValue(false)

      const request = new NextRequest('http://localhost/api/v1/invoices', {
        method: 'POST',
        body: JSON.stringify({
          customer_id: '550e8400-e29b-41d4-a716-446655440001',
          job_id: '550e8400-e29b-41d4-a716-446655440000',
          line_items: [
            { description: 'Test service', quantity: 1, unit_price: 100 }
          ],
          due_date: '2024-02-01'
        })
      })

      const response = await POST(request, mockContext)
      expect(response.status).toBe(403)

      const json = await response.json()
      expect(json.error).toBe('Missing required scope: invoices:write')
    })

    it('should return 400 for invalid JSON', async () => {
      vi.mocked(ApiKeyService.hasScope).mockReturnValue(true)

      const request = new NextRequest('http://localhost/api/v1/invoices', {
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
