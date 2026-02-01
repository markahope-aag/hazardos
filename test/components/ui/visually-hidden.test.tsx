import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { VisuallyHidden } from '@/components/ui/visually-hidden'

describe('VisuallyHidden Component', () => {
  it('should render children with sr-only class', () => {
    render(<VisuallyHidden>Hidden content</VisuallyHidden>)

    const element = screen.getByText('Hidden content')
    expect(element).toBeInTheDocument()
    expect(element).toHaveClass('sr-only')
  })

  it('should apply custom className', () => {
    render(<VisuallyHidden className="custom-class">Hidden content</VisuallyHidden>)

    const element = screen.getByText('Hidden content')
    expect(element).toHaveClass('sr-only', 'custom-class')
  })

  it('should forward additional props', () => {
    render(
      <VisuallyHidden data-testid="hidden-element" id="hidden-id">
        Hidden content
      </VisuallyHidden>
    )

    const element = screen.getByTestId('hidden-element')
    expect(element).toBeInTheDocument()
    expect(element).toHaveAttribute('id', 'hidden-id')
  })

  it('should render as span element', () => {
    render(<VisuallyHidden>Hidden content</VisuallyHidden>)

    const element = screen.getByText('Hidden content')
    expect(element.tagName).toBe('SPAN')
  })

  it('should handle complex children', () => {
    render(
      <VisuallyHidden>
        <span>Complex</span> <strong>content</strong>
      </VisuallyHidden>
    )

    const element = screen.getByText(/complex/i)
    expect(element).toBeInTheDocument()
    expect(element).toHaveClass('sr-only')
    
    // Check that nested elements are rendered
    expect(screen.getByText('Complex')).toBeInTheDocument()
    expect(screen.getByText('content')).toBeInTheDocument()
  })

  it('should handle empty children', () => {
    render(<VisuallyHidden></VisuallyHidden>)

    // Should render an empty span with sr-only class
    const spans = document.querySelectorAll('span.sr-only')
    expect(spans).toHaveLength(1)
  })

  it('should handle string children', () => {
    render(<VisuallyHidden>Screen reader only text</VisuallyHidden>)

    const element = screen.getByText('Screen reader only text')
    expect(element).toBeInTheDocument()
    expect(element).toHaveClass('sr-only')
  })

  it('should handle React element children', () => {
    render(
      <VisuallyHidden>
        <div>Nested div content</div>
      </VisuallyHidden>
    )

    const element = screen.getByText('Nested div content')
    expect(element).toBeInTheDocument()
    
    const container = element.parentElement
    expect(container).toHaveClass('sr-only')
  })

  it('should be accessible to screen readers', () => {
    render(<VisuallyHidden>Important screen reader information</VisuallyHidden>)

    // The sr-only class should make content accessible to screen readers
    // but visually hidden
    const element = screen.getByText('Important screen reader information')
    expect(element).toBeInTheDocument()
    expect(element).toHaveClass('sr-only')
  })

  it('should handle multiple instances', () => {
    render(
      <div>
        <VisuallyHidden>First hidden text</VisuallyHidden>
        <VisuallyHidden>Second hidden text</VisuallyHidden>
      </div>
    )

    expect(screen.getByText('First hidden text')).toHaveClass('sr-only')
    expect(screen.getByText('Second hidden text')).toHaveClass('sr-only')
  })
})