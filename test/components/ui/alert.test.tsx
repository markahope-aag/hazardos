import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'

describe('Alert', () => {
  it('should render with children', () => {
    render(<Alert>Test Alert</Alert>)

    expect(screen.getByText('Test Alert')).toBeInTheDocument()
  })

  it('should have role alert', () => {
    render(<Alert>Alert Message</Alert>)

    const alert = screen.getByRole('alert')
    expect(alert).toBeInTheDocument()
  })

  it('should render with default variant', () => {
    const { container } = render(<Alert>Default</Alert>)

    const alert = container.querySelector('[role="alert"]')
    expect(alert?.className).toContain('bg-background')
  })

  it('should render with destructive variant', () => {
    const { container } = render(<Alert variant="destructive">Destructive</Alert>)

    const alert = container.querySelector('[role="alert"]')
    expect(alert?.className).toContain('border-destructive')
  })

  it('should apply custom className', () => {
    const { container } = render(<Alert className="custom-class">Custom</Alert>)

    const alert = container.querySelector('[role="alert"]')
    expect(alert?.className).toContain('custom-class')
  })

  it('should have proper base styles', () => {
    const { container } = render(<Alert>Styled</Alert>)

    const alert = container.querySelector('[role="alert"]')
    expect(alert?.className).toContain('rounded-lg')
    expect(alert?.className).toContain('border')
    expect(alert?.className).toContain('w-full')
  })

  it('should render complex alert with title and description', () => {
    render(
      <Alert>
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Something went wrong</AlertDescription>
      </Alert>
    )

    expect(screen.getByText('Error')).toBeInTheDocument()
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })
})

describe('AlertTitle', () => {
  it('should render title text', () => {
    render(<AlertTitle>Title Text</AlertTitle>)

    expect(screen.getByText('Title Text')).toBeInTheDocument()
  })

  it('should render as h5 element', () => {
    const { container } = render(<AlertTitle>Heading</AlertTitle>)

    const title = screen.getByText('Heading')
    expect(title.nodeName).toBe('H5')
  })

  it('should have proper styling', () => {
    const { container } = render(<AlertTitle>Styled Title</AlertTitle>)

    const title = screen.getByText('Styled Title')
    expect(title.className).toContain('font-medium')
    expect(title.className).toContain('leading-none')
  })

  it('should apply custom className', () => {
    render(<AlertTitle className="custom-title">Custom</AlertTitle>)

    const title = screen.getByText('Custom')
    expect(title.className).toContain('custom-title')
  })
})

describe('AlertDescription', () => {
  it('should render description text', () => {
    render(<AlertDescription>Description Text</AlertDescription>)

    expect(screen.getByText('Description Text')).toBeInTheDocument()
  })

  it('should render as div element', () => {
    const { container } = render(<AlertDescription>Description</AlertDescription>)

    const description = screen.getByText('Description')
    expect(description.nodeName).toBe('DIV')
  })

  it('should have proper styling', () => {
    const { container } = render(<AlertDescription>Styled Description</AlertDescription>)

    const description = screen.getByText('Styled Description')
    expect(description.className).toContain('text-sm')
  })

  it('should apply custom className', () => {
    render(<AlertDescription className="custom-desc">Custom</AlertDescription>)

    const description = screen.getByText('Custom')
    expect(description.className).toContain('custom-desc')
  })

  it('should render nested paragraphs', () => {
    render(
      <AlertDescription>
        <p>First paragraph</p>
        <p>Second paragraph</p>
      </AlertDescription>
    )

    expect(screen.getByText('First paragraph')).toBeInTheDocument()
    expect(screen.getByText('Second paragraph')).toBeInTheDocument()
  })
})
