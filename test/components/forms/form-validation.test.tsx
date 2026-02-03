import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock form validation utilities
interface ValidationRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  email?: boolean
  custom?: (value: string) => string | null
}

interface FormErrors {
  [key: string]: string | null
}

class FormValidator {
  private rules: Record<string, ValidationRule> = {}
  private errors: FormErrors = {}

  setRules(fieldRules: Record<string, ValidationRule>): void {
    this.rules = fieldRules
  }

  validateField(name: string, value: string): string | null {
    const rule = this.rules[name]
    if (!rule) return null

    // Required validation
    if (rule.required && (!value || value.trim() === '')) {
      return 'This field is required'
    }

    // Skip other validations if field is empty and not required
    if (!value && !rule.required) {
      return null
    }

    // Min length validation
    if (rule.minLength && value.length < rule.minLength) {
      return `Must be at least ${rule.minLength} characters`
    }

    // Max length validation
    if (rule.maxLength && value.length > rule.maxLength) {
      return `Must be no more than ${rule.maxLength} characters`
    }

    // Email validation
    if (rule.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(value)) {
        return 'Please enter a valid email address'
      }
    }

    // Pattern validation
    if (rule.pattern && !rule.pattern.test(value)) {
      return 'Please enter a valid format'
    }

    // Custom validation
    if (rule.custom) {
      const customError = rule.custom(value)
      if (customError) {
        return customError
      }
    }

    return null
  }

  validateAll(values: Record<string, string>): FormErrors {
    const errors: FormErrors = {}
    
    Object.keys(this.rules).forEach(fieldName => {
      const value = values[fieldName] || ''
      errors[fieldName] = this.validateField(fieldName, value)
    })

    this.errors = errors
    return errors
  }

  getErrors(): FormErrors {
    return { ...this.errors }
  }

  hasErrors(): boolean {
    return Object.values(this.errors).some(error => error !== null)
  }

  clearErrors(): void {
    this.errors = {}
  }

  clearFieldError(fieldName: string): void {
    this.errors[fieldName] = null
  }
}

// Mock validated form component
interface ValidatedFormProps {
  onSubmit: (values: Record<string, string>) => void
  validationRules: Record<string, ValidationRule>
  children: React.ReactNode
}

const ValidatedForm = ({ onSubmit, validationRules, children }: ValidatedFormProps) => {
  const [values, setValues] = React.useState<Record<string, string>>({})
  const [errors, setErrors] = React.useState<FormErrors>({})
  const [touched, setTouched] = React.useState<Record<string, boolean>>({})
  const validator = React.useRef(new FormValidator())

  React.useEffect(() => {
    validator.current.setRules(validationRules)
  }, [validationRules])

  const handleChange = (name: string, value: string) => {
    setValues(prev => ({ ...prev, [name]: value }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }))
    }
  }

  const handleBlur = (name: string) => {
    setTouched(prev => ({ ...prev, [name]: true }))
    
    const value = values[name] || ''
    const error = validator.current.validateField(name, value)
    setErrors(prev => ({ ...prev, [name]: error }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const allErrors = validator.current.validateAll(values)
    setErrors(allErrors)
    setTouched(Object.keys(validationRules).reduce((acc, key) => ({ ...acc, [key]: true }), {}))
    
    if (!validator.current.hasErrors()) {
      onSubmit(values)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {React.Children.map(children, child => {
        if (React.isValidElement(child) && child.props.name) {
          const name = child.props.name
          return React.cloneElement(child, {
            value: values[name] || '',
            error: touched[name] ? errors[name] : null,
            onChange: (value: string) => handleChange(name, value),
            onBlur: () => handleBlur(name)
          })
        }
        return child
      })}
    </form>
  )
}

// Mock form field for testing
interface TestFieldProps {
  name: string
  label: string
  value?: string
  error?: string | null
  onChange?: (value: string) => void
  onBlur?: () => void
  type?: string
}

const TestField = ({ name, label, value = '', error, onChange, onBlur, type = 'text' }: TestFieldProps) => (
  <div>
    <label htmlFor={name}>{label}</label>
    <input
      id={name}
      name={name}
      type={type}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      onBlur={onBlur}
    />
    {error && <div role="alert" data-testid={`${name}-error`}>{error}</div>}
  </div>
)

describe('FormValidator', () => {
  let validator: FormValidator

  beforeEach(() => {
    validator = new FormValidator()
  })

  describe('required validation', () => {
    beforeEach(() => {
      validator.setRules({
        name: { required: true }
      })
    })

    it('should return error for empty required field', () => {
      const error = validator.validateField('name', '')
      expect(error).toBe('This field is required')
    })

    it('should return error for whitespace-only required field', () => {
      const error = validator.validateField('name', '   ')
      expect(error).toBe('This field is required')
    })

    it('should return null for valid required field', () => {
      const error = validator.validateField('name', 'John Doe')
      expect(error).toBeNull()
    })
  })

  describe('length validation', () => {
    beforeEach(() => {
      validator.setRules({
        password: { minLength: 8, maxLength: 20 }
      })
    })

    it('should return error for too short value', () => {
      const error = validator.validateField('password', 'short')
      expect(error).toBe('Must be at least 8 characters')
    })

    it('should return error for too long value', () => {
      const error = validator.validateField('password', 'a'.repeat(25))
      expect(error).toBe('Must be no more than 20 characters')
    })

    it('should return null for valid length', () => {
      const error = validator.validateField('password', 'validpassword')
      expect(error).toBeNull()
    })

    it('should skip length validation for empty non-required field', () => {
      const error = validator.validateField('password', '')
      expect(error).toBeNull()
    })
  })

  describe('email validation', () => {
    beforeEach(() => {
      validator.setRules({
        email: { email: true }
      })
    })

    it('should return error for invalid email', () => {
      const error = validator.validateField('email', 'invalid-email')
      expect(error).toBe('Please enter a valid email address')
    })

    it('should return null for valid email', () => {
      const error = validator.validateField('email', 'test@example.com')
      expect(error).toBeNull()
    })

    it('should return null for empty non-required email field', () => {
      const error = validator.validateField('email', '')
      expect(error).toBeNull()
    })
  })

  describe('pattern validation', () => {
    beforeEach(() => {
      validator.setRules({
        phone: { pattern: /^\d{3}-\d{3}-\d{4}$/ }
      })
    })

    it('should return error for invalid pattern', () => {
      const error = validator.validateField('phone', '1234567890')
      expect(error).toBe('Please enter a valid format')
    })

    it('should return null for valid pattern', () => {
      const error = validator.validateField('phone', '123-456-7890')
      expect(error).toBeNull()
    })
  })

  describe('custom validation', () => {
    beforeEach(() => {
      validator.setRules({
        username: {
          custom: (value) => {
            if (value.includes(' ')) {
              return 'Username cannot contain spaces'
            }
            if (value.length < 3) {
              return 'Username must be at least 3 characters'
            }
            return null
          }
        }
      })
    })

    it('should return custom error message', () => {
      const error = validator.validateField('username', 'user name')
      expect(error).toBe('Username cannot contain spaces')
    })

    it('should return null for valid custom validation', () => {
      const error = validator.validateField('username', 'validuser')
      expect(error).toBeNull()
    })
  })

  describe('validateAll', () => {
    beforeEach(() => {
      validator.setRules({
        name: { required: true },
        email: { required: true, email: true },
        password: { required: true, minLength: 8 }
      })
    })

    it('should validate all fields and return errors', () => {
      const errors = validator.validateAll({
        name: '',
        email: 'invalid-email',
        password: 'short'
      })

      expect(errors.name).toBe('This field is required')
      expect(errors.email).toBe('Please enter a valid email address')
      expect(errors.password).toBe('Must be at least 8 characters')
    })

    it('should return no errors for valid values', () => {
      const errors = validator.validateAll({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'validpassword'
      })

      expect(errors.name).toBeNull()
      expect(errors.email).toBeNull()
      expect(errors.password).toBeNull()
    })

    it('should update hasErrors() correctly', () => {
      validator.validateAll({
        name: '',
        email: 'john@example.com',
        password: 'validpassword'
      })

      expect(validator.hasErrors()).toBe(true)

      validator.validateAll({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'validpassword'
      })

      expect(validator.hasErrors()).toBe(false)
    })
  })

  describe('error management', () => {
    beforeEach(() => {
      validator.setRules({
        name: { required: true },
        email: { required: true, email: true }
      })
    })

    it('should clear all errors', () => {
      validator.validateAll({ name: '', email: 'invalid' })
      expect(validator.hasErrors()).toBe(true)

      validator.clearErrors()
      expect(validator.hasErrors()).toBe(false)
    })

    it('should clear specific field error', () => {
      validator.validateAll({ name: '', email: 'valid@example.com' })
      expect(validator.getErrors().name).toBe('This field is required')

      validator.clearFieldError('name')
      expect(validator.getErrors().name).toBeNull()
    })
  })
})

describe('ValidatedForm Integration', () => {
  const mockSubmit = vi.fn()

  beforeEach(() => {
    mockSubmit.mockClear()
  })

  const renderForm = (rules: Record<string, ValidationRule> = {}) => {
    return render(
      <ValidatedForm onSubmit={mockSubmit} validationRules={rules}>
        <TestField name="name" label="Name" />
        <TestField name="email" label="Email" type="email" />
        <TestField name="password" label="Password" type="password" />
        <button type="submit">Submit</button>
      </ValidatedForm>
    )
  }

  describe('form submission', () => {
    it('should prevent submission with validation errors', async () => {
      const user = userEvent.setup()
      
      renderForm({
        name: { required: true },
        email: { required: true, email: true }
      })

      const submitButton = screen.getByRole('button', { name: 'Submit' })
      await user.click(submitButton)

      expect(mockSubmit).not.toHaveBeenCalled()
      expect(screen.getByTestId('name-error')).toHaveTextContent('This field is required')
      expect(screen.getByTestId('email-error')).toHaveTextContent('This field is required')
    })

    it('should submit form with valid data', async () => {
      const user = userEvent.setup()
      
      renderForm({
        name: { required: true },
        email: { required: true, email: true }
      })

      const nameInput = screen.getByLabelText('Name')
      const emailInput = screen.getByLabelText('Email')
      const submitButton = screen.getByRole('button', { name: 'Submit' })

      await user.type(nameInput, 'John Doe')
      await user.type(emailInput, 'john@example.com')
      await user.click(submitButton)

      expect(mockSubmit).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john@example.com',
        password: ''
      })
    })
  })

  describe('real-time validation', () => {
    it('should validate on blur', async () => {
      const user = userEvent.setup()
      
      renderForm({
        email: { required: true, email: true }
      })

      const emailInput = screen.getByLabelText('Email')
      
      await user.type(emailInput, 'invalid-email')
      await user.tab() // Trigger blur

      await waitFor(() => {
        expect(screen.getByTestId('email-error')).toHaveTextContent('Please enter a valid email address')
      })
    })

    it('should clear error when user starts typing', async () => {
      const user = userEvent.setup()
      
      renderForm({
        name: { required: true }
      })

      const nameInput = screen.getByLabelText('Name')
      const submitButton = screen.getByRole('button', { name: 'Submit' })

      // Trigger validation error
      await user.click(submitButton)
      expect(screen.getByTestId('name-error')).toBeInTheDocument()

      // Start typing to clear error
      await user.type(nameInput, 'J')
      
      await waitFor(() => {
        expect(screen.queryByTestId('name-error')).not.toBeInTheDocument()
      })
    })

    it('should show error immediately on blur after form submission attempt', async () => {
      const user = userEvent.setup()
      
      renderForm({
        email: { required: true, email: true }
      })

      const emailInput = screen.getByLabelText('Email')
      const submitButton = screen.getByRole('button', { name: 'Submit' })

      // Try to submit empty form
      await user.click(submitButton)
      
      // Clear the error by typing
      await user.type(emailInput, 'valid@example.com')
      
      // Clear field and blur - should show error immediately
      await user.clear(emailInput)
      await user.tab()

      await waitFor(() => {
        expect(screen.getByTestId('email-error')).toHaveTextContent('This field is required')
      })
    })
  })

  describe('complex validation scenarios', () => {
    it('should handle multiple validation rules', async () => {
      const user = userEvent.setup()
      
      renderForm({
        password: { 
          required: true, 
          minLength: 8,
          custom: (value) => {
            if (!/[A-Z]/.test(value)) {
              return 'Password must contain at least one uppercase letter'
            }
            return null
          }
        }
      })

      const passwordInput = screen.getByLabelText('Password')
      
      // Test required validation
      await user.tab() // Focus and blur empty field
      await user.tab()
      
      await waitFor(() => {
        expect(screen.getByTestId('password-error')).toHaveTextContent('This field is required')
      })

      // Test min length validation
      await user.type(passwordInput, 'short')
      await user.tab()
      
      await waitFor(() => {
        expect(screen.getByTestId('password-error')).toHaveTextContent('Must be at least 8 characters')
      })

      // Test custom validation
      await user.clear(passwordInput)
      await user.type(passwordInput, 'longenough')
      await user.tab()
      
      await waitFor(() => {
        expect(screen.getByTestId('password-error')).toHaveTextContent('Password must contain at least one uppercase letter')
      })

      // Test valid password
      await user.clear(passwordInput)
      await user.type(passwordInput, 'ValidPassword')
      await user.tab()
      
      await waitFor(() => {
        expect(screen.queryByTestId('password-error')).not.toBeInTheDocument()
      })
    })

    it('should handle conditional validation', async () => {
      const user = userEvent.setup()
      
      const ConditionalForm = () => {
        const [showConfirm, setShowConfirm] = React.useState(false)
        const [password, setPassword] = React.useState('')
        
        return (
          <ValidatedForm 
            onSubmit={mockSubmit}
            validationRules={{
              password: { required: true, minLength: 8 },
              confirmPassword: showConfirm ? {
                required: true,
                custom: (value) => value !== password ? 'Passwords do not match' : null
              } : {}
            }}
          >
            <TestField 
              name="password" 
              label="Password" 
              type="password"
              onChange={(value) => {
                setPassword(value)
                setShowConfirm(value.length > 0)
              }}
            />
            {showConfirm && (
              <TestField name="confirmPassword" label="Confirm Password" type="password" />
            )}
            <button type="submit">Submit</button>
          </ValidatedForm>
        )
      }

      render(<ConditionalForm />)

      const passwordInput = screen.getByLabelText('Password')
      
      // Type password to show confirm field
      await user.type(passwordInput, 'ValidPassword')
      
      const confirmInput = screen.getByLabelText('Confirm Password')
      expect(confirmInput).toBeInTheDocument()

      // Type mismatched confirmation
      await user.type(confirmInput, 'DifferentPassword')
      await user.tab()

      await waitFor(() => {
        expect(screen.getByTestId('confirmPassword-error')).toHaveTextContent('Passwords do not match')
      })

      // Fix confirmation
      await user.clear(confirmInput)
      await user.type(confirmInput, 'ValidPassword')
      await user.tab()

      await waitFor(() => {
        expect(screen.queryByTestId('confirmPassword-error')).not.toBeInTheDocument()
      })
    })
  })

  describe('accessibility', () => {
    it('should associate errors with form fields', async () => {
      const user = userEvent.setup()
      
      renderForm({
        name: { required: true }
      })

      const submitButton = screen.getByRole('button', { name: 'Submit' })
      await user.click(submitButton)

      const errorElement = screen.getByTestId('name-error')
      expect(errorElement).toHaveAttribute('role', 'alert')
    })

    it('should maintain focus management', async () => {
      const user = userEvent.setup()
      
      renderForm({
        name: { required: true },
        email: { required: true }
      })

      const nameInput = screen.getByLabelText('Name')
      const emailInput = screen.getByLabelText('Email')

      await user.tab()
      expect(nameInput).toHaveFocus()

      await user.tab()
      expect(emailInput).toHaveFocus()
    })
  })

  describe('performance', () => {
    it('should not re-validate unnecessarily', async () => {
      const user = userEvent.setup()
      const customValidator = vi.fn().mockReturnValue(null)
      
      renderForm({
        name: { custom: customValidator }
      })

      const nameInput = screen.getByLabelText('Name')
      
      await user.type(nameInput, 'test')
      
      // Should only validate on blur, not on every keystroke
      expect(customValidator).not.toHaveBeenCalled()
      
      await user.tab()
      
      expect(customValidator).toHaveBeenCalledOnce()
    })

    it('should handle rapid input changes', async () => {
      const user = userEvent.setup()
      
      renderForm({
        name: { required: true }
      })

      const nameInput = screen.getByLabelText('Name')
      
      // Rapid typing should not cause issues
      await user.type(nameInput, 'rapid typing test', { delay: 1 })
      
      expect(nameInput).toHaveValue('rapid typing test')
    })
  })
})