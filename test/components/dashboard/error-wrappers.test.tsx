import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  StatsCardsErrorBoundary,
  UpcomingJobsErrorBoundary,
  OverdueInvoicesErrorBoundary,
  RecentActivityErrorBoundary,
} from '@/components/dashboard/error-wrappers'

// Mock WidgetErrorBoundary
vi.mock('@/components/error-boundaries', () => ({
  WidgetErrorBoundary: ({ children, title, height, showCard, icon }: any) => (
    <div
      data-testid="widget-error-boundary"
      data-title={title}
      data-height={height}
      data-show-card={String(showCard)}
    >
      {icon && <span data-testid="boundary-icon">{icon}</span>}
      {children}
    </div>
  ),
}))

describe('Dashboard Error Wrappers', () => {
  describe('StatsCardsErrorBoundary', () => {
    it('renders children', () => {
      render(
        <StatsCardsErrorBoundary>
          <div data-testid="child">Content</div>
        </StatsCardsErrorBoundary>
      )

      expect(screen.getByTestId('child')).toBeInTheDocument()
    })

    it('wraps with WidgetErrorBoundary with correct props', () => {
      render(
        <StatsCardsErrorBoundary>
          <div>Content</div>
        </StatsCardsErrorBoundary>
      )

      const boundary = screen.getByTestId('widget-error-boundary')
      expect(boundary).toHaveAttribute('data-title', 'Key Metrics')
      expect(boundary).toHaveAttribute('data-height', '150px')
      expect(boundary).toHaveAttribute('data-show-card', 'false')
    })

    it('includes icon', () => {
      render(
        <StatsCardsErrorBoundary>
          <div>Content</div>
        </StatsCardsErrorBoundary>
      )

      expect(screen.getByTestId('boundary-icon')).toBeInTheDocument()
    })
  })

  describe('UpcomingJobsErrorBoundary', () => {
    it('renders children', () => {
      render(
        <UpcomingJobsErrorBoundary>
          <div data-testid="child">Jobs Content</div>
        </UpcomingJobsErrorBoundary>
      )

      expect(screen.getByTestId('child')).toBeInTheDocument()
    })

    it('wraps with WidgetErrorBoundary with correct props', () => {
      render(
        <UpcomingJobsErrorBoundary>
          <div>Content</div>
        </UpcomingJobsErrorBoundary>
      )

      const boundary = screen.getByTestId('widget-error-boundary')
      expect(boundary).toHaveAttribute('data-title', 'Upcoming Jobs')
      expect(boundary).toHaveAttribute('data-height', '300px')
    })
  })

  describe('OverdueInvoicesErrorBoundary', () => {
    it('renders children', () => {
      render(
        <OverdueInvoicesErrorBoundary>
          <div data-testid="child">Invoices Content</div>
        </OverdueInvoicesErrorBoundary>
      )

      expect(screen.getByTestId('child')).toBeInTheDocument()
    })

    it('wraps with WidgetErrorBoundary with correct props', () => {
      render(
        <OverdueInvoicesErrorBoundary>
          <div>Content</div>
        </OverdueInvoicesErrorBoundary>
      )

      const boundary = screen.getByTestId('widget-error-boundary')
      expect(boundary).toHaveAttribute('data-title', 'Overdue Invoices')
      expect(boundary).toHaveAttribute('data-height', '300px')
    })
  })

  describe('RecentActivityErrorBoundary', () => {
    it('renders children', () => {
      render(
        <RecentActivityErrorBoundary>
          <div data-testid="child">Activity Content</div>
        </RecentActivityErrorBoundary>
      )

      expect(screen.getByTestId('child')).toBeInTheDocument()
    })

    it('wraps with WidgetErrorBoundary with correct props', () => {
      render(
        <RecentActivityErrorBoundary>
          <div>Content</div>
        </RecentActivityErrorBoundary>
      )

      const boundary = screen.getByTestId('widget-error-boundary')
      expect(boundary).toHaveAttribute('data-title', 'Recent Activity')
      expect(boundary).toHaveAttribute('data-height', '300px')
    })
  })
})
