import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { IntegrationErrorBoundary } from '@/components/error-boundaries/integration-error-boundary'

// Mock error-boundary
vi.mock('@/components/error-boundaries/error-boundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

describe('IntegrationErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    render(
      <IntegrationErrorBoundary integrationName="Google Calendar">
        <div data-testid="integration-content">Integration Content</div>
      </IntegrationErrorBoundary>
    )
    expect(screen.getByTestId('integration-content')).toBeInTheDocument()
  })

  it('accepts custom integration name', () => {
    render(
      <IntegrationErrorBoundary integrationName="Mailchimp">
        <div>Integration</div>
      </IntegrationErrorBoundary>
    )
    expect(screen.getByText('Integration')).toBeInTheDocument()
  })

  it('accepts settingsPath prop', () => {
    render(
      <IntegrationErrorBoundary integrationName="QuickBooks" settingsPath="/settings/integrations">
        <div>QB</div>
      </IntegrationErrorBoundary>
    )
    expect(screen.getByText('QB')).toBeInTheDocument()
  })

  it('accepts showReconnect prop', () => {
    render(
      <IntegrationErrorBoundary integrationName="Test" showReconnect>
        <div>Content</div>
      </IntegrationErrorBoundary>
    )
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('accepts onReconnect callback', () => {
    const handleReconnect = vi.fn()
    render(
      <IntegrationErrorBoundary
        integrationName="Test"
        showReconnect
        onReconnect={handleReconnect}
      >
        <div>Content</div>
      </IntegrationErrorBoundary>
    )
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('accepts docsUrl prop', () => {
    render(
      <IntegrationErrorBoundary integrationName="Test" docsUrl="https://docs.example.com">
        <div>Content</div>
      </IntegrationErrorBoundary>
    )
    expect(screen.getByText('Content')).toBeInTheDocument()
  })
})
