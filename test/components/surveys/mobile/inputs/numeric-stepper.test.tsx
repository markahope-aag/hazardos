import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NumericStepper } from '@/components/surveys/mobile/inputs/numeric-stepper'

// NumericStepper surrounds the +/- buttons with a directly-editable
// <input type="number"> so a surveyor can type "72" without tapping
// through 72 increments. The buttons are still present as accelerators.

describe('NumericStepper', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the current value in the editable input', () => {
    render(<NumericStepper value={5} onChange={() => {}} />)
    expect(screen.getByRole('spinbutton')).toHaveValue(5)
  })

  it('renders zero as a real value, not blank', () => {
    render(<NumericStepper value={0} onChange={() => {}} />)
    expect(screen.getByRole('spinbutton')).toHaveValue(0)
  })

  it('renders an empty input with the placeholder when value is null', () => {
    render(<NumericStepper value={null} onChange={() => {}} placeholder="—" />)
    const input = screen.getByRole('spinbutton')
    expect(input).toHaveValue(null)
    expect(input).toHaveAttribute('placeholder', '—')
  })

  it('renders the suffix alongside a populated value', () => {
    render(<NumericStepper value={10} onChange={() => {}} suffix="sq ft" />)
    expect(screen.getByText('sq ft')).toBeInTheDocument()
  })

  it('omits the suffix while the input is empty', () => {
    render(<NumericStepper value={null} onChange={() => {}} suffix="sq ft" />)
    expect(screen.queryByText('sq ft')).not.toBeInTheDocument()
  })

  it('increments by the step prop when the plus button is clicked', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<NumericStepper value={10} onChange={handleChange} step={5} />)

    await user.click(screen.getByRole('button', { name: /increase/i }))

    expect(handleChange).toHaveBeenCalledWith(15)
  })

  it('decrements by the step prop when the minus button is clicked', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<NumericStepper value={10} onChange={handleChange} step={5} />)

    await user.click(screen.getByRole('button', { name: /decrease/i }))

    expect(handleChange).toHaveBeenCalledWith(5)
  })

  it('disables the minus button at the min boundary', () => {
    render(<NumericStepper value={0} onChange={() => {}} min={0} />)
    expect(screen.getByRole('button', { name: /decrease/i })).toBeDisabled()
  })

  it('disables the plus button at the max boundary', () => {
    render(<NumericStepper value={100} onChange={() => {}} max={100} />)
    expect(screen.getByRole('button', { name: /increase/i })).toBeDisabled()
  })

  it('bootstraps from min when incrementing a null value', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<NumericStepper value={null} onChange={handleChange} min={0} />)

    await user.click(screen.getByRole('button', { name: /increase/i }))

    // value is null, so currentValue falls back to min (0) and then we
    // add step (default 1).
    expect(handleChange).toHaveBeenCalledWith(1)
  })

  it('disables both buttons and the input when disabled', () => {
    render(<NumericStepper value={5} onChange={() => {}} disabled />)
    expect(screen.getByRole('spinbutton')).toBeDisabled()
    expect(screen.getByRole('button', { name: /increase/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /decrease/i })).toBeDisabled()
  })

  it('commits the typed value, clamped to min/max, on blur', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<NumericStepper value={0} onChange={handleChange} min={0} max={100} />)

    const input = screen.getByRole('spinbutton')
    await user.clear(input)
    await user.type(input, '72')
    // onChange isn't called for each keystroke — the stepper holds a
    // draft locally so partial entries don't fight with the clamp.
    expect(handleChange).not.toHaveBeenCalled()

    await user.tab()
    expect(handleChange).toHaveBeenCalledWith(72)
  })

  it('clamps an out-of-range typed value on blur', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<NumericStepper value={0} onChange={handleChange} min={0} max={100} />)

    const input = screen.getByRole('spinbutton')
    await user.clear(input)
    await user.type(input, '500')
    await user.tab()

    expect(handleChange).toHaveBeenCalledWith(100)
  })
})
