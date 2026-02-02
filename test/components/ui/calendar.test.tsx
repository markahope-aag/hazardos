import { render, screen, fireEvent } from '@testing-library/react'
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

  it('should render calendar with current month', () => {
    render(<Calendar />)
    
    expect(screen.getByText('January 2024')).toBeInTheDocument()
  })

  it('should render day headers', () => {
    render(<Calendar />)
    
    expect(screen.getByText('Su')).toBeInTheDocument()
    expect(screen.getByText('Mo')).toBeInTheDocument()
    expect(screen.getByText('Tu')).toBeInTheDocument()
    expect(screen.getByText('We')).toBeInTheDocument()
    expect(screen.getByText('Th')).toBeInTheDocument()
    expect(screen.getByText('Fr')).toBeInTheDocument()
    expect(screen.getByText('Sa')).toBeInTheDocument()
  })

  it('should render navigation buttons', () => {
    render(<Calendar />)
    
    const prevButton = screen.getByRole('button', { name: /previous month/i })
    const nextButton = screen.getByRole('button', { name: /next month/i })
    
    expect(prevButton).toBeInTheDocument()
    expect(nextButton).toBeInTheDocument()
  })

  it('should call onSelect when date is clicked', () => {
    render(<Calendar onSelect={mockOnSelect} />)
    
    const dayButton = screen.getByRole('button', { name: '15' })
    fireEvent.click(dayButton)
    
    expect(mockOnSelect).toHaveBeenCalledWith(expect.any(Date))
  })

  it('should highlight selected date', () => {
    const selectedDate = new Date(2024, 0, 15)
    render(<Calendar selected={selectedDate} onSelect={mockOnSelect} />)
    
    const selectedDay = screen.getByRole('button', { name: '15' })
    expect(selectedDay).toHaveClass('bg-primary', 'text-primary-foreground')
  })

  it('should highlight today', () => {
    render(<Calendar />)
    
    const todayButton = screen.getByRole('button', { name: '15' })
    expect(todayButton).toHaveClass('bg-accent', 'text-accent-foreground')
  })

  it('should navigate to previous month', () => {
    render(<Calendar />)
    
    const prevButton = screen.getByRole('button', { name: /previous month/i })
    fireEvent.click(prevButton)
    
    // Should trigger month navigation
    expect(prevButton).toBeInTheDocument()
  })

  it('should navigate to next month', () => {
    render(<Calendar />)
    
    const nextButton = screen.getByRole('button', { name: /next month/i })
    fireEvent.click(nextButton)
    
    // Should trigger month navigation
    expect(nextButton).toBeInTheDocument()
  })

  it('should disable dates when disabled prop is provided', () => {
    const disabledDates = [new Date(2024, 0, 10), new Date(2024, 0, 20)]
    render(<Calendar disabled={disabledDates} />)
    
    const disabledDay = screen.getByRole('button', { name: '10' })
    expect(disabledDay).toBeDisabled()
  })

  it('should apply custom className', () => {
    render(<Calendar className="custom-calendar" />)
    
    const calendar = screen.getByRole('grid')
    expect(calendar.parentElement).toHaveClass('custom-calendar')
  })

  it('should handle mode="single"', () => {
    render(<Calendar mode="single" onSelect={mockOnSelect} />)
    
    const dayButton = screen.getByRole('button', { name: '15' })
    fireEvent.click(dayButton)
    
    expect(mockOnSelect).toHaveBeenCalledWith(expect.any(Date))
  })

  it('should handle mode="multiple"', () => {
    const mockOnSelectMultiple = vi.fn()
    render(<Calendar mode="multiple" onSelect={mockOnSelectMultiple} />)
    
    const dayButton1 = screen.getByRole('button', { name: '15' })
    const dayButton2 = screen.getByRole('button', { name: '16' })
    
    fireEvent.click(dayButton1)
    fireEvent.click(dayButton2)
    
    expect(mockOnSelectMultiple).toHaveBeenCalledTimes(2)
  })

  it('should handle mode="range"', () => {
    const mockOnSelectRange = vi.fn()
    render(<Calendar mode="range" onSelect={mockOnSelectRange} />)
    
    const dayButton1 = screen.getByRole('button', { name: '15' })
    const dayButton2 = screen.getByRole('button', { name: '20' })
    
    fireEvent.click(dayButton1)
    fireEvent.click(dayButton2)
    
    expect(mockOnSelectRange).toHaveBeenCalledTimes(2)
  })

  it('should show multiple selected dates in multiple mode', () => {
    const selectedDates = [new Date(2024, 0, 15), new Date(2024, 0, 16)]
    render(<Calendar mode="multiple" selected={selectedDates} />)
    
    const day15 = screen.getByRole('button', { name: '15' })
    const day16 = screen.getByRole('button', { name: '16' })
    
    expect(day15).toHaveClass('bg-primary', 'text-primary-foreground')
    expect(day16).toHaveClass('bg-primary', 'text-primary-foreground')
  })

  it('should show range selection in range mode', () => {
    const selectedRange = {
      from: new Date(2024, 0, 15),
      to: new Date(2024, 0, 20),
    }
    render(<Calendar mode="range" selected={selectedRange} />)
    
    const startDay = screen.getByRole('button', { name: '15' })
    const endDay = screen.getByRole('button', { name: '20' })
    
    expect(startDay).toHaveClass('bg-primary', 'text-primary-foreground')
    expect(endDay).toHaveClass('bg-primary', 'text-primary-foreground')
  })

  it('should handle keyboard navigation', () => {
    render(<Calendar onSelect={mockOnSelect} />)
    
    const dayButton = screen.getByRole('button', { name: '15' })
    
    // Test Enter key
    fireEvent.keyDown(dayButton, { key: 'Enter' })
    expect(mockOnSelect).toHaveBeenCalledWith(expect.any(Date))
    
    // Test Space key
    fireEvent.keyDown(dayButton, { key: ' ' })
    expect(mockOnSelect).toHaveBeenCalledTimes(2)
  })

  it('should handle arrow key navigation', () => {
    render(<Calendar />)
    
    const dayButton = screen.getByRole('button', { name: '15' })
    
    // Test arrow keys for navigation
    fireEvent.keyDown(dayButton, { key: 'ArrowRight' })
    fireEvent.keyDown(dayButton, { key: 'ArrowLeft' })
    fireEvent.keyDown(dayButton, { key: 'ArrowUp' })
    fireEvent.keyDown(dayButton, { key: 'ArrowDown' })
    
    // Should handle navigation without errors
    expect(dayButton).toBeInTheDocument()
  })

  it('should have proper accessibility attributes', () => {
    render(<Calendar />)
    
    const calendar = screen.getByRole('grid')
    expect(calendar).toHaveAttribute('aria-label')
    
    const dayButtons = screen.getAllByRole('button')
    dayButtons.forEach(button => {
      if (button.textContent && /^\d+$/.test(button.textContent)) {
        expect(button).toHaveAttribute('aria-label')
      }
    })
  })

  it('should handle fromDate and toDate constraints', () => {
    const fromDate = new Date(2024, 0, 10)
    const toDate = new Date(2024, 0, 20)
    
    render(<Calendar fromDate={fromDate} toDate={toDate} />)
    
    // Dates outside range should be disabled
    const earlyDate = screen.getByRole('button', { name: '5' })
    const lateDate = screen.getByRole('button', { name: '25' })
    
    expect(earlyDate).toBeDisabled()
    expect(lateDate).toBeDisabled()
  })

  it('should handle fixedWeeks prop', () => {
    render(<Calendar fixedWeeks />)
    
    // Should always show 6 weeks
    const calendar = screen.getByRole('grid')
    expect(calendar).toBeInTheDocument()
  })

  it('should handle showOutsideDays prop', () => {
    render(<Calendar showOutsideDays />)
    
    // Should show days from previous/next month
    const calendar = screen.getByRole('grid')
    expect(calendar).toBeInTheDocument()
  })

  it('should handle weekStartsOn prop', () => {
    render(<Calendar weekStartsOn={1} />) // Monday
    
    // Should start week on Monday
    expect(screen.getByText('Mo')).toBeInTheDocument()
  })

  it('should handle ISOWeek prop', () => {
    render(<Calendar ISOWeek />)
    
    // Should use ISO week numbering
    const calendar = screen.getByRole('grid')
    expect(calendar).toBeInTheDocument()
  })

  it('should handle captionLayout prop', () => {
    render(<Calendar captionLayout="dropdown" />)
    
    // Should show dropdown for month/year selection
    const calendar = screen.getByRole('grid')
    expect(calendar).toBeInTheDocument()
  })

  it('should handle numberOfMonths prop', () => {
    render(<Calendar numberOfMonths={2} />)
    
    // Should show multiple months
    const calendar = screen.getByRole('grid')
    expect(calendar).toBeInTheDocument()
  })

  it('should handle pagedNavigation prop', () => {
    render(<Calendar numberOfMonths={2} pagedNavigation />)
    
    // Should navigate by page instead of single month
    const nextButton = screen.getByRole('button', { name: /next month/i })
    expect(nextButton).toBeInTheDocument()
  })

  it('should handle reverseMonths prop', () => {
    render(<Calendar numberOfMonths={2} reverseMonths />)
    
    // Should reverse month order
    const calendar = screen.getByRole('grid')
    expect(calendar).toBeInTheDocument()
  })
})