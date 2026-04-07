import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CustomerDetail from '@/components/customers/customer-detail'
import type { Customer } from '@/types/database'

// Mock the hooks and components
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: any) => <a href={href} {...rest}>{children}</a>,
}))

vi.mock('@/lib/hooks/use-customers', () => ({
  useUpdateCustomer: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
  useUpdateCustomerStatus: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
  }),
}))

vi.mock('@/components/customers/customer-status-badge', () => ({
  default: ({ status }: { status: string }) => (
    <span data-testid="status-badge">{status}</span>
  ),
}))

vi.mock('@/components/customers/customer-surveys-list', () => ({
  default: ({ customerId }: { customerId: string }) => (
    <div data-testid="customer-surveys-list">Surveys for: {customerId}</div>
  ),
}))

vi.mock('@/components/customers/customer-activity-feed', () => ({
  default: ({ customer }: { customer: Customer }) => (
    <div data-testid="customer-activity-feed">Activity for: {customer.name}</div>
  ),
}))

vi.mock('@/components/customers/edit-customer-modal', () => ({
  default: ({ customer, open, onClose }: { customer: Customer; open: boolean; onClose: () => void }) => (
    open ? (
      <div data-testid="edit-modal">
        <div>Edit {customer.name}</div>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
  ),
}))

vi.mock('@/components/customers/delete-customer-dialog', () => ({
  default: ({ customer, open, onClose, onSuccess }: {
    customer: Customer;
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
  }) => (
    open ? (
      <div data-testid="delete-dialog">
        <div>Delete {customer.name}</div>
        <button onClick={onClose}>Cancel</button>
        <button onClick={onSuccess}>Confirm Delete</button>
      </div>
    ) : null
  ),
}))

const mockCustomer: Customer = {
  id: 'customer-1',
  organization_id: 'org-1',
  name: 'John Doe',
  first_name: 'John',
  last_name: 'Doe',
  company_name: 'Acme Corp',
  email: 'john@acme.com',
  phone: '+1-555-0123',
  address_line1: '123 Main St',
  address_line2: 'Suite 100',
  city: 'New York',
  state: 'NY',
  zip: '10001',
  status: 'lead',
  source: 'website',
  contact_type: 'residential',
  communication_preferences: { email: true, sms: false, mail: false },
  marketing_consent: true,
  marketing_consent_date: '2024-01-01',
  notes: 'This is a test customer with some notes.',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  created_by: 'user-1',
}

describe('CustomerDetail Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render customer information', () => {
    render(<CustomerDetail customer={mockCustomer} />)

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    expect(screen.getByTestId('status-badge')).toHaveTextContent('lead')
  })

  it('should render back button', () => {
    render(<CustomerDetail customer={mockCustomer} />)

    const backButton = screen.getByRole('button', { name: /back to contacts/i })
    expect(backButton).toBeInTheDocument()
  })

  it('should render edit button', () => {
    render(<CustomerDetail customer={mockCustomer} />)

    // There are multiple edit buttons (header + notes). Verify at least one exists.
    const editButtons = screen.getAllByRole('button', { name: /edit/i })
    expect(editButtons.length).toBeGreaterThanOrEqual(1)
  })

  it('should render status dropdown', () => {
    render(<CustomerDetail customer={mockCustomer} />)

    const statusButton = screen.getByRole('button', { name: /status/i })
    expect(statusButton).toBeInTheDocument()
  })

  it('should show edit modal when edit button is clicked', async () => {
    const user = userEvent.setup()
    render(<CustomerDetail customer={mockCustomer} />)

    // Find the edit button (the first one in the header)
    const editButtons = screen.getAllByRole('button', { name: /edit/i })
    await user.click(editButtons[0])

    expect(screen.getByTestId('edit-modal')).toBeInTheDocument()
    expect(screen.getByText('Edit John Doe')).toBeInTheDocument()
  })

  it('should close edit modal', async () => {
    const user = userEvent.setup()
    render(<CustomerDetail customer={mockCustomer} />)

    // Open modal
    const editButtons = screen.getAllByRole('button', { name: /edit/i })
    await user.click(editButtons[0])
    expect(screen.getByTestId('edit-modal')).toBeInTheDocument()

    // Close modal
    const closeButton = screen.getByText('Close')
    await user.click(closeButton)
    expect(screen.queryByTestId('edit-modal')).not.toBeInTheDocument()
  })

  it('should show status change options in dropdown', async () => {
    const user = userEvent.setup()
    render(<CustomerDetail customer={mockCustomer} />)

    const statusButton = screen.getByRole('button', { name: /status/i })
    await user.click(statusButton)

    await waitFor(() => {
      expect(screen.getByText('Change Status')).toBeInTheDocument()
      expect(screen.getByText('Delete')).toBeInTheDocument()
    })
  })

  it('should show delete dialog when delete option is selected', async () => {
    const user = userEvent.setup()
    render(<CustomerDetail customer={mockCustomer} />)

    // Open status dropdown
    const statusButton = screen.getByRole('button', { name: /status/i })
    await user.click(statusButton)

    // Click delete option
    await waitFor(async () => {
      const deleteOption = screen.getByText('Delete')
      await user.click(deleteOption)
    })

    expect(screen.getByTestId('delete-dialog')).toBeInTheDocument()
    expect(screen.getByText('Delete John Doe')).toBeInTheDocument()
  })

  it('should render customer notes in overview tab', () => {
    render(<CustomerDetail customer={mockCustomer} />)

    expect(screen.getByText('Notes')).toBeInTheDocument()
    expect(screen.getByText('This is a test customer with some notes.')).toBeInTheDocument()
  })

  it('should render surveys list in overview tab', () => {
    render(<CustomerDetail customer={mockCustomer} />)

    expect(screen.getByTestId('customer-surveys-list')).toBeInTheDocument()
  })

  it('should render tab navigation', () => {
    render(<CustomerDetail customer={mockCustomer} />)

    expect(screen.getByText('Overview')).toBeInTheDocument()
    expect(screen.getByText('Activity')).toBeInTheDocument()
    expect(screen.getByText('Opportunities')).toBeInTheDocument()
    expect(screen.getByText('Jobs')).toBeInTheDocument()
  })

  it('should handle customer without company name', () => {
    const customerWithoutCompany = { ...mockCustomer, company_name: null }
    render(<CustomerDetail customer={customerWithoutCompany} />)

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.queryByText('Acme Corp')).not.toBeInTheDocument()
  })

  it('should have proper accessibility attributes', () => {
    render(<CustomerDetail customer={mockCustomer} />)

    const mainHeading = screen.getByRole('heading', { level: 1 })
    expect(mainHeading).toHaveTextContent('John Doe')
  })

  it('should render with minimal customer data', () => {
    const minimalCustomer: Customer = {
      id: 'customer-2',
      organization_id: 'org-1',
      name: 'Jane Smith',
      first_name: 'Jane',
      last_name: 'Smith',
      company_name: null,
      email: null,
      phone: null,
      address_line1: null,
      address_line2: null,
      city: null,
      state: null,
      zip: null,
      status: 'prospect',
      source: null,
      contact_type: 'residential',
      communication_preferences: { email: true, sms: false, mail: false },
      marketing_consent: false,
      marketing_consent_date: null,
      notes: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      created_by: 'user-1',
    }

    render(<CustomerDetail customer={minimalCustomer} />)

    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
  })
})
