import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EditCustomerModal from '@/components/customers/edit-customer-modal'
import type { Customer } from '@/types/database'

// Mock CustomerForm
vi.mock('@/components/customers/customer-form', () => ({
  default: ({ customer, onSubmit, onCancel, submitLabel }: any) => (
    <div data-testid="customer-form">
      <span>Editing: {customer.name}</span>
      <span>{submitLabel}</span>
      <button onClick={() => onSubmit({ name: 'Updated' })}>Submit</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}))

// Mock DeleteCustomerDialog
vi.mock('@/components/customers/delete-customer-dialog', () => ({
  default: ({ open, customer }: any) => (
    open ? <div data-testid="delete-dialog">Delete {customer.name}</div> : null
  ),
}))

// Mock useUpdateCustomer
const mockMutateAsync = vi.fn()
vi.mock('@/lib/hooks/use-customers', () => ({
  useUpdateCustomer: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
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

describe('EditCustomerModal', () => {
  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders dialog title', () => {
    render(
      <EditCustomerModal
        customer={mockCustomer}
        open={true}
        onClose={mockOnClose}
      />
    )

    expect(screen.getByText('Edit Customer')).toBeInTheDocument()
  })

  it('renders CustomerForm with customer data', () => {
    render(
      <EditCustomerModal
        customer={mockCustomer}
        open={true}
        onClose={mockOnClose}
      />
    )

    expect(screen.getByTestId('customer-form')).toBeInTheDocument()
    expect(screen.getByText('Editing: John Doe')).toBeInTheDocument()
  })

  it('shows Update Customer button label', () => {
    render(
      <EditCustomerModal
        customer={mockCustomer}
        open={true}
        onClose={mockOnClose}
      />
    )

    expect(screen.getByText('Update Customer')).toBeInTheDocument()
  })

  it('renders Delete button', () => {
    render(
      <EditCustomerModal
        customer={mockCustomer}
        open={true}
        onClose={mockOnClose}
      />
    )

    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
  })

  it('shows delete dialog when delete button is clicked', async () => {
    const user = userEvent.setup()
    render(
      <EditCustomerModal
        customer={mockCustomer}
        open={true}
        onClose={mockOnClose}
      />
    )

    await user.click(screen.getByRole('button', { name: /delete/i }))

    expect(screen.getByTestId('delete-dialog')).toBeInTheDocument()
  })

  it('does not render when open is false', () => {
    render(
      <EditCustomerModal
        customer={mockCustomer}
        open={false}
        onClose={mockOnClose}
      />
    )

    expect(screen.queryByText('Edit Customer')).not.toBeInTheDocument()
  })
})
