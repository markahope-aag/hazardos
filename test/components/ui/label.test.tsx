import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Label } from '@/components/ui/label'

describe('Label', () => {
  it('should render label with text', () => {
    render(<Label>Test Label</Label>)
    expect(screen.getByText('Test Label')).toBeInTheDocument()
  })

  it('should render as label element', () => {
    render(<Label data-testid="test-label">Label Text</Label>)
    
    const label = screen.getByTestId('test-label')
    expect(label.tagName).toBe('LABEL')
  })

  it('should apply default styling', () => {
    render(<Label data-testid="styled-label">Styled Label</Label>)
    
    const label = screen.getByTestId('styled-label')
    expect(label).toHaveClass(
      'text-sm',
      'font-medium',
      'leading-none',
      'peer-disabled:cursor-not-allowed',
      'peer-disabled:opacity-70'
    )
  })

  it('should apply custom className', () => {
    render(<Label className="custom-label-class" data-testid="custom-label">Custom Label</Label>)
    
    const label = screen.getByTestId('custom-label')
    expect(label).toHaveClass('custom-label-class')
  })

  it('should forward ref correctly', () => {
    const ref = vi.fn()
    render(<Label ref={ref} data-testid="ref-label">Ref Label</Label>)
    
    expect(ref).toHaveBeenCalled()
  })

  it('should have correct display name', () => {
    expect(Label.displayName).toBe('LabelPrimitive.Root')
  })

  it('should forward additional props', () => {
    render(
      <Label 
        data-testid="props-label" 
        id="label-id"
        htmlFor="input-id"
      >
        Props Label
      </Label>
    )
    
    const label = screen.getByTestId('props-label')
    expect(label).toHaveAttribute('id', 'label-id')
    expect(label).toHaveAttribute('for', 'input-id')
  })

  it('should work with form inputs', () => {
    render(
      <div>
        <Label htmlFor="test-input">Input Label</Label>
        <input id="test-input" type="text" />
      </div>
    )
    
    const label = screen.getByText('Input Label')
    const input = screen.getByRole('textbox')
    
    expect(label).toHaveAttribute('for', 'test-input')
    expect(input).toHaveAttribute('id', 'test-input')
  })

  it('should handle peer-disabled styling', () => {
    render(
      <div>
        <input disabled className="peer" />
        <Label data-testid="peer-label">Peer Label</Label>
      </div>
    )
    
    const label = screen.getByTestId('peer-label')
    expect(label).toHaveClass('peer-disabled:cursor-not-allowed', 'peer-disabled:opacity-70')
  })

  it('should combine custom className with default classes', () => {
    render(<Label className="custom-class" data-testid="combined-label">Combined Label</Label>)
    
    const label = screen.getByTestId('combined-label')
    expect(label).toHaveClass('custom-class') // custom class
    expect(label).toHaveClass('text-sm', 'font-medium', 'leading-none') // default classes
  })

  it('should render with children elements', () => {
    render(
      <Label data-testid="complex-label">
        <span>Required</span>
        <span className="text-red-500">*</span>
      </Label>
    )
    
    expect(screen.getByText('Required')).toBeInTheDocument()
    expect(screen.getByText('*')).toBeInTheDocument()
  })

  it('should handle click events', () => {
    const handleClick = vi.fn()
    render(<Label onClick={handleClick} data-testid="clickable-label">Clickable Label</Label>)
    
    const label = screen.getByTestId('clickable-label')
    label.click()
    
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('should support accessibility attributes', () => {
    render(
      <Label 
        data-testid="accessible-label"
        aria-label="Accessible label"
        role="label"
      >
        Accessible Label
      </Label>
    )
    
    const label = screen.getByTestId('accessible-label')
    expect(label).toHaveAttribute('aria-label', 'Accessible label')
    expect(label).toHaveAttribute('role', 'label')
  })

  it('should work with required field indicators', () => {
    render(
      <Label htmlFor="required-field">
        Email Address
        <span className="text-red-500 ml-1">*</span>
      </Label>
    )
    
    expect(screen.getByText('Email Address')).toBeInTheDocument()
    expect(screen.getByText('*')).toBeInTheDocument()
  })

  it('should handle empty content', () => {
    render(<Label data-testid="empty-label"></Label>)
    
    const label = screen.getByTestId('empty-label')
    expect(label).toBeInTheDocument()
    expect(label.textContent).toBe('')
  })

  it('should preserve whitespace in content', () => {
    render(<Label data-testid="whitespace-label">  Spaced  Label  </Label>)
    
    const label = screen.getByTestId('whitespace-label')
    expect(label.textContent).toBe('  Spaced  Label  ')
  })

  it('should work with form validation states', () => {
    render(
      <div>
        <Label htmlFor="error-input" className="text-red-600">
          Error Field
        </Label>
        <input id="error-input" aria-invalid="true" />
      </div>
    )
    
    const label = screen.getByText('Error Field')
    const input = screen.getByRole('textbox')
    
    expect(label).toHaveClass('text-red-600')
    expect(input).toHaveAttribute('aria-invalid', 'true')
  })
})