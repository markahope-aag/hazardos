import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DeleteCustomerDialog from '@/components/customers/delete-customer-dialog'
import type { Customer } from '@/types/database'

// Mock useDeleteCustomer
const mockMutateAsync = vi.fn()
vi.mock('@/lib/hooks/use-customers', () => ({
  useDeleteCustomer: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}))

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
      }),
    }),
  }),
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

describe('DeleteCustomerDialog', () => {
  const mockOnClose = vi.fn()
  const mockOnSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders dialog title', () => {
    render(
      <DeleteCustomerDialog
        customer={mockCustomer}
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    expect(screen.getByText('Delete Customer')).toBeInTheDocument()
  })

  it('shows customer name in confirmation message', () => {
    render(
      <DeleteCustomerDialog
        customer={mockCustomer}
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('shows company name if provided', () => {
    render(
      <DeleteCustomerDialog
        customer={mockCustomer}
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    expect(screen.getByText(/Acme Inc/)).toBeInTheDocument()
  })

  it('renders Cancel button', () => {
    render(
      <DeleteCustomerDialog
        customer={mockCustomer}
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('renders Delete Customer button', () => {
    render(
      <DeleteCustomerDialog
        customer={mockCustomer}
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    expect(screen.getByRole('button', { name: /delete customer/i })).toBeInTheDocument()
  })

  it('calls mutateAsync when delete is clicked', async () => {
    const user = userEvent.setup()
    mockMutateAsync.mockResolvedValue({})

    render(
      <DeleteCustomerDialog
        customer={mockCustomer}
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    await user.click(screen.getByRole('button', { name: /delete customer/i }))

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith('cust-1')
    })
  })

  it('calls onSuccess after successful deletion', async () => {
    const user = userEvent.setup()
    mockMutateAsync.mockResolvedValue({})

    render(
      <DeleteCustomerDialog
        customer={mockCustomer}
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    await user.click(screen.getByRole('button', { name: /delete customer/i }))

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled()
    })
  })

  it('does not render when open is false', () => {
    render(
      <DeleteCustomerDialog
        customer={mockCustomer}
        open={false}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    expect(screen.queryByText('Delete Customer')).not.toBeInTheDocument()
  })
})
