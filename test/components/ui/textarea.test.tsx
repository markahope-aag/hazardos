import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Textarea } from '@/components/ui/textarea'

describe('Textarea Component', () => {
  it('should render without crashing', () => {
    expect(() => render(<Textarea />)).not.toThrow()
  })

  it('should render with placeholder', () => {
    render(<Textarea placeholder="Enter your message" />)
    expect(screen.getByPlaceholderText('Enter your message')).toBeInTheDocument()
  })

  it('should accept custom className', () => {
    render(<Textarea className="custom-textarea" data-testid="textarea" />)
    expect(screen.getByTestId('textarea')).toHaveClass('custom-textarea')
  })

  it('should have base styling classes', () => {
    render(<Textarea data-testid="textarea" />)
    const textarea = screen.getByTestId('textarea')
    expect(textarea).toHaveClass('flex')
    expect(textarea).toHaveClass('w-full')
    expect(textarea).toHaveClass('rounded-md')
    expect(textarea).toHaveClass('border')
  })

  it('should handle disabled state', () => {
    render(<Textarea disabled data-testid="textarea" />)
    const textarea = screen.getByTestId('textarea')
    expect(textarea).toBeDisabled()
    expect(textarea).toHaveClass('disabled:cursor-not-allowed')
    expect(textarea).toHaveClass('disabled:opacity-50')
  })

  it('should handle value changes', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()

    render(<Textarea onChange={handleChange} data-testid="textarea" />)
    const textarea = screen.getByTestId('textarea')

    await user.type(textarea, 'Hello World')
    expect(handleChange).toHaveBeenCalled()
    expect(textarea).toHaveValue('Hello World')
  })

  it('should render with initial value', () => {
    render(<Textarea defaultValue="Initial content" data-testid="textarea" />)
    expect(screen.getByTestId('textarea')).toHaveValue('Initial content')
  })

  it('should render as controlled component', () => {
    const { rerender } = render(<Textarea value="Controlled" readOnly data-testid="textarea" />)
    expect(screen.getByTestId('textarea')).toHaveValue('Controlled')

    rerender(<Textarea value="Updated" readOnly data-testid="textarea" />)
    expect(screen.getByTestId('textarea')).toHaveValue('Updated')
  })

  it('should forward ref', () => {
    const ref = { current: null } as React.RefObject<HTMLTextAreaElement>
    render(<Textarea ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement)
  })

  it('should accept rows attribute', () => {
    render(<Textarea rows={10} data-testid="textarea" />)
    expect(screen.getByTestId('textarea')).toHaveAttribute('rows', '10')
  })

  it('should accept aria attributes', () => {
    render(
      <Textarea
        aria-label="Description"
        aria-describedby="help-text"
        data-testid="textarea"
      />
    )
    const textarea = screen.getByTestId('textarea')
    expect(textarea).toHaveAttribute('aria-label', 'Description')
    expect(textarea).toHaveAttribute('aria-describedby', 'help-text')
  })

  it('should support required attribute', () => {
    render(<Textarea required data-testid="textarea" />)
    expect(screen.getByTestId('textarea')).toBeRequired()
  })
})
