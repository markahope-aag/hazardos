import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatsCards } from '@/components/dashboard/stats-cards'

// Mock the Supabase client with a factory to create independent chains
const createMockChain = (resolveValue: any) => {
  const chain: any = {
    from: vi.fn(),
    select: vi.fn(),
    gte: vi.fn(),
    lte: vi.fn(),
    gt: vi.fn(),
    not: vi.fn(),
    neq: vi.fn(),
  }

  // Set up chainable methods that return 'this' for most cases
  chain.from.mockReturnValue(chain)
  chain.select.mockReturnValue(chain)
  chain.gte.mockReturnValue(chain)
  chain.gt.mockReturnValue(chain)

  // lte should return the chain for further chaining
  chain.lte.mockReturnValue(chain)

  // Terminal methods resolve with the value
  chain.not.mockResolvedValue(resolveValue)
  chain.neq.mockResolvedValue(resolveValue)

  return chain
}

const mockSupabaseClient = {
  from: vi.fn(),
  select: vi.fn(),
  gte: vi.fn(),
  lte: vi.fn(),
  gt: vi.fn(),
  not: vi.fn(),
  neq: vi.fn(),
  filter: vi.fn(),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}))

vi.mock('@/lib/utils', () => ({
  formatCurrency: vi.fn((amount: number | null) => {
    if (amount === null || amount === undefined) return '$0.00'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }),
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
  })

  it('should render all four stat cards', async () => {
    // Mock each query chain independently
    // The component makes 4 separate queries in parallel
    let callCount = 0
    mockSupabaseClient.from.mockImplementation((table: string) => {
      const chain = createMockChain({ data: [], count: 0 })
      callCount++

      if (table === 'payments') {
        // First query: revenue (payments)
        chain.lte.mockResolvedValue({ data: [{ amount: 5000 }, { amount: 3000 }] })
      } else if (table === 'invoices') {
        // Second query: outstanding AR
        chain.not.mockResolvedValue({ data: [{ balance_due: 2500 }, { balance_due: 1500 }] })
      } else if (table === 'jobs') {
        // Third query: jobs count
        chain.neq.mockResolvedValue({ count: 15 })
      } else if (table === 'proposals') {
        // Fourth query: proposals
        chain.lte.mockResolvedValue({ data: [
          { status: 'signed' },
          { status: 'signed' },
          { status: 'pending' },
          { status: 'pending' },
          { status: 'pending' },
        ]})
      }

      return chain
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
    mockSupabaseClient.from.mockImplementation((table: string) => {
      const chain = createMockChain({ data: [], count: 0 })

      if (table === 'payments') {
        chain.lte.mockResolvedValue({ data: [{ amount: 5000 }, { amount: 3000 }, { amount: 2000 }] })
      } else if (table === 'invoices') {
        chain.not.mockResolvedValue({ data: [] })
      } else if (table === 'jobs') {
        chain.neq.mockResolvedValue({ count: 0 })
      } else if (table === 'proposals') {
        chain.lte.mockResolvedValue({ data: [] })
      }

      return chain
    })

    render(await StatsCards())

    // Should sum up all payment amounts
    expect(screen.getByText('$10,000.00')).toBeInTheDocument()
    expect(screen.getByText('Payments received this month')).toBeInTheDocument()
  })

  it('should display correct outstanding AR calculation', async () => {
    mockSupabaseClient.from.mockImplementation((table: string) => {
      const chain = createMockChain({ data: [], count: 0 })

      if (table === 'payments') {
        chain.lte.mockResolvedValue({ data: [] })
      } else if (table === 'invoices') {
        chain.not.mockResolvedValue({ data: [{ balance_due: 2500 }, { balance_due: 1500 }, { balance_due: 1000 }] })
      } else if (table === 'jobs') {
        chain.neq.mockResolvedValue({ count: 0 })
      } else if (table === 'proposals') {
        chain.lte.mockResolvedValue({ data: [] })
      }

      return chain
    })

    render(await StatsCards())

    // Should sum up all outstanding balances
    expect(screen.getByText('$5,000.00')).toBeInTheDocument()
    expect(screen.getByText('Unpaid invoice balance')).toBeInTheDocument()
  })

  it('should display correct jobs count', async () => {
    mockSupabaseClient.from.mockImplementation((table: string) => {
      const chain = createMockChain({ data: [], count: 0 })

      if (table === 'payments') {
        chain.lte.mockResolvedValue({ data: [] })
      } else if (table === 'invoices') {
        chain.not.mockResolvedValue({ data: [] })
      } else if (table === 'jobs') {
        chain.neq.mockResolvedValue({ count: 25 })
      } else if (table === 'proposals') {
        chain.lte.mockResolvedValue({ data: [] })
      }

      return chain
    })

    render(await StatsCards())

    expect(screen.getByText('25')).toBeInTheDocument()
    expect(screen.getByText('Scheduled & completed')).toBeInTheDocument()
  })

  it('should calculate win rate correctly', async () => {
    mockSupabaseClient.from.mockImplementation((table: string) => {
      const chain = createMockChain({ data: [], count: 0 })

      if (table === 'payments') {
        chain.lte.mockResolvedValue({ data: [] })
      } else if (table === 'invoices') {
        chain.not.mockResolvedValue({ data: [] })
      } else if (table === 'jobs') {
        chain.neq.mockResolvedValue({ count: 0 })
      } else if (table === 'proposals') {
        chain.lte.mockResolvedValue({ data: [
          { status: 'signed' },
          { status: 'signed' },
          { status: 'signed' },
          { status: 'pending' },
          { status: 'pending' },
          { status: 'rejected' },
          { status: 'rejected' },
        ]})
      }

      return chain
    })

    render(await StatsCards())

    // 3 signed out of 7 total = 43% (rounded)
    expect(screen.getByText('43%')).toBeInTheDocument()
    expect(screen.getByText('3 of 7 proposals')).toBeInTheDocument()
  })

  it('should handle zero win rate when no proposals', async () => {
    mockSupabaseClient.from.mockImplementation((table: string) => {
      const chain = createMockChain({ data: [], count: 0 })

      if (table === 'payments') {
        chain.lte.mockResolvedValue({ data: [] })
      } else if (table === 'invoices') {
        chain.not.mockResolvedValue({ data: [] })
      } else if (table === 'jobs') {
        chain.neq.mockResolvedValue({ count: 0 })
      } else if (table === 'proposals') {
        chain.lte.mockResolvedValue({ data: [] })
      }

      return chain
    })

    render(await StatsCards())

    expect(screen.getByText('0%')).toBeInTheDocument()
    expect(screen.getByText('0 of 0 proposals')).toBeInTheDocument()
  })

  it('should handle null/undefined data gracefully', async () => {
    mockSupabaseClient.from.mockImplementation((table: string) => {
      const chain = createMockChain({ data: null, count: null })

      if (table === 'payments') {
        chain.lte.mockResolvedValue({ data: null })
      } else if (table === 'invoices') {
        chain.not.mockResolvedValue({ data: null })
      } else if (table === 'jobs') {
        chain.neq.mockResolvedValue({ count: null })
      } else if (table === 'proposals') {
        chain.lte.mockResolvedValue({ data: null })
      }

      return chain
    })

    render(await StatsCards())

    // Should show zero values when data is null
    // $0.00 appears twice (Revenue MTD and Outstanding AR)
    expect(screen.getAllByText('$0.00').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('should handle partial data with null amounts', async () => {
    mockSupabaseClient.from.mockImplementation((table: string) => {
      const chain = createMockChain({ data: [], count: 0 })

      if (table === 'payments') {
        chain.lte.mockResolvedValue({ data: [{ amount: 1000 }, { amount: null }, { amount: 2000 }] })
      } else if (table === 'invoices') {
        chain.not.mockResolvedValue({ data: [{ balance_due: 500 }, { balance_due: null }] })
      } else if (table === 'jobs') {
        chain.neq.mockResolvedValue({ count: 5 })
      } else if (table === 'proposals') {
        chain.lte.mockResolvedValue({ data: [{ status: 'signed' }] })
      }

      return chain
    })

    render(await StatsCards())

    // Should handle null amounts by treating them as 0
    expect(screen.getByText('$3,000.00')).toBeInTheDocument() // 1000 + 0 + 2000
    expect(screen.getByText('$500.00')).toBeInTheDocument() // 500 + 0
  })

  it('should render correct icons for each stat card', async () => {
    mockSupabaseClient.from.mockImplementation((table: string) => {
      const chain = createMockChain({ data: [], count: 0 })

      if (table === 'payments') {
        chain.lte.mockResolvedValue({ data: [] })
      } else if (table === 'invoices') {
        chain.not.mockResolvedValue({ data: [] })
      } else if (table === 'jobs') {
        chain.neq.mockResolvedValue({ count: 0 })
      } else if (table === 'proposals') {
        chain.lte.mockResolvedValue({ data: [] })
      }

      return chain
    })

    render(await StatsCards())

    expect(screen.getByTestId('dollar-icon')).toBeInTheDocument()
    expect(screen.getByTestId('file-icon')).toBeInTheDocument()
    expect(screen.getByTestId('calendar-icon')).toBeInTheDocument()
    expect(screen.getByTestId('trending-icon')).toBeInTheDocument()
  })

  it('should apply correct CSS classes', async () => {
    mockSupabaseClient.from.mockImplementation((table: string) => {
      const chain = createMockChain({ data: [], count: 0 })

      if (table === 'payments') {
        chain.lte.mockResolvedValue({ data: [] })
      } else if (table === 'invoices') {
        chain.not.mockResolvedValue({ data: [] })
      } else if (table === 'jobs') {
        chain.neq.mockResolvedValue({ count: 0 })
      } else if (table === 'proposals') {
        chain.lte.mockResolvedValue({ data: [] })
      }

      return chain
    })

    render(await StatsCards())

    // Find the container by its class instead of by role
    const container = screen.getByText('Revenue MTD').closest('.grid')
    expect(container).toHaveClass('grid', 'gap-4', 'md:grid-cols-2', 'lg:grid-cols-4')
  })

  it('should query correct date ranges for current month', async () => {
    const mockDate = new Date('2024-06-15T10:00:00Z')
    vi.setSystemTime(mockDate)

    let capturedGteCalls: any[] = []
    let capturedLteCalls: any[] = []

    mockSupabaseClient.from.mockImplementation((table: string) => {
      const chain = createMockChain({ data: [], count: 0 })

      // Store original implementations
      const originalGte = chain.gte
      const originalLte = chain.lte

      // Wrap gte to capture and chain
      chain.gte = vi.fn().mockImplementation((...args: any[]) => {
        capturedGteCalls.push(args)
        return chain
      })

      // Wrap lte to capture - it can return chain OR promise depending on context
      chain.lte = vi.fn().mockImplementation((...args: any[]) => {
        capturedLteCalls.push(args)
        // For terminal calls, return the resolved value
        if (table === 'payments' || table === 'proposals') {
          return Promise.resolve(table === 'payments' ? { data: [] } : { data: [] })
        }
        return chain
      })

      if (table === 'invoices') {
        chain.not.mockResolvedValue({ data: [] })
      } else if (table === 'jobs') {
        chain.neq.mockResolvedValue({ count: 0 })
      }

      return chain
    })

    render(await StatsCards())

    // Should query for June 2024 (month 5, 0-indexed)
    expect(capturedGteCalls).toContainEqual(['payment_date', '2024-06-01'])
    expect(capturedLteCalls).toContainEqual(['payment_date', '2024-06-30'])

    vi.useRealTimers()
  })

  it('should filter invoices correctly for outstanding AR', async () => {
    let capturedGtCalls: any[] = []
    let capturedNotCalls: any[] = []

    mockSupabaseClient.from.mockImplementation((table: string) => {
      const chain = createMockChain({ data: [], count: 0 })

      // Wrap gt to capture calls
      chain.gt = vi.fn().mockImplementation((...args: any[]) => {
        capturedGtCalls.push(args)
        return chain
      })

      // Wrap not to capture calls
      chain.not = vi.fn().mockImplementation((...args: any[]) => {
        capturedNotCalls.push(args)
        return Promise.resolve({ data: [] })
      })

      if (table === 'payments') {
        chain.lte.mockResolvedValue({ data: [] })
      } else if (table === 'jobs') {
        chain.neq.mockResolvedValue({ count: 0 })
      } else if (table === 'proposals') {
        chain.lte.mockResolvedValue({ data: [] })
      }

      return chain
    })

    render(await StatsCards())

    // Should filter for positive balance_due and exclude void/paid invoices
    expect(capturedGtCalls).toContainEqual(['balance_due', 0])
    expect(capturedNotCalls).toContainEqual(['status', 'in', '("void","paid")'])
  })

  it('should filter jobs correctly excluding cancelled', async () => {
    let capturedNeqCalls: any[] = []

    mockSupabaseClient.from.mockImplementation((table: string) => {
      const chain = createMockChain({ data: [], count: 0 })

      // Wrap neq to capture calls BEFORE setting table-specific behavior
      chain.neq = vi.fn().mockImplementation((...args: any[]) => {
        capturedNeqCalls.push(args)
        return Promise.resolve({ count: 0 })
      })

      if (table === 'payments') {
        chain.lte.mockResolvedValue({ data: [] })
      } else if (table === 'invoices') {
        chain.not.mockResolvedValue({ data: [] })
      } else if (table === 'proposals') {
        chain.lte.mockResolvedValue({ data: [] })
      }
      // Don't override neq for jobs - it's already wrapped above

      return chain
    })

    render(await StatsCards())

    // Should exclude cancelled jobs
    expect(capturedNeqCalls).toContainEqual(['status', 'cancelled'])
  })

  it('should handle perfect win rate (100%)', async () => {
    mockSupabaseClient.from.mockImplementation((table: string) => {
      const chain = createMockChain({ data: [], count: 0 })

      if (table === 'payments') {
        chain.lte.mockResolvedValue({ data: [] })
      } else if (table === 'invoices') {
        chain.not.mockResolvedValue({ data: [] })
      } else if (table === 'jobs') {
        chain.neq.mockResolvedValue({ count: 0 })
      } else if (table === 'proposals') {
        chain.lte.mockResolvedValue({ data: [
          { status: 'signed' },
          { status: 'signed' },
          { status: 'signed' },
        ]})
      }

      return chain
    })

    render(await StatsCards())

    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(screen.getByText('3 of 3 proposals')).toBeInTheDocument()
  })
})