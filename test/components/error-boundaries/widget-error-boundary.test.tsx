import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WidgetErrorBoundary } from '@/components/error-boundaries/widget-error-boundary'

// Mock error-boundary
vi.mock('@/components/error-boundaries/error-boundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

describe('WidgetErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    render(
      <WidgetErrorBoundary title="Revenue Chart">
        <div data-testid="chart-content">Chart Content</div>
      </WidgetErrorBoundary>
    )
    expect(screen.getByTestId('chart-content')).toBeInTheDocument()
  })

  it('accepts custom title prop', () => {
    render(
      <WidgetErrorBoundary title="Jobs Overview">
        <div>Widget</div>
      </WidgetErrorBoundary>
    )
    expect(screen.getByText('Widget')).toBeInTheDocument()
  })

  it('accepts height prop', () => {
    render(
      <WidgetErrorBoundary height="300px">
        <div>Content</div>
      </WidgetErrorBoundary>
    )
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('accepts showCard prop', () => {
    render(
      <WidgetErrorBoundary showCard={false}>
        <div>No Card</div>
      </WidgetErrorBoundary>
    )
    expect(screen.getByText('No Card')).toBeInTheDocument()
  })

  it('accepts retryLabel prop', () => {
    render(
      <WidgetErrorBoundary retryLabel="Refresh">
        <div>Widget</div>
      </WidgetErrorBoundary>
    )
    expect(screen.getByText('Widget')).toBeInTheDocument()
  })
})
