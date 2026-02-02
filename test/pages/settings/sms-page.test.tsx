import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SmsSettingsPage from '@/app/(dashboard)/settings/sms/page'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('SmsSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        sms_enabled: true,
        appointment_reminders_enabled: true,
        appointment_reminder_hours: 24,
        job_status_updates_enabled: true,
        lead_notifications_enabled: true,
        payment_reminders_enabled: false,
        quiet_hours_enabled: true,
        quiet_hours_start: '21:00',
        quiet_hours_end: '08:00',
        timezone: 'America/Chicago',
        use_platform_twilio: false,
        twilio_account_sid: '',
        twilio_auth_token: '',
        twilio_phone_number: '',
      }),
    })
  })

  it('renders without crashing', () => {
    expect(() => render(<SmsSettingsPage />)).not.toThrow()
  })

  it('displays loading state initially', () => {
    mockFetch.mockReturnValue(new Promise(() => {}))
    render(<SmsSettingsPage />)

    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  it('displays the page title after loading', async () => {
    render(<SmsSettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('SMS Settings')).toBeInTheDocument()
    })
  })

  it('displays the page description', async () => {
    render(<SmsSettingsPage />)

    await waitFor(() => {
      expect(screen.getByText(/configure sms notifications/i)).toBeInTheDocument()
    })
  })

  it('displays save changes button', async () => {
    render(<SmsSettingsPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument()
    })
  })

  it('displays SMS Notifications card', async () => {
    render(<SmsSettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('SMS Notifications')).toBeInTheDocument()
    })
  })

  it('displays notification types card', async () => {
    render(<SmsSettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('Notification Types')).toBeInTheDocument()
    })
  })

  it('displays appointment reminders option', async () => {
    render(<SmsSettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('Appointment Reminders')).toBeInTheDocument()
    })
  })

  it('displays job status updates option', async () => {
    render(<SmsSettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('Job Status Updates')).toBeInTheDocument()
    })
  })

  it('displays lead notifications option', async () => {
    render(<SmsSettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('Lead Notifications')).toBeInTheDocument()
    })
  })

  it('displays payment reminders option', async () => {
    render(<SmsSettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('Payment Reminders')).toBeInTheDocument()
    })
  })

  it('displays quiet hours card', async () => {
    render(<SmsSettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('Quiet Hours')).toBeInTheDocument()
    })
  })

  it('displays Twilio configuration card', async () => {
    render(<SmsSettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('Twilio Configuration')).toBeInTheDocument()
    })
  })

  it('displays SMS best practices info', async () => {
    render(<SmsSettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('SMS Best Practices')).toBeInTheDocument()
    })
  })

  it('saves settings when save button is clicked', async () => {
    const user = userEvent.setup()
    render(<SmsSettingsPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/sms/settings', expect.objectContaining({
        method: 'PATCH',
      }))
    })
  })

  it('displays success message after saving', async () => {
    const user = userEvent.setup()
    render(<SmsSettingsPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(screen.getByText('Settings saved successfully!')).toBeInTheDocument()
    })
  })

  it('displays error message when save fails', async () => {
    mockFetch.mockImplementation((url) => {
      if (url === '/api/sms/settings' && mockFetch.mock.calls.length > 1) {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Save failed' }),
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ sms_enabled: false }),
      })
    })

    const user = userEvent.setup()
    render(<SmsSettingsPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(screen.getByText('Save failed')).toBeInTheDocument()
    })
  })

  it('displays enabled badge when SMS is enabled', async () => {
    render(<SmsSettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('Enabled')).toBeInTheDocument()
    })
  })
})
