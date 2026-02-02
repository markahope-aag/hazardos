import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AddActivityDialog } from '@/components/activity/add-activity-dialog'

// Mock useToast
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

describe('AddActivityDialog Component', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    entityType: 'customer',
    entityId: '123',
    entityName: 'Test Customer',
  }

  it('should render without crashing', () => {
    expect(() => render(<AddActivityDialog {...defaultProps} />)).not.toThrow()
  })

  it('should display dialog title', () => {
    render(<AddActivityDialog {...defaultProps} />)
    expect(screen.getByRole('heading', { name: 'Log Activity' })).toBeInTheDocument()
  })

  it('should display dialog description with entity type', () => {
    render(<AddActivityDialog {...defaultProps} />)
    expect(screen.getByText(/Add a note or log a phone call for this customer/)).toBeInTheDocument()
  })

  it('should render Note tab', () => {
    render(<AddActivityDialog {...defaultProps} />)
    expect(screen.getByRole('tab', { name: /note/i })).toBeInTheDocument()
  })

  it('should render Phone Call tab', () => {
    render(<AddActivityDialog {...defaultProps} />)
    expect(screen.getByRole('tab', { name: /phone call/i })).toBeInTheDocument()
  })

  it('should show Note tab content by default', () => {
    render(<AddActivityDialog {...defaultProps} />)
    expect(screen.getByLabelText('Note *')).toBeInTheDocument()
  })

  it('should switch to call tab when clicked', async () => {
    const user = userEvent.setup()

    render(<AddActivityDialog {...defaultProps} />)

    await user.click(screen.getByRole('tab', { name: /phone call/i }))

    expect(screen.getByText('Call Direction')).toBeInTheDocument()
    expect(screen.getByLabelText('Duration (minutes)')).toBeInTheDocument()
    expect(screen.getByLabelText('Call Notes')).toBeInTheDocument()
  })

  it('should have Outbound and Inbound buttons', async () => {
    const user = userEvent.setup()

    render(<AddActivityDialog {...defaultProps} />)

    await user.click(screen.getByRole('tab', { name: /phone call/i }))

    expect(screen.getByRole('button', { name: /outbound/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /inbound/i })).toBeInTheDocument()
  })

  it('should have Cancel and Log Activity buttons', () => {
    render(<AddActivityDialog {...defaultProps} />)

    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /log activity/i })).toBeInTheDocument()
  })

  it('should call onClose when Cancel is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(<AddActivityDialog {...defaultProps} onClose={onClose} />)

    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(onClose).toHaveBeenCalled()
  })

  it('should allow typing in note textarea', async () => {
    const user = userEvent.setup()

    render(<AddActivityDialog {...defaultProps} />)

    const textarea = screen.getByLabelText('Note *')
    await user.type(textarea, 'Test note content')

    expect(textarea).toHaveValue('Test note content')
  })

  it('should not render when open is false', () => {
    render(<AddActivityDialog {...defaultProps} open={false} />)

    expect(screen.queryByText('Log Activity')).not.toBeInTheDocument()
  })
})
