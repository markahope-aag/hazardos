import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CreateCustomerModal from '@/components/customers/CreateCustomerModal'
import * as useCustomersHook from '@/lib/hooks/use-customers'

// Mock the hooks
vi.mock('@/lib/hooks/use-customers', () => ({
  useCreateCustomer: vi.fn(),
}))

// Mock CustomerForm component
vi.mock('@/components/customers/CustomerForm', () => ({
  default: ({ onSubmit, onCancel, isSubmitting, submitLabel }: any) => (
    <div data-testid="customer-form">
      <button onClick={() => onSubmit({ name: 'Test Customer', email: 'test@example.com' })}>
        {submitLabel}
      </button>
      <button onClick={onCancel}>Cancel</button>
      {isSubmitting && <span>Submitting...</span>}
    </div>
  ),
}))

describe('CreateCustomerModal', () => {
  const mockMutateAsync = vi.fn()
  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(useCustomersHook, 'useCreateCustomer').mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as any)
  })

  it('should not render when open is false', () => {
    render(<CreateCustomerModal open={false} onClose={mockOnClose} />)

    expect(screen.queryByText('Add New Customer')).not.toBeInTheDocument()
  })

  it('should render modal when open is true', () => {
    render(<CreateCustomerModal open={true} onClose={mockOnClose} />)

    expect(screen.getByText('Add New Customer')).toBeInTheDocument()
    expect(screen.getByTestId('customer-form')).toBeInTheDocument()
  })

  it('should show Create Customer submit label', () => {
    render(<CreateCustomerModal open={true} onClose={mockOnClose} />)

    expect(screen.getByText('Create Customer')).toBeInTheDocument()
  })

  it('should handle form submission successfully', async () => {
    mockMutateAsync.mockResolvedValue({ id: '123' })

    render(<CreateCustomerModal open={true} onClose={mockOnClose} />)

    const submitButton = screen.getByText('Create Customer')
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        name: 'Test Customer',
        email: 'test@example.com',
      })
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  it('should show submitting state when creating customer', () => {
    vi.spyOn(useCustomersHook, 'useCreateCustomer').mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: true,
    } as any)

    render(<CreateCustomerModal open={true} onClose={mockOnClose} />)

    expect(screen.getByText('Submitting...')).toBeInTheDocument()
  })

  it('should close modal when cancel is clicked', async () => {
    render(<CreateCustomerModal open={true} onClose={mockOnClose} />)

    const cancelButton = screen.getByText('Cancel')
    await userEvent.click(cancelButton)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('should handle form submission error', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockMutateAsync.mockRejectedValue(new Error('Failed to create customer'))

    render(<CreateCustomerModal open={true} onClose={mockOnClose} />)

    const submitButton = screen.getByText('Create Customer')

    await expect(async () => {
      await userEvent.click(submitButton)
    }).rejects.toThrow('Failed to create customer')

    expect(mockOnClose).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('should pass isSubmitting prop to CustomerForm', () => {
    vi.spyOn(useCustomersHook, 'useCreateCustomer').mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: true,
    } as any)

    render(<CreateCustomerModal open={true} onClose={mockOnClose} />)

    expect(screen.getByText('Submitting...')).toBeInTheDocument()
  })
})
