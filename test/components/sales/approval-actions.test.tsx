import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApprovalActions } from '@/components/sales/approval-actions'
import type { ApprovalRequest } from '@/types/sales'

// Mock next/navigation
const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}))

// Mock useToast
const mockToast = vi.fn()
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}))

// Mock fetch
global.fetch = vi.fn()

const createRequest = (overrides: Partial<ApprovalRequest> = {}): ApprovalRequest => ({
  id: 'req-1',
  organization_id: 'org-1',
  estimate_id: 'est-1',
  requested_by: 'user-1',
  type: 'discount',
  reason: 'Customer loyalty',
  level1_approver: 'approver-1',
  level1_status: 'pending',
  level1_approved_at: null,
  requires_level2: false,
  level2_approver: null,
  level2_status: null,
  level2_approved_at: null,
  notes: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
})

describe('ApprovalActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    })
  })

  it('renders Approve and Reject buttons for pending level 1', () => {
    const request = createRequest({ level1_status: 'pending' })
    render(<ApprovalActions request={request} />)

    expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument()
  })

  it('shows No action needed when request is approved', () => {
    const request = createRequest({ level1_status: 'approved' })
    render(<ApprovalActions request={request} />)

    expect(screen.getByText('No action needed')).toBeInTheDocument()
  })

  it('shows buttons for pending level 2 when level 1 approved', () => {
    const request = createRequest({
      level1_status: 'approved',
      requires_level2: true,
      level2_status: 'pending',
    })
    render(<ApprovalActions request={request} />)

    expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument()
  })

  it('calls API when approve is clicked', async () => {
    const user = userEvent.setup()
    const request = createRequest({ level1_status: 'pending' })
    render(<ApprovalActions request={request} />)

    await user.click(screen.getByRole('button', { name: /approve/i }))

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/approvals/req-1',
      expect.objectContaining({
        method: 'PATCH',
        body: expect.stringContaining('"approved":true'),
      })
    )
  })

  it('shows toast on successful approval', async () => {
    const user = userEvent.setup()
    const request = createRequest({ level1_status: 'pending' })
    render(<ApprovalActions request={request} />)

    await user.click(screen.getByRole('button', { name: /approve/i }))

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Approved',
      })
    )
  })

  it('refreshes router on successful approval', async () => {
    const user = userEvent.setup()
    const request = createRequest({ level1_status: 'pending' })
    render(<ApprovalActions request={request} />)

    await user.click(screen.getByRole('button', { name: /approve/i }))

    expect(mockRefresh).toHaveBeenCalled()
  })

  it('opens reject dialog when reject is clicked', async () => {
    const user = userEvent.setup()
    const request = createRequest({ level1_status: 'pending' })
    render(<ApprovalActions request={request} />)

    await user.click(screen.getByRole('button', { name: /reject/i }))

    expect(screen.getByRole('heading', { name: 'Reject Request' })).toBeInTheDocument()
    expect(screen.getByText('Please provide a reason for rejecting this request.')).toBeInTheDocument()
  })

  it('renders rejection reason textarea in dialog', async () => {
    const user = userEvent.setup()
    const request = createRequest({ level1_status: 'pending' })
    render(<ApprovalActions request={request} />)

    await user.click(screen.getByRole('button', { name: /reject/i }))

    expect(screen.getByLabelText(/rejection reason/i)).toBeInTheDocument()
  })

  it('calls API when reject is confirmed', async () => {
    const user = userEvent.setup()
    const request = createRequest({ level1_status: 'pending' })
    render(<ApprovalActions request={request} />)

    await user.click(screen.getByRole('button', { name: /reject/i }))
    await user.type(screen.getByLabelText(/rejection reason/i), 'Budget constraints')
    await user.click(screen.getByRole('button', { name: /reject request/i }))

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/approvals/req-1',
      expect.objectContaining({
        method: 'PATCH',
        body: expect.stringContaining('"approved":false'),
      })
    )
  })

  it('closes dialog when cancel is clicked', async () => {
    const user = userEvent.setup()
    const request = createRequest({ level1_status: 'pending' })
    render(<ApprovalActions request={request} />)

    await user.click(screen.getByRole('button', { name: /reject/i }))
    expect(screen.getByRole('heading', { name: 'Reject Request' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(screen.queryByRole('heading', { name: 'Reject Request' })).not.toBeInTheDocument()
  })

  it('shows error toast on API failure', async () => {
    const user = userEvent.setup()
    ;(global.fetch as any).mockResolvedValueOnce({ ok: false })
    const request = createRequest({ level1_status: 'pending' })
    render(<ApprovalActions request={request} />)

    await user.click(screen.getByRole('button', { name: /approve/i }))

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Error',
        variant: 'destructive',
      })
    )
  })
})
