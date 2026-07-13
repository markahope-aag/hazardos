import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CommissionPeriods, type CommissionPeriod } from '@/components/sales/commission-periods'

/**
 * CO6: closing a pay period locks its earnings against edits. This UI lists
 * periods and lets admins close/reopen them.
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

const openPeriod: CommissionPeriod = {
  period: '2026-07',
  status: 'open',
  earning_count: 3,
  total_commission: 1500,
  closed_at: null,
}
const closedPeriod: CommissionPeriod = {
  period: '2026-06',
  status: 'closed',
  earning_count: 5,
  total_commission: 2500,
  closed_at: '2026-07-01T00:00:00Z',
}

describe('CommissionPeriods (CO6)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('hides close/reopen controls for non-admins', () => {
    render(<CommissionPeriods periods={[openPeriod]} canManage={false} />)
    expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument()
  })

  it('closes an open period', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ success: true }) })
    const user = userEvent.setup()
    render(<CommissionPeriods periods={[openPeriod]} canManage />)

    await user.click(screen.getByRole('button', { name: /^close$/i }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/commissions/periods',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ period: '2026-07', status: 'closed' }),
        }),
      )
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it('reopens a closed period', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ success: true }) })
    const user = userEvent.setup()
    render(<CommissionPeriods periods={[closedPeriod]} canManage />)

    await user.click(screen.getByRole('button', { name: /reopen/i }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/commissions/periods',
        expect.objectContaining({ body: JSON.stringify({ period: '2026-06', status: 'open' }) }),
      )
    })
  })

  it('renders the human-readable month label', () => {
    render(<CommissionPeriods periods={[openPeriod]} canManage={false} />)
    expect(screen.getByText('July 2026')).toBeInTheDocument()
  })
})
