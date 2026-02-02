import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WebhookForm } from '@/components/settings/webhook-form'
import type { WebhookEventType } from '@/types/integrations'

// Mock next/navigation
const mockPush = vi.fn()
const mockBack = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    refresh: vi.fn(),
  }),
}))

// Mock useToast
const mockToast = vi.fn()
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}))

const availableEvents: Array<{ value: WebhookEventType; label: string }> = [
  { value: 'job.created', label: 'Job Created' },
  { value: 'job.completed', label: 'Job Completed' },
  { value: 'invoice.created', label: 'Invoice Created' },
]

describe('WebhookForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders Create Webhook title when no webhook provided', () => {
    render(<WebhookForm availableEvents={availableEvents} />)

    expect(screen.getByText('Create Webhook')).toBeInTheDocument()
  })

  it('renders Edit Webhook title when webhook is provided', () => {
    const webhook = {
      id: 'wh-1',
      organization_id: 'org-1',
      name: 'Test Webhook',
      url: 'https://example.com/webhook',
      secret: 'whsec_123',
      events: ['job.created'] as WebhookEventType[],
      is_active: true,
      failure_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_triggered_at: null,
    }

    render(<WebhookForm webhook={webhook} availableEvents={availableEvents} />)

    expect(screen.getByText('Edit Webhook')).toBeInTheDocument()
  })

  it('renders name input field', () => {
    render(<WebhookForm availableEvents={availableEvents} />)

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
  })

  it('renders URL input field', () => {
    render(<WebhookForm availableEvents={availableEvents} />)

    expect(screen.getByLabelText(/endpoint url/i)).toBeInTheDocument()
  })

  it('renders secret input field', () => {
    render(<WebhookForm availableEvents={availableEvents} />)

    expect(screen.getByLabelText(/signing secret/i)).toBeInTheDocument()
  })

  it('renders Generate button for secret', () => {
    render(<WebhookForm availableEvents={availableEvents} />)

    expect(screen.getByRole('button', { name: /generate/i })).toBeInTheDocument()
  })

  it('renders available events', () => {
    render(<WebhookForm availableEvents={availableEvents} />)

    expect(screen.getByText('Events')).toBeInTheDocument()
    expect(screen.getByLabelText('Job Created')).toBeInTheDocument()
    expect(screen.getByLabelText('Job Completed')).toBeInTheDocument()
    expect(screen.getByLabelText('Invoice Created')).toBeInTheDocument()
  })

  it('renders Cancel button', () => {
    render(<WebhookForm availableEvents={availableEvents} />)

    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('renders Create Webhook submit button', () => {
    render(<WebhookForm availableEvents={availableEvents} />)

    expect(screen.getByRole('button', { name: /create webhook/i })).toBeInTheDocument()
  })

  it('renders Update Webhook submit button when editing', () => {
    const webhook = {
      id: 'wh-1',
      organization_id: 'org-1',
      name: 'Test Webhook',
      url: 'https://example.com/webhook',
      secret: 'whsec_123',
      events: ['job.created'] as WebhookEventType[],
      is_active: true,
      failure_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_triggered_at: null,
    }

    render(<WebhookForm webhook={webhook} availableEvents={availableEvents} />)

    expect(screen.getByRole('button', { name: /update webhook/i })).toBeInTheDocument()
  })

  it('shows validation error when name is empty', async () => {
    const user = userEvent.setup()
    render(<WebhookForm availableEvents={availableEvents} />)

    await user.click(screen.getByRole('button', { name: /create webhook/i }))

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Validation Error',
        description: 'Name is required',
      })
    )
  })

  it('navigates back when cancel is clicked', async () => {
    const user = userEvent.setup()
    render(<WebhookForm availableEvents={availableEvents} />)

    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(mockBack).toHaveBeenCalled()
  })

  it('generates secret when generate button is clicked', async () => {
    const user = userEvent.setup()
    render(<WebhookForm availableEvents={availableEvents} />)

    const secretInput = screen.getByLabelText(/signing secret/i) as HTMLInputElement
    expect(secretInput.value).toBe('')

    await user.click(screen.getByRole('button', { name: /generate/i }))

    expect(secretInput.value).toMatch(/^whsec_/)
  })
})
