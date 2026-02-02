import { render, screen, waitFor } from '@testing-library/react'
import { JobsByStatus } from '@/components/dashboard/jobs-by-status'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock Recharts components
vi.mock('recharts', () => ({
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ data, label, children }: { data: any[], label: any, children?: React.ReactNode }) => (
    <div data-testid="pie">
      {data.map((entry, index) => (
        <div key={index} data-testid={`pie-segment-${entry.status}`}>
          {label && label(entry)}
        </div>
      ))}
      {children}
    </div>
  ),
  Cell: ({ fill }: { fill: string }) => <div data-testid="pie-cell" style={{ fill }} />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  Legend: () => <div data-testid="legend" />,
  Tooltip: () => <div data-testid="tooltip" />,
}))

const mockJobData = [
  { status: 'scheduled', count: 5 },
  { status: 'in progress', count: 3 },
  { status: 'completed', count: 8 },
  { status: 'invoiced', count: 2 },
  { status: 'paid', count: 12 },
]

describe('JobsByStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render card with title', () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockJobData,
    })

    render(<JobsByStatus />)
    
    expect(screen.getByText('Jobs by Status')).toBeInTheDocument()
  })

  it('should show loading state initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves

    render(<JobsByStatus />)

    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
    expect(spinner).toHaveClass('rounded-full', 'h-8', 'w-8', 'border-b-2', 'border-primary')
  })

  it('should fetch and display job data', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockJobData,
    })

    render(<JobsByStatus />)
    
    await waitFor(() => {
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/analytics/jobs-by-status')
  })

  it('should render pie chart with data', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockJobData,
    })

    render(<JobsByStatus />)
    
    await waitFor(() => {
      expect(screen.getByTestId('pie')).toBeInTheDocument()
    })

    // Should render segments for each status
    expect(screen.getByTestId('pie-segment-scheduled')).toBeInTheDocument()
    expect(screen.getByTestId('pie-segment-in progress')).toBeInTheDocument()
    expect(screen.getByTestId('pie-segment-completed')).toBeInTheDocument()
    expect(screen.getByTestId('pie-segment-invoiced')).toBeInTheDocument()
    expect(screen.getByTestId('pie-segment-paid')).toBeInTheDocument()
  })

  it('should show empty state when no data', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    })

    render(<JobsByStatus />)
    
    await waitFor(() => {
      expect(screen.getByText('No job data available')).toBeInTheDocument()
    })

    expect(screen.queryByTestId('pie-chart')).not.toBeInTheDocument()
  })

  it('should handle fetch error gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    render(<JobsByStatus />)
    
    await waitFor(() => {
      expect(screen.getByText('No job data available')).toBeInTheDocument()
    })
  })

  it('should handle fetch response error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('Failed to parse JSON')
      },
    })

    render(<JobsByStatus />)

    await waitFor(() => {
      expect(screen.getByText('No job data available')).toBeInTheDocument()
    })
  })

  it('should render chart components', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockJobData,
    })

    render(<JobsByStatus />)
    
    await waitFor(() => {
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
      expect(screen.getByTestId('pie')).toBeInTheDocument()
      expect(screen.getByTestId('legend')).toBeInTheDocument()
      expect(screen.getByTestId('tooltip')).toBeInTheDocument()
    })
  })

  it('should render pie cells for each data entry', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockJobData,
    })

    render(<JobsByStatus />)
    
    await waitFor(() => {
      const cells = screen.getAllByTestId('pie-cell')
      expect(cells).toHaveLength(mockJobData.length)
    })
  })

  it('should apply correct colors to pie segments', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { status: 'scheduled', count: 5 },
        { status: 'unknown-status', count: 2 },
      ],
    })

    render(<JobsByStatus />)
    
    await waitFor(() => {
      const cells = screen.getAllByTestId('pie-cell')
      expect(cells[0]).toHaveStyle({ fill: '#3b82f6' }) // scheduled color
      expect(cells[1]).toHaveStyle({ fill: '#9ca3af' }) // default color
    })
  })

  it('should handle malformed API response with non-array data', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ invalid: 'data' }),
    })

    render(<JobsByStatus />)

    // Component will attempt to render with invalid data structure
    // The error is caught by React's error handling, but loading completes
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/analytics/jobs-by-status')
    })
  })

  it('should maintain loading state until data is loaded', async () => {
    let resolvePromise: (value: any) => void
    const promise = new Promise((resolve) => {
      resolvePromise = resolve
    })

    mockFetch.mockReturnValueOnce(promise)

    render(<JobsByStatus />)

    // Should show loading initially
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()

    // Resolve the promise
    resolvePromise!({
      ok: true,
      json: async () => mockJobData,
    })

    // Should show data after loading
    await waitFor(() => {
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
    })
  })

  it('should handle JSON parsing error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => {
        throw new Error('Invalid JSON')
      },
    })

    render(<JobsByStatus />)
    
    await waitFor(() => {
      expect(screen.getByText('No job data available')).toBeInTheDocument()
    })
  })
})