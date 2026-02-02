import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

// Mock Supabase server
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve({
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: 'user-123' } } }),
    },
  }),
}))

// Mock the services
vi.mock('@/lib/services/pipeline-service', () => ({
  PipelineService: {
    getPipelineMetrics: () => Promise.resolve({
      count: 10,
      total_value: 50000,
      weighted_value: 35000,
    }),
  },
}))

vi.mock('@/lib/services/commission-service', () => ({
  CommissionService: {
    getSummary: () => Promise.resolve({
      this_month: 2500,
      this_quarter: 7500,
      total_pending: 1000,
    }),
  },
}))

vi.mock('@/lib/services/approval-service', () => ({
  ApprovalService: {
    getPendingCount: () => Promise.resolve(3),
  },
}))

// Import after mocks
import SalesPage from '@/app/(dashboard)/sales/page'

describe('SalesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', async () => {
    const page = await SalesPage()
    expect(() => render(page)).not.toThrow()
  })

  it('displays the page title', async () => {
    const page = await SalesPage()
    render(page)

    expect(screen.getByText('Sales Tools')).toBeInTheDocument()
  })

  it('displays the page description', async () => {
    const page = await SalesPage()
    render(page)

    expect(screen.getByText(/manage your sales pipeline, track commissions/i)).toBeInTheDocument()
  })

  it('displays pipeline value stat card', async () => {
    const page = await SalesPage()
    render(page)

    expect(screen.getByText('Pipeline Value')).toBeInTheDocument()
    expect(screen.getByText('$50,000')).toBeInTheDocument()
  })

  it('displays commissions stat card', async () => {
    const page = await SalesPage()
    render(page)

    expect(screen.getByText('Commissions This Month')).toBeInTheDocument()
    expect(screen.getByText('$2,500')).toBeInTheDocument()
  })

  it('displays pending approvals stat card', async () => {
    const page = await SalesPage()
    render(page)

    expect(screen.getByText('Pending Approvals')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('displays sales pipeline tool card', async () => {
    const page = await SalesPage()
    render(page)

    expect(screen.getByText('Sales Pipeline')).toBeInTheDocument()
    expect(screen.getByText('Manage opportunities through your sales stages')).toBeInTheDocument()
  })

  it('displays commission tracking tool card', async () => {
    const page = await SalesPage()
    render(page)

    expect(screen.getByText('Commission Tracking')).toBeInTheDocument()
    expect(screen.getByText('Track and manage sales commissions')).toBeInTheDocument()
  })

  it('displays win/loss analysis tool card', async () => {
    const page = await SalesPage()
    render(page)

    expect(screen.getByText('Win/Loss Analysis')).toBeInTheDocument()
    expect(screen.getByText('Analyze won and lost opportunities')).toBeInTheDocument()
  })

  it('displays approval queue tool card', async () => {
    const page = await SalesPage()
    render(page)

    expect(screen.getByText('Approval Queue')).toBeInTheDocument()
    expect(screen.getByText('Review estimates, discounts, and proposals')).toBeInTheDocument()
  })

  it('displays links to sales tools', async () => {
    const page = await SalesPage()
    render(page)

    const links = screen.getAllByRole('link')
    const hrefs = links.map(link => link.getAttribute('href'))

    expect(hrefs).toContain('/pipeline')
    expect(hrefs).toContain('/sales/commissions')
    expect(hrefs).toContain('/sales/win-loss')
    expect(hrefs).toContain('/sales/approvals')
  })
})
