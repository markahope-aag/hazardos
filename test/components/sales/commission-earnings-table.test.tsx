import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CommissionEarningsTable } from '@/components/sales/commission-earnings-table'
import type { CommissionEarning } from '@/types/sales'

/**
 * CO4: the commissions page was read-only. This table adds the missing
 * approve/reject/mark-paid workflow, gated to admins.
 */

const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: mockRefresh }),
}))

const toastMock = vi.fn()
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

function earning(overrides: Partial<CommissionEarning> = {}): CommissionEarning {
  return {
    id: 'earn-1',
    organization_id: 'org-1',
    user_id: 'user-1',
    plan_id: 'plan-1',
    opportunity_id: null,
    job_id: null,
    invoice_id: null,
    base_amount: 1000,
    commission_rate: 5,
    commission_amount: 50,
    status: 'pending',
    approved_by: null,
    approved_at: null,
    rejected_by: null,
    rejected_at: null,
    rejection_reason: null,
    paid_at: null,
    earning_date: '2026-07-01',
    pay_period: null,
    created_at: '2026-07-01T00:00:00Z',
    user: { id: 'user-1', full_name: 'Rep One' },
    plan: undefined,
    ...overrides,
  }
}

describe('CommissionEarningsTable (CO4)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('hides action controls for non-admins', () => {
    render(<CommissionEarningsTable earnings={[earning()]} canManage={false} />)

    expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /reject/i })).not.toBeInTheDocument()
  })

  it('approves a pending earning via PATCH', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
    const user = userEvent.setup()
    render(<CommissionEarningsTable earnings={[earning()]} canManage />)

    await user.click(screen.getByRole('button', { name: /approve/i }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/commissions/earn-1',
        expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ action: 'approve' }) }),
      )
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it('rejects with a reason entered in the dialog', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
    const user = userEvent.setup()
    render(<CommissionEarningsTable earnings={[earning()]} canManage />)

    await user.click(screen.getByRole('button', { name: /reject/i }))
    await user.type(screen.getByPlaceholderText(/reason/i), 'Deal fell through')
    await user.click(screen.getByRole('button', { name: /reject commission/i }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/commissions/earn-1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ action: 'reject', reason: 'Deal fell through' }),
        }),
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
    render(<CommissionEarningsTable earnings={[earning()]} canManage />)

    await user.click(screen.getByRole('button', { name: /approve/i }))

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Error',
          description: 'You do not have permission to access this resource',
          variant: 'destructive',
        }),
      )
    })
  })

  it('offers Mark Paid for approved earnings only', () => {
    render(
      <CommissionEarningsTable
        earnings={[earning({ id: 'earn-2', status: 'approved' })]}
        canManage
      />,
    )

    expect(screen.getByRole('button', { name: /mark paid/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument()
  })
})
