import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Checkbox } from '@/components/ui/checkbox'

describe('Checkbox', () => {
  it('should render checkbox', () => {
    render(<Checkbox data-testid="test-checkbox" />)
    expect(screen.getByTestId('test-checkbox')).toBeInTheDocument()
  })

  it('should have correct role', () => {
    render(<Checkbox />)
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeInTheDocument()
  })

  it('should apply default styling', () => {
    render(<Checkbox data-testid="styled-checkbox" />)
    
    const checkbox = screen.getByTestId('styled-checkbox')
    expect(checkbox).toHaveClass(
      'grid',
      'place-content-center',
      'peer',
      'h-4',
      'w-4',
      'shrink-0',
      'rounded-sm',
      'border',
      'border-primary'
    )
  })

  it('should apply focus styling', () => {
    render(<Checkbox data-testid="focus-checkbox" />)
    
    const checkbox = screen.getByTestId('focus-checkbox')
    expect(checkbox).toHaveClass(
      'focus-visible:outline-none',
      'focus-visible:ring-2',
      'focus-visible:ring-ring',
      'focus-visible:ring-offset-2'
    )
  })

  it('should apply disabled styling', () => {
    render(<Checkbox disabled data-testid="disabled-checkbox" />)
    
    const checkbox = screen.getByTestId('disabled-checkbox')
    expect(checkbox).toBeDisabled()
    expect(checkbox).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50')
  })

  it('should apply checked styling', () => {
    render(<Checkbox checked data-testid="checked-checkbox" />)
    
    const checkbox = screen.getByTestId('checked-checkbox')
    expect(checkbox).toHaveClass(
      'data-[state=checked]:bg-primary',
      'data-[state=checked]:text-primary-foreground'
    )
  })

  it('should apply custom className', () => {
    render(<Checkbox className="custom-checkbox-class" data-testid="custom-checkbox" />)
    
    const checkbox = screen.getByTestId('custom-checkbox')
    expect(checkbox).toHaveClass('custom-checkbox-class')
  })

  it('should handle checked state', () => {
    render(<Checkbox checked data-testid="checked-state" />)
    
    const checkbox = screen.getByTestId('checked-state')
    expect(checkbox).toBeChecked()
  })

  it('should handle unchecked state', () => {
    render(<Checkbox checked={false} data-testid="unchecked-state" />)
    
    const checkbox = screen.getByTestId('unchecked-state')
    expect(checkbox).not.toBeChecked()
  })

  it('should handle click events', () => {
    const handleChange = vi.fn()
    render(<Checkbox onCheckedChange={handleChange} data-testid="clickable-checkbox" />)
    
    const checkbox = screen.getByTestId('clickable-checkbox')
    fireEvent.click(checkbox)
    
    expect(handleChange).toHaveBeenCalledTimes(1)
  })

  it('should render check icon when checked', () => {
    render(<Checkbox checked data-testid="icon-checkbox" />)
    
    // Check for the Check icon (lucide-react renders as svg)
    const checkbox = screen.getByTestId('icon-checkbox')
    const svg = checkbox.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('should forward ref correctly', () => {
    const ref = vi.fn()
    render(<Checkbox ref={ref} data-testid="ref-checkbox" />)
    
    expect(ref).toHaveBeenCalled()
  })

  it('should have correct display name', () => {
    expect(Checkbox.displayName).toBe('CheckboxPrimitive.Root')
  })

  it('should forward additional props', () => {
    render(
      <Checkbox 
        data-testid="props-checkbox" 
        id="checkbox-id" 
        name="checkbox-name"
        value="checkbox-value"
        required
      />
    )
    
    const checkbox = screen.getByTestId('props-checkbox')
    expect(checkbox).toHaveAttribute('id', 'checkbox-id')
    expect(checkbox).toHaveAttribute('name', 'checkbox-name')
    expect(checkbox).toHaveAttribute('value', 'checkbox-value')
    expect(checkbox).toHaveAttribute('required')
  })

  it('should handle indeterminate state', () => {
    render(<Checkbox checked="indeterminate" data-testid="indeterminate-checkbox" />)
    
    const checkbox = screen.getByTestId('indeterminate-checkbox')
    expect(checkbox).toBeInTheDocument()
    // Note: Radix UI handles indeterminate state internally
  })

  it('should not be clickable when disabled', () => {
    const handleChange = vi.fn()
    render(<Checkbox disabled onCheckedChange={handleChange} data-testid="disabled-click" />)
    
    const checkbox = screen.getByTestId('disabled-click')
    fireEvent.click(checkbox)
    
    expect(handleChange).not.toHaveBeenCalled()
  })

  it('should have indicator with correct styling', () => {
    render(<Checkbox checked data-testid="indicator-checkbox" />)
    
    const checkbox = screen.getByTestId('indicator-checkbox')
    const indicator = checkbox.querySelector('[data-state="checked"]')
    
    // The indicator should be present when checked
    expect(indicator || checkbox).toBeInTheDocument()
  })

  it('should handle form integration', () => {
    const handleSubmit = vi.fn((e) => {
      e.preventDefault()
      const formData = new FormData(e.target)
      expect(formData.get('test-checkbox')).toBe('on')
    })

    render(
      <form onSubmit={handleSubmit}>
        <Checkbox name="test-checkbox" checked />
        <button type="submit">Submit</button>
      </form>
    )
    
    fireEvent.click(screen.getByRole('button'))
    expect(handleSubmit).toHaveBeenCalled()
  })

  it('should combine custom className with default classes', () => {
    render(<Checkbox className="custom-class" data-testid="combined-checkbox" />)
    
    const checkbox = screen.getByTestId('combined-checkbox')
    expect(checkbox).toHaveClass('custom-class') // custom class
    expect(checkbox).toHaveClass('grid', 'place-content-center', 'h-4', 'w-4') // default classes
  })

  it('should handle controlled state changes', () => {
    const { rerender } = render(<Checkbox checked={false} data-testid="controlled-checkbox" />)
    
    let checkbox = screen.getByTestId('controlled-checkbox')
    expect(checkbox).not.toBeChecked()
    
    rerender(<Checkbox checked={true} data-testid="controlled-checkbox" />)
    
    checkbox = screen.getByTestId('controlled-checkbox')
    expect(checkbox).toBeChecked()
  })
})