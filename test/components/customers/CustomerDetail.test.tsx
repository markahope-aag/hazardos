import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CustomerDetail from '@/components/customers/CustomerDetail'
import type { Customer } from '@/types/database'

// Mock the hooks and components
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

vi.mock('@/lib/hooks/use-customers', () => ({
  useUpdateCustomerStatus: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
  }),
}))

// Mock child components to focus on CustomerDetail logic
vi.mock('@/components/customers/CustomerInfoCard', () => ({
  default: ({ customer }: { customer: Customer }) => (
    <div data-testid="customer-info-card">Customer Info: {customer.name}</div>
  ),
}))

vi.mock('@/components/customers/CustomerSurveysList', () => ({
  default: ({ customerId }: { customerId: string }) => (
    <div data-testid="customer-surveys-list">Surveys for: {customerId}</div>
  ),
}))

vi.mock('@/components/customers/CustomerActivityFeed', () => ({
  default: ({ customer }: { customer: Customer }) => (
    <div data-testid="customer-activity-feed">Activity for: {customer.name}</div>
  ),
}))

vi.mock('@/components/customers/CustomerStatusBadge', () => ({
  default: ({ status }: { status: string }) => (
    <span data-testid="status-badge">{status}</span>
  ),
}))

vi.mock('@/components/customers/EditCustomerModal', () => ({
  default: ({ customer, open, onClose }: { customer: Customer; open: boolean; onClose: () => void }) => (
    open ? (
      <div data-testid="edit-modal">
        <div>Edit {customer.name}</div>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
  ),
}))

vi.mock('@/components/customers/DeleteCustomerDialog', () => ({
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
    expect(screen.getByText('Source: Website')).toBeInTheDocument()
  })

  it('should render back button', () => {
    render(<CustomerDetail customer={mockCustomer} />)

    const backButton = screen.getByRole('button', { name: /back to customers/i })
    expect(backButton).toBeInTheDocument()
  })

  it('should render edit button', () => {
    render(<CustomerDetail customer={mockCustomer} />)

    const editButton = screen.getByRole('button', { name: /edit/i })
    expect(editButton).toBeInTheDocument()
  })

  it('should render change status dropdown', () => {
    render(<CustomerDetail customer={mockCustomer} />)

    const statusButton = screen.getByRole('button', { name: /change status/i })
    expect(statusButton).toBeInTheDocument()
  })

  it('should show edit modal when edit button is clicked', async () => {
    const user = userEvent.setup()
    render(<CustomerDetail customer={mockCustomer} />)

    const editButton = screen.getByRole('button', { name: /edit/i })
    await user.click(editButton)

    expect(screen.getByTestId('edit-modal')).toBeInTheDocument()
    expect(screen.getByText('Edit John Doe')).toBeInTheDocument()
  })

  it('should close edit modal', async () => {
    const user = userEvent.setup()
    render(<CustomerDetail customer={mockCustomer} />)

    // Open modal
    const editButton = screen.getByRole('button', { name: /edit/i })
    await user.click(editButton)
    expect(screen.getByTestId('edit-modal')).toBeInTheDocument()

    // Close modal
    const closeButton = screen.getByText('Close')
    await user.click(closeButton)
    expect(screen.queryByTestId('edit-modal')).not.toBeInTheDocument()
  })

  it('should show status change options in dropdown', async () => {
    const user = userEvent.setup()
    render(<CustomerDetail customer={mockCustomer} />)

    const statusButton = screen.getByRole('button', { name: /change status/i })
    await user.click(statusButton)

    await waitFor(() => {
      expect(screen.getByText('Change Status')).toBeInTheDocument()
      expect(screen.getByText('Lead')).toBeInTheDocument()
      expect(screen.getByText('Prospect')).toBeInTheDocument()
      expect(screen.getByText('Customer')).toBeInTheDocument()
      expect(screen.getByText('Inactive')).toBeInTheDocument()
      expect(screen.getByText('Delete Customer')).toBeInTheDocument()
    })
  })

  it('should show delete dialog when delete option is selected', async () => {
    const user = userEvent.setup()
    render(<CustomerDetail customer={mockCustomer} />)

    // Open status dropdown
    const statusButton = screen.getByRole('button', { name: /change status/i })
    await user.click(statusButton)

    // Click delete option
    await waitFor(async () => {
      const deleteOption = screen.getByText('Delete Customer')
      await user.click(deleteOption)
    })

    expect(screen.getByTestId('delete-dialog')).toBeInTheDocument()
    expect(screen.getByText('Delete John Doe')).toBeInTheDocument()
  })

  it('should render customer notes when present', () => {
    render(<CustomerDetail customer={mockCustomer} />)

    expect(screen.getByText('Notes')).toBeInTheDocument()
    expect(screen.getByText('This is a test customer with some notes.')).toBeInTheDocument()
  })

  it('should not render notes section when notes are empty', () => {
    const customerWithoutNotes = { ...mockCustomer, notes: null }
    render(<CustomerDetail customer={customerWithoutNotes} />)

    expect(screen.queryByText('Notes')).not.toBeInTheDocument()
  })

  it('should render child components', () => {
    render(<CustomerDetail customer={mockCustomer} />)

    expect(screen.getByTestId('customer-info-card')).toBeInTheDocument()
    expect(screen.getByTestId('customer-surveys-list')).toBeInTheDocument()
    expect(screen.getByTestId('customer-activity-feed')).toBeInTheDocument()
  })

  it('should handle customer without company name', () => {
    const customerWithoutCompany = { ...mockCustomer, company_name: null }
    render(<CustomerDetail customer={customerWithoutCompany} />)

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.queryByText('Acme Corp')).not.toBeInTheDocument()
  })

  it('should handle customer without source', () => {
    const customerWithoutSource = { ...mockCustomer, source: null }
    render(<CustomerDetail customer={customerWithoutSource} />)

    expect(screen.getByText('Source: Unknown')).toBeInTheDocument()
  })

  it('should capitalize source name', () => {
    const customerWithPhoneSource = { ...mockCustomer, source: 'phone' }
    render(<CustomerDetail customer={customerWithPhoneSource} />)

    expect(screen.getByText('Source: Phone')).toBeInTheDocument()
  })

  it('should disable status button when updating', () => {
    render(<CustomerDetail customer={mockCustomer} />)

    const statusButton = screen.getByRole('button', { name: /change status/i })
    expect(statusButton).not.toBeDisabled()
  })

  it('should have proper accessibility attributes', () => {
    render(<CustomerDetail customer={mockCustomer} />)

    const mainHeading = screen.getByRole('heading', { level: 1 })
    expect(mainHeading).toHaveTextContent('John Doe')

    const notesHeading = screen.getByRole('heading', { level: 2 })
    expect(notesHeading).toHaveTextContent('Notes')
  })

  it('should handle long customer names gracefully', () => {
    const customerWithLongName = {
      ...mockCustomer,
      name: 'This is a very long customer name that should be handled properly in the UI'
    }
    render(<CustomerDetail customer={customerWithLongName} />)

    expect(screen.getByText(customerWithLongName.name)).toBeInTheDocument()
  })

  it('should render with minimal customer data', () => {
    const minimalCustomer: Customer = {
      id: 'customer-2',
      organization_id: 'org-1',
      name: 'Jane Smith',
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
    expect(screen.getByText('Source: Unknown')).toBeInTheDocument()
    expect(screen.queryByText('Notes')).not.toBeInTheDocument()
  })
})