import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ContactDialog } from '@/components/contacts/contact-dialog'

// Mock useToast
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

// Mock Select components to avoid Radix UI issues with empty string values
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="select" data-value={value}>
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: any) => <button type="button">{children}</button>,
  SelectValue: () => <span>Select...</span>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => (
    <div data-value={value}>{children}</div>
  ),
}))

// Mock fetch
global.fetch = vi.fn()

describe('ContactDialog', () => {
  const mockOnClose = vi.fn()
  const mockOnSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    })
  })

  it('renders Add Contact title when no contact provided', () => {
    render(
      <ContactDialog
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        customerId="cust-1"
      />
    )

    expect(screen.getByRole('heading', { name: 'Add Contact' })).toBeInTheDocument()
  })

  it('renders Edit Contact title when contact is provided', () => {
    const contact = {
      id: 'contact-1',
      customer_id: 'cust-1',
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '555-1234',
      mobile: '555-5678',
      title: 'Manager',
      role: 'general' as const,
      is_primary: false,
      preferred_contact_method: null,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    render(
      <ContactDialog
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        customerId="cust-1"
        contact={contact}
      />
    )

    expect(screen.getByRole('heading', { name: 'Edit Contact' })).toBeInTheDocument()
  })

  it('renders name input field', () => {
    render(
      <ContactDialog
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        customerId="cust-1"
      />
    )

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
  })

  it('renders email input field', () => {
    render(
      <ContactDialog
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        customerId="cust-1"
      />
    )

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
  })

  it('renders phone input field', () => {
    render(
      <ContactDialog
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        customerId="cust-1"
      />
    )

    expect(screen.getByLabelText(/^phone$/i)).toBeInTheDocument()
  })

  it('renders Cancel button', () => {
    render(
      <ContactDialog
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        customerId="cust-1"
      />
    )

    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('renders Add Contact submit button', () => {
    render(
      <ContactDialog
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        customerId="cust-1"
      />
    )

    expect(screen.getByRole('button', { name: /add contact/i })).toBeInTheDocument()
  })

  it('shows error when name is empty on submit', async () => {
    const user = userEvent.setup()
    render(
      <ContactDialog
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        customerId="cust-1"
      />
    )

    await user.click(screen.getByRole('button', { name: /add contact/i }))

    expect(screen.getByText('Name is required')).toBeInTheDocument()
  })

  it('renders primary contact checkbox', () => {
    render(
      <ContactDialog
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        customerId="cust-1"
      />
    )

    expect(screen.getByLabelText(/set as primary contact/i)).toBeInTheDocument()
  })

  it('does not render when open is false', () => {
    render(
      <ContactDialog
        open={false}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        customerId="cust-1"
      />
    )

    expect(screen.queryByText('Add Contact')).not.toBeInTheDocument()
  })
})
