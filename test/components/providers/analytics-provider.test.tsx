import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock Vercel analytics
vi.mock('@vercel/analytics/react', () => ({
  Analytics: () => null,
}))

vi.mock('@vercel/speed-insights/react', () => ({
  SpeedInsights: () => null,
}))

vi.mock('@/lib/analytics', () => ({
  track: vi.fn(),
}))

// Import after mocking
import AnalyticsProvider from '@/components/providers/analytics-provider'

beforeEach(() => {
  vi.clearAllMocks()
  // Reset sessionStorage
  sessionStorage.clear()
})

describe('AnalyticsProvider', () => {
  it('renders children', () => {
    render(
      <AnalyticsProvider>
        <div data-testid="child">Child content</div>
      </AnalyticsProvider>
    )

    expect(screen.getByTestId('child')).toBeInTheDocument()
    expect(screen.getByText('Child content')).toBeInTheDocument()
  })

  it('renders multiple children', () => {
    render(
      <AnalyticsProvider>
        <div data-testid="child1">First</div>
        <div data-testid="child2">Second</div>
      </AnalyticsProvider>
    )

    expect(screen.getByTestId('child1')).toBeInTheDocument()
    expect(screen.getByTestId('child2')).toBeInTheDocument()
  })

  it('wraps children without errors', () => {
    expect(() =>
      render(
        <AnalyticsProvider>
          <div>Content</div>
        </AnalyticsProvider>
      )
    ).not.toThrow()
  })
})
