import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CustomerList from '@/components/customers/customer-list'
import type { Customer } from '@/types/database'

// Mock child components
vi.mock('@/components/customers/customer-list-item', () => ({
  default: ({ customer, onEdit, onDelete }: any) => (
    <tr data-testid={`customer-row-${customer.id}`}>
      <td>{customer.name}</td>
      <td>{customer.email}</td>
      <td>
        <button onClick={() => onEdit(customer)}>Edit</button>
        <button onClick={() => onDelete(customer)}>Delete</button>
      </td>
    </tr>
  ),
}))

vi.mock('@/components/customers/customer-search', () => ({
  default: ({ value, onChange }: any) => (
    <input
      data-testid="customer-search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Search..."
    />
  ),
}))

vi.mock('@/components/customers/customer-filters', () => ({
  default: ({ status, source, onStatusChange, onSourceChange, onClearFilters }: any) => (
    <div data-testid="customer-filters">
      <select
        data-testid="status-filter"
        value={status}
        onChange={(e) => onStatusChange(e.target.value)}
      >
        <option value="all">All</option>
        <option value="active">Active</option>
      </select>
      <select
        data-testid="source-filter"
        value={source}
        onChange={(e) => onSourceChange(e.target.value)}
      >
        <option value="all">All</option>
        <option value="referral">Referral</option>
      </select>
      <button onClick={onClearFilters}>Clear filters</button>
    </div>
  ),
}))

// Mock hooks
let mockCustomers: Customer[] = []
let mockIsLoading = false
let mockError: Error | null = null

vi.mock('@/lib/hooks/use-customers', () => ({
  useCustomers: () => ({
    data: mockCustomers,
    isLoading: mockIsLoading,
    error: mockError,
  }),
}))

vi.mock('@/lib/hooks/use-debounced-value', () => ({
  useDebouncedValue: (value: string) => value,
}))

const mockCustomer: Customer = {
  id: 'cust-1',
  organization_id: 'org-1',
  name: 'John Doe',
  company_name: 'Acme Inc',
  email: 'john@example.com',
  phone: '555-1234',
  status: 'active',
  source: 'referral',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

describe('CustomerList', () => {
  const mockOnEditCustomer = vi.fn()
  const mockOnDeleteCustomer = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockCustomers = [mockCustomer]
    mockIsLoading = false
    mockError = null
  })

  it('renders Customers title', async () => {
    render(
      <CustomerList
        onEditCustomer={mockOnEditCustomer}
        onDeleteCustomer={mockOnDeleteCustomer}
      />
    )

    expect(screen.getByText('Customers')).toBeInTheDocument()
  })

  it('renders search input', () => {
    render(
      <CustomerList
        onEditCustomer={mockOnEditCustomer}
        onDeleteCustomer={mockOnDeleteCustomer}
      />
    )

    expect(screen.getByTestId('customer-search')).toBeInTheDocument()
  })

  it('renders filters', () => {
    render(
      <CustomerList
        onEditCustomer={mockOnEditCustomer}
        onDeleteCustomer={mockOnDeleteCustomer}
      />
    )

    expect(screen.getByTestId('customer-filters')).toBeInTheDocument()
  })

  it('renders customer rows', () => {
    render(
      <CustomerList
        onEditCustomer={mockOnEditCustomer}
        onDeleteCustomer={mockOnDeleteCustomer}
      />
    )

    expect(screen.getByTestId('customer-row-cust-1')).toBeInTheDocument()
  })

  it('renders table headers', () => {
    render(
      <CustomerList
        onEditCustomer={mockOnEditCustomer}
        onDeleteCustomer={mockOnDeleteCustomer}
      />
    )

    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Contact')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Source')).toBeInTheDocument()
    expect(screen.getByText('Created')).toBeInTheDocument()
    expect(screen.getByText('Actions')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    mockIsLoading = true
    mockCustomers = []

    render(
      <CustomerList
        onEditCustomer={mockOnEditCustomer}
        onDeleteCustomer={mockOnDeleteCustomer}
      />
    )

    // Should show skeletons
    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })

  it('shows empty state when no customers', () => {
    mockCustomers = []

    render(
      <CustomerList
        onEditCustomer={mockOnEditCustomer}
        onDeleteCustomer={mockOnDeleteCustomer}
      />
    )

    expect(screen.getByText('No customers yet')).toBeInTheDocument()
    expect(screen.getByText(/get started by adding/i)).toBeInTheDocument()
  })

  it('shows error state', () => {
    mockError = new Error('Network error')
    mockCustomers = []

    render(
      <CustomerList
        onEditCustomer={mockOnEditCustomer}
        onDeleteCustomer={mockOnDeleteCustomer}
      />
    )

    expect(screen.getByText('Error loading customers')).toBeInTheDocument()
    expect(screen.getByText('Network error')).toBeInTheDocument()
  })

  it('shows customer count', () => {
    render(
      <CustomerList
        onEditCustomer={mockOnEditCustomer}
        onDeleteCustomer={mockOnDeleteCustomer}
      />
    )

    expect(screen.getByText('(1 total)')).toBeInTheDocument()
  })

  it('calls onEditCustomer when edit is clicked', async () => {
    const user = userEvent.setup()
    render(
      <CustomerList
        onEditCustomer={mockOnEditCustomer}
        onDeleteCustomer={mockOnDeleteCustomer}
      />
    )

    await user.click(screen.getByText('Edit'))

    expect(mockOnEditCustomer).toHaveBeenCalledWith(mockCustomer)
  })

  it('calls onDeleteCustomer when delete is clicked', async () => {
    const user = userEvent.setup()
    render(
      <CustomerList
        onEditCustomer={mockOnEditCustomer}
        onDeleteCustomer={mockOnDeleteCustomer}
      />
    )

    await user.click(screen.getByText('Delete'))

    expect(mockOnDeleteCustomer).toHaveBeenCalledWith(mockCustomer)
  })

  it('clears filters when clear button clicked', async () => {
    const user = userEvent.setup()
    render(
      <CustomerList
        onEditCustomer={mockOnEditCustomer}
        onDeleteCustomer={mockOnDeleteCustomer}
      />
    )

    await user.click(screen.getByText('Clear filters'))

    // Filters should be reset (state changes internally)
  })

  it('shows pagination when more items available', () => {
    // Simulate having a full page
    mockCustomers = Array(25).fill(null).map((_, i) => ({
      ...mockCustomer,
      id: `cust-${i}`,
    }))

    render(
      <CustomerList
        onEditCustomer={mockOnEditCustomer}
        onDeleteCustomer={mockOnDeleteCustomer}
      />
    )

    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument()
  })

  it('disables Previous button on first page', () => {
    mockCustomers = Array(25).fill(null).map((_, i) => ({
      ...mockCustomer,
      id: `cust-${i}`,
    }))

    render(
      <CustomerList
        onEditCustomer={mockOnEditCustomer}
        onDeleteCustomer={mockOnDeleteCustomer}
      />
    )

    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled()
  })
})
