import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast'

describe('Toast Components', () => {
  describe('ToastProvider', () => {
    it('renders children', () => {
      render(
        <ToastProvider>
          <div data-testid="child">Content</div>
        </ToastProvider>
      )

      expect(screen.getByTestId('child')).toBeInTheDocument()
    })
  })

  describe('ToastViewport', () => {
    it('renders without crashing', () => {
      render(
        <ToastProvider>
          <ToastViewport data-testid="viewport" />
        </ToastProvider>
      )

      expect(screen.getByTestId('viewport')).toBeInTheDocument()
    })

    it('accepts custom className', () => {
      render(
        <ToastProvider>
          <ToastViewport data-testid="viewport" className="custom-class" />
        </ToastProvider>
      )

      expect(screen.getByTestId('viewport')).toHaveClass('custom-class')
    })
  })

  describe('Toast', () => {
    it('renders without crashing', () => {
      render(
        <ToastProvider>
          <Toast data-testid="toast">Toast content</Toast>
          <ToastViewport />
        </ToastProvider>
      )

      expect(screen.getByTestId('toast')).toBeInTheDocument()
    })

    it('renders with default variant', () => {
      render(
        <ToastProvider>
          <Toast data-testid="toast">Default toast</Toast>
          <ToastViewport />
        </ToastProvider>
      )

      const toast = screen.getByTestId('toast')
      expect(toast).toHaveClass('bg-background')
    })

    it('renders with destructive variant', () => {
      render(
        <ToastProvider>
          <Toast data-testid="toast" variant="destructive">
            Error toast
          </Toast>
          <ToastViewport />
        </ToastProvider>
      )

      const toast = screen.getByTestId('toast')
      expect(toast).toHaveClass('destructive')
    })

    it('accepts custom className', () => {
      render(
        <ToastProvider>
          <Toast data-testid="toast" className="custom-toast">
            Custom toast
          </Toast>
          <ToastViewport />
        </ToastProvider>
      )

      expect(screen.getByTestId('toast')).toHaveClass('custom-toast')
    })
  })

  describe('ToastTitle', () => {
    it('renders title text', () => {
      render(
        <ToastProvider>
          <Toast>
            <ToastTitle>Toast Title</ToastTitle>
          </Toast>
          <ToastViewport />
        </ToastProvider>
      )

      expect(screen.getByText('Toast Title')).toBeInTheDocument()
    })

    it('accepts custom className', () => {
      render(
        <ToastProvider>
          <Toast>
            <ToastTitle className="custom-title">Title</ToastTitle>
          </Toast>
          <ToastViewport />
        </ToastProvider>
      )

      expect(screen.getByText('Title')).toHaveClass('custom-title')
    })
  })

  describe('ToastDescription', () => {
    it('renders description text', () => {
      render(
        <ToastProvider>
          <Toast>
            <ToastDescription>Toast description content</ToastDescription>
          </Toast>
          <ToastViewport />
        </ToastProvider>
      )

      expect(screen.getByText('Toast description content')).toBeInTheDocument()
    })

    it('accepts custom className', () => {
      render(
        <ToastProvider>
          <Toast>
            <ToastDescription className="custom-desc">Description</ToastDescription>
          </Toast>
          <ToastViewport />
        </ToastProvider>
      )

      expect(screen.getByText('Description')).toHaveClass('custom-desc')
    })
  })

  describe('ToastClose', () => {
    it('renders close button', () => {
      render(
        <ToastProvider>
          <Toast>
            <ToastClose data-testid="close" />
          </Toast>
          <ToastViewport />
        </ToastProvider>
      )

      expect(screen.getByTestId('close')).toBeInTheDocument()
    })

    it('contains X icon', () => {
      render(
        <ToastProvider>
          <Toast>
            <ToastClose data-testid="close" />
          </Toast>
          <ToastViewport />
        </ToastProvider>
      )

      // X icon should be rendered (svg element)
      const closeBtn = screen.getByTestId('close')
      expect(closeBtn.querySelector('svg')).toBeInTheDocument()
    })

    it('accepts custom className', () => {
      render(
        <ToastProvider>
          <Toast>
            <ToastClose data-testid="close" className="custom-close" />
          </Toast>
          <ToastViewport />
        </ToastProvider>
      )

      expect(screen.getByTestId('close')).toHaveClass('custom-close')
    })
  })

  describe('ToastAction', () => {
    it('renders action button', () => {
      render(
        <ToastProvider>
          <Toast>
            <ToastAction altText="Undo action">Undo</ToastAction>
          </Toast>
          <ToastViewport />
        </ToastProvider>
      )

      expect(screen.getByText('Undo')).toBeInTheDocument()
    })

    it('accepts custom className', () => {
      render(
        <ToastProvider>
          <Toast>
            <ToastAction altText="Action" className="custom-action">
              Action
            </ToastAction>
          </Toast>
          <ToastViewport />
        </ToastProvider>
      )

      expect(screen.getByText('Action')).toHaveClass('custom-action')
    })
  })
})
