import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import NewWebhookPage from '@/app/(dashboard)/settings/webhooks/new/page'

// Mock the WebhookForm component
vi.mock('@/components/settings/webhook-form', () => ({
  WebhookForm: ({ availableEvents }: { availableEvents: string[] }) => (
    <div data-testid="webhook-form" data-events={availableEvents.length}>Webhook Form</div>
  ),
}))

// Mock the WebhookService
vi.mock('@/lib/services/webhook-service', () => ({
  WebhookService: {
    getAvailableEvents: () => [
      'customer.created',
      'customer.updated',
      'job.created',
      'job.completed',
      'invoice.created',
      'invoice.paid',
    ],
  },
}))

describe('NewWebhookPage', () => {
  it('renders without crashing', () => {
    expect(() => render(<NewWebhookPage />)).not.toThrow()
  })

  it('displays page heading', () => {
    render(<NewWebhookPage />)
    expect(screen.getByText('Create Webhook')).toBeInTheDocument()
  })

  it('displays page description', () => {
    render(<NewWebhookPage />)
    expect(screen.getByText('Configure a new webhook endpoint')).toBeInTheDocument()
  })

  it('renders the WebhookForm component', () => {
    render(<NewWebhookPage />)
    expect(screen.getByTestId('webhook-form')).toBeInTheDocument()
  })

  it('passes available events to WebhookForm', () => {
    render(<NewWebhookPage />)
    const form = screen.getByTestId('webhook-form')
    expect(form).toHaveAttribute('data-events', '6')
  })
})
