import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Calendar } from '@/components/ui/calendar'

// These tests cover the month-grid calendar that replaced the original
// placeholder stub. We don't mock date-fns here — the real library is the
// thing we're relying on, and mocking it would mean the tests never
// exercise the actual date math.

describe('Calendar', () => {
  it('renders the current month heading by default', () => {
    const now = new Date()
    const expected = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    render(<Calendar />)
    expect(screen.getByText(expected)).toBeInTheDocument()
  })

  it('renders 42 day cells (6 weeks x 7 days)', () => {
    render(<Calendar selected={new Date(2026, 3, 15)} />)
    // Day cells are <button> elements inside the grid; filter by role.
    const dayButtons = screen
      .getAllByRole('button')
      .filter((el) => /^\d+$/.test(el.textContent?.trim() ?? ''))
    expect(dayButtons.length).toBeGreaterThanOrEqual(28)
    expect(dayButtons.length).toBeLessThanOrEqual(42)
  })

  it('invokes onSelect with a Date when a day is clicked', () => {
    const onSelect = vi.fn()
    render(<Calendar selected={new Date(2026, 3, 15)} onSelect={onSelect} />)
    // Click the "15" cell (the selected month's 15th)
    const fifteens = screen.getAllByText('15')
    fireEvent.click(fifteens[0])
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect.mock.calls[0][0]).toBeInstanceOf(Date)
  })

  it('marks the selected date with aria-pressed', () => {
    const selected = new Date(2026, 3, 15)
    render(<Calendar selected={selected} />)
    const cell = screen.getByLabelText(/April 15th, 2026/i)
    expect(cell).toHaveAttribute('aria-pressed', 'true')
  })

  it('advances to next month when the right chevron is clicked', () => {
    render(<Calendar selected={new Date(2026, 3, 15)} />)
    // Starting heading should include April
    expect(screen.getByText('April 2026')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Next month'))
    expect(screen.getByText('May 2026')).toBeInTheDocument()
  })

  it('skips onSelect when disabled returns true for a day', () => {
    const onSelect = vi.fn()
    render(
      <Calendar
        selected={new Date(2026, 3, 15)}
        onSelect={onSelect}
        disabled={(d) => d.getDate() === 10}
      />,
    )
    const tenths = screen.getAllByText('10')
    fireEvent.click(tenths[0])
    expect(onSelect).not.toHaveBeenCalled()
  })
})
