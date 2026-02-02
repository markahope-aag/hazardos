import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UpcomingJobs } from '@/components/dashboard/upcoming-jobs'

// Mock the Supabase client
const mockSupabaseClient = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  neq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}))

// Mock date-fns
vi.mock('date-fns', () => ({
  format: vi.fn((date: Date, formatStr: string) => {
    if (formatStr === 'EEE, MMM d') {
      return 'Mon, Jan 15'
    }
    return date.toISOString()
  }),
  addDays: vi.fn((date: Date, days: number) => {
    const result = new Date(date)
    result.setDate(result.getDate() + days)
    return result
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

// Mock UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div data-testid="card" {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div data-testid="card-content" {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div data-testid="card-header" {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h3 data-testid="card-title" {...props}>{children}</h3>,
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, ...props }: any) => (
    <span data-testid="badge" data-variant={variant} {...props}>{children}</span>
  ),
}))

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Calendar: ({ className }: { className?: string }) => <div data-testid="calendar-icon" className={className} />,
  MapPin: ({ className }: { className?: string }) => <div data-testid="mappin-icon" className={className} />,
}))

describe('UpcomingJobs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock current date to be consistent
    vi.setSystemTime(new Date('2024-01-15T10:00:00Z'))
    
    // Reset the mock chain for each test
    mockSupabaseClient.from.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.select.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.gte.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.lte.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.neq.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.order.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.limit.mockReturnValue(mockSupabaseClient)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should render upcoming jobs card with title and calendar link', async () => {
    mockSupabaseClient.limit.mockResolvedValue({
      data: [],
    })

    render(await UpcomingJobs())

    expect(screen.getByTestId('card')).toBeInTheDocument()
    expect(screen.getByText('Upcoming Jobs')).toBeInTheDocument()
    expect(screen.getByText('View Calendar')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View Calendar' })).toHaveAttribute('href', '/calendar')
  })

  it('should display "No jobs scheduled" when no jobs exist', async () => {
    mockSupabaseClient.limit.mockResolvedValue({
      data: [],
    })

    render(await UpcomingJobs())

    expect(screen.getByText('No jobs scheduled')).toBeInTheDocument()
  })

  it('should render job entries with customer company names', async () => {
    const mockJobs = [
      {
        id: '1',
        job_number: 'JOB-001',
        scheduled_start_date: '2024-01-16',
        scheduled_start_time: '09:00',
        job_address: '123 Main St, Anytown',
        status: 'scheduled',
        customer: {
          company_name: 'ABC Corp',
          first_name: null,
          last_name: null,
        },
      },
      {
        id: '2',
        job_number: 'JOB-002',
        scheduled_start_date: '2024-01-17',
        scheduled_start_time: null,
        job_address: '456 Oak Ave, Another City',
        status: 'scheduled',
        customer: {
          company_name: 'XYZ Industries',
          first_name: null,
          last_name: null,
        },
      },
    ]

    mockSupabaseClient.limit.mockResolvedValue({
      data: mockJobs,
    })

    render(await UpcomingJobs())

    expect(screen.getByText('ABC Corp')).toBeInTheDocument()
    expect(screen.getByText('XYZ Industries')).toBeInTheDocument()
    expect(screen.getByText('JOB-001')).toBeInTheDocument()
    expect(screen.getByText('JOB-002')).toBeInTheDocument()
  })

  it('should render job entries with individual customer names when no company name', async () => {
    const mockJobs = [
      {
        id: '1',
        job_number: 'JOB-001',
        scheduled_start_date: '2024-01-16',
        scheduled_start_time: '09:00',
        job_address: '123 Main St, Anytown',
        status: 'scheduled',
        customer: {
          company_name: null,
          first_name: 'John',
          last_name: 'Doe',
        },
      },
    ]

    mockSupabaseClient.limit.mockResolvedValue({
      data: mockJobs,
    })

    render(await UpcomingJobs())

    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('should handle partial customer names gracefully', async () => {
    const mockJobs = [
      {
        id: '1',
        job_number: 'JOB-001',
        scheduled_start_date: '2024-01-16',
        scheduled_start_time: '09:00',
        job_address: '123 Main St, Anytown',
        status: 'scheduled',
        customer: {
          company_name: null,
          first_name: 'John',
          last_name: null,
        },
      },
      {
        id: '2',
        job_number: 'JOB-002',
        scheduled_start_date: '2024-01-17',
        scheduled_start_time: null,
        job_address: '456 Oak Ave, Another City',
        status: 'scheduled',
        customer: {
          company_name: null,
          first_name: null,
          last_name: 'Smith',
        },
      },
    ]

    mockSupabaseClient.limit.mockResolvedValue({
      data: mockJobs,
    })

    render(await UpcomingJobs())

    expect(screen.getByText('John')).toBeInTheDocument()
    expect(screen.getByText('Smith')).toBeInTheDocument()
  })

  it('should display "Unknown Customer" when customer data is missing', async () => {
    const mockJobs = [
      {
        id: '1',
        job_number: 'JOB-001',
        scheduled_start_date: '2024-01-16',
        scheduled_start_time: '09:00',
        job_address: '123 Main St, Anytown',
        status: 'scheduled',
        customer: null,
      },
      {
        id: '2',
        job_number: 'JOB-002',
        scheduled_start_date: '2024-01-17',
        scheduled_start_time: null,
        job_address: '456 Oak Ave, Another City',
        status: 'scheduled',
        customer: {
          company_name: null,
          first_name: null,
          last_name: null,
        },
      },
    ]

    mockSupabaseClient.limit.mockResolvedValue({
      data: mockJobs,
    })

    render(await UpcomingJobs())

    expect(screen.getAllByText('Unknown Customer')).toHaveLength(2)
  })

  it('should display scheduled date and time correctly', async () => {
    const mockJobs = [
      {
        id: '1',
        job_number: 'JOB-001',
        scheduled_start_date: '2024-01-16',
        scheduled_start_time: '09:00',
        job_address: '123 Main St, Anytown',
        status: 'scheduled',
        customer: {
          company_name: 'ABC Corp',
          first_name: null,
          last_name: null,
        },
      },
      {
        id: '2',
        job_number: 'JOB-002',
        scheduled_start_date: '2024-01-17',
        scheduled_start_time: null,
        job_address: '456 Oak Ave, Another City',
        status: 'scheduled',
        customer: {
          company_name: 'XYZ Industries',
          first_name: null,
          last_name: null,
        },
      },
    ]

    mockSupabaseClient.limit.mockResolvedValue({
      data: mockJobs,
    })

    render(await UpcomingJobs())

    // Should show formatted date with time
    expect(screen.getByText('Mon, Jan 15 at 09:00')).toBeInTheDocument()
    // Should show formatted date without time
    expect(screen.getByText('Mon, Jan 15')).toBeInTheDocument()
  })

  it('should display job addresses', async () => {
    const mockJobs = [
      {
        id: '1',
        job_number: 'JOB-001',
        scheduled_start_date: '2024-01-16',
        scheduled_start_time: '09:00',
        job_address: '123 Main St, Anytown, ST 12345',
        status: 'scheduled',
        customer: {
          company_name: 'ABC Corp',
          first_name: null,
          last_name: null,
        },
      },
    ]

    mockSupabaseClient.limit.mockResolvedValue({
      data: mockJobs,
    })

    render(await UpcomingJobs())

    expect(screen.getByText('123 Main St, Anytown, ST 12345')).toBeInTheDocument()
  })

  it('should create clickable links to job details', async () => {
    const mockJobs = [
      {
        id: 'job-123',
        job_number: 'JOB-001',
        scheduled_start_date: '2024-01-16',
        scheduled_start_time: '09:00',
        job_address: '123 Main St, Anytown',
        status: 'scheduled',
        customer: {
          company_name: 'ABC Corp',
          first_name: null,
          last_name: null,
        },
      },
    ]

    mockSupabaseClient.limit.mockResolvedValue({
      data: mockJobs,
    })

    render(await UpcomingJobs())

    const jobLink = screen.getByRole('link', { name: /ABC Corp/ })
    expect(jobLink).toHaveAttribute('href', '/jobs/job-123')
  })

  it('should display job numbers as badges', async () => {
    const mockJobs = [
      {
        id: '1',
        job_number: 'JOB-001',
        scheduled_start_date: '2024-01-16',
        scheduled_start_time: '09:00',
        job_address: '123 Main St, Anytown',
        status: 'scheduled',
        customer: {
          company_name: 'ABC Corp',
          first_name: null,
          last_name: null,
        },
      },
    ]

    mockSupabaseClient.limit.mockResolvedValue({
      data: mockJobs,
    })

    render(await UpcomingJobs())

    const badge = screen.getByTestId('badge')
    expect(badge).toHaveTextContent('JOB-001')
    expect(badge).toHaveAttribute('data-variant', 'outline')
  })

  it('should query jobs with correct parameters', async () => {
    mockSupabaseClient.limit.mockResolvedValue({
      data: [],
    })

    render(await UpcomingJobs())

    expect(mockSupabaseClient.from).toHaveBeenCalledWith('jobs')
    expect(mockSupabaseClient.select).toHaveBeenCalledWith(`
      id,
      job_number,
      scheduled_start_date,
      scheduled_start_time,
      job_address,
      status,
      customer:customers(company_name, first_name, last_name)
    `)
    expect(mockSupabaseClient.gte).toHaveBeenCalledWith('scheduled_start_date', '2024-01-15')
    expect(mockSupabaseClient.lte).toHaveBeenCalledWith('scheduled_start_date', '2024-01-22')
    expect(mockSupabaseClient.neq).toHaveBeenCalledWith('status', 'cancelled')
    expect(mockSupabaseClient.order).toHaveBeenCalledWith('scheduled_start_date', { ascending: true })
    expect(mockSupabaseClient.limit).toHaveBeenCalledWith(5)
  })

  it('should handle null data response gracefully', async () => {
    mockSupabaseClient.limit.mockResolvedValue({
      data: null,
    })

    render(await UpcomingJobs())

    expect(screen.getByText('No jobs scheduled')).toBeInTheDocument()
  })

  it('should render calendar and map pin icons', async () => {
    const mockJobs = [
      {
        id: '1',
        job_number: 'JOB-001',
        scheduled_start_date: '2024-01-16',
        scheduled_start_time: '09:00',
        job_address: '123 Main St, Anytown',
        status: 'scheduled',
        customer: {
          company_name: 'ABC Corp',
          first_name: null,
          last_name: null,
        },
      },
    ]

    mockSupabaseClient.limit.mockResolvedValue({
      data: mockJobs,
    })

    render(await UpcomingJobs())

    expect(screen.getByTestId('calendar-icon')).toBeInTheDocument()
    expect(screen.getByTestId('mappin-icon')).toBeInTheDocument()
  })

  it('should apply correct CSS classes for hover effects', async () => {
    const mockJobs = [
      {
        id: '1',
        job_number: 'JOB-001',
        scheduled_start_date: '2024-01-16',
        scheduled_start_time: '09:00',
        job_address: '123 Main St, Anytown',
        status: 'scheduled',
        customer: {
          company_name: 'ABC Corp',
          first_name: null,
          last_name: null,
        },
      },
    ]

    mockSupabaseClient.limit.mockResolvedValue({
      data: mockJobs,
    })

    render(await UpcomingJobs())

    const jobLink = screen.getByRole('link', { name: /ABC Corp/ })
    expect(jobLink).toHaveClass('block', 'p-3', 'rounded-lg', 'border', 'hover:bg-muted/50', 'transition-colors')
  })

  it('should handle edge case of empty string customer names', async () => {
    const mockJobs = [
      {
        id: '1',
        job_number: 'JOB-001',
        scheduled_start_date: '2024-01-16',
        scheduled_start_time: '09:00',
        job_address: '123 Main St, Anytown',
        status: 'scheduled',
        customer: {
          company_name: '',
          first_name: '',
          last_name: '',
        },
      },
    ]

    mockSupabaseClient.limit.mockResolvedValue({
      data: mockJobs,
    })

    render(await UpcomingJobs())

    expect(screen.getByText('Unknown Customer')).toBeInTheDocument()
  })

  it('should handle jobs with very long addresses', async () => {
    const longAddress = '1234 Very Long Street Name That Goes On And On, Some Really Long City Name, ST 12345-6789'
    const mockJobs = [
      {
        id: '1',
        job_number: 'JOB-001',
        scheduled_start_date: '2024-01-16',
        scheduled_start_time: '09:00',
        job_address: longAddress,
        status: 'scheduled',
        customer: {
          company_name: 'ABC Corp',
          first_name: null,
          last_name: null,
        },
      },
    ]

    mockSupabaseClient.limit.mockResolvedValue({
      data: mockJobs,
    })

    render(await UpcomingJobs())

    expect(screen.getByText(longAddress)).toBeInTheDocument()
  })
})