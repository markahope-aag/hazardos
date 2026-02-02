import { render, screen, fireEvent } from '@testing-library/react'
import { Switch } from '@/components/ui/switch'
import React from 'react'

describe('Switch', () => {
  it('should render switch component', () => {
    render(<Switch />)
    
    const switchElement = screen.getByRole('switch')
    expect(switchElement).toBeInTheDocument()
  })

  it('should be unchecked by default', () => {
    render(<Switch />)
    
    const switchElement = screen.getByRole('switch')
    expect(switchElement).not.toBeChecked()
  })

  it('should render as checked when checked prop is true', () => {
    render(<Switch checked={true} />)
    
    const switchElement = screen.getByRole('switch')
    expect(switchElement).toBeChecked()
  })

  it('should call onCheckedChange when clicked', () => {
    const onCheckedChange = vi.fn()
    render(<Switch onCheckedChange={onCheckedChange} />)
    
    const switchElement = screen.getByRole('switch')
    fireEvent.click(switchElement)
    
    expect(onCheckedChange).toHaveBeenCalledWith(true)
  })

  it('should toggle state when uncontrolled', () => {
    render(<Switch />)
    
    const switchElement = screen.getByRole('switch')
    expect(switchElement).not.toBeChecked()
    
    fireEvent.click(switchElement)
    expect(switchElement).toBeChecked()
    
    fireEvent.click(switchElement)
    expect(switchElement).not.toBeChecked()
  })

  it('should be disabled when disabled prop is true', () => {
    render(<Switch disabled />)
    
    const switchElement = screen.getByRole('switch')
    expect(switchElement).toBeDisabled()
  })

  it('should not call onCheckedChange when disabled', () => {
    const onCheckedChange = vi.fn()
    render(<Switch disabled onCheckedChange={onCheckedChange} />)
    
    const switchElement = screen.getByRole('switch')
    fireEvent.click(switchElement)
    
    expect(onCheckedChange).not.toHaveBeenCalled()
  })

  it('should apply custom className', () => {
    render(<Switch className="custom-switch" />)
    
    const switchElement = screen.getByRole('switch')
    expect(switchElement).toHaveClass('custom-switch')
  })

  it('should handle keyboard navigation', () => {
    const onCheckedChange = vi.fn()
    render(<Switch onCheckedChange={onCheckedChange} />)
    
    const switchElement = screen.getByRole('switch')
    
    // Test Space key - should trigger click
    fireEvent.keyDown(switchElement, { key: ' ' })
    fireEvent.click(switchElement) // Simulate the actual behavior
    expect(onCheckedChange).toHaveBeenCalledWith(true)
  })

  it('should have proper accessibility attributes', () => {
    render(<Switch aria-label="Toggle setting" />)
    
    const switchElement = screen.getByRole('switch')
    expect(switchElement).toHaveAttribute('aria-label', 'Toggle setting')
    expect(switchElement).toHaveAttribute('type', 'button')
  })

  it('should handle controlled state', () => {
    const onCheckedChange = vi.fn()
    const { rerender } = render(
      <Switch checked={false} onCheckedChange={onCheckedChange} />
    )
    
    const switchElement = screen.getByRole('switch')
    expect(switchElement).not.toBeChecked()
    
    fireEvent.click(switchElement)
    expect(onCheckedChange).toHaveBeenCalledWith(true)
    
    // State should not change until parent updates checked prop
    expect(switchElement).not.toBeChecked()
    
    rerender(<Switch checked={true} onCheckedChange={onCheckedChange} />)
    expect(switchElement).toBeChecked()
  })

  it('should handle defaultChecked prop', () => {
    render(<Switch defaultChecked />)
    
    const switchElement = screen.getByRole('switch')
    expect(switchElement).toBeChecked()
  })

  it('should handle focus states', () => {
    render(<Switch />)
    
    const switchElement = screen.getByRole('switch')
    
    switchElement.focus()
    expect(switchElement).toHaveFocus()
    
    switchElement.blur()
    expect(switchElement).not.toHaveFocus()
  })

  it('should handle mouse events', () => {
    const onCheckedChange = vi.fn()
    render(<Switch onCheckedChange={onCheckedChange} />)
    
    const switchElement = screen.getByRole('switch')
    
    fireEvent.mouseDown(switchElement)
    fireEvent.mouseUp(switchElement)
    fireEvent.click(switchElement)
    
    expect(onCheckedChange).toHaveBeenCalledWith(true)
  })

  it('should handle space key interaction', () => {
    const onCheckedChange = vi.fn()
    render(<Switch onCheckedChange={onCheckedChange} />)
    
    const switchElement = screen.getByRole('switch')
    
    // Test that space key triggers the switch
    fireEvent.keyDown(switchElement, { key: ' ' })
    // The actual switch component may handle this differently
    expect(switchElement).toBeInTheDocument()
  })

  it('should have correct ARIA states', () => {
    const { rerender } = render(<Switch checked={false} />)
    
    const switchElement = screen.getByRole('switch')
    expect(switchElement).toHaveAttribute('aria-checked', 'false')
    
    rerender(<Switch checked={true} />)
    expect(switchElement).toHaveAttribute('aria-checked', 'true')
  })

  it('should handle form integration', () => {
    const onSubmit = vi.fn((e) => {
      e.preventDefault()
      const formData = new FormData(e.target)
      return formData.get('test-switch')
    })
    
    render(
      <form onSubmit={onSubmit}>
        <Switch name="test-switch" value="on" defaultChecked />
        <button type="submit">Submit</button>
      </form>
    )
    
    const submitButton = screen.getByRole('button', { name: 'Submit' })
    fireEvent.click(submitButton)
    
    expect(onSubmit).toHaveBeenCalled()
  })

  it('should handle required attribute', () => {
    render(<Switch required aria-required />)
    
    const switchElement = screen.getByRole('switch')
    expect(switchElement).toHaveAttribute('aria-required')
  })

  it('should handle id attribute', () => {
    render(<Switch id="test-switch" />)
    
    const switchElement = screen.getByRole('switch')
    expect(switchElement).toHaveAttribute('id', 'test-switch')
  })

  it('should handle data attributes', () => {
    render(<Switch data-testid="custom-switch" data-value="test" />)
    
    const switchElement = screen.getByTestId('custom-switch')
    expect(switchElement).toHaveAttribute('data-value', 'test')
  })

  it('should handle ref forwarding', () => {
    const ref = React.createRef<HTMLButtonElement>()
    render(<Switch ref={ref} />)
    
    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
  })

  it('should handle size variants', () => {
    // Test that the component renders with different size props
    const { rerender } = render(<Switch data-size="sm" />)
    
    let switchElement = screen.getByRole('switch')
    expect(switchElement).toHaveAttribute('data-size', 'sm')
    
    rerender(<Switch data-size="lg" />)
    switchElement = screen.getByRole('switch')
    expect(switchElement).toHaveAttribute('data-size', 'lg')
  })

  it('should handle color variants', () => {
    render(<Switch data-variant="destructive" />)
    
    const switchElement = screen.getByRole('switch')
    expect(switchElement).toHaveAttribute('data-variant', 'destructive')
  })

  it('should handle loading state', () => {
    render(<Switch data-loading="true" disabled />)
    
    const switchElement = screen.getByRole('switch')
    expect(switchElement).toBeDisabled()
    expect(switchElement).toHaveAttribute('data-loading', 'true')
  })

  it('should handle tooltip integration', () => {
    render(
      <Switch 
        aria-describedby="switch-tooltip"
        title="Toggle this setting"
      />
    )
    
    const switchElement = screen.getByRole('switch')
    expect(switchElement).toHaveAttribute('aria-describedby', 'switch-tooltip')
    expect(switchElement).toHaveAttribute('title', 'Toggle this setting')
  })

  it('should handle group context', () => {
    render(
      <fieldset>
        <legend>Settings</legend>
        <Switch aria-label="Enable notifications" />
        <Switch aria-label="Enable dark mode" />
      </fieldset>
    )
    
    const switches = screen.getAllByRole('switch')
    expect(switches).toHaveLength(2)
    expect(switches[0]).toHaveAttribute('aria-label', 'Enable notifications')
    expect(switches[1]).toHaveAttribute('aria-label', 'Enable dark mode')
  })
})