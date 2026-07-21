import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Invoice } from '@/types/invoices'
import { InvoicePayments } from '@/app/(dashboard)/invoices/[id]/invoice-payments'

/**
 * I9: recording a manual payment failed with a generic "Failed to record
 * payment" regardless of the actual cause. Two confirmed issues:
 *   1. The record_invoice_payment RPC itself works fine (verified live,
 *      even as an authenticated admin) - but the Record Payment button had
 *      no role gate, same gap as I4/I3, so a non-admin could fill out the
 *      whole dialog and only discover the 403 on submit, indistinguishable
 *      from a real failure because the error was discarded.
 *   2. invoice-header.tsx had a *second*, completely dead "Record Payment"
 *      button linking to /invoices/[id]/record-payment, a page that does
 *      not exist - removed since this component's dialog is the real one.
 */

// next/navigation comes from test/setup.ts — a local vi.mock replaces the
// module wholesale instead of extending it, which drops useSearchParams.

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

const baseInvoice = {
  id: 'inv-1',
  balance_due: 100,
  status: 'sent',
} as Invoice

describe('InvoicePayments (I9)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthState = { canAccessTenantAdmin: true }
  })

  it('hides Record Payment for a non-admin viewer', () => {
    mockAuthState = { canAccessTenantAdmin: false }
    render(<InvoicePayments invoice={baseInvoice} payments={[]} />)

    expect(screen.queryByRole('button', { name: /record payment/i })).not.toBeInTheDocument()
  })

  it('shows Record Payment for an admin viewer', () => {
    render(<InvoicePayments invoice={baseInvoice} payments={[]} />)

    expect(screen.getByRole('button', { name: /record payment/i })).toBeInTheDocument()
  })

  it('surfaces the real server error instead of a generic message', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ error: 'You do not have permission to access this resource', type: 'FORBIDDEN' }),
    })

    const user = userEvent.setup()
    render(<InvoicePayments invoice={baseInvoice} payments={[]} />)

    await user.click(screen.getByRole('button', { name: /record payment/i }))
    // Dialog opens with the "Record Payment" submit button — grab the last one.
    const submitButtons = screen.getAllByRole('button', { name: /record payment/i })
    await user.click(submitButtons[submitButtons.length - 1])

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Error',
          description: 'You do not have permission to access this resource',
          variant: 'destructive',
        })
      )
    })
  })
})
