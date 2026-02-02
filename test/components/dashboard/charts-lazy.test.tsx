import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock next/dynamic
vi.mock('next/dynamic', () => ({
  default: (loader: () => Promise<{ default: React.ComponentType }>, options: { loading?: () => JSX.Element }) => {
    // Return a component that shows the loading state
    const MockedComponent = () => {
      if (options?.loading) {
        return options.loading()
      }
      return null
    }
    return MockedComponent
  },
}))

// Mock error boundaries
vi.mock('@/components/error-boundaries', () => ({
  ChartErrorBoundary: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div data-testid="chart-error-boundary" data-title={title}>
      {children}
    </div>
  ),
}))

// Import after mocks
import { RevenueChart, JobsByStatus } from '@/components/dashboard/charts-lazy'

describe('charts-lazy', () => {
  describe('RevenueChart', () => {
    it('renders wrapped in error boundary', () => {
      render(<RevenueChart />)

      const boundary = screen.getByTestId('chart-error-boundary')
      expect(boundary).toBeInTheDocument()
      expect(boundary).toHaveAttribute('data-title', 'Revenue (Last 6 Months)')
    })

    it('shows loading state', () => {
      render(<RevenueChart />)

      // Should show loading spinner
      expect(document.querySelector('.animate-spin')).toBeInTheDocument()
    })
  })

  describe('JobsByStatus', () => {
    it('renders wrapped in error boundary', () => {
      render(<JobsByStatus />)

      const boundary = screen.getByTestId('chart-error-boundary')
      expect(boundary).toBeInTheDocument()
      expect(boundary).toHaveAttribute('data-title', 'Jobs by Status')
    })

    it('shows loading state', () => {
      render(<JobsByStatus />)

      // Should show loading spinner
      expect(document.querySelector('.animate-spin')).toBeInTheDocument()
    })
  })
})
