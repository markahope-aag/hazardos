import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { withErrorBoundary } from '@/components/error-boundaries/with-error-boundary'

// Mock error-boundary
vi.mock('@/components/error-boundaries/error-boundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Test component
function TestComponent({ text }: { text: string }) {
  return <div data-testid="test-component">{text}</div>
}
TestComponent.displayName = 'TestComponent'

describe('withErrorBoundary', () => {
  it('wraps a component with error boundary', () => {
    const WrappedComponent = withErrorBoundary(TestComponent)
    render(<WrappedComponent text="Hello" />)
    expect(screen.getByTestId('test-component')).toBeInTheDocument()
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('passes props through to wrapped component', () => {
    const WrappedComponent = withErrorBoundary(TestComponent)
    render(<WrappedComponent text="World" />)
    expect(screen.getByText('World')).toBeInTheDocument()
  })

  it('accepts error boundary props', () => {
    const WrappedComponent = withErrorBoundary(TestComponent, {
      name: 'CustomName',
      showDetails: true,
    })
    render(<WrappedComponent text="Test" />)
    expect(screen.getByText('Test')).toBeInTheDocument()
  })

  it('sets displayName on wrapped component', () => {
    const WrappedComponent = withErrorBoundary(TestComponent)
    expect(WrappedComponent.displayName).toBe('withErrorBoundary(TestComponent)')
  })

  it('handles anonymous components', () => {
    const AnonymousComponent = ({ value }: { value: string }) => <span>{value}</span>
    const WrappedComponent = withErrorBoundary(AnonymousComponent)
    render(<WrappedComponent value="Anonymous" />)
    expect(screen.getByText('Anonymous')).toBeInTheDocument()
  })
})
