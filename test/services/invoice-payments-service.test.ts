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

// InvoicePaymentsService reads the parent invoice through InvoicesService
// (which is NOT mocked here — it hits the shared supabase stub) so that
// the paid-state side-effects (job status bump, reminder cancellation)
// are exercised end-to-end.
describe('InvoicePaymentsService', () => {
  let mockSupabase: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn(),
      rpc: vi.fn(),
    }
    vi.mocked(createClient).mockResolvedValue(mockSupabase)
  })

  describe('recordPayment', () => {
    it('should record payment and log activity', async () => {
      mockSupabase.from = vi.fn((table) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { organization_id: 'org-123' },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'payments') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'pay-1',
                    invoice_id: 'inv-1',
                    amount: 1000,
                  },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'invoices') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'inv-1',
                    invoice_number: 'INV-001',
                    status: 'partial',
                  },
                  error: null,
                }),
              })),
            })),
          }
        }
        return {}
      })

      const payment = await InvoicePaymentsService.recordPayment('inv-1', {
        amount: 1000,
        payment_method: 'credit_card',
      })

      expect(payment.amount).toBe(1000)
      expect(Activity.paid).toHaveBeenCalled()
    })

    it('should update job status when invoice fully paid', async () => {
      let jobUpdateCalled = false

      mockSupabase.from = vi.fn((table) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { organization_id: 'org-123' },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'payments') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'pay-1', amount: 1000 },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'invoices') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'inv-1',
                    invoice_number: 'INV-001',
                    status: 'paid',
                    job_id: 'job-1',
                  },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'jobs') {
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() => {
                jobUpdateCalled = true
                return Promise.resolve({ error: null })
              }),
            })),
          }
        }
        if (table === 'scheduled_reminders') {
          // cancelPaymentReminders: update({status:'cancelled'}).eq().eq().eq()
          const updateChain = { eq: vi.fn(() => updateChain) }
          return {
            update: vi.fn(() => updateChain),
          }
        }
        return {}
      })

      await InvoicePaymentsService.recordPayment('inv-1', {
        amount: 1000,
        payment_method: 'check',
      })

      expect(jobUpdateCalled).toBe(true)
    })
  })
})
