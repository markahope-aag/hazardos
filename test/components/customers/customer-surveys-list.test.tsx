import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CustomerSurveysList from '@/components/customers/customer-surveys-list'

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock Supabase
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockOrder = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => ({
      select: mockSelect,
    }),
  }),
}))

const mockSurveys = [
  {
    id: 'survey-1',
    job_name: 'Kitchen Renovation Survey',
    site_address: '123 Main St',
    status: 'completed',
    appointment_status: 'confirmed',
    scheduled_date: '2024-02-15',
    created_at: '2024-02-01T10:00:00Z',
  },
  {
    id: 'survey-2',
    job_name: 'Basement Assessment',
    site_address: '456 Oak Ave',
    status: 'in_progress',
    appointment_status: null,
    scheduled_date: null,
    created_at: '2024-01-20T10:00:00Z',
  },
]

describe('CustomerSurveysList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSelect.mockReturnValue({ eq: mockEq })
    mockEq.mockReturnValue({ order: mockOrder })
    mockOrder.mockResolvedValue({ data: mockSurveys, error: null })
  })

  it('renders loading state initially', () => {
    mockOrder.mockReturnValue(new Promise(() => {})) // Never resolves

    render(<CustomerSurveysList customerId="customer-1" />)

    // Should show skeleton loaders
    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })

  it('renders Site Surveys title', async () => {
    render(<CustomerSurveysList customerId="customer-1" />)

    await waitFor(() => {
      expect(screen.getByText('Site Surveys')).toBeInTheDocument()
    })
  })

  it('shows survey count after loading', async () => {
    render(<CustomerSurveysList customerId="customer-1" />)

    await waitFor(() => {
      expect(screen.getByText('(2)')).toBeInTheDocument()
    })
  })

  it('renders New Survey button', async () => {
    render(<CustomerSurveysList customerId="customer-1" />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /new survey/i })).toBeInTheDocument()
    })
  })

  it('renders survey names', async () => {
    render(<CustomerSurveysList customerId="customer-1" />)

    await waitFor(() => {
      expect(screen.getByText('Kitchen Renovation Survey')).toBeInTheDocument()
      expect(screen.getByText('Basement Assessment')).toBeInTheDocument()
    })
  })

  it('renders survey addresses', async () => {
    render(<CustomerSurveysList customerId="customer-1" />)

    await waitFor(() => {
      expect(screen.getByText('123 Main St')).toBeInTheDocument()
      expect(screen.getByText('456 Oak Ave')).toBeInTheDocument()
    })
  })

  it('renders survey status badges', async () => {
    render(<CustomerSurveysList customerId="customer-1" />)

    await waitFor(() => {
      expect(screen.getByText('completed')).toBeInTheDocument()
      expect(screen.getByText('in_progress')).toBeInTheDocument()
    })
  })

  it('renders appointment status badge when present', async () => {
    render(<CustomerSurveysList customerId="customer-1" />)

    await waitFor(() => {
      expect(screen.getByText('confirmed')).toBeInTheDocument()
    })
  })

  it('shows empty state when no surveys', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null })

    render(<CustomerSurveysList customerId="customer-1" />)

    await waitFor(() => {
      expect(screen.getByText('No surveys yet')).toBeInTheDocument()
      expect(screen.getByText(/create the first site survey/i)).toBeInTheDocument()
    })
  })

  it('shows Create Survey button in empty state', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null })

    render(<CustomerSurveysList customerId="customer-1" />)

    await waitFor(() => {
      const createButton = screen.getByRole('button', { name: /create survey/i })
      expect(createButton).toBeInTheDocument()
    })
  })

  it('shows error state when fetch fails', async () => {
    mockOrder.mockResolvedValue({ data: null, error: new Error('Database error') })

    render(<CustomerSurveysList customerId="customer-1" />)

    await waitFor(() => {
      expect(screen.getByText('Error loading surveys')).toBeInTheDocument()
    })
  })

  it('navigates to new survey page on New Survey click', async () => {
    const user = userEvent.setup()
    render(<CustomerSurveysList customerId="customer-1" />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /new survey/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /new survey/i }))

    expect(mockPush).toHaveBeenCalledWith('/site-surveys/new?customer_id=customer-1')
  })

  it('queries surveys for the correct customer', async () => {
    render(<CustomerSurveysList customerId="test-customer-id" />)

    await waitFor(() => {
      expect(mockEq).toHaveBeenCalledWith('customer_id', 'test-customer-id')
    })
  })

  it('orders surveys by created_at descending', async () => {
    render(<CustomerSurveysList customerId="customer-1" />)

    await waitFor(() => {
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false })
    })
  })

  it('shows Untitled Survey for surveys without job_name', async () => {
    mockOrder.mockResolvedValue({
      data: [{ ...mockSurveys[0], job_name: null }],
      error: null,
    })

    render(<CustomerSurveysList customerId="customer-1" />)

    await waitFor(() => {
      expect(screen.getByText('Untitled Survey')).toBeInTheDocument()
    })
  })
})
