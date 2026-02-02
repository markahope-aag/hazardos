import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import NewInvoicePage from '@/app/(dashboard)/invoices/new/page'

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
    if (formatStr === 'PPP') return 'January 30, 2026'
    if (formatStr === 'yyyy-MM-dd') return '2026-01-30'
    return date.toISOString()
  },
  addDays: (date: Date, days: number) => {
    const result = new Date(date)
    result.setDate(result.getDate() + days)
    return result
  },
}))

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('NewInvoicePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockImplementation((url: string) => {
      if (url === '/api/customers') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            customers: [
              { id: '1', name: 'Test Customer', company_name: 'Test Co', email: 'test@example.com' },
            ],
          }),
        })
      }
      if (url.startsWith('/api/jobs')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            jobs: [
              { id: 'j1', job_number: 'JOB-001', job_address: '123 Main St', customer_id: '1', status: 'completed' },
            ],
          }),
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      })
    })
  })

  it('renders without crashing', async () => {
    expect(() => render(<NewInvoicePage />)).not.toThrow()
  })

  it('displays page heading', async () => {
    render(<NewInvoicePage />)
    expect(screen.getByText('Create New Invoice')).toBeInTheDocument()
  })

  it('displays page description', async () => {
    render(<NewInvoicePage />)
    expect(screen.getByText('Create an invoice for a customer')).toBeInTheDocument()
  })

  it('displays customer section', async () => {
    render(<NewInvoicePage />)
    expect(screen.getByText('Customer')).toBeInTheDocument()
  })

  it('displays invoice details section', async () => {
    render(<NewInvoicePage />)
    expect(screen.getByText('Invoice Details')).toBeInTheDocument()
  })

  it('has cancel link to invoices', async () => {
    render(<NewInvoicePage />)
    const cancelLink = screen.getByRole('link', { name: /cancel/i })
    expect(cancelLink).toHaveAttribute('href', '/invoices')
  })

  it('displays create invoice button', async () => {
    render(<NewInvoicePage />)
    expect(screen.getByRole('button', { name: /create invoice/i })).toBeInTheDocument()
  })

  it('renders notes textarea', async () => {
    render(<NewInvoicePage />)
    expect(screen.getByPlaceholderText(/notes to appear on the invoice/i)).toBeInTheDocument()
  })

  it('fetches customers and jobs on mount', async () => {
    render(<NewInvoicePage />)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/customers')
      expect(mockFetch).toHaveBeenCalledWith('/api/jobs?status=completed')
    })
  })
})
