import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock the dependencies
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
        order: vi.fn(() => ({
          range: vi.fn()
        }))
      }))
    }))
  }))
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}))

vi.mock('@/lib/services/invoices-service', () => ({
  InvoicesService: {
    list: vi.fn(),
    create: vi.fn(),
    getById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    send: vi.fn()
  }
}))

// Import the route handlers
import { GET, POST } from '@/app/api/invoices/route'
import { createClient } from '@/lib/supabase/server'

describe('Invoices API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/invoices', () => {
    it('should return invoices for authenticated user', async () => {
      // Mock authenticated user
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      // Mock profile data
      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { organization_id: 'org-1' },
              error: null
            })
          })
        })
      } as any)

      // Mock invoices query
      const mockInvoices = [
        {
          id: 'invoice-1',
          invoice_number: 'INV-001',
          job_id: 'job-1',
          customer_id: 'customer-1',
          status: 'draft',
          subtotal: 1000.00,
          tax_amount: 80.00,
          total_amount: 1080.00,
          issue_date: '2026-01-31',
          due_date: '2026-02-15',
          created_at: '2026-01-31T10:00:00Z'
        },
        {
          id: 'invoice-2',
          invoice_number: 'INV-002',
          job_id: 'job-2',
          customer_id: 'customer-2',
          status: 'sent',
          subtotal: 1500.00,
          tax_amount: 120.00,
          total_amount: 1620.00,
          issue_date: '2026-01-30',
          due_date: '2026-02-14',
          created_at: '2026-01-30T10:00:00Z'
        }
      ]

      // Mock the complex query chain
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: mockInvoices,
          error: null,
          count: 2
        })
      }

      vi.mocked(mockSupabaseClient.from).mockReturnValue(mockQuery as any)

      const request = new NextRequest('http://localhost:3000/api/invoices')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.invoices).toEqual(mockInvoices)
      expect(data.total).toBe(2)
      expect(data.page).toBe(1)
      expect(data.limit).toBe(20)
    })

    it('should return 401 for unauthenticated user', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/invoices')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication is required')
      expect(data.type).toBe('UNAUTHORIZED')
    })

    it('should handle query parameters for pagination', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      // Mock profile data
      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { organization_id: 'org-1' },
              error: null
            })
          })
        })
      } as any)

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0
        })
      }

      vi.mocked(mockSupabaseClient.from).mockReturnValue(mockQuery as any)

      const request = new NextRequest('http://localhost:3000/api/invoices?page=2&limit=10')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.page).toBe(2)
      expect(data.limit).toBe(10)
      expect(mockQuery.range).toHaveBeenCalledWith(10, 19) // page 2, limit 10
    })

    it('should handle query parameters for filtering', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      // Mock profile data
      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { organization_id: 'org-1' },
              error: null
            })
          })
        })
      } as any)

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0
        })
      }

      vi.mocked(mockSupabaseClient.from).mockReturnValue(mockQuery as any)

      const request = new NextRequest('http://localhost:3000/api/invoices?status=sent&customer_id=customer-1')
      await GET(request)

      // Verify filtering was applied
      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'sent')
      expect(mockQuery.eq).toHaveBeenCalledWith('customer_id', 'customer-1')
    })

    it('should handle database errors securely', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      // Mock profile data
      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { organization_id: 'org-1' },
              error: null
            })
          })
        })
      } as any)

      // Mock database error
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Connection to database failed', code: '08006' },
          count: null
        })
      }

      vi.mocked(mockSupabaseClient.from).mockReturnValue(mockQuery as any)

      const request = new NextRequest('http://localhost:3000/api/invoices')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('An internal server error occurred')
      expect(data.type).toBe('INTERNAL_ERROR')
      expect(data.error).not.toContain('Connection to database failed')
    })
  })

  describe('POST /api/invoices', () => {
    const validInvoiceData = {
      job_id: 'job-1',
      customer_id: 'customer-1',
      issue_date: '2026-01-31',
      due_date: '2026-02-15',
      subtotal: 1000.00,
      tax_rate: 0.08,
      tax_amount: 80.00,
      total_amount: 1080.00,
      line_items: [
        {
          description: 'Asbestos removal',
          quantity: 1,
          unit_price: 1000.00,
          total: 1000.00
        }
      ]
    }

    it('should create a new invoice for authenticated user', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      // Mock profile data
      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { organization_id: 'org-1' },
              error: null
            })
          })
        })
      } as any)

      const mockCreatedInvoice = {
        id: 'invoice-1',
        invoice_number: 'INV-001',
        ...validInvoiceData,
        status: 'draft',
        organization_id: 'org-1',
        created_at: '2026-01-31T10:00:00Z'
      }

      // Mock the insert operation
      const mockInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockCreatedInvoice,
          error: null
        })
      }

      vi.mocked(mockSupabaseClient.from).mockReturnValue(mockInsert as any)

      const request = new NextRequest('http://localhost:3000/api/invoices', {
        method: 'POST',
        body: JSON.stringify(validInvoiceData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.invoice).toEqual(mockCreatedInvoice)
    })

    it('should return 401 for unauthenticated user', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/invoices', {
        method: 'POST',
        body: JSON.stringify(validInvoiceData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication is required')
      expect(data.type).toBe('UNAUTHORIZED')
    })

    it('should validate required fields', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      // Mock profile data
      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { organization_id: 'org-1' },
              error: null
            })
          })
        })
      } as any)

      // Test missing job_id
      const invalidData = { ...validInvoiceData }
      delete invalidData.job_id

      const request = new NextRequest('http://localhost:3000/api/invoices', {
        method: 'POST',
        body: JSON.stringify(invalidData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('job_id is required')
      expect(data.type).toBe('VALIDATION_ERROR')
      expect(data.field).toBe('job_id')
    })

    it('should validate customer_id field', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      // Mock profile data
      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { organization_id: 'org-1' },
              error: null
            })
          })
        })
      } as any)

      // Test missing customer_id
      const invalidData = { ...validInvoiceData }
      delete invalidData.customer_id

      const request = new NextRequest('http://localhost:3000/api/invoices', {
        method: 'POST',
        body: JSON.stringify(invalidData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('customer_id is required')
      expect(data.type).toBe('VALIDATION_ERROR')
      expect(data.field).toBe('customer_id')
    })

    it('should validate total_amount field', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      // Mock profile data
      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { organization_id: 'org-1' },
              error: null
            })
          })
        })
      } as any)

      // Test missing total_amount
      const invalidData = { ...validInvoiceData }
      delete invalidData.total_amount

      const request = new NextRequest('http://localhost:3000/api/invoices', {
        method: 'POST',
        body: JSON.stringify(invalidData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('total_amount is required')
      expect(data.type).toBe('VALIDATION_ERROR')
      expect(data.field).toBe('total_amount')
    })

    it('should handle database errors securely', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      // Mock profile data
      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { organization_id: 'org-1' },
              error: null
            })
          })
        })
      } as any)

      // Mock database error
      const mockInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Foreign key constraint violation', code: '23503' }
        })
      }

      vi.mocked(mockSupabaseClient.from).mockReturnValue(mockInsert as any)

      const request = new NextRequest('http://localhost:3000/api/invoices', {
        method: 'POST',
        body: JSON.stringify(validInvoiceData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('The requested resource was not found')
      expect(data.type).toBe('NOT_FOUND')
      expect(data.error).not.toContain('Foreign key constraint')
    })

    it('should handle malformed JSON', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/invoices', {
        method: 'POST',
        body: 'invalid json'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('An internal server error occurred')
      expect(data.type).toBe('INTERNAL_ERROR')
    })
  })
})