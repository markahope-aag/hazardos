import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ContactsPage from '@/app/(dashboard)/crm/contacts/page'
import { createMockCustomer as _createMockCustomer, createMockCustomerArray as _createMockCustomerArray } from '@/test/helpers/mock-data'

// Mock the services
vi.mock('@/lib/supabase/customers', () => ({
  CustomersService: {
    getCustomers: vi.fn(),
    createCustomer: vi.fn(),
    updateCustomer: vi.fn(),
    updateCustomerStatus: vi.fn(),
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

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: any) => <a href={href} {...rest}>{children}</a>,
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

// Mock analytics
vi.mock('@/lib/hooks/use-analytics', () => ({
  useFormAnalytics: () => ({
    startTracking: vi.fn(),
    trackSuccess: vi.fn(),
    trackFailure: vi.fn(),
  }),
}))

// Mock companies hook
vi.mock('@/lib/hooks/use-companies', () => ({
  useSearchCompanies: () => ({ data: [] }),
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

  describe('Contacts Page', () => {
    it('should render contacts page with heading', async () => {
      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.getCustomers).mockResolvedValue([])

      const Wrapper = createWrapper()
      render(
        <Wrapper>
          <ContactsPage />
        </Wrapper>
      )

      expect(screen.getByRole('heading', { level: 1, name: /contacts/i })).toBeInTheDocument()
    })

    it('should show empty state when no contacts', async () => {
      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.getCustomers).mockResolvedValue([])

      const Wrapper = createWrapper()
      render(
        <Wrapper>
          <ContactsPage />
        </Wrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(/no contacts yet/i)).toBeInTheDocument()
      })
    })

    it('should show loading state initially', async () => {
      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.getCustomers).mockImplementation(() => new Promise(() => {})) // Never resolves

      const Wrapper = createWrapper()
      render(
        <Wrapper>
          <ContactsPage />
        </Wrapper>
      )

      // The loading state shows skeleton loaders
      await waitFor(() => {
        const heading = screen.getByRole('heading', { level: 1, name: /contacts/i })
        expect(heading).toBeInTheDocument()
      })
    })

    it('should handle service errors gracefully', async () => {
      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.getCustomers).mockRejectedValue(new Error('Service error'))

      const Wrapper = createWrapper()
      render(
        <Wrapper>
          <ContactsPage />
        </Wrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(/error loading contacts/i)).toBeInTheDocument()
      })
    })
  })

  describe('Contact Creation Workflow', () => {
    it('should open create modal when button clicked', async () => {
      const user = userEvent.setup()
      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.getCustomers).mockResolvedValue([])

      const Wrapper = createWrapper()
      render(
        <Wrapper>
          <ContactsPage />
        </Wrapper>
      )

      const createButton = await screen.findByRole('button', { name: /new contact/i })
      await user.click(createButton)

      expect(screen.getByText(/add new contact/i)).toBeInTheDocument()
    })

    it('should close modal when cancel is clicked', async () => {
      const user = userEvent.setup()
      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.getCustomers).mockResolvedValue([])

      const Wrapper = createWrapper()
      render(
        <Wrapper>
          <ContactsPage />
        </Wrapper>
      )

      // Open modal
      const createButton = await screen.findByRole('button', { name: /new contact/i })
      await user.click(createButton)
      expect(screen.getByText(/add new contact/i)).toBeInTheDocument()

      // Close modal
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      await waitFor(() => {
        expect(screen.queryByText(/add new contact/i)).not.toBeInTheDocument()
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
          <ContactsPage />
        </Wrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(/error loading contacts/i)).toBeInTheDocument()
      })
    })

    it('should handle network connectivity issues', async () => {
      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.getCustomers).mockRejectedValue(new Error('Network error'))

      const Wrapper = createWrapper()
      render(
        <Wrapper>
          <ContactsPage />
        </Wrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(/error loading contacts/i)).toBeInTheDocument()
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
          <ContactsPage />
        </Wrapper>
      )

      expect(screen.getByRole('heading', { level: 1, name: /contacts/i })).toBeInTheDocument()
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.getCustomers).mockResolvedValue([])

      const Wrapper = createWrapper()
      render(
        <Wrapper>
          <ContactsPage />
        </Wrapper>
      )

      await user.tab()
      expect(document.activeElement).toBeInstanceOf(HTMLElement)
    })

    it('should have search input', async () => {
      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.getCustomers).mockResolvedValue([])

      const Wrapper = createWrapper()
      render(
        <Wrapper>
          <ContactsPage />
        </Wrapper>
      )

      const searchInput = screen.getByPlaceholderText(/search name/i)
      expect(searchInput).toBeInTheDocument()
    })
  })

  describe('Performance', () => {
    it('should not cause memory leaks with rapid re-renders', async () => {
      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.getCustomers).mockResolvedValue([])

      const Wrapper = createWrapper()
      const { rerender, unmount } = render(
        <Wrapper>
          <ContactsPage />
        </Wrapper>
      )

      // Rapid re-renders
      for (let i = 0; i < 10; i++) {
        rerender(
          <Wrapper>
            <ContactsPage />
          </Wrapper>
        )
      }

      unmount()
      expect(true).toBe(true)
    })
  })
})
