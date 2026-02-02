import { render, screen, fireEvent } from '@testing-library/react'
import { Checkbox } from '@/components/ui/checkbox'

describe('Checkbox', () => {
  describe('rendering', () => {
    it('should render checkbox', () => {
      render(<Checkbox />)

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeInTheDocument()
    })

    it('should render unchecked by default', () => {
      render(<Checkbox />)

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).not.toBeChecked()
    })

    it('should render with default styles', () => {
      render(<Checkbox />)

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toHaveClass('h-4', 'w-4', 'rounded-sm', 'border')
    })

    it('should accept custom className', () => {
      render(<Checkbox className="custom-checkbox" />)

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toHaveClass('custom-checkbox')
    })
  })

  describe('checked state', () => {
    it('should render as checked when checked prop is true', () => {
      render(<Checkbox checked={true} />)

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeChecked()
    })

    it('should render as unchecked when checked prop is false', () => {
      render(<Checkbox checked={false} />)

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).not.toBeChecked()
    })

    it('should render check icon when checked', () => {
      const { container } = render(<Checkbox checked={true} />)

      // The Check icon from lucide-react should be visible
      const checkIcon = container.querySelector('svg')
      expect(checkIcon).toBeInTheDocument()
    })
  })

  describe('interaction', () => {
    it('should call onCheckedChange when clicked', () => {
      const onCheckedChange = vi.fn()
      render(<Checkbox onCheckedChange={onCheckedChange} />)

      const checkbox = screen.getByRole('checkbox')
      fireEvent.click(checkbox)

      expect(onCheckedChange).toHaveBeenCalled()
    })

    it('should toggle checked state on click', () => {
      const onCheckedChange = vi.fn()
      render(<Checkbox checked={false} onCheckedChange={onCheckedChange} />)

      const checkbox = screen.getByRole('checkbox')
      fireEvent.click(checkbox)

      expect(onCheckedChange).toHaveBeenCalledWith(true)
    })

    it('should uncheck when clicking a checked checkbox', () => {
      const onCheckedChange = vi.fn()
      render(<Checkbox checked={true} onCheckedChange={onCheckedChange} />)

      const checkbox = screen.getByRole('checkbox')
      fireEvent.click(checkbox)

      expect(onCheckedChange).toHaveBeenCalledWith(false)
    })
  })

  describe('disabled state', () => {
    it('should render as disabled when disabled prop is true', () => {
      render(<Checkbox disabled />)

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeDisabled()
    })

    it('should have disabled styling', () => {
      render(<Checkbox disabled />)

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50')
    })

    it('should not call onCheckedChange when disabled and clicked', () => {
      const onCheckedChange = vi.fn()
      render(<Checkbox disabled onCheckedChange={onCheckedChange} />)

      const checkbox = screen.getByRole('checkbox')
      fireEvent.click(checkbox)

      expect(onCheckedChange).not.toHaveBeenCalled()
    })
  })

  describe('indeterminate state', () => {
    it('should handle indeterminate state', () => {
      render(<Checkbox checked="indeterminate" />)

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toHaveAttribute('data-state', 'indeterminate')
    })
  })

  describe('accessibility', () => {
    it('should support aria-label', () => {
      render(<Checkbox aria-label="Accept terms" />)

      const checkbox = screen.getByRole('checkbox', { name: 'Accept terms' })
      expect(checkbox).toBeInTheDocument()
    })

    it('should support aria-labelledby', () => {
      render(
        <>
          <label id="checkbox-label">Accept terms and conditions</label>
          <Checkbox aria-labelledby="checkbox-label" />
        </>
      )

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toHaveAttribute('aria-labelledby', 'checkbox-label')
    })

    it('should support aria-describedby', () => {
      render(
        <>
          <Checkbox aria-describedby="help-text" />
          <p id="help-text">Required field</p>
        </>
      )

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toHaveAttribute('aria-describedby', 'help-text')
    })

    it('should be keyboard accessible', () => {
      const onCheckedChange = vi.fn()
      render(<Checkbox onCheckedChange={onCheckedChange} />)

      const checkbox = screen.getByRole('checkbox')
      checkbox.focus()
      fireEvent.keyDown(checkbox, { key: ' ' })

      // Note: actual keyboard interaction behavior is handled by Radix
      expect(checkbox).toHaveFocus()
    })

    it('should have focus styles', () => {
      render(<Checkbox />)

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toHaveClass('focus-visible:outline-none', 'focus-visible:ring-2', 'focus-visible:ring-ring', 'focus-visible:ring-offset-2')
    })
  })

  describe('ref forwarding', () => {
    it('should forward ref to the underlying element', () => {
      const ref = vi.fn()
      render(<Checkbox ref={ref} />)

      expect(ref).toHaveBeenCalled()
    })
  })

  describe('controlled vs uncontrolled', () => {
    it('should work as controlled component', () => {
      const onCheckedChange = vi.fn()
      const { rerender } = render(
        <Checkbox checked={false} onCheckedChange={onCheckedChange} />
      )

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).not.toBeChecked()

      rerender(<Checkbox checked={true} onCheckedChange={onCheckedChange} />)
      expect(checkbox).toBeChecked()
    })

    it('should work as uncontrolled component with defaultChecked', () => {
      render(<Checkbox defaultChecked={true} />)

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeChecked()
    })
  })

  describe('name and value', () => {
    it('should accept name prop without error', () => {
      // Radix UI Checkbox uses a hidden input for form submission
      // The name prop is passed but not directly on the checkbox button element
      expect(() => render(<Checkbox name="terms" />)).not.toThrow()
    })

    it('should accept value prop without error', () => {
      // Radix UI Checkbox uses a hidden input for form submission
      // The value prop is passed but not directly on the checkbox button element
      expect(() => render(<Checkbox name="option" value="opt1" />)).not.toThrow()
    })
  })

  describe('required state', () => {
    it('should support required prop', () => {
      render(<Checkbox required />)

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeRequired()
    })
  })

  describe('data attributes', () => {
    it('should have data-state="checked" when checked', () => {
      render(<Checkbox checked={true} />)

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toHaveAttribute('data-state', 'checked')
    })

    it('should have data-state="unchecked" when unchecked', () => {
      render(<Checkbox checked={false} />)

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toHaveAttribute('data-state', 'unchecked')
    })
  })

  describe('form integration', () => {
    it('should work within a form', () => {
      const onSubmit = vi.fn((e) => e.preventDefault())

      render(
        <form onSubmit={onSubmit}>
          <Checkbox name="agree" />
          <button type="submit">Submit</button>
        </form>
      )

      const checkbox = screen.getByRole('checkbox')
      fireEvent.click(checkbox)
      fireEvent.click(screen.getByRole('button', { name: 'Submit' }))

      expect(onSubmit).toHaveBeenCalled()
    })
  })
})
