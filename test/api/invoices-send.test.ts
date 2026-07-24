import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/invoices/[id]/send/route'

const mockSupabaseClient = {
  auth: { getUser: vi.fn() },
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

vi.mock('@/lib/services/invoice-delivery-service', () => ({
  InvoiceDeliveryService: {
    send: vi.fn(),
  },
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

import { InvoiceDeliveryService } from '@/lib/services/invoice-delivery-service'
import type { Invoice } from '@/types/invoices'

function buildMockInvoice(overrides: Partial<Invoice>): Invoice {
  return {
    id: 'invoice-123',
    organization_id: 'org-123',
    job_id: null,
    customer_id: 'customer-123',
    location_id: null,
    invoice_number: 'INV-001',
    status: 'draft',
    invoice_date: new Date().toISOString(),
    due_date: new Date().toISOString(),
    subtotal: 1000,
    tax_rate: 0,
    tax_amount: 0,
    discount_amount: 0,
    total: 1000,
    amount_paid: 0,
    balance_due: 1000,
    payment_terms: null,
    notes: null,
    sent_at: null,
    sent_via: null,
    viewed_at: null,
    access_token: null,
    access_token_expires_at: null,
    qb_invoice_id: null,
    qb_synced_at: null,
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  }
}

describe('Invoice Send API', () => {
  const mockProfile = {
    organization_id: 'org-123',
    role: 'admin'
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

  describe('POST /api/invoices/[id]/send', () => {
    it('should send invoice via email', async () => {
      setupAuthenticatedUser()

      const sentInvoice = buildMockInvoice({
        id: 'invoice-123',
        status: 'sent',
        sent_at: '2026-03-01T10:00:00Z',
      })
      vi.mocked(InvoiceDeliveryService.send).mockResolvedValue(sentInvoice)

      const request = new NextRequest('http://localhost:3000/api/invoices/invoice-123/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'customer@example.com',
        }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'invoice-123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(sentInvoice)
      expect(InvoiceDeliveryService.send).toHaveBeenCalledWith('invoice-123', 'email')
    })

    it('should send invoice via sms when requested', async () => {
      setupAuthenticatedUser()

      const sentInvoice = buildMockInvoice({
        id: 'invoice-123',
        status: 'sent',
        sent_via: 'sms',
      })
      vi.mocked(InvoiceDeliveryService.send).mockResolvedValue(sentInvoice)

      const request = new NextRequest('http://localhost:3000/api/invoices/invoice-123/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'sms' }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'invoice-123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(sentInvoice)
      expect(InvoiceDeliveryService.send).toHaveBeenCalledWith('invoice-123', 'sms')
    })

    it('should default to email when method is omitted', async () => {
      setupAuthenticatedUser()
      vi.mocked(InvoiceDeliveryService.send).mockResolvedValue(buildMockInvoice({ id: 'invoice-123', status: 'sent' }))

      const request = new NextRequest('http://localhost:3000/api/invoices/invoice-123/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      await POST(request, { params: Promise.resolve({ id: 'invoice-123' }) })

      expect(InvoiceDeliveryService.send).toHaveBeenCalledWith('invoice-123', 'email')
    })

    it('should send invoice with custom message', async () => {
      setupAuthenticatedUser()

      const sentInvoice = buildMockInvoice({
        id: 'invoice-456',
        status: 'sent',
      })
      vi.mocked(InvoiceDeliveryService.send).mockResolvedValue(sentInvoice)

      const request = new NextRequest('http://localhost:3000/api/invoices/invoice-456/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'customer@example.com',
          message: 'Thank you for your business',
        }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'invoice-456' }) })

      expect(response.status).toBe(200)
    })
  })
})
