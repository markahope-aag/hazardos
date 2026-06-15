import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import EstimatesPage from '@/app/(dashboard)/estimates/page'

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}))

// Mock useToast
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

// Mock the auth hook
vi.mock('@/lib/hooks/use-multi-tenant-auth', () => ({
  useMultiTenantAuth: () => ({
    user: null,
    profile: null,
    organization: { id: 'org-123' },
    isLoading: false,
  }),
}))

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('EstimatesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ estimates: [] }),
    })
  })

  it('renders without crashing', () => {
    expect(() => renderWithQuery(<EstimatesPage />)).not.toThrow()
  })

  it('displays page heading', () => {
    renderWithQuery(<EstimatesPage />)
    expect(screen.getByText('Estimates')).toBeInTheDocument()
  })

  it('displays page description', () => {
    renderWithQuery(<EstimatesPage />)
    expect(screen.getByText('Manage cost estimates for site surveys')).toBeInTheDocument()
  })

  it('displays create estimate button', () => {
    renderWithQuery(<EstimatesPage />)
    expect(screen.getByRole('link', { name: /create estimate/i })).toBeInTheDocument()
  })

  it('displays stats cards', () => {
    renderWithQuery(<EstimatesPage />)
    expect(screen.getByText('Open Estimates')).toBeInTheDocument()
    expect(screen.getByText('Win Rate')).toBeInTheDocument()
  })

  it('displays search input', () => {
    renderWithQuery(<EstimatesPage />)
    expect(screen.getByPlaceholderText('Search estimates...')).toBeInTheDocument()
  })

  it('displays loading state initially', () => {
    // Keep fetch pending
    mockFetch.mockReturnValue(new Promise(() => {}))
    renderWithQuery(<EstimatesPage />)
    // "Loading estimates..." renders in both the mobile card and the desktop
    // table (jsdom renders both regardless of responsive CSS), so assert on
    // at least one rather than a single match.
    expect(screen.getAllByText('Loading estimates...').length).toBeGreaterThan(0)
  })

  it('shows table headers even when no estimates', async () => {
    renderWithQuery(<EstimatesPage />)
    // Wait for the component to finish loading
    await screen.findByText('Estimate #')
    // Verify table structure
    expect(screen.getByText('Customer')).toBeInTheDocument()
  })

  it('displays table headers', () => {
    renderWithQuery(<EstimatesPage />)
    expect(screen.getByText('Estimate #')).toBeInTheDocument()
    expect(screen.getByText('Customer')).toBeInTheDocument()
    expect(screen.getByText('Project')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('Created')).toBeInTheDocument()
  })
})
