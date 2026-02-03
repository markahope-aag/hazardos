import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Input } from '@/components/ui/input'

describe('Input', () => {
  it('should render input element', () => {
    render(<Input placeholder="Enter text" />)
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument()
  })

  it('should render with default type text', () => {
    render(<Input data-testid="test-input" />)
    
    const input = screen.getByTestId('test-input')
    expect(input).toHaveAttribute('type', 'text')
  })

  it('should render with specified type', () => {
    render(<Input type="email" data-testid="email-input" />)
    
    const input = screen.getByTestId('email-input')
    expect(input).toHaveAttribute('type', 'email')
  })

  it('should apply default styling', () => {
    render(<Input data-testid="styled-input" />)
    
    const input = screen.getByTestId('styled-input')
    expect(input).toHaveClass(
      'flex',
      'h-10',
      'w-full',
      'rounded-md',
      'border',
      'border-gray-300',
      'bg-white',
      'px-3',
      'py-2',
      'text-sm'
    )
  })

  it('should apply focus styling', () => {
    render(<Input data-testid="focus-input" />)
    
    const input = screen.getByTestId('focus-input')
    expect(input).toHaveClass(
      'focus-visible:outline-none',
      'focus-visible:ring-2',
      'focus-visible:ring-primary',
      'focus-visible:ring-offset-2'
    )
  })

  it('should apply disabled styling', () => {
    render(<Input disabled data-testid="disabled-input" />)
    
    const input = screen.getByTestId('disabled-input')
    expect(input).toBeDisabled()
    expect(input).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50')
  })

  it('should apply placeholder styling', () => {
    render(<Input placeholder="Placeholder text" data-testid="placeholder-input" />)
    
    const input = screen.getByTestId('placeholder-input')
    expect(input).toHaveClass('placeholder:text-gray-500')
  })

  it('should apply file input styling', () => {
    render(<Input type="file" data-testid="file-input" />)
    
    const input = screen.getByTestId('file-input')
    expect(input).toHaveClass(
      'file:border-0',
      'file:bg-transparent',
      'file:text-sm',
      'file:font-medium'
    )
  })

  it('should apply custom className', () => {
    render(<Input className="custom-input-class" data-testid="custom-input" />)
    
    const input = screen.getByTestId('custom-input')
    expect(input).toHaveClass('custom-input-class')
  })

  it('should handle aria-invalid prop', () => {
    render(<Input aria-invalid={true} data-testid="invalid-input" />)
    
    const input = screen.getByTestId('invalid-input')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveClass('border-red-500', 'focus-visible:ring-red-500')
  })

  it('should handle aria-describedby prop', () => {
    render(<Input aria-describedby="error-message" data-testid="described-input" />)
    
    const input = screen.getByTestId('described-input')
    expect(input).toHaveAttribute('aria-describedby', 'error-message')
  })

  it('should handle value and onChange', () => {
    const handleChange = vi.fn()
    render(<Input value="test value" onChange={handleChange} data-testid="controlled-input" />)
    
    const input = screen.getByTestId('controlled-input') as HTMLInputElement
    expect(input.value).toBe('test value')
    
    fireEvent.change(input, { target: { value: 'new value' } })
    expect(handleChange).toHaveBeenCalled()
  })

  it('should forward ref correctly', () => {
    const ref = vi.fn()
    render(<Input ref={ref} data-testid="ref-input" />)
    
    expect(ref).toHaveBeenCalled()
  })

  it('should have correct display name', () => {
    expect(Input.displayName).toBe('Input')
  })

  it('should forward additional props', () => {
    render(
      <Input 
        data-testid="props-input" 
        id="input-id" 
        name="input-name"
        required
        maxLength={100}
      />
    )
    
    const input = screen.getByTestId('props-input')
    expect(input).toHaveAttribute('id', 'input-id')
    expect(input).toHaveAttribute('name', 'input-name')
    expect(input).toHaveAttribute('required')
    expect(input).toHaveAttribute('maxLength', '100')
  })

  it('should handle different input types correctly', () => {
    const inputTypes = ['text', 'email', 'password', 'number', 'tel', 'url']
    
    inputTypes.forEach(type => {
      const { unmount } = render(<Input type={type as any} data-testid={`${type}-input`} />)
      
      const input = screen.getByTestId(`${type}-input`)
      expect(input).toHaveAttribute('type', type)
      
      unmount()
    })
  })

  it('should not apply invalid styling when aria-invalid is false', () => {
    render(<Input aria-invalid={false} data-testid="valid-input" />)
    
    const input = screen.getByTestId('valid-input')
    expect(input).not.toHaveClass('border-red-500')
    expect(input).toHaveClass('border-gray-300') // default border
  })

  it('should handle focus and blur events', () => {
    const handleFocus = vi.fn()
    const handleBlur = vi.fn()
    render(<Input onFocus={handleFocus} onBlur={handleBlur} data-testid="event-input" />)
    
    const input = screen.getByTestId('event-input')
    
    fireEvent.focus(input)
    expect(handleFocus).toHaveBeenCalledTimes(1)
    
    fireEvent.blur(input)
    expect(handleBlur).toHaveBeenCalledTimes(1)
  })

  it('should combine custom className with default classes', () => {
    render(<Input className="custom-class" data-testid="combined-input" />)
    
    const input = screen.getByTestId('combined-input')
    expect(input).toHaveClass('custom-class') // custom class
    expect(input).toHaveClass('flex', 'h-10', 'w-full') // default classes
  })
})