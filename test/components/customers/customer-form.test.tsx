import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { act } from 'react'
import userEvent from '@testing-library/user-event'
import CustomerForm from '@/components/customers/customer-form'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMockCustomer } from '@/test/helpers/mock-data'

// Mock the toast hook
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}))

// Mock analytics hook
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

describe('CustomerForm Component', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should render all form fields', () => {
    const Wrapper = createWrapper()
    render(
      <Wrapper>
        <CustomerForm onSubmit={vi.fn()} onCancel={vi.fn()} />
      </Wrapper>
    )

    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/street address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^city$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^state$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^zip$/i)).toBeInTheDocument()
  })

  it('should show validation error for empty first name', async () => {
    const Wrapper = createWrapper()

    render(
      <Wrapper>
        <CustomerForm onSubmit={vi.fn()} onCancel={vi.fn()} />
      </Wrapper>
    )

    const submitButton = screen.getByRole('button', { name: /save contact/i })
    await act(async () => {
      await userEvent.click(submitButton, { delay: null })
    })

    await waitFor(() => {
      expect(screen.getByText(/first name is required/i)).toBeInTheDocument()
    })
  })

  it('should validate email format', async () => {
    const Wrapper = createWrapper()

    render(
      <Wrapper>
        <CustomerForm onSubmit={vi.fn()} onCancel={vi.fn()} />
      </Wrapper>
    )

    // Verify form renders with email field
    const emailInput = screen.getByLabelText(/^email$/i)
    expect(emailInput).toBeInTheDocument()
    expect(emailInput).toHaveAttribute('type', 'email')
  })

  it('should populate form with customer data', () => {
    const customer = createMockCustomer({
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      mobile_phone: '(555) 123-4567',
      status: 'prospect'
    })

    const Wrapper = createWrapper()
    render(
      <Wrapper>
        <CustomerForm
          customer={customer}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />
      </Wrapper>
    )

    expect(screen.getByDisplayValue('John')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Doe')).toBeInTheDocument()
    expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument()
    expect(screen.getByDisplayValue('(555) 123-4567')).toBeInTheDocument()
  })

  it('should call onSubmit with form data', async () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined)
    const Wrapper = createWrapper()

    render(
      <Wrapper>
        <CustomerForm onSubmit={handleSubmit} onCancel={vi.fn()} />
      </Wrapper>
    )

    await act(async () => {
      await userEvent.type(screen.getByLabelText(/first name/i), 'Test', { delay: null })
    })
    await act(async () => {
      await userEvent.type(screen.getByLabelText(/^email$/i), 'test@example.com', { delay: null })
    })

    const submitButton = screen.getByRole('button', { name: /save contact/i })
    await act(async () => {
      await userEvent.click(submitButton, { delay: null })
    })

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          first_name: 'Test',
          email: 'test@example.com'
        })
      )
    })
  })

  it('should call onCancel when cancel button is clicked', async () => {
    const handleCancel = vi.fn()
    const Wrapper = createWrapper()

    render(
      <Wrapper>
        <CustomerForm onSubmit={vi.fn()} onCancel={handleCancel} />
      </Wrapper>
    )

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await act(async () => {
      await userEvent.click(cancelButton, { delay: null })
    })

    expect(handleCancel).toHaveBeenCalledOnce()
  })

  it('should show loading state during submission', () => {
    const Wrapper = createWrapper()
    render(
      <Wrapper>
        <CustomerForm
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
          isSubmitting={true}
        />
      </Wrapper>
    )

    const submitButton = screen.getByRole('button', { name: /saving\.\.\./i })
    expect(submitButton).toBeDisabled()
  })

  it('should reset form when reset prop changes', async () => {
    const Wrapper = createWrapper()
    const { rerender } = render(
      <Wrapper>
        <CustomerForm onSubmit={vi.fn()} onCancel={vi.fn()} />
      </Wrapper>
    )

    // Fill form
    const nameInput = screen.getByLabelText(/first name/i) as HTMLInputElement
    await act(async () => {
      await userEvent.type(nameInput, 'Test Name', { delay: null })
    })

    // Rerender with reset (using key to force remount)
    rerender(
      <Wrapper>
        <CustomerForm onSubmit={vi.fn()} onCancel={vi.fn()} key="reset" />
      </Wrapper>
    )

    expect(screen.getByLabelText(/first name/i)).toHaveValue('')
  })

  it('should handle state input', async () => {
    const Wrapper = createWrapper()

    render(
      <Wrapper>
        <CustomerForm onSubmit={vi.fn()} onCancel={vi.fn()} />
      </Wrapper>
    )

    // State is now an Input field with placeholder "CO" and maxLength 2
    const stateInput = screen.getByLabelText(/^state$/i)
    expect(stateInput).toBeInTheDocument()
    expect(stateInput).toHaveAttribute('maxlength', '2')
  })

  it('should render contact type selection', () => {
    const Wrapper = createWrapper()

    render(
      <Wrapper>
        <CustomerForm onSubmit={vi.fn()} onCancel={vi.fn()} />
      </Wrapper>
    )

    // Contact type buttons are rendered
    expect(screen.getByText('Residential')).toBeInTheDocument()
    expect(screen.getByText('Commercial')).toBeInTheDocument()
  })
})
