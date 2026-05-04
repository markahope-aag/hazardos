import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import WorkOrdersPage from '@/app/(dashboard)/work-orders/page'

const toastFn = vi.fn()
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: toastFn }),
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

describe('WorkOrdersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    toastFn.mockClear()
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ work_orders: [] }),
    })
  })

  it('renders title and empty state after load', async () => {
    render(<WorkOrdersPage />)
    expect(screen.getByRole('heading', { name: 'Work Orders' })).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('No work orders yet')).toBeInTheDocument()
    })
    expect(mockFetch).toHaveBeenCalledWith('/api/work-orders')
  })

  it('links to jobs for generation', async () => {
    render(<WorkOrdersPage />)
    await waitFor(() => expect(screen.getByText('No work orders yet')).toBeInTheDocument())
    expect(screen.getByRole('link', { name: /generate from a job/i })).toHaveAttribute('href', '/jobs')
    expect(screen.getByRole('link', { name: /go to jobs/i })).toHaveAttribute('href', '/jobs')
  })

  it('toasts when list fetch fails', async () => {
    mockFetch.mockResolvedValue({ ok: false, json: () => Promise.resolve({}) })
    render(<WorkOrdersPage />)
    await waitFor(() => {
      expect(toastFn).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Could not load work orders',
          variant: 'destructive',
        }),
      )
    })
  })
})
