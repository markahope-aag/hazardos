import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Textarea } from '@/components/ui/textarea'

describe('Textarea', () => {
  it('should render textarea element', () => {
    render(<Textarea data-testid="test-textarea" />)
    expect(screen.getByTestId('test-textarea')).toBeInTheDocument()
  })

  it('should render as textarea element', () => {
    render(<Textarea data-testid="textarea-element" />)
    
    const textarea = screen.getByTestId('textarea-element')
    expect(textarea.tagName).toBe('TEXTAREA')
  })

  it('should apply default styling', () => {
    render(<Textarea data-testid="styled-textarea" />)
    
    const textarea = screen.getByTestId('styled-textarea')
    expect(textarea).toHaveClass(
      'flex',
      'min-h-[80px]',
      'w-full',
      'rounded-md',
      'border',
      'border-input',
      'bg-background',
      'px-3',
      'py-2',
      'text-base'
    )
  })

  it('should apply responsive text sizing', () => {
    render(<Textarea data-testid="responsive-textarea" />)
    
    const textarea = screen.getByTestId('responsive-textarea')
    expect(textarea).toHaveClass('text-base', 'md:text-sm')
  })

  it('should apply focus styling', () => {
    render(<Textarea data-testid="focus-textarea" />)
    
    const textarea = screen.getByTestId('focus-textarea')
    expect(textarea).toHaveClass(
      'ring-offset-background',
      'focus-visible:outline-none',
      'focus-visible:ring-2',
      'focus-visible:ring-ring',
      'focus-visible:ring-offset-2'
    )
  })

  it('should apply disabled styling', () => {
    render(<Textarea disabled data-testid="disabled-textarea" />)
    
    const textarea = screen.getByTestId('disabled-textarea')
    expect(textarea).toBeDisabled()
    expect(textarea).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50')
  })

  it('should apply placeholder styling', () => {
    render(<Textarea placeholder="Enter your message" data-testid="placeholder-textarea" />)
    
    const textarea = screen.getByTestId('placeholder-textarea')
    expect(textarea).toHaveClass('placeholder:text-muted-foreground')
    expect(textarea).toHaveAttribute('placeholder', 'Enter your message')
  })

  it('should apply custom className', () => {
    render(<Textarea className="custom-textarea-class" data-testid="custom-textarea" />)
    
    const textarea = screen.getByTestId('custom-textarea')
    expect(textarea).toHaveClass('custom-textarea-class')
  })

  it('should handle value and onChange', () => {
    const handleChange = vi.fn()
    render(
      <Textarea 
        value="test value" 
        onChange={handleChange} 
        data-testid="controlled-textarea" 
      />
    )
    
    const textarea = screen.getByTestId('controlled-textarea') as HTMLTextAreaElement
    expect(textarea.value).toBe('test value')
    
    fireEvent.change(textarea, { target: { value: 'new value' } })
    expect(handleChange).toHaveBeenCalled()
  })

  it('should forward ref correctly', () => {
    const ref = vi.fn()
    render(<Textarea ref={ref} data-testid="ref-textarea" />)
    
    expect(ref).toHaveBeenCalled()
  })

  it('should have correct display name', () => {
    expect(Textarea.displayName).toBe('Textarea')
  })

  it('should forward additional props', () => {
    render(
      <Textarea 
        data-testid="props-textarea" 
        id="textarea-id"
        name="textarea-name"
        required
        maxLength={500}
        rows={5}
        cols={40}
      />
    )
    
    const textarea = screen.getByTestId('props-textarea')
    expect(textarea).toHaveAttribute('id', 'textarea-id')
    expect(textarea).toHaveAttribute('name', 'textarea-name')
    expect(textarea).toHaveAttribute('required')
    expect(textarea).toHaveAttribute('maxLength', '500')
    expect(textarea).toHaveAttribute('rows', '5')
    expect(textarea).toHaveAttribute('cols', '40')
  })

  it('should handle different sizes', () => {
    const { rerender } = render(
      <Textarea className="min-h-[120px]" data-testid="size-textarea" />
    )
    
    let textarea = screen.getByTestId('size-textarea')
    expect(textarea).toHaveClass('min-h-[120px]')
    
    rerender(<Textarea className="h-32" data-testid="size-textarea" />)
    
    textarea = screen.getByTestId('size-textarea')
    expect(textarea).toHaveClass('h-32')
  })

  it('should handle focus and blur events', () => {
    const handleFocus = vi.fn()
    const handleBlur = vi.fn()
    render(
      <Textarea 
        onFocus={handleFocus} 
        onBlur={handleBlur} 
        data-testid="event-textarea" 
      />
    )
    
    const textarea = screen.getByTestId('event-textarea')
    
    fireEvent.focus(textarea)
    expect(handleFocus).toHaveBeenCalledTimes(1)
    
    fireEvent.blur(textarea)
    expect(handleBlur).toHaveBeenCalledTimes(1)
  })

  it('should combine custom className with default classes', () => {
    render(<Textarea className="custom-class" data-testid="combined-textarea" />)
    
    const textarea = screen.getByTestId('combined-textarea')
    expect(textarea).toHaveClass('custom-class') // custom class
    expect(textarea).toHaveClass('flex', 'min-h-[80px]', 'w-full') // default classes
  })

  it('should work with form integration', () => {
    const handleSubmit = vi.fn((e) => {
      e.preventDefault()
      const formData = new FormData(e.target)
      expect(formData.get('message')).toBe('Test message content')
    })

    render(
      <form onSubmit={handleSubmit}>
        <Textarea name="message" defaultValue="Test message content" />
        <button type="submit">Submit</button>
      </form>
    )
    
    fireEvent.click(screen.getByRole('button'))
    expect(handleSubmit).toHaveBeenCalled()
  })

  it('should handle different border styles', () => {
    render(<Textarea className="border-red-500" data-testid="border-textarea" />)
    
    const textarea = screen.getByTestId('border-textarea')
    expect(textarea).toHaveClass('border-red-500')
  })

  it('should support different background colors', () => {
    render(<Textarea className="bg-gray-50" data-testid="bg-textarea" />)
    
    const textarea = screen.getByTestId('bg-textarea')
    expect(textarea).toHaveClass('bg-gray-50')
  })

  it('should handle resize behavior', () => {
    render(<Textarea className="resize-none" data-testid="resize-textarea" />)
    
    const textarea = screen.getByTestId('resize-textarea')
    expect(textarea).toHaveClass('resize-none')
  })

  it('should work with validation states', () => {
    render(
      <div>
        <Textarea 
          className="border-red-500 focus-visible:ring-red-500" 
          data-testid="error-textarea"
          aria-invalid="true"
          aria-describedby="error-message"
        />
        <div id="error-message">This field is required</div>
      </div>
    )
    
    const textarea = screen.getByTestId('error-textarea')
    expect(textarea).toHaveAttribute('aria-invalid', 'true')
    expect(textarea).toHaveAttribute('aria-describedby', 'error-message')
    expect(textarea).toHaveClass('border-red-500')
  })

  it('should handle keyboard events', () => {
    const handleKeyDown = vi.fn()
    const handleKeyUp = vi.fn()
    render(
      <Textarea 
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        data-testid="keyboard-textarea" 
      />
    )
    
    const textarea = screen.getByTestId('keyboard-textarea')
    
    fireEvent.keyDown(textarea, { key: 'Enter' })
    expect(handleKeyDown).toHaveBeenCalledTimes(1)
    
    fireEvent.keyUp(textarea, { key: 'Enter' })
    expect(handleKeyUp).toHaveBeenCalledTimes(1)
  })

  it('should support autoFocus', () => {
    render(<Textarea autoFocus data-testid="autofocus-textarea" />)
    
    const textarea = screen.getByTestId('autofocus-textarea')
    expect(textarea).toHaveFocus()
  })

  it('should handle readOnly state', () => {
    render(<Textarea readOnly value="Read only content" data-testid="readonly-textarea" />)
    
    const textarea = screen.getByTestId('readonly-textarea') as HTMLTextAreaElement
    expect(textarea).toHaveAttribute('readonly')
    expect(textarea.value).toBe('Read only content')
  })

  it('should work with different text alignments', () => {
    render(<Textarea className="text-center" data-testid="aligned-textarea" />)
    
    const textarea = screen.getByTestId('aligned-textarea')
    expect(textarea).toHaveClass('text-center')
  })

  it('should handle spellcheck attribute', () => {
    render(<Textarea spellCheck={false} data-testid="spellcheck-textarea" />)
    
    const textarea = screen.getByTestId('spellcheck-textarea')
    expect(textarea).toHaveAttribute('spellcheck', 'false')
  })

  it('should work with labels', () => {
    render(
      <div>
        <label htmlFor="message-textarea">Message</label>
        <Textarea id="message-textarea" />
      </div>
    )
    
    const label = screen.getByText('Message')
    const textarea = screen.getByRole('textbox')
    
    expect(label).toHaveAttribute('for', 'message-textarea')
    expect(textarea).toHaveAttribute('id', 'message-textarea')
  })
})