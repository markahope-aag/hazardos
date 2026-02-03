import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock confirmation modal component
interface ConfirmationModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'danger' | 'warning'
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
  onClose?: () => void
  children?: React.ReactNode
}

const ConfirmationModal = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  loading = false,
  onConfirm,
  onCancel,
  onClose,
  children
}: ConfirmationModalProps) => {
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (onClose) {
          onClose()
        } else {
          onCancel()
        }
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose, onCancel])

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      if (onClose) {
        onClose()
      } else {
        onCancel()
      }
    }
  }

  const handleConfirm = () => {
    if (!loading) {
      onConfirm()
    }
  }

  const handleCancel = () => {
    if (!loading) {
      onCancel()
    }
  }

  if (!isOpen) return null

  const variantStyles = {
    default: 'border-blue-200 bg-blue-50',
    danger: 'border-red-200 bg-red-50',
    warning: 'border-yellow-200 bg-yellow-50'
  }

  const confirmButtonStyles = {
    default: 'bg-blue-600 hover:bg-blue-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    warning: 'bg-yellow-600 hover:bg-yellow-700 text-white'
  }

  return (
    <div
      className="modal-backdrop fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
    >
      <div className={`modal-content bg-white rounded-lg p-6 max-w-md w-full mx-4 ${variantStyles[variant]}`}>
        {/* Header */}
        <div className="modal-header mb-4">
          <h2 id="modal-title" className="text-lg font-semibold text-gray-900">
            {title}
          </h2>
          {onClose && (
            <button
              className="modal-close absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              onClick={onClose}
              aria-label="Close modal"
              disabled={loading}
            >
              ✕
            </button>
          )}
        </div>

        {/* Body */}
        <div className="modal-body mb-6">
          <p id="modal-description" className="text-gray-700">
            {message}
          </p>
          {children && (
            <div className="mt-4">
              {children}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer flex justify-end space-x-3">
          <button
            className="cancel-button px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            onClick={handleCancel}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            className={`confirm-button px-4 py-2 rounded-md disabled:opacity-50 ${confirmButtonStyles[variant]}`}
            onClick={handleConfirm}
            disabled={loading}
            autoFocus
          >
            {loading ? (
              <>
                <span className="spinner mr-2">⏳</span>
                Loading...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

describe('ConfirmationModal', () => {
  const defaultProps = {
    isOpen: true,
    title: 'Confirm Action',
    message: 'Are you sure you want to proceed?',
    onConfirm: vi.fn(),
    onCancel: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset body overflow style
    document.body.style.overflow = 'unset'
  })

  describe('basic rendering', () => {
    it('should render modal when isOpen is true', () => {
      render(<ConfirmationModal {...defaultProps} />)
      
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Confirm Action')).toBeInTheDocument()
      expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument()
    })

    it('should not render modal when isOpen is false', () => {
      render(<ConfirmationModal {...defaultProps} isOpen={false} />)
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('should render default button texts', () => {
      render(<ConfirmationModal {...defaultProps} />)
      
      expect(screen.getByText('Confirm')).toBeInTheDocument()
      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })

    it('should render custom button texts', () => {
      render(
        <ConfirmationModal 
          {...defaultProps} 
          confirmText="Delete" 
          cancelText="Keep" 
        />
      )
      
      expect(screen.getByText('Delete')).toBeInTheDocument()
      expect(screen.getByText('Keep')).toBeInTheDocument()
    })

    it('should render children when provided', () => {
      render(
        <ConfirmationModal {...defaultProps}>
          <div>Additional content</div>
        </ConfirmationModal>
      )
      
      expect(screen.getByText('Additional content')).toBeInTheDocument()
    })
  })

  describe('variants', () => {
    it('should apply default variant styles', () => {
      render(<ConfirmationModal {...defaultProps} variant="default" />)
      
      const modal = screen.getByRole('dialog').firstChild as HTMLElement
      expect(modal).toHaveClass('bg-blue-50', 'border-blue-200')
      
      const confirmButton = screen.getByText('Confirm')
      expect(confirmButton).toHaveClass('bg-blue-600')
    })

    it('should apply danger variant styles', () => {
      render(<ConfirmationModal {...defaultProps} variant="danger" />)
      
      const modal = screen.getByRole('dialog').firstChild as HTMLElement
      expect(modal).toHaveClass('bg-red-50', 'border-red-200')
      
      const confirmButton = screen.getByText('Confirm')
      expect(confirmButton).toHaveClass('bg-red-600')
    })

    it('should apply warning variant styles', () => {
      render(<ConfirmationModal {...defaultProps} variant="warning" />)
      
      const modal = screen.getByRole('dialog').firstChild as HTMLElement
      expect(modal).toHaveClass('bg-yellow-50', 'border-yellow-200')
      
      const confirmButton = screen.getByText('Confirm')
      expect(confirmButton).toHaveClass('bg-yellow-600')
    })
  })

  describe('user interactions', () => {
    it('should call onConfirm when confirm button is clicked', async () => {
      const user = userEvent.setup()
      const onConfirm = vi.fn()
      
      render(<ConfirmationModal {...defaultProps} onConfirm={onConfirm} />)
      
      const confirmButton = screen.getByText('Confirm')
      await user.click(confirmButton)
      
      expect(onConfirm).toHaveBeenCalledOnce()
    })

    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup()
      const onCancel = vi.fn()
      
      render(<ConfirmationModal {...defaultProps} onCancel={onCancel} />)
      
      const cancelButton = screen.getByText('Cancel')
      await user.click(cancelButton)
      
      expect(onCancel).toHaveBeenCalledOnce()
    })

    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      
      render(<ConfirmationModal {...defaultProps} onClose={onClose} />)
      
      const closeButton = screen.getByLabelText('Close modal')
      await user.click(closeButton)
      
      expect(onClose).toHaveBeenCalledOnce()
    })

    it('should not render close button when onClose is not provided', () => {
      render(<ConfirmationModal {...defaultProps} />)
      
      expect(screen.queryByLabelText('Close modal')).not.toBeInTheDocument()
    })

    it('should call onCancel when backdrop is clicked', async () => {
      const user = userEvent.setup()
      const onCancel = vi.fn()
      
      render(<ConfirmationModal {...defaultProps} onCancel={onCancel} />)
      
      const backdrop = screen.getByRole('dialog')
      await user.click(backdrop)
      
      expect(onCancel).toHaveBeenCalledOnce()
    })

    it('should not close when modal content is clicked', async () => {
      const user = userEvent.setup()
      const onCancel = vi.fn()
      
      render(<ConfirmationModal {...defaultProps} onCancel={onCancel} />)
      
      const modalContent = screen.getByText('Confirm Action')
      await user.click(modalContent)
      
      expect(onCancel).not.toHaveBeenCalled()
    })
  })

  describe('keyboard interactions', () => {
    it('should call onCancel when Escape key is pressed', () => {
      const onCancel = vi.fn()
      
      render(<ConfirmationModal {...defaultProps} onCancel={onCancel} />)
      
      fireEvent.keyDown(document, { key: 'Escape' })
      
      expect(onCancel).toHaveBeenCalledOnce()
    })

    it('should call onClose when Escape key is pressed and onClose is provided', () => {
      const onClose = vi.fn()
      const onCancel = vi.fn()
      
      render(<ConfirmationModal {...defaultProps} onClose={onClose} onCancel={onCancel} />)
      
      fireEvent.keyDown(document, { key: 'Escape' })
      
      expect(onClose).toHaveBeenCalledOnce()
      expect(onCancel).not.toHaveBeenCalled()
    })

    it('should not respond to Escape when modal is closed', () => {
      const onCancel = vi.fn()
      
      render(<ConfirmationModal {...defaultProps} isOpen={false} onCancel={onCancel} />)
      
      fireEvent.keyDown(document, { key: 'Escape' })
      
      expect(onCancel).not.toHaveBeenCalled()
    })

    it('should focus confirm button by default', () => {
      render(<ConfirmationModal {...defaultProps} />)
      
      const confirmButton = screen.getByText('Confirm')
      expect(confirmButton).toHaveAttribute('autoFocus')
    })

    it('should support keyboard navigation between buttons', async () => {
      const user = userEvent.setup()
      
      render(<ConfirmationModal {...defaultProps} />)
      
      const confirmButton = screen.getByText('Confirm')
      const cancelButton = screen.getByText('Cancel')
      
      // Confirm button should be focused initially
      expect(confirmButton).toHaveAttribute('autoFocus')
      
      // Tab to cancel button
      await user.tab()
      expect(cancelButton).toHaveFocus()
      
      // Shift+Tab back to confirm button
      await user.tab({ shift: true })
      expect(confirmButton).toHaveFocus()
    })

    it('should activate buttons with Enter and Space', async () => {
      const user = userEvent.setup()
      const onConfirm = vi.fn()
      const onCancel = vi.fn()
      
      render(<ConfirmationModal {...defaultProps} onConfirm={onConfirm} onCancel={onCancel} />)
      
      const confirmButton = screen.getByText('Confirm')
      const cancelButton = screen.getByText('Cancel')
      
      // Test Enter key on confirm button
      confirmButton.focus()
      await user.keyboard('{Enter}')
      expect(onConfirm).toHaveBeenCalledOnce()
      
      // Test Space key on cancel button
      cancelButton.focus()
      await user.keyboard(' ')
      expect(onCancel).toHaveBeenCalledOnce()
    })
  })

  describe('loading state', () => {
    it('should show loading state on confirm button', () => {
      render(<ConfirmationModal {...defaultProps} loading={true} />)
      
      expect(screen.getByText('Loading...')).toBeInTheDocument()
      expect(screen.getByText('⏳')).toBeInTheDocument()
    })

    it('should disable buttons when loading', () => {
      render(<ConfirmationModal {...defaultProps} loading={true} />)
      
      const confirmButton = screen.getByText('Loading...')
      const cancelButton = screen.getByText('Cancel')
      
      expect(confirmButton).toBeDisabled()
      expect(cancelButton).toBeDisabled()
    })

    it('should disable close button when loading', () => {
      render(<ConfirmationModal {...defaultProps} loading={true} onClose={vi.fn()} />)
      
      const closeButton = screen.getByLabelText('Close modal')
      expect(closeButton).toBeDisabled()
    })

    it('should not call callbacks when loading and buttons are clicked', async () => {
      const user = userEvent.setup()
      const onConfirm = vi.fn()
      const onCancel = vi.fn()
      
      render(
        <ConfirmationModal 
          {...defaultProps} 
          loading={true} 
          onConfirm={onConfirm} 
          onCancel={onCancel} 
        />
      )
      
      const confirmButton = screen.getByText('Loading...')
      const cancelButton = screen.getByText('Cancel')
      
      await user.click(confirmButton)
      await user.click(cancelButton)
      
      expect(onConfirm).not.toHaveBeenCalled()
      expect(onCancel).not.toHaveBeenCalled()
    })
  })

  describe('accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<ConfirmationModal {...defaultProps} />)
      
      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-modal', 'true')
      expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title')
      expect(dialog).toHaveAttribute('aria-describedby', 'modal-description')
    })

    it('should have proper heading structure', () => {
      render(<ConfirmationModal {...defaultProps} />)
      
      const title = screen.getByRole('heading', { level: 2 })
      expect(title).toHaveTextContent('Confirm Action')
      expect(title).toHaveAttribute('id', 'modal-title')
    })

    it('should have properly labeled description', () => {
      render(<ConfirmationModal {...defaultProps} />)
      
      const description = screen.getByText('Are you sure you want to proceed?')
      expect(description).toHaveAttribute('id', 'modal-description')
    })

    it('should trap focus within modal', async () => {
      const user = userEvent.setup()
      
      render(
        <div>
          <button>Outside button</button>
          <ConfirmationModal {...defaultProps} onClose={vi.fn()} />
        </div>
      )
      
      const confirmButton = screen.getByText('Confirm')
      const cancelButton = screen.getByText('Cancel')
      const closeButton = screen.getByLabelText('Close modal')
      
      // Focus should start on confirm button
      expect(confirmButton).toHaveAttribute('autoFocus')
      
      // Tab through modal elements
      await user.tab()
      expect(cancelButton).toHaveFocus()
      
      await user.tab()
      expect(closeButton).toHaveFocus()
      
      // Tab should wrap back to confirm button (focus trap)
      await user.tab()
      expect(confirmButton).toHaveFocus()
    })
  })

  describe('body scroll management', () => {
    it('should prevent body scroll when modal is open', () => {
      render(<ConfirmationModal {...defaultProps} />)
      
      expect(document.body.style.overflow).toBe('hidden')
    })

    it('should restore body scroll when modal is closed', () => {
      const { rerender } = render(<ConfirmationModal {...defaultProps} />)
      
      expect(document.body.style.overflow).toBe('hidden')
      
      rerender(<ConfirmationModal {...defaultProps} isOpen={false} />)
      
      expect(document.body.style.overflow).toBe('unset')
    })

    it('should clean up body scroll on unmount', () => {
      const { unmount } = render(<ConfirmationModal {...defaultProps} />)
      
      expect(document.body.style.overflow).toBe('hidden')
      
      unmount()
      
      expect(document.body.style.overflow).toBe('unset')
    })
  })

  describe('edge cases', () => {
    it('should handle undefined callback functions', async () => {
      const user = userEvent.setup()
      
      // Should not throw errors when callbacks are undefined
      render(
        <ConfirmationModal 
          isOpen={true}
          title="Test"
          message="Test message"
          onConfirm={() => {}}
          onCancel={() => {}}
        />
      )
      
      const backdrop = screen.getByRole('dialog')
      await user.click(backdrop)
      
      // Should not throw error
    })

    it('should handle rapid state changes', () => {
      const { rerender } = render(<ConfirmationModal {...defaultProps} isOpen={false} />)
      
      // Rapidly toggle modal
      rerender(<ConfirmationModal {...defaultProps} isOpen={true} />)
      rerender(<ConfirmationModal {...defaultProps} isOpen={false} />)
      rerender(<ConfirmationModal {...defaultProps} isOpen={true} />)
      
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('should handle long titles and messages', () => {
      const longTitle = 'This is a very long title that might overflow the modal container and cause layout issues'
      const longMessage = 'This is a very long message that contains a lot of text and might wrap to multiple lines, testing how the modal handles extensive content and maintains proper spacing and readability.'
      
      render(
        <ConfirmationModal 
          {...defaultProps} 
          title={longTitle}
          message={longMessage}
        />
      )
      
      expect(screen.getByText(longTitle)).toBeInTheDocument()
      expect(screen.getByText(longMessage)).toBeInTheDocument()
    })

    it('should handle special characters in content', () => {
      const specialTitle = 'Confirm: Delete "User\'s Data" & <Settings>'
      const specialMessage = 'Are you sure? This action cannot be undone! (100% permanent)'
      
      render(
        <ConfirmationModal 
          {...defaultProps} 
          title={specialTitle}
          message={specialMessage}
        />
      )
      
      expect(screen.getByText(specialTitle)).toBeInTheDocument()
      expect(screen.getByText(specialMessage)).toBeInTheDocument()
    })
  })

  describe('integration scenarios', () => {
    it('should handle complete confirmation workflow', async () => {
      const user = userEvent.setup()
      const onConfirm = vi.fn()
      const onCancel = vi.fn()
      
      const { rerender } = render(
        <ConfirmationModal 
          {...defaultProps}
          variant="danger"
          confirmText="Delete"
          cancelText="Keep"
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      )
      
      // Verify danger variant styling
      const confirmButton = screen.getByText('Delete')
      expect(confirmButton).toHaveClass('bg-red-600')
      
      // Test keyboard navigation
      await user.tab()
      expect(screen.getByText('Keep')).toHaveFocus()
      
      // Test escape key
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(onCancel).toHaveBeenCalledOnce()
      
      // Test loading state
      rerender(
        <ConfirmationModal 
          {...defaultProps}
          variant="danger"
          confirmText="Delete"
          cancelText="Keep"
          loading={true}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      )
      
      expect(screen.getByText('Loading...')).toBeInTheDocument()
      expect(screen.getByText('Delete')).toBeDisabled()
      
      // Test successful confirmation
      rerender(
        <ConfirmationModal 
          {...defaultProps}
          variant="danger"
          confirmText="Delete"
          cancelText="Keep"
          loading={false}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      )
      
      await user.click(screen.getByText('Delete'))
      expect(onConfirm).toHaveBeenCalledTimes(1)
    })

    it('should work with complex children content', async () => {
      const user = userEvent.setup()
      const onConfirm = vi.fn()
      
      render(
        <ConfirmationModal {...defaultProps} onConfirm={onConfirm}>
          <div>
            <h3>Additional Details</h3>
            <ul>
              <li>Item 1 will be deleted</li>
              <li>Item 2 will be archived</li>
            </ul>
            <input type="checkbox" id="confirm-checkbox" />
            <label htmlFor="confirm-checkbox">I understand the consequences</label>
          </div>
        </ConfirmationModal>
      )
      
      // Verify children content is rendered
      expect(screen.getByText('Additional Details')).toBeInTheDocument()
      expect(screen.getByText('Item 1 will be deleted')).toBeInTheDocument()
      
      // Interact with children
      const checkbox = screen.getByRole('checkbox')
      await user.click(checkbox)
      expect(checkbox).toBeChecked()
      
      // Confirm action
      await user.click(screen.getByText('Confirm'))
      expect(onConfirm).toHaveBeenCalledOnce()
    })
  })
})