import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/invoices/from-job/route'

const mockSupabaseClient = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn()
      }))
    }))
  }))
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}))

vi.mock('@/lib/services/invoices-service', () => ({
  InvoicesService: {
    createFromJob: vi.fn(),
  },
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

import { InvoicesService } from '@/lib/services/invoices-service'

describe('Invoices From Job API', () => {
  const mockProfile = {
    organization_id: 'org-123',
    role: 'user'
  }

  const setupAuthenticatedUser = () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-123', email: 'user@example.com' } },
      error: null,
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

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/invoices/from-job', () => {
    it('should create invoice from completed job', async () => {
      setupAuthenticatedUser()

      const newInvoice = {
        id: 'invoice-123',
        job_id: 'job-123',
        invoice_number: 'INV-001',
        status: 'draft',
        total: 5000.00,
      }
      vi.mocked(InvoicesService.createFromJob).mockResolvedValue(newInvoice)

      const request = new NextRequest('http://localhost:3000/api/invoices/from-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: 'job-123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toEqual(newInvoice)
      expect(InvoicesService.createFromJob).toHaveBeenCalledWith(
        expect.objectContaining({
          job_id: 'job-123',
        })
      )
    })

    it('should create invoice with custom due date', async () => {
      setupAuthenticatedUser()

      const invoice = {
        id: 'invoice-456',
        job_id: 'job-456',
        due_date: '2026-04-01',
      }
      vi.mocked(InvoicesService.createFromJob).mockResolvedValue(invoice)

      const request = new NextRequest('http://localhost:3000/api/invoices/from-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: 'job-456',
          due_date: '2026-04-01',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.due_date).toBe('2026-04-01')
    })

    it('should create invoice with payment terms', async () => {
      setupAuthenticatedUser()

      const invoice = {
        id: 'invoice-789',
        job_id: 'job-789',
        payment_terms: 'NET_30',
      }
      vi.mocked(InvoicesService.createFromJob).mockResolvedValue(invoice)

      const request = new NextRequest('http://localhost:3000/api/invoices/from-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: 'job-789',
          payment_terms: 'NET_30',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.payment_terms).toBe('NET_30')
    })
  })
})
