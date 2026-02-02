import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import NewJobPage from '@/app/(dashboard)/jobs/new/page'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn().mockReturnValue(null),
  }),
}))

// Mock toast
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

// Mock date-fns
vi.mock('date-fns', () => ({
  format: (date: Date, formatStr: string) => {
    if (formatStr === 'PPP') return 'January 1, 2026'
    if (formatStr === 'yyyy-MM-dd') return '2026-01-01'
    return date.toISOString()
  },
}))

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('NewJobPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        customers: [
          { id: '1', name: 'Test Customer', company_name: 'Test Co', email: 'test@example.com' },
        ],
      }),
    })
  })

  it('renders without crashing', async () => {
    expect(() => render(<NewJobPage />)).not.toThrow()
  })

  it('displays page heading', async () => {
    render(<NewJobPage />)
    expect(screen.getByText('Create New Job')).toBeInTheDocument()
  })

  it('displays page description', async () => {
    render(<NewJobPage />)
    expect(screen.getByText('Create a new job and schedule it')).toBeInTheDocument()
  })

  it('displays customer section', async () => {
    render(<NewJobPage />)
    expect(screen.getByText('Customer')).toBeInTheDocument()
  })

  it('displays scheduling section', async () => {
    render(<NewJobPage />)
    expect(screen.getByText('Scheduling')).toBeInTheDocument()
  })

  it('displays job location section', async () => {
    render(<NewJobPage />)
    expect(screen.getByText('Job Location')).toBeInTheDocument()
  })

  it('displays additional details section', async () => {
    render(<NewJobPage />)
    expect(screen.getByText('Additional Details')).toBeInTheDocument()
  })

  it('has cancel link to jobs', async () => {
    render(<NewJobPage />)
    const cancelLink = screen.getByRole('link', { name: /cancel/i })
    expect(cancelLink).toHaveAttribute('href', '/jobs')
  })

  it('displays create job button', async () => {
    render(<NewJobPage />)
    expect(screen.getByRole('button', { name: /create job/i })).toBeInTheDocument()
  })

  it('renders address input', async () => {
    render(<NewJobPage />)
    expect(screen.getByPlaceholderText('123 Main St')).toBeInTheDocument()
  })

  it('renders special instructions textarea', async () => {
    render(<NewJobPage />)
    expect(screen.getByPlaceholderText(/special requirements/i)).toBeInTheDocument()
  })

  it('renders duration input', async () => {
    render(<NewJobPage />)
    expect(screen.getByPlaceholderText('e.g., 8')).toBeInTheDocument()
  })

  it('fetches customers on mount', async () => {
    render(<NewJobPage />)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/customers')
    })
  })
})
