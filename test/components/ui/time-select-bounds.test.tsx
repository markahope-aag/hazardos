import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TimeSelect } from '@/components/ui/time-select'

// Radix Select renders its listbox in a portal on open. Pointer APIs jsdom
// doesn't implement have to be stubbed or the trigger never opens.
beforeEach(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn()
  window.HTMLElement.prototype.hasPointerCapture = vi.fn(() => false)
  window.HTMLElement.prototype.releasePointerCapture = vi.fn()
})

async function openDropdown() {
  await userEvent.click(screen.getByRole('combobox'))
}

describe('TimeSelect bounds', () => {
  it('offers the full day when no bounds are given', async () => {
    render(<TimeSelect value="" onChange={vi.fn()} />)
    await openDropdown()
    expect(screen.getByText('12:00 AM')).toBeInTheDocument()
    expect(screen.getByText('11:45 PM')).toBeInTheDocument()
  })

  it('hides times outside the working day', async () => {
    render(<TimeSelect value="" onChange={vi.fn()} minTime="06:00" maxTime="19:00" />)
    await openDropdown()
    expect(screen.queryByText('12:00 AM')).not.toBeInTheDocument()
    expect(screen.queryByText('5:45 AM')).not.toBeInTheDocument()
    expect(screen.getByText('6:00 AM')).toBeInTheDocument()
    expect(screen.getByText('7:00 PM')).toBeInTheDocument()
    expect(screen.queryByText('7:15 PM')).not.toBeInTheDocument()
  })

  it('keeps an already-booked time that now falls outside the bounds', async () => {
    // A survey booked at 5:30 AM before the org narrowed its hours must
    // still render its own time rather than an empty trigger.
    render(<TimeSelect value="05:30" onChange={vi.fn()} minTime="06:00" maxTime="19:00" />)
    await openDropdown()
    expect(screen.getAllByText('5:30 AM').length).toBeGreaterThan(0)
  })

  it('accepts a stored HH:MM:SS value from Postgres', async () => {
    render(<TimeSelect value="09:15:00" onChange={vi.fn()} minTime="06:00" maxTime="19:00" />)
    expect(screen.getByRole('combobox')).toHaveTextContent('9:15 AM')
  })
})
