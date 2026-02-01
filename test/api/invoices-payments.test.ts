import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST, DELETE } from '@/app/api/invoices/[id]/payments/route'
import { InvoicesService } from '@/lib/services/invoices-service'

const mockSupabaseClient = {
  auth: { getUser: vi.fn() },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({ single: vi.fn() }))
    }))
  }))
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}))

vi.mock('@/lib/services/invoices-service', () => ({
  InvoicesService: {
    recordPayment: vi.fn(),
    deletePayment: vi.fn()
  }
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

describe('Invoice Payments API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockProfile = {
    organization_id: 'org-123',
    role: 'user'
  }

  describe('POST /api/invoices/[id]/payments', () => {
    it('should record payment for invoice', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'user@example.com' } },
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

      const mockPayment = {
        id: 'payment-1',
        invoice_id: 'invoice-123',
        amount: 1000,
        payment_date: '2026-02-01',
        payment_method: 'credit_card'
      }

      vi.mocked(InvoicesService.recordPayment).mockResolvedValue(mockPayment)

      const paymentData = {
        amount: 1000,
        payment_date: '2026-02-01',
        payment_method: 'credit_card',
        reference_number: 'REF-123'
      }

      const request = new NextRequest('http://localhost:3000/api/invoices/invoice-123/payments', {
        method: 'POST',
        body: JSON.stringify(paymentData)
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'invoice-123' }) })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toEqual(mockPayment)
    })
  })

  describe('DELETE /api/invoices/[id]/payments', () => {
    it('should delete payment', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'user@example.com' } },
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

      vi.mocked(InvoicesService.deletePayment).mockResolvedValue(undefined)

      const request = new NextRequest('http://localhost:3000/api/invoices/invoice-123/payments?payment_id=550e8400-e29b-41d4-a716-446655440000', {
        method: 'DELETE'
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: 'invoice-123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ success: true })
    })
  })
})
