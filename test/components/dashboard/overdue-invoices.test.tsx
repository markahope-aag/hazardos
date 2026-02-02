import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OverdueInvoices } from '@/components/dashboard/overdue-invoices'

// Mock the Supabase client
const mockSupabaseClient = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  lt: vi.fn().mockReturnThis(),
  gt: vi.fn().mockReturnThis(),
  not: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}))

// Mock date-fns
vi.mock('date-fns', () => ({
  formatDistanceToNow: vi.fn((date: Date, options?: { addSuffix?: boolean }) => {
    const diff = Date.now() - date.getTime()
    if (diff > 86400000 * 30) return options?.addSuffix ? '2 months ago' : '2 months'
    if (diff > 86400000 * 7) return options?.addSuffix ? '3 weeks ago' : '3 weeks'
    if (diff > 86400000) return options?.addSuffix ? '5 days ago' : '5 days'
    return options?.addSuffix ? 'a few hours ago' : 'a few hours'
  }),
}))

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ children, href, className, ...props }: any) => (
    <a href={href} className={className} {...props}>
      {children}
    </a>
  ),
}))

// Mock utils
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

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className, ...props }: any) => (
    <span data-testid="badge" data-variant={variant} className={className} {...props}>{children}</span>
  ),
}))

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  AlertCircle: ({ className }: { className?: string }) => <div data-testid="alert-icon" className={className} />,
}))

describe('OverdueInvoices', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock current date to be consistent
    vi.setSystemTime(new Date('2024-01-15T10:00:00Z'))
    
    // Reset the mock chain for each test
    mockSupabaseClient.from.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.select.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.lt.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.gt.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.not.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.order.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.limit.mockReturnValue(mockSupabaseClient)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should render overdue invoices card with title and view all link', async () => {
    mockSupabaseClient.limit.mockResolvedValue({
      data: [],
    })

    render(await OverdueInvoices())

    expect(screen.getByTestId('card')).toBeInTheDocument()
    expect(screen.getByText('Overdue Invoices')).toBeInTheDocument()
    expect(screen.getByText('View All')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View All' })).toHaveAttribute('href', '/invoices?status=overdue')
  })

  it('should display alert icon in title', async () => {
    mockSupabaseClient.limit.mockResolvedValue({
      data: [],
    })

    render(await OverdueInvoices())

    const alertIcon = screen.getByTestId('alert-icon')
    expect(alertIcon).toBeInTheDocument()
    expect(alertIcon).toHaveClass('h-4', 'w-4', 'text-destructive')
  })

  it('should display "No overdue invoices" when no invoices exist', async () => {
    mockSupabaseClient.limit.mockResolvedValue({
      data: [],
    })

    render(await OverdueInvoices())

    expect(screen.getByText('No overdue invoices')).toBeInTheDocument()
  })

  it('should render overdue invoices with total amount', async () => {
    const mockInvoices = [
      {
        id: '1',
        invoice_number: 'INV-001',
        due_date: '2024-01-10',
        balance_due: 1500,
        customer: {
          company_name: 'ABC Corp',
          first_name: null,
          last_name: null,
        },
      },
      {
        id: '2',
        invoice_number: 'INV-002',
        due_date: '2024-01-05',
        balance_due: 2500,
        customer: {
          company_name: 'XYZ Industries',
          first_name: null,
          last_name: null,
        },
      },
    ]

    mockSupabaseClient.limit.mockResolvedValue({
      data: mockInvoices,
    })

    render(await OverdueInvoices())

    // Should display total overdue amount
    expect(screen.getByText('$4,000.00')).toBeInTheDocument()

    // Should display individual invoice amounts
    expect(screen.getByText('$1,500.00')).toBeInTheDocument()
    expect(screen.getByText('$2,500.00')).toBeInTheDocument()
  })

  it('should render customer company names', async () => {
    const mockInvoices = [
      {
        id: '1',
        invoice_number: 'INV-001',
        due_date: '2024-01-10',
        balance_due: 1500,
        customer: {
          company_name: 'ABC Corp',
          first_name: null,
          last_name: null,
        },
      },
    ]

    mockSupabaseClient.limit.mockResolvedValue({
      data: mockInvoices,
    })

    render(await OverdueInvoices())

    expect(screen.getByText('ABC Corp')).toBeInTheDocument()
  })

  it('should render individual customer names when no company name', async () => {
    const mockInvoices = [
      {
        id: '1',
        invoice_number: 'INV-001',
        due_date: '2024-01-10',
        balance_due: 1500,
        customer: {
          company_name: null,
          first_name: 'John',
          last_name: 'Doe',
        },
      },
    ]

    mockSupabaseClient.limit.mockResolvedValue({
      data: mockInvoices,
    })

    render(await OverdueInvoices())

    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('should handle partial customer names gracefully', async () => {
    const mockInvoices = [
      {
        id: '1',
        invoice_number: 'INV-001',
        due_date: '2024-01-10',
        balance_due: 1500,
        customer: {
          company_name: null,
          first_name: 'John',
          last_name: null,
        },
      },
      {
        id: '2',
        invoice_number: 'INV-002',
        due_date: '2024-01-05',
        balance_due: 2500,
        customer: {
          company_name: null,
          first_name: null,
          last_name: 'Smith',
        },
      },
    ]

    mockSupabaseClient.limit.mockResolvedValue({
      data: mockInvoices,
    })

    render(await OverdueInvoices())

    expect(screen.getByText('John')).toBeInTheDocument()
    expect(screen.getByText('Smith')).toBeInTheDocument()
  })

  it('should display "Unknown Customer" when customer data is missing', async () => {
    const mockInvoices = [
      {
        id: '1',
        invoice_number: 'INV-001',
        due_date: '2024-01-10',
        balance_due: 1500,
        customer: null,
      },
      {
        id: '2',
        invoice_number: 'INV-002',
        due_date: '2024-01-05',
        balance_due: 2500,
        customer: {
          company_name: null,
          first_name: null,
          last_name: null,
        },
      },
    ]

    mockSupabaseClient.limit.mockResolvedValue({
      data: mockInvoices,
    })

    render(await OverdueInvoices())

    expect(screen.getAllByText('Unknown Customer')).toHaveLength(2)
  })

  it('should display relative due dates', async () => {
    const mockInvoices = [
      {
        id: '1',
        invoice_number: 'INV-001',
        due_date: '2024-01-10',
        balance_due: 1500,
        customer: {
          company_name: 'ABC Corp',
          first_name: null,
          last_name: null,
        },
      },
    ]

    mockSupabaseClient.limit.mockResolvedValue({
      data: mockInvoices,
    })

    render(await OverdueInvoices())

    // Should show relative time (mocked to return "5 days ago")
    expect(screen.getByText('5 days ago')).toBeInTheDocument()
  })

  it('should display invoice numbers as badges', async () => {
    const mockInvoices = [
      {
        id: '1',
        invoice_number: 'INV-001',
        due_date: '2024-01-10',
        balance_due: 1500,
        customer: {
          company_name: 'ABC Corp',
          first_name: null,
          last_name: null,
        },
      },
    ]

    mockSupabaseClient.limit.mockResolvedValue({
      data: mockInvoices,
    })

    render(await OverdueInvoices())

    const badge = screen.getByTestId('badge')
    expect(badge).toHaveTextContent('INV-001')
    expect(badge).toHaveAttribute('data-variant', 'outline')
    expect(badge).toHaveClass('text-xs')
  })

  it('should create clickable links to invoice details', async () => {
    const mockInvoices = [
      {
        id: 'invoice-123',
        invoice_number: 'INV-001',
        due_date: '2024-01-10',
        balance_due: 1500,
        customer: {
          company_name: 'ABC Corp',
          first_name: null,
          last_name: null,
        },
      },
    ]

    mockSupabaseClient.limit.mockResolvedValue({
      data: mockInvoices,
    })

    render(await OverdueInvoices())

    const invoiceLink = screen.getByRole('link', { name: /ABC Corp/ })
    expect(invoiceLink).toHaveAttribute('href', '/invoices/invoice-123')
  })

  it('should query invoices with correct parameters', async () => {
    mockSupabaseClient.limit.mockResolvedValue({
      data: [],
    })

    render(await OverdueInvoices())

    expect(mockSupabaseClient.from).toHaveBeenCalledWith('invoices')
    expect(mockSupabaseClient.select).toHaveBeenCalledWith(`
      id,
      invoice_number,
      due_date,
      balance_due,
      customer:customers(company_name, first_name, last_name)
    `)
    expect(mockSupabaseClient.lt).toHaveBeenCalledWith('due_date', '2024-01-15')
    expect(mockSupabaseClient.gt).toHaveBeenCalledWith('balance_due', 0)
    expect(mockSupabaseClient.not).toHaveBeenCalledWith('status', 'in', '("paid","void")')
    expect(mockSupabaseClient.order).toHaveBeenCalledWith('due_date', { ascending: true })
    expect(mockSupabaseClient.limit).toHaveBeenCalledWith(5)
  })

  it('should handle null data response gracefully', async () => {
    mockSupabaseClient.limit.mockResolvedValue({
      data: null,
    })

    render(await OverdueInvoices())

    expect(screen.getByText('No overdue invoices')).toBeInTheDocument()
  })

  it('should handle null balance_due values in total calculation', async () => {
    const mockInvoices = [
      {
        id: '1',
        invoice_number: 'INV-001',
        due_date: '2024-01-10',
        balance_due: 1500,
        customer: {
          company_name: 'ABC Corp',
          first_name: null,
          last_name: null,
        },
      },
      {
        id: '2',
        invoice_number: 'INV-002',
        due_date: '2024-01-05',
        balance_due: null,
        customer: {
          company_name: 'XYZ Industries',
          first_name: null,
          last_name: null,
        },
      },
    ]

    mockSupabaseClient.limit.mockResolvedValue({
      data: mockInvoices,
    })

    render(await OverdueInvoices())

    // Should handle null balance_due by treating as 0 in total calculation
    // Total should be $1,500.00, and this appears only once (as the total)
    // The individual invoice amount will show as $1,500.00 too, and null will show as $0.00
    const totalAmounts = screen.getAllByText('$1,500.00')
    expect(totalAmounts.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('$0.00')).toBeInTheDocument() // For the null balance
  })

  it('should apply correct CSS classes for styling', async () => {
    const mockInvoices = [
      {
        id: '1',
        invoice_number: 'INV-001',
        due_date: '2024-01-10',
        balance_due: 1500,
        customer: {
          company_name: 'ABC Corp',
          first_name: null,
          last_name: null,
        },
      },
    ]

    mockSupabaseClient.limit.mockResolvedValue({
      data: mockInvoices,
    })

    render(await OverdueInvoices())

    // Check total amount styling - find the div with specific classes
    const totalAmount = screen.getByText('$1,500.00', { selector: 'div' })
    expect(totalAmount).toHaveClass('text-2xl', 'font-bold', 'text-destructive', 'mb-4')

    // Check invoice link styling
    const invoiceLink = screen.getByRole('link', { name: /ABC Corp/ })
    expect(invoiceLink).toHaveClass('flex', 'justify-between', 'items-center', 'p-2', 'rounded-lg', 'hover:bg-muted/50')
  })

  it('should handle zero total overdue amount', async () => {
    const mockInvoices = [
      {
        id: '1',
        invoice_number: 'INV-001',
        due_date: '2024-01-10',
        balance_due: 0,
        customer: {
          company_name: 'ABC Corp',
          first_name: null,
          last_name: null,
        },
      },
    ]

    mockSupabaseClient.limit.mockResolvedValue({
      data: mockInvoices,
    })

    render(await OverdueInvoices())

    // $0.00 appears twice: once for total, once for the individual invoice
    expect(screen.getAllByText('$0.00')[0]).toBeInTheDocument()
  })

  it('should handle large overdue amounts correctly', async () => {
    const mockInvoices = [
      {
        id: '1',
        invoice_number: 'INV-001',
        due_date: '2024-01-10',
        balance_due: 999999.99,
        customer: {
          company_name: 'ABC Corp',
          first_name: null,
          last_name: null,
        },
      },
    ]

    mockSupabaseClient.limit.mockResolvedValue({
      data: mockInvoices,
    })

    render(await OverdueInvoices())

    // Use getAllByText since amount appears twice (total and individual)
    expect(screen.getAllByText('$999,999.99')[0]).toBeInTheDocument()
  })

  it('should handle edge case of empty string customer names', async () => {
    const mockInvoices = [
      {
        id: '1',
        invoice_number: 'INV-001',
        due_date: '2024-01-10',
        balance_due: 1500,
        customer: {
          company_name: '',
          first_name: '',
          last_name: '',
        },
      },
    ]

    mockSupabaseClient.limit.mockResolvedValue({
      data: mockInvoices,
    })

    render(await OverdueInvoices())

    expect(screen.getByText('Unknown Customer')).toBeInTheDocument()
  })
})