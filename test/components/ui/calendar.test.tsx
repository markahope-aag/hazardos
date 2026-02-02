import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { Calendar } from '@/components/ui/calendar'

// Mock date-fns
vi.mock('date-fns', () => ({
  format: vi.fn((date, formatStr) => {
    if (formatStr === 'MMMM yyyy') return 'January 2024'
    if (formatStr === 'd') return date.getDate().toString()
    return date.toLocaleDateString()
  }),
  startOfMonth: vi.fn((date) => new Date(date.getFullYear(), date.getMonth(), 1)),
  endOfMonth: vi.fn((date) => new Date(date.getFullYear(), date.getMonth() + 1, 0)),
  eachDayOfInterval: vi.fn(() => {
    const days = []
    for (let i = 1; i <= 31; i++) {
      days.push(new Date(2024, 0, i))
    }
    return days
  }),
  isSameDay: vi.fn((a, b) => a.getDate() === b.getDate()),
  isSameMonth: vi.fn(() => true),
  isToday: vi.fn((date) => date.getDate() === 15),
  addMonths: vi.fn((date, amount) => new Date(date.getFullYear(), date.getMonth() + amount, date.getDate())),
  subMonths: vi.fn((date, amount) => new Date(date.getFullYear(), date.getMonth() - amount, date.getDate())),
}))

describe('Calendar', () => {
  const mockOnSelect = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render calendar placeholder', () => {
    render(<Calendar />)

    expect(screen.getByText('Calendar component placeholder')).toBeInTheDocument()
  })

  it('should render with selected date', () => {
    const selectedDate = new Date(2024, 0, 15)
    render(<Calendar selected={selectedDate} />)

    expect(screen.getByText('Calendar component placeholder')).toBeInTheDocument()
    expect(screen.getByText(/Selected:/)).toBeInTheDocument()
  })

  it('should accept onSelect prop', () => {
    render(<Calendar onSelect={mockOnSelect} />)

    expect(screen.getByText('Calendar component placeholder')).toBeInTheDocument()
  })

  it('should apply custom className', () => {
    const { container } = render(<Calendar className="custom-calendar" />)

    const calendarDiv = container.querySelector('.custom-calendar')
    expect(calendarDiv).toBeInTheDocument()
  })

  it('should accept mode prop', () => {
    render(<Calendar mode="single" onSelect={mockOnSelect} />)

    expect(screen.getByText('Calendar component placeholder')).toBeInTheDocument()
  })

  it('should accept disabled prop', () => {
    const disabledDates = [new Date(2024, 0, 10), new Date(2024, 0, 20)]
    render(<Calendar disabled={disabledDates} />)

    expect(screen.getByText('Calendar component placeholder')).toBeInTheDocument()
  })

  it('should accept fromDate and toDate props', () => {
    const fromDate = new Date(2024, 0, 10)
    const toDate = new Date(2024, 0, 20)

    render(<Calendar fromDate={fromDate} toDate={toDate} />)

    expect(screen.getByText('Calendar component placeholder')).toBeInTheDocument()
  })

  it('should accept fixedWeeks prop', () => {
    render(<Calendar fixedWeeks />)

    expect(screen.getByText('Calendar component placeholder')).toBeInTheDocument()
  })

  it('should accept showOutsideDays prop', () => {
    render(<Calendar showOutsideDays />)

    expect(screen.getByText('Calendar component placeholder')).toBeInTheDocument()
  })

  it('should accept weekStartsOn prop', () => {
    render(<Calendar weekStartsOn={1} />)

    expect(screen.getByText('Calendar component placeholder')).toBeInTheDocument()
  })

  it('should accept ISOWeek prop', () => {
    render(<Calendar ISOWeek />)

    expect(screen.getByText('Calendar component placeholder')).toBeInTheDocument()
  })

  it('should accept captionLayout prop', () => {
    render(<Calendar captionLayout="dropdown" />)

    expect(screen.getByText('Calendar component placeholder')).toBeInTheDocument()
  })

  it('should accept numberOfMonths prop', () => {
    render(<Calendar numberOfMonths={2} />)

    expect(screen.getByText('Calendar component placeholder')).toBeInTheDocument()
  })

  it('should accept pagedNavigation prop', () => {
    render(<Calendar numberOfMonths={2} pagedNavigation />)

    expect(screen.getByText('Calendar component placeholder')).toBeInTheDocument()
  })

  it('should accept reverseMonths prop', () => {
    render(<Calendar numberOfMonths={2} reverseMonths />)

    expect(screen.getByText('Calendar component placeholder')).toBeInTheDocument()
  })
})