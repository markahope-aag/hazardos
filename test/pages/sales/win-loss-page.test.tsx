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

// Mock PipelineService
vi.mock('@/lib/services/pipeline-service', () => ({
  PipelineService: {
    getWonOpportunities: () => Promise.resolve([
      {
        id: 'opp-1',
        name: 'Won Deal 1',
        customer: { company_name: 'Acme Corp' },
        owner: { full_name: 'John Doe' },
        estimated_value: 10000,
        actual_close_date: '2024-01-15',
      },
      {
        id: 'opp-2',
        name: 'Won Deal 2',
        customer: { first_name: 'Jane', last_name: 'Smith' },
        owner: { full_name: 'Jane Smith' },
        estimated_value: 15000,
        actual_close_date: '2024-01-14',
      },
    ]),
    getLostOpportunities: () => Promise.resolve([
      {
        id: 'opp-3',
        name: 'Lost Deal 1',
        customer: { company_name: 'Tech Corp' },
        loss_reason: 'Price',
        estimated_value: 5000,
        actual_close_date: '2024-01-13',
      },
    ]),
    getLossReasonStats: () => Promise.resolve([
      { reason: 'Price', count: 5 },
      { reason: 'Competition', count: 3 },
    ]),
  },
}))

// Import after mocks
import WinLossPage from '@/app/(dashboard)/sales/win-loss/page'

describe('WinLossPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', async () => {
    const page = await WinLossPage()
    expect(() => render(page)).not.toThrow()
  })

  it('displays the page title', async () => {
    const page = await WinLossPage()
    render(page)

    expect(screen.getByText('Win/Loss Analysis')).toBeInTheDocument()
  })

  it('displays the page description', async () => {
    const page = await WinLossPage()
    render(page)

    expect(screen.getByText(/track won and lost opportunities/i)).toBeInTheDocument()
  })

  it('displays won deals count', async () => {
    const page = await WinLossPage()
    render(page)

    expect(screen.getByText('Won Deals')).toBeInTheDocument()
    // Should show 2 won deals
    const wonCount = screen.getAllByText('2')
    expect(wonCount.length).toBeGreaterThan(0)
  })

  it('displays lost deals count', async () => {
    const page = await WinLossPage()
    render(page)

    expect(screen.getByText('Lost Deals')).toBeInTheDocument()
  })

  it('displays win rate', async () => {
    const page = await WinLossPage()
    render(page)

    expect(screen.getByText('Win Rate')).toBeInTheDocument()
    // Win rate should be 2/(2+1) = 66.7%
    expect(screen.getByText('66.7%')).toBeInTheDocument()
  })

  it('displays average deal size', async () => {
    const page = await WinLossPage()
    render(page)

    expect(screen.getByText('Avg Deal Size')).toBeInTheDocument()
    expect(screen.getByText('Won deals average')).toBeInTheDocument()
  })

  it('displays loss reasons section', async () => {
    const page = await WinLossPage()
    render(page)

    expect(screen.getByText('Loss Reasons')).toBeInTheDocument()
    expect(screen.getByText('Price')).toBeInTheDocument()
    expect(screen.getByText('Competition')).toBeInTheDocument()
  })

  it('displays won and lost tabs', async () => {
    const page = await WinLossPage()
    render(page)

    expect(screen.getByRole('tab', { name: /won/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /lost/i })).toBeInTheDocument()
  })

  it('displays won opportunities table', async () => {
    const page = await WinLossPage()
    render(page)

    expect(screen.getByText('Won Opportunities')).toBeInTheDocument()
    expect(screen.getByText('Won Deal 1')).toBeInTheDocument()
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
  })

  it('displays opportunity links', async () => {
    const page = await WinLossPage()
    render(page)

    const links = screen.getAllByRole('link')
    const hrefs = links.map(link => link.getAttribute('href'))

    expect(hrefs).toContain('/pipeline/opp-1')
    expect(hrefs).toContain('/pipeline/opp-2')
  })
})
