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
    listReports: () => Promise.resolve([
      {
        id: 'report-1',
        name: 'Monthly Sales',
        report_type: 'sales',
        is_shared: false,
        updated_at: '2024-01-15T00:00:00Z',
      },
      {
        id: 'report-2',
        name: 'Q1 Jobs Overview',
        report_type: 'jobs',
        is_shared: true,
        updated_at: '2024-01-10T00:00:00Z',
      },
    ]),
  },
}))

// Import after mocks
import ReportsPage from '@/app/(dashboard)/reports/page'

describe('ReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', async () => {
    const page = await ReportsPage()
    expect(() => render(page)).not.toThrow()
  })

  it('displays the page title', async () => {
    const page = await ReportsPage()
    render(page)

    expect(screen.getByText('Reports')).toBeInTheDocument()
  })

  it('displays the page description', async () => {
    const page = await ReportsPage()
    render(page)

    expect(screen.getByText('Analyze business performance and export data')).toBeInTheDocument()
  })

  it('displays new report button', async () => {
    const page = await ReportsPage()
    render(page)

    expect(screen.getByRole('link', { name: /new report/i })).toBeInTheDocument()
  })

  it('displays quick report cards', async () => {
    const page = await ReportsPage()
    render(page)

    expect(screen.getByText('Sales Performance')).toBeInTheDocument()
    expect(screen.getByText('Job Costs')).toBeInTheDocument()
    expect(screen.getByText('Lead Sources')).toBeInTheDocument()
    expect(screen.getByText('Revenue Trends')).toBeInTheDocument()
  })

  it('displays saved reports section', async () => {
    const page = await ReportsPage()
    render(page)

    expect(screen.getByText('Saved Reports')).toBeInTheDocument()
    expect(screen.getByText('Your saved and shared reports')).toBeInTheDocument()
  })

  it('displays saved report items', async () => {
    const page = await ReportsPage()
    render(page)

    expect(screen.getByText('Monthly Sales')).toBeInTheDocument()
    expect(screen.getByText('Q1 Jobs Overview')).toBeInTheDocument()
  })

  it('shows shared badge for shared reports', async () => {
    const page = await ReportsPage()
    render(page)

    expect(screen.getByText('Shared')).toBeInTheDocument()
  })

  it('links to report type pages', async () => {
    const page = await ReportsPage()
    render(page)

    const links = screen.getAllByRole('link')
    const hrefs = links.map(link => link.getAttribute('href'))

    expect(hrefs).toContain('/reports/sales')
    expect(hrefs).toContain('/reports/jobs')
    expect(hrefs).toContain('/reports/leads')
    expect(hrefs).toContain('/reports/revenue')
  })

  it('links to saved reports', async () => {
    const page = await ReportsPage()
    render(page)

    const links = screen.getAllByRole('link')
    const hrefs = links.map(link => link.getAttribute('href'))

    expect(hrefs).toContain('/reports/saved/report-1')
    expect(hrefs).toContain('/reports/saved/report-2')
  })
})
