import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { JobsByStatus } from '@/components/dashboard/jobs-by-status'
import { DEFAULT_FILTERS } from '@/lib/dashboard/filters'

const mockFetch = vi.fn()
global.fetch = mockFetch

vi.mock('@/components/charts/recharts-lazy', () => ({
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ children }: { children?: React.ReactNode }) => <div data-testid="pie">{children}</div>,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  Legend: () => <div data-testid="legend" />,
  Tooltip: () => <div data-testid="tooltip" />,
}))

vi.mock('recharts', () => ({
  Cell: () => <div data-testid="pie-cell" />,
}))

describe('JobsByStatus', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('renders the header and total count after fetching data', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        total: 7,
        buckets: [
          { status: 'scheduled', count: 3 },
          { status: 'completed', count: 4 },
        ],
      }),
    })

    render(<JobsByStatus filters={DEFAULT_FILTERS} />)

    expect(screen.getByText('Jobs by Status')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('7')).toBeInTheDocument()
    })
    expect(screen.getByText('total jobs')).toBeInTheDocument()
  })

  it('renders empty state when no buckets', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ total: 0, buckets: [] }),
    })

    render(<JobsByStatus filters={DEFAULT_FILTERS} />)

    await waitFor(() => {
      expect(screen.getByText('No jobs match the selected filters')).toBeInTheDocument()
    })
  })

  it('passes period and hazard filter to the API request', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ total: 0, buckets: [] }),
    })

    render(
      <JobsByStatus
        filters={{ period: 'quarter', hazardType: 'asbestos' }}
      />
    )

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
    })
    const url = mockFetch.mock.calls[0][0] as string
    expect(url).toContain('period=quarter')
    expect(url).toContain('hazard_type=asbestos')
  })

  it('omits hazard_type when filter is "all"', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ total: 0, buckets: [] }),
    })

    render(<JobsByStatus filters={DEFAULT_FILTERS} />)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
    })
    const url = mockFetch.mock.calls[0][0] as string
    expect(url).toContain('period=month')
    expect(url).not.toContain('hazard_type')
  })
})
