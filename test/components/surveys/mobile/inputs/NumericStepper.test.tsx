import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NumericStepper } from '@/components/surveys/mobile/inputs/NumericStepper'

describe('NumericStepper Component', () => {
  const mockOnChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render with default props', () => {
    render(<NumericStepper value={null} onChange={mockOnChange} />)

    expect(screen.getByRole('button', { name: /decrease value/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /increase value/i })).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument() // Default placeholder
  })

  it('should display the current value', () => {
    render(<NumericStepper value={5} onChange={mockOnChange} />)

    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('should display custom placeholder when value is null', () => {
    render(<NumericStepper value={null} onChange={mockOnChange} placeholder="Empty" />)

    expect(screen.getByText('Empty')).toBeInTheDocument()
  })

  it('should increment value when plus button is clicked', async () => {
    const user = userEvent.setup()
    render(<NumericStepper value={5} onChange={mockOnChange} />)

    const incrementButton = screen.getByRole('button', { name: /increase value/i })
    await user.click(incrementButton)

    expect(mockOnChange).toHaveBeenCalledWith(6)
  })

  it('should decrement value when minus button is clicked', async () => {
    const user = userEvent.setup()
    render(<NumericStepper value={5} onChange={mockOnChange} />)

    const decrementButton = screen.getByRole('button', { name: /decrease value/i })
    await user.click(decrementButton)

    expect(mockOnChange).toHaveBeenCalledWith(4)
  })

  it('should start from min value when incrementing from null', async () => {
    const user = userEvent.setup()
    render(<NumericStepper value={null} onChange={mockOnChange} min={10} />)

    const incrementButton = screen.getByRole('button', { name: /increase value/i })
    await user.click(incrementButton)

    expect(mockOnChange).toHaveBeenCalledWith(10)
  })

  it('should respect min value constraint', async () => {
    const user = userEvent.setup()
    render(<NumericStepper value={0} onChange={mockOnChange} min={0} />)

    const decrementButton = screen.getByRole('button', { name: /decrease value/i })
    expect(decrementButton).toBeDisabled()

    await user.click(decrementButton)
    expect(mockOnChange).not.toHaveBeenCalled()
  })

  it('should respect max value constraint', async () => {
    const user = userEvent.setup()
    render(<NumericStepper value={10} onChange={mockOnChange} max={10} />)

    const incrementButton = screen.getByRole('button', { name: /increase value/i })
    expect(incrementButton).toBeDisabled()

    await user.click(incrementButton)
    expect(mockOnChange).not.toHaveBeenCalled()
  })

  it('should use custom step value', async () => {
    const user = userEvent.setup()
    render(<NumericStepper value={10} onChange={mockOnChange} step={5} />)

    const incrementButton = screen.getByRole('button', { name: /increase value/i })
    await user.click(incrementButton)

    expect(mockOnChange).toHaveBeenCalledWith(15)

    const decrementButton = screen.getByRole('button', { name: /decrease value/i })
    await user.click(decrementButton)

    expect(mockOnChange).toHaveBeenCalledWith(5)
  })

  it('should display suffix when value is not null', () => {
    render(<NumericStepper value={5} onChange={mockOnChange} suffix="kg" />)

    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('kg')).toBeInTheDocument()
  })

  it('should not display suffix when value is null', () => {
    render(<NumericStepper value={null} onChange={mockOnChange} suffix="kg" />)

    expect(screen.queryByText('kg')).not.toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('should be disabled when disabled prop is true', () => {
    render(<NumericStepper value={5} onChange={mockOnChange} disabled />)

    const incrementButton = screen.getByRole('button', { name: /increase value/i })
    const decrementButton = screen.getByRole('button', { name: /decrease value/i })

    expect(incrementButton).toBeDisabled()
    expect(decrementButton).toBeDisabled()
  })

  it('should not call onChange when disabled', async () => {
    const user = userEvent.setup()
    render(<NumericStepper value={5} onChange={mockOnChange} disabled />)

    const incrementButton = screen.getByRole('button', { name: /increase value/i })
    await user.click(incrementButton)

    expect(mockOnChange).not.toHaveBeenCalled()
  })

  it('should apply custom className', () => {
    render(<NumericStepper value={5} onChange={mockOnChange} className="custom-class" />)

    const container = screen.getByRole('button', { name: /decrease value/i }).parentElement
    expect(container).toHaveClass('custom-class')
  })

  it('should handle edge cases with min and max values', async () => {
    const user = userEvent.setup()
    render(<NumericStepper value={5} onChange={mockOnChange} min={0} max={10} />)

    // Test decrementing to min
    const decrementButton = screen.getByRole('button', { name: /decrease value/i })
    for (let i = 0; i < 5; i++) {
      await user.click(decrementButton)
    }

    expect(mockOnChange).toHaveBeenLastCalledWith(0)

    // Test incrementing to max
    const { rerender } = render(<NumericStepper value={5} onChange={mockOnChange} min={0} max={10} />)
    const incrementButton = screen.getByRole('button', { name: /increase value/i })
    
    for (let i = 0; i < 5; i++) {
      await user.click(incrementButton)
    }

    expect(mockOnChange).toHaveBeenLastCalledWith(10)
  })

  it('should handle decimal step values', async () => {
    const user = userEvent.setup()
    render(<NumericStepper value={1.0} onChange={mockOnChange} step={0.5} />)

    const incrementButton = screen.getByRole('button', { name: /increase value/i })
    await user.click(incrementButton)

    expect(mockOnChange).toHaveBeenCalledWith(1.5)
  })

  it('should enable increment button when value is null', () => {
    render(<NumericStepper value={null} onChange={mockOnChange} />)

    const incrementButton = screen.getByRole('button', { name: /increase value/i })
    const decrementButton = screen.getByRole('button', { name: /decrease value/i })

    expect(incrementButton).not.toBeDisabled()
    expect(decrementButton).toBeDisabled()
  })

  it('should handle negative values correctly', async () => {
    const user = userEvent.setup()
    render(<NumericStepper value={-5} onChange={mockOnChange} min={-10} max={10} />)

    const incrementButton = screen.getByRole('button', { name: /increase value/i })
    const decrementButton = screen.getByRole('button', { name: /decrease value/i })

    await user.click(incrementButton)
    expect(mockOnChange).toHaveBeenCalledWith(-4)

    await user.click(decrementButton)
    expect(mockOnChange).toHaveBeenCalledWith(-6)
  })

  it('should have proper accessibility attributes', () => {
    render(<NumericStepper value={5} onChange={mockOnChange} />)

    const incrementButton = screen.getByRole('button', { name: /increase value/i })
    const decrementButton = screen.getByRole('button', { name: /decrease value/i })

    expect(incrementButton).toHaveAttribute('type', 'button')
    expect(decrementButton).toHaveAttribute('type', 'button')
    expect(incrementButton).toHaveAttribute('aria-label', 'Increase value')
    expect(decrementButton).toHaveAttribute('aria-label', 'Decrease value')
  })

  it('should handle large numbers correctly', () => {
    render(<NumericStepper value={999999} onChange={mockOnChange} />)

    expect(screen.getByText('999999')).toBeInTheDocument()
  })

  it('should handle zero value correctly', () => {
    render(<NumericStepper value={0} onChange={mockOnChange} />)

    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('should maintain button state based on current value and constraints', () => {
    // Test at minimum value
    const { rerender } = render(<NumericStepper value={0} onChange={mockOnChange} min={0} max={10} />)
    
    let incrementButton = screen.getByRole('button', { name: /increase value/i })
    let decrementButton = screen.getByRole('button', { name: /decrease value/i })
    
    expect(incrementButton).not.toBeDisabled()
    expect(decrementButton).toBeDisabled()

    // Test at maximum value
    rerender(<NumericStepper value={10} onChange={mockOnChange} min={0} max={10} />)
    
    incrementButton = screen.getByRole('button', { name: /increase value/i })
    decrementButton = screen.getByRole('button', { name: /decrease value/i })
    
    expect(incrementButton).toBeDisabled()
    expect(decrementButton).not.toBeDisabled()

    // Test in middle range
    rerender(<NumericStepper value={5} onChange={mockOnChange} min={0} max={10} />)
    
    incrementButton = screen.getByRole('button', { name: /increase value/i })
    decrementButton = screen.getByRole('button', { name: /decrease value/i })
    
    expect(incrementButton).not.toBeDisabled()
    expect(decrementButton).not.toBeDisabled()
  })
})