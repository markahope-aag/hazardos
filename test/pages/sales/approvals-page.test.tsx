import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock Supabase server
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve({
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: 'user-123' } } }),
    },
  }),
}))

// Mock ApprovalService
vi.mock('@/lib/services/approval-service', () => ({
  ApprovalService: {
    getMyPendingApprovals: () => Promise.resolve([
      {
        id: 'approval-1',
        entity_type: 'estimate',
        requester: { full_name: 'John Doe' },
        amount: 5000,
        level1_status: 'pending',
        requires_level2: false,
        requested_at: '2024-01-15T10:00:00Z',
      },
    ]),
    getRequests: () => Promise.resolve([
      {
        id: 'request-1',
        entity_type: 'estimate',
        requester: { full_name: 'John Doe' },
        amount: 5000,
        final_status: 'pending',
        requested_at: '2024-01-15T10:00:00Z',
      },
      {
        id: 'request-2',
        entity_type: 'discount',
        requester: { full_name: 'Jane Smith' },
        amount: 500,
        final_status: 'approved',
        requested_at: '2024-01-14T10:00:00Z',
      },
    ]),
  },
}))

// Mock ApprovalActions component
vi.mock('@/components/sales/approval-actions', () => ({
  ApprovalActions: () => <div data-testid="approval-actions">Actions</div>,
}))

// Import after mocks
import ApprovalsPage from '@/app/(dashboard)/sales/approvals/page'

describe('ApprovalsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', async () => {
    const page = await ApprovalsPage()
    expect(() => render(page)).not.toThrow()
  })

  it('displays the page title', async () => {
    const page = await ApprovalsPage()
    render(page)

    expect(screen.getByText('Approval Queue')).toBeInTheDocument()
  })

  it('displays the page description', async () => {
    const page = await ApprovalsPage()
    render(page)

    expect(screen.getByText('Review and approve estimates, discounts, and proposals')).toBeInTheDocument()
  })

  it('displays pending count card', async () => {
    const page = await ApprovalsPage()
    render(page)

    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(screen.getByText('Awaiting your review')).toBeInTheDocument()
  })

  it('displays approved count card', async () => {
    const page = await ApprovalsPage()
    render(page)

    expect(screen.getByText('Approved')).toBeInTheDocument()
    expect(screen.getByText('Total approved')).toBeInTheDocument()
  })

  it('displays rejected count card', async () => {
    const page = await ApprovalsPage()
    render(page)

    expect(screen.getByText('Rejected')).toBeInTheDocument()
    expect(screen.getByText('Total rejected')).toBeInTheDocument()
  })

  it('displays pending approvals table', async () => {
    const page = await ApprovalsPage()
    render(page)

    expect(screen.getByText('Pending Approvals')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('displays approval history', async () => {
    const page = await ApprovalsPage()
    render(page)

    expect(screen.getByText('Approval History')).toBeInTheDocument()
  })

  it('displays entity type badges', async () => {
    const page = await ApprovalsPage()
    render(page)

    const estimateBadges = screen.getAllByText('Estimate')
    expect(estimateBadges.length).toBeGreaterThan(0)
  })

  it('renders approval actions for pending items', async () => {
    const page = await ApprovalsPage()
    render(page)

    expect(screen.getByTestId('approval-actions')).toBeInTheDocument()
  })
})
