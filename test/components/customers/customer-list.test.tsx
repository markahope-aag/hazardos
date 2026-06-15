import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithClient } from '@/test/helpers/render-with-client'
import CustomerList from '@/components/customers/customer-list'
import type { Customer } from '@/types/database'

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
  useCustomerStats: () => ({
    data: null,
  }),
}))

vi.mock('@/lib/hooks/use-debounced-value', () => ({
  useDebouncedValue: (value: string) => value,
}))

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: any) => <a href={href} {...rest}>{children}</a>,
}))

const mockCustomer: Customer = {
  id: 'cust-1',
  organization_id: 'org-1',
  name: 'John Doe',
  first_name: 'John',
  last_name: 'Doe',
  company_name: 'Acme Inc',
  email: 'john@example.com',
  phone: '555-1234',
  status: 'active',
  source: 'referral',
  contact_type: 'residential',
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

  it('renders search input', () => {
    renderWithClient(
      <CustomerList
        onEditCustomer={mockOnEditCustomer}
        onDeleteCustomer={mockOnDeleteCustomer}
      />
    )

    expect(screen.getByPlaceholderText(/search name/i)).toBeInTheDocument()
  })

  it('renders table headers', () => {
    renderWithClient(
      <CustomerList
        onEditCustomer={mockOnEditCustomer}
        onDeleteCustomer={mockOnDeleteCustomer}
      />
    )

    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Company')).toBeInTheDocument()
    expect(screen.getByText('Contact')).toBeInTheDocument()
    expect(screen.getByText('Type')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    mockIsLoading = true
    mockCustomers = []

    renderWithClient(
      <CustomerList
        onEditCustomer={mockOnEditCustomer}
        onDeleteCustomer={mockOnDeleteCustomer}
      />
    )

    // Should show skeletons (Skeleton component uses animate-pulse)
    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })

  it('shows empty state when no customers', () => {
    mockCustomers = []

    renderWithClient(
      <CustomerList
        onEditCustomer={mockOnEditCustomer}
        onDeleteCustomer={mockOnDeleteCustomer}
      />
    )

    expect(screen.getByText('No contacts yet')).toBeInTheDocument()
    expect(screen.getByText(/get started by adding/i)).toBeInTheDocument()
  })

  it('shows error state', () => {
    mockError = new Error('Network error')
    mockCustomers = []

    renderWithClient(
      <CustomerList
        onEditCustomer={mockOnEditCustomer}
        onDeleteCustomer={mockOnDeleteCustomer}
      />
    )

    expect(screen.getByText('Error loading contacts')).toBeInTheDocument()
    expect(screen.getByText('Network error')).toBeInTheDocument()
  })

  it('renders customer data in rows', () => {
    renderWithClient(
      <CustomerList
        onEditCustomer={mockOnEditCustomer}
        onDeleteCustomer={mockOnDeleteCustomer}
      />
    )

    // Responsive layout renders both a mobile card list and a desktop
    // table, so contact details appear in both variants.
    expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Acme Inc').length).toBeGreaterThan(0)
    expect(screen.getAllByText('john@example.com').length).toBeGreaterThan(0)
  })

  it('shows pagination when more items available', () => {
    mockCustomers = Array(25).fill(null).map((_, i) => ({
      ...mockCustomer,
      id: `cust-${i}`,
    }))

    renderWithClient(
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

    renderWithClient(
      <CustomerList
        onEditCustomer={mockOnEditCustomer}
        onDeleteCustomer={mockOnDeleteCustomer}
      />
    )

    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled()
  })
})
