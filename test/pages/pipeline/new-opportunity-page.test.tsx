import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import NewOpportunityPage from '@/app/(dashboard)/pipeline/new/page'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}))

// Mock toast
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

// Mock date-fns to avoid timezone issues
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

describe('NewOpportunityPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockImplementation((url: string) => {
      if (url === '/api/customers') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            customers: [
              { id: '1', name: 'Test Customer', company_name: 'Test Co', first_name: 'Test', last_name: 'Customer' },
            ],
          }),
        })
      }
      if (url === '/api/pipeline/stages') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            { id: 's1', name: 'New', color: '#3B82F6', probability: 10 },
            { id: 's2', name: 'Qualified', color: '#8B5CF6', probability: 25 },
          ]),
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      })
    })
  })

  it('renders without crashing', async () => {
    expect(() => render(<NewOpportunityPage />)).not.toThrow()
  })

  it('displays page heading', async () => {
    render(<NewOpportunityPage />)
    expect(screen.getByText('New Opportunity')).toBeInTheDocument()
  })

  it('displays page description', async () => {
    render(<NewOpportunityPage />)
    expect(screen.getByText('Add a new opportunity to your sales pipeline')).toBeInTheDocument()
  })

  it('displays customer section', async () => {
    render(<NewOpportunityPage />)
    expect(screen.getByText('Customer')).toBeInTheDocument()
  })

  it('displays opportunity details section', async () => {
    render(<NewOpportunityPage />)
    expect(screen.getByText('Opportunity Details')).toBeInTheDocument()
  })

  it('displays value and timeline section', async () => {
    render(<NewOpportunityPage />)
    expect(screen.getByText('Value & Timeline')).toBeInTheDocument()
  })

  it('has back link to pipeline', async () => {
    render(<NewOpportunityPage />)
    // Find the back link button (icon button with ArrowLeft icon)
    const links = screen.getAllByRole('link')
    const backLink = links.find(link => link.getAttribute('href') === '/pipeline')
    expect(backLink).toBeInTheDocument()
  })

  it('displays cancel button linking to pipeline', async () => {
    render(<NewOpportunityPage />)
    const cancelLink = screen.getByRole('link', { name: /cancel/i })
    expect(cancelLink).toHaveAttribute('href', '/pipeline')
  })

  it('displays create opportunity button', async () => {
    render(<NewOpportunityPage />)
    expect(screen.getByRole('button', { name: /create opportunity/i })).toBeInTheDocument()
  })

  it('renders opportunity name input', async () => {
    render(<NewOpportunityPage />)
    expect(screen.getByPlaceholderText(/Q1 Renovation Project/i)).toBeInTheDocument()
  })

  it('renders description textarea', async () => {
    render(<NewOpportunityPage />)
    expect(screen.getByPlaceholderText(/Brief description/i)).toBeInTheDocument()
  })

  it('renders estimated value input', async () => {
    render(<NewOpportunityPage />)
    expect(screen.getByPlaceholderText(/50000/)).toBeInTheDocument()
  })

  it('updates opportunity name on input', async () => {
    render(<NewOpportunityPage />)
    const input = screen.getByPlaceholderText(/Q1 Renovation Project/i) as HTMLInputElement
    fireEvent.change(input, { target: { value: 'New Project' } })
    expect(input.value).toBe('New Project')
  })

  it('fetches customers and stages on mount', async () => {
    render(<NewOpportunityPage />)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/customers')
      expect(mockFetch).toHaveBeenCalledWith('/api/pipeline/stages')
    })
  })
})
