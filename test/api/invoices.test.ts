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

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
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
import { InvoicesService } from '@/lib/services/invoices-service'

const mockProfile = {
  organization_id: 'org-123',
  role: 'user'
}

const setupAuthenticatedUser = () => {
  vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
    data: { user: { id: 'user-1', email: 'test@example.com' } },
    error: null
  })

  vi.mocked(mockSupabaseClient.from).mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: mockProfile,
          error: null
        })
      })
    })
  } as any)
}

describe('Invoices API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/invoices', () => {
    it('should return invoices for authenticated user', async () => {
      setupAuthenticatedUser()

      const mockInvoices = [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          invoice_number: 'INV-001',
          job_id: '550e8400-e29b-41d4-a716-446655440010',
          customer_id: '550e8400-e29b-41d4-a716-446655440020',
          status: 'draft',
          subtotal: 1000.00,
          tax_amount: 80.00,
          total_amount: 1080.00,
          issue_date: '2026-01-31',
          due_date: '2026-02-15',
          created_at: '2026-01-31T10:00:00Z'
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          invoice_number: 'INV-002',
          job_id: '550e8400-e29b-41d4-a716-446655440011',
          customer_id: '550e8400-e29b-41d4-a716-446655440021',
          status: 'sent',
          subtotal: 1500.00,
          tax_amount: 120.00,
          total_amount: 1620.00,
          issue_date: '2026-01-30',
          due_date: '2026-02-14',
          created_at: '2026-01-30T10:00:00Z'
        }
      ]

      vi.mocked(InvoicesService.list).mockResolvedValue(mockInvoices)

      const request = new NextRequest('http://localhost:3000/api/invoices')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.invoices).toEqual(mockInvoices)
      expect(InvoicesService.list).toHaveBeenCalled()
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

    it('should handle query parameters for filtering', async () => {
      setupAuthenticatedUser()

      vi.mocked(InvoicesService.list).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/invoices?status=sent&customer_id=550e8400-e29b-41d4-a716-446655440020')
      await GET(request)

      // Verify filtering was applied via InvoicesService
      expect(InvoicesService.list).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'sent',
          customer_id: '550e8400-e29b-41d4-a716-446655440020'
        })
      )
    })

    it('should handle service errors securely', async () => {
      setupAuthenticatedUser()

      vi.mocked(InvoicesService.list).mockRejectedValue(new Error('Database connection failed'))

      const request = new NextRequest('http://localhost:3000/api/invoices')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('An internal server error occurred')
      expect(data.type).toBe('INTERNAL_ERROR')
      expect(data.error).not.toContain('Database connection failed')
    })
  })

  describe('POST /api/invoices', () => {
    const validInvoiceData = {
      customer_id: '550e8400-e29b-41d4-a716-446655440020',
      due_date: '2026-02-15',
      notes: 'Test invoice'
    }

    it('should create a new invoice for authenticated user', async () => {
      setupAuthenticatedUser()

      const mockCreatedInvoice = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        invoice_number: 'INV-001',
        ...validInvoiceData,
        status: 'draft',
        organization_id: 'org-123',
        created_at: '2026-01-31T10:00:00Z'
      }

      vi.mocked(InvoicesService.create).mockResolvedValue(mockCreatedInvoice)

      const request = new NextRequest('http://localhost:3000/api/invoices', {
        method: 'POST',
        body: JSON.stringify(validInvoiceData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toEqual(mockCreatedInvoice)
      expect(InvoicesService.create).toHaveBeenCalled()
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

    it('should validate customer_id field is required', async () => {
      setupAuthenticatedUser()

      const invalidData = {
        due_date: '2026-02-15'
      }

      const request = new NextRequest('http://localhost:3000/api/invoices', {
        method: 'POST',
        body: JSON.stringify(invalidData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.type).toBe('VALIDATION_ERROR')
      expect(data.field).toBe('customer_id')
    })

    it('should validate customer_id must be a valid UUID', async () => {
      setupAuthenticatedUser()

      const invalidData = {
        customer_id: 'invalid-customer-id',
        due_date: '2026-02-15'
      }

      const request = new NextRequest('http://localhost:3000/api/invoices', {
        method: 'POST',
        body: JSON.stringify(invalidData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.type).toBe('VALIDATION_ERROR')
      expect(data.error).toContain('Invalid customer ID')
    })

    it('should validate due_date field is required', async () => {
      setupAuthenticatedUser()

      const invalidData = {
        customer_id: '550e8400-e29b-41d4-a716-446655440020'
      }

      const request = new NextRequest('http://localhost:3000/api/invoices', {
        method: 'POST',
        body: JSON.stringify(invalidData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.type).toBe('VALIDATION_ERROR')
      expect(data.field).toBe('due_date')
    })

    it('should validate due_date format', async () => {
      setupAuthenticatedUser()

      const invalidData = {
        customer_id: '550e8400-e29b-41d4-a716-446655440020',
        due_date: '02-15-2026' // Invalid format
      }

      const request = new NextRequest('http://localhost:3000/api/invoices', {
        method: 'POST',
        body: JSON.stringify(invalidData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.type).toBe('VALIDATION_ERROR')
      expect(data.error).toContain('Invalid date format')
    })

    it('should handle service errors securely', async () => {
      setupAuthenticatedUser()

      vi.mocked(InvoicesService.create).mockRejectedValue(new Error('Foreign key constraint violation'))

      const request = new NextRequest('http://localhost:3000/api/invoices', {
        method: 'POST',
        body: JSON.stringify(validInvoiceData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('An internal server error occurred')
      expect(data.type).toBe('INTERNAL_ERROR')
      expect(data.error).not.toContain('Foreign key constraint')
    })

    it('should handle malformed JSON', async () => {
      setupAuthenticatedUser()

      const request = new NextRequest('http://localhost:3000/api/invoices', {
        method: 'POST',
        body: 'invalid json'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid JSON body')
      expect(data.type).toBe('BAD_REQUEST')
    })
  })
})
