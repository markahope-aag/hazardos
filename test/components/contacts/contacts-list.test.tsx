import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { ContactsList } from '@/components/contacts/contacts-list'

// Mock fetch
global.fetch = vi.fn()

// Mock useToast
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

const mockContacts = [
  {
    id: '1',
    customer_id: 'cust-1',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '555-1234',
    mobile: '555-5678',
    title: 'CEO',
    role: 'primary' as const,
    is_primary: true,
    notes: 'Primary contact for all matters',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
  {
    id: '2',
    customer_id: 'cust-1',
    name: 'Jane Smith',
    email: 'jane@example.com',
    phone: '555-9999',
    mobile: null,
    title: 'Accountant',
    role: 'billing' as const,
    is_primary: false,
    notes: null,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
]

describe('ContactsList Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockContacts),
    })
  })

  it('should render without crashing', () => {
    expect(() => render(<ContactsList customerId="cust-1" />)).not.toThrow()
  })

  it('should display Contacts title', async () => {
    render(<ContactsList customerId="cust-1" />)

    await waitFor(() => {
      expect(screen.getByText('Contacts')).toBeInTheDocument()
    })
  })

  it('should show loading state initially', () => {
    render(<ContactsList customerId="cust-1" />)
    // While loading, should not show contacts yet
    expect(screen.getByText('Contacts')).toBeInTheDocument()
  })

  it('should display contacts after loading', async () => {
    render(<ContactsList customerId="cust-1" />)

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })
  })

  it('should display Add Contact button', async () => {
    render(<ContactsList customerId="cust-1" />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add contact/i })).toBeInTheDocument()
    })
  })

  it('should display contact count badge', async () => {
    render(<ContactsList customerId="cust-1" />)

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument()
    })
  })

  it('should display contact emails', async () => {
    render(<ContactsList customerId="cust-1" />)

    await waitFor(() => {
      expect(screen.getByText('john@example.com')).toBeInTheDocument()
      expect(screen.getByText('jane@example.com')).toBeInTheDocument()
    })
  })

  it('should display contact phone numbers', async () => {
    render(<ContactsList customerId="cust-1" />)

    await waitFor(() => {
      expect(screen.getByText('555-1234')).toBeInTheDocument()
      expect(screen.getByText('555-9999')).toBeInTheDocument()
    })
  })

  it('should display contact titles', async () => {
    render(<ContactsList customerId="cust-1" />)

    await waitFor(() => {
      expect(screen.getByText('CEO')).toBeInTheDocument()
      expect(screen.getByText('Accountant')).toBeInTheDocument()
    })
  })

  it('should display contact notes', async () => {
    render(<ContactsList customerId="cust-1" />)

    await waitFor(() => {
      expect(screen.getByText('Primary contact for all matters')).toBeInTheDocument()
    })
  })

  it('should display role badges', async () => {
    render(<ContactsList customerId="cust-1" />)

    await waitFor(() => {
      expect(screen.getByText('Primary')).toBeInTheDocument()
      expect(screen.getByText('Billing')).toBeInTheDocument()
    })
  })

  it('should display empty state when no contacts', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    })

    render(<ContactsList customerId="cust-1" />)

    await waitFor(() => {
      expect(screen.getByText('No contacts added yet')).toBeInTheDocument()
      expect(screen.getByText('Add the first contact')).toBeInTheDocument()
    })
  })

  it('should fetch contacts for the correct customer', async () => {
    render(<ContactsList customerId="test-customer-123" />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/customers/test-customer-123/contacts')
    })
  })
})
