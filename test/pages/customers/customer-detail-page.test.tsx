import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'

// Mock the useCustomer hook
vi.mock('@/lib/hooks/use-customers', () => ({
  useCustomer: vi.fn((id: string) => ({
    data: { id, name: 'Test Customer', email: 'test@example.com' },
    isLoading: false,
    error: null
  })),
}))

// Mock CustomerDetail component
vi.mock('@/components/customers/customer-detail', () => ({
  default: ({ customer }: { customer: { name: string } }) => (
    <div data-testid="customer-detail">{customer.name}</div>
  ),
}))

import CustomerDetailPage from '@/app/(dashboard)/customers/[id]/page'
import { useCustomer } from '@/lib/hooks/use-customers'

describe('CustomerDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', async () => {
    await act(async () => {
      render(<CustomerDetailPage params={Promise.resolve({ id: '123' })} />)
    })
    // Should not throw
  })

  it('renders customer detail when data is loaded', async () => {
    await act(async () => {
      render(<CustomerDetailPage params={Promise.resolve({ id: '123' })} />)
    })

    expect(screen.getByTestId('customer-detail')).toBeInTheDocument()
    expect(screen.getByText('Test Customer')).toBeInTheDocument()
  })

  it('calls useCustomer with correct id', async () => {
    await act(async () => {
      render(<CustomerDetailPage params={Promise.resolve({ id: 'test-id-123' })} />)
    })

    expect(useCustomer).toHaveBeenCalledWith('test-id-123')
  })
})
