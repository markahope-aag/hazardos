import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatsCards } from '@/components/dashboard/stats-cards'

// Mock the Supabase client
const mockSupabaseClient = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  gt: vi.fn().mockReturnThis(),
  not: vi.fn().mockReturnThis(),
  neq: vi.fn().mockReturnThis(),
  filter: vi.fn().mockReturnThis(),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}))

vi.mock('@/lib/utils', () => ({
  formatCurrency: vi.fn((amount: number) => `$${amount.toLocaleString()}`),
}))

// Mock UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div data-testid="card" {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div data-testid="card-content" {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div data-testid="card-header" {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h3 data-testid="card-title" {...props}>{children}</h3>,
}))

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  DollarSign: ({ className }: { className?: string }) => <div data-testid="dollar-icon" className={className} />,
  FileText: ({ className }: { className?: string }) => <div data-testid="file-icon" className={className} />,
  Calendar: ({ className }: { className?: string }) => <div data-testid="calendar-icon" className={className} />,
  TrendingUp: ({ className }: { className?: string }) => <div data-testid="trending-icon" className={className} />,
}))

describe('StatsCards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset the mock chain for each test
    mockSupabaseClient.from.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.select.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.gte.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.lte.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.gt.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.not.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.neq.mockReturnValue(mockSupabaseClient)
  })

  it('should render all four stat cards', async () => {
    // Mock successful data responses
    mockSupabaseClient.from
      .mockReturnValueOnce({
        ...mockSupabaseClient,
        data: [{ amount: 5000 }, { amount: 3000 }], // Revenue data
      })
      .mockReturnValueOnce({
        ...mockSupabaseClient,
        data: [{ balance_due: 2500 }, { balance_due: 1500 }], // Outstanding AR
      })
      .mockReturnValueOnce({
        ...mockSupabaseClient,
        count: 15, // Jobs count
      })
      .mockReturnValueOnce({
        ...mockSupabaseClient,
        data: [
          { status: 'signed' },
          { status: 'signed' },
          { status: 'pending' },
          { status: 'pending' },
          { status: 'pending' },
        ], // Proposals
      })

    render(await StatsCards())

    // Check that all four cards are rendered
    expect(screen.getAllByTestId('card')).toHaveLength(4)

    // Check card titles
    expect(screen.getByText('Revenue MTD')).toBeInTheDocument()
    expect(screen.getByText('Outstanding AR')).toBeInTheDocument()
    expect(screen.getByText('Jobs This Month')).toBeInTheDocument()
    expect(screen.getByText('Win Rate')).toBeInTheDocument()
  })

  it('should display correct revenue calculation', async () => {
    mockSupabaseClient.from
      .mockReturnValueOnce({
        ...mockSupabaseClient,
        data: [{ amount: 5000 }, { amount: 3000 }, { amount: 2000 }],
      })
      .mockReturnValueOnce({
        ...mockSupabaseClient,
        data: [],
      })
      .mockReturnValueOnce({
        ...mockSupabaseClient,
        count: 0,
      })
      .mockReturnValueOnce({
        ...mockSupabaseClient,
        data: [],
      })

    render(await StatsCards())

    // Should sum up all payment amounts
    expect(screen.getByText('$10,000')).toBeInTheDocument()
    expect(screen.getByText('Payments received this month')).toBeInTheDocument()
  })

  it('should display correct outstanding AR calculation', async () => {
    mockSupabaseClient.from
      .mockReturnValueOnce({
        ...mockSupabaseClient,
        data: [],
      })
      .mockReturnValueOnce({
        ...mockSupabaseClient,
        data: [{ balance_due: 2500 }, { balance_due: 1500 }, { balance_due: 1000 }],
      })
      .mockReturnValueOnce({
        ...mockSupabaseClient,
        count: 0,
      })
      .mockReturnValueOnce({
        ...mockSupabaseClient,
        data: [],
      })

    render(await StatsCards())

    // Should sum up all outstanding balances
    expect(screen.getByText('$5,000')).toBeInTheDocument()
    expect(screen.getByText('Unpaid invoice balance')).toBeInTheDocument()
  })

  it('should display correct jobs count', async () => {
    mockSupabaseClient.from
      .mockReturnValueOnce({
        ...mockSupabaseClient,
        data: [],
      })
      .mockReturnValueOnce({
        ...mockSupabaseClient,
        data: [],
      })
      .mockReturnValueOnce({
        ...mockSupabaseClient,
        count: 25,
      })
      .mockReturnValueOnce({
        ...mockSupabaseClient,
        data: [],
      })

    render(await StatsCards())

    expect(screen.getByText('25')).toBeInTheDocument()
    expect(screen.getByText('Scheduled & completed')).toBeInTheDocument()
  })

  it('should calculate win rate correctly', async () => {
    mockSupabaseClient.from
      .mockReturnValueOnce({
        ...mockSupabaseClient,
        data: [],
      })
      .mockReturnValueOnce({
        ...mockSupabaseClient,
        data: [],
      })
      .mockReturnValueOnce({
        ...mockSupabaseClient,
        count: 0,
      })
      .mockReturnValueOnce({
        ...mockSupabaseClient,
        data: [
          { status: 'signed' },
          { status: 'signed' },
          { status: 'signed' },
          { status: 'pending' },
          { status: 'pending' },
          { status: 'rejected' },
          { status: 'rejected' },
        ],
      })

    render(await StatsCards())

    // 3 signed out of 7 total = 43% (rounded)
    expect(screen.getByText('43%')).toBeInTheDocument()
    expect(screen.getByText('3 of 7 proposals')).toBeInTheDocument()
  })

  it('should handle zero win rate when no proposals', async () => {
    mockSupabaseClient.from
      .mockReturnValueOnce({
        ...mockSupabaseClient,
        data: [],
      })
      .mockReturnValueOnce({
        ...mockSupabaseClient,
        data: [],
      })
      .mockReturnValueOnce({
        ...mockSupabaseClient,
        count: 0,
      })
      .mockReturnValueOnce({
        ...mockSupabaseClient,
        data: [],
      })

    render(await StatsCards())

    expect(screen.getByText('0%')).toBeInTheDocument()
    expect(screen.getByText('0 of 0 proposals')).toBeInTheDocument()
  })

  it('should handle null/undefined data gracefully', async () => {
    mockSupabaseClient.from
      .mockReturnValueOnce({
        ...mockSupabaseClient,
        data: null,
      })
      .mockReturnValueOnce({
        ...mockSupabaseClient,
        data: null,
      })
      .mockReturnValueOnce({
        ...mockSupabaseClient,
        count: null,
      })
      .mockReturnValueOnce({
        ...mockSupabaseClient,
        data: null,
      })

    render(await StatsCards())

    // Should show zero values when data is null
    expect(screen.getByText('$0')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('should handle partial data with null amounts', async () => {
    mockSupabaseClient.from
      .mockReturnValueOnce({
        ...mockSupabaseClient,
        data: [{ amount: 1000 }, { amount: null }, { amount: 2000 }],
      })
      .mockReturnValueOnce({
        ...mockSupabaseClient,
        data: [{ balance_due: 500 }, { balance_due: null }],
      })
      .mockReturnValueOnce({
        ...mockSupabaseClient,
        count: 5,
      })
      .mockReturnValueOnce({
        ...mockSupabaseClient,
        data: [{ status: 'signed' }],
      })

    render(await StatsCards())

    // Should handle null amounts by treating them as 0
    expect(screen.getByText('$3,000')).toBeInTheDocument() // 1000 + 0 + 2000
    expect(screen.getByText('$500')).toBeInTheDocument() // 500 + 0
  })

  it('should render correct icons for each stat card', async () => {
    mockSupabaseClient.from
      .mockReturnValue({
        ...mockSupabaseClient,
        data: [],
        count: 0,
      })

    render(await StatsCards())

    expect(screen.getByTestId('dollar-icon')).toBeInTheDocument()
    expect(screen.getByTestId('file-icon')).toBeInTheDocument()
    expect(screen.getByTestId('calendar-icon')).toBeInTheDocument()
    expect(screen.getByTestId('trending-icon')).toBeInTheDocument()
  })

  it('should apply correct CSS classes', async () => {
    mockSupabaseClient.from
      .mockReturnValue({
        ...mockSupabaseClient,
        data: [],
        count: 0,
      })

    render(await StatsCards())

    const container = screen.getByRole('generic')
    expect(container).toHaveClass('grid', 'gap-4', 'md:grid-cols-2', 'lg:grid-cols-4')
  })

  it('should query correct date ranges for current month', async () => {
    const mockDate = new Date('2024-06-15T10:00:00Z')
    vi.setSystemTime(mockDate)

    mockSupabaseClient.from
      .mockReturnValue({
        ...mockSupabaseClient,
        data: [],
        count: 0,
      })

    render(await StatsCards())

    // Should query for June 2024 (month 5, 0-indexed)
    expect(mockSupabaseClient.gte).toHaveBeenCalledWith('payment_date', '2024-06-01')
    expect(mockSupabaseClient.lte).toHaveBeenCalledWith('payment_date', '2024-06-30')

    vi.useRealTimers()
  })

  it('should filter invoices correctly for outstanding AR', async () => {
    mockSupabaseClient.from
      .mockReturnValue({
        ...mockSupabaseClient,
        data: [],
        count: 0,
      })

    render(await StatsCards())

    // Should filter for positive balance_due and exclude void/paid invoices
    expect(mockSupabaseClient.gt).toHaveBeenCalledWith('balance_due', 0)
    expect(mockSupabaseClient.not).toHaveBeenCalledWith('status', 'in', '("void","paid")')
  })

  it('should filter jobs correctly excluding cancelled', async () => {
    mockSupabaseClient.from
      .mockReturnValue({
        ...mockSupabaseClient,
        data: [],
        count: 0,
      })

    render(await StatsCards())

    // Should exclude cancelled jobs
    expect(mockSupabaseClient.neq).toHaveBeenCalledWith('status', 'cancelled')
  })

  it('should handle perfect win rate (100%)', async () => {
    mockSupabaseClient.from
      .mockReturnValueOnce({
        ...mockSupabaseClient,
        data: [],
      })
      .mockReturnValueOnce({
        ...mockSupabaseClient,
        data: [],
      })
      .mockReturnValueOnce({
        ...mockSupabaseClient,
        count: 0,
      })
      .mockReturnValueOnce({
        ...mockSupabaseClient,
        data: [
          { status: 'signed' },
          { status: 'signed' },
          { status: 'signed' },
        ],
      })

    render(await StatsCards())

    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(screen.getByText('3 of 3 proposals')).toBeInTheDocument()
  })
})