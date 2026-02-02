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

// Mock ReportingService
vi.mock('@/lib/services/reporting-service', () => ({
  ReportingService: {
    runSalesReport: () => Promise.resolve([
      { date: '2024-01-01', revenue: 10000 },
      { date: '2024-01-02', revenue: 15000 },
    ]),
    runJobCostReport: () => Promise.resolve([
      { job_number: 'J-001', cost: 5000 },
    ]),
    runLeadSourceReport: () => Promise.resolve([
      { source: 'Website', count: 10 },
    ]),
  },
}))

// Mock ReportViewerLazy component
vi.mock('@/components/reports/report-viewer-lazy', () => ({
  ReportViewerLazy: ({ reportType, initialData }: { reportType: string; initialData: unknown[] }) => (
    <div data-testid="report-viewer">
      Report Type: {reportType}, Data Count: {initialData?.length || 0}
    </div>
  ),
}))

// Import after mocks
import ReportTypePage from '@/app/(dashboard)/reports/[type]/page'

describe('ReportTypePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing for sales report', async () => {
    const page = await ReportTypePage({
      params: Promise.resolve({ type: 'sales' }),
      searchParams: Promise.resolve({}),
    })
    expect(() => render(page)).not.toThrow()
  })

  it('displays sales report title', async () => {
    const page = await ReportTypePage({
      params: Promise.resolve({ type: 'sales' }),
      searchParams: Promise.resolve({}),
    })
    render(page)

    expect(screen.getByText('Sales Performance Report')).toBeInTheDocument()
  })

  it('renders report viewer for sales', async () => {
    const page = await ReportTypePage({
      params: Promise.resolve({ type: 'sales' }),
      searchParams: Promise.resolve({}),
    })
    render(page)

    expect(screen.getByTestId('report-viewer')).toBeInTheDocument()
    expect(screen.getByText(/Report Type: sales/)).toBeInTheDocument()
    expect(screen.getByText(/Data Count: 2/)).toBeInTheDocument()
  })

  it('displays jobs report title', async () => {
    const page = await ReportTypePage({
      params: Promise.resolve({ type: 'jobs' }),
      searchParams: Promise.resolve({}),
    })
    render(page)

    expect(screen.getByText('Job Costs Report')).toBeInTheDocument()
  })

  it('renders report viewer for jobs', async () => {
    const page = await ReportTypePage({
      params: Promise.resolve({ type: 'jobs' }),
      searchParams: Promise.resolve({}),
    })
    render(page)

    expect(screen.getByText(/Report Type: jobs/)).toBeInTheDocument()
    expect(screen.getByText(/Data Count: 1/)).toBeInTheDocument()
  })

  it('displays leads report title', async () => {
    const page = await ReportTypePage({
      params: Promise.resolve({ type: 'leads' }),
      searchParams: Promise.resolve({}),
    })
    render(page)

    expect(screen.getByText('Lead Sources Report')).toBeInTheDocument()
  })

  it('displays revenue report title', async () => {
    const page = await ReportTypePage({
      params: Promise.resolve({ type: 'revenue' }),
      searchParams: Promise.resolve({}),
    })
    render(page)

    expect(screen.getByText('Revenue Trends Report')).toBeInTheDocument()
  })

  it('passes correct report type to viewer', async () => {
    const page = await ReportTypePage({
      params: Promise.resolve({ type: 'leads' }),
      searchParams: Promise.resolve({}),
    })
    render(page)

    expect(screen.getByText(/Report Type: leads/)).toBeInTheDocument()
  })

  it('handles date range search params', async () => {
    const page = await ReportTypePage({
      params: Promise.resolve({ type: 'sales' }),
      searchParams: Promise.resolve({ range: 'last_7_days' }),
    })
    render(page)

    expect(screen.getByTestId('report-viewer')).toBeInTheDocument()
  })
})
