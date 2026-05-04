import { describe, it, expect, vi } from 'vitest'
import type React from 'react'
import { render, screen } from '@testing-library/react'
import WebhooksPage from '@/app/(dashboard)/settings/webhooks/page'

vi.mock('@/lib/services/webhook-service', () => ({
  WebhookService: {
    list: vi.fn().mockResolvedValue([]),
    getAvailableEvents: vi.fn().mockReturnValue([
      { value: 'job.created' as const, label: 'Job created' },
    ]),
  },
}))

async function renderPage() {
  const ui = (await WebhooksPage()) as React.ReactElement
  return render(ui)
}

describe('WebhooksPage', () => {
  it('renders heading and empty list', async () => {
    await renderPage()
    expect(screen.getByRole('heading', { name: 'Webhooks' })).toBeInTheDocument()
    expect(screen.getByText('No webhooks configured')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /new webhook/i })).toHaveAttribute(
      'href',
      '/settings/webhooks/new',
    )
  })
})
