import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Invoice } from '@/types/invoices'
import { InvoiceHeader } from '@/app/(dashboard)/invoices/[id]/invoice-header'

/**
 * I6: clicking Send Invoice always showed the generic "Failed to send
 * invoice" regardless of the actual server error, because the handler's
 * catch block discarded it. This made every failure in the send pipeline
 * (including the composite-FK embed-hint bug already fixed for
 * loadUserAttachments) look identical and undiagnosable from the UI.
 */

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

const toastMock = vi.fn()
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

const baseInvoice: Invoice = {
  id: 'inv-1',
  organization_id: 'org-1',
  job_id: null,
  customer_id: 'cust-1',
  location_id: null,
  invoice_number: 'INV-001',
  status: 'draft',
  invoice_date: '2026-07-01',
  due_date: '2026-07-31',
  subtotal: 100,
  tax_rate: 0,
  tax_amount: 0,
  discount_amount: 0,
  total: 100,
  amount_paid: 0,
  balance_due: 100,
  payment_terms: 'Net 30',
  notes: null,
  sent_at: null,
  sent_via: null,
  viewed_at: null,
  qb_invoice_id: null,
  qb_synced_at: null,
  created_by: null,
  created_at: '2026-07-01T00:00:00.000Z',
  updated_at: '2026-07-01T00:00:00.000Z',
  customer: { id: 'cust-1', name: 'Test Customer', company_name: null, email: 'test@example.com', phone: null, address_line1: null, city: null, state: null, zip: null },
}

describe('InvoiceHeader send action (I6)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('surfaces the real server error instead of a generic message', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Failed to send invoice email', type: 'BAD_REQUEST' }),
    })

    const user = userEvent.setup()
    render(<InvoiceHeader invoice={baseInvoice} />)

    await user.click(screen.getByRole('button', { name: /send invoice/i }))

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Error',
          description: 'Failed to send invoice email',
          variant: 'destructive',
        })
      )
    })
  })

  it('shows a confirmation toast on success', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })

    const user = userEvent.setup()
    render(<InvoiceHeader invoice={baseInvoice} />)

    await user.click(screen.getByRole('button', { name: /send invoice/i }))

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Invoice sent' })
      )
    })
  })
})
