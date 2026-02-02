import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import CustomerDetailPage from '@/app/(dashboard)/customers/[id]/page'

// Mock the useCustomer hook
const mockUseCustomer = vi.fn()
vi.mock('@/lib/hooks/use-customers', () => ({
  useCustomer: (id: string) => mockUseCustomer(id),
}))

// Mock CustomerDetail component
vi.mock('@/components/customers/customer-detail', () => ({
  default: ({ customer }: { customer: { name: string } }) => (
    <div data-testid="customer-detail">{customer.name}</div>
  ),
}))

describe('CustomerDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state', () => {
    mockUseCustomer.mockReturnValue({ data: null, isLoading: true, error: null })

    render(<CustomerDetailPage params={Promise.resolve({ id: '123' })} />)

    // Loading state shows skeleton
    const skeletons = document.querySelectorAll('[class*="animate-pulse"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders error state', async () => {
    mockUseCustomer.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Failed to load customer')
    })

    render(<CustomerDetailPage params={Promise.resolve({ id: '123' })} />)

    await waitFor(() => {
      expect(screen.getByText('Error Loading Customer')).toBeInTheDocument()
    })
    expect(screen.getByText('Failed to load customer')).toBeInTheDocument()
  })

  it('renders not found state', async () => {
    mockUseCustomer.mockReturnValue({ data: null, isLoading: false, error: null })

    render(<CustomerDetailPage params={Promise.resolve({ id: '123' })} />)

    await waitFor(() => {
      expect(screen.getByText('Customer Not Found')).toBeInTheDocument()
    })
  })

  it('renders customer detail when data is loaded', async () => {
    mockUseCustomer.mockReturnValue({
      data: { id: '123', name: 'Test Customer' },
      isLoading: false,
      error: null
    })

    render(<CustomerDetailPage params={Promise.resolve({ id: '123' })} />)

    await waitFor(() => {
      expect(screen.getByTestId('customer-detail')).toBeInTheDocument()
    })
    expect(screen.getByText('Test Customer')).toBeInTheDocument()
  })

  it('passes customer id to useCustomer hook', async () => {
    mockUseCustomer.mockReturnValue({ data: null, isLoading: true, error: null })

    render(<CustomerDetailPage params={Promise.resolve({ id: 'test-id-123' })} />)

    await waitFor(() => {
      expect(mockUseCustomer).toHaveBeenCalledWith('test-id-123')
    })
  })

  it('shows helpful message in error state', async () => {
    mockUseCustomer.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Network error')
    })

    render(<CustomerDetailPage params={Promise.resolve({ id: '123' })} />)

    await waitFor(() => {
      expect(screen.getByText(/may have been deleted or you may not have permission/)).toBeInTheDocument()
    })
  })
})
