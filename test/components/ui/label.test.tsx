import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Label } from '@/components/ui/label'

describe('Label Component', () => {
  it('should render without crashing', () => {
    expect(() => render(<Label>Test Label</Label>)).not.toThrow()
  })

  it('should render label text', () => {
    render(<Label>Email Address</Label>)
    expect(screen.getByText('Email Address')).toBeInTheDocument()
  })

  it('should accept custom className', () => {
    render(<Label className="custom-label">Test</Label>)
    expect(screen.getByText('Test')).toHaveClass('custom-label')
  })

  it('should have base styling classes', () => {
    render(<Label>Test</Label>)
    const label = screen.getByText('Test')
    expect(label).toHaveClass('text-sm')
    expect(label).toHaveClass('font-medium')
  })

  it('should accept htmlFor attribute', () => {
    render(<Label htmlFor="email-input">Email</Label>)
    const label = screen.getByText('Email')
    expect(label).toHaveAttribute('for', 'email-input')
  })

  it('should render with children elements', () => {
    render(
      <Label>
        <span data-testid="icon">*</span>
        Required Field
      </Label>
    )
    expect(screen.getByTestId('icon')).toBeInTheDocument()
    expect(screen.getByText('Required Field')).toBeInTheDocument()
  })

  it('should forward ref', () => {
    const ref = { current: null } as React.RefObject<HTMLLabelElement>
    render(<Label ref={ref}>Test</Label>)
    expect(ref.current).toBeInstanceOf(HTMLLabelElement)
  })

  it('should associate with input when using htmlFor', () => {
    render(
      <div>
        <Label htmlFor="test-input">Name</Label>
        <input id="test-input" type="text" />
      </div>
    )

    const label = screen.getByText('Name')
    const input = screen.getByRole('textbox')
    expect(label).toHaveAttribute('for', 'test-input')
    expect(input).toHaveAttribute('id', 'test-input')
  })
})
