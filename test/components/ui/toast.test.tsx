import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  Toast,
  ToastProvider,
  ToastViewport,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
} from '@/components/ui/toast'
import { useToast } from '@/components/ui/use-toast'

// Mock the toast hook
const mockToast = vi.fn()
const mockDismiss = vi.fn()
const mockToasts = [] as any[]

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
    dismiss: mockDismiss,
    toasts: mockToasts,
  }),
}))

// Test component that uses toast
function TestToastComponent() {
  const { toast } = useToast()

  return (
    <div>
      <button
        onClick={() => toast({ title: 'Test Toast', description: 'Test description' })}
      >
        Show Toast
      </button>
      <button
        onClick={() => toast({ title: 'Success', variant: 'default' })}
      >
        Success Toast
      </button>
      <button
        onClick={() => toast({ title: 'Error', variant: 'destructive' })}
      >
        Error Toast
      </button>
    </div>
  )
}

describe('Toast Components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockToasts.length = 0
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('Toast Component', () => {
    it('renders toast with title and description', () => {
      render(
        <ToastProvider>
          <Toast>
            <ToastTitle>Test Title</ToastTitle>
            <ToastDescription>Test Description</ToastDescription>
          </Toast>
          <ToastViewport />
        </ToastProvider>
      )

      expect(screen.getByText('Test Title')).toBeInTheDocument()
      expect(screen.getByText('Test Description')).toBeInTheDocument()
    })

    it('renders different toast variants', () => {
      const variants = ['default', 'destructive'] as const

      variants.forEach((variant) => {
        const { unmount } = render(
          <ToastProvider>
            <Toast variant={variant}>
              <ToastTitle>{variant} toast</ToastTitle>
            </Toast>
            <ToastViewport />
          </ToastProvider>
        )

        expect(screen.getByText(`${variant} toast`)).toBeInTheDocument()
        unmount()
      })
    })

    it('renders toast with close button', () => {
      render(
        <ToastProvider>
          <Toast>
            <ToastTitle>Closable Toast</ToastTitle>
            <ToastClose />
          </Toast>
          <ToastViewport />
        </ToastProvider>
      )

      expect(screen.getByText('Closable Toast')).toBeInTheDocument()
    })

    it('renders toast with action', () => {
      const onAction = vi.fn()

      render(
        <ToastProvider>
          <Toast>
            <ToastTitle>Action Toast</ToastTitle>
            <ToastAction altText="Retry" onClick={onAction}>
              Retry
            </ToastAction>
          </Toast>
          <ToastViewport />
        </ToastProvider>
      )

      expect(screen.getByText('Action Toast')).toBeInTheDocument()
      expect(screen.getByText('Retry')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(
        <ToastProvider>
          <Toast className="custom-toast-class" data-testid="custom-toast">
            <ToastTitle>Custom Toast</ToastTitle>
          </Toast>
          <ToastViewport />
        </ToastProvider>
      )

      const toast = screen.getByTestId('custom-toast')
      expect(toast).toHaveClass('custom-toast-class')
    })

    it('renders default variant styling', () => {
      render(
        <ToastProvider>
          <Toast data-testid="default-toast">
            <ToastTitle>Default Toast</ToastTitle>
          </Toast>
          <ToastViewport />
        </ToastProvider>
      )

      const toast = screen.getByTestId('default-toast')
      expect(toast).toHaveClass('bg-background', 'text-foreground')
    })

    it('renders destructive variant styling', () => {
      render(
        <ToastProvider>
          <Toast variant="destructive" data-testid="destructive-toast">
            <ToastTitle>Destructive Toast</ToastTitle>
          </Toast>
          <ToastViewport />
        </ToastProvider>
      )

      const toast = screen.getByTestId('destructive-toast')
      expect(toast).toHaveClass('destructive')
    })

    it('handles empty or no content gracefully', () => {
      render(
        <ToastProvider>
          <Toast data-testid="empty-toast" />
          <ToastViewport />
        </ToastProvider>
      )

      const toast = screen.getByTestId('empty-toast')
      expect(toast).toBeInTheDocument()
    })

    it('renders multiple toasts', () => {
      render(
        <ToastProvider>
          <Toast>
            <ToastTitle>Toast 1</ToastTitle>
          </Toast>
          <Toast>
            <ToastTitle>Toast 2</ToastTitle>
          </Toast>
          <Toast>
            <ToastTitle>Toast 3</ToastTitle>
          </Toast>
          <ToastViewport />
        </ToastProvider>
      )

      expect(screen.getByText('Toast 1')).toBeInTheDocument()
      expect(screen.getByText('Toast 2')).toBeInTheDocument()
      expect(screen.getByText('Toast 3')).toBeInTheDocument()
    })
  })

  describe('ToastProvider', () => {
    it('provides toast context to children', () => {
      render(
        <ToastProvider>
          <TestToastComponent />
          <ToastViewport />
        </ToastProvider>
      )

      const showButton = screen.getByText('Show Toast')
      fireEvent.click(showButton)

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Test Toast',
        description: 'Test description',
      })
    })

    it('handles different toast variants through context', () => {
      render(
        <ToastProvider>
          <TestToastComponent />
          <ToastViewport />
        </ToastProvider>
      )

      const successButton = screen.getByText('Success Toast')
      const errorButton = screen.getByText('Error Toast')

      fireEvent.click(successButton)
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Success',
        variant: 'default',
      })

      fireEvent.click(errorButton)
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        variant: 'destructive',
      })
    })
  })

  describe('ToastViewport', () => {
    it('renders viewport container', () => {
      render(
        <ToastProvider>
          <ToastViewport data-testid="viewport" />
        </ToastProvider>
      )

      const viewport = screen.getByTestId('viewport')
      expect(viewport).toBeInTheDocument()
    })

    it('applies custom className to viewport', () => {
      render(
        <ToastProvider>
          <ToastViewport className="custom-viewport" data-testid="custom-viewport" />
        </ToastProvider>
      )

      const viewport = screen.getByTestId('custom-viewport')
      expect(viewport).toHaveClass('custom-viewport')
    })

    it('applies default styling to viewport', () => {
      render(
        <ToastProvider>
          <ToastViewport data-testid="styled-viewport" />
        </ToastProvider>
      )

      const viewport = screen.getByTestId('styled-viewport')
      expect(viewport).toHaveClass('fixed', 'top-0', 'z-[100]', 'flex')
    })
  })

  describe('ToastTitle', () => {
    it('renders title with correct styling', () => {
      render(
        <ToastProvider>
          <Toast>
            <ToastTitle data-testid="toast-title">Title Text</ToastTitle>
          </Toast>
          <ToastViewport />
        </ToastProvider>
      )

      const title = screen.getByTestId('toast-title')
      expect(title).toHaveClass('text-sm', 'font-semibold')
    })
  })

  describe('ToastDescription', () => {
    it('renders description with correct styling', () => {
      render(
        <ToastProvider>
          <Toast>
            <ToastDescription data-testid="toast-desc">Description Text</ToastDescription>
          </Toast>
          <ToastViewport />
        </ToastProvider>
      )

      const desc = screen.getByTestId('toast-desc')
      expect(desc).toHaveClass('text-sm', 'opacity-90')
    })
  })
})
