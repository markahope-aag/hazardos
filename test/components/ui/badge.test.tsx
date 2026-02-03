import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from '@/components/ui/badge'

describe('Badge', () => {
  it('should render badge with text', () => {
    render(<Badge>Test Badge</Badge>)
    expect(screen.getByText('Test Badge')).toBeInTheDocument()
  })

  it('should render with default variant', () => {
    render(<Badge>Default Badge</Badge>)
    
    const badge = screen.getByText('Default Badge')
    expect(badge).toHaveClass('bg-primary', 'text-primary-foreground')
  })

  it('should render with secondary variant', () => {
    render(<Badge variant="secondary">Secondary Badge</Badge>)
    
    const badge = screen.getByText('Secondary Badge')
    expect(badge).toHaveClass('bg-secondary', 'text-secondary-foreground')
  })

  it('should render with destructive variant', () => {
    render(<Badge variant="destructive">Destructive Badge</Badge>)
    
    const badge = screen.getByText('Destructive Badge')
    expect(badge).toHaveClass('bg-destructive', 'text-destructive-foreground')
  })

  it('should render with outline variant', () => {
    render(<Badge variant="outline">Outline Badge</Badge>)
    
    const badge = screen.getByText('Outline Badge')
    expect(badge).toHaveClass('text-foreground')
    expect(badge).not.toHaveClass('border-transparent')
  })

  it('should apply custom className', () => {
    render(<Badge className="custom-badge-class">Custom Badge</Badge>)
    
    const badge = screen.getByText('Custom Badge')
    expect(badge).toHaveClass('custom-badge-class')
  })

  it('should have default badge styling', () => {
    render(<Badge>Styled Badge</Badge>)
    
    const badge = screen.getByText('Styled Badge')
    expect(badge).toHaveClass(
      'inline-flex',
      'items-center',
      'rounded-full',
      'border',
      'px-2.5',
      'py-0.5',
      'text-xs',
      'font-semibold',
      'transition-colors'
    )
  })

  it('should have focus styling', () => {
    render(<Badge>Focus Badge</Badge>)
    
    const badge = screen.getByText('Focus Badge')
    expect(badge).toHaveClass(
      'focus:outline-none',
      'focus:ring-2',
      'focus:ring-ring',
      'focus:ring-offset-2'
    )
  })

  it('should forward additional props', () => {
    render(<Badge data-testid="custom-badge" id="badge-id">Test Badge</Badge>)
    
    const badge = screen.getByTestId('custom-badge')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveAttribute('id', 'badge-id')
  })

  it('should render as div element', () => {
    render(<Badge>Div Badge</Badge>)
    
    const badge = screen.getByText('Div Badge')
    expect(badge.tagName).toBe('DIV')
  })

  it('should handle hover states for default variant', () => {
    render(<Badge>Hover Badge</Badge>)
    
    const badge = screen.getByText('Hover Badge')
    expect(badge).toHaveClass('hover:bg-primary/80')
  })

  it('should handle hover states for secondary variant', () => {
    render(<Badge variant="secondary">Secondary Hover</Badge>)
    
    const badge = screen.getByText('Secondary Hover')
    expect(badge).toHaveClass('hover:bg-secondary/80')
  })

  it('should handle hover states for destructive variant', () => {
    render(<Badge variant="destructive">Destructive Hover</Badge>)
    
    const badge = screen.getByText('Destructive Hover')
    expect(badge).toHaveClass('hover:bg-destructive/80')
  })

  it('should have border-transparent for non-outline variants', () => {
    render(<Badge>Transparent Border</Badge>)
    
    const badge = screen.getByText('Transparent Border')
    expect(badge).toHaveClass('border-transparent')
  })

  it('should render with children content', () => {
    render(
      <Badge>
        <span>Icon</span>
        Text Content
      </Badge>
    )
    
    expect(screen.getByText('Icon')).toBeInTheDocument()
    expect(screen.getByText('Text Content')).toBeInTheDocument()
  })

  it('should combine variant classes with custom classes correctly', () => {
    render(<Badge variant="outline" className="custom-class">Combined Badge</Badge>)
    
    const badge = screen.getByText('Combined Badge')
    expect(badge).toHaveClass('text-foreground') // from variant
    expect(badge).toHaveClass('custom-class') // custom class
    expect(badge).toHaveClass('inline-flex') // base class
  })
})