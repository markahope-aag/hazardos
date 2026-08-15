import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CustomerCombobox } from '@/components/customers/customer-combobox'

// Mock the hooks and supabase client
vi.mock('@/lib/hooks/use-multi-tenant-auth', () => ({
  useMultiTenantAuth: () => ({
    organization: { id: 'org-1' },
  }),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null }),
    })),
  }),
}))

// The "Add new contact" option renders CreateCustomerModal, which pulls in
// useCreateCustomer (react-query) even while closed — mock it out so this
// suite doesn't need a QueryClientProvider wrapper.
vi.mock('@/lib/hooks/use-customers', () => ({
  useCreateCustomer: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}))

describe('CustomerCombobox Component', () => {
  const defaultProps = {
    value: '',
    onValueChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // cmdk scrolls the highlighted item into view on open; jsdom doesn't implement it.
    window.HTMLElement.prototype.scrollIntoView = vi.fn()
  })

  it('should render without crashing', () => {
    expect(() => render(<CustomerCombobox {...defaultProps} />)).not.toThrow()
  })

  it('should display default placeholder', () => {
    render(<CustomerCombobox {...defaultProps} />)
    expect(screen.getByText('Select customer...')).toBeInTheDocument()
  })

  it('should display custom placeholder', () => {
    render(<CustomerCombobox {...defaultProps} placeholder="Choose a customer" />)
    expect(screen.getByText('Choose a customer')).toBeInTheDocument()
  })

  it('should render combobox button', () => {
    render(<CustomerCombobox {...defaultProps} />)
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('should be disabled when disabled prop is true', () => {
    render(<CustomerCombobox {...defaultProps} disabled />)
    expect(screen.getByRole('combobox')).toBeDisabled()
  })

  it('should not be disabled by default', () => {
    render(<CustomerCombobox {...defaultProps} />)
    expect(screen.getByRole('combobox')).not.toBeDisabled()
  })

  it('should open dropdown on click', async () => {
    const user = userEvent.setup()

    render(<CustomerCombobox {...defaultProps} />)

    await user.click(screen.getByRole('combobox'))
    expect(screen.getByPlaceholderText('Search customers...')).toBeInTheDocument()
  })

  it('should show "No customers found." when no results', async () => {
    const user = userEvent.setup()

    render(<CustomerCombobox {...defaultProps} />)

    await user.click(screen.getByRole('combobox'))
    // Wait for loading to complete
    expect(screen.getByText('No customers found.')).toBeInTheDocument()
  })

  it('should have proper aria-expanded attribute', () => {
    render(<CustomerCombobox {...defaultProps} />)
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false')
  })

  it('should show search input when opened', async () => {
    const user = userEvent.setup()

    render(<CustomerCombobox {...defaultProps} />)

    await user.click(screen.getByRole('combobox'))
    const searchInput = screen.getByPlaceholderText('Search customers...')
    expect(searchInput).toBeInTheDocument()
    expect(searchInput).toHaveAttribute('type', 'text')
  })

  it('should accept custom className through wrapper', () => {
    const { container } = render(
      <div className="custom-wrapper">
        <CustomerCombobox {...defaultProps} />
      </div>
    )
    expect(container.querySelector('.custom-wrapper')).toBeInTheDocument()
  })
})
