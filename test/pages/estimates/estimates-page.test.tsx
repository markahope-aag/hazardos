import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import EstimatesPage from '@/app/(dashboard)/estimates/page'

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
    expect(() => render(<EstimatesPage />)).not.toThrow()
  })

  it('displays page heading', () => {
    render(<EstimatesPage />)
    expect(screen.getByText('Estimates')).toBeInTheDocument()
  })

  it('displays page description', () => {
    render(<EstimatesPage />)
    expect(screen.getByText('Manage cost estimates for site surveys')).toBeInTheDocument()
  })

  it('displays create estimate button', () => {
    render(<EstimatesPage />)
    expect(screen.getByRole('link', { name: /create estimate/i })).toBeInTheDocument()
  })

  it('displays stats cards', () => {
    render(<EstimatesPage />)
    expect(screen.getByText('Total Estimates')).toBeInTheDocument()
    expect(screen.getByText('Drafts')).toBeInTheDocument()
    expect(screen.getByText('Pending Approval')).toBeInTheDocument()
    expect(screen.getByText('Total Value')).toBeInTheDocument()
  })

  it('displays search input', () => {
    render(<EstimatesPage />)
    expect(screen.getByPlaceholderText('Search estimates...')).toBeInTheDocument()
  })

  it('displays loading state initially', () => {
    // Keep fetch pending
    mockFetch.mockReturnValue(new Promise(() => {}))
    render(<EstimatesPage />)
    expect(screen.getByText('Loading estimates...')).toBeInTheDocument()
  })

  it('shows table headers even when no estimates', async () => {
    render(<EstimatesPage />)
    // Wait for the component to finish loading
    await screen.findByText('Estimate #')
    // Verify table structure
    expect(screen.getByText('Customer')).toBeInTheDocument()
  })

  it('displays table headers', () => {
    render(<EstimatesPage />)
    expect(screen.getByText('Estimate #')).toBeInTheDocument()
    expect(screen.getByText('Customer')).toBeInTheDocument()
    expect(screen.getByText('Project')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('Created')).toBeInTheDocument()
  })
})
