import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Toast, ToastProvider, ToastViewport } from '@/components/ui/toast'
import { useToast } from '@/lib/hooks/use-toast'
import { act } from 'react-dom/test-utils'

// Mock the toast hook
const mockToast = vi.fn()
const mockDismiss = vi.fn()
const mockToasts = [] as any[]

vi.mock('@/lib/hooks/use-toast', () => ({
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
      const mockToastData = {
        id: '1',
        title: 'Test Title',
        description: 'Test Description',
        variant: 'default' as const,
      }

      render(
        <ToastProvider>
          <Toast {...mockToastData} />
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
            <Toast
              id={`toast-${variant}`}
              title={`${variant} toast`}
              variant={variant}
            />
            <ToastViewport />
          </ToastProvider>
        )

        const toast = screen.getByRole('status')
        expect(toast).toBeInTheDocument()
        expect(toast).toHaveAttribute('data-state', 'open')

        unmount()
      })
    })

    it('handles close button interaction', async () => {
      const onOpenChange = vi.fn()

      render(
        <ToastProvider>
          <Toast
            id="closable-toast"
            title="Closable Toast"
            onOpenChange={onOpenChange}
          />
          <ToastViewport />
        </ToastProvider>
      )

      const closeButton = screen.getByRole('button', { name: /close/i })
      expect(closeButton).toBeInTheDocument()

      fireEvent.click(closeButton)

      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(false)
      })
    })

    it('supports custom action buttons', () => {
      const onAction = vi.fn()

      render(
        <ToastProvider>
          <Toast
            id="action-toast"
            title="Action Toast"
            action={
              <button onClick={onAction} data-testid="custom-action">
                Retry
              </button>
            }
          />
          <ToastViewport />
        </ToastProvider>
      )

      const actionButton = screen.getByTestId('custom-action')
      expect(actionButton).toBeInTheDocument()

      fireEvent.click(actionButton)
      expect(onAction).toHaveBeenCalled()
    })

    it('auto-dismisses after duration', async () => {
      vi.useFakeTimers()
      const onOpenChange = vi.fn()

      render(
        <ToastProvider>
          <Toast
            id="auto-dismiss-toast"
            title="Auto Dismiss"
            duration={1000}
            onOpenChange={onOpenChange}
          />
          <ToastViewport />
        </ToastProvider>
      )

      expect(screen.getByText('Auto Dismiss')).toBeInTheDocument()

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(false)
      })

      vi.useRealTimers()
    })

    it('pauses auto-dismiss on hover', async () => {
      vi.useFakeTimers()
      const onOpenChange = vi.fn()

      render(
        <ToastProvider>
          <Toast
            id="hover-toast"
            title="Hover Toast"
            duration={1000}
            onOpenChange={onOpenChange}
          />
          <ToastViewport />
        </ToastProvider>
      )

      const toast = screen.getByRole('status')

      // Hover over toast
      fireEvent.mouseEnter(toast)

      act(() => {
        vi.advanceTimersByTime(1500)
      })

      // Should not auto-dismiss while hovered
      expect(onOpenChange).not.toHaveBeenCalled()

      // Leave hover
      fireEvent.mouseLeave(toast)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(false)
      })

      vi.useRealTimers()
    })

    it('supports keyboard navigation', () => {
      render(
        <ToastProvider>
          <Toast
            id="keyboard-toast"
            title="Keyboard Toast"
            action={<button>Action</button>}
          />
          <ToastViewport />
        </ToastProvider>
      )

      const toast = screen.getByRole('status')
      const closeButton = screen.getByRole('button', { name: /close/i })
      const actionButton = screen.getByRole('button', { name: 'Action' })

      // Tab navigation
      closeButton.focus()
      expect(closeButton).toHaveFocus()

      fireEvent.keyDown(closeButton, { key: 'Tab' })
      expect(actionButton).toHaveFocus()

      // Escape key closes toast
      fireEvent.keyDown(toast, { key: 'Escape' })
      expect(toast).toHaveAttribute('data-state', 'closed')
    })

    it('handles accessibility attributes correctly', () => {
      render(
        <ToastProvider>
          <Toast
            id="a11y-toast"
            title="Accessible Toast"
            description="Toast description"
          />
          <ToastViewport />
        </ToastProvider>
      )

      const toast = screen.getByRole('status')
      expect(toast).toHaveAttribute('aria-live', 'polite')
      expect(toast).toHaveAttribute('aria-atomic', 'true')

      const title = screen.getByText('Accessible Toast')
      const description = screen.getByText('Toast description')

      expect(title).toHaveAttribute('id')
      expect(description).toHaveAttribute('id')
      expect(toast).toHaveAttribute('aria-labelledby', title.id)
      expect(toast).toHaveAttribute('aria-describedby', description.id)
    })

    it('handles multiple toasts in viewport', () => {
      const toasts = [
        { id: '1', title: 'Toast 1' },
        { id: '2', title: 'Toast 2' },
        { id: '3', title: 'Toast 3' },
      ]

      render(
        <ToastProvider>
          {toasts.map((toast) => (
            <Toast key={toast.id} {...toast} />
          ))}
          <ToastViewport />
        </ToastProvider>
      )

      toasts.forEach((toast) => {
        expect(screen.getByText(toast.title)).toBeInTheDocument()
      })

      const toastElements = screen.getAllByRole('status')
      expect(toastElements).toHaveLength(3)
    })

    it('handles toast with only title', () => {
      render(
        <ToastProvider>
          <Toast id="title-only" title="Title Only Toast" />
          <ToastViewport />
        </ToastProvider>
      )

      expect(screen.getByText('Title Only Toast')).toBeInTheDocument()
      expect(screen.queryByRole('generic')).not.toBeInTheDocument()
    })

    it('handles empty or invalid props gracefully', () => {
      render(
        <ToastProvider>
          <Toast id="empty-toast" title="" />
          <ToastViewport />
        </ToastProvider>
      )

      const toast = screen.getByRole('status')
      expect(toast).toBeInTheDocument()
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

    it('supports swipe to dismiss on mobile', async () => {
      const onOpenChange = vi.fn()

      render(
        <ToastProvider swipeDirection="right">
          <Toast
            id="swipe-toast"
            title="Swipe Toast"
            onOpenChange={onOpenChange}
          />
          <ToastViewport />
        </ToastProvider>
      )

      const toast = screen.getByRole('status')

      // Simulate swipe gesture
      fireEvent.touchStart(toast, {
        touches: [{ clientX: 0, clientY: 0 }],
      })

      fireEvent.touchMove(toast, {
        touches: [{ clientX: 100, clientY: 0 }],
      })

      fireEvent.touchEnd(toast)

      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(false)
      })
    })
  })

  describe('ToastViewport', () => {
    it('renders viewport container', () => {
      render(
        <ToastProvider>
          <ToastViewport />
        </ToastProvider>
      )

      const viewport = screen.getByRole('region')
      expect(viewport).toBeInTheDocument()
      expect(viewport).toHaveAttribute('aria-label', 'Notifications')
    })

    it('handles viewport positioning', () => {
      render(
        <ToastProvider>
          <ToastViewport className="custom-viewport" />
        </ToastProvider>
      )

      const viewport = screen.getByRole('region')
      expect(viewport).toHaveClass('custom-viewport')
    })
  })

  describe('Integration Tests', () => {
    it('handles complete toast lifecycle', async () => {
      vi.useFakeTimers()

      const { rerender } = render(
        <ToastProvider>
          <ToastViewport />
        </ToastProvider>
      )

      // Add toast
      rerender(
        <ToastProvider>
          <Toast
            id="lifecycle-toast"
            title="Lifecycle Toast"
            duration={2000}
          />
          <ToastViewport />
        </ToastProvider>
      )

      expect(screen.getByText('Lifecycle Toast')).toBeInTheDocument()

      // Toast should auto-dismiss
      act(() => {
        vi.advanceTimersByTime(2000)
      })

      await waitFor(() => {
        const toast = screen.queryByText('Lifecycle Toast')
        expect(toast).not.toBeInTheDocument()
      })

      vi.useRealTimers()
    })

    it('handles rapid toast creation and dismissal', async () => {
      const toasts = Array.from({ length: 5 }, (_, i) => ({
        id: `rapid-${i}`,
        title: `Toast ${i}`,
      }))

      const { rerender } = render(
        <ToastProvider>
          <ToastViewport />
        </ToastProvider>
      )

      // Add all toasts rapidly
      toasts.forEach((toast, index) => {
        rerender(
          <ToastProvider>
            {toasts.slice(0, index + 1).map((t) => (
              <Toast key={t.id} {...t} />
            ))}
            <ToastViewport />
          </ToastProvider>
        )
      })

      // All toasts should be present
      toasts.forEach((toast) => {
        expect(screen.getByText(toast.title)).toBeInTheDocument()
      })
    })

    it('maintains focus management during toast interactions', () => {
      render(
        <ToastProvider>
          <button data-testid="trigger">Trigger</button>
          <Toast
            id="focus-toast"
            title="Focus Toast"
            action={<button>Action</button>}
          />
          <ToastViewport />
        </ToastProvider>
      )

      const trigger = screen.getByTestId('trigger')
      const actionButton = screen.getByRole('button', { name: 'Action' })

      trigger.focus()
      expect(trigger).toHaveFocus()

      // Focus should move to toast action when interacted with
      fireEvent.click(actionButton)
      expect(actionButton).toHaveFocus()
    })
  })
})