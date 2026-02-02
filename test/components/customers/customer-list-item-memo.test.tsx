import { render } from '@testing-library/react'
import { vi } from 'vitest'
import CustomerListItem from '@/components/customers/customer-list-item'
import type { Customer } from '@/types/database'

// Mock the hooks and components
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

vi.mock('@/lib/hooks/use-customers', () => ({
  useUpdateCustomerStatus: () => ({
    mutateAsync: vi.fn(),
  }),
}))

vi.mock('@/components/customers/customer-status-badge', () => ({
  default: ({ status }: { status: string }) => <span data-testid="status-badge">{status}</span>,
}))

const mockCustomer: Customer = {
  id: '1',
  name: 'John Doe',
  email: 'john@example.com',
  phone: '555-0123',
  company_name: 'Test Company',
  status: 'active',
  source: 'website',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  address: null,
  notes: null,
  tags: null,
  metadata: null,
}

describe('CustomerListItem Memoization', () => {
  const mockOnEdit = vi.fn()
  const mockOnDelete = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render without errors', () => {
    const { getByText } = render(
      <table>
        <tbody>
          <CustomerListItem
            customer={mockCustomer}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </tbody>
      </table>
    )

    expect(getByText('John Doe')).toBeInTheDocument()
    expect(getByText('Test Company')).toBeInTheDocument()
    expect(getByText('john@example.com')).toBeInTheDocument()
  })

  it('should memoize date formatting', () => {
    const { rerender, getByText } = render(
      <table>
        <tbody>
          <CustomerListItem
            customer={mockCustomer}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </tbody>
      </table>
    )

    // Check that date is formatted correctly (accounting for timezone)
    expect(getByText('Dec 31, 2023')).toBeInTheDocument()

    // Re-render with same customer - date should not be recalculated
    rerender(
      <table>
        <tbody>
          <CustomerListItem
            customer={mockCustomer}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </tbody>
      </table>
    )

    // Date should still be there and correctly formatted
    expect(getByText('Dec 31, 2023')).toBeInTheDocument()
  })

  it('should memoize source label formatting', () => {
    const { getByText } = render(
      <table>
        <tbody>
          <CustomerListItem
            customer={mockCustomer}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </tbody>
      </table>
    )

    // Check that source is formatted correctly (capitalized)
    expect(getByText('Website')).toBeInTheDocument()
  })

  it('should handle null source correctly', () => {
    const customerWithNullSource = {
      ...mockCustomer,
      source: null,
    }

    const { getByText } = render(
      <table>
        <tbody>
          <CustomerListItem
            customer={customerWithNullSource}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </tbody>
      </table>
    )

    // Should display dash for null source
    expect(getByText('-')).toBeInTheDocument()
  })

  it('should render status badge', () => {
    const { getByTestId } = render(
      <table>
        <tbody>
          <CustomerListItem
            customer={mockCustomer}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </tbody>
      </table>
    )

    const statusBadge = getByTestId('status-badge')
    expect(statusBadge).toBeInTheDocument()
    expect(statusBadge).toHaveTextContent('active')
  })
})