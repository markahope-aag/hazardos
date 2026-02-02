import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SegmentList } from '@/components/customers/segment-list'
import type { CustomerSegment } from '@/types/integrations'

// Mock next/navigation
const mockPush = vi.fn()
const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}))

// Mock toast
const mockToast = vi.fn()
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}))

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

const mockSegments: CustomerSegment[] = [
  {
    id: '1',
    organization_id: 'org-1',
    name: 'High Value Customers',
    description: 'Customers with high lifetime value',
    segment_type: 'dynamic',
    criteria: {},
    member_count: 150,
    last_calculated_at: new Date().toISOString(),
    mailchimp_synced_at: new Date().toISOString(),
    hubspot_synced_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    organization_id: 'org-1',
    name: 'New Customers',
    description: null,
    segment_type: 'static',
    criteria: {},
    member_count: 50,
    last_calculated_at: null,
    mailchimp_synced_at: null,
    hubspot_synced_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

describe('SegmentList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ member_count: 100 }),
    })
  })

  it('renders empty state when no segments', () => {
    render(<SegmentList segments={[]} />)

    expect(screen.getByText('No segments yet')).toBeInTheDocument()
    expect(screen.getByText(/create your first segment/i)).toBeInTheDocument()
  })

  it('renders segment count header', () => {
    render(<SegmentList segments={mockSegments} />)

    expect(screen.getByText('All Segments')).toBeInTheDocument()
    expect(screen.getByText('2 segments created')).toBeInTheDocument()
  })

  it('renders singular segment count', () => {
    render(<SegmentList segments={[mockSegments[0]]} />)

    expect(screen.getByText('1 segment created')).toBeInTheDocument()
  })

  it('renders table headers', () => {
    render(<SegmentList segments={mockSegments} />)

    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Type')).toBeInTheDocument()
    expect(screen.getByText('Members')).toBeInTheDocument()
    expect(screen.getByText('Last Calculated')).toBeInTheDocument()
    expect(screen.getByText('Synced To')).toBeInTheDocument()
  })

  it('renders segment names', () => {
    render(<SegmentList segments={mockSegments} />)

    expect(screen.getByText('High Value Customers')).toBeInTheDocument()
    expect(screen.getByText('New Customers')).toBeInTheDocument()
  })

  it('renders segment descriptions', () => {
    render(<SegmentList segments={mockSegments} />)

    expect(screen.getByText('Customers with high lifetime value')).toBeInTheDocument()
  })

  it('renders segment type badges', () => {
    render(<SegmentList segments={mockSegments} />)

    expect(screen.getByText('dynamic')).toBeInTheDocument()
    expect(screen.getByText('static')).toBeInTheDocument()
  })

  it('renders member counts', () => {
    render(<SegmentList segments={mockSegments} />)

    expect(screen.getByText('150')).toBeInTheDocument()
    expect(screen.getByText('50')).toBeInTheDocument()
  })

  it('shows Never when segment not calculated', () => {
    render(<SegmentList segments={mockSegments} />)

    expect(screen.getByText('Never')).toBeInTheDocument()
  })

  it('shows MC badge for Mailchimp synced segments', () => {
    render(<SegmentList segments={mockSegments} />)

    expect(screen.getByText('MC')).toBeInTheDocument()
  })

  it('shows HS badge for HubSpot synced segments', () => {
    render(<SegmentList segments={mockSegments} />)

    expect(screen.getByText('HS')).toBeInTheDocument()
  })

  it('shows None for unsynced segments', () => {
    const unsyncedSegment = {
      ...mockSegments[0],
      mailchimp_synced_at: null,
      hubspot_synced_at: null,
    }
    render(<SegmentList segments={[unsyncedSegment]} />)

    expect(screen.getByText('None')).toBeInTheDocument()
  })

  it('opens dropdown menu on click', async () => {
    const user = userEvent.setup()
    render(<SegmentList segments={mockSegments} />)

    const moreButtons = screen.getAllByRole('button')
    await user.click(moreButtons[0])

    expect(screen.getByText('Edit')).toBeInTheDocument()
    expect(screen.getByText('Recalculate')).toBeInTheDocument()
    expect(screen.getByText('Sync to Mailchimp')).toBeInTheDocument()
    expect(screen.getByText('Sync to HubSpot')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })

  it('navigates to edit page on Edit click', async () => {
    const user = userEvent.setup()
    render(<SegmentList segments={mockSegments} />)

    const moreButtons = screen.getAllByRole('button')
    await user.click(moreButtons[0])
    await user.click(screen.getByText('Edit'))

    expect(mockPush).toHaveBeenCalledWith('/customers/segments/1')
  })

  it('calls calculate API on Recalculate click', async () => {
    const user = userEvent.setup()
    render(<SegmentList segments={mockSegments} />)

    const moreButtons = screen.getAllByRole('button')
    await user.click(moreButtons[0])
    await user.click(screen.getByText('Recalculate'))

    expect(mockFetch).toHaveBeenCalledWith('/api/segments/1/calculate', {
      method: 'POST',
    })
  })

  it('shows success toast after calculation', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ member_count: 200 }),
    })

    render(<SegmentList segments={mockSegments} />)

    const moreButtons = screen.getAllByRole('button')
    await user.click(moreButtons[0])
    await user.click(screen.getByText('Recalculate'))

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Calculation Complete',
      description: 'Segment has 200 members',
    })
  })

  it('calls Mailchimp sync API', async () => {
    const user = userEvent.setup()
    render(<SegmentList segments={mockSegments} />)

    const moreButtons = screen.getAllByRole('button')
    await user.click(moreButtons[0])
    await user.click(screen.getByText('Sync to Mailchimp'))

    expect(mockFetch).toHaveBeenCalledWith('/api/segments/1/sync/mailchimp', {
      method: 'POST',
    })
  })

  it('calls HubSpot sync API', async () => {
    const user = userEvent.setup()
    render(<SegmentList segments={mockSegments} />)

    const moreButtons = screen.getAllByRole('button')
    await user.click(moreButtons[0])
    await user.click(screen.getByText('Sync to HubSpot'))

    expect(mockFetch).toHaveBeenCalledWith('/api/segments/1/sync/hubspot', {
      method: 'POST',
    })
  })
})
