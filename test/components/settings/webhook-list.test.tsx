import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WebhookList } from '@/components/settings/webhook-list'
import type { Webhook, WebhookEventType } from '@/types/integrations'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}))

// Mock useToast
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

const availableEvents: Array<{ value: WebhookEventType; label: string }> = [
  { value: 'job.created', label: 'Job Created' },
  { value: 'job.completed', label: 'Job Completed' },
  { value: 'invoice.created', label: 'Invoice Created' },
]

const mockWebhooks: Webhook[] = [
  {
    id: 'wh-1',
    organization_id: 'org-1',
    name: 'Zapier Integration',
    url: 'https://zapier.com/webhook/123',
    secret: 'whsec_123',
    events: ['job.created', 'job.completed'] as WebhookEventType[],
    is_active: true,
    failure_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_triggered_at: new Date().toISOString(),
  },
  {
    id: 'wh-2',
    organization_id: 'org-1',
    name: 'Slack Notifications',
    url: 'https://hooks.slack.com/abc',
    secret: null,
    events: ['invoice.created'] as WebhookEventType[],
    is_active: false,
    failure_count: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_triggered_at: null,
  },
]

describe('WebhookList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders empty state when no webhooks', () => {
    render(<WebhookList webhooks={[]} availableEvents={availableEvents} />)

    expect(screen.getByText('No webhooks configured')).toBeInTheDocument()
    expect(screen.getByText('Create a webhook to send events to external services')).toBeInTheDocument()
  })

  it('renders table with webhooks', () => {
    render(<WebhookList webhooks={mockWebhooks} availableEvents={availableEvents} />)

    expect(screen.getByText('Configured Webhooks')).toBeInTheDocument()
  })

  it('shows webhook count in description', () => {
    render(<WebhookList webhooks={mockWebhooks} availableEvents={availableEvents} />)

    expect(screen.getByText('2 webhooks configured')).toBeInTheDocument()
  })

  it('shows singular when one webhook', () => {
    render(<WebhookList webhooks={[mockWebhooks[0]]} availableEvents={availableEvents} />)

    expect(screen.getByText('1 webhook configured')).toBeInTheDocument()
  })

  it('renders table headers', () => {
    render(<WebhookList webhooks={mockWebhooks} availableEvents={availableEvents} />)

    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('URL')).toBeInTheDocument()
    expect(screen.getByText('Events')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Last Triggered')).toBeInTheDocument()
  })

  it('renders webhook names', () => {
    render(<WebhookList webhooks={mockWebhooks} availableEvents={availableEvents} />)

    expect(screen.getByText('Zapier Integration')).toBeInTheDocument()
    expect(screen.getByText('Slack Notifications')).toBeInTheDocument()
  })

  it('shows Active badge for active webhook', () => {
    render(<WebhookList webhooks={mockWebhooks} availableEvents={availableEvents} />)

    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('shows Paused badge for inactive webhook', () => {
    render(<WebhookList webhooks={mockWebhooks} availableEvents={availableEvents} />)

    expect(screen.getByText('Paused')).toBeInTheDocument()
  })

  it('shows failure count badge', () => {
    render(<WebhookList webhooks={mockWebhooks} availableEvents={availableEvents} />)

    expect(screen.getByText('3 failures')).toBeInTheDocument()
  })

  it('shows event labels', () => {
    render(<WebhookList webhooks={mockWebhooks} availableEvents={availableEvents} />)

    expect(screen.getByText('Job Created')).toBeInTheDocument()
    expect(screen.getByText('Job Completed')).toBeInTheDocument()
  })

  it('shows Never for webhook that has not triggered', () => {
    render(<WebhookList webhooks={mockWebhooks} availableEvents={availableEvents} />)

    expect(screen.getByText('Never')).toBeInTheDocument()
  })

  it('shows +N badge when more than 2 events', () => {
    const webhookWithManyEvents: Webhook = {
      ...mockWebhooks[0],
      events: ['job.created', 'job.completed', 'invoice.created'] as WebhookEventType[],
    }

    render(<WebhookList webhooks={[webhookWithManyEvents]} availableEvents={availableEvents} />)

    expect(screen.getByText('+1')).toBeInTheDocument()
  })
})
