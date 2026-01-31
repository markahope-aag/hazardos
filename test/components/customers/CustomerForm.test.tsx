import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CustomerForm } from '@/components/customers/CustomerForm'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

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

describe('CustomerForm Component', () => {
  it('should render all form fields', () => {
    const Wrapper = createWrapper()
    render(
      <Wrapper>
        <CustomerForm onSubmit={vi.fn()} onCancel={vi.fn()} />
      </Wrapper>
    )
    
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/city/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/state/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/zip/i)).toBeInTheDocument()
  })

  it('should show validation error for empty name', async () => {
    const user = userEvent.setup()
    const Wrapper = createWrapper()
    
    render(
      <Wrapper>
        <CustomerForm onSubmit={vi.fn()} onCancel={vi.fn()} />
      </Wrapper>
    )
    
    const submitButton = screen.getByRole('button', { name: /save/i })
    await user.click(submitButton)
    
    expect(screen.getByText(/name is required/i)).toBeInTheDocument()
  })

  it('should validate email format', async () => {
    const user = userEvent.setup()
    const Wrapper = createWrapper()
    
    render(
      <Wrapper>
        <CustomerForm onSubmit={vi.fn()} onCancel={vi.fn()} />
      </Wrapper>
    )
    
    const emailInput = screen.getByLabelText(/email/i)
    await user.type(emailInput, 'invalid-email')
    
    const submitButton = screen.getByRole('button', { name: /save/i })
    await user.click(submitButton)
    
    expect(screen.getByText(/invalid email/i)).toBeInTheDocument()
  })

  it('should populate form with initial data', () => {
    const initialData = {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '(555) 123-4567',
      status: 'prospect' as const
    }
    
    const Wrapper = createWrapper()
    render(
      <Wrapper>
        <CustomerForm 
          initialData={initialData}
          onSubmit={vi.fn()} 
          onCancel={vi.fn()} 
        />
      </Wrapper>
    )
    
    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument()
    expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument()
    expect(screen.getByDisplayValue('(555) 123-4567')).toBeInTheDocument()
  })

  it('should call onSubmit with form data', async () => {
    const user = userEvent.setup()
    const handleSubmit = vi.fn()
    const Wrapper = createWrapper()
    
    render(
      <Wrapper>
        <CustomerForm onSubmit={handleSubmit} onCancel={vi.fn()} />
      </Wrapper>
    )
    
    await user.type(screen.getByLabelText(/name/i), 'Test Customer')
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    
    const submitButton = screen.getByRole('button', { name: /save/i })
    await user.click(submitButton)
    
    expect(handleSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Test Customer',
        email: 'test@example.com'
      })
    )
  })

  it('should call onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup()
    const handleCancel = vi.fn()
    const Wrapper = createWrapper()
    
    render(
      <Wrapper>
        <CustomerForm onSubmit={vi.fn()} onCancel={handleCancel} />
      </Wrapper>
    )
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)
    
    expect(handleCancel).toHaveBeenCalledOnce()
  })

  it('should show loading state during submission', () => {
    const Wrapper = createWrapper()
    render(
      <Wrapper>
        <CustomerForm 
          onSubmit={vi.fn()} 
          onCancel={vi.fn()} 
          isLoading={true} 
        />
      </Wrapper>
    )
    
    const submitButton = screen.getByRole('button', { name: /saving/i })
    expect(submitButton).toBeDisabled()
  })

  it('should reset form when reset prop changes', () => {
    const Wrapper = createWrapper()
    const { rerender } = render(
      <Wrapper>
        <CustomerForm onSubmit={vi.fn()} onCancel={vi.fn()} />
      </Wrapper>
    )
    
    // Fill form
    const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement
    userEvent.type(nameInput, 'Test Name')
    
    // Rerender with reset
    rerender(
      <Wrapper>
        <CustomerForm onSubmit={vi.fn()} onCancel={vi.fn()} key="reset" />
      </Wrapper>
    )
    
    expect(screen.getByLabelText(/name/i)).toHaveValue('')
  })

  it('should handle state selection', async () => {
    const user = userEvent.setup()
    const Wrapper = createWrapper()
    
    render(
      <Wrapper>
        <CustomerForm onSubmit={vi.fn()} onCancel={vi.fn()} />
      </Wrapper>
    )
    
    const stateSelect = screen.getByRole('combobox', { name: /state/i })
    await user.click(stateSelect)
    
    // Should show state options
    expect(screen.getByText('California')).toBeInTheDocument()
    expect(screen.getByText('New York')).toBeInTheDocument()
  })

  it('should handle status selection', async () => {
    const user = userEvent.setup()
    const Wrapper = createWrapper()
    
    render(
      <Wrapper>
        <CustomerForm onSubmit={vi.fn()} onCancel={vi.fn()} />
      </Wrapper>
    )
    
    const statusSelect = screen.getByRole('combobox', { name: /status/i })
    await user.click(statusSelect)
    
    // Should show status options
    expect(screen.getByText('Lead')).toBeInTheDocument()
    expect(screen.getByText('Prospect')).toBeInTheDocument()
    expect(screen.getByText('Customer')).toBeInTheDocument()
  })
})