import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { ContactForm } from '@/components/forms/contact-form'
import { toast } from '@/lib/hooks/use-toast'

// Mock dependencies
vi.mock('@/lib/hooks/use-toast', () => ({
  toast: vi.fn(),
}))

vi.mock('@/lib/services/email-service', () => ({
  EmailService: {
    sendContactForm: vi.fn(),
  },
}))

const mockToast = vi.mocked(toast)

describe('ContactForm', () => {
  const defaultProps = {
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Form Rendering', () => {
    it('renders all form fields', () => {
      render(<ContactForm {...defaultProps} />)

      expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/phone/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/company/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/subject/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/message/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('renders with custom title and description', () => {
      render(
        <ContactForm
          {...defaultProps}
          title="Get in Touch"
          description="We'd love to hear from you"
        />
      )

      expect(screen.getByText('Get in Touch')).toBeInTheDocument()
      expect(screen.getByText("We'd love to hear from you")).toBeInTheDocument()
    })

    it('renders with pre-filled values', () => {
      const initialValues = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        company: 'Acme Corp',
        subject: 'Inquiry',
        message: 'Hello there',
      }

      render(<ContactForm {...defaultProps} initialValues={initialValues} />)

      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument()
      expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument()
      expect(screen.getByDisplayValue('+1234567890')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Acme Corp')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Inquiry')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Hello there')).toBeInTheDocument()
    })

    it('shows required field indicators', () => {
      render(<ContactForm {...defaultProps} />)

      const nameLabel = screen.getByText(/name/i)
      const emailLabel = screen.getByText(/email/i)
      const messageLabel = screen.getByText(/message/i)

      expect(nameLabel).toHaveTextContent('*')
      expect(emailLabel).toHaveTextContent('*')
      expect(messageLabel).toHaveTextContent('*')
    })
  })

  describe('Form Validation', () => {
    it('validates required fields', async () => {
      const user = userEvent.setup()
      render(<ContactForm {...defaultProps} />)

      const submitButton = screen.getByRole('button', { name: /send message/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument()
        expect(screen.getByText(/email is required/i)).toBeInTheDocument()
        expect(screen.getByText(/message is required/i)).toBeInTheDocument()
      })

      expect(defaultProps.onSubmit).not.toHaveBeenCalled()
    })

    it('validates email format', async () => {
      const user = userEvent.setup()
      render(<ContactForm {...defaultProps} />)

      const emailInput = screen.getByLabelText(/email/i)
      await user.type(emailInput, 'invalid-email')

      const submitButton = screen.getByRole('button', { name: /send message/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/invalid email format/i)).toBeInTheDocument()
      })
    })

    it('validates phone number format', async () => {
      const user = userEvent.setup()
      render(<ContactForm {...defaultProps} />)

      const phoneInput = screen.getByLabelText(/phone/i)
      await user.type(phoneInput, 'invalid-phone')

      const submitButton = screen.getByRole('button', { name: /send message/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/invalid phone number format/i)).toBeInTheDocument()
      })
    })

    it('validates message length', async () => {
      const user = userEvent.setup()
      render(<ContactForm {...defaultProps} />)

      const messageInput = screen.getByLabelText(/message/i)
      await user.type(messageInput, 'Hi') // Too short

      const submitButton = screen.getByRole('button', { name: /send message/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/message must be at least 10 characters/i)).toBeInTheDocument()
      })
    })

    it('validates maximum field lengths', async () => {
      const user = userEvent.setup()
      render(<ContactForm {...defaultProps} />)

      const nameInput = screen.getByLabelText(/name/i)
      const longName = 'A'.repeat(101) // Exceeds 100 character limit

      await user.type(nameInput, longName)

      const submitButton = screen.getByRole('button', { name: /send message/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/name must be less than 100 characters/i)).toBeInTheDocument()
      })
    })

    it('shows real-time validation feedback', async () => {
      const user = userEvent.setup()
      render(<ContactForm {...defaultProps} />)

      const emailInput = screen.getByLabelText(/email/i)
      
      // Type invalid email
      await user.type(emailInput, 'invalid')
      await user.tab() // Trigger blur event

      await waitFor(() => {
        expect(screen.getByText(/invalid email format/i)).toBeInTheDocument()
      })

      // Fix the email
      await user.clear(emailInput)
      await user.type(emailInput, 'valid@example.com')
      await user.tab()

      await waitFor(() => {
        expect(screen.queryByText(/invalid email format/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Form Submission', () => {
    it('submits form with valid data', async () => {
      const user = userEvent.setup()
      const { EmailService } = await import('@/lib/services/email-service')
      vi.mocked(EmailService.sendContactForm).mockResolvedValue({ success: true })

      render(<ContactForm {...defaultProps} />)

      // Fill out the form
      await user.type(screen.getByLabelText(/name/i), 'John Doe')
      await user.type(screen.getByLabelText(/email/i), 'john@example.com')
      await user.type(screen.getByLabelText(/phone/i), '+1234567890')
      await user.type(screen.getByLabelText(/company/i), 'Acme Corp')
      await user.type(screen.getByLabelText(/subject/i), 'Inquiry')
      await user.type(screen.getByLabelText(/message/i), 'This is a test message')

      const submitButton = screen.getByRole('button', { name: /send message/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalledWith({
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          company: 'Acme Corp',
          subject: 'Inquiry',
          message: 'This is a test message',
        })
      })

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Message sent!',
        description: 'Thank you for contacting us. We\'ll get back to you soon.',
        variant: 'default',
      })
    })

    it('handles submission errors', async () => {
      const user = userEvent.setup()
      const { EmailService } = await import('@/lib/services/email-service')
      vi.mocked(EmailService.sendContactForm).mockRejectedValue(new Error('Network error'))

      render(<ContactForm {...defaultProps} />)

      // Fill out required fields
      await user.type(screen.getByLabelText(/name/i), 'John Doe')
      await user.type(screen.getByLabelText(/email/i), 'john@example.com')
      await user.type(screen.getByLabelText(/message/i), 'This is a test message')

      const submitButton = screen.getByRole('button', { name: /send message/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error sending message',
          description: 'Please try again later or contact us directly.',
          variant: 'destructive',
        })
      })
    })

    it('shows loading state during submission', async () => {
      const user = userEvent.setup()
      const { EmailService } = await import('@/lib/services/email-service')
      
      // Create a promise that we can control
      let resolveSubmission: (value: any) => void
      const submissionPromise = new Promise((resolve) => {
        resolveSubmission = resolve
      })
      vi.mocked(EmailService.sendContactForm).mockReturnValue(submissionPromise)

      render(<ContactForm {...defaultProps} />)

      // Fill out required fields
      await user.type(screen.getByLabelText(/name/i), 'John Doe')
      await user.type(screen.getByLabelText(/email/i), 'john@example.com')
      await user.type(screen.getByLabelText(/message/i), 'This is a test message')

      const submitButton = screen.getByRole('button', { name: /send message/i })
      await user.click(submitButton)

      // Check loading state
      expect(screen.getByRole('button', { name: /sending/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sending/i })).toBeDisabled()

      // Resolve the submission
      resolveSubmission!({ success: true })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /send message/i })).not.toBeDisabled()
      })
    })

    it('prevents double submission', async () => {
      const user = userEvent.setup()
      const { EmailService } = await import('@/lib/services/email-service')
      vi.mocked(EmailService.sendContactForm).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      )

      render(<ContactForm {...defaultProps} />)

      // Fill out required fields
      await user.type(screen.getByLabelText(/name/i), 'John Doe')
      await user.type(screen.getByLabelText(/email/i), 'john@example.com')
      await user.type(screen.getByLabelText(/message/i), 'This is a test message')

      const submitButton = screen.getByRole('button', { name: /send message/i })
      
      // Click submit multiple times rapidly
      await user.click(submitButton)
      await user.click(submitButton)
      await user.click(submitButton)

      // Wait for submission to complete
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /send message/i })).not.toBeDisabled()
      })

      // Should only be called once
      expect(EmailService.sendContactForm).toHaveBeenCalledTimes(1)
    })
  })

  describe('Form Interactions', () => {
    it('handles cancel button', async () => {
      const user = userEvent.setup()
      render(<ContactForm {...defaultProps} />)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      expect(defaultProps.onCancel).toHaveBeenCalled()
    })

    it('clears form when reset', async () => {
      const user = userEvent.setup()
      render(<ContactForm {...defaultProps} showReset />)

      // Fill out some fields
      await user.type(screen.getByLabelText(/name/i), 'John Doe')
      await user.type(screen.getByLabelText(/email/i), 'john@example.com')

      const resetButton = screen.getByRole('button', { name: /reset/i })
      await user.click(resetButton)

      expect(screen.getByLabelText(/name/i)).toHaveValue('')
      expect(screen.getByLabelText(/email/i)).toHaveValue('')
    })

    it('auto-saves draft data', async () => {
      const user = userEvent.setup()
      render(<ContactForm {...defaultProps} autoSave />)

      const nameInput = screen.getByLabelText(/name/i)
      await user.type(nameInput, 'John Doe')

      // Wait for auto-save debounce
      await waitFor(() => {
        const savedData = localStorage.getItem('contact-form-draft')
        expect(savedData).toBeTruthy()
        const parsed = JSON.parse(savedData!)
        expect(parsed.name).toBe('John Doe')
      }, { timeout: 2000 })
    })

    it('restores draft data on load', () => {
      const draftData = {
        name: 'Draft Name',
        email: 'draft@example.com',
        message: 'Draft message',
      }
      localStorage.setItem('contact-form-draft', JSON.stringify(draftData))

      render(<ContactForm {...defaultProps} autoSave />)

      expect(screen.getByDisplayValue('Draft Name')).toBeInTheDocument()
      expect(screen.getByDisplayValue('draft@example.com')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Draft message')).toBeInTheDocument()
    })

    it('clears draft after successful submission', async () => {
      const user = userEvent.setup()
      const { EmailService } = await import('@/lib/services/email-service')
      vi.mocked(EmailService.sendContactForm).mockResolvedValue({ success: true })

      // Set up draft data
      localStorage.setItem('contact-form-draft', JSON.stringify({ name: 'Draft' }))

      render(<ContactForm {...defaultProps} autoSave />)

      // Fill and submit form
      await user.type(screen.getByLabelText(/name/i), 'John Doe')
      await user.type(screen.getByLabelText(/email/i), 'john@example.com')
      await user.type(screen.getByLabelText(/message/i), 'This is a test message')

      const submitButton = screen.getByRole('button', { name: /send message/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(localStorage.getItem('contact-form-draft')).toBeNull()
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper form labels and associations', () => {
      render(<ContactForm {...defaultProps} />)

      const nameInput = screen.getByLabelText(/name/i)
      const emailInput = screen.getByLabelText(/email/i)
      const messageInput = screen.getByLabelText(/message/i)

      expect(nameInput).toHaveAttribute('id')
      expect(emailInput).toHaveAttribute('id')
      expect(messageInput).toHaveAttribute('id')

      // Check aria-describedby for error messages
      expect(nameInput).toHaveAttribute('aria-describedby')
      expect(emailInput).toHaveAttribute('aria-describedby')
      expect(messageInput).toHaveAttribute('aria-describedby')
    })

    it('announces validation errors to screen readers', async () => {
      const user = userEvent.setup()
      render(<ContactForm {...defaultProps} />)

      const submitButton = screen.getByRole('button', { name: /send message/i })
      await user.click(submitButton)

      await waitFor(() => {
        const errorMessages = screen.getAllByRole('alert')
        expect(errorMessages.length).toBeGreaterThan(0)
        
        errorMessages.forEach(error => {
          expect(error).toHaveAttribute('aria-live', 'polite')
        })
      })
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<ContactForm {...defaultProps} />)

      const nameInput = screen.getByLabelText(/name/i)
      
      // Focus first input
      nameInput.focus()
      expect(nameInput).toHaveFocus()

      // Tab through all inputs
      await user.tab()
      expect(screen.getByLabelText(/email/i)).toHaveFocus()

      await user.tab()
      expect(screen.getByLabelText(/phone/i)).toHaveFocus()

      await user.tab()
      expect(screen.getByLabelText(/company/i)).toHaveFocus()

      await user.tab()
      expect(screen.getByLabelText(/subject/i)).toHaveFocus()

      await user.tab()
      expect(screen.getByLabelText(/message/i)).toHaveFocus()

      await user.tab()
      expect(screen.getByRole('button', { name: /send message/i })).toHaveFocus()
    })

    it('handles Enter key submission', async () => {
      const user = userEvent.setup()
      const { EmailService } = await import('@/lib/services/email-service')
      vi.mocked(EmailService.sendContactForm).mockResolvedValue({ success: true })

      render(<ContactForm {...defaultProps} />)

      // Fill out required fields
      await user.type(screen.getByLabelText(/name/i), 'John Doe')
      await user.type(screen.getByLabelText(/email/i), 'john@example.com')
      await user.type(screen.getByLabelText(/message/i), 'This is a test message')

      // Press Enter in any input field
      await user.type(screen.getByLabelText(/name/i), '{enter}')

      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalled()
      })
    })

    it('provides clear focus indicators', () => {
      render(<ContactForm {...defaultProps} />)

      const inputs = [
        screen.getByLabelText(/name/i),
        screen.getByLabelText(/email/i),
        screen.getByLabelText(/message/i),
      ]

      inputs.forEach(input => {
        input.focus()
        expect(input).toHaveClass('focus:ring-2')
        expect(input).toHaveClass('focus:ring-blue-500')
      })
    })
  })

  describe('Integration Tests', () => {
    it('handles complete user workflow', async () => {
      const user = userEvent.setup()
      const { EmailService } = await import('@/lib/services/email-service')
      vi.mocked(EmailService.sendContactForm).mockResolvedValue({ success: true })

      render(<ContactForm {...defaultProps} autoSave />)

      // User starts typing (auto-save should kick in)
      await user.type(screen.getByLabelText(/name/i), 'John Doe')
      await user.type(screen.getByLabelText(/email/i), 'john@example.com')
      
      // User navigates away and comes back (draft should be restored)
      // This is simulated by checking localStorage
      await waitFor(() => {
        const draft = localStorage.getItem('contact-form-draft')
        expect(draft).toBeTruthy()
      }, { timeout: 2000 })

      // User completes and submits form
      await user.type(screen.getByLabelText(/message/i), 'This is my inquiry')
      
      const submitButton = screen.getByRole('button', { name: /send message/i })
      await user.click(submitButton)

      // Verify submission and cleanup
      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalled()
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Message sent!',
          })
        )
        expect(localStorage.getItem('contact-form-draft')).toBeNull()
      })
    })

    it('handles network interruption gracefully', async () => {
      const user = userEvent.setup()
      const { EmailService } = await import('@/lib/services/email-service')
      
      // First attempt fails
      vi.mocked(EmailService.sendContactForm).mockRejectedValueOnce(new Error('Network error'))
      // Second attempt succeeds
      vi.mocked(EmailService.sendContactForm).mockResolvedValueOnce({ success: true })

      render(<ContactForm {...defaultProps} />)

      // Fill and submit form
      await user.type(screen.getByLabelText(/name/i), 'John Doe')
      await user.type(screen.getByLabelText(/email/i), 'john@example.com')
      await user.type(screen.getByLabelText(/message/i), 'This is a test message')

      const submitButton = screen.getByRole('button', { name: /send message/i })
      await user.click(submitButton)

      // First attempt should show error
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Error sending message',
            variant: 'destructive',
          })
        )
      })

      // Retry should work
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Message sent!',
          })
        )
      })
    })
  })
})