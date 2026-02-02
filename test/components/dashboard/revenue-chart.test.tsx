import { render, screen, waitFor } from '@testing-library/react'
import { RevenueChart } from '@/components/dashboard/revenue-chart'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock formatCurrency utility
vi.mock('@/lib/utils', () => ({
  formatCurrency: (value: number) => `$${value.toLocaleString()}`,
}))

// Mock Recharts components
vi.mock('recharts', () => ({
  LineChart: ({ children, data }: { children: React.ReactNode, data: any[] }) => (
    <div data-testid="line-chart" data-chart-data={JSON.stringify(data)}>
      {children}
    </div>
  ),
  Line: ({ dataKey, stroke }: { dataKey: string, stroke: string }) => (
    <div data-testid="line" data-key={dataKey} style={{ stroke }} />
  ),
  XAxis: ({ dataKey }: { dataKey: string }) => (
    <div data-testid="x-axis" data-key={dataKey} />
  ),
  YAxis: ({ tickFormatter }: { tickFormatter: (value: number) => string }) => (
    <div data-testid="y-axis" data-formatter={tickFormatter ? 'custom' : 'default'} />
  ),
  CartesianGrid: ({ strokeDasharray }: { strokeDasharray: string }) => (
    <div data-testid="grid" data-dash-array={strokeDasharray} />
  ),
  Tooltip: ({ formatter }: { formatter: any }) => (
    <div data-testid="tooltip" data-has-formatter={!!formatter} />
  ),
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
}))

const mockRevenueData = [
  { month: 'Jan', revenue: 15000 },
  { month: 'Feb', revenue: 18000 },
  { month: 'Mar', revenue: 22000 },
  { month: 'Apr', revenue: 19500 },
  { month: 'May', revenue: 25000 },
  { month: 'Jun', revenue: 28000 },
]

describe('RevenueChart', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render card with title', () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockRevenueData,
    })

    render(<RevenueChart />)
    
    expect(screen.getByText('Revenue (Last 6 Months)')).toBeInTheDocument()
  })

  it('should show loading state initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves

    render(<RevenueChart />)

    const spinner = screen.getByText('', { selector: '.animate-spin' })
    expect(spinner).toBeInTheDocument()
    expect(spinner).toHaveClass('animate-spin', 'rounded-full', 'h-8', 'w-8', 'border-b-2', 'border-primary')
  })

  it('should fetch and display revenue data', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockRevenueData,
    })

    render(<RevenueChart />)
    
    await waitFor(() => {
      expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/analytics/revenue')
  })

  it('should render line chart with data', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockRevenueData,
    })

    render(<RevenueChart />)
    
    await waitFor(() => {
      const chart = screen.getByTestId('line-chart')
      expect(chart).toBeInTheDocument()
      expect(chart).toHaveAttribute('data-chart-data', JSON.stringify(mockRevenueData))
    })
  })

  it('should render chart components', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockRevenueData,
    })

    render(<RevenueChart />)
    
    await waitFor(() => {
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
      expect(screen.getByTestId('line-chart')).toBeInTheDocument()
      expect(screen.getByTestId('line')).toBeInTheDocument()
      expect(screen.getByTestId('x-axis')).toBeInTheDocument()
      expect(screen.getByTestId('y-axis')).toBeInTheDocument()
      expect(screen.getByTestId('grid')).toBeInTheDocument()
      expect(screen.getByTestId('tooltip')).toBeInTheDocument()
    })
  })

  it('should configure chart components correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockRevenueData,
    })

    render(<RevenueChart />)
    
    await waitFor(() => {
      // Line should use revenue dataKey and blue stroke
      const line = screen.getByTestId('line')
      expect(line).toHaveAttribute('data-key', 'revenue')
      expect(line).toHaveStyle({ stroke: '#2563eb' })

      // X-axis should use month dataKey
      const xAxis = screen.getByTestId('x-axis')
      expect(xAxis).toHaveAttribute('data-key', 'month')

      // Y-axis should have custom formatter
      const yAxis = screen.getByTestId('y-axis')
      expect(yAxis).toHaveAttribute('data-formatter', 'custom')

      // Grid should have dash pattern
      const grid = screen.getByTestId('grid')
      expect(grid).toHaveAttribute('data-dash-array', '3 3')

      // Tooltip should have custom formatter
      const tooltip = screen.getByTestId('tooltip')
      expect(tooltip).toHaveAttribute('data-has-formatter', 'true')
    })
  })

  it('should handle fetch error gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    render(<RevenueChart />)
    
    await waitFor(() => {
      expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    })

    // Should render chart with empty data
    const chart = screen.getByTestId('line-chart')
    expect(chart).toHaveAttribute('data-chart-data', '[]')
  })

  it('should handle fetch response error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('Server error')
      },
    })

    render(<RevenueChart />)

    await waitFor(() => {
      expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    })

    // Should render chart with empty data
    const chart = screen.getByTestId('line-chart')
    expect(chart).toHaveAttribute('data-chart-data', '[]')
  })

  it('should handle empty data response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    })

    render(<RevenueChart />)
    
    await waitFor(() => {
      expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    })

    const chart = screen.getByTestId('line-chart')
    expect(chart).toHaveAttribute('data-chart-data', '[]')
  })

  it('should handle malformed API response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => null,
    })

    render(<RevenueChart />)
    
    await waitFor(() => {
      expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    })

    const chart = screen.getByTestId('line-chart')
    expect(chart).toHaveAttribute('data-chart-data', 'null')
  })

  it('should maintain loading state until data is loaded', async () => {
    let resolvePromise: (value: any) => void
    const promise = new Promise((resolve) => {
      resolvePromise = resolve
    })
    
    mockFetch.mockReturnValueOnce(promise)

    render(<RevenueChart />)
    
    // Should show loading initially
    expect(screen.getByRole('generic', { name: '' })).toHaveClass('animate-spin')
    
    // Resolve the promise
    resolvePromise!({
      ok: true,
      json: async () => mockRevenueData,
    })
    
    // Should show chart after loading
    await waitFor(() => {
      expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    })
  })

  it('should handle JSON parsing error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => {
        throw new Error('Invalid JSON')
      },
    })

    render(<RevenueChart />)
    
    await waitFor(() => {
      expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    })

    // Should render chart with empty data
    const chart = screen.getByTestId('line-chart')
    expect(chart).toHaveAttribute('data-chart-data', '[]')
  })

  it('should render with proper height', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockRevenueData,
    })

    render(<RevenueChart />)
    
    await waitFor(() => {
      const container = screen.getByTestId('responsive-container')
      expect(container).toBeInTheDocument()
    })
  })

  it('should handle partial data correctly', async () => {
    const partialData = [
      { month: 'Jan', revenue: 15000 },
      { month: 'Feb', revenue: 0 },
      { month: 'Mar', revenue: 22000 },
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => partialData,
    })

    render(<RevenueChart />)
    
    await waitFor(() => {
      const chart = screen.getByTestId('line-chart')
      expect(chart).toHaveAttribute('data-chart-data', JSON.stringify(partialData))
    })
  })
})