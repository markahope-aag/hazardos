import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import CalendarPage from '@/app/(dashboard)/calendar/page'

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

// Mock the CalendarSkeleton
vi.mock('@/app/(dashboard)/calendar/calendar-skeleton', () => ({
  CalendarSkeleton: () => <div data-testid="calendar-skeleton">Loading...</div>,
}))

// Mock next/dynamic
vi.mock('next/dynamic', () => ({
  default: (fn: () => Promise<{ default: React.ComponentType }>, options: { loading?: () => React.ReactNode }) => {
    // Return the loading component for testing
    return options?.loading || (() => <div data-testid="calendar-view">Calendar</div>)
  },
}))

describe('CalendarPage', () => {
  it('renders without crashing', () => {
    expect(() => renderWithQuery(<CalendarPage />)).not.toThrow()
  })

  it('displays page heading', () => {
    renderWithQuery(<CalendarPage />)
    expect(screen.getByText('Calendar')).toBeInTheDocument()
  })

  it('displays page description', () => {
    renderWithQuery(<CalendarPage />)
    expect(screen.getByText(/View and manage scheduled jobs/)).toBeInTheDocument()
  })

  it('renders skeleton loading state initially', () => {
    renderWithQuery(<CalendarPage />)
    expect(screen.getByTestId('calendar-skeleton')).toBeInTheDocument()
  })
})
