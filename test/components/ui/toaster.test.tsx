import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock useToast hook
const mockToasts: any[] = []
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toasts: mockToasts,
  }),
}))

// Import after mocks
import { Toaster } from '@/components/ui/toaster'

describe('Toaster', () => {
  beforeEach(() => {
    mockToasts.length = 0
  })

  it('renders without crashing', () => {
    render(<Toaster />)
    // Should not throw
  })

  it('renders empty when no toasts', () => {
    render(<Toaster />)

    // Should render without any toast content
    expect(screen.queryByText('Test Toast')).not.toBeInTheDocument()
  })

  it('renders toasts from context', () => {
    mockToasts.push({
      id: '1',
      title: 'Test Toast',
      description: 'Test description',
    })

    render(<Toaster />)

    expect(screen.getByText('Test Toast')).toBeInTheDocument()
    expect(screen.getByText('Test description')).toBeInTheDocument()
  })

  it('renders multiple toasts', () => {
    mockToasts.push(
      { id: '1', title: 'First Toast' },
      { id: '2', title: 'Second Toast' }
    )

    render(<Toaster />)

    expect(screen.getByText('First Toast')).toBeInTheDocument()
    expect(screen.getByText('Second Toast')).toBeInTheDocument()
  })

  it('renders toast without title', () => {
    mockToasts.push({
      id: '1',
      description: 'Only description',
    })

    render(<Toaster />)

    expect(screen.getByText('Only description')).toBeInTheDocument()
  })

  it('renders toast without description', () => {
    mockToasts.push({
      id: '1',
      title: 'Only title',
    })

    render(<Toaster />)

    expect(screen.getByText('Only title')).toBeInTheDocument()
  })

  it('renders toast with action', () => {
    mockToasts.push({
      id: '1',
      title: 'Toast with action',
      action: <button>Undo</button>,
    })

    render(<Toaster />)

    expect(screen.getByText('Toast with action')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument()
  })

  it('renders close button for toasts', () => {
    mockToasts.push({
      id: '1',
      title: 'Closeable toast',
    })

    render(<Toaster />)

    // ToastClose should render X icon
    expect(screen.getByText('Closeable toast')).toBeInTheDocument()
  })
})
