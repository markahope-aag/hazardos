import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import CalendarPage from '@/app/(dashboard)/calendar/page'

// Mock the CalendarSkeleton
vi.mock('@/app/(dashboard)/calendar/calendar-skeleton', () => ({
  CalendarSkeleton: () => <div data-testid="calendar-skeleton">Loading...</div>,
}))

// Mock next/dynamic
vi.mock('next/dynamic', () => ({
  default: (fn: () => Promise<{ default: React.ComponentType }>, options: { loading?: () => JSX.Element }) => {
    // Return the loading component for testing
    return options?.loading || (() => <div data-testid="calendar-view">Calendar</div>)
  },
}))

describe('CalendarPage', () => {
  it('renders without crashing', () => {
    expect(() => render(<CalendarPage />)).not.toThrow()
  })

  it('displays page heading', () => {
    render(<CalendarPage />)
    expect(screen.getByText('Calendar')).toBeInTheDocument()
  })

  it('displays page description', () => {
    render(<CalendarPage />)
    expect(screen.getByText('View and manage scheduled jobs')).toBeInTheDocument()
  })

  it('renders skeleton loading state initially', () => {
    render(<CalendarPage />)
    expect(screen.getByTestId('calendar-skeleton')).toBeInTheDocument()
  })
})
