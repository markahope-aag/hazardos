import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import EmailSettingsPage from '@/app/(dashboard)/settings/email/page'

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

describe('EmailSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockImplementation((input: RequestInfo) => {
      const url = typeof input === 'string' ? input : input.url
      if (url.includes('/api/organizations/me/email-domain')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              domain: null,
              status: null,
              records: [],
              verifiedAt: null,
            }),
        })
      }
      if (url.includes('/api/organizations/me')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              organization: {
                name: 'Test Org',
                email_from_name: 'Test Org',
                email_reply_to: 'reply@test.org',
                email_header_color: '#111111',
                email_accent_color: '#222222',
                email_logo_url: '',
                email_signature: 'Thanks,\nTest',
              },
            }),
        })
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) })
    })
  })

  it('renders sender and appearance sections after both loads complete', async () => {
    render(<EmailSettingsPage />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Email' })).toBeInTheDocument()
    })
    expect(screen.getByRole('heading', { name: 'Sender' })).toBeInTheDocument()
    expect(screen.getByText('Email Appearance')).toBeInTheDocument()
    expect(screen.getByLabelText(/display name/i)).toHaveValue('Test Org')
  })
})
