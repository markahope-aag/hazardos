import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from '@/components/ui/input'

describe('Input Component', () => {
  it('should render with default props', () => {
    render(<Input />)
    
    const input = screen.getByRole('textbox')
    expect(input).toBeInTheDocument()
    expect(input).toHaveClass('flex', 'h-10', 'w-full')
  })

  it('should accept placeholder text', () => {
    render(<Input placeholder="Enter your name" />)
    
    const input = screen.getByPlaceholderText('Enter your name')
    expect(input).toBeInTheDocument()
  })

  it('should handle value changes', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    
    render(<Input onChange={handleChange} />)
    
    const input = screen.getByRole('textbox')
    await user.type(input, 'test value')
    
    expect(handleChange).toHaveBeenCalled()
  })

  it('should handle disabled state', () => {
    render(<Input disabled />)
    
    const input = screen.getByRole('textbox')
    expect(input).toBeDisabled()
    expect(input).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50')
  })

  it('should accept custom className', () => {
    render(<Input className="custom-class" />)
    
    const input = screen.getByRole('textbox')
    expect(input).toHaveClass('custom-class')
  })

  it('should handle different input types', () => {
    const { rerender, container } = render(<Input type="email" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email')

    rerender(<Input type="password" />)
    // Password inputs don't have a role, query by element type
    const passwordInput = container.querySelector('input[type="password"]')
    expect(passwordInput).toHaveAttribute('type', 'password')

    rerender(<Input type="number" />)
    expect(screen.getByRole('spinbutton')).toHaveAttribute('type', 'number')
  })

  it('should support controlled input', () => {
    const { rerender } = render(<Input value="controlled value" onChange={vi.fn()} />)
    
    const input = screen.getByDisplayValue('controlled value')
    expect(input).toBeInTheDocument()

    rerender(<Input value="updated value" onChange={vi.fn()} />)
    expect(screen.getByDisplayValue('updated value')).toBeInTheDocument()
  })

  it('should handle focus and blur events', async () => {
    const user = userEvent.setup()
    const handleFocus = vi.fn()
    const handleBlur = vi.fn()
    
    render(<Input onFocus={handleFocus} onBlur={handleBlur} />)
    
    const input = screen.getByRole('textbox')
    
    await user.click(input)
    expect(handleFocus).toHaveBeenCalled()
    
    await user.tab()
    expect(handleBlur).toHaveBeenCalled()
  })

  it('should support form validation attributes', () => {
    render(<Input required minLength={3} maxLength={10} />)
    
    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('required')
    expect(input).toHaveAttribute('minLength', '3')
    expect(input).toHaveAttribute('maxLength', '10')
  })

  it('should handle readonly state', () => {
    render(<Input readOnly value="readonly value" />)
    
    const input = screen.getByDisplayValue('readonly value')
    expect(input).toHaveAttribute('readonly')
  })
})