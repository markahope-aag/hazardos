import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Separator } from '@/components/ui/separator'

describe('Separator', () => {
  it('should render separator', () => {
    render(<Separator data-testid="test-separator" />)
    expect(screen.getByTestId('test-separator')).toBeInTheDocument()
  })

  it('should render as div element', () => {
    render(<Separator data-testid="div-separator" />)
    
    const separator = screen.getByTestId('div-separator')
    expect(separator.tagName).toBe('DIV')
  })

  it('should apply default styling', () => {
    render(<Separator data-testid="styled-separator" />)
    
    const separator = screen.getByTestId('styled-separator')
    expect(separator).toHaveClass('shrink-0', 'bg-border')
  })

  it('should render horizontal separator by default', () => {
    render(<Separator data-testid="horizontal-separator" />)
    
    const separator = screen.getByTestId('horizontal-separator')
    expect(separator).toHaveClass('h-[1px]', 'w-full')
  })

  it('should render vertical separator', () => {
    render(<Separator orientation="vertical" data-testid="vertical-separator" />)
    
    const separator = screen.getByTestId('vertical-separator')
    expect(separator).toHaveClass('h-full', 'w-[1px]')
  })

  it('should be decorative by default', () => {
    render(<Separator data-testid="decorative-separator" />)
    
    const separator = screen.getByTestId('decorative-separator')
    expect(separator).toHaveAttribute('role', 'none')
    expect(separator).not.toHaveAttribute('aria-orientation')
  })

  it('should have semantic role when not decorative', () => {
    render(<Separator decorative={false} data-testid="semantic-separator" />)
    
    const separator = screen.getByTestId('semantic-separator')
    expect(separator).toHaveAttribute('role', 'separator')
    expect(separator).toHaveAttribute('aria-orientation', 'horizontal')
  })

  it('should have correct aria-orientation for vertical non-decorative separator', () => {
    render(
      <Separator 
        orientation="vertical" 
        decorative={false} 
        data-testid="vertical-semantic-separator" 
      />
    )
    
    const separator = screen.getByTestId('vertical-semantic-separator')
    expect(separator).toHaveAttribute('role', 'separator')
    expect(separator).toHaveAttribute('aria-orientation', 'vertical')
  })

  it('should apply custom className', () => {
    render(<Separator className="custom-separator-class" data-testid="custom-separator" />)
    
    const separator = screen.getByTestId('custom-separator')
    expect(separator).toHaveClass('custom-separator-class')
  })

  it('should forward ref correctly', () => {
    const ref = vi.fn()
    render(<Separator ref={ref} data-testid="ref-separator" />)
    
    expect(ref).toHaveBeenCalled()
  })

  it('should have correct display name', () => {
    expect(Separator.displayName).toBe('Separator')
  })

  it('should forward additional props', () => {
    render(
      <Separator 
        data-testid="props-separator" 
        id="separator-id"
        title="Separator title"
      />
    )
    
    const separator = screen.getByTestId('props-separator')
    expect(separator).toHaveAttribute('id', 'separator-id')
    expect(separator).toHaveAttribute('title', 'Separator title')
  })

  it('should combine custom className with default classes', () => {
    render(<Separator className="custom-class" data-testid="combined-separator" />)
    
    const separator = screen.getByTestId('combined-separator')
    expect(separator).toHaveClass('custom-class') // custom class
    expect(separator).toHaveClass('shrink-0', 'bg-border') // default classes
  })

  it('should handle different orientations with custom styles', () => {
    const { rerender } = render(
      <Separator 
        orientation="horizontal" 
        className="bg-red-500" 
        data-testid="styled-horizontal" 
      />
    )
    
    let separator = screen.getByTestId('styled-horizontal')
    expect(separator).toHaveClass('h-[1px]', 'w-full', 'bg-red-500')
    
    rerender(
      <Separator 
        orientation="vertical" 
        className="bg-blue-500" 
        data-testid="styled-horizontal" 
      />
    )
    
    separator = screen.getByTestId('styled-horizontal')
    expect(separator).toHaveClass('h-full', 'w-[1px]', 'bg-blue-500')
  })

  it('should work in layout contexts', () => {
    render(
      <div className="flex flex-col space-y-4">
        <div>Content above</div>
        <Separator data-testid="layout-separator" />
        <div>Content below</div>
      </div>
    )
    
    expect(screen.getByText('Content above')).toBeInTheDocument()
    expect(screen.getByTestId('layout-separator')).toBeInTheDocument()
    expect(screen.getByText('Content below')).toBeInTheDocument()
  })

  it('should work with flex layouts', () => {
    render(
      <div className="flex items-center space-x-4">
        <div>Left content</div>
        <Separator orientation="vertical" className="h-6" data-testid="flex-separator" />
        <div>Right content</div>
      </div>
    )
    
    const separator = screen.getByTestId('flex-separator')
    expect(separator).toHaveClass('h-6', 'w-[1px]')
  })

  it('should handle click events when needed', () => {
    const handleClick = vi.fn()
    render(<Separator onClick={handleClick} data-testid="clickable-separator" />)
    
    const separator = screen.getByTestId('clickable-separator')
    separator.click()
    
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('should support different thickness', () => {
    const { rerender } = render(
      <Separator className="h-[2px]" data-testid="thick-horizontal" />
    )
    
    let separator = screen.getByTestId('thick-horizontal')
    expect(separator).toHaveClass('h-[2px]')
    
    rerender(
      <Separator 
        orientation="vertical" 
        className="w-[3px]" 
        data-testid="thick-horizontal" 
      />
    )
    
    separator = screen.getByTestId('thick-horizontal')
    expect(separator).toHaveClass('w-[3px]')
  })

  it('should work with different colors and styles', () => {
    render(
      <Separator 
        className="bg-gradient-to-r from-blue-500 to-purple-500" 
        data-testid="gradient-separator" 
      />
    )
    
    const separator = screen.getByTestId('gradient-separator')
    expect(separator).toHaveClass('bg-gradient-to-r', 'from-blue-500', 'to-purple-500')
  })

  it('should maintain accessibility for screen readers', () => {
    render(
      <div>
        <h2>Section 1</h2>
        <p>Content for section 1</p>
        <Separator decorative={false} aria-label="Section divider" />
        <h2>Section 2</h2>
        <p>Content for section 2</p>
      </div>
    )
    
    const separator = screen.getByRole('separator')
    expect(separator).toHaveAttribute('aria-label', 'Section divider')
  })
})