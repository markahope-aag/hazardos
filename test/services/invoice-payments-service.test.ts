import { describe, it, expect, vi, beforeEach } from 'vitest'
import { InvoicePaymentsService } from '@/lib/services/invoice-payments-service'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/services/activity-service', () => ({
  Activity: {
    created: vi.fn(),
    sent: vi.fn(),
    statusChanged: vi.fn(),
    paid: vi.fn(),
  },
}))

import { createClient } from '@/lib/supabase/server'
import { Activity } from '@/lib/services/activity-service'

// recordPayment now performs the payment insert and its paid-state side
// effects (job status -> paid, reminder cancellation) inside a single
// transactional RPC (record_invoice_payment). The DB-side effects are covered
// by SQL review + a live-DB probe; these unit tests cover the service surface:
// that it calls the RPC with the right args, returns the payment, logs
// activity, and surfaces DB errors.
describe('InvoicePaymentsService', () => {
  let mockSupabase: any

  // getById (for the activity-log invoice number) reads from('invoices').
  const stubInvoiceRead = (invoice: Record<string, unknown>) =>
    vi.fn((table: string) => {
      if (table === 'invoices') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: invoice, error: null }),
            })),
          })),
        }
      }
      return {}
    })

  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn(() => ({})),
      rpc: vi.fn(),
    }
    vi.mocked(createClient).mockResolvedValue(mockSupabase)
  })

  describe('recordPayment', () => {
    it('records the payment through the transactional RPC and logs activity', async () => {
      mockSupabase.rpc = vi.fn().mockResolvedValue({
        data: { id: 'pay-1', invoice_id: 'inv-1', amount: 1000 },
        error: null,
      })
      mockSupabase.from = stubInvoiceRead({
        id: 'inv-1',
        invoice_number: 'INV-001',
        status: 'paid',
      })

      const payment = await InvoicePaymentsService.recordPayment('inv-1', {
        amount: 1000,
        payment_method: 'credit_card',
      })

      expect(payment.amount).toBe(1000)
      expect(Activity.paid).toHaveBeenCalledWith('invoice', 'inv-1', 'INV-001', 1000)
    })

    it('passes the payment fields to the record_invoice_payment RPC', async () => {
      mockSupabase.rpc = vi.fn().mockResolvedValue({
        data: { id: 'pay-1', amount: 1000 },
        error: null,
      })
      mockSupabase.from = stubInvoiceRead({ id: 'inv-1', invoice_number: 'INV-001' })

      await InvoicePaymentsService.recordPayment('inv-1', {
        amount: 1000,
        payment_method: 'check',
        reference_number: 'CHK-42',
      })

      expect(mockSupabase.rpc).toHaveBeenCalledTimes(1)
      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'record_invoice_payment',
        expect.objectContaining({
          p_invoice_id: 'inv-1',
          p_amount: 1000,
          p_payment_method: 'check',
          p_reference_number: 'CHK-42',
          p_created_by: 'user-1',
        }),
      )
    })

    it('surfaces a DB error from the RPC without logging activity', async () => {
      mockSupabase.rpc = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Invoice not found', code: 'P0002' },
      })

      await expect(
        InvoicePaymentsService.recordPayment('missing', { amount: 500 }),
      ).rejects.toThrow()
      expect(Activity.paid).not.toHaveBeenCalled()
    })
  })
})
