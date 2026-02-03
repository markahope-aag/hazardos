import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Switch } from '@/components/ui/switch'

describe('Switch', () => {
  it('should render switch', () => {
    render(<Switch data-testid="test-switch" />)
    expect(screen.getByTestId('test-switch')).toBeInTheDocument()
  })

  it('should have correct role', () => {
    render(<Switch />)
    const switchElement = screen.getByRole('switch')
    expect(switchElement).toBeInTheDocument()
  })

  it('should apply default styling', () => {
    render(<Switch data-testid="styled-switch" />)
    
    const switchElement = screen.getByTestId('styled-switch')
    expect(switchElement).toHaveClass(
      'peer',
      'inline-flex',
      'h-6',
      'w-11',
      'shrink-0',
      'cursor-pointer',
      'items-center',
      'rounded-full',
      'border-2',
      'border-transparent',
      'transition-colors'
    )
  })

  it('should apply focus styling', () => {
    render(<Switch data-testid="focus-switch" />)
    
    const switchElement = screen.getByTestId('focus-switch')
    expect(switchElement).toHaveClass(
      'focus-visible:outline-none',
      'focus-visible:ring-2',
      'focus-visible:ring-ring',
      'focus-visible:ring-offset-2',
      'focus-visible:ring-offset-background'
    )
  })

  it('should apply disabled styling', () => {
    render(<Switch disabled data-testid="disabled-switch" />)
    
    const switchElement = screen.getByTestId('disabled-switch')
    expect(switchElement).toBeDisabled()
    expect(switchElement).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50')
  })

  it('should apply checked and unchecked state styling', () => {
    render(<Switch data-testid="state-switch" />)
    
    const switchElement = screen.getByTestId('state-switch')
    expect(switchElement).toHaveClass(
      'data-[state=checked]:bg-primary',
      'data-[state=unchecked]:bg-input'
    )
  })

  it('should apply custom className', () => {
    render(<Switch className="custom-switch-class" data-testid="custom-switch" />)
    
    const switchElement = screen.getByTestId('custom-switch')
    expect(switchElement).toHaveClass('custom-switch-class')
  })

  it('should handle checked state', () => {
    render(<Switch checked data-testid="checked-switch" />)
    
    const switchElement = screen.getByTestId('checked-switch')
    expect(switchElement).toBeChecked()
  })

  it('should handle unchecked state', () => {
    render(<Switch checked={false} data-testid="unchecked-switch" />)
    
    const switchElement = screen.getByTestId('unchecked-switch')
    expect(switchElement).not.toBeChecked()
  })

  it('should handle click events', () => {
    const handleChange = vi.fn()
    render(<Switch onCheckedChange={handleChange} data-testid="clickable-switch" />)
    
    const switchElement = screen.getByTestId('clickable-switch')
    fireEvent.click(switchElement)
    
    expect(handleChange).toHaveBeenCalledTimes(1)
  })

  it('should render thumb with correct styling', () => {
    render(<Switch data-testid="thumb-switch" />)
    
    const switchElement = screen.getByTestId('thumb-switch')
    const thumb = switchElement.querySelector('[data-state]')
    
    expect(thumb).toHaveClass(
      'pointer-events-none',
      'block',
      'h-5',
      'w-5',
      'rounded-full',
      'bg-background',
      'shadow-lg',
      'ring-0',
      'transition-transform'
    )
  })

  it('should handle thumb position for checked/unchecked states', () => {
    const { rerender } = render(<Switch checked={false} data-testid="position-switch" />)
    
    let switchElement = screen.getByTestId('position-switch')
    let thumb = switchElement.querySelector('[data-state="unchecked"]')
    expect(thumb).toHaveClass('data-[state=unchecked]:translate-x-0')
    
    rerender(<Switch checked={true} data-testid="position-switch" />)
    
    switchElement = screen.getByTestId('position-switch')
    thumb = switchElement.querySelector('[data-state="checked"]')
    expect(thumb).toHaveClass('data-[state=checked]:translate-x-5')
  })

  it('should forward ref correctly', () => {
    const ref = vi.fn()
    render(<Switch ref={ref} data-testid="ref-switch" />)
    
    expect(ref).toHaveBeenCalled()
  })

  it('should have correct display name', () => {
    expect(Switch.displayName).toBe('SwitchPrimitives.Root')
  })

  it('should forward additional props', () => {
    render(
      <Switch 
        data-testid="props-switch" 
        id="switch-id"
        name="switch-name"
        value="switch-value"
        required
      />
    )
    
    const switchElement = screen.getByTestId('props-switch')
    expect(switchElement).toHaveAttribute('id', 'switch-id')
    expect(switchElement).toHaveAttribute('name', 'switch-name')
    expect(switchElement).toHaveAttribute('value', 'switch-value')
    expect(switchElement).toHaveAttribute('required')
  })

  it('should not be clickable when disabled', () => {
    const handleChange = vi.fn()
    render(<Switch disabled onCheckedChange={handleChange} data-testid="disabled-click" />)
    
    const switchElement = screen.getByTestId('disabled-click')
    fireEvent.click(switchElement)
    
    expect(handleChange).not.toHaveBeenCalled()
  })

  it('should work with form integration', () => {
    const handleSubmit = vi.fn((e) => {
      e.preventDefault()
      const formData = new FormData(e.target)
      expect(formData.get('test-switch')).toBe('on')
    })

    render(
      <form onSubmit={handleSubmit}>
        <Switch name="test-switch" checked />
        <button type="submit">Submit</button>
      </form>
    )
    
    fireEvent.click(screen.getByRole('button'))
    expect(handleSubmit).toHaveBeenCalled()
  })

  it('should combine custom className with default classes', () => {
    render(<Switch className="custom-class" data-testid="combined-switch" />)
    
    const switchElement = screen.getByTestId('combined-switch')
    expect(switchElement).toHaveClass('custom-class') // custom class
    expect(switchElement).toHaveClass('peer', 'inline-flex', 'h-6', 'w-11') // default classes
  })

  it('should handle controlled state changes', () => {
    const { rerender } = render(<Switch checked={false} data-testid="controlled-switch" />)
    
    let switchElement = screen.getByTestId('controlled-switch')
    expect(switchElement).not.toBeChecked()
    
    rerender(<Switch checked={true} data-testid="controlled-switch" />)
    
    switchElement = screen.getByTestId('controlled-switch')
    expect(switchElement).toBeChecked()
  })

  it('should support accessibility attributes', () => {
    render(
      <Switch 
        data-testid="accessible-switch"
        aria-label="Toggle notifications"
        aria-describedby="switch-description"
      />
    )
    
    const switchElement = screen.getByTestId('accessible-switch')
    expect(switchElement).toHaveAttribute('aria-label', 'Toggle notifications')
    expect(switchElement).toHaveAttribute('aria-describedby', 'switch-description')
  })

  it('should work with labels', () => {
    render(
      <div className="flex items-center space-x-2">
        <Switch id="notifications-switch" />
        <label htmlFor="notifications-switch">Enable notifications</label>
      </div>
    )
    
    const switchElement = screen.getByRole('switch')
    const label = screen.getByText('Enable notifications')
    
    expect(switchElement).toHaveAttribute('id', 'notifications-switch')
    expect(label).toHaveAttribute('for', 'notifications-switch')
  })

  it('should handle keyboard navigation', () => {
    const handleChange = vi.fn()
    render(<Switch onCheckedChange={handleChange} data-testid="keyboard-switch" />)
    
    const switchElement = screen.getByTestId('keyboard-switch')
    
    // Focus the switch
    switchElement.focus()
    expect(switchElement).toHaveFocus()
    
    // Press space to toggle
    fireEvent.keyDown(switchElement, { key: ' ' })
    
    // Note: Radix UI handles the actual keyboard interaction
    expect(switchElement).toHaveFocus()
  })

  it('should work in different sizes', () => {
    render(<Switch className="h-4 w-7" data-testid="small-switch" />)
    
    const switchElement = screen.getByTestId('small-switch')
    expect(switchElement).toHaveClass('h-4', 'w-7')
  })

  it('should work with different colors', () => {
    render(
      <Switch 
        className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-300" 
        data-testid="colored-switch" 
      />
    )
    
    const switchElement = screen.getByTestId('colored-switch')
    expect(switchElement).toHaveClass('data-[state=checked]:bg-green-500', 'data-[state=unchecked]:bg-gray-300')
  })
})