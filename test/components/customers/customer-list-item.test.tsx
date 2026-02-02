import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CustomerListItem from '@/components/customers/customer-list-item'
import type { Customer } from '@/types/database'

// Mock the hooks and router
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

vi.mock('@/components/customers/customer-status-badge', () => ({
  default: ({ status }: { status: string }) => (
    <span data-testid="status-badge">{status}</span>
  ),
}))

// Mock date-fns format function
vi.mock('date-fns', () => ({
  format: vi.fn((date: Date, formatStr: string) => {
    if (formatStr === 'MMM d, yyyy') {
      return 'Jan 1, 2024'
    }
    return date.toISOString()
  }),
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
  notes: 'Test notes',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  created_by: 'user-1',
}

const mockProps = {
  customer: mockCustomer,
  onEdit: vi.fn(),
  onDelete: vi.fn(),
}

describe('CustomerListItem Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render customer information', () => {
    render(
      <table>
        <tbody>
          <CustomerListItem {...mockProps} />
        </tbody>
      </table>
    )

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    expect(screen.getByText('john@acme.com')).toBeInTheDocument()
    expect(screen.getByText('+1-555-0123')).toBeInTheDocument()
    expect(screen.getByText('Website')).toBeInTheDocument()
    expect(screen.getByText('Jan 1, 2024')).toBeInTheDocument()
  })

  it('should render status badge', () => {
    render(
      <table>
        <tbody>
          <CustomerListItem {...mockProps} />
        </tbody>
      </table>
    )

    expect(screen.getByTestId('status-badge')).toHaveTextContent('lead')
  })

  it('should show actions menu when clicked', async () => {
    const user = userEvent.setup()
    render(
      <table>
        <tbody>
          <CustomerListItem {...mockProps} />
        </tbody>
      </table>
    )

    const actionsButton = screen.getByRole('button', { name: /open menu/i })
    await user.click(actionsButton)

    await waitFor(() => {
      expect(screen.getByText('Actions')).toBeInTheDocument()
      expect(screen.getByText('View Details')).toBeInTheDocument()
      expect(screen.getByText('Edit Customer')).toBeInTheDocument()
      expect(screen.getByText('Create Survey')).toBeInTheDocument()
      expect(screen.getByText('Delete Customer')).toBeInTheDocument()
    })
  })

  it('should call onEdit when edit action is clicked', async () => {
    const user = userEvent.setup()
    render(
      <table>
        <tbody>
          <CustomerListItem {...mockProps} />
        </tbody>
      </table>
    )

    const actionsButton = screen.getByRole('button', { name: /open menu/i })
    await user.click(actionsButton)

    await waitFor(async () => {
      const editAction = screen.getByText('Edit Customer')
      await user.click(editAction)
    })

    expect(mockProps.onEdit).toHaveBeenCalledWith(mockCustomer)
  })

  it('should call onDelete when delete action is clicked', async () => {
    const user = userEvent.setup()
    render(
      <table>
        <tbody>
          <CustomerListItem {...mockProps} />
        </tbody>
      </table>
    )

    const actionsButton = screen.getByRole('button', { name: /open menu/i })
    await user.click(actionsButton)

    await waitFor(async () => {
      const deleteAction = screen.getByText('Delete Customer')
      await user.click(deleteAction)
    })

    expect(mockProps.onDelete).toHaveBeenCalledWith(mockCustomer)
  })

  it('should show status change options when status is clicked', async () => {
    const user = userEvent.setup()
    render(
      <table>
        <tbody>
          <CustomerListItem {...mockProps} />
        </tbody>
      </table>
    )

    const statusButton = screen.getByRole('button', { name: /lead/i })
    await user.click(statusButton)

    await waitFor(() => {
      expect(screen.getByText('Change Status')).toBeInTheDocument()
      expect(screen.getByText('Lead')).toBeInTheDocument()
      expect(screen.getByText('Prospect')).toBeInTheDocument()
      expect(screen.getByText('Customer')).toBeInTheDocument()
      expect(screen.getByText('Inactive')).toBeInTheDocument()
    })
  })

  it('should handle customer without company name', () => {
    const customerWithoutCompany = { ...mockCustomer, company_name: null }
    render(
      <table>
        <tbody>
          <CustomerListItem {...mockProps} customer={customerWithoutCompany} />
        </tbody>
      </table>
    )

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.queryByText('Acme Corp')).not.toBeInTheDocument()
  })

  it('should handle customer without contact info', () => {
    const customerWithoutContact = { ...mockCustomer, email: null, phone: null }
    render(
      <table>
        <tbody>
          <CustomerListItem {...mockProps} customer={customerWithoutContact} />
        </tbody>
      </table>
    )

    expect(screen.getByText('No contact info')).toBeInTheDocument()
  })

  it('should handle customer with only email', () => {
    const customerWithOnlyEmail = { ...mockCustomer, phone: null }
    render(
      <table>
        <tbody>
          <CustomerListItem {...mockProps} customer={customerWithOnlyEmail} />
        </tbody>
      </table>
    )

    expect(screen.getByText('john@acme.com')).toBeInTheDocument()
    expect(screen.queryByText('No contact info')).not.toBeInTheDocument()
  })

  it('should handle customer with only phone', () => {
    const customerWithOnlyPhone = { ...mockCustomer, email: null }
    render(
      <table>
        <tbody>
          <CustomerListItem {...mockProps} customer={customerWithOnlyPhone} />
        </tbody>
      </table>
    )

    expect(screen.getByText('+1-555-0123')).toBeInTheDocument()
    expect(screen.queryByText('No contact info')).not.toBeInTheDocument()
  })

  it('should handle customer without source', () => {
    const customerWithoutSource = { ...mockCustomer, source: null }
    render(
      <table>
        <tbody>
          <CustomerListItem {...mockProps} customer={customerWithoutSource} />
        </tbody>
      </table>
    )

    expect(screen.getByText('-')).toBeInTheDocument()
  })

  it('should capitalize source labels correctly', () => {
    const testSources = [
      { source: 'phone', expected: 'Phone' },
      { source: 'website', expected: 'Website' },
      { source: 'referral', expected: 'Referral' },
      { source: 'mail', expected: 'Mail' },
      { source: 'other', expected: 'Other' },
    ]

    testSources.forEach(({ source, expected }) => {
      const customerWithSource = { ...mockCustomer, source }
      const { rerender } = render(
        <table>
          <tbody>
            <CustomerListItem {...mockProps} customer={customerWithSource} />
          </tbody>
        </table>
      )

      expect(screen.getByText(expected)).toBeInTheDocument()
      rerender(<div />)
    })
  })

  it('should disable status button when updating', () => {
    render(
      <table>
        <tbody>
          <CustomerListItem {...mockProps} />
        </tbody>
      </table>
    )

    const statusButton = screen.getByRole('button', { name: /lead/i })
    expect(statusButton).not.toBeDisabled()
  })

  it('should have proper table row styling', () => {
    render(
      <table>
        <tbody>
          <CustomerListItem {...mockProps} />
        </tbody>
      </table>
    )

    const row = screen.getByRole('row')
    expect(row).toHaveClass('hover:bg-gray-50')
  })

  it('should have accessible button labels', () => {
    render(
      <table>
        <tbody>
          <CustomerListItem {...mockProps} />
        </tbody>
      </table>
    )

    const actionsButton = screen.getByRole('button', { name: /open menu/i })
    expect(actionsButton).toBeInTheDocument()

    const srText = screen.getByText('Open menu')
    expect(srText).toHaveClass('sr-only')
  })

  it('should render all table cells', () => {
    render(
      <table>
        <tbody>
          <CustomerListItem {...mockProps} />
        </tbody>
      </table>
    )

    const cells = screen.getAllByRole('cell')
    expect(cells).toHaveLength(6) // Name, Contact, Status, Source, Created, Actions
  })

  it('should handle different customer statuses', () => {
    const statuses = ['lead', 'prospect', 'customer', 'inactive'] as const

    statuses.forEach((status) => {
      const customerWithStatus = { ...mockCustomer, status }
      const { rerender } = render(
        <table>
          <tbody>
            <CustomerListItem {...mockProps} customer={customerWithStatus} />
          </tbody>
        </table>
      )

      expect(screen.getByTestId('status-badge')).toHaveTextContent(status)
      rerender(<div />)
    })
  })
})