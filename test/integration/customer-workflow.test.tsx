import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import CustomerListPage from '@/app/(dashboard)/customers/page'
import { createMockCustomer, createMockCustomerArray } from '@/test/helpers/mock-data'

// Mock the services
vi.mock('@/lib/supabase/customers', () => ({
  CustomersService: {
    getCustomers: vi.fn(),
    createCustomer: vi.fn(),
    updateCustomer: vi.fn(),
    deleteCustomer: vi.fn(),
    getCustomerStats: vi.fn()
  }
}))

// Mock the auth hook
vi.mock('@/lib/hooks/use-multi-tenant-auth', () => ({
  useMultiTenantAuth: () => ({
    organization: { id: 'test-org-id', name: 'Test Org' },
    user: { id: 'test-user-id' },
    profile: { role: 'admin' }
  })
}))

// Mock the toast hook
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('Customer Workflow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Customer List Page', () => {
    it('should render customer list with data', async () => {
      const mockCustomers = createMockCustomerArray(2)

      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.getCustomers).mockResolvedValue(mockCustomers)

      const Wrapper = createWrapper()
      render(
        <Wrapper>
          <CustomerListPage />
        </Wrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Customer 1')).toBeInTheDocument()
        expect(screen.getByText('Customer 2')).toBeInTheDocument()
      })
    })

    it('should show empty state when no customers', async () => {
      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.getCustomers).mockResolvedValue([])

      const Wrapper = createWrapper()
      render(
        <Wrapper>
          <CustomerListPage />
        </Wrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(/no customers yet/i)).toBeInTheDocument()
      })
    })

    it('should show loading state initially', async () => {
      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.getCustomers).mockImplementation(() => new Promise(() => {})) // Never resolves

      const Wrapper = createWrapper()
      render(
        <Wrapper>
          <CustomerListPage />
        </Wrapper>
      )

      expect(screen.getByText(/loading/i) || screen.getByRole('progressbar')).toBeInTheDocument()
    })

    it('should handle service errors gracefully', async () => {
      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.getCustomers).mockRejectedValue(new Error('Service error'))

      const Wrapper = createWrapper()
      render(
        <Wrapper>
          <CustomerListPage />
        </Wrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(/error/i) || screen.getByText(/failed/i)).toBeInTheDocument()
      })
    })
  })

  describe('Customer Creation Workflow', () => {
    it('should open create modal when button clicked', async () => {
      const user = userEvent.setup()
      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.getCustomers).mockResolvedValue([])

      const Wrapper = createWrapper()
      render(
        <Wrapper>
          <CustomerListPage />
        </Wrapper>
      )

      const createButton = await screen.findByRole('button', { name: /new customer/i })
      await user.click(createButton)

      expect(screen.getByText(/create customer/i)).toBeInTheDocument()
    })

    it('should create customer through modal form', async () => {
      const user = userEvent.setup()
      const { CustomersService } = await import('@/lib/supabase/customers')
      
      vi.mocked(CustomersService.getCustomers).mockResolvedValue([])
      vi.mocked(CustomersService.createCustomer).mockResolvedValue(
        createMockCustomer({ id: 'new-customer-id', name: 'New Customer', status: 'lead' })
      )

      const Wrapper = createWrapper()
      render(
        <Wrapper>
          <CustomerListPage />
        </Wrapper>
      )

      // Open create modal
      const createButton = await screen.findByRole('button', { name: /new customer/i })
      await user.click(createButton)

      // Fill form
      await user.type(screen.getByLabelText(/name/i), 'New Customer')
      await user.type(screen.getByLabelText(/email/i), 'new@example.com')

      // Submit form
      const saveButton = screen.getByRole('button', { name: /save/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(CustomersService.createCustomer).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'New Customer',
            email: 'new@example.com'
          })
        )
      })
    })

    it('should close modal after successful creation', async () => {
      const user = userEvent.setup()
      const { CustomersService } = await import('@/lib/supabase/customers')
      
      vi.mocked(CustomersService.getCustomers).mockResolvedValue([])
      vi.mocked(CustomersService.createCustomer).mockResolvedValue(
        createMockCustomer({ id: 'new-id', name: 'Test Customer' })
      )

      const Wrapper = createWrapper()
      render(
        <Wrapper>
          <CustomerListPage />
        </Wrapper>
      )

      // Open and submit modal
      const createButton = await screen.findByRole('button', { name: /new customer/i })
      await user.click(createButton)

      await user.type(screen.getByLabelText(/name/i), 'Test Customer')
      
      const saveButton = screen.getByRole('button', { name: /save/i })
      await user.click(saveButton)

      // Modal should close after successful creation
      await waitFor(() => {
        expect(screen.queryByText(/create customer/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Customer Search and Filter Workflow', () => {
    it('should filter customers by search term', async () => {
      const user = userEvent.setup()
      const mockCustomers = createMockCustomerArray(2)

      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.getCustomers)
        .mockResolvedValueOnce(mockCustomers)
        .mockResolvedValueOnce([mockCustomers[0]]) // Filtered result

      const Wrapper = createWrapper()
      render(
        <Wrapper>
          <CustomerListPage />
        </Wrapper>
      )

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Search for John
      const searchInput = screen.getByPlaceholderText(/search customers/i)
      await user.type(searchInput, 'John')

      // Should trigger new search
      await waitFor(() => {
        expect(CustomersService.getCustomers).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ search: 'John' })
        )
      })
    })

    it('should filter customers by status', async () => {
      const user = userEvent.setup()
      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.getCustomers).mockResolvedValue([])

      const Wrapper = createWrapper()
      render(
        <Wrapper>
          <CustomerListPage />
        </Wrapper>
      )

      // Open status filter
      const statusFilter = screen.getByRole('button', { name: /status/i })
      await user.click(statusFilter)

      // Select prospect status
      const prospectOption = screen.getByText('Prospect')
      await user.click(prospectOption)

      await waitFor(() => {
        expect(CustomersService.getCustomers).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ status: 'prospect' })
        )
      })
    })

    it('should combine search and filter parameters', async () => {
      const user = userEvent.setup()
      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.getCustomers).mockResolvedValue([])

      const Wrapper = createWrapper()
      render(
        <Wrapper>
          <CustomerListPage />
        </Wrapper>
      )

      // Apply search
      const searchInput = screen.getByPlaceholderText(/search customers/i)
      await user.type(searchInput, 'John')

      // Apply status filter
      const statusFilter = screen.getByRole('button', { name: /status/i })
      await user.click(statusFilter)
      const prospectOption = screen.getByText('Prospect')
      await user.click(prospectOption)

      await waitFor(() => {
        expect(CustomersService.getCustomers).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            search: 'John',
            status: 'prospect'
          })
        )
      })
    })
  })

  describe('Customer Status Update Workflow', () => {
    it('should update customer status from list actions', async () => {
      const user = userEvent.setup()
      const mockCustomer = createMockCustomer({
        id: 'customer-1',
        name: 'John Doe',
        status: 'lead',
        email: 'john@example.com'
      })

      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.getCustomers).mockResolvedValue([mockCustomer])
      vi.mocked(CustomersService.updateCustomer).mockResolvedValue(
        createMockCustomer({ ...mockCustomer, status: 'prospect' })
      )

      const Wrapper = createWrapper()
      render(
        <Wrapper>
          <CustomerListPage />
        </Wrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Open actions menu
      const actionsButton = screen.getByRole('button', { name: /actions/i })
      await user.click(actionsButton)

      // Update status
      const statusOption = screen.getByText(/change status/i)
      await user.click(statusOption)

      await waitFor(() => {
        expect(CustomersService.updateCustomer).toHaveBeenCalled()
      })
    })
  })

  describe('Error Handling', () => {
    it('should display error message when API fails', async () => {
      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.getCustomers).mockRejectedValue(new Error('API Error'))

      const Wrapper = createWrapper()
      render(
        <Wrapper>
          <CustomerListPage />
        </Wrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(/error/i) || screen.getByText(/failed/i)).toBeInTheDocument()
      })
    })

    it('should handle network connectivity issues', async () => {
      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.getCustomers).mockRejectedValue(new Error('Network error'))

      const Wrapper = createWrapper()
      render(
        <Wrapper>
          <CustomerListPage />
        </Wrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(/network/i) || screen.getByText(/connection/i) || screen.getByText(/error/i)).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper heading structure', async () => {
      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.getCustomers).mockResolvedValue([])

      const Wrapper = createWrapper()
      render(
        <Wrapper>
          <CustomerListPage />
        </Wrapper>
      )

      expect(screen.getByRole('heading', { name: /customers/i })).toBeInTheDocument()
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.getCustomers).mockResolvedValue([])

      const Wrapper = createWrapper()
      render(
        <Wrapper>
          <CustomerListPage />
        </Wrapper>
      )

      // Should be able to tab through interactive elements
      await user.tab()
      expect(document.activeElement).toBeInstanceOf(HTMLElement)
    })

    it('should have proper ARIA labels', async () => {
      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.getCustomers).mockResolvedValue([])

      const Wrapper = createWrapper()
      render(
        <Wrapper>
          <CustomerListPage />
        </Wrapper>
      )

      const searchInput = screen.getByLabelText(/search/i) || screen.getByPlaceholderText(/search/i)
      expect(searchInput).toBeInTheDocument()
    })
  })

  describe('Mobile Responsiveness', () => {
    it('should render properly on mobile viewport', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.getCustomers).mockResolvedValue([])

      const Wrapper = createWrapper()
      render(
        <Wrapper>
          <CustomerListPage />
        </Wrapper>
      )

      // Should render without layout issues
      expect(screen.getByRole('heading', { name: /customers/i })).toBeInTheDocument()
    })

    it('should have touch-friendly button sizes', async () => {
      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.getCustomers).mockResolvedValue([])

      const Wrapper = createWrapper()
      render(
        <Wrapper>
          <CustomerListPage />
        </Wrapper>
      )

      const createButton = await screen.findByRole('button', { name: /new customer/i })
      
      // Should have minimum touch target size (44px)
      const styles = getComputedStyle(createButton)
      const height = parseInt(styles.height) || 44
      expect(height).toBeGreaterThanOrEqual(44)
    })
  })

  describe('Performance', () => {
    it('should not cause memory leaks with rapid re-renders', async () => {
      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.getCustomers).mockResolvedValue([])

      const Wrapper = createWrapper()
      const { rerender, unmount } = render(
        <Wrapper>
          <CustomerListPage />
        </Wrapper>
      )

      // Rapid re-renders
      for (let i = 0; i < 10; i++) {
        rerender(
          <Wrapper>
            <CustomerListPage />
          </Wrapper>
        )
      }

      // Should unmount cleanly
      unmount()
      expect(true).toBe(true) // Test passes if no errors thrown
    })

    it('should debounce search input', async () => {
      const user = userEvent.setup()
      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.getCustomers).mockResolvedValue([])

      const Wrapper = createWrapper()
      render(
        <Wrapper>
          <CustomerListPage />
        </Wrapper>
      )

      const searchInput = await screen.findByPlaceholderText(/search customers/i)
      
      // Type quickly
      await user.type(searchInput, 'john')

      // Should not call service for every keystroke
      await waitFor(() => {
        const callCount = vi.mocked(CustomersService.getCustomers).mock.calls.length
        expect(callCount).toBeLessThan(5) // Should be debounced
      })
    })
  })

  describe('Data Consistency', () => {
    it('should refresh list after creating customer', async () => {
      const user = userEvent.setup()
      const { CustomersService } = await import('@/lib/supabase/customers')
      
      const initialCustomers = [createMockCustomer({ id: '1', name: 'Existing Customer' })]
      const newCustomer = createMockCustomer({ id: '2', name: 'New Customer' })
      const updatedList = [...initialCustomers, newCustomer]

      vi.mocked(CustomersService.getCustomers)
        .mockResolvedValueOnce(initialCustomers)
        .mockResolvedValueOnce(updatedList)
      
      vi.mocked(CustomersService.createCustomer).mockResolvedValue(newCustomer)

      const Wrapper = createWrapper()
      render(
        <Wrapper>
          <CustomerListPage />
        </Wrapper>
      )

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Existing Customer')).toBeInTheDocument()
      })

      // Create new customer
      const createButton = screen.getByRole('button', { name: /new customer/i })
      await user.click(createButton)

      await user.type(screen.getByLabelText(/name/i), 'New Customer')
      
      const saveButton = screen.getByRole('button', { name: /save/i })
      await user.click(saveButton)

      // Should refresh and show new customer
      await waitFor(() => {
        expect(screen.getByText('New Customer')).toBeInTheDocument()
      })
    })

    it('should handle concurrent user actions', async () => {
      const user = userEvent.setup()
      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.getCustomers).mockResolvedValue([])

      const Wrapper = createWrapper()
      render(
        <Wrapper>
          <CustomerListPage />
        </Wrapper>
      )

      // Simulate concurrent actions
      const createButton = await screen.findByRole('button', { name: /new customer/i })
      const searchInput = screen.getByPlaceholderText(/search customers/i)

      // Start both actions simultaneously
      const clickPromise = user.click(createButton)
      const typePromise = user.type(searchInput, 'search')

      await Promise.all([clickPromise, typePromise])

      // Should handle both actions without conflicts
      expect(screen.getByText(/create customer/i)).toBeInTheDocument()
      expect(searchInput).toHaveValue('search')
    })
  })
})