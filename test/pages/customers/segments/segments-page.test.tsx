import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock Supabase server
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve({
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: 'user-123' } } }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: { organization_id: 'org-123' } }),
        }),
      }),
    }),
  }),
}))

// Mock SegmentationService
vi.mock('@/lib/services/segmentation-service', () => ({
  SegmentationService: {
    list: () => Promise.resolve([
      { id: 'seg-1', name: 'VIP Customers', customer_count: 25 },
      { id: 'seg-2', name: 'Leads', customer_count: 50 },
    ]),
  },
}))

// Mock SegmentList component
vi.mock('@/components/customers/segment-list', () => ({
  SegmentList: ({ segments }: { segments: unknown[] }) => (
    <div data-testid="segment-list">Segments: {segments?.length || 0}</div>
  ),
}))

// Import after mocks
import SegmentsPage from '@/app/(dashboard)/customers/segments/page'

describe('SegmentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', async () => {
    const page = await SegmentsPage()
    expect(() => render(page)).not.toThrow()
  })

  it('displays the page title', async () => {
    const page = await SegmentsPage()
    render(page)

    expect(screen.getByText('Customer Segments')).toBeInTheDocument()
  })

  it('displays the page description', async () => {
    const page = await SegmentsPage()
    render(page)

    expect(screen.getByText(/targeted marketing/i)).toBeInTheDocument()
  })

  it('displays create segment button', async () => {
    const page = await SegmentsPage()
    render(page)

    expect(screen.getByRole('link', { name: /new segment/i })).toBeInTheDocument()
  })

  it('renders segment list', async () => {
    const page = await SegmentsPage()
    render(page)

    expect(screen.getByTestId('segment-list')).toBeInTheDocument()
  })

  it('passes segments to list component', async () => {
    const page = await SegmentsPage()
    render(page)

    expect(screen.getByText(/Segments: 2/)).toBeInTheDocument()
  })

  it('links to new segment page', async () => {
    const page = await SegmentsPage()
    render(page)

    const link = screen.getByRole('link', { name: /new segment/i })
    expect(link).toHaveAttribute('href', '/customers/segments/new')
  })
})
