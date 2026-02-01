import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from '@/components/ui/badge'

describe('Badge', () => {
  it('should render with children', () => {
    render(<Badge>Test Badge</Badge>)

    expect(screen.getByText('Test Badge')).toBeInTheDocument()
  })

  it('should render with default variant', () => {
    const { container } = render(<Badge>Default</Badge>)

    const badge = container.firstChild as HTMLElement
    expect(badge.className).toContain('bg-primary')
  })

  it('should render with secondary variant', () => {
    const { container } = render(<Badge variant="secondary">Secondary</Badge>)

    const badge = container.firstChild as HTMLElement
    expect(badge.className).toContain('bg-secondary')
  })

  it('should render with destructive variant', () => {
    const { container } = render(<Badge variant="destructive">Destructive</Badge>)

    const badge = container.firstChild as HTMLElement
    expect(badge.className).toContain('bg-destructive')
  })

  it('should render with outline variant', () => {
    const { container } = render(<Badge variant="outline">Outline</Badge>)

    const badge = container.firstChild as HTMLElement
    expect(badge.className).toContain('text-foreground')
  })

  it('should apply custom className', () => {
    const { container } = render(<Badge className="custom-class">Custom</Badge>)

    const badge = container.firstChild as HTMLElement
    expect(badge.className).toContain('custom-class')
  })

  it('should merge custom className with default styles', () => {
    const { container } = render(
      <Badge className="text-lg" variant="secondary">
        Merged
      </Badge>
    )

    const badge = container.firstChild as HTMLElement
    expect(badge.className).toContain('text-lg')
    expect(badge.className).toContain('bg-secondary')
  })

  it('should pass through HTML attributes', () => {
    render(<Badge data-testid="custom-badge">Attributes</Badge>)

    const badge = screen.getByTestId('custom-badge')
    expect(badge).toBeInTheDocument()
  })

  it('should have proper base styles', () => {
    const { container } = render(<Badge>Styled</Badge>)

    const badge = container.firstChild as HTMLElement
    expect(badge.className).toContain('inline-flex')
    expect(badge.className).toContain('rounded-full')
    expect(badge.className).toContain('border')
  })

  it('should render as div element', () => {
    const { container } = render(<Badge>Element</Badge>)

    expect(container.firstChild?.nodeName).toBe('DIV')
  })
})
