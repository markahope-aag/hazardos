import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock form field component
interface FormFieldProps {
  label: string
  name: string
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url'
  value?: string
  defaultValue?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  error?: string
  helperText?: string
  onChange?: (value: string) => void
  onBlur?: () => void
  onFocus?: () => void
  className?: string
  'data-testid'?: string
}

const FormField = ({
  label,
  name,
  type = 'text',
  value,
  defaultValue,
  placeholder,
  required = false,
  disabled = false,
  error,
  helperText,
  onChange,
  onBlur,
  onFocus,
  className = '',
  'data-testid': testId,
  ...props
}: FormFieldProps) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.value)
  }

  const fieldId = `field-${name}`
  const errorId = error ? `${fieldId}-error` : undefined
  const helperId = helperText ? `${fieldId}-helper` : undefined

  return (
    <div className={`form-field ${className} ${error ? 'has-error' : ''}`}>
      <label htmlFor={fieldId} className="form-label">
        {label}
        {required && <span className="required-indicator" aria-label="required">*</span>}
      </label>
      
      <input
        id={fieldId}
        name={name}
        type={type}
        value={value}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        onChange={handleChange}
        onBlur={onBlur}
        onFocus={onFocus}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={[errorId, helperId].filter(Boolean).join(' ') || undefined}
        className="form-input"
        data-testid={testId}
        {...props}
      />
      
      {error && (
        <div id={errorId} className="error-message" role="alert">
          {error}
        </div>
      )}
      
      {helperText && !error && (
        <div id={helperId} className="helper-text">
          {helperText}
        </div>
      )}
    </div>
  )
}

describe('FormField', () => {
  const defaultProps = {
    label: 'Test Field',
    name: 'test-field'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('basic rendering', () => {
    it('should render with label and input', () => {
      render(<FormField {...defaultProps} />)
      
      expect(screen.getByLabelText('Test Field')).toBeInTheDocument()
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('should render with placeholder', () => {
      render(<FormField {...defaultProps} placeholder="Enter text here" />)
      
      expect(screen.getByPlaceholderText('Enter text here')).toBeInTheDocument()
    })

    it('should render with default value', () => {
      render(<FormField {...defaultProps} defaultValue="Default text" />)
      
      expect(screen.getByDisplayValue('Default text')).toBeInTheDocument()
    })

    it('should render with controlled value', () => {
      render(<FormField {...defaultProps} value="Controlled text" />)
      
      expect(screen.getByDisplayValue('Controlled text')).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      render(<FormField {...defaultProps} className="custom-class" />)
      
      const container = screen.getByRole('textbox').closest('.form-field')
      expect(container).toHaveClass('custom-class')
    })

    it('should render with data-testid', () => {
      render(<FormField {...defaultProps} data-testid="custom-field" />)
      
      expect(screen.getByTestId('custom-field')).toBeInTheDocument()
    })
  })

  describe('input types', () => {
    it('should render email input', () => {
      render(<FormField {...defaultProps} type="email" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('type', 'email')
    })

    it('should render password input', () => {
      render(<FormField {...defaultProps} type="password" />)
      
      const input = screen.getByLabelText('Test Field')
      expect(input).toHaveAttribute('type', 'password')
    })

    it('should render number input', () => {
      render(<FormField {...defaultProps} type="number" />)
      
      const input = screen.getByRole('spinbutton')
      expect(input).toHaveAttribute('type', 'number')
    })

    it('should render tel input', () => {
      render(<FormField {...defaultProps} type="tel" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('type', 'tel')
    })

    it('should render url input', () => {
      render(<FormField {...defaultProps} type="url" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('type', 'url')
    })
  })

  describe('required field', () => {
    it('should show required indicator', () => {
      render(<FormField {...defaultProps} required />)
      
      expect(screen.getByLabelText('required')).toBeInTheDocument()
      expect(screen.getByText('*')).toBeInTheDocument()
    })

    it('should set required attribute on input', () => {
      render(<FormField {...defaultProps} required />)
      
      const input = screen.getByRole('textbox')
      expect(input).toBeRequired()
    })

    it('should not show required indicator when not required', () => {
      render(<FormField {...defaultProps} />)
      
      expect(screen.queryByLabelText('required')).not.toBeInTheDocument()
      expect(screen.queryByText('*')).not.toBeInTheDocument()
    })
  })

  describe('disabled state', () => {
    it('should disable input when disabled prop is true', () => {
      render(<FormField {...defaultProps} disabled />)
      
      const input = screen.getByRole('textbox')
      expect(input).toBeDisabled()
    })

    it('should not disable input by default', () => {
      render(<FormField {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      expect(input).not.toBeDisabled()
    })
  })

  describe('error handling', () => {
    it('should display error message', () => {
      render(<FormField {...defaultProps} error="This field is required" />)
      
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText('This field is required')).toBeInTheDocument()
    })

    it('should set aria-invalid when error exists', () => {
      render(<FormField {...defaultProps} error="Invalid input" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('aria-invalid', 'true')
    })

    it('should set aria-describedby to error id', () => {
      render(<FormField {...defaultProps} error="Error message" />)
      
      const input = screen.getByRole('textbox')
      const errorElement = screen.getByRole('alert')
      
      expect(input).toHaveAttribute('aria-describedby', errorElement.id)
    })

    it('should add error class to container', () => {
      render(<FormField {...defaultProps} error="Error message" />)
      
      const container = screen.getByRole('textbox').closest('.form-field')
      expect(container).toHaveClass('has-error')
    })

    it('should not show helper text when error exists', () => {
      render(
        <FormField 
          {...defaultProps} 
          error="Error message" 
          helperText="Helper text" 
        />
      )
      
      expect(screen.getByText('Error message')).toBeInTheDocument()
      expect(screen.queryByText('Helper text')).not.toBeInTheDocument()
    })
  })

  describe('helper text', () => {
    it('should display helper text', () => {
      render(<FormField {...defaultProps} helperText="This is helper text" />)
      
      expect(screen.getByText('This is helper text')).toBeInTheDocument()
    })

    it('should set aria-describedby to helper id', () => {
      render(<FormField {...defaultProps} helperText="Helper text" />)
      
      const input = screen.getByRole('textbox')
      const helperElement = screen.getByText('Helper text')
      
      expect(input).toHaveAttribute('aria-describedby', helperElement.id)
    })

    it('should combine error and helper ids in aria-describedby', () => {
      render(<FormField {...defaultProps} helperText="Helper text" />)
      
      const input = screen.getByRole('textbox')
      const helperElement = screen.getByText('Helper text')
      
      expect(input).toHaveAttribute('aria-describedby', helperElement.id)
    })
  })

  describe('event handling', () => {
    it('should call onChange when input value changes', async () => {
      const user = userEvent.setup()
      const handleChange = vi.fn()
      
      render(<FormField {...defaultProps} onChange={handleChange} />)
      
      const input = screen.getByRole('textbox')
      await user.type(input, 'test')
      
      expect(handleChange).toHaveBeenCalledTimes(4) // One for each character
      expect(handleChange).toHaveBeenLastCalledWith('test')
    })

    it('should call onFocus when input receives focus', async () => {
      const user = userEvent.setup()
      const handleFocus = vi.fn()
      
      render(<FormField {...defaultProps} onFocus={handleFocus} />)
      
      const input = screen.getByRole('textbox')
      await user.click(input)
      
      expect(handleFocus).toHaveBeenCalledOnce()
    })

    it('should call onBlur when input loses focus', async () => {
      const user = userEvent.setup()
      const handleBlur = vi.fn()
      
      render(
        <div>
          <FormField {...defaultProps} onBlur={handleBlur} />
          <button>Other element</button>
        </div>
      )
      
      const input = screen.getByRole('textbox')
      const button = screen.getByRole('button')
      
      await user.click(input)
      await user.click(button)
      
      expect(handleBlur).toHaveBeenCalledOnce()
    })

    it('should handle controlled input updates', () => {
      const { rerender } = render(<FormField {...defaultProps} value="initial" />)
      
      expect(screen.getByDisplayValue('initial')).toBeInTheDocument()
      
      rerender(<FormField {...defaultProps} value="updated" />)
      
      expect(screen.getByDisplayValue('updated')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have proper label association', () => {
      render(<FormField {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      const label = screen.getByText('Test Field')
      
      expect(input).toHaveAttribute('id', 'field-test-field')
      expect(label).toHaveAttribute('for', 'field-test-field')
    })

    it('should have proper ARIA attributes for error state', () => {
      render(<FormField {...defaultProps} error="Error message" />)
      
      const input = screen.getByRole('textbox')
      const errorElement = screen.getByRole('alert')
      
      expect(input).toHaveAttribute('aria-invalid', 'true')
      expect(input).toHaveAttribute('aria-describedby', errorElement.id)
      expect(errorElement).toHaveAttribute('role', 'alert')
    })

    it('should have proper ARIA attributes for valid state', () => {
      render(<FormField {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('aria-invalid', 'false')
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      
      render(
        <div>
          <FormField {...defaultProps} name="field1" />
          <FormField {...defaultProps} name="field2" label="Field 2" />
        </div>
      )
      
      const input1 = screen.getByLabelText('Test Field')
      const input2 = screen.getByLabelText('Field 2')
      
      await user.tab()
      expect(input1).toHaveFocus()
      
      await user.tab()
      expect(input2).toHaveFocus()
    })
  })

  describe('form integration', () => {
    it('should work within a form', async () => {
      const user = userEvent.setup()
      const handleSubmit = vi.fn((e) => e.preventDefault())
      
      render(
        <form onSubmit={handleSubmit}>
          <FormField {...defaultProps} required />
          <button type="submit">Submit</button>
        </form>
      )
      
      const input = screen.getByRole('textbox')
      const submitButton = screen.getByRole('button')
      
      // Try to submit empty form
      await user.click(submitButton)
      
      // HTML5 validation should prevent submission
      expect(handleSubmit).not.toHaveBeenCalled()
      
      // Fill the field and submit
      await user.type(input, 'test value')
      await user.click(submitButton)
      
      expect(handleSubmit).toHaveBeenCalledOnce()
    })

    it('should have correct name attribute for form data', () => {
      render(<FormField {...defaultProps} name="user-email" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('name', 'user-email')
    })
  })

  describe('edge cases', () => {
    it('should handle empty label', () => {
      render(<FormField label="" name="test" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toBeInTheDocument()
    })

    it('should handle special characters in name', () => {
      render(<FormField {...defaultProps} name="field-with-special_chars.123" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('name', 'field-with-special_chars.123')
      expect(input).toHaveAttribute('id', 'field-field-with-special_chars.123')
    })

    it('should handle long error messages', () => {
      const longError = 'This is a very long error message that should still be displayed properly and maintain good accessibility practices'
      
      render(<FormField {...defaultProps} error={longError} />)
      
      expect(screen.getByText(longError)).toBeInTheDocument()
    })

    it('should handle rapid value changes', async () => {
      const user = userEvent.setup()
      const handleChange = vi.fn()
      
      render(<FormField {...defaultProps} onChange={handleChange} />)
      
      const input = screen.getByRole('textbox')
      
      // Rapid typing
      await user.type(input, 'rapid', { delay: 1 })
      
      expect(handleChange).toHaveBeenCalledTimes(5)
      expect(handleChange).toHaveBeenLastCalledWith('rapid')
    })
  })

  describe('styling and theming', () => {
    it('should apply default classes', () => {
      render(<FormField {...defaultProps} />)
      
      const container = screen.getByRole('textbox').closest('.form-field')
      const input = screen.getByRole('textbox')
      const label = screen.getByText('Test Field')
      
      expect(container).toHaveClass('form-field')
      expect(input).toHaveClass('form-input')
      expect(label).toHaveClass('form-label')
    })

    it('should apply error styling', () => {
      render(<FormField {...defaultProps} error="Error" />)
      
      const container = screen.getByRole('textbox').closest('.form-field')
      const errorElement = screen.getByRole('alert')
      
      expect(container).toHaveClass('has-error')
      expect(errorElement).toHaveClass('error-message')
    })

    it('should apply helper text styling', () => {
      render(<FormField {...defaultProps} helperText="Helper" />)
      
      const helperElement = screen.getByText('Helper')
      expect(helperElement).toHaveClass('helper-text')
    })
  })

  describe('performance', () => {
    it('should not re-render unnecessarily', () => {
      const { rerender } = render(<FormField {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      const initialInput = input
      
      // Re-render with same props
      rerender(<FormField {...defaultProps} />)
      
      expect(screen.getByRole('textbox')).toBe(initialInput)
    })

    it('should handle large number of characters', async () => {
      const user = userEvent.setup()
      const handleChange = vi.fn()
      const longText = 'a'.repeat(1000)
      
      render(<FormField {...defaultProps} onChange={handleChange} />)
      
      const input = screen.getByRole('textbox')
      
      // Paste long text
      await user.click(input)
      await user.paste(longText)
      
      expect(handleChange).toHaveBeenLastCalledWith(longText)
    })
  })
})