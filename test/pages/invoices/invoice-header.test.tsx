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

let mockAuthState = { canAccessTenantAdmin: true }
vi.mock('@/lib/hooks/use-multi-tenant-auth', () => ({
  useMultiTenantAuth: () => mockAuthState,
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

const clipboardWriteMock = vi.fn().mockResolvedValue(undefined)

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
    mockAuthState = { canAccessTenantAdmin: true }
    clipboardWriteMock.mockResolvedValue(undefined)
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

describe('InvoiceHeader Send via SMS (I7)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('disables Send via SMS when the customer has not opted in', async () => {
    const user = userEvent.setup()
    render(
      <InvoiceHeader
        invoice={{
          ...baseInvoice,
          customer: { ...baseInvoice.customer!, phone: '5551234567', sms_opt_in: false },
        }}
      />
    )

    await user.click(screen.getByRole('button', { name: /more invoice actions/i }))

    expect(screen.getByRole('menuitem', { name: /send via sms/i })).toHaveAttribute('aria-disabled', 'true')
  })

  it('disables Send via SMS when the customer has no phone on file', async () => {
    const user = userEvent.setup()
    render(
      <InvoiceHeader
        invoice={{
          ...baseInvoice,
          customer: { ...baseInvoice.customer!, phone: null, sms_opt_in: true },
        }}
      />
    )

    await user.click(screen.getByRole('button', { name: /more invoice actions/i }))

    expect(screen.getByRole('menuitem', { name: /send via sms/i })).toHaveAttribute('aria-disabled', 'true')
  })

  it('sends via SMS when the customer has opted in and has a phone', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
    const user = userEvent.setup()
    render(
      <InvoiceHeader
        invoice={{
          ...baseInvoice,
          customer: { ...baseInvoice.customer!, phone: '5551234567', sms_opt_in: true },
        }}
      />
    )

    await user.click(screen.getByRole('button', { name: /more invoice actions/i }))
    const smsItem = screen.getByRole('menuitem', { name: /send via sms/i })
    expect(smsItem).not.toHaveAttribute('aria-disabled', 'true')

    await user.click(smsItem)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/invoices/inv-1/send',
        expect.objectContaining({ body: JSON.stringify({ method: 'sms' }) })
      )
    })
  })
})

describe('InvoiceHeader Copy Customer Link (I13)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthState = { canAccessTenantAdmin: true }
    clipboardWriteMock.mockResolvedValue(undefined)
  })

  // userEvent.setup() re-syncs the global `navigator` binding to jsdom's
  // window (and attaches its own harmless clipboard stub in the process),
  // which clobbers vi.stubGlobal('navigator', ...) if it runs first. Stub
  // AFTER setup() in every test here, not in beforeEach.
  it('hides Copy Customer Link for a non-admin viewer', async () => {
    mockAuthState = { canAccessTenantAdmin: false }
    const user = userEvent.setup()
    vi.stubGlobal('navigator', { clipboard: { writeText: clipboardWriteMock } })
    render(<InvoiceHeader invoice={baseInvoice} />)

    await user.click(screen.getByRole('button', { name: /more invoice actions/i }))

    expect(screen.queryByRole('menuitem', { name: /copy customer link/i })).not.toBeInTheDocument()
  })

  it('generates the link, copies it, and confirms via toast', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ url: 'https://app.test/portal/invoice/abc123' }),
    })

    const user = userEvent.setup()
    vi.stubGlobal('navigator', { clipboard: { writeText: clipboardWriteMock } })
    render(<InvoiceHeader invoice={baseInvoice} />)

    await user.click(screen.getByRole('button', { name: /more invoice actions/i }))
    await user.click(screen.getByRole('menuitem', { name: /copy customer link/i }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/invoices/inv-1/portal-link', { method: 'POST' })
      expect(clipboardWriteMock).toHaveBeenCalledWith('https://app.test/portal/invoice/abc123')
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Link copied' })
      )
    })
  })

  it('surfaces the real server error instead of a generic message', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ error: 'You do not have permission to access this resource' }),
    })

    const user = userEvent.setup()
    vi.stubGlobal('navigator', { clipboard: { writeText: clipboardWriteMock } })
    render(<InvoiceHeader invoice={baseInvoice} />)

    await user.click(screen.getByRole('button', { name: /more invoice actions/i }))
    await user.click(screen.getByRole('menuitem', { name: /copy customer link/i }))

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Error',
          description: 'You do not have permission to access this resource',
          variant: 'destructive',
        })
      )
    })
    expect(clipboardWriteMock).not.toHaveBeenCalled()
  })
})
