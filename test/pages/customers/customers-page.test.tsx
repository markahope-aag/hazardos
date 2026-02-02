import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CustomersPage from '@/app/(dashboard)/customers/page'

// Mock the child components
vi.mock('@/components/customers/customer-list', () => ({
  default: ({ onEditCustomer, onDeleteCustomer }: { onEditCustomer: (c: unknown) => void; onDeleteCustomer: (c: unknown) => void }) => (
    <div data-testid="customer-list">
      <button onClick={() => onEditCustomer({ id: '1', name: 'Test' })}>Edit</button>
      <button onClick={() => onDeleteCustomer({ id: '1', name: 'Test' })}>Delete</button>
    </div>
  ),
}))

vi.mock('@/components/customers/create-customer-modal', () => ({
  default: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
    open ? <div data-testid="create-modal"><button onClick={onClose}>Close</button></div> : null,
}))

vi.mock('@/components/customers/edit-customer-modal', () => ({
  default: ({ customer, open, onClose }: { customer: unknown; open: boolean; onClose: () => void }) =>
    open && customer ? <div data-testid="edit-modal"><button onClick={onClose}>Close</button></div> : null,
}))

vi.mock('@/components/customers/delete-customer-dialog', () => ({
  default: ({ customer, open, onClose, onSuccess }: { customer: unknown; open: boolean; onClose: () => void; onSuccess: () => void }) =>
    open && customer ? (
      <div data-testid="delete-dialog">
        <button onClick={onClose}>Close</button>
        <button onClick={onSuccess}>Confirm</button>
      </div>
    ) : null,
}))

describe('CustomersPage', () => {
  it('renders without crashing', () => {
    expect(() => render(<CustomersPage />)).not.toThrow()
  })

  it('displays the page title', () => {
    render(<CustomersPage />)
    expect(screen.getByText('Customers')).toBeInTheDocument()
  })

  it('displays the page description', () => {
    render(<CustomersPage />)
    expect(screen.getByText('Manage your leads, prospects, and customers')).toBeInTheDocument()
  })

  it('displays the Add Customer button', () => {
    render(<CustomersPage />)
    expect(screen.getByRole('button', { name: /add customer/i })).toBeInTheDocument()
  })

  it('renders the customer list component', () => {
    render(<CustomersPage />)
    expect(screen.getByTestId('customer-list')).toBeInTheDocument()
  })

  it('opens create modal when Add Customer is clicked', async () => {
    const user = userEvent.setup()
    render(<CustomersPage />)

    await user.click(screen.getByRole('button', { name: /add customer/i }))
    expect(screen.getByTestId('create-modal')).toBeInTheDocument()
  })

  it('closes create modal when close is clicked', async () => {
    const user = userEvent.setup()
    render(<CustomersPage />)

    await user.click(screen.getByRole('button', { name: /add customer/i }))
    expect(screen.getByTestId('create-modal')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /close/i }))
    expect(screen.queryByTestId('create-modal')).not.toBeInTheDocument()
  })

  it('opens edit modal when edit is triggered', async () => {
    const user = userEvent.setup()
    render(<CustomersPage />)

    await user.click(screen.getByRole('button', { name: /edit/i }))
    expect(screen.getByTestId('edit-modal')).toBeInTheDocument()
  })

  it('opens delete dialog when delete is triggered', async () => {
    const user = userEvent.setup()
    render(<CustomersPage />)

    await user.click(screen.getByRole('button', { name: /delete/i }))
    expect(screen.getByTestId('delete-dialog')).toBeInTheDocument()
  })

  it('closes delete dialog on success', async () => {
    const user = userEvent.setup()
    render(<CustomersPage />)

    await user.click(screen.getByRole('button', { name: /delete/i }))
    expect(screen.getByTestId('delete-dialog')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /confirm/i }))
    expect(screen.queryByTestId('delete-dialog')).not.toBeInTheDocument()
  })
})
