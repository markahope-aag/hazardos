import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NumericStepper } from '@/components/surveys/mobile/inputs/numeric-stepper'

describe('NumericStepper', () => {
  it('renders with initial value', () => {
    render(<NumericStepper value={5} onChange={() => {}} />)
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('renders placeholder when value is null', () => {
    render(<NumericStepper value={null} onChange={() => {}} placeholder="—" />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('displays suffix when value is present', () => {
    render(<NumericStepper value={10} onChange={() => {}} suffix="sq ft" />)
    expect(screen.getByText('sq ft')).toBeInTheDocument()
  })

  it('does not display suffix when value is null', () => {
    render(<NumericStepper value={null} onChange={() => {}} suffix="sq ft" />)
    expect(screen.queryByText('sq ft')).not.toBeInTheDocument()
  })

  it('increments value when plus button is clicked', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()

    render(<NumericStepper value={5} onChange={handleChange} />)

    await user.click(screen.getByRole('button', { name: /increase/i }))
    expect(handleChange).toHaveBeenCalledWith(6)
  })

  it('decrements value when minus button is clicked', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()

    render(<NumericStepper value={5} onChange={handleChange} />)

    await user.click(screen.getByRole('button', { name: /decrease/i }))
    expect(handleChange).toHaveBeenCalledWith(4)
  })

  it('respects min value', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()

    render(<NumericStepper value={0} onChange={handleChange} min={0} />)

    // Decrease button should be disabled at min
    const decreaseBtn = screen.getByRole('button', { name: /decrease/i })
    expect(decreaseBtn).toBeDisabled()
  })

  it('respects max value', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()

    render(<NumericStepper value={100} onChange={handleChange} max={100} />)

    // Increase button should be disabled at max
    const increaseBtn = screen.getByRole('button', { name: /increase/i })
    expect(increaseBtn).toBeDisabled()
  })

  it('uses custom step value', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()

    render(<NumericStepper value={10} onChange={handleChange} step={5} />)

    await user.click(screen.getByRole('button', { name: /increase/i }))
    expect(handleChange).toHaveBeenCalledWith(15)
  })

  it('disables both buttons when disabled prop is true', () => {
    render(<NumericStepper value={5} onChange={() => {}} disabled />)

    const buttons = screen.getAllByRole('button')
    buttons.forEach(button => {
      expect(button).toBeDisabled()
    })
  })

  it('starts from min when incrementing from null', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()

    render(<NumericStepper value={null} onChange={handleChange} min={0} />)

    await user.click(screen.getByRole('button', { name: /increase/i }))
    expect(handleChange).toHaveBeenCalledWith(1)
  })
})
